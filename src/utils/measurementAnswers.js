/**
 * ==============================================================================
 * MEASUREMENT ANSWERS — one reading of a typed strength number, for both pathways
 * ==============================================================================
 *
 * `functionalMeasures.js` bands a number that has already been understood. This is
 * the step before: turning what somebody actually typed or tapped, in one of four
 * languages, into that number.
 *
 * It exists as its own module for the reason `CP9` exists. The chat and the form
 * collect the same answers through completely different plumbing, and every time
 * one of them has derived a flag its own way, the two pathways have eventually
 * disagreed about the same person. `pathwayParity.test.js` holds them to one
 * derivation; this is the derivation.
 *
 * ------------------------------------------------------------------------------
 * ⚠️ THE PROTOCOL IS TAKEN FROM THE AGE, AND THAT IS A DECISION WITH A COST
 * ------------------------------------------------------------------------------
 *
 * The question a resident sees NAMES its stopwatch: "timed you for one minute" under
 * 60, "for thirty seconds" from 60. So the answer is read against the protocol their
 * age selects, because that is the question they were asked.
 *
 * It can still be wrong. A 55-year-old measured at a community event with a
 * thirty-second stopwatch may type 14, and 14 is a low one-minute count and a fine
 * thirty-second one. Three things stand against that: the question states the
 * duration, `implausibleForProtocol` flags a count that does not fit, and the
 * resident can say they do not know — which keeps the number and refuses the
 * comparison rather than producing a confident wrong one.
 *
 * ⚠️ "I AM NOT SURE" IS AN ANSWER, NOT A BLANK. It must not collapse into `missing`.
 *    A resident who does not know which test they did has told us something real,
 *    and the copy they get back explains that the two differ by a factor of two.
 *    `protocol-not-known-by-resident` is that state and it is reachable from the UI.
 */

import { MEASURES_COPY } from '../data/measuresCopy';
import { MEASUREMENT_SETTINGS } from '../data/functionalNorms';
import {
    gripStrengthResult, sitToStandResult, sitToStandProtocolForAge, toStorableBand,
} from './functionalMeasures';

const LANGS = ['en', 'ms', 'zh', 'ta'];
const norm = (value) => String(value ?? '').trim().toLowerCase();

/**
 * The chat sends CHIP TEXT, so every language's chip has to be recognised here or
 * the answer reads as free text. `measurementAnswers.test.js` asserts each of the
 * four, which is the only thing stopping a chip reworded in one language from
 * silently becoming an unparsed answer.
 */
const textsFor = (field) => new Set(LANGS.map((lang) => norm(MEASURES_COPY[lang][field])));
const SKIP_TEXTS = textsFor('skip');
const UNSURE_TEXTS = textsFor('stsUnsure');

/** Every setting label in every language, mapped back to its stored id. */
const SETTING_BY_LABEL = new Map();
LANGS.forEach((lang) => {
    MEASUREMENT_SETTINGS.forEach((id) => {
        const label = MEASURES_COPY[lang].settings[id];
        if (label) SETTING_BY_LABEL.set(norm(label), id);
    });
});

export const isSkipAnswer = (text) => SKIP_TEXTS.has(norm(text));
export const isUnsureAnswer = (text) => UNSURE_TEXTS.has(norm(text));

/**
 * The setting id behind a tapped label, or `unsure` when nothing was said.
 *
 * ⚠️ FREE TEXT BECOMES `other`, NEVER ITSELF. This value reaches the aggregate
 *    rollup; a verbatim string there is both a small re-identification surface and a
 *    category nobody can count. `normaliseSetting` enforces the same rule on the way
 *    in, so this is belt and braces rather than the only guard.
 */
export const settingIdFor = (text) => {
    const value = norm(text);
    if (value === '') return null;
    return SETTING_BY_LABEL.get(value) ?? 'other';
};

/**
 * The single number in an answer, or `null`.
 *
 * ⚠️ ONE NUMBER, OR NONE. "28 or maybe 30" is not a measurement, and picking either
 *    would show somebody a band computed from a figure they did not give. The skip
 *    and not-sure chips contain no digits in any language, so they arrive here as
 *    `null` naturally rather than by being special-cased twice.
 */
export const numberIn = (text) => {
    const matches = String(text ?? '').match(/\d+(?:\.\d+)?/g);
    if (!matches || matches.length !== 1) return null;
    const value = Number(matches[0]);
    return Number.isFinite(value) ? value : null;
};

/**
 * Both measurements, read from raw answers.
 *
 * Every field is optional and nothing here throws: a resident who skips both gets
 * two `missing` results, which is a state the copy has words for, not an error.
 *
 * @param {object} input
 * @param {string} input.gripAnswer      what they typed or tapped for grip
 * @param {string} input.stsAnswer       the same for the chair stand
 * @param {string} input.settingAnswer   where it was measured
 * @param {number|null} input.ageYears   a whole year, or null if we were not told
 * @param {string} input.sex             'Male' / 'Female' / anything else
 */
export const measurementResults = (input) => {
    const { gripAnswer, stsAnswer, settingAnswer, ageYears, sex } = input || {};
    const setting = settingIdFor(settingAnswer);

    const grip = gripStrengthResult({
        ageYears, sex, kg: isSkipAnswer(gripAnswer) ? null : numberIn(gripAnswer), setting,
    });

    // "Not sure which test" beats the age-derived protocol, because it is the
    // resident telling us the one thing that makes a comparison unsafe.
    const protocol = isUnsureAnswer(stsAnswer) ? 'unsure' : sitToStandProtocolForAge(ageYears);
    const sitToStand = sitToStandResult({
        ageYears, sex, protocol,
        reps: isSkipAnswer(stsAnswer) ? null : numberIn(stsAnswer),
        setting,
    });

    return { grip, sitToStand, setting };
};

/**
 * What may leave the device: bands and provenance, never the numbers.
 *
 * ⚠️ THIS IS A PRIVACY BOUNDARY, NOT A TIDY-UP. The telemetry record already carries
 *    postal sector, age band, sex, ethnicity and housing type. Two continuous
 *    physiological values beside them would identify a resident to anybody who ran
 *    the session at which they were measured. The numbers are the resident's and
 *    belong in their own report, on their own device.
 *
 *    `measurementAnswers.test.js` asserts no raw value survives this, by walking the
 *    output rather than by naming the fields it knows about — a field added to a
 *    result later cannot leak through a check that only looks for the old ones.
 */
export const toStorableMeasurements = (results) => ({
    grip: toStorableBand(results?.grip),
    sitToStand: toStorableBand(results?.sitToStand),
});

/**
 * Whether the report has anything to say about these measurements: a figure that
 * was compared, or one that was given and could not be. A resident who skipped
 * both gets no measurement page at all, which is the point — the page exists only
 * when there is something on it, so skipping costs nothing and adds nothing.
 *
 * Lives here rather than beside the panel because it is a rule about results, and
 * both the page and `ResultPage`'s PDF builder have to agree on it. Two copies of
 * "is there anything to show" is how a blank page gets into somebody's download.
 */
export const hasMeasurementsToShow = (functional) => {
    const shown = (result) => Boolean(result) && (result.ok === true || result.value !== null);
    return shown(functional?.grip) || shown(functional?.sitToStand);
};
