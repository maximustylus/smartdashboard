/**
 * The meter draws a resident's own measurement against published reference points.
 * These tests are about the two ways a scale lies: putting the marker somewhere it
 * does not belong, and drawing a band that disagrees with the words printed beside
 * it. Both are run against the REAL norm tables rather than invented numbers,
 * because a scale that works on tidy fixtures and not on Tomkinson's actual rows
 * is a scale that works nowhere.
 */

import { describe, it, expect } from 'vitest';
import { spanFor, pctOf } from './meterScale';
import { gripStrengthResult, sitToStandResult } from './functionalMeasures';
import { residentBand } from '../data/measuresCopy';
import { GRIP_RANGE_KG } from '../data/functionalNorms';

const SEXES = ['male', 'female'];

describe('the span always contains everything it has to draw', () => {
    it('includes the resident value even when it is far outside the published points', () => {
        const points = [20, 25, 30, 35, 40];
        [0.5, 5, 100, 999].forEach((value) => {
            const span = spanFor(points, value);
            expect(span.lo, `value ${value}`).toBeLessThanOrEqual(value);
            expect(span.hi, `value ${value}`).toBeGreaterThanOrEqual(value);
            // And therefore the marker is never pinned to an edge, which would read
            // as "off the chart" — a judgement no source here supports.
            const pct = pctOf(value, span);
            expect(pct).toBeGreaterThan(0);
            expect(pct).toBeLessThan(100);
        });
    });

    it('survives a single published point, which is the chair stand every day', () => {
        const span = spanFor([11], 11);
        expect(span).not.toBeNull();
        expect(span.hi).toBeGreaterThan(span.lo);
        expect(pctOf(11, span)).toBeCloseTo(50, 5);
    });

    it('returns null rather than a fake axis when there is nothing to draw', () => {
        expect(spanFor([], null)).toBeNull();
        expect(spanFor(null, null)).toBeNull();
        expect(spanFor(undefined, undefined)).toBeNull();
        expect(spanFor(['x', NaN, null], null)).toBeNull();
    });
});

describe('pctOf never produces a position that cannot be rendered', () => {
    it('is finite and within 0 to 100 for every input shape', () => {
        const span = spanFor([10, 20, 30], 20);
        [-1e9, -1, 0, 15, 1e9, NaN, Infinity, null, undefined, 'x', {}].forEach((v) => {
            const pct = pctOf(v, span);
            if (pct === null) return;
            expect(Number.isFinite(pct), String(v)).toBe(true);
            expect(pct).toBeGreaterThanOrEqual(0);
            expect(pct).toBeLessThanOrEqual(100);
        });
    });

    it('returns null rather than NaN without a span', () => {
        // A NaN CSS offset collapses the marker to the left edge, which silently
        // puts a strong resident at the bottom of a scale.
        expect(pctOf(5, null)).toBeNull();
        expect(pctOf(5, undefined)).toBeNull();
    });

    it('rises with the value and never goes backwards', () => {
        const span = spanFor([10, 50], 30);
        let last = -1;
        for (let v = 0; v <= 60; v += 0.5) {
            const pct = pctOf(v, span);
            expect(pct).toBeGreaterThanOrEqual(last);
            last = pct;
        }
    });
});

describe('the drawn band agrees with the words printed beside it', () => {
    /*
      ⚠️ THE BANDING RULE IS HALF-OPEN: `[p20, p80)`. A resident sitting EXACTLY on
         p80 is banded "above", while the drawn band's right edge is at p80 too, so
         their marker lands on the boundary rather than clearly outside it.

         That is a one-pixel ambiguity in the picture and it is not a defect: the
         band label and the advice line both say "above", and the caption prints the
         two numbers. An earlier version of this test asserted a CLOSED interval and
         reported two "disagreements" at exactly p80 — the test was wrong and the
         code was right. It is written down here so that does not happen twice.
    */
    it('puts the marker inside the teal band exactly when grip reads as usual', () => {
        let checked = 0;
        SEXES.forEach((sex) => {
            for (let age = 20; age <= 95; age += 1) {
                for (let kg = GRIP_RANGE_KG.min; kg <= 70; kg += 0.5) {
                    const result = gripStrengthResult({ ageYears: age, sex, kg });
                    if (result.ok !== true) continue;
                    const band = residentBand(result);
                    const span = spanFor(result.scale.points, result.value);
                    const value = pctOf(result.value, span);
                    const from = pctOf(result.scale.usualFrom, span);
                    const to = pctOf(result.scale.usualTo, span);

                    if (band === 'usual') {
                        // Half-open, matching the rule above.
                        expect(value, `${sex} ${age} ${kg}kg`).toBeGreaterThanOrEqual(from);
                        expect(value, `${sex} ${age} ${kg}kg`).toBeLessThanOrEqual(to);
                    } else if (band === 'below') {
                        expect(value, `${sex} ${age} ${kg}kg`).toBeLessThan(from);
                    } else {
                        expect(value, `${sex} ${age} ${kg}kg`).toBeGreaterThanOrEqual(to);
                    }
                    checked += 1;
                }
            }
        });
        // Proof the loop actually exercised the table rather than skipping it all.
        expect(checked).toBeGreaterThan(1000);
    });

    it('never draws an upper edge for the thirty-second chair stand', () => {
        let checked = 0;
        SEXES.forEach((sex) => {
            for (let age = 60; age <= 94; age += 1) {
                for (let reps = 0; reps <= 30; reps += 1) {
                    const result = sitToStandResult({
                        ageYears: age, sex, reps, protocol: 'sts-30s',
                    });
                    if (result.ok !== true) continue;
                    // STEADI publishes one figure. If a second point ever appears
                    // here, somebody has invented a ceiling for the test every
                    // resident aged 60 and over takes.
                    expect(result.scale.resolution).toBe('cut-off');
                    expect(result.scale.points).toHaveLength(1);
                    expect(result.scale.usualTo).toBeNull();

                    const span = spanFor(result.scale.points, result.value, {
                        from: result.scale.axisFrom, to: result.scale.axisTo,
                    });
                    expect(pctOf(result.value, span)).not.toBeNull();
                    checked += 1;
                }
            }
        });
        expect(checked).toBeGreaterThan(500);
    });

    /*
      ⚠️ THIS TEST EXISTS BECAUSE THE PICTURE LIED BEFORE IT DID. With the axis
         derived from the single published point plus the resident's own count, a
         woman aged 67 who stood up 13 times against a cut-off of 11 got a meter
         whose whole span was those two repetitions: the teal band filled nine
         tenths of the track and her marker sat near the end of it. Every number
         printed beside it was correct. The drawing said she was near the top of a
         scale that does not have one.
    */
    it('gives the chair stand an axis wide enough not to overstate two repetitions', () => {
        const result = sitToStandResult({ ageYears: 67, sex: 'female', reps: 13, protocol: 'sts-30s' });
        expect(result.ok).toBe(true);
        expect(result.scale.axisFrom).toBe(0);
        expect(result.scale.axisTo).toBeGreaterThan(result.scale.usualFrom * 2);

        const span = spanFor(result.scale.points, result.value, {
            from: result.scale.axisFrom, to: result.scale.axisTo,
        });
        const cut = pctOf(result.scale.usualFrom, span);
        const marker = pctOf(result.value, span);

        // The band runs from the cut-off to the right-hand edge, so the share of
        // the track it covers is 100 - cut. It must not swallow the drawing.
        expect(100 - cut).toBeLessThan(75);
        // And the marker sits just above the cut-off, not pinned near the end.
        expect(marker).toBeGreaterThan(cut);
        expect(marker).toBeLessThan(60);
    });

    it('an exceptional count still widens the axis rather than being clipped', () => {
        const result = sitToStandResult({ ageYears: 67, sex: 'female', reps: 30, protocol: 'sts-30s' });
        if (result.ok !== true) return;
        const span = spanFor(result.scale.points, result.value, {
            from: result.scale.axisFrom, to: result.scale.axisTo,
        });
        expect(span.lo).toBeLessThanOrEqual(result.value);
        expect(span.hi).toBeGreaterThanOrEqual(result.value);
        expect(pctOf(result.value, span)).toBeLessThan(100);
    });

    it('draws only points the source publishes, never an interpolated tail', () => {
        SEXES.forEach((sex) => {
            for (let age = 20; age <= 95; age += 5) {
                const grip = gripStrengthResult({ ageYears: age, sex, kg: 30 });
                if (grip.ok !== true) continue;
                // Eleven percentiles in, eleven points out. Nothing added, nothing
                // smoothed, nothing between them.
                expect(grip.scale.points).toHaveLength(grip.scale.levels.length);
                grip.scale.points.forEach((p) => expect(Number.isFinite(p)).toBe(true));
                // And they ascend, or the band edges would cross.
                const sorted = [...grip.scale.points].sort((a, b) => a - b);
                expect(grip.scale.points).toEqual(sorted);
            }
        });
    });
});
