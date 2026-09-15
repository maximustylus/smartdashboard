/**
 * ==============================================================================
 * HEART RATE ZONES — an age-based estimate, and everything wrong with it, printed
 * ==============================================================================
 *
 * Five training zones as a percentage of an ESTIMATED maximum heart rate, for the
 * spare room on the measurements page. `COMMUNITY_TODO.md` P9.
 *
 * ------------------------------------------------------------------------------
 * ⚠️ THE PORTAL NEVER MEASURES A HEART RATE, AND NEVER TELLS ANYBODY TO REACH ONE
 * ------------------------------------------------------------------------------
 *
 * Same rule as `functionalMeasures.js` under `CD17`. Nothing here counts a pulse.
 * These are reference numbers a resident can read, hold against what their own
 * watch shows them, and take to whoever is guiding their exercise. The zone names
 * describe INTENSITY, not a target to hit: "maximum" is a label for a range, and
 * the copy never invites anybody into it.
 *
 * ------------------------------------------------------------------------------
 * ⚠️ TWO EQUATIONS ARE SHOWN. ONE OF THEM COMPUTES THE ZONES.
 * ------------------------------------------------------------------------------
 *
 *     Tanaka (2001) ... 208 - 0.7 x age ...... derived across healthy adults
 *     Astrand ......... 216.6 - 0.84 x age ... STATED POPULATION AGES 4 TO 34
 *
 * Both are printed, because both were asked for and a resident comparing them
 * learns something true: two published equations disagree about them by several
 * beats, which is the honest introduction to how soft this number is.
 *
 * The ZONES are computed from Tanaka alone. Astrand's own stated population stops
 * at 34, and the residents this page is for are mostly past 60. Running the zone
 * arithmetic off an equation extrapolated three decades beyond the sample it was
 * fitted to would be inventing precision, and it would do it for the oldest and
 * most cautious readers. `withinPopulation` carries that fact per equation so the
 * page can say so rather than quietly picking one.
 *
 * ------------------------------------------------------------------------------
 * ⚠️ THE ESTIMATE IS WIDER THAN THE ZONES IT PRODUCES
 * ------------------------------------------------------------------------------
 *
 * An age-based maximum carries a standard deviation of roughly ten to twelve beats
 * per minute between individuals of the SAME age. A ten-percent zone for a
 * 67-year-old is about sixteen beats wide. So the uncertainty in the estimate is
 * most of the width of a zone, and a resident who reads these as their own
 * personal thresholds has been misled by arithmetic that looks exact.
 *
 * `ESTIMATE_SPREAD_BPM` exists so the page must print that. It is not decoration.
 *
 * ------------------------------------------------------------------------------
 * ⚠️ TWO SUPPRESSIONS, AND THE SYMPTOM ONE IS CHECKED FIRST
 * ------------------------------------------------------------------------------
 *
 * `symptomFlag` means the resident has already told this assessment they get chest
 * pain, dizziness or similar on exertion. They are shown NO zones at all, because a
 * table of intensity ranges is an invitation to exert, and for that person the only
 * correct output is "see somebody before you do". It is tested BEFORE the age
 * lookup on purpose: a suppression that depends on a successful calculation is a
 * suppression that fails open the moment the calculation changes.
 *
 * `medFlag` (rate-limiting medication such as a beta blocker) does NOT suppress.
 * It makes the estimate wrong in a known direction, so the zones are shown with a
 * caution saying the numbers will not match their pulse. Hiding them would remove
 * the explanation along with the table.
 */

import { parseAgeYears } from './functionalMeasures';

export const ZONE_IDS = Object.freeze([
    'very-light', 'light', 'moderate', 'hard', 'maximum',
]);

/** Percentage of estimated maximum that opens and closes each zone. */
export const ZONE_BOUNDS = Object.freeze({
    'very-light': Object.freeze([50, 60]),
    light: Object.freeze([60, 70]),
    moderate: Object.freeze([70, 80]),
    hard: Object.freeze([80, 90]),
    maximum: Object.freeze([90, 100]),
});

/**
 * Roughly one standard deviation of an age-based maximum between individuals of the
 * same age. Printed beside every figure on the page. See the header.
 */
export const ESTIMATE_SPREAD_BPM = 11;

export const HR_EQUATIONS = Object.freeze({
    tanaka: Object.freeze({
        id: 'tanaka',
        label: '208 - 0.7 x age',
        /*
          ⚠️ `short` IS WHAT THE REPORT PRINTS, and it is not a cosmetic choice.
             Page 2 clipped by 44px in Malay and Tamil with the full citations on
             it, and what fell off the bottom was the safety caution. A short form
             that still names the journal, year, volume and pages locates the paper
             exactly; the full form stays here for anybody reading the source.
        */
        short: 'Tanaka H et al. J Am Coll Cardiol. 2001;37(1):153-156.',
        citation: 'Tanaka H, Monahan KD, Seals DR. Age-predicted maximal heart rate revisited. J Am Coll Cardiol. 2001;37(1):153-156.',
        doi: '10.1016/s0735-1097(00)01054-8',
        // The population each equation was fitted to, which is what decides whether
        // it may be used for a given resident rather than merely quoted at them.
        populationFrom: 18,
        populationTo: null,
    }),
    astrand: Object.freeze({
        id: 'astrand',
        label: '216.6 - 0.84 x age',
        short: 'Astrand PO. Copenhagen: Munksgaard; 1952.',
        citation: 'Astrand PO. Experimental studies of physical working capacity in relation to sex and age. Copenhagen: Munksgaard; 1952.',
        doi: null,
        populationFrom: 4,
        populationTo: 34,
    }),
});

const withinPopulation = (spec, age) => {
    if (age < spec.populationFrom) return false;
    if (spec.populationTo !== null && age > spec.populationTo) return false;
    return true;
};

/**
 * Both estimates for an age, each carrying whether the equation's own stated
 * population covers this person.
 *
 * @returns {{tanaka: {bpm: number, withinPopulation: boolean},
 *            astrand: {bpm: number, withinPopulation: boolean}, ageYears: number}}
 *        | null  when the age is not a usable one
 */
export const maxHeartRates = (ageYears) => {
    const age = parseAgeYears(ageYears);
    if (age === null) return null;
    return {
        ageYears: age,
        tanaka: {
            bpm: Math.round(208 - (0.7 * age)),
            withinPopulation: withinPopulation(HR_EQUATIONS.tanaka, age),
        },
        astrand: {
            bpm: Math.round(216.6 - (0.84 * age)),
            withinPopulation: withinPopulation(HR_EQUATIONS.astrand, age),
        },
    };
};

/**
 * The five zones for a resident, or a reason there are none.
 *
 * Never throws and never returns a partial table. Every caller gets either
 * `{ zones: [...] }` or `{ suppressed: <reason> }`, so a page cannot render half a
 * chart by forgetting to check one field.
 *
 * @param {number|string|null} ageYears
 * @param {{symptomFlag?: boolean, medFlag?: boolean}} flags
 */
export const zonesFor = (ageYears, flags = {}) => {
    /*
      ⚠️ BEFORE THE AGE LOOKUP, NOT AFTER. See the header: ordering this second
         would mean a future change to `maxHeartRates` could return early and hand a
         symptomatic resident a table of intensity ranges. The suppression must not
         depend on the calculation succeeding.
    */
    if (flags?.symptomFlag === true) return { suppressed: 'symptoms' };

    const basis = maxHeartRates(ageYears);
    if (basis === null) return { suppressed: 'age-unknown' };

    // Tanaka, for the reason in the header. Astrand is carried in `basis` so the
    // page can print it beside this one, clearly marked.
    const hrMax = basis.tanaka.bpm;

    const zones = ZONE_IDS.map((id) => {
        const [fromPct, toPct] = ZONE_BOUNDS[id];
        return {
            id,
            fromPct,
            toPct,
            fromBpm: Math.round((hrMax * fromPct) / 100),
            toBpm: Math.round((hrMax * toPct) / 100),
        };
    });

    return {
        zones,
        basis,
        hrMax,
        spreadBpm: ESTIMATE_SPREAD_BPM,
        // Shown WITH the table, not instead of it. See the header.
        cautionOnly: flags?.medFlag === true,
    };
};

/** Every suppression reason, so no caller misses one and renders nothing at all. */
export const SUPPRESSION_REASONS = Object.freeze(['symptoms', 'age-unknown']);
