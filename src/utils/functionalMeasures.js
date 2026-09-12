/**
 * ==============================================================================
 * FUNCTIONAL MEASURES — turning an entered value into something honest to say
 * ==============================================================================
 *
 * Grip strength in kilograms and repetitions completed in a 30-second chair stand,
 * measured by somebody else and entered by the resident. `COMMUNITY_TODO.md` P9.
 *
 * ------------------------------------------------------------------------------
 * ⚠️ THE PORTAL NEVER ADMINISTERS EITHER TEST (`CD17`)
 * ------------------------------------------------------------------------------
 *
 * Nothing here times anything, counts anything, or asks anybody to stand up. The
 * CDC's own chair-stand form is a supervised instrument: it says "Instruct the
 * patient", specifies a 17-inch seat, carries the marginal note "Stand next to the
 * patient for safety", and stops the test if the patient uses their arms. A browser
 * cannot see the person, guard them, stop them or call for help, and the assessment
 * has by this point already recorded that some residents get chest pain on exertion.
 * So these functions INTERPRET a measurement. They never produce one.
 *
 * ------------------------------------------------------------------------------
 * ⚠️ A BAND, NOT A PERCENTILE (`CD18`)
 * ------------------------------------------------------------------------------
 *
 * The grip source tabulates percentiles, so a rank is computable. It is not
 * reported, for two reasons. The source's own authors prescribe a five-level
 * quintile reading instead (section 4.2), and measurement variation is wider than a
 * percentile is precise: their harmonisation adjustments alone reach 17% across
 * reporting variants, which moves a value across several percentile columns. A band
 * survives that. A rank does not, and rank feedback reliably reduces effort in the
 * people at the bottom of it, who are the residents this portal exists to reach.
 *
 * ------------------------------------------------------------------------------
 * ⚠️ THIS NEVER TOUCHES THE TRAFFIC LIGHT (`CD20`)
 * ------------------------------------------------------------------------------
 *
 * `calculateRiskScore` does not read these fields and must not. Its documented rule
 * is that missing data counts as a deficit, "wrong towards caution". That rule is
 * right for a question anyone can answer from memory and wrong for a measurement
 * requiring a dynamometer: it would charge a deficit to every resident who does not
 * own one, which is precisely the cost-constrained cohort the portal is for. The
 * repository already settled this shape once, for `falls`, which is collected
 * conditionally and deliberately left out of the score.
 *
 * ------------------------------------------------------------------------------
 * NOTHING HERE THROWS
 * ------------------------------------------------------------------------------
 *
 * Every path returns a result object. `ok: false` carries a `reason` the caller
 * turns into lay wording. "No comparison is available for your age" is a real,
 * expected answer, and it is a better one than a number nobody can stand behind.
 */

import {
    GRIP_NORMS_KG, GRIP_SOURCE, GRIP_RANGE_KG, STRENGTH_BANDS,
    CHAIR_STAND_BELOW_AVERAGE, CHAIR_STAND_SOURCE, CHAIR_STAND_RANGE_REPS,
    PERCENTILE_LEVELS, SIT_TO_STAND_PROTOCOLS, SIT_TO_STAND_SPLIT_AGE,
    STS_60S_SOURCE, STS_60S_RANGE_REPS, SIT_TO_STAND_PLAUSIBLE,
    STS_60S_NORMS_REPS, STS_60S_PERCENTILE_LEVELS,
} from '../data/functionalNorms';

/**
 * A finite number, or `null` for anything that is not one. `null` means UNKNOWN.
 *
 * ⚠️ EMPTY IS MISSING, NOT ZERO. `Number('')` and `Number(null)` are both 0, so a
 *    cleared input box or an absent field would otherwise arrive as a measurement
 *    of zero kilograms and be refused as implausible rather than recognised as not
 *    given. The resident would be told their entry was invalid when they had simply
 *    not made one. `scoring.js` carries the same warning for the same reason.
 */
const asNumber = (value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string' && value.trim() === '') return null;
    if (typeof value !== 'number' && typeof value !== 'string') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Both reference sets are stratified by SEX, which the sources treat as a biological
 * variable. The portal asks for gender and offers two options plus, on some
 * surfaces, a decline. Anything that is not an unambiguous male or female returns no
 * comparison rather than being silently assigned to one of them.
 */
const normaliseSex = (value) => {
    if (typeof value !== 'string') return null;
    const v = value.trim().toLowerCase();
    if (v === 'male' || v === 'm') return 'male';
    if (v === 'female' || v === 'f') return 'female';
    return null;
};

/**
 * A whole-year age. The five-year bands the sources use cannot be derived from the
 * portal's old 21-40 / 41-60 / 60+ groups, which is why `CD25` settled on collecting
 * a precise age. A value outside a plausible adult lifespan is not an age.
 */
export const AGE_RANGE_YEARS = Object.freeze({ min: 18, max: 120 });

export const parseAgeYears = (value) => {
    const n = asNumber(value);
    if (n === null) return null;
    const whole = Math.floor(n);
    if (whole < AGE_RANGE_YEARS.min || whole > AGE_RANGE_YEARS.max) return null;
    return whole;
};

const rowForAge = (rows, ageYears) => rows.find(
    (r) => ageYears >= r.from && (r.to === null || ageYears <= r.to),
) || null;

/**
 * The five-year band label, which is what gets STORED. The exact age stays on the
 * device for the comparison and is never written to `community_assessments`: the
 * record already carries postal sector, gender, ethnicity and housing type, and an
 * exact age turns that quasi-identifier set into something considerably sharper.
 * Banding it costs the analysis nothing, because every reference is banded anyway.
 */
export const ageBandLabel = (ageYears) => {
    const age = parseAgeYears(ageYears);
    if (age === null) return null;
    if (age >= 100) return '100+';
    const lower = Math.floor(age / 5) * 5;
    return `${lower}-${lower + 4}`;
};

const P20 = PERCENTILE_LEVELS.indexOf(20);
const P40 = PERCENTILE_LEVELS.indexOf(40);
const P60 = PERCENTILE_LEVELS.indexOf(60);
const P80 = PERCENTILE_LEVELS.indexOf(80);

// Strassmann reports quartiles, so its columns are indexed separately from grip's.
const P25_STS = STS_60S_PERCENTILE_LEVELS.indexOf(25);
const P75_STS = STS_60S_PERCENTILE_LEVELS.indexOf(75);

/**
 * Grip strength against the international reference range.
 *
 * @returns {{ok: true, band: string, value: number, unit: 'kg', ageBand: string,
 *            sex: string, sourceId: string, referencePopulation: string}}
 *        | {{ok: false, reason: string, value: number|null}}
 */
export const gripStrengthResult = (input) => {
    const { ageYears, sex, kg } = input || {};
    const value = asNumber(kg);
    if (value === null) return { ok: false, reason: 'missing', value: null };
    if (value < GRIP_RANGE_KG.min || value > GRIP_RANGE_KG.max) {
        return { ok: false, reason: 'out-of-range', value };
    }

    const age = parseAgeYears(ageYears);
    if (age === null) return { ok: false, reason: 'age-unknown', value };
    if (age < GRIP_SOURCE.minAge) return { ok: false, reason: 'no-reference-for-age', value };

    const normalisedSex = normaliseSex(sex);
    if (normalisedSex === null) return { ok: false, reason: 'no-reference-for-sex', value };

    const row = rowForAge(GRIP_NORMS_KG[normalisedSex], age);
    if (row === null) return { ok: false, reason: 'no-reference-for-age', value };

    // The quintile cuts the source itself prescribes. Strictly below the P20 value
    // is "low"; the threshold value itself is not.
    let band = 'high';
    if (value < row.p[P20]) band = 'low';
    else if (value < row.p[P40]) band = 'somewhat-low';
    else if (value < row.p[P60]) band = 'moderate';
    else if (value < row.p[P80]) band = 'somewhat-high';

    return {
        ok: true,
        band,
        value,
        unit: 'kg',
        ageBand: ageBandLabel(age),
        sex: normalisedSex,
        lowThreshold: row.p[P20],
        sourceId: GRIP_SOURCE.id,
        referencePopulation: GRIP_SOURCE.referencePopulation,
    };
};

/**
 * ==============================================================================
 * SIT-TO-STAND — which test the person should have done, and reading their count
 * ==============================================================================
 */

/**
 * The protocol for an age: the one-minute test below 60, the thirty-second chair
 * stand from 60. Returns `null` when no protocol applies, which is anybody under
 * 20, because neither reference reaches them.
 */
export const sitToStandProtocolForAge = (ageYears) => {
    const age = parseAgeYears(ageYears);
    if (age === null) return null;
    if (age < SIT_TO_STAND_PROTOCOLS['sts-60s'].minAge) return null;
    return age < SIT_TO_STAND_SPLIT_AGE ? 'sts-60s' : 'sts-30s';
};

/**
 * Reads a sit-to-stand count.
 *
 * `protocol` is REQUIRED and is what the resident was actually asked, carried
 * forward from the question rather than re-derived here. If it disagrees with the
 * protocol their age implies, the count is kept and reported but not banded: a
 * thirty-second count read against one-minute norms would tell somebody they are
 * far weaker than they are, and that is the likeliest way this feature hurts
 * anyone.
 *
 * Under 60 there is currently no band, because the one-minute reference table has
 * not been loaded (`STS_60S_SOURCE.tableLoaded`). That returns
 * `reference-unavailable`, which is an honest answer and not an error.
 */
export const sitToStandResult = (input) => {
    const { ageYears, sex, reps, protocol } = input || {};

    if (!Object.prototype.hasOwnProperty.call(SIT_TO_STAND_PROTOCOLS, protocol)) {
        return { ok: false, reason: 'protocol-unknown', value: null };
    }
    const spec = SIT_TO_STAND_PROTOCOLS[protocol];
    const range = protocol === 'sts-60s' ? STS_60S_RANGE_REPS : CHAIR_STAND_RANGE_REPS;

    const value = asNumber(reps);
    if (value === null) return { ok: false, reason: 'missing', value: null, protocol };
    if (!Number.isInteger(value) || value < range.min || value > range.max) {
        return { ok: false, reason: 'out-of-range', value, protocol };
    }

    const age = parseAgeYears(ageYears);
    if (age === null) return { ok: false, reason: 'age-unknown', value, protocol };

    // The wrong-stopwatch guard. The count stands; the comparison does not.
    if (sitToStandProtocolForAge(age) !== protocol) {
        return { ok: false, reason: 'protocol-age-mismatch', value, protocol };
    }

    const plausible = SIT_TO_STAND_PLAUSIBLE[protocol];
    const implausible = value < plausible.min || value > plausible.max;

    const normalisedSex = normaliseSex(sex);
    if (normalisedSex === null) return { ok: false, reason: 'no-reference-for-sex', value, protocol };

    if (protocol === 'sts-60s') {
        // Kept as a guard rather than removed: if a future edit clears the table,
        // this refuses rather than banding against an empty one.
        if (!STS_60S_SOURCE.tableLoaded) {
            return { ok: false, reason: 'reference-unavailable', value, protocol };
        }
        const stsRow = rowForAge(STS_60S_NORMS_REPS[normalisedSex], age);
        if (stsRow === null) return { ok: false, reason: 'no-reference-for-age', value, protocol };

        // Quartile cuts. "Typical" is the interquartile range inclusive, so the
        // boundary values themselves read as typical rather than as outliers.
        let stsBand = 'typical';
        if (value < stsRow.p[P25_STS]) stsBand = 'below-typical';
        else if (value > stsRow.p[P75_STS]) stsBand = 'above-typical';

        return {
            ok: true,
            band: stsBand,
            value,
            unit: 'reps',
            protocol,
            seconds: spec.seconds,
            implausibleForProtocol: implausible,
            ageBand: ageBandLabel(age),
            sex: normalisedSex,
            typicalRange: [stsRow.p[P25_STS], stsRow.p[P75_STS]],
            sourceId: STS_60S_SOURCE.id,
            referencePopulation: STS_60S_SOURCE.referencePopulation,
        };
    }

    const row = rowForAge(CHAIR_STAND_BELOW_AVERAGE[normalisedSex], age);
    if (row === null) return { ok: false, reason: 'no-reference-for-age', value, protocol };

    return {
        ok: true,
        band: value < row.belowAverage ? 'below-average' : 'at-or-above-average',
        value,
        unit: 'reps',
        protocol,
        seconds: spec.seconds,
        implausibleForProtocol: implausible,
        ageBand: ageBandLabel(age),
        sex: normalisedSex,
        belowAverageThreshold: row.belowAverage,
        sourceId: CHAIR_STAND_SOURCE.id,
        referencePopulation: CHAIR_STAND_SOURCE.referencePopulation,
    };
};

/** Every band id either function can return, for exhaustiveness tests and copy. */
export const GRIP_BAND_IDS = Object.freeze(STRENGTH_BANDS.map((b) => b.id));
export const CHAIR_STAND_BAND_IDS = Object.freeze(['below-average', 'at-or-above-average']);

/** Every `reason` an unsuccessful result can carry, so no caller misses a case. */
export const RESULT_REASONS = Object.freeze([
    'missing', 'out-of-range', 'age-unknown', 'no-reference-for-age', 'no-reference-for-sex',
    'protocol-unknown', 'protocol-age-mismatch', 'reference-unavailable',
]);

/**
 * What may be written to `community_assessments`: the BAND and its provenance, never
 * the raw measurement. Two continuous physiological values alongside postal sector,
 * age band, gender, ethnicity and housing type would make a record identifiable to
 * whoever ran the session at which it was measured. The raw number is the resident's
 * and stays in `sessionStorage` for their own report.
 */
export const toStorableBand = (result) => {
    if (!result || result.ok !== true) return null;
    const stored = {
        band: result.band,
        ageBand: result.ageBand,
        sex: result.sex,
        sourceId: result.sourceId,
    };
    // Which test produced this, so a later comparison cannot read a thirty-second
    // count against one-minute norms.
    if (result.protocol) stored.protocol = result.protocol;
    return stored;
};
