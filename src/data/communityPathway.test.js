/**
 * ==============================================================================
 * THE PATHWAY SPLIT — activity first, then who this person is, then the branch
 * ==============================================================================
 * Runner: Vitest.  Run: npm test
 *
 * `P9` moved two things and both are load-bearing.
 *
 * ── 1. THE AGE IS A YEAR NOW, NOT A BAND ───────────────────────────────────
 *
 * The published strength references are cut in FIVE-YEAR rows from 20 to 100+.
 * "60+" spans eight of them, so a band cannot be narrowed back down afterwards
 * and a record collected as one can never be compared. The year is asked, only
 * the band is stored, and `parseAgeYears` refuses a range rather than guessing
 * which end of it somebody meant.
 *
 * ── 2. THE BRANCH NEEDS THE ANSWER BEFORE IT BRANCHES ──────────────────────
 *
 * Age used to be question 9 and `falls` was gated on it — which worked only
 * because `falls` was appended at the very end, after "do you have a previous
 * NEXUS record". Sex and age are now questions 4 and 5, so everything after them
 * can branch: the falls screen, the sit-to-stand protocol, the services offered.
 *
 * ⚠️ A `when` PREDICATE THAT READS AN ANSWER NOT YET GIVEN DOES NOT FAIL LOUDLY.
 *    It returns false and the question is silently never asked, to the cohort the
 *    question exists for. That is `CP26`, and it is what these assertions are
 *    here to catch the next time somebody reorders this list.
 */

import { describe, it, expect } from 'vitest';
import { DOMAIN_CONFIG } from './communityDomains';
import { copyFor, COPY_ORDER } from './communityChatCopy';
import { nextActiveStep, firstActiveStep, activeStepCount, isStepAvailable } from '../utils/chatSteps';
import { parseAgeYears, exactAge, isSixtyPlusPerson } from '../utils/clinicalFlags';

const LANGS = ['en', 'ms', 'zh', 'ta'];
const at = (key) => DOMAIN_CONFIG.findIndex((d) => d.key === key);

/** Walks the whole conversation for one person, in one language. */
const askedOrder = (lang, data) => {
    const prompts = copyFor(lang).prompts;
    const keys = [];
    let step = firstActiveStep(DOMAIN_CONFIG, prompts, data);
    while (step !== -1) {
        keys.push(DOMAIN_CONFIG[step].key);
        step = nextActiveStep(DOMAIN_CONFIG, step, prompts, data);
    }
    return keys;
};

describe('a precise age, or an honest nothing', () => {
    it.each([['67', 67], ['Female, 67', 67], ['I am 72 years old', 72], ['18', 18], ['120', 120]])(
        'reads %s as %s', (answer, years) => expect(parseAgeYears(answer)).toBe(years),
    );

    // A tapped band is not an age somebody gave. Reading "41-60" as a number would
    // compare a 60-year-old against the 41-year-old row, which is a WRONG answer
    // shown to somebody as if it were about them, not a missing one.
    it.each(['41-60', '41–60', '60+', 'Male, 60+', 'over 60', 'under 21'])(
        'refuses the band %s rather than picking an end of it', (band) => {
            expect(parseAgeYears(band)).toBeNull();
        },
    );

    it.each(['', '  ', 'abc', 'Female', '67 and 45', '121', '17', '560123'])(
        'reads %s as no age at all', (answer) => expect(parseAgeYears(answer)).toBeNull(),
    );

    it('never throws, whatever it is handed', () => {
        [null, undefined, {}, [], 0, NaN, Infinity].forEach((value) => {
            expect(() => parseAgeYears(value)).not.toThrow();
        });
    });

    it('prefers the age question over anything left in demographics', () => {
        expect(exactAge({ age_years: '67', demographics: 'Female, 45' })).toBe(67);
    });

    // Records collected before `P9` carry the age inside `demographics` and nowhere
    // else. Dropping them would silently lose the 60+ pathway for everybody assessed
    // before this change.
    it('still finds an age in an older record that has no age question', () => {
        expect(isSixtyPlusPerson({ demographics: 'Female, 60+' })).toBe(true);
        expect(isSixtyPlusPerson({ demographics: 'Male, 21–40' })).toBe(false);
    });

    it.each([[59, false], [60, true], [61, true], [99, true]])(
        'puts a %i-year-old on the 60+ pathway: %s', (years, expected) => {
            expect(isSixtyPlusPerson({ age_years: String(years) })).toBe(expected);
        },
    );

    // Sex alone must not read as an age. This is the exact shape of the failure the
    // gate change was made to prevent.
    it('does not find an age in a sex-only demographics answer', () => {
        expect(isSixtyPlusPerson({ demographics: 'Female' })).toBe(false);
        expect(exactAge({ demographics: 'Female' })).toBeNull();
    });
});

describe('the order questions are asked in', () => {
    it('takes the activity measurement before anything personal', () => {
        expect(at('pavs_days')).toBe(0);
        expect(at('pavs_mins')).toBe(1);
        expect(at('strength')).toBe(2);
    });

    // Somebody who abandons after three questions has still given the vital sign the
    // portal exists to take. Front-loading demographics collects a profile and no
    // measurement.
    it('asks sex and then age immediately after', () => {
        expect(at('demographics')).toBe(3);
        expect(at('age_years')).toBe(4);
    });

    // THE ASSERTION THAT STOPS `CP26` HAPPENING AGAIN. Every conditional step must
    // come after the answers its predicate reads.
    it('asks every conditional question after the answers it branches on', () => {
        DOMAIN_CONFIG.forEach((step, index) => {
            if (typeof step.when !== 'function') return;
            expect(at('demographics'), `${step.key} branches before demographics`).toBeLessThan(index);
            expect(at('age_years'), `${step.key} branches before the age is known`).toBeLessThan(index);
        });
    });

    it('leaves record linkage last, since it is the only answer that is an identifier', () => {
        expect(at('previous_id')).toBe(DOMAIN_CONFIG.length - 1);
    });

    it('names every step exactly once', () => {
        const keys = DOMAIN_CONFIG.map((d) => d.key);
        expect(new Set(keys).size).toBe(keys.length);
    });

    // The two orders are now independent by design: this one is the conversation,
    // `COPY_ORDER` is the order the copy happens to be written in. They must cover
    // the same questions and need not agree on sequence.
    it('covers the same questions as the copy, in its own order', () => {
        expect([...COPY_ORDER].sort()).toEqual(DOMAIN_CONFIG.map((d) => d.key).sort());
        expect(COPY_ORDER.indexOf('previous_id')).not.toBe(DOMAIN_CONFIG.length - 1);
    });
});

describe('the two pathways, walked end to end', () => {
    const under60 = { demographics: 'Female', age_years: '45' };
    const over60 = { demographics: 'Female', age_years: '67' };

    it.each(LANGS)('%s asks a 67-year-old about falls', (lang) => {
        expect(askedOrder(lang, over60)).toContain('falls');
    });

    it.each(LANGS)('%s does not ask a 45-year-old about falls', (lang) => {
        expect(askedOrder(lang, under60)).not.toContain('falls');
    });

    it.each(LANGS)('%s asks the 60+ pathway exactly one more question', (lang) => {
        const prompts = copyFor(lang).prompts;
        expect(activeStepCount(DOMAIN_CONFIG, prompts, over60))
            .toBe(activeStepCount(DOMAIN_CONFIG, prompts, under60) + 1);
    });

    it.each(LANGS)('%s opens with physical activity and closes with record linkage', (lang) => {
        const order = askedOrder(lang, over60);
        expect(order[0]).toBe('pavs_days');
        expect(order[order.length - 1]).toBe('previous_id');
    });

    // Both pathways are identical up to the branch. A difference before the age is
    // known would mean something branched on an answer nobody had given.
    it.each(LANGS)('%s asks both pathways the same first five questions', (lang) => {
        expect(askedOrder(lang, under60).slice(0, 5))
            .toEqual(['pavs_days', 'pavs_mins', 'strength', 'demographics', 'age_years']);
        expect(askedOrder(lang, over60).slice(0, 5))
            .toEqual(['pavs_days', 'pavs_mins', 'strength', 'demographics', 'age_years']);
    });

    // Before the age question is answered nobody is on the 60+ pathway, so the falls
    // step must not appear. It reappears once the answer arrives, which is why
    // `activeStepCount` is recomputed rather than fixed.
    it.each(LANGS)('%s does not offer the falls question before the age is given', (lang) => {
        expect(askedOrder(lang, {})).not.toContain('falls');
        expect(isStepAvailable(DOMAIN_CONFIG, at('falls'), copyFor(lang).prompts, {})).toBe(false);
    });

    it.each(LANGS)('%s has a prompt for every question it asks', (lang) => {
        const prompts = copyFor(lang).prompts;
        askedOrder(lang, over60).forEach((key) => {
            expect(prompts[key], `${lang} is missing a prompt for ${key}`).toBeTruthy();
        });
    });

    // A question nobody can read is skipped rather than shown in English, so an
    // untranslated step would silently shorten one language's assessment. All four
    // must ask the same thing.
    it('asks all four languages the same questions', () => {
        const orders = LANGS.map((lang) => askedOrder(lang, over60));
        orders.forEach((order) => expect(order).toEqual(orders[0]));
    });
});
