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

describe('only the last question may say it is the last one', () => {
    /*
      ⚠️ THE FLOW GREW AND THE COPY DID NOT NOTICE. `healthier_sg` opened "Last
         one." in four languages, and it stopped being last in v2.13.0 when the
         measurements were appended after it. `food_insecurity` opened "One more
         quick question" as the ninth of up to twenty-four. Adding the perception
         block put a second "Last one." on `one_change`, five questions after the
         first, with record linkage still to come. Each is a small lie about how
         much longer this will take, told to the population least likely to finish.

         `previous_id` is unconditional and genuinely last, so it alone may say so.
    */
    const LAST = /last one|last question|soalan terakhir|kedua terakhir|最后一个|கடைசி/i;
    const ONE_MORE = /one more|satu soalan lagi|satu lagi|还有一个|இன்னும் ஒரு/i;

    it.each(LANGS)('%s: no question but the final one claims to be last', (lang) => {
        const offenders = [];
        DICTIONARY[lang].prompts.forEach((p, i) => {
            if (COPY_ORDER[i] === 'previous_id') return;
            STATES.forEach((data) => {
                const text = renderPrompt(p, data);
                if (LAST.test(text)) offenders.push(`${COPY_ORDER[i]}: ${text.slice(0, 60)}`);
            });
        });
        expect([...new Set(offenders)]).toEqual([]);
    });

    it.each(LANGS)('%s: no question promises there is only one more', (lang) => {
        const offenders = [];
        DICTIONARY[lang].prompts.forEach((p, i) => {
            STATES.forEach((data) => {
                const text = renderPrompt(p, data);
                if (ONE_MORE.test(text)) offenders.push(`${COPY_ORDER[i]}: ${text.slice(0, 60)}`);
            });
        });
        expect([...new Set(offenders)]).toEqual([]);
    });
});
