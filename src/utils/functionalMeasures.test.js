/**
 * ==============================================================================
 * FUNCTIONAL MEASURES — SPECIFICATION TEST SUITE
 * ==============================================================================
 * Runner: Vitest.  Run: npm test
 *
 * These functions decide what a member of the public is told about their own body,
 * with no professional in the room. The cases below are the ways that goes wrong:
 * a band computed from a reference that does not cover the person, a value banded
 * when its units were misread, a quiet default to one sex, an exact age reaching
 * storage, or the traffic light moving because somebody does not own a dynamometer.
 */

import { describe, it, expect } from 'vitest';
import {
    gripStrengthResult, ageBandLabel, parseAgeYears,
    toStorableBand, GRIP_BAND_IDS, CHAIR_STAND_BAND_IDS,
    sitToStandProtocolForAge, sitToStandResult,
} from './functionalMeasures';
import {
    GRIP_NORMS_KG, CHAIR_STAND_BELOW_AVERAGE, PERCENTILE_LEVELS, GRIP_SOURCE,
    CHAIR_STAND_SOURCE, STS_60S_NORMS_REPS, STS_60S_SOURCE, STS_60S_BANDS,
} from '../data/functionalNorms';
import { calculateRiskScore } from './scoring';

const f65 = GRIP_NORMS_KG.female.find((r) => r.from === 65);
const P = (level) => PERCENTILE_LEVELS.indexOf(level);

// ── the reference tables themselves ─────────────────────────────────────────
describe('the shipped norm tables are internally coherent', () => {
    it.each(['male', 'female'])('%s grip has 17 contiguous five-year bands to 100+', (sex) => {
        const rows = GRIP_NORMS_KG[sex];
        expect(rows).toHaveLength(17);
        expect(rows[0].from).toBe(20);
        expect(rows[rows.length - 1].to).toBeNull();
        rows.forEach((r, i) => {
            if (i > 0) expect(r.from).toBe(rows[i - 1].from + 5);
            if (r.to !== null) expect(r.to).toBe(r.from + 4);
        });
    });

    it.each(['male', 'female'])('%s grip percentiles rise monotonically in every band', (sex) => {
        GRIP_NORMS_KG[sex].forEach((r) => {
            for (let i = 1; i < r.p.length; i++) expect(r.p[i]).toBeGreaterThan(r.p[i - 1]);
        });
    });

    // Guards the transcription against the paper's own prose, which states the peak.
    it('matches the figures the source states in its abstract', () => {
        expect(GRIP_NORMS_KG.male.find((r) => r.from === 30).p[P(50)]).toBe(49.7);
        expect(GRIP_NORMS_KG.female.find((r) => r.from === 30).p[P(50)]).toBe(29.7);
    });

    it('covers only ages 60 to 94 for the chair stand, and invents nothing outside', () => {
        ['male', 'female'].forEach((sex) => {
            const rows = CHAIR_STAND_BELOW_AVERAGE[sex];
            expect(rows[0].from).toBe(60);
            expect(rows[rows.length - 1].to).toBe(94);
        });
    });

    it.each(['male', 'female'])('%s one-minute table has 12 contiguous bands from 20 to 79', (sex) => {
        const rows = STS_60S_NORMS_REPS[sex];
        expect(rows).toHaveLength(12);
        expect(rows[0].from).toBe(20);
        expect(rows[rows.length - 1].to).toBe(79);
        rows.forEach((r, i) => {
            if (i > 0) expect(r.from).toBe(rows[i - 1].from + 5);
            expect(r.to).toBe(r.from + 4);
            for (let k = 1; k < r.p.length; k++) expect(r.p[k]).toBeGreaterThan(r.p[k - 1]);
        });
    });

    // The four figures Strassmann prints in its abstract, as an independent check
    // that the table was read correctly.
    it.each([
        ['male', 20, [41, 50, 57]],
        ['female', 20, [39, 47, 55]],
        ['male', 75, [25, 30, 37]],
        ['female', 75, [22, 27, 30]],
    ])('%s aged %i matches the abstract', (sex, from, want) => {
        const r = STS_60S_NORMS_REPS[sex].find((x) => x.from === from);
        expect([r.p[1], r.p[2], r.p[3]]).toEqual(want);
    });

    it('never describes any reference population as South East Asian', () => {
        expect(STS_60S_SOURCE.referencePopulation).toBe('swiss');
        expect(GRIP_SOURCE.referencePopulation).toBe('international');
        expect(CHAIR_STAND_SOURCE.referencePopulation).toBe('united-states');
    });
});

// ── grip banding ────────────────────────────────────────────────────────────
describe('grip strength banding', () => {
    const woman67 = { ageYears: 67, sex: 'female' };

    it('places a value below the 20th percentile in the low band', () => {
        const r = gripStrengthResult({ ...woman67, kg: f65.p[P(20)] - 0.1 });
        expect(r.ok).toBe(true);
        expect(r.band).toBe('low');
        expect(r.lowThreshold).toBe(f65.p[P(20)]);
    });

    // The threshold value itself is NOT below the threshold. An off-by-one here
    // tells somebody they are in the lowest fifth when they are not.
    it('treats the threshold value itself as not low', () => {
        expect(gripStrengthResult({ ...woman67, kg: f65.p[P(20)] }).band).toBe('somewhat-low');
    });

    it.each([
        ['low', f65.p[P(20)] - 1],
        ['somewhat-low', f65.p[P(20)]],
        ['moderate', f65.p[P(40)]],
        ['somewhat-high', f65.p[P(60)]],
        ['high', f65.p[P(80)]],
    ])('returns %s at the band boundary', (band, kg) => {
        expect(gripStrengthResult({ ...woman67, kg }).band).toBe(band);
    });

    it('returns only known band ids across the whole plausible range', () => {
        for (let kg = 1; kg <= 100; kg += 0.5) {
            const r = gripStrengthResult({ ...woman67, kg });
            expect(GRIP_BAND_IDS).toContain(r.band);
        }
    });

    it('bands the oldest group from the open-ended row', () => {
        const r = gripStrengthResult({ ageYears: 103, sex: 'male', kg: 20 });
        expect(r.ok).toBe(true);
        expect(r.ageBand).toBe('100+');
    });
});

// ── refusals, which are results and not errors ──────────────────────────────
describe('it refuses rather than guesses', () => {
    it('gives no comparison below the source age floor', () => {
        const r = gripStrengthResult({ ageYears: 19, sex: 'male', kg: 40 });
        expect(r.ok).toBe(false);
        expect(r.reason).toBe('no-reference-for-age');
    });

    // Strassmann stops at 79 and STEADI at 94. Beyond either, no reference exists
    // and none is extrapolated from the last row.
    it('gives no comparison past the top of either reference', () => {
        expect(sitToStandResult({ ageYears: 95, sex: 'male', reps: 12, protocol: 'sts-30s' }).reason)
            .toBe('no-reference-for-age');
    });

    // Both sources are sex-stratified. Quietly assigning a sex would fabricate the
    // comparison, so an unrecognised value returns nothing.
    it.each([undefined, null, '', 'prefer not to say', 'other', 'nonbinary'])(
        'gives no comparison for sex %s', (sex) => {
            const r = gripStrengthResult({ ageYears: 67, sex, kg: 25 });
            expect(r.ok).toBe(false);
            expect(r.reason).toBe('no-reference-for-sex');
        },
    );

    // A value in pounds is the realistic unit error, and 60 kg of grip is not a
    // person. Refusing beats banding a misread number as "high".
    it.each([0, 0.5, 101, 250, -5])('refuses an implausible grip value of %s kg', (kg) => {
        const r = gripStrengthResult({ ageYears: 67, sex: 'female', kg });
        expect(r.ok).toBe(false);
        expect(r.reason).toBe('out-of-range');
    });

    it.each(['', null, undefined, 'twenty', NaN, {}])('treats %s as missing, not as zero', (kg) => {
        expect(gripStrengthResult({ ageYears: 67, sex: 'female', kg }).reason).toBe('missing');
    });

    it('refuses a fractional repetition count', () => {
        expect(sitToStandResult({ ageYears: 67, sex: 'female', reps: 8.5, protocol: 'sts-30s' }).reason).toBe('out-of-range');
    });

    it('never throws, whatever it is handed', () => {
        [undefined, null, {}, { ageYears: 'x', sex: 1, kg: [] }].forEach((input) => {
            expect(() => gripStrengthResult(input)).not.toThrow();
            expect(() => sitToStandResult(input)).not.toThrow();
        });
    });
});

// ── chair stand ─────────────────────────────────────────────────────────────
describe('chair stand against the STEADI thresholds', () => {
    it('marks a count below the threshold as below average', () => {
        // Women 65-69: fewer than 11 is below average.
        const r = sitToStandResult({ ageYears: 67, sex: 'female', reps: 10, protocol: 'sts-30s' });
        expect(r.band).toBe('below-average');
        expect(r.belowAverageThreshold).toBe(11);
    });

    it('treats the threshold itself as at or above average', () => {
        expect(sitToStandResult({ ageYears: 67, sex: 'female', reps: 11, protocol: 'sts-30s' }).band).toBe('at-or-above-average');
    });

    it('returns only known band ids across the plausible range', () => {
        for (let reps = 0; reps <= 60; reps++) {
            const r = sitToStandResult({ ageYears: 72, sex: 'male', reps, protocol: 'sts-30s' });
            expect(CHAIR_STAND_BAND_IDS).toContain(r.band);
        }
    });
});

// ── age handling and what leaves the device ─────────────────────────────────
describe('age is used precisely and stored coarsely', () => {
    it.each([[65, '65-69'], [69, '65-69'], [70, '70-74'], [20, '20-24'], [99, '95-99'], [100, '100+'], [117, '100+']])(
        'bands age %i as %s', (age, label) => expect(ageBandLabel(age)).toBe(label),
    );

    it('rejects an age outside a plausible adult lifespan', () => {
        [17, 0, -1, 121, 'x', null].forEach((a) => expect(parseAgeYears(a)).toBeNull());
    });

    // The privacy bargain of `CD25`: precise age enables the comparison, and only
    // the five-year band is ever persisted.
    it('never lets an exact age into the storable payload', () => {
        const stored = toStorableBand(gripStrengthResult({ ageYears: 67, sex: 'female', kg: 25 }));
        expect(stored).toEqual({ band: expect.any(String), ageBand: '65-69', sex: 'female', sourceId: GRIP_SOURCE.id });
        expect(JSON.stringify(stored)).not.toContain('67');
    });

    it('stores no raw measurement', () => {
        const stored = toStorableBand(gripStrengthResult({ ageYears: 67, sex: 'female', kg: 25 }));
        expect(Object.values(stored)).not.toContain(25);
        expect(stored).not.toHaveProperty('value');
    });

    it('has nothing to store when there was no comparison', () => {
        expect(toStorableBand(gripStrengthResult({ ageYears: 67, sex: 'other', kg: 25 }))).toBeNull();
        expect(toStorableBand(null)).toBeNull();
    });
});

// ── the traffic light must not move (`CD20`) ────────────────────────────────
describe('the risk score is untouched by these measures', () => {
    const base = { symptomFlag: false, medFlag: false, psychoFlag: false, pavsScore: 200, strengthDays: 3 };

    it('scores the same with and without a grip result', () => {
        const before = calculateRiskScore(base);
        const after = calculateRiskScore({
            ...base,
            gripStrengthKg: 17,
            gripBand: 'low',
            chairStandReps: 8,
            chairStandBand: 'below-average',
        });
        expect(after).toBe(before);
    });

    // The failure this guards is the documented "missing data is a deficit" rule
    // being extended to a measurement requiring equipment, which would charge a
    // band to every resident who cannot afford a dynamometer.
    it('does not penalise a resident who entered no measurement', () => {
        expect(calculateRiskScore({ ...base, gripBand: null, chairStandBand: null }))
            .toBe(calculateRiskScore(base));
    });
});


// ── two sit-to-stand protocols, split at 60 ─────────────────────────────────
describe('the sit-to-stand protocol follows from age', () => {
    it.each([[20, 'sts-60s'], [45, 'sts-60s'], [59, 'sts-60s'], [60, 'sts-30s'], [75, 'sts-30s'], [94, 'sts-30s']])(
        'age %i uses %s', (age, protocol) => expect(sitToStandProtocolForAge(age)).toBe(protocol),
    );

    // Neither reference reaches an 18 or 19 year old. Saying so beats guessing.
    it.each([18, 19])('has no protocol for age %i', (age) => {
        expect(sitToStandProtocolForAge(age)).toBeNull();
    });

    it('has no protocol when age is unknown', () => {
        expect(sitToStandProtocolForAge(null)).toBeNull();
        expect(sitToStandProtocolForAge('x')).toBeNull();
    });
});

describe('reading a sit-to-stand count', () => {
    it('bands a thirty-second count for a resident of 60 or over', () => {
        const r = sitToStandResult({ ageYears: 67, sex: 'female', reps: 10, protocol: 'sts-30s' });
        expect(r.ok).toBe(true);
        expect(r.band).toBe('below-average');
        expect(r.seconds).toBe(30);
        expect(r.protocol).toBe('sts-30s');
    });

    // THE DANGEROUS CASE. A thirty-second count read against one-minute norms would
    // call a healthy person profoundly weak. The count is kept; the comparison is not.
    it('refuses to band a count entered against the wrong stopwatch', () => {
        const r = sitToStandResult({ ageYears: 58, sex: 'female', reps: 12, protocol: 'sts-30s' });
        expect(r.ok).toBe(false);
        expect(r.reason).toBe('protocol-age-mismatch');
        expect(r.value).toBe(12);
    });

    it('refuses the reverse mismatch too', () => {
        const r = sitToStandResult({ ageYears: 67, sex: 'male', reps: 40, protocol: 'sts-60s' });
        expect(r.reason).toBe('protocol-age-mismatch');
    });

    // Strassmann Table 2, women 45-49: p25 is 35 and p75 is 50, so 40 sits inside
    // the interquartile range.
    it('bands a one-minute count for a resident under 60', () => {
        const r = sitToStandResult({ ageYears: 45, sex: 'female', reps: 40, protocol: 'sts-60s' });
        expect(r.ok).toBe(true);
        expect(r.band).toBe('typical');
        expect(r.seconds).toBe(60);
        expect(r.typicalRange).toEqual([35, 50]);
        expect(r.referencePopulation).toBe('swiss');
    });

    it.each([
        ['below-typical', 34],
        ['typical', 35],
        ['typical', 50],
        ['above-typical', 51],
    ])('returns %s at the quartile boundary', (band, reps) => {
        expect(sitToStandResult({ ageYears: 45, sex: 'female', reps, protocol: 'sts-60s' }).band).toBe(band);
    });

    it('returns only known one-minute band ids across the plausible range', () => {
        for (let reps = 0; reps <= 120; reps++) {
            const r = sitToStandResult({ ageYears: 45, sex: 'female', reps, protocol: 'sts-60s' });
            expect(STS_60S_BANDS).toContain(r.band);
        }
    });

    it('rejects an unrecognised protocol rather than assuming one', () => {
        expect(sitToStandResult({ ageYears: 67, sex: 'female', reps: 10, protocol: 'sts-5x' }).reason)
            .toBe('protocol-unknown');
        expect(sitToStandResult({ ageYears: 67, sex: 'female', reps: 10 }).reason)
            .toBe('protocol-unknown');
    });

    it('flags a count that is possible but implausible for its protocol', () => {
        // 34 stands in thirty seconds is inside the envelope but at its edge.
        const high = sitToStandResult({ ageYears: 67, sex: 'male', reps: 34, protocol: 'sts-30s' });
        expect(high.ok).toBe(true);
        expect(high.implausibleForProtocol).toBe(false);
        const silly = sitToStandResult({ ageYears: 67, sex: 'male', reps: 50, protocol: 'sts-30s' });
        expect(silly.ok).toBe(true);
        expect(silly.implausibleForProtocol).toBe(true);
    });

    it('records which test produced a stored band', () => {
        const stored = toStorableBand(sitToStandResult({ ageYears: 67, sex: 'female', reps: 10, protocol: 'sts-30s' }));
        expect(stored.protocol).toBe('sts-30s');
        expect(stored).not.toHaveProperty('value');
    });

    it('never throws', () => {
        [undefined, null, {}, { protocol: 'sts-30s', reps: [] }].forEach((input) => {
            expect(() => sitToStandResult(input)).not.toThrow();
        });
    });
});
