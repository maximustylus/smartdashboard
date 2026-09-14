/**
 * ==============================================================================
 * COMMUNITY SIMULATION — every kind of resident, walked end to end
 * ==============================================================================
 * Runner: Vitest.  Run: npm test
 *
 * The existing suites test units. This one runs the WHOLE public assessment, from
 * the first question to the derived flags, for a large cross-product of residents,
 * in four languages, and asserts the invariants that are only visible end to end.
 *
 * It exists because `P9` changed the SHAPE of the conversation, not just its
 * content: the question order moved, two questions became conditional on an answer
 * given four steps earlier, and three more were appended behind their own gates.
 * Every defect this portal has had in that area — `CP26`, `CP27`, `CP9` — was a
 * combination nobody walked, not a function that failed its own test.
 *
 * ------------------------------------------------------------------------------
 * WHAT IT ASSERTS ON EVERY SINGLE PERMUTATION
 * ------------------------------------------------------------------------------
 *
 *   1. Nothing throws, anywhere in the pipeline.
 *   2. The walk terminates, asks each question at most once, and never offers a
 *      question whose predicate reads an answer not yet given.
 *   3. Every question asked has a real prompt in the ACTIVE language — no
 *      `undefined`, no leaked English, no empty bubble.
 *   4. The progress counter is honest: 1..total, monotonic, total == steps asked.
 *   5. All four languages ask the SAME questions of the same person. A language
 *      that silently asks fewer is `CP26`.
 *   6. Nothing a resident can read contains `undefined`, `NaN`, `null` or
 *      `[object Object]`.
 *   7. What may be stored contains neither raw measurement nor the exact age.
 *   8. Skipping both measurements changes NOTHING about the score or the routing
 *      (`CD20`). This is the promise that keeps the feature optional in fact and
 *      not just in wording.
 *
 * ⚠️ THIS IS A SIMULATION, NOT A BROWSER. It drives the real step machinery, the
 *    real copy and the real parsers, so it catches ordering, gating, language and
 *    derivation faults. It cannot catch anything about rendering, layout or the
 *    PDF — `scripts/pdf-headroom.mjs` and the Playwright walks cover that, and
 *    saying so is the honest limit of this file.
 */

import { describe, it, expect } from 'vitest';
import { DOMAIN_CONFIG } from '../data/communityDomains';
import { copyFor } from '../data/communityChatCopy';
import {
    firstActiveStep, nextActiveStep, activeStepCount, activeStepPosition,
} from './chatSteps';
import { parseClinicalData } from './clinicalParse';
import { deriveFormClinicalData } from './formClinicalData';
import { calculateRiskScore } from './scoring';
import { selectCTA } from './ctaRouting';

const LANGS = ['en', 'ms', 'zh', 'ta'];

/**
 * The dimensions a resident actually varies along. Ages are chosen to sit ON the
 * boundaries the sources define rather than comfortably inside them: 19/20 is the
 * floor of every table, 59/60 is the protocol split, 79/80 is the end of the
 * one-minute reference, 94/95 the end of STEADI.
 */
const AGES = ['', '18', '19', '20', '21', '45', '59', '60', '61', '79', '80', '94', '95', '100', '120'];
const SEXES = ['Male', 'Female', 'Prefer not to say'];
const GRIPS = ['', 'skip', '8', '22', '45', '0', '999'];
const STSS = ['', 'skip', 'unsure', '3', '12', '30', '60'];
const FALLS_ANSWERS = [0, 1, 2, 3];
const PAVS = [['0 days', 'Less than 20 mins'], ['3–4 days', '45–60 mins'], ['5–7 days', '60+ mins']];

/** One resident, as the answers they would give. */
const answersFor = (lang, p) => {
    const q = copyFor(lang).quickReplies;
    const pick = (key, i) => (Array.isArray(q[key]) ? q[key][i] : undefined);
    const measurement = (raw, key) => {
        if (raw === '') return '';
        if (raw === 'skip') return pick(key, 0);
        if (raw === 'unsure') return pick(key, 1);
        return raw;
    };
    return {
        pavs_days: p.pavs[0],
        pavs_mins: p.pavs[1],
        strength: pick('strength', 1),
        demographics: p.sex === 'Prefer not to say' ? '' : pick('demographics', p.sex === 'Male' ? 0 : 1),
        age_years: p.age,
        medical: pick('medical', 0),
        barriers: pick('barriers', 5),
        social: pick('social', 1),
        food_insecurity: pick('food_insecurity', 1),
        wellbeing: pick('wellbeing', 0),
        falls: pick('falls', p.falls),
        ethnicity: pick('ethnicity', 0),
        housing_type: pick('housing_type', 2),
        postal_code: '73',
        healthier_sg: pick('healthier_sg', 0),
        grip_kg: measurement(p.grip, 'grip_kg'),
        sit_to_stand: measurement(p.sts, 'sit_to_stand'),
        measure_setting: pick('measure_setting', 0),
        previous_id: pick('previous_id', 0),
    };
};

/**
 * Walks the assessment the way `AuraChat` does: ask a step, record the answer,
 * recompute what comes next from the answers so far.
 *
 * ⚠️ THE ANSWERS ARE BUILT UP AS THE WALK PROCEEDS, not handed over complete. A
 *    predicate that reads an answer given LATER would pass if the whole set were
 *    available up front, and fail here — which is the point, because the resident
 *    experiences it the second way.
 */
const walk = (lang, profile) => {
    const prompts = copyFor(lang).prompts;
    const scripted = answersFor(lang, profile);
    const given = {};
    const asked = [];
    const prompted = [];
    const positions = [];

    let step = firstActiveStep(DOMAIN_CONFIG, prompts, given);
    let guard = 0;
    while (step !== -1) {
        if (guard += 1, guard > 100) throw new Error('the walk did not terminate');
        const { key } = DOMAIN_CONFIG[step];
        const prompt = prompts[key];
        prompted.push(typeof prompt === 'function' ? prompt(given) : prompt);
        positions.push(activeStepPosition(DOMAIN_CONFIG, step, prompts, given));
        asked.push(key);
        given[key] = scripted[key] ?? '';
        step = nextActiveStep(DOMAIN_CONFIG, step, prompts, given);
    }
    return {
        asked, prompted, positions, given,
        total: activeStepCount(DOMAIN_CONFIG, prompts, given),
    };
};

/** The cross-product, bounded to what runs in about a second. */
const PROFILES = [];
AGES.forEach((age) => SEXES.forEach((sex) => GRIPS.forEach((grip) => STSS.forEach((sts) => {
    PROFILES.push({ age, sex, grip, sts, falls: 0, pavs: PAVS[1] });
}))));
AGES.forEach((age) => FALLS_ANSWERS.forEach((falls) => PAVS.forEach((pavs) => {
    PROFILES.push({ age, sex: 'Female', grip: '22', sts: '12', falls, pavs });
})));

const BROKEN = /undefined|\bNaN\b|\[object Object\]|\bnull\b/;

describe(`the whole assessment, ${PROFILES.length} residents x ${LANGS.length} languages`, () => {
    it.each(LANGS)('%s: every resident completes without throwing', (lang) => {
        PROFILES.forEach((p) => {
            expect(() => walk(lang, p), JSON.stringify(p)).not.toThrow();
        });
    });

    it.each(LANGS)('%s: no question is asked twice, and the counter is honest', (lang) => {
        PROFILES.forEach((p) => {
            const r = walk(lang, p);
            expect(new Set(r.asked).size, `repeated question: ${JSON.stringify(p)}`).toBe(r.asked.length);
            expect(r.asked.length, `total disagrees with what was asked: ${JSON.stringify(p)}`).toBe(r.total);
            expect(r.positions, `progress is not 1..n: ${JSON.stringify(p)}`)
                .toEqual(r.asked.map((_, i) => i + 1));
        });
    });

    // ⚠️ `CP26`. A step with no prompt in the active language is SKIPPED, so an
    //    untranslated question is not an error, it is a question never asked — and
    //    only a comparison across languages can see it.
    it('all four languages ask the same questions of the same person', () => {
        PROFILES.forEach((p) => {
            const orders = LANGS.map((lang) => walk(lang, p).asked);
            orders.forEach((order, i) => {
                expect(order, `${LANGS[i]} diverges: ${JSON.stringify(p)}`).toEqual(orders[0]);
            });
        });
    });

    it.each(LANGS)('%s: every prompt shown is real text in that language', (lang) => {
        PROFILES.forEach((p) => {
            walk(lang, p).prompted.forEach((text, i) => {
                expect(typeof text, `${p.age}/${i}`).toBe('string');
                expect(text.trim().length).toBeGreaterThan(0);
                expect(text, `a broken token reached the screen: ${text}`).not.toMatch(BROKEN);
            });
        });
    });

    // A branch that reads an answer not yet given returns false and the question is
    // silently never asked. Asserted from the walk, not from the config.
    it.each(LANGS)('%s: nothing is asked before the answers it branches on', (lang) => {
        PROFILES.forEach((p) => {
            const { asked } = walk(lang, p);
            asked.forEach((key, i) => {
                if (typeof DOMAIN_CONFIG.find((d) => d.key === key)?.when !== 'function') return;
                expect(asked.indexOf('age_years'), `${key} asked before age`).toBeLessThan(i);
                expect(asked.indexOf('age_years')).toBeGreaterThanOrEqual(0);
            });
        });
    });
});

describe('what the assessment derives, for every resident', () => {
    it.each(LANGS)('%s: derivation never throws and never leaks a broken token', (lang) => {
        PROFILES.forEach((p) => {
            const { given } = walk(lang, p);
            let flags;
            expect(() => { flags = parseClinicalData(given); }, JSON.stringify(p)).not.toThrow();
            expect(() => calculateRiskScore(flags)).not.toThrow();
            expect(() => selectCTA(flags)).not.toThrow();

            Object.entries(flags).forEach(([key, value]) => {
                if (typeof value !== 'string') return;
                expect(value, `${key} = ${value}`).not.toMatch(BROKEN);
            });
        });
    });

    /*
      ⚠️ THE PRIVACY BOUNDARY, ASSERTED OVER THE WHOLE CROSS-PRODUCT AND BY WALKING
         THE OUTPUT rather than by naming the fields it knows about. A field added
         to a result later cannot slip past a check that only looks for the old ones.
    */
    it.each(LANGS)('%s: what may be stored carries no raw figure and no exact age', (lang) => {
        PROFILES.forEach((p) => {
            const { given } = walk(lang, p);
            const { functionalStorable } = parseClinicalData(given);
            const seen = [];
            const collect = (node) => {
                if (node === null || node === undefined) return;
                if (typeof node === 'object') return Object.values(node).forEach(collect);
                seen.push(String(node));
            };
            collect(functionalStorable);
            [p.grip, p.sts, p.age].forEach((raw) => {
                if (!raw || raw === 'skip' || raw === 'unsure') return;
                expect(seen, `${raw} leaked into the stored record`).not.toContain(raw);
            });
        });
    });

    /*
      ⚠️ `CD20` — THE MEASUREMENTS ARE OPTIONAL IN FACT, NOT ONLY IN WORDING.

         Neither figure may reach `calculateRiskScore` or `selectCTA`. Charging a
         deficit for not owning a dynamometer would penalise exactly the
         cost-constrained cohort this portal exists for, and it would do it
         invisibly. Same resident, twice: once having answered, once having skipped.
    */
    it.each(LANGS)('%s: skipping both measurements changes neither score nor routing', (lang) => {
        AGES.forEach((age) => {
            const measured = walk(lang, { age, sex: 'Female', grip: '22', sts: '12', falls: 1, pavs: PAVS[1] });
            const skipped = walk(lang, { age, sex: 'Female', grip: 'skip', sts: 'skip', falls: 1, pavs: PAVS[1] });
            const a = parseClinicalData(measured.given);
            const b = parseClinicalData(skipped.given);
            expect(calculateRiskScore(a), `score moved at age ${age}`).toBe(calculateRiskScore(b));
            expect(selectCTA(a), `routing moved at age ${age}`).toEqual(selectCTA(b));
        });
    });
});

/**
 * ==============================================================================
 * THE TWO PATHWAYS, ON THE SAME PERSON
 * ==============================================================================
 *
 * `CP9` was the two pathways deriving one flag two different ways. They still
 * collect through completely different plumbing, so the only guard that means
 * anything is running a person through both and comparing.
 *
 * Only the fields whose ANSWER VOCABULARY is genuinely shared can be compared:
 * falls and Healthier SG (one chip set since `CP32`), the age, the sex, and the
 * measurements. The PAVS and SDOH vocabularies differ by design between a chat and
 * a dropdown, and pretending otherwise would make this test lie.
 */
describe('the chat and the form agree about the same person', () => {
    const SHARED = [
        'fallsCount', 'fallsRisk', 'fearOfFalling', 'fallsAsked', 'healthierSgEnrolled',
        'age', 'ageYears', 'gender', 'functionalStorable',
    ];

    it.each(LANGS)('%s: identical answers produce identical shared flags', (lang) => {
        const q = copyFor(lang).quickReplies;
        ['20', '45', '59', '60', '79', '95', ''].forEach((age) => {
            [0, 1, 2, 3].forEach((falls) => {
                ['22', 'skip'].forEach((grip) => {
                    const chat = parseClinicalData(walk(lang, {
                        age, sex: 'Female', grip, sts: '12', falls, pavs: PAVS[1],
                    }).given);

                    const form = deriveFormClinicalData({
                        pavsDays: '3–4 days', pavsMins: '45–60 mins', strength: '2 days a week',
                        medical: [], barriers: [], social: 'I have one or two close people',
                        wellbeing: 'Feeling good overall', foodInsecure: false,
                        housing: 'HDB 4 Room', race: 'Chinese', postalCode: '730123',
                        // The shared vocabulary: falls and Healthier SG come from the same
                        // chips in both pathways since `CP32`.
                        falls: q.falls[falls], healthierSg: q.healthier_sg[0],
                        ageYears: age, gender: 'Female', previousId: '',
                        gripKg: grip === 'skip' ? '' : grip,
                        sitToStand: '12',
                        measureSetting: q.measure_setting[0],
                    });

                    SHARED.forEach((field) => {
                        expect(form[field], `${field} differs at age "${age}", falls ${falls}, grip ${grip}`)
                            .toEqual(chat[field]);
                    });
                });
            });
        });
    });
});
