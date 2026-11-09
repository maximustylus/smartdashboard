/**
 * AURA SCRIBE — the gesture follows the screen, and the tap never reads the words.
 * Run: npx vitest run src/utils/auraScribe.test.js
 */
import { describe, it, expect } from 'vitest';
import {
    deriveScribeState, tapIntervalSeconds, isListeningToTyping, coverTint, isScribeEnabled,
    SCRIBE_STATES, STATE_NAMES, SCRIBE_FLAG_KEY, TAP_BASE_S, TAP_SLOW_S, REST_AFTER_MS,
} from './auraScribe';

const chat = (messages, extra = {}) => deriveScribeState({ view: 'CHAT', messages, ...extra });
const bot = (m) => ({ role: 'bot', text: 'ok', ...m });
const typing = { typedSinceStill: 20, msSinceKeystroke: 100 };

describe('deriveScribeState', () => {
    it('is idle outside the chat view and on an empty chat', () => {
        expect(deriveScribeState({ view: 'SELECT', loading: true })).toBe('idle');
        expect(chat([])).toBe('idle');
        expect(chat([bot({ isGreeting: true })])).toBe('idle');
    });

    it('thinking beats typing beats everything else', () => {
        expect(chat([], { loading: true, typing })).toBe('thinking');
        expect(chat([], { typing, pendingLog: { phase: 'ILL' } })).toBe('typing');
    });

    it('a dismissed check-in is rubbed out; a pending one is pencilled in', () => {
        expect(chat([], { event: 'refuse', pendingLog: { phase: 'ILL' } })).toBe('refuse');
        expect(chat([], { pendingLog: { phase: 'ILL' } })).toBe('propose');
    });

    it('inks only a real save; a sandbox save stays in pencil', () => {
        expect(chat([bot({ text: '✅ Logged 12 to Patients.' })])).toBe('approve');
        expect(chat([bot({ text: '✅ SANDBOX: Sandbox: nothing was saved.' })])).toBe('listen');
    });

    it('maps errors, reworks, proposals, research and drafts', () => {
        expect(chat([bot({ isError: true, text: '✅ no' })])).toBe('snap');
        expect(chat([bot({ text: 'memo\n\nNote from NEXUS: this version is 53% the length of the previous one.' })])).toBe('rework');
        expect(chat([bot({ mode: 'DATA_ENTRY', db_workload: { target_collection: 'patients', target_value: 12 } })])).toBe('propose');
        expect(chat([bot({ mode: 'DATA_ENTRY', db_workload: { target_collection: 'null', target_value: 12 } })])).toBe('listen');
        expect(chat([bot({ mode: 'RESEARCH', action: 'Literature' })])).toBe('research');
        expect(chat([bot({ mode: 'ASSISTANT', action: 'SOP' })])).toBe('drafting');
        expect(chat([bot({})])).toBe('listen');
    });

    it('reads the newest non-greeting turn; a person speaking last is idle', () => {
        expect(chat([bot({ isError: true }), { role: 'user', text: 'hi' }])).toBe('idle');
    });

    it('lies down after the quiet, except over a proposal', () => {
        expect(chat([bot({})], { msSinceActivity: REST_AFTER_MS })).toBe('rest');
        expect(chat([], { pendingLog: { phase: 'HEALTHY' }, msSinceActivity: REST_AFTER_MS * 10 })).toBe('propose');
    });

    it('every state it can return has a screen-reader sentence', () => {
        expect(STATE_NAMES).toEqual(Object.keys(SCRIBE_STATES));
        STATE_NAMES.forEach((n) => expect(SCRIBE_STATES[n]).toMatch(/\.$/));
    });
});

describe('the tap', () => {
    it('starts at the owner\'s 4.5s and eases, monotonically, to 7s', () => {
        expect(tapIntervalSeconds(0)).toBe(TAP_BASE_S);
        expect(tapIntervalSeconds(400)).toBe(TAP_SLOW_S);
        expect(tapIntervalSeconds(4000)).toBe(TAP_SLOW_S);
        let prev = 0;
        for (let c = 0; c <= 400; c += 25) { const t = tapIntervalSeconds(c); expect(t).toBeGreaterThanOrEqual(prev); prev = t; }
        expect(tapIntervalSeconds(NaN)).toBe(TAP_BASE_S);
        expect(tapIntervalSeconds(-5)).toBe(TAP_BASE_S);
    });

    it('waits a few words in, and stops within 2s of silence', () => {
        expect(isListeningToTyping({ typedSinceStill: 11, msSinceKeystroke: 0 })).toBe(false);
        expect(isListeningToTyping({ typedSinceStill: 12, msSinceKeystroke: 1999 })).toBe(true);
        expect(isListeningToTyping({ typedSinceStill: 50, msSinceKeystroke: 2000 })).toBe(false);
        expect(isListeningToTyping()).toBe(false);
    });

    it('takes no text: its inputs are a length and a rhythm', () => {
        // The contract is the signature. If someone threads the draft text in,
        // this is the test that should make them stop and read the header.
        expect(tapIntervalSeconds.length).toBe(1);
        expect(String(isListeningToTyping)).not.toMatch(/text|input|draft/i);
    });
});

describe('coverTint (phase mirror)', () => {
    it('tints only during the check-in moment', () => {
        expect(coverTint('propose', 'ILL')).toMatch(/^#/);
        expect(coverTint('approve', 'ILL')).toBeNull();
        expect(coverTint('propose', 'EXHAUSTED')).toBeNull();
    });
});

describe('isScribeEnabled', () => {
    const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), m }; };

    it('is off by default', () => {
        expect(isScribeEnabled()).toBe(false);
        expect(isScribeEnabled({ storage: mem() })).toBe(false);
    });

    it('?scribe=1 turns it on and remembers; ?scribe=0 turns it off and remembers', () => {
        const s = mem();
        expect(isScribeEnabled({ search: '?scribe=1', storage: s })).toBe(true);
        expect(s.m.get(SCRIBE_FLAG_KEY)).toBe('1');
        expect(isScribeEnabled({ storage: s })).toBe(true);
        expect(isScribeEnabled({ search: '?scribe=0', storage: s, env: { VITE_AURA_SCRIBE: 'on' } })).toBe(false);
        expect(isScribeEnabled({ storage: s, env: { VITE_AURA_SCRIBE: 'on' } })).toBe(false);
    });

    it('the build flag turns it on for everyone who has not opted out', () => {
        expect(isScribeEnabled({ env: { VITE_AURA_SCRIBE: 'on' } })).toBe(true);
        expect(isScribeEnabled({ env: { VITE_AURA_SCRIBE: 'yes' } })).toBe(false);
    });

    it('blocked storage never throws', () => {
        const boom = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
        expect(isScribeEnabled({ search: '?scribe=1', storage: boom })).toBe(true);
        expect(isScribeEnabled({ storage: boom })).toBe(false);
    });
});
