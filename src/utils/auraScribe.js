/**
 * ==============================================================================
 * AURA SCRIBE — which gesture the pencil and notebook make, and when
 * ==============================================================================
 *
 * The animated AURA (`docs/AURA-ANIMATED-BRIEF.md`) is a pencil and a notebook.
 * AURA writes in pencil; only the person inks it. This module decides the
 * gesture. It is pure: the panel hands it what is already on screen (the last
 * message, the loading flag, the pending check-in card, the draft) and it
 * returns a state name. The drawing (`AuraScribe.jsx`) only renders a state; it
 * never decides one.
 *
 * Deriving from what is on screen, rather than from events threaded through the
 * panel's handlers, means the gesture cannot disagree with the conversation:
 * the pencil inks a write only when the panel shows that the write happened.
 *
 * ⚠️ THE TAP NEVER READS THE WORDS. While the person types, the pencil taps like
 *    a listener. Its tempo comes from the draft's LENGTH and the time since the
 *    last keystroke, and nothing else. A pencil that reacted to what someone was
 *    writing about a bad shift would be reading over their shoulder.
 */

/** Every state, with the sentence a screen reader hears for it. */
export const SCRIBE_STATES = Object.freeze({
    idle:     'AURA is ready.',
    typing:   'AURA is listening.',
    thinking: 'AURA is thinking.',
    listen:   'AURA replied.',
    drafting: 'AURA drafted a document in pencil. It is not saved until you save it.',
    research: 'AURA noted sources. Each one is unverified until a person checks it.',
    propose:  'AURA pencilled this in. Nothing is saved until you confirm.',
    approve:  'Saved. You confirmed it.',
    refuse:   'Rubbed out. Nothing was saved.',
    rework:   'AURA reworked the document, and it came back shorter.',
    snap:     'AURA could not reach the model.',
    rest:     'AURA is resting.',
});

export const STATE_NAMES = Object.freeze(Object.keys(SCRIBE_STATES));

/** Resting tap interval, seconds. The owner chose 4.5 (2026-11-09). */
export const TAP_BASE_S = 4.5;
/** The tap eases toward this as the draft grows: a quieter presence, not a busier one. */
export const TAP_SLOW_S = 7;
/** Draft length at which the tap reaches its slowest. */
export const TAP_EASE_CHARS = 400;
/** Characters typed since the last pause before the first tap: a few words in, not on contact. */
export const TAP_FIRST_AFTER = 12;
/** The pencil goes still this long after the last keystroke. A tap into silence is a prompt. */
export const TAP_STILL_MS = 2000;
/** Idle this long and the pencil lies down. */
export const REST_AFTER_MS = 30000;

/**
 * Seconds between taps for a draft of `chars` characters. Eases from the base
 * toward TAP_SLOW_S along a quadratic, so early growth slows it most.
 */
export function tapIntervalSeconds(chars, base = TAP_BASE_S) {
    const n = Number.isFinite(chars) && chars > 0 ? chars : 0;
    const k = Math.min(1, n / TAP_EASE_CHARS);
    return base + (TAP_SLOW_S - base) * (1 - (1 - k) ** 2);
}

/**
 * Is the person typing in a way the pencil should listen to?
 * `typedSinceStill` counts keystrokes since the last pause; `msSinceKeystroke`
 * is the gap since the most recent one.
 */
export function isListeningToTyping({ typedSinceStill = 0, msSinceKeystroke = Infinity } = {}) {
    return typedSinceStill >= TAP_FIRST_AFTER && msSinceKeystroke < TAP_STILL_MS;
}

const isSandbox = (text) => /sandbox/i.test(text);
const filledWorkload = (w) => Boolean(
    w && w.target_collection && w.target_collection !== 'null'
    && w.target_value !== null && w.target_value !== undefined,
);

/**
 * The gesture for what the panel is showing.
 *
 * @param {object}  p
 * @param {string}  p.view           'SELECT' | 'CHAT'
 * @param {boolean} p.loading        a request is in flight
 * @param {object}  [p.pendingLog]   the wellbeing check-in card awaiting confirmation
 * @param {Array}   p.messages       the transcript, newest last
 * @param {object}  [p.typing]       { typedSinceStill, msSinceKeystroke }
 * @param {number}  [p.msSinceActivity]  since the last anything
 * @param {string}  [p.event]        a transient the transcript cannot show ('refuse')
 */
export function deriveScribeState({
    view, loading, pendingLog, messages = [], typing, msSinceActivity = 0, event,
} = {}) {
    if (view !== 'CHAT') return 'idle';
    if (loading) return 'thinking';
    if (isListeningToTyping(typing)) return 'typing';
    if (event === 'refuse') return 'refuse';
    if (pendingLog) return 'propose';

    const last = [...messages].reverse().find((m) => m && !m.isGreeting);
    let state = 'idle';
    if (last && last.role === 'bot') {
        const text = String(last.text ?? '');
        if (last.isError) state = 'snap';
        else if (text.startsWith('✅')) state = isSandbox(text) ? 'listen' : 'approve';
        else if (/Note from NEXUS: this version is \d+% the length/.test(text)) state = 'rework';
        else if (last.mode === 'DATA_ENTRY' && filledWorkload(last.db_workload)) state = 'propose';
        else if (last.mode === 'RESEARCH' && last.action) state = 'research';
        else if (last.action) state = 'drafting';
        else state = 'listen';
    }

    // A proposal waits however long it takes. Everything else lies down.
    if (state !== 'propose' && msSinceActivity >= REST_AFTER_MS) return 'rest';
    return state;
}

/**
 * The phase mirror: during the check-in moment only, the cover tints toward the
 * person's phase. Never the launcher, never after the moment passes.
 * Colours follow `PHASE_CONFIG`'s families at pastel strength.
 */
export const PHASE_TINTS = Object.freeze({
    HEALTHY:  '#9fe3c6',
    REACTING: '#f6e3a1',
    INJURED:  '#f7c9a1',
    ILL:      '#f4b4b4',
});

export function coverTint(state, phase) {
    if (state !== 'propose') return null;
    return PHASE_TINTS[phase] ?? null;
}

/**
 * The flag. Off unless turned on, for one browser by `?scribe=1` (remembered)
 * or for everyone by `VITE_AURA_SCRIBE=on` at build time. `?scribe=0` turns it
 * back off for that browser. Every storage access is guarded: a private window
 * or blocked storage must never break the panel.
 */
export const SCRIBE_FLAG_KEY = 'nexus.auraScribe';

export function isScribeEnabled({ search = '', storage, env = {} } = {}) {
    let fromUrl = null;
    try { fromUrl = new URLSearchParams(search).get('scribe'); } catch { /* malformed */ }
    if (fromUrl === '1' || fromUrl === '0') {
        try { storage?.setItem(SCRIBE_FLAG_KEY, fromUrl); } catch { /* blocked */ }
        return fromUrl === '1';
    }
    try {
        const stored = storage?.getItem(SCRIBE_FLAG_KEY);
        if (stored === '1') return true;
        if (stored === '0') return false;
    } catch { /* blocked */ }
    return env.VITE_AURA_SCRIBE === 'on';
}
