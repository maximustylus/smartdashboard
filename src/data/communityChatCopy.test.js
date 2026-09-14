/**
 * ==============================================================================
 * CHAT COPY — the binding between a question and the words it is asked in
 * ==============================================================================
 * Runner: Vitest.  Run: npm test
 *
 * `prompts`, `reflections` and `quickReplies` are authored as positional arrays in
 * four languages. `COPY_ORDER` is what binds position to question. Before it
 * existed that binding was implicit in `DOMAIN_CONFIG`'s order, so reordering the
 * flow silently reassigned every prompt after the moved step, in four languages at
 * once, with nothing in CI able to see it.
 *
 * These tests are what make reordering safe.
 */

import { describe, it, expect } from 'vitest';
import { DICTIONARY, COPY_ORDER, copyFor } from './communityChatCopy';
import { DOMAIN_CONFIG } from './communityDomains';

const LANGS = ['en', 'ms', 'zh', 'ta'];

describe('COPY_ORDER and DOMAIN_CONFIG describe the same questions', () => {
    it('covers exactly the same set of keys', () => {
        expect([...COPY_ORDER].sort()).toEqual(DOMAIN_CONFIG.map((d) => d.key).sort());
    });

    it('names each question once', () => {
        expect(new Set(COPY_ORDER).size).toBe(COPY_ORDER.length);
    });
});

describe('keyed access returns exactly what the arrays hold', () => {
    it.each(LANGS)('%s prompts map to the same values by name as by position', (lang) => {
        const keyed = copyFor(lang);
        COPY_ORDER.forEach((key, i) => {
            expect(keyed.prompts[key]).toBe(DICTIONARY[lang].prompts[i]);
            expect(keyed.reflections[key]).toBe(DICTIONARY[lang].reflections[i]);
            expect(keyed.quickReplies[key]).toBe(DICTIONARY[lang].quickReplies[i]);
        });
    });

    it('falls back to English for an unknown language rather than returning nothing', () => {
        expect(copyFor('xx').prompts.pavs_days).toBe(DICTIONARY.en.prompts[0]);
    });

    it('keeps the non-question copy alongside the keyed arrays', () => {
        expect(copyFor('en').back).toBe(DICTIONARY.en.back);
    });
});

describe('every language can ask every question', () => {
    it.each(LANGS)('%s has a prompt for every question', (lang) => {
        const { prompts } = copyFor(lang);
        COPY_ORDER.forEach((key) => {
            expect(prompts[key], `${lang} is missing a prompt for ${key}`).toBeDefined();
        });
    });

    /*
      Acknowledgements legitimately stop before the appended steps; a missing one is
      silent, unlike a missing prompt which skips the question entirely. Asserted as
      an EXACT list rather than a maximum, so a step that loses its acknowledgement
      by accident shows up here instead of quietly joining the exemption.
    */
    const NO_ACKNOWLEDGEMENT = ['falls', 'healthier_sg', 'grip_kg', 'sit_to_stand', 'measure_setting'];

    it.each(LANGS)('%s may omit acknowledgements only for the appended steps', (lang) => {
        const { reflections } = copyFor(lang);
        const silent = COPY_ORDER.filter((key) => reflections[key] === undefined);
        expect([...silent].sort()).toEqual([...NO_ACKNOWLEDGEMENT].sort());
    });
});
