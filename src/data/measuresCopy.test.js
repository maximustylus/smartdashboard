/**
 * ==============================================================================
 * MEASURES COPY — that every state the logic can reach has words for it
 * ==============================================================================
 * Runner: Vitest.  Run: npm test
 *
 * `functionalMeasures.js` never throws; it returns a result object for every input,
 * including the eight ways a comparison can be refused. Each of those is a state a
 * real resident lands in, and a state with no copy renders as a blank panel where
 * an explanation should be. A blank panel after entering a number reads as "your
 * number was so bad we have nothing to say", which is the opposite of the intent.
 *
 * So these assertions are driven by the logic's own exported id lists rather than
 * by a hand-written copy of them. A band or reason added to the logic fails the
 * build here until somebody writes the words, in all four languages.
 */

import { describe, it, expect } from 'vitest';
import {
    MEASURES_COPY, measuresCopyFor, residentBand,
    RESIDENT_GRIP_BAND, RESIDENT_BAND_IDS, SAFETY_CRITICAL_KEYS,
} from './measuresCopy';
import { GRIP_BAND_IDS, CHAIR_STAND_BAND_IDS, RESULT_REASONS } from '../utils/functionalMeasures';
import { STS_60S_BANDS, MEASUREMENT_SETTINGS } from './functionalNorms';

const LANGS = ['en', 'ms', 'zh', 'ta'];

describe('every language is complete', () => {
    it.each(LANGS)('%s exists', (lang) => {
        expect(MEASURES_COPY[lang]).toBeDefined();
    });

    // Structural parity rather than a spot check: a key added to English and
    // forgotten elsewhere is exactly how a question goes untranslated, and
    // `isStepAvailable` SKIPS rather than falling back, so the failure is silent.
    it.each(LANGS)('%s has the same keys as English, all the way down', (lang) => {
        const shape = (obj) => Object.keys(obj).sort().map((key) => (
            obj[key] && typeof obj[key] === 'object' ? `${key}:{${shape(obj[key]).join(',')}}` : key
        ));
        expect(shape(MEASURES_COPY[lang])).toEqual(shape(MEASURES_COPY.en));
    });

    it.each(LANGS)('%s has no empty string anywhere', (lang) => {
        const walk = (obj, path) => Object.entries(obj).forEach(([key, value]) => {
            if (value && typeof value === 'object') return walk(value, `${path}.${key}`);
            expect(typeof value, `${path}.${key}`).toBe('string');
            expect(value.trim().length, `${path}.${key} is empty`).toBeGreaterThan(0);
        });
        walk(MEASURES_COPY[lang], lang);
    });

    it('falls back to English rather than returning undefined', () => {
        expect(measuresCopyFor('de')).toBe(MEASURES_COPY.en);
        expect(measuresCopyFor(undefined)).toBe(MEASURES_COPY.en);
        expect(measuresCopyFor('ta')).toBe(MEASURES_COPY.ta);
    });
});

describe('every state the logic can reach has words', () => {
    // The eight refusals plus `missing`. A resident who enters a thirty-second count
    // at 55 hits `protocol-age-mismatch`, and what they read there is the difference
    // between a useful warning and an unexplained blank.
    it.each(LANGS)('%s explains every result reason', (lang) => {
        RESULT_REASONS.forEach((reason) => {
            expect(MEASURES_COPY[lang].reasons[reason], `${lang} is missing ${reason}`).toBeTruthy();
        });
        expect(Object.keys(MEASURES_COPY[lang].reasons).sort()).toEqual([...RESULT_REASONS].sort());
    });

    it.each(LANGS)('%s names every band either measurement can return', (lang) => {
        const residentFacing = [
            ...new Set([
                ...GRIP_BAND_IDS.map((id) => RESIDENT_GRIP_BAND[id]),
                ...STS_60S_BANDS,
                ...CHAIR_STAND_BAND_IDS,
            ]),
        ];
        residentFacing.forEach((band) => {
            expect(MEASURES_COPY[lang].bands[band], `${lang} is missing band ${band}`).toBeTruthy();
        });
    });

    it.each(LANGS)('%s names every place a measurement can be taken', (lang) => {
        MEASUREMENT_SETTINGS.forEach((setting) => {
            expect(MEASURES_COPY[lang].settings[setting], `${lang} is missing ${setting}`).toBeTruthy();
        });
    });

    it.each(LANGS)('%s asks the question for both stopwatch lengths', (lang) => {
        expect(MEASURES_COPY[lang].stsPrompt['sts-60s']).toBeTruthy();
        expect(MEASURES_COPY[lang].stsPrompt['sts-30s']).toBeTruthy();
    });
});

describe('the five stored grip bands become the three a resident reads', () => {
    it('maps every band the logic can return', () => {
        GRIP_BAND_IDS.forEach((id) => {
            expect(RESIDENT_GRIP_BAND[id], `no resident band for ${id}`).toBeTruthy();
        });
    });

    it('maps to exactly the three declared resident bands', () => {
        expect([...new Set(Object.values(RESIDENT_GRIP_BAND))].sort())
            .toEqual([...RESIDENT_BAND_IDS.grip].sort());
    });

    // The cut is at the 20th and 80th centile, matching the one-minute test's own
    // typical range, so the two measurements do not contradict each other on one page.
    it('calls only the bottom quintile below and only the top quintile above', () => {
        expect(RESIDENT_GRIP_BAND.low).toBe('below');
        expect(RESIDENT_GRIP_BAND.high).toBe('above');
        expect(RESIDENT_GRIP_BAND['somewhat-low']).toBe('usual');
        expect(RESIDENT_GRIP_BAND.moderate).toBe('usual');
        expect(RESIDENT_GRIP_BAND['somewhat-high']).toBe('usual');
    });

    it('collapses grip but passes a sit-to-stand band through untouched', () => {
        expect(residentBand({ ok: true, band: 'somewhat-low' })).toBe('usual');
        expect(residentBand({ ok: true, band: 'below-typical', protocol: 'sts-60s' })).toBe('below-typical');
        expect(residentBand({ ok: true, band: 'below-average', protocol: 'sts-30s' })).toBe('below-average');
    });

    // A refused comparison must not resolve to a band, or the caller shows a band
    // where it should be showing the reason it could not compare.
    it('returns nothing for a result that is not a comparison', () => {
        expect(residentBand({ ok: false, reason: 'no-reference-for-age', value: 24 })).toBeNull();
        expect(residentBand(null)).toBeNull();
        expect(residentBand(undefined)).toBeNull();
        expect(residentBand({})).toBeNull();
    });

    // STEADI publishes one cut-off and nothing above it. A third level here would be
    // a finding we invented, presented to a resident as if it came from the source.
    it('gives the thirty-second chair stand two levels, not three', () => {
        expect(RESIDENT_BAND_IDS['sts-30s']).toEqual([...CHAIR_STAND_BAND_IDS]);
        expect(RESIDENT_BAND_IDS['sts-30s']).toHaveLength(2);
    });
});

describe('house rules hold in every language', () => {
    const allStrings = (lang) => {
        const out = [];
        const walk = (obj) => Object.values(obj).forEach((value) => {
            if (value && typeof value === 'object') walk(value);
            else out.push(String(value));
        });
        walk(MEASURES_COPY[lang]);
        return out;
    };

    it.each(LANGS)('%s uses no em-dashes', (lang) => {
        allStrings(lang).forEach((text) => expect(text, text).not.toMatch(/[—–]/));
    });

    // Banned on every public surface, in every language.
    it.each(LANGS)('%s never says clinical', (lang) => {
        allStrings(lang).forEach((text) => expect(text.toLowerCase(), text).not.toContain('clinical'));
    });

    // A band label that ranks a person rather than describing a measurement. The
    // copy says where a number sits, never how the person compares to other people.
    it.each(LANGS)('%s avoids ranking language in band labels', (lang) => {
        Object.values(MEASURES_COPY[lang].bands).forEach((label) => {
            expect(label.toLowerCase(), label).not.toMatch(/than most|weaker|stronger than|worse|poor/);
        });
    });
});

describe('the safety-critical strings are the ones the registry gates', () => {
    // Two lists in two modules naming the same three strings is a drift waiting to
    // happen: rename one here and the gate silently stops covering it.
    it('names exactly the three registered in copyReview', async () => {
        const { COPY_REVIEW } = await import('./copyReview');
        const registered = Object.keys(COPY_REVIEW)
            .filter((key) => key.startsWith('measures.') && COPY_REVIEW[key].safetyCritical)
            .map((key) => key.replace('measures.', ''))
            .sort();
        expect([...SAFETY_CRITICAL_KEYS].sort()).toEqual(registered);
    });

    it.each(LANGS)('%s has all three', (lang) => {
        SAFETY_CRITICAL_KEYS.forEach((key) => {
            expect(MEASURES_COPY[lang][key], `${lang} is missing ${key}`).toBeTruthy();
        });
    });

    // The registry hands a reviewer the English to compare a translation against. If
    // it drifts from what actually ships, the reviewer reads one string and approves
    // another.
    it('carries the English that actually ships', async () => {
        const { COPY_REVIEW } = await import('./copyReview');
        SAFETY_CRITICAL_KEYS.forEach((key) => {
            expect(COPY_REVIEW[`measures.${key}`].english).toBe(MEASURES_COPY.en[key]);
        });
    });

    // A prohibition that lost its negation in translation is the failure this whole
    // gate exists for. This cannot detect that, and is not trying to: it only checks
    // the three did not come back as something far shorter than the instruction,
    // which is the one mechanical symptom of a dropped clause.
    it.each(LANGS)('%s keeps each prohibition a full instruction', (lang) => {
        SAFETY_CRITICAL_KEYS.forEach((key) => {
            expect(MEASURES_COPY[lang][key].length, `${lang}.${key} looks truncated`).toBeGreaterThan(20);
        });
    });
});
