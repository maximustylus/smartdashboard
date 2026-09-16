/**
 * ==============================================================================
 * ONE BOT TURN IS TWO STRINGS, AND THEY MUST NOT BOTH ACKNOWLEDGE
 * ==============================================================================
 * Runner: Vitest.  Run: npm test
 *
 * Every message AURA sends is built in `AuraChat.jsx` as:
 *
 *     reflections[thisKey](theAnswer) + ' ' + prompts[nextKey]
 *
 * The reflection acknowledges what the person just said. The prompt asks the
 * next question. Nothing enforced that division, and in v2.14.1 three prompts
 * were acknowledging as well, so residents were thanked twice in one breath:
 *
 *     "Starting from zero is completely valid, many people are in the same
 *      position, and that is exactly why these programmes exist. No problem at
 *      all, most people start exactly where you are, and that is why these
 *      programmes exist. If you were to start being active..."
 *
 *     "A solid base to build on. Great. And on those active days..."
 *
 *     "Strength training is just as important as aerobic activity for long-term
 *      health. Thank you. Now two quick things about you..."
 *
 * ⚠️ EACH STRING WAS FINE ON ITS OWN. That is why this survived review in four
 *    languages: the duplication exists only in the JOIN, which no reader of
 *    either file ever sees. So this test builds the join.
 *
 * ⚠️ WHAT THIS CANNOT REACH. The acknowledgement is usually REPLACED at runtime
 *    by a model-written one from `communityAck`. That half is governed by the
 *    persona in `functions/index.js`, which carries the matching rules ("Do NOT
 *    repeat the question back", "NEVER say Great!"). No test in `src/` sees it.
 */

import { describe, it, expect } from 'vitest';
import { DICTIONARY, COPY_ORDER, copyFor } from './communityChatCopy';

const LANGS = ['en', 'ms', 'zh', 'ta'];

/**
 * Words that ACKNOWLEDGE. A prompt may not open with one, because whatever ran
 * immediately before it was an acknowledgement by construction.
 */
const ACK_OPENERS = [
    'Great', 'Good', 'Thank you', 'Thanks', 'Noted', 'No problem', 'Excellent',
    'Terima kasih', 'Baik', 'Bagus', 'Tiada masalah',
    '谢谢', '好的', '很好', '没问题',
    'நன்றி', 'நல்லது', 'பரவாயில்லை',
];

/** Answers worth branching on, per language, for the prompts that are functions. */
const STATES = [
    {}, { pavs_days: '0 days' }, { pavs_days: '0 hari' }, { pavs_days: '0 天' },
    { pavs_days: '0 நாட்கள்' }, { pavs_days: '3–4 days' },
];

const renderPrompt = (p, data) => String((typeof p === 'function' ? p(data) : p) ?? '');

describe('a prompt asks, it does not also acknowledge', () => {
    it.each(LANGS)('%s: no prompt opens with an acknowledgement word', (lang) => {
        const offenders = [];
        DICTIONARY[lang].prompts.forEach((p, i) => {
            STATES.forEach((data) => {
                const text = renderPrompt(p, data).trimStart();
                const hit = ACK_OPENERS.find((w) => text.startsWith(w));
                if (hit) offenders.push(`${COPY_ORDER[i]} opens with "${hit}": ${text.slice(0, 70)}`);
            });
        });
        expect([...new Set(offenders)]).toEqual([]);
    });

    it.each(LANGS)('%s: the zero-days turn does not say the same thing twice', (lang) => {
        /*
          The exact turn that shipped broken. `pavs_days` is answered with the
          zero chip for this language, so the reflection and the next prompt are
          built the way a resident would actually receive them, and no sentence
          of six words or more may appear in both halves.
        */
        const zeroChip = copyFor(lang).quickReplies.pavs_days[0];
        const reflection = String(copyFor(lang).reflections.pavs_days(zeroChip) ?? '');
        const prompt = renderPrompt(copyFor(lang).prompts.pavs_mins, { pavs_days: zeroChip });

        const words = (t) => t.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
        const a = words(reflection);
        const b = new Set();
        const bw = words(prompt);
        for (let i = 0; i + 5 < bw.length; i += 1) b.add(bw.slice(i, i + 6).join(' '));

        const repeated = [];
        for (let i = 0; i + 5 < a.length; i += 1) {
            const run = a.slice(i, i + 6).join(' ');
            if (b.has(run)) repeated.push(run);
        }
        expect(repeated, `${lang} repeats "${repeated[0]}" across the same message`).toEqual([]);
    });

    it.each(LANGS)('%s: asks a zero-days resident a question that fits their answer', (lang) => {
        /*
          ⚠️ THIS IS THE DEFECT THE ENGLISH BRANCH EXISTED TO PREVENT, and three
             languages did not have it. Somebody who said "0 days" was then asked
             how long they exercise ON THOSE ACTIVE DAYS. The persona in
             `functions/index.js` already forbids the model from doing this; the
             static copy was doing it anyway.
        */
        const zeroChip = copyFor(lang).quickReplies.pavs_days[0];
        const forZero = renderPrompt(copyFor(lang).prompts.pavs_mins, { pavs_days: zeroChip });
        const forSome = renderPrompt(copyFor(lang).prompts.pavs_mins, { pavs_days: copyFor(lang).quickReplies.pavs_days[2] });
        expect(forZero, `${lang} asks a zero-days resident the same question as an active one`).not.toBe(forSome);
        expect(forZero.length).toBeGreaterThan(10);
    });
});
