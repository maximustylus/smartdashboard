/**
 * ==============================================================================
 * MEASUREMENT ANSWERS — what somebody typed, read the same way in both pathways
 * ==============================================================================
 * Runner: Vitest.  Run: npm test
 *
 * Two failures this suite exists to prevent, both of which ship silently:
 *
 *   1. A chip reworded in one language stops being recognised, so "I have not had
 *      these measured" is read as free text and becomes an unparsed answer for
 *      Malay, Chinese or Tamil speakers only.
 *
 *   2. A raw kilogram figure reaches the telemetry record, where it sits beside
 *      postal sector, age band, sex, ethnicity and housing type and identifies a
 *      resident to whoever ran the session at which they were measured.
 */

import { describe, it, expect } from 'vitest';
import {
    measurementResults, toStorableMeasurements, isSkipAnswer, isUnsureAnswer,
    settingIdFor, numberIn,
} from './measurementAnswers';
import { MEASURES_COPY } from '../data/measuresCopy';
import { MEASUREMENT_SETTINGS } from '../data/functionalNorms';

const LANGS = ['en', 'ms', 'zh', 'ta'];

describe('a tapped chip is recognised in every language', () => {
    it.each(LANGS)('%s skip chip', (lang) => {
        expect(isSkipAnswer(MEASURES_COPY[lang].skip)).toBe(true);
    });

    it.each(LANGS)('%s not-sure chip', (lang) => {
        expect(isUnsureAnswer(MEASURES_COPY[lang].stsUnsure)).toBe(true);
    });

    it.each(LANGS)('%s settings chips all map back to a stored id', (lang) => {
        MEASUREMENT_SETTINGS.forEach((id) => {
            expect(settingIdFor(MEASURES_COPY[lang].settings[id]), `${lang}.${id}`).toBe(id);
        });
    });

    it('does not mistake one chip for the other', () => {
        LANGS.forEach((lang) => {
            expect(isSkipAnswer(MEASURES_COPY[lang].stsUnsure)).toBe(false);
            expect(isUnsureAnswer(MEASURES_COPY[lang].skip)).toBe(false);
        });
    });

    it('tolerates the whitespace and casing a typed answer arrives with', () => {
        expect(isSkipAnswer(`  ${MEASURES_COPY.en.skip.toUpperCase()}  `)).toBe(true);
    });

    // Free text must never be stored verbatim: this value reaches the aggregate
    // rollup, where a sentence is both a re-identification surface and a category
    // nobody can count.
    it('turns anything it does not recognise into other, and silence into nothing', () => {
        expect(settingIdFor('at my daughter’s flat')).toBe('other');
        expect(settingIdFor('')).toBeNull();
        expect(settingIdFor(null)).toBeNull();
    });
});

describe('one number, or none', () => {
    it.each([['28', 28], ['28.5', 28.5], ['I did 14', 14], ['  9  ', 9]])(
        'reads %s as %s', (text, value) => expect(numberIn(text)).toBe(value),
    );

    // "28 or maybe 30" is not a measurement, and picking either would show somebody a
    // band computed from a figure they never gave.
    it.each(['28 or maybe 30', '', 'not sure', null, undefined, 'twenty eight'])(
        'reads %s as no number', (text) => expect(numberIn(text)).toBeNull(),
    );

    it.each(LANGS)('%s skip and not-sure chips carry no number', (lang) => {
        expect(numberIn(MEASURES_COPY[lang].skip)).toBeNull();
        expect(numberIn(MEASURES_COPY[lang].stsUnsure)).toBeNull();
    });
});

describe('reading a whole answer set', () => {
    const woman67 = { ageYears: 67, sex: 'Female' };

    it('bands a grip figure and a thirty-second count for a 67-year-old', () => {
        const r = measurementResults({
            ...woman67, gripAnswer: '22', stsAnswer: '12',
            settingAnswer: MEASURES_COPY.en.settings['community-event'],
        });
        expect(r.grip.ok).toBe(true);
        expect(r.sitToStand.ok).toBe(true);
        expect(r.sitToStand.protocol).toBe('sts-30s');
        expect(r.setting).toBe('community-event');
    });

    it('uses the one-minute protocol under 60 and the thirty-second one from 60', () => {
        expect(measurementResults({ ageYears: 45, sex: 'Female', stsAnswer: '30' }).sitToStand.protocol)
            .toBe('sts-60s');
        expect(measurementResults({ ageYears: 60, sex: 'Female', stsAnswer: '12' }).sitToStand.protocol)
            .toBe('sts-30s');
    });

    // THE ONE THAT MATTERS. A resident who does not know which test they did has told
    // us the single thing that makes a comparison unsafe. It must not collapse into
    // "you did not answer".
    it('treats not knowing the test as its own answer, not as a blank', () => {
        const r = measurementResults({
            ...woman67, stsAnswer: MEASURES_COPY.en.stsUnsure,
        });
        expect(r.sitToStand.ok).toBe(false);
        expect(r.sitToStand.reason).toBe('protocol-not-known-by-resident');
        expect(r.sitToStand.reason).not.toBe('missing');
    });

    it('reports a skipped measurement as missing rather than as a zero', () => {
        const r = measurementResults({ ...woman67, gripAnswer: MEASURES_COPY.ta.skip });
        expect(r.grip.ok).toBe(false);
        expect(r.grip.reason).toBe('missing');
        expect(r.grip.value).toBeNull();
    });

    it('keeps the number but refuses the comparison when the age is unknown', () => {
        const r = measurementResults({ ageYears: null, sex: 'Female', gripAnswer: '22' });
        expect(r.grip.ok).toBe(false);
        expect(r.grip.value).toBe(22);
    });

    it('never throws, whatever it is handed', () => {
        [undefined, null, {}, { gripAnswer: {}, stsAnswer: [], ageYears: 'x' }].forEach((input) => {
            expect(() => measurementResults(input)).not.toThrow();
        });
    });
});

describe('THE PRIVACY BOUNDARY: no raw number leaves the device', () => {
    const results = measurementResults({
        ageYears: 67, sex: 'Female', gripAnswer: '22.5', stsAnswer: '12',
        settingAnswer: MEASURES_COPY.en.settings['active-ageing-centre'],
    });

    it('keeps the band and its provenance', () => {
        const stored = toStorableMeasurements(results);
        expect(stored.grip.band).toBeTruthy();
        expect(stored.grip.ageBand).toBe('65-69');
        expect(stored.sitToStand.protocol).toBe('sts-30s');
        expect(stored.sitToStand.setting).toBe('active-ageing-centre');
    });

    /*
      Walks the output rather than naming the fields it knows about. A check that
      looked only for `value` would pass a result that later gained `kg`, and the
      leak would ship. This asserts that NOTHING in the stored object equals either
      measurement, at any depth.
    */
    it('carries neither measurement, at any depth', () => {
        const stored = toStorableMeasurements(results);
        const values = [];
        const walk = (node) => {
            if (node === null || node === undefined) return;
            if (typeof node === 'object') return Object.values(node).forEach(walk);
            values.push(node);
        };
        walk(stored);
        expect(values).not.toContain(22.5);
        expect(values).not.toContain('22.5');
        expect(values).not.toContain(12);
        expect(values).not.toContain('12');
        // And the exact age, which the five-year band exists to avoid carrying.
        expect(values).not.toContain(67);
        expect(values).not.toContain('67');
    });

    it('stores nothing at all for a measurement that was never compared', () => {
        const stored = toStorableMeasurements(measurementResults({ ageYears: 67, sex: 'Female' }));
        expect(stored.grip).toBeNull();
        expect(stored.sitToStand).toBeNull();
    });

    it('never throws on a result set it did not produce', () => {
        expect(() => toStorableMeasurements(undefined)).not.toThrow();
        expect(toStorableMeasurements(undefined)).toEqual({ grip: null, sitToStand: null });
    });
});
