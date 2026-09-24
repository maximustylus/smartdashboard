/**
 * ==============================================================================
 * EVERY CHIP, EVERY STEP, EVERY LANGUAGE: THE SAME ANSWER MEANS THE SAME THING
 * ==============================================================================
 * Runner: Vitest.  Run: npm test
 *
 * The chat stores the words the resident tapped, in their language, and the
 * matchers in `clinicalFlags.js` read those words. Four times now a chip in one
 * language carried no word a matcher knew, and that language silently lost a flag:
 * `CP26`, `CP43`, `CP45`, and on 2026-09-24 four at once, found by a stress test
 * rather than a test:
 *
 *     ms  "Penyakit jantung"              heart condition, no flag
 *     ta  "மிகவும் விலை அதிகம்" / "தூரம்"   too expensive / too far, no cost flag
 *     ta  "பராமரிப்பால் அதிக சுமை"        caregiving, no caregiver flag
 *     zh  「每周 3 天以上」                 3+ days of strength scored as 0
 *
 * The earlier parity tests each covered the ONE step that had just broken. This
 * one covers all of them, so the next chip that drifts fails here rather than
 * reaching a resident: every chip is parsed next to the English chip at the same
 * position, and every derived flag and number must be identical.
 *
 * ⚠️ TEXT FIELDS ARE NOT COMPARED, on purpose. `ethnicity`, `housingType` and the
 *    perception answers are stored as the words the resident chose, so they
 *    differ by language by design. Everything a score, a flag or a route reads
 *    is compared.
 */

import { describe, it, expect } from 'vitest';
import { parseClinicalData } from './clinicalParse';
import { copyFor } from '../data/communityChatCopy';

const LANGS = ['ms', 'zh', 'ta'];

const DERIVED = [
    'pavsScore', 'pavsDays', 'pavsMinutes', 'strengthDays',
    'symptomFlag', 'medFlag', 'sdohFinancial', 'sdohSocial', 'sdohPsychological',
    'sdohFoodInsecure', 'caregiverStrain', 'sdohHousing', 'psychoFlag',
    'fallsCount', 'fallsRisk', 'fearOfFalling', 'fallsAsked',
    'healthierSgEnrolled', 'gender', 'age',
];
const derived = (r) => Object.fromEntries(DERIVED.map((k) => [k, r[k]]));

/**
 * The answers a chip is parsed alongside. Minutes need a number of days to
 * produce a score, and the falls answer is only read for somebody aged 60+.
 */
const context = (lang, step) => {
    const q = copyFor(lang).quickReplies;
    const base = { age_years: '70' };
    if (step === 'pavs_mins') base.pavs_days = q.pavs_days[2];
    if (step === 'pavs_days') base.pavs_mins = q.pavs_mins[2];
    return base;
};

const english = copyFor('en').quickReplies;
const steps = Object.keys(english).filter((step) => Array.isArray(english[step]) && english[step].length > 0);

describe('every chip derives what the English chip at the same position derives', () => {
    it('covers the steps that carry chips', () => {
        expect(steps.length).toBeGreaterThan(15);
    });

    it.each(LANGS)('%s', (lang) => {
        const chips = copyFor(lang).quickReplies;
        const mismatches = [];
        steps.forEach((step) => {
            expect(chips[step], `${lang} has no chips for ${step}`).toHaveLength(english[step].length);
            english[step].forEach((enChip, i) => {
                const want = derived(parseClinicalData({ ...context('en', step), [step]: enChip }));
                const got = derived(parseClinicalData({ ...context(lang, step), [step]: chips[step][i] }));
                DERIVED.forEach((key) => {
                    if (got[key] !== want[key]) {
                        mismatches.push(`${step}[${i}] "${chips[step][i]}": ${key} ${got[key]} ≠ en ${want[key]}`);
                    }
                });
            });
        });
        expect(mismatches, mismatches.join('\n')).toEqual([]);
    });
});

describe('"no A or B" is a denial of both, in Chinese and Tamil too', () => {
    it.each([
        ['没有头晕或胸痛', 'symptomFlag'],
        ['நெஞ்சு வலி அல்லது தலைச்சுற்றல் இல்லை', 'symptomFlag'],
        ['我没有心脏病或高血压', 'medFlag'],
        ['இதய நோய் இல்லை', 'medFlag'],
        ['உயர் இரத்த அழுத்தம் இல்லை', 'medFlag'],
    ])('"%s" raises no %s', (answer, flag) => {
        expect(parseClinicalData({ medical: answer })[flag]).toBe(false);
    });

    it('still flags when only one is denied, or none', () => {
        expect(parseClinicalData({ medical: '没有头晕，但有胸痛' }).symptomFlag).toBe(true);
        expect(parseClinicalData({ medical: 'செயலில் இருக்கும்போது தலைச்சுற்றல் அல்லது நெஞ்சு வலி' }).symptomFlag).toBe(true);
    });
});

describe('a typed "no" to the falls question is no fall', () => {
    it.each(['never', 'Never fallen', 'nope', '0', 'tak pernah', 'tidak', '没有', '从来没有', '没摔过', 'இல்லை', 'விழவில்லை'])(
        '"%s"', (answer) => {
            const r = parseClinicalData({ age_years: '70', falls: answer });
            expect(r.fallsRisk).toBe(false);
            expect(r.fallsCount).toBe(0);
        },
    );

    it('a sentence that mentions a fall still records it', () => {
        expect(parseClinicalData({ age_years: '70', falls: 'I never go out now because I fell' }).fallsRisk).toBe(true);
    });
});

describe('"Some stress but managing" is not distress, in any language (owner, 2026-09-24)', () => {
    it.each(['en', ...LANGS])('%s', (lang) => {
        const chip = copyFor(lang).quickReplies.wellbeing[1];
        expect(parseClinicalData({ wellbeing: chip }).sdohPsychological, chip).toBe(false);
        const worse = copyFor(lang).quickReplies.wellbeing[2];
        expect(parseClinicalData({ wellbeing: worse }).sdohPsychological, worse).toBe(true);
    });
});
