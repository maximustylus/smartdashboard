/**
 * ==============================================================================
 * FUNCTIONAL NORMS — reference values for grip strength and the chair stand
 * ==============================================================================
 *
 * Two published reference sets, machine-copied from the source PDFs' text layers
 * rather than typed, and validated on the way in: every percentile row must rise
 * monotonically, bands must be contiguous five-year groups, male values must exceed
 * female at every matching cell, and the P50 peaks must equal the figures the paper
 * states in its own abstract (49.7 kg male, 29.7 kg female at 30-34). The generator
 * refuses to emit a table failing any of those, and `functionalNorms.test.js`
 * re-checks the same invariants against what actually shipped.
 *
 * ⚠️ NEITHER SOURCE IS A SOUTH EAST ASIAN NORM, AND NOTHING MAY SAY IT IS.
 *    Tomkinson is explicitly INTERNATIONAL, population-weighted to UN 2021 global
 *    demographics and framed by its own authors for "global peer-comparisons"; the
 *    paper notes national norms may be complementary for within-country comparison.
 *    STEADI is United States data. Every on-screen and printed word names the
 *    reference population honestly. See `COMMUNITY_TODO.md` P9 and `CD21`.
 *
 * ⚠️ A VALUE IS ONLY COMPARABLE IF IT WAS MEASURED THE SAME WAY. Tomkinson's
 *    harmonisation adjustments run from under 1% to 10% across dynamometer types
 *    and body positions, and up to 17% across reporting variants. That is wider
 *    than the gap between several adjacent percentiles below. It is why provenance
 *    travels with the value instead of being optional metadata, and why a value
 *    whose protocol is unknown is reported as a measurement and not as a band.
 *
 * ⚠️ THE LOWER PERCENTILES MAY SIT HIGH. The authors note grip testing is often
 *    contraindicated in adults with chronic conditions, pain or injury, so included
 *    samples were probably healthier than the general population and the lower
 *    percentiles may overestimate true population values. For screening that errs
 *    towards flagging more people, which is the safe direction, but it belongs on
 *    the governance page rather than being left implicit.
 */

/** Percentile columns, in the order every `p` array below uses. */
export const PERCENTILE_LEVELS = Object.freeze([5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95]);

/**
 * The five-level reading the source itself prescribes (section 4.2), rather than a
 * raw rank. The authors propose the lowest quintile as an interim cut-point for
 * identifying at-risk adults, pending criterion-referenced evidence.
 *
 * `id` is what gets stored and translated. No label here is a diagnosis and none
 * uses ranking language on a public surface; the resident-facing wording lives in
 * the language dictionaries, not in this file.
 */
export const STRENGTH_BANDS = Object.freeze([
    { id: 'low', below: 20 },
    { id: 'somewhat-low', below: 40 },
    { id: 'moderate', below: 60 },
    { id: 'somewhat-high', below: 80 },
    { id: 'high', below: null },
].map(Object.freeze));

/**
 * Tomkinson GR, Lang JJ, Rubin L, et al. International norms for adult handgrip
 * strength: a systematic review of data on 2.4 million adults aged 20 to 100+ years
 * from 69 countries and regions. J Sport Health Sci 2025;14:101014.
 * doi:10.1016/j.jshs.2024.101014 — open access, CC BY. Table 2, absolute grip in kg.
 *
 * `to: null` is the open-ended 100+ group. The paper states 20-24 means 20.00 to
 * 24.99, so a band holds every age from `from` up to but not including `to` + 1.
 */
export const GRIP_SOURCE = Object.freeze({
    id: 'tomkinson-2025-absolute',
    citation: 'Tomkinson GR, Lang JJ, Rubin L, et al. J Sport Health Sci 2025;14:101014',
    doi: '10.1016/j.jshs.2024.101014',
    licence: 'CC BY',
    referencePopulation: 'international',
    minAge: 20,
    maxAge: null,
    protocol: Object.freeze({
        dynamometer: 'hydraulic',
        bodyPosition: 'seated',
        elbowPosition: 'flexed',
        radioulnarPosition: 'neutral',
        handlePosition: 'adjusted to hand size',
        testingHand: 'both',
        repetitionsPerHand: 3,
        summaryStatistic: 'maximum',
    }),
});

/** Plausible entry envelope. Outside this the value is refused, never banded. */
export const GRIP_RANGE_KG = Object.freeze({ min: 1, max: 100 });

export const GRIP_NORMS_KG = Object.freeze({
    male: Object.freeze([
        { from: 20, to: 24, p: [33.9, 36.8, 40.5, 43.2, 45.7, 48, 50.4, 52.9, 56, 60.1, 63.6] },
        { from: 25, to: 29, p: [35.5, 38.5, 42.1, 44.8, 47.1, 49.3, 51.5, 53.9, 56.7, 60.7, 64] },
        { from: 30, to: 34, p: [35, 38.3, 42.2, 45, 47.4, 49.7, 52, 54.4, 57.4, 61.5, 64.9] },
        { from: 35, to: 39, p: [33.8, 37.3, 41.5, 44.5, 47.1, 49.5, 51.9, 54.4, 57.5, 61.8, 65.3] },
        { from: 40, to: 44, p: [32.3, 36, 40.4, 43.6, 46.3, 48.8, 51.2, 53.9, 57.1, 61.5, 65.1] },
        { from: 45, to: 49, p: [30.6, 34.4, 39, 42.3, 45.1, 47.6, 50.2, 52.9, 56.2, 60.7, 64.4] },
        { from: 50, to: 54, p: [28.9, 32.8, 37.4, 40.7, 43.5, 46.2, 48.8, 51.6, 54.8, 59.4, 63.1] },
        { from: 55, to: 59, p: [27.2, 31, 35.6, 38.9, 41.7, 44.4, 47, 49.8, 53.1, 57.7, 61.4] },
        { from: 60, to: 64, p: [25.5, 29.1, 33.6, 36.9, 39.7, 42.4, 45, 47.8, 51.1, 55.6, 59.3] },
        { from: 65, to: 69, p: [23.7, 27.2, 31.5, 34.7, 37.5, 40.1, 42.8, 45.6, 48.8, 53.2, 56.8] },
        { from: 70, to: 74, p: [21.9, 25.2, 29.3, 32.4, 35.1, 37.7, 40.3, 43.1, 46.3, 50.6, 54.1] },
        { from: 75, to: 79, p: [20, 23.1, 27, 29.9, 32.5, 35.1, 37.6, 40.3, 43.5, 47.7, 51.1] },
        { from: 80, to: 84, p: [18, 20.8, 24.5, 27.3, 29.8, 32.3, 34.8, 37.5, 40.5, 44.7, 48] },
        { from: 85, to: 89, p: [15.9, 18.5, 21.9, 24.6, 27, 29.4, 31.8, 34.4, 37.4, 41.5, 44.6] },
        { from: 90, to: 94, p: [13.7, 16.1, 19.2, 21.7, 24, 26.3, 28.7, 31.2, 34.2, 38.1, 41.2] },
        { from: 95, to: 99, p: [11.3, 13.5, 16.4, 18.8, 20.9, 23.1, 25.4, 27.9, 30.8, 34.6, 37.5] },
        { from: 100, to: null, p: [8.8, 10.8, 13.5, 15.7, 17.8, 19.8, 22, 24.5, 27.2, 30.9, 33.8] },
    ].map(Object.freeze)),
    female: Object.freeze([
        { from: 20, to: 24, p: [19.7, 21.7, 24, 25.7, 27.2, 28.6, 30, 31.6, 33.6, 36.6, 39.1] },
        { from: 25, to: 29, p: [20, 22, 24.5, 26.3, 27.9, 29.4, 30.9, 32.6, 34.6, 37.4, 39.7] },
        { from: 30, to: 34, p: [19.6, 21.8, 24.4, 26.4, 28.1, 29.7, 31.3, 33.1, 35.2, 38, 40.4] },
        { from: 35, to: 39, p: [19, 21.3, 24.1, 26.2, 28, 29.7, 31.4, 33.2, 35.4, 38.4, 40.8] },
        { from: 40, to: 44, p: [18.3, 20.7, 23.7, 25.8, 27.6, 29.4, 31.1, 33, 35.2, 38.3, 40.8] },
        { from: 45, to: 49, p: [17.6, 20.1, 23.1, 25.2, 27.1, 28.9, 30.6, 32.5, 34.8, 37.9, 40.4] },
        { from: 50, to: 54, p: [16.9, 19.4, 22.4, 24.5, 26.4, 28.2, 29.9, 31.8, 34, 37.1, 39.7] },
        { from: 55, to: 59, p: [16.1, 18.5, 21.5, 23.7, 25.5, 27.3, 29, 30.9, 33, 36.1, 38.6] },
        { from: 60, to: 64, p: [15.2, 17.6, 20.6, 22.7, 24.5, 26.2, 27.9, 29.7, 31.8, 34.9, 37.4] },
        { from: 65, to: 69, p: [14.3, 16.6, 19.5, 21.6, 23.3, 25, 26.6, 28.4, 30.5, 33.4, 35.8] },
        { from: 70, to: 74, p: [13.2, 15.5, 18.3, 20.3, 22, 23.6, 25.2, 26.9, 28.9, 31.8, 34.1] },
        { from: 75, to: 79, p: [12, 14.3, 17, 18.9, 20.5, 22.1, 23.6, 25.2, 27.2, 29.9, 32.2] },
        { from: 80, to: 84, p: [10.7, 12.9, 15.5, 17.4, 18.9, 20.4, 21.9, 23.5, 25.3, 28, 30.2] },
        { from: 85, to: 89, p: [9.3, 11.4, 13.9, 15.7, 17.2, 18.6, 20, 21.5, 23.3, 25.9, 28] },
        { from: 90, to: 94, p: [7.8, 9.8, 12.2, 13.9, 15.3, 16.7, 18, 19.5, 21.2, 23.6, 25.7] },
        { from: 95, to: 99, p: [6.1, 8, 10.3, 11.9, 13.3, 14.6, 15.9, 17.3, 18.9, 21.2, 23.2] },
        { from: 100, to: null, p: [4.2, 6.1, 8.3, 9.8, 11.2, 12.4, 13.6, 14.9, 16.5, 18.7, 20.6] },
    ].map(Object.freeze)),
});

/**
 * CDC STEADI, "Assessment: 30-Second Chair Stand" (2017). Below-average scores by
 * age and sex; the source states a below-average score indicates a risk for falls.
 * Derived from the Rikli and Jones Senior Fitness Test, United States data.
 *
 * ⚠️ AGES 60 TO 94 ONLY. There is no row for a younger or older adult and none is
 *    invented. Outside that range the portal reports the number the resident gave
 *    and says plainly that no comparison is available for their age.
 *
 * ⚠️ THE SOURCE FORM IS A SUPERVISED INSTRUMENT. It reads "Instruct the patient",
 *    specifies a 17-inch seat, carries the marginal note "Stand next to the patient
 *    for safety", and stops the test if the patient uses their arms. None of that
 *    exists in a browser, which is why `CD17` settled that NEXUS accepts a value
 *    somebody else measured and never administers the test. These numbers interpret
 *    a result; they do not license producing one.
 */
/**
 * ==============================================================================
 * SIT-TO-STAND: TWO PROTOCOLS, SPLIT AT 60
 * ==============================================================================
 *
 * Under 60 the portal uses the ONE-MINUTE sit-to-stand; from 60 the THIRTY-SECOND
 * chair stand. That is not a preference, it is where the references exist: STEADI
 * begins at 60, and the only reference covering working-age adults is Strassmann's
 * one-minute test.
 *
 * ⚠️ THE TWO COUNTS ARE NOT INTERCHANGEABLE AND LOOK IDENTICAL. A count of 12 is a
 *    poor one-minute result and a fine thirty-second one. If a 58-year-old enters a
 *    thirty-second count it would be read against one-minute norms and they would be
 *    told they are far weaker than they are. So the protocol is stored WITH the
 *    value, never inferred from age at read time, and the question names the
 *    duration rather than saying "sit-to-stand".
 *
 * ⚠️ THE BOUNDARY IS A REAL DISCONTINUITY. Someone who re-tests after turning 60
 *    switches instrument, so their two results cannot be compared to each other.
 *    Any progress view must compare like with like or say it cannot.
 */
export const SIT_TO_STAND_PROTOCOLS = Object.freeze({
    /** Ages 20 to 79. Reference table pending: see `STS_60S_SOURCE`. */
    'sts-60s': Object.freeze({ id: 'sts-60s', seconds: 60, minAge: 20, maxAge: 79 }),
    /** Ages 60 to 94, CDC STEADI. */
    'sts-30s': Object.freeze({ id: 'sts-30s', seconds: 30, minAge: 60, maxAge: 94 }),
});

/** The age at which the portal switches instrument. Below this, the minute version. */
export const SIT_TO_STAND_SPLIT_AGE = 60;

/**
 * Strassmann A, Steurer-Stey C, Dalla Lana K, et al. Population-based reference
 * values for the 1-min sit-to-stand test. Int J Public Health 2013;58:949-53.
 * doi:10.1007/s00038-013-0504-z. Swiss population, 6,926 adults.
 *
 * ⚠️ THE REFERENCE TABLE IS NOT YET HELD. Only page 949 of the paper was supplied,
 *    which carries the abstract; the age-and-sex stratified values are on pages 950
 *    to 953. The four figures the abstract states are recorded below as a CHECK for
 *    whatever table is eventually loaded, and deliberately NOT as the table itself:
 *    they cover only the two extreme age groups, and interpolating the twelve bands
 *    between them would be inventing a norm. Until the real table lands, an under-60
 *    result reports the number and says plainly that no comparison is available.
 */
export const STS_60S_SOURCE = Object.freeze({
    id: 'strassmann-2013-1min',
    citation: 'Strassmann A, Steurer-Stey C, Dalla Lana K, et al. Int J Public Health 2013;58:949-53',
    doi: '10.1007/s00038-013-0504-z',
    referencePopulation: 'swiss',
    minAge: 20,
    maxAge: 79,
    /** `false` until the real table is loaded. Nothing may band against it while false. */
    tableLoaded: false,
});

/**
 * The only values the abstract states, for validating a future table load rather
 * than for banding anybody. `p25`/`p75` are the reported interquartile range.
 */
export const STS_60S_ABSTRACT_CHECKS = Object.freeze([
    { sex: 'male', from: 20, to: 24, median: 50, p25: 41, p75: 57 },
    { sex: 'female', from: 20, to: 24, median: 47, p25: 39, p75: 55 },
    { sex: 'male', from: 75, to: 79, median: 30, p25: 25, p75: 37 },
    { sex: 'female', from: 75, to: 79, median: 27, p25: 22, p75: 30 },
].map(Object.freeze));

/** Reps in one minute. Wider than the thirty-second envelope, necessarily. */
export const STS_60S_RANGE_REPS = Object.freeze({ min: 0, max: 120 });

/**
 * Counts that are possible but implausible for the protocol stated, which is the
 * signature of a value entered against the wrong stopwatch. Not a hard refusal:
 * the value is kept and reported, the comparison is withheld and the mismatch
 * surfaced, because a real person can legitimately be outside these.
 */
export const SIT_TO_STAND_PLAUSIBLE = Object.freeze({
    'sts-30s': Object.freeze({ min: 1, max: 35 }),
    'sts-60s': Object.freeze({ min: 10, max: 90 }),
});

export const CHAIR_STAND_SOURCE = Object.freeze({
    id: 'cdc-steadi-2017',
    citation: 'CDC STEADI, Assessment: 30-Second Chair Stand (2017)',
    referencePopulation: 'united-states',
    minAge: 60,
    maxAge: 94,
});

/** Plausible entry envelope for repetitions completed in 30 seconds. */
export const CHAIR_STAND_RANGE_REPS = Object.freeze({ min: 0, max: 60 });

/** `belowAverage` is the threshold the source prints as "< n" for that age and sex. */
export const CHAIR_STAND_BELOW_AVERAGE = Object.freeze({
    male: Object.freeze([
        { from: 60, to: 64, belowAverage: 14 },
        { from: 65, to: 69, belowAverage: 12 },
        { from: 70, to: 74, belowAverage: 12 },
        { from: 75, to: 79, belowAverage: 11 },
        { from: 80, to: 84, belowAverage: 10 },
        { from: 85, to: 89, belowAverage: 8 },
        { from: 90, to: 94, belowAverage: 7 },
    ].map(Object.freeze)),
    female: Object.freeze([
        { from: 60, to: 64, belowAverage: 12 },
        { from: 65, to: 69, belowAverage: 11 },
        { from: 70, to: 74, belowAverage: 10 },
        { from: 75, to: 79, belowAverage: 10 },
        { from: 80, to: 84, belowAverage: 9 },
        { from: 85, to: 89, belowAverage: 8 },
        { from: 90, to: 94, belowAverage: 4 },
    ].map(Object.freeze)),
});
