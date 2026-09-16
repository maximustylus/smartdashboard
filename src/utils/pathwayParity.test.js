/**
 * ==============================================================================
 * TWO FRONT DOORS, ONE SCREENING — the answers must mean the same thing
 * ==============================================================================
 * Runner: Vitest.  Run: npm test
 *
 * `/individuals/*` can be completed as a chat or as a form. They are separate
 * components with separate copy, separate answer shapes and separate derivation
 * modules (`clinicalParse.js` and `formClinicalData.js`). Nothing structural
 * stops them drifting, and by v2.14.1 they had, in three ways at once:
 *
 *   housing type       six options in the chat, three in the form, so the same
 *                      resident stored a different `housingType` depending on
 *                      which door they used
 *   income adequacy    asked by the form ONLY, and it feeds `sdohFinancial`, so
 *                      a resident whose income did not cover the month was
 *                      flagged for financial strain through one door and not
 *                      the other. This one changed the result.
 *   perception block   five questions asked by the form ONLY, so the rollup
 *                      silently represented form respondents alone
 *
 * ⚠️ THE CHAT STORES CHIP TEXT, THE FORM STORES AN ENGLISH `value`. That is the
 *    root of it: the form can compare against one string whatever language it is
 *    displaying, and the chat cannot, because what it saves is the words the
 *    resident actually tapped. Every chat-side flag therefore needs a matcher
 *    that covers four languages, and `CP26` is what happens when one does not.
 */

import { describe, it, expect } from 'vitest';
import { parseClinicalData } from './clinicalParse';
import { deriveFormClinicalData } from './formClinicalData';
import { copyFor } from '../data/communityChatCopy';
import { PERCEPTION_COPY } from '../data/perceptionCopy';

const LANGS = ['en', 'ms', 'zh', 'ta'];

describe('income adequacy flags financial strain in both pathways', () => {
    it.each(LANGS)('%s: the negative chip sets sdohFinancial in the chat', (lang) => {
        const chips = PERCEPTION_COPY[lang].incomeChips;
        const notEnough = chips[chips.length - 1];
        const parsed = parseClinicalData({
            barriers: copyFor(lang).quickReplies.barriers.slice(-1)[0], // "no barriers"
            income_adequacy: notEnough,
        });
        expect(parsed.sdohFinancial, `${lang}: "${notEnough}" did not flag`).toBe(true);
    });

    it.each(LANGS)('%s: neither adequate chip sets it', (lang) => {
        /*
          ⚠️ THE ENGLISH PAIR IS THE TRAP AND IT IS WHY THE MATCH IS ON THE
             NEGATION. "Adequate, just enough" and "Not adequate" share the word
             "adequate", so any matcher keyed on the noun flags the resident who
             said they were fine.
        */
        PERCEPTION_COPY[lang].incomeChips.slice(0, -1).forEach((chip) => {
            const parsed = parseClinicalData({
                barriers: copyFor(lang).quickReplies.barriers.slice(-1)[0],
                income_adequacy: chip,
            });
            expect(parsed.sdohFinancial, `${lang}: "${chip}" must not flag`).toBe(false);
        });
    });

    it('agrees with the form for the same person', () => {
        const chat = parseClinicalData({
            barriers: 'No barriers for me',
            income_adequacy: 'Not adequate',
        });
        const form = deriveFormClinicalData({
            barriers: ['No barriers for me'],
            incomeAdequacy: 'Inadequate',
        });
        expect(chat.sdohFinancial).toBe(true);
        expect(form.sdohFinancial).toBe(true);
    });

    it('still leaves it unset when the question was never reached', () => {
        // Somebody who abandons before the question must not be flagged BY the
        // absence of an answer, which is the other way this kind of check fails.
        expect(parseClinicalData({ barriers: 'No barriers for me' }).sdohFinancial).toBe(false);
    });
});

describe('housing type offers the same answers in both pathways', () => {
    it.each(LANGS)('%s: the 1-2 room option flags in the chat', (lang) => {
        const chips = copyFor(lang).quickReplies.housing_type;
        expect(parseClinicalData({ housing_type: chips[0] }).sdohHousing).toBe(true);
    });

    it('agrees with the form for a 4-room resident, which the form could not express', () => {
        const chat = parseClinicalData({ housing_type: 'HDB 4 Room' });
        const form = deriveFormClinicalData({ housing: 'HDB 4 Room' });
        expect(chat.housingType).toBe('HDB 4 Room');
        expect(form.housingType).toBe('HDB 4 Room');
        expect(chat.sdohHousing).toBe(false);
        expect(form.sdohHousing).toBe(false);
    });
});

describe('the perception block is carried by both pathways, and scored by neither', () => {
    const answered = {
        services_aware: 'Yes, I have heard of them',
        ever_referred: 'No, never',
        service_rating: 'About the same',
        care_comfort: '4',
        one_change: 'More evening sessions',
        income_adequacy: 'Adequate, just enough',
        barriers: 'No barriers for me',
    };

    it('reaches the record in the same shape the form uses', () => {
        const { perception } = parseClinicalData(answered);
        expect(perception).toMatchObject({
            aware: 'Yes, I have heard of them',
            referred: 'No, never',
            rating: 'About the same',
            trust: '4',
            improve: 'More evening sessions',
        });
    });

    it('is null per field rather than absent when the questions were not reached', () => {
        const { perception } = parseClinicalData({});
        expect(perception).toEqual({
            aware: null, referred: null, rating: null, trust: null,
            barriers: null, improve: null, incomeAdequacy: null,
        });
    });

    it('changes no score and no flag', () => {
        /*
          ⚠️ THE POINT OF THIS ONE. Five questions were added to a live screening
             flow. If any of them ever starts moving a risk score, it does so
             here first, loudly, rather than in production.
        */
        const withOut = parseClinicalData({ barriers: 'No barriers for me' });
        const withIn = parseClinicalData(answered);
        const scored = (r) => ({
            sdohFinancial: r.sdohFinancial, sdohSocial: r.sdohSocial,
            sdohPsychological: r.sdohPsychological, sdohFoodInsecure: r.sdohFoodInsecure,
            sdohHousing: r.sdohHousing, caregiverStrain: r.caregiverStrain,
            medFlag: r.medFlag, symptomFlag: r.symptomFlag,
            pavsScore: r.pavsScore, fallsRisk: r.fallsRisk,
        });
        expect(scored(withIn)).toEqual(scored(withOut));
    });
});
