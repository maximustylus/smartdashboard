/**
 * ==============================================================================
 * COMMUNITY TELEMETRY — SPECIFICATION TEST SUITE
 * ==============================================================================
 * Runner: Vitest.  Run: npm test
 *
 * ⚠️ THE LOAD-BEARING TEST IN THIS FILE IS "a write that never settles". Everything
 *    else here is hygiene.
 *
 * ── THE BUG (`CP24`) ─────────────────────────────────────────────────────────
 *
 * `recordTelemetry` had a `try`/`catch`, and its header promised that a member of
 * the public "must still reach their result if the write fails". Both pathways
 * AWAITED it before navigating.
 *
 * A `catch` protects against a REJECTION. Firestore's `addDoc` does not reject when
 * the backend is unreachable — it queues the write locally and retries, and the
 * promise never settles. So the promised protection did not exist, and the failure
 * mode was not an error message: it was a person who answered fifteen questions
 * about their health and then watched "Generating your personalised plan now…"
 * for as long as they were willing to wait. Measured at 45 seconds and counting.
 *
 * No test could have caught it, because every existing test resolved its mock.
 * A hang is not an error, and it has to be tested for on purpose.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const addDoc = vi.fn();
vi.mock('../firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
    collection: (...args) => ({ __collection: args[1] }),
    addDoc: (...args) => addDoc(...args),
    serverTimestamp: () => ({ __serverTimestamp: true }),
}));

const { recordTelemetry, WRITE_DEADLINE_MS } = await import('./telemetry');

beforeEach(() => {
    addDoc.mockReset();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('⚠️ the visitor always reaches their result', () => {
    /**
     * THE REGRESSION TEST. A promise that never settles, which is exactly what an
     * unreachable Firestore produces. Before the fix this test would hang until
     * Vitest's own timeout killed it.
     */
    it('resolves at the deadline when the write never settles', async () => {
        vi.useFakeTimers();
        addDoc.mockReturnValue(new Promise(() => {}));   // never resolves, never rejects

        const pending = recordTelemetry('730000', { score: 3 });
        let settled = false;
        pending.then(() => { settled = true; });

        await vi.advanceTimersByTimeAsync(WRITE_DEADLINE_MS - 1);
        expect(settled, 'it must not give up before the deadline').toBe(false);

        await vi.advanceTimersByTimeAsync(2);
        await expect(pending).resolves.toBe(false);
    });

    it('does not wait the full deadline when the write is fast', async () => {
        addDoc.mockResolvedValue({ id: 'doc-1' });
        await expect(recordTelemetry('730000', { score: 3 })).resolves.toBe(true);
    });

    it('resolves false when the write is refused, rather than throwing', async () => {
        addDoc.mockRejectedValue(new Error('PERMISSION_DENIED'));
        await expect(recordTelemetry('730000', { score: 3 })).resolves.toBe(false);
    });

    /**
     * After the deadline nobody is awaiting the original promise. If its rejection
     * were left unhandled it would surface in the console of a member of the public
     * as though something had broken on their device.
     */
    it('leaves no unhandled rejection when a timed-out write later fails', async () => {
        vi.useFakeTimers();
        let reject;
        addDoc.mockReturnValue(new Promise((_, r) => { reject = r; }));

        const pending = recordTelemetry('730000', { score: 3 });
        await vi.advanceTimersByTimeAsync(WRITE_DEADLINE_MS + 1);
        await expect(pending).resolves.toBe(false);

        const unhandled = vi.fn();
        process.on('unhandledRejection', unhandled);
        reject(new Error('too late'));
        await vi.advanceTimersByTimeAsync(10);
        await Promise.resolve();
        process.off('unhandledRejection', unhandled);
        expect(unhandled).not.toHaveBeenCalled();
    });

    it('never throws, whatever the caller passes', async () => {
        addDoc.mockResolvedValue({ id: 'doc-1' });
        for (const args of [[null, null], [undefined, undefined], ['', {}], [{}, []], [[], 'x']]) {
            await expect(recordTelemetry(...args)).resolves.toBeTypeOf('boolean');
        }
    });
});

describe('what is written', () => {
    it('records an unusable sector as the unknown sentinel, never as a place', async () => {
        addDoc.mockResolvedValue({ id: 'doc-1' });
        await recordTelemetry('North (e.g. 73, 75)', { score: 3 });
        expect(addDoc.mock.calls[0][1].postalSector).toBe('--');
    });

    it('normalises a real postal code to its sector', async () => {
        addDoc.mockResolvedValue({ id: 'doc-1' });
        await recordTelemetry('S730123', { score: 3 });
        expect(addDoc.mock.calls[0][1].postalSector).toBe('73');
    });

    it('stamps the server timestamp rather than the device clock', async () => {
        addDoc.mockResolvedValue({ id: 'doc-1' });
        await recordTelemetry('730000', { score: 3 });
        expect(addDoc.mock.calls[0][1].createdAt).toEqual({ __serverTimestamp: true });
    });

    /** A fingerprinting vector removed by `CP3`; it must not come back. */
    it('attaches no user agent', async () => {
        addDoc.mockResolvedValue({ id: 'doc-1' });
        await recordTelemetry('730000', { score: 3 });
        expect(JSON.stringify(addDoc.mock.calls[0][1])).not.toMatch(/clientReference|userAgent/i);
    });
});

/**
 * ==============================================================================
 * ⚠️ WHAT MUST NOT REACH FIRESTORE
 * ==============================================================================
 *
 * The aggregate record already carries postal sector, age band, sex, ethnicity and
 * housing type. A whole-year age or a grip figure in kilograms beside those
 * identifies a resident to anybody who ran the session at which they were measured.
 *
 * The strip lives inside `recordTelemetry` rather than at the call sites because
 * `AuraChat` passes the WHOLE parsed object as its payload. Every field anything
 * ever adds to `parseClinicalData` therefore ships by default and ships silently —
 * which is exactly what `ageYears` did on the day it was added, and nobody would
 * have seen it. These assertions are what make forgetting impossible.
 */
describe('a payload is stripped of what must never be stored', () => {
    const written = () => addDoc.mock.calls[0][1];

    beforeEach(() => { addDoc.mockResolvedValue({ id: 'doc1' }); });

    it('drops a precise age while keeping the band', async () => {
        await recordTelemetry('73', { payload: { age: '60+', ageYears: 67, gender: 'Female' } });
        expect(written().payload.ageYears).toBeUndefined();
        expect(written().payload.age).toBe('60+');
        expect(written().payload.gender).toBe('Female');
    });

    it('drops the raw measurements while keeping the bands', async () => {
        await recordTelemetry('73', {
            payload: {
                functional: { grip: { ok: true, value: 22.5, band: 'low' } },
                functionalStorable: { grip: { band: 'low', ageBand: '65-69' }, sitToStand: null },
            },
        });
        expect(written().payload.functional).toBeUndefined();
        expect(written().payload.functionalStorable.grip.band).toBe('low');
        expect(written().payload.functionalStorable.grip.ageBand).toBe('65-69');
    });

    // The chat passes the whole parsed object, at whatever depth it happens to nest.
    // A strip that only looked at the top level would miss every one of them.
    it('strips at any depth, not only at the top level', async () => {
        await recordTelemetry('73', { a: { b: { c: { ageYears: 67, keep: 'yes' } } } });
        expect(written().a.b.c.ageYears).toBeUndefined();
        expect(written().a.b.c.keep).toBe('yes');
    });

    it('strips inside arrays too', async () => {
        await recordTelemetry('73', { rows: [{ ageYears: 67, keep: 1 }, { keep: 2 }] });
        expect(written().rows[0].ageYears).toBeUndefined();
        expect(written().rows[0].keep).toBe(1);
        expect(written().rows[1].keep).toBe(2);
    });

    // Copying a Date or a Firestore sentinel field by field would quietly destroy
    // it, so anything that is not a plain object passes through untouched.
    it('does not flatten a Date on its way past', async () => {
        const when = new Date('2026-09-12T00:00:00Z');
        await recordTelemetry('73', { when });
        expect(written().when).toBeInstanceOf(Date);
        expect(written().when.getTime()).toBe(when.getTime());
    });

    it('leaves a payload with nothing to strip exactly as it was', async () => {
        await recordTelemetry('73', { score: 182, ctaTier: 'COMMUNITY', flags: { medFlag: false } });
        expect(written().score).toBe(182);
        expect(written().ctaTier).toBe('COMMUNITY');
        expect(written().flags).toEqual({ medFlag: false });
    });

    it('still records the sector and the timestamp it is responsible for', async () => {
        await recordTelemetry('73', { payload: { ageYears: 67 } });
        expect(written().postalSector).toBe('73');
        expect(written().createdAt).toEqual({ __serverTimestamp: true });
    });
});
