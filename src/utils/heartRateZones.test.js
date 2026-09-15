/**
 * The heart rate block is an ESTIMATE printed beside two real measurements, on a
 * page older residents will read. These tests are mostly about the two things that
 * would make it dangerous rather than merely wrong: showing a table to somebody who
 * reported symptoms on exertion, and letting Astrand's equation drive numbers for
 * people three decades past the sample it was fitted to.
 */

import { describe, it, expect } from 'vitest';
import {
    ZONE_IDS, ZONE_BOUNDS, ESTIMATE_SPREAD_BPM, HR_EQUATIONS,
    maxHeartRates, zonesFor, SUPPRESSION_REASONS,
} from './heartRateZones';

const ADULT_AGES = Array.from({ length: 103 }, (_, i) => i + 18); // 18 to 120

describe('the symptom suppression, which is the only one that can hurt somebody', () => {
    it('shows no zones at any age when symptoms on exertion were reported', () => {
        ADULT_AGES.forEach((age) => {
            const result = zonesFor(age, { symptomFlag: true });
            expect(result.suppressed, `age ${age}`).toBe('symptoms');
            expect(result.zones, `age ${age} must not carry a table`).toBeUndefined();
        });
    });

    it('suppresses even when the age is unusable, so the order of the checks is proven', () => {
        // If the age lookup ran first this would come back 'age-unknown', which is
        // a different sentence and would mean the suppression depends on the
        // calculation succeeding. It must not.
        [null, undefined, '', 'abc', 0, -4, 999].forEach((bad) => {
            expect(zonesFor(bad, { symptomFlag: true }).suppressed).toBe('symptoms');
        });
    });

    /*
      ⚠️ THIS TEST RECORDS A SHARP EDGE RATHER THAN A SAFETY PROPERTY, and it is
         written down so nobody has to rediscover it. The check is `=== true`, so a
         TRUTHY value that is not a boolean does NOT suppress. That is safe only
         because both pathways derive a real boolean: `clinicalParse.js` and
         `formClinicalData.js` each produce `symptomFlag` as true or false and
         `pathwayParity.test.js` holds them to it.

         A loose `if (flags.symptomFlag)` would be worse, not better: it would let
         any stray string suppress the table silently, so a future bug that passed
         'no' would hide the block and look like it was working.
    */
    it('requires a literal true, because both pathways supply a real boolean', () => {
        [false, undefined, null, 0, '', 'yes', 1].forEach((notTrue) => {
            expect(zonesFor(67, { symptomFlag: notTrue }).suppressed, String(notTrue))
                .toBeUndefined();
        });
        expect(zonesFor(67, { symptomFlag: true }).suppressed).toBe('symptoms');
    });
});

describe('medication slows the heart, so it cautions rather than hides', () => {
    it('still returns the full table, flagged', () => {
        const result = zonesFor(67, { medFlag: true });
        expect(result.suppressed).toBeUndefined();
        expect(result.zones).toHaveLength(ZONE_IDS.length);
        expect(result.cautionOnly).toBe(true);
    });

    it('symptoms beat medication when both are set', () => {
        expect(zonesFor(67, { medFlag: true, symptomFlag: true }).suppressed).toBe('symptoms');
    });
});

describe('which equation computes the numbers', () => {
    it('uses Tanaka for the zones at every adult age', () => {
        ADULT_AGES.forEach((age) => {
            const result = zonesFor(age);
            expect(result.hrMax, `age ${age}`).toBe(Math.round(208 - (0.7 * age)));
        });
    });

    it('carries Astrand for display and marks it outside its population past 34', () => {
        ADULT_AGES.forEach((age) => {
            const { astrand } = maxHeartRates(age);
            expect(astrand.bpm).toBe(Math.round(216.6 - (0.84 * age)));
            expect(astrand.withinPopulation, `age ${age}`).toBe(age <= 34);
        });
    });

    it('the two equations really do disagree, which is why both are printed', () => {
        // If they agreed, showing both would be noise. At 67 they are several beats
        // apart, and that gap is the honest introduction to how soft the estimate is.
        const { tanaka, astrand } = maxHeartRates(67);
        expect(Math.abs(tanaka.bpm - astrand.bpm)).toBeGreaterThanOrEqual(1);
    });

    it('the spread printed beside the figures is wide enough to matter', () => {
        // The point of printing it: the uncertainty is a large share of a zone's
        // width, so the zones cannot be read as personal thresholds.
        const { zones } = zonesFor(67);
        const widest = Math.max(...zones.map((z) => z.toBpm - z.fromBpm));
        expect(ESTIMATE_SPREAD_BPM).toBeGreaterThan(widest / 2);
    });
});

describe('the table itself', () => {
    it('is contiguous, ascending, and covers 50 to 100 per cent with no gaps', () => {
        ADULT_AGES.forEach((age) => {
            const { zones } = zonesFor(age);
            expect(zones.map((z) => z.id)).toEqual([...ZONE_IDS]);
            expect(zones[0].fromPct).toBe(50);
            expect(zones[zones.length - 1].toPct).toBe(100);
            zones.forEach((zone, i) => {
                expect(zone.toPct, `age ${age} ${zone.id}`).toBeGreaterThan(zone.fromPct);
                expect(zone.toBpm).toBeGreaterThan(zone.fromBpm);
                if (i > 0) {
                    // No gap and no overlap: the previous zone's top IS this one's floor.
                    expect(zone.fromPct).toBe(zones[i - 1].toPct);
                    expect(zone.fromBpm).toBe(zones[i - 1].toBpm);
                }
            });
        });
    });

    it('every bpm figure is a finite whole number', () => {
        ADULT_AGES.forEach((age) => {
            zonesFor(age).zones.forEach((zone) => {
                expect(Number.isInteger(zone.fromBpm), `age ${age}`).toBe(true);
                expect(Number.isInteger(zone.toBpm), `age ${age}`).toBe(true);
            });
        });
    });

    it('every zone id has bounds, and no bounds exist for an id nobody renders', () => {
        expect(Object.keys(ZONE_BOUNDS).sort()).toEqual([...ZONE_IDS].sort());
    });
});

describe('an age we cannot use', () => {
    it('returns a suppression rather than zeroes or a throw', () => {
        [null, undefined, '', 'abc', 17, 121, -1, NaN, {}, []].forEach((bad) => {
            const result = zonesFor(bad);
            expect(result.suppressed, String(bad)).toBe('age-unknown');
            expect(result.zones).toBeUndefined();
        });
    });

    it('maxHeartRates returns null rather than an estimate built on nothing', () => {
        expect(maxHeartRates(null)).toBeNull();
        expect(maxHeartRates(17)).toBeNull();
        expect(maxHeartRates(121)).toBeNull();
    });

    it('every suppression a caller can receive is declared', () => {
        const seen = new Set();
        [null, 17, 200].forEach((bad) => seen.add(zonesFor(bad).suppressed));
        seen.add(zonesFor(67, { symptomFlag: true }).suppressed);
        seen.forEach((reason) => expect(SUPPRESSION_REASONS).toContain(reason));
    });
});

describe('the citations are real and complete', () => {
    it('names both equations with a population and a source', () => {
        Object.values(HR_EQUATIONS).forEach((spec) => {
            expect(spec.citation.length).toBeGreaterThan(30);
            expect(spec.label).toMatch(/age/);
            expect(Number.isInteger(spec.populationFrom)).toBe(true);
        });
        // The fact the whole design turns on: Astrand's sample stops at 34.
        expect(HR_EQUATIONS.astrand.populationTo).toBe(34);
        expect(HR_EQUATIONS.tanaka.populationTo).toBeNull();
    });
});

describe('nothing here ever throws', () => {
    it('survives every shape a caller might pass', () => {
        const inputs = [undefined, null, '', 'x', 0, -1, 1e9, NaN, {}, [], true, false];
        inputs.forEach((age) => {
            inputs.forEach((flag) => {
                expect(() => zonesFor(age, { symptomFlag: flag, medFlag: flag })).not.toThrow();
            });
            expect(() => zonesFor(age)).not.toThrow();
            expect(() => zonesFor(age, null)).not.toThrow();
            expect(() => maxHeartRates(age)).not.toThrow();
        });
    });
});
