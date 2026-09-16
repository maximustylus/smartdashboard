/**
 * Convert the conventional form's controlled answers into the shared result shape.
 *
 * This is intentionally separate from React: the values produced here feed the
 * public score, routing, telemetry and result screen, so they need direct tests.
 * The conversational pathway assembles the same shape in `clinicalParse.js`.
 */
import { toSector } from './singapore/postalSectors';
import {
  parseFallsAnswer, parseHealthierSg, parseAgeBand, parseAgeYears, isSixtyPlusPerson,
  // One definition of the one-to-two-room test, shared with the chat pathway. It
  // lived as a regex in each module, and the chat's copy only ever understood the
  // English chip. See `matchesOneToTwoRoomRental`.
  matchesOneToTwoRoomRental,
} from './clinicalFlags';
import { sitToStandProtocolForAge } from './functionalMeasures';
import { measurementResults, toStorableMeasurements } from './measurementAnswers';

export const DAYS_MIDPOINT = Object.freeze({
  '0 days': 0,
  '1–2 days': 1.5,
  '3–4 days': 3.5,
  '5–7 days': 6,
});

export const MINS_MIDPOINT = Object.freeze({
  'Less than 20 mins': 15,
  '20–30 mins': 25,
  '30–45 mins': 37,
  '45–60 mins': 52,
  '60+ mins': 65,
});

const STR_MIDPOINT = Object.freeze({
  'No strength training': 0,
  '1 day a week': 1,
  '2 days a week': 2,
  '3+ days a week': 3,
});

const MEDICAL_EXCLUSIVE = 'No conditions or symptoms';
const MED_FLAG_VALUES = new Set([
  'High blood pressure',
  'Prediabetes or diabetes',
  'Heart condition',
]);
const SYMPTOM_FLAG_VALUE = 'Dizziness or chest pain when active';
const FINANCIAL_BARRIER_VALUES = new Set(['Too expensive', 'Too far away']);
const SOCIAL_FLAG_VALUES = new Set([
  'I mostly manage on my own',
  'I feel quite isolated',
]);
const PSYCHOLOGICAL_FLAG_VALUES = new Set([
  'Some stress but managing',
  'Feeling quite stressed or low',
  'Overwhelmed by caregiving',
  'Overwhelmed by financial pressure',
]);
const CAREGIVER_FLAG_VALUES = new Set(['Overwhelmed by caregiving']);

const answerObject = (value) => (
  value && typeof value === 'object' && !Array.isArray(value) ? value : {}
);

const answerArray = (value) => (Array.isArray(value) ? value : []);

const answerText = (value, fallback = '') => (
  typeof value === 'string' ? value : fallback
);

export const deriveFormClinicalData = (answers = {}) => {
  const f = answerObject(answers);
  const medical = answerArray(f.medical);
  const barriers = answerArray(f.barriers);

  const pavsDays = DAYS_MIDPOINT[f.pavsDays] ?? 0;
  const minutesMidpoint = MINS_MIDPOINT[f.pavsMins] ?? 0;
  const pavsMinutes = pavsDays === 0 ? 0 : minutesMidpoint;
  const pavsScore = Math.round(pavsDays * pavsMinutes);
  const strengthDays = STR_MIDPOINT[f.strength] ?? 0;

  const noConditions = medical.includes(MEDICAL_EXCLUSIVE);
  const medFlag = !noConditions && medical.some((value) => MED_FLAG_VALUES.has(value));
  const symptomFlag = !noConditions && medical.includes(SYMPTOM_FLAG_VALUE);

  const sdohFinancial = barriers.some((value) => FINANCIAL_BARRIER_VALUES.has(value))
    || f.incomeAdequacy === 'Inadequate';
  const sdohSocial = SOCIAL_FLAG_VALUES.has(f.social);
  const sdohPsychological = PSYCHOLOGICAL_FLAG_VALUES.has(f.wellbeing);
  const caregiverStrain = CAREGIVER_FLAG_VALUES.has(f.wellbeing);

  /*
    ==========================================================================
    ⚠️ `CP34` — A HIDDEN FIELD KEEPS ITS ANSWER, AND THIS USED TO READ IT
    ==========================================================================

    The falls question is rendered only for residents aged 60 and over, and the
    strength block only where a published reference exists. Hiding a field does
    NOT clear it. So:

        enter age 65 -> answer "two or more falls" -> change the age to 20

    left `f.falls` populated, this function read it unconditionally, and a
    20-year-old was derived as `fallsCount: 2, fallsRisk: true, fallsAsked: true`.

    ⚠️ AN EARLIER VERSION OF THIS NOTE SAID IT "CHANGED THE ROUTING, BECAUSE
       `selectCTA` BRANCHES ON FALLS". IT DOES NOT. `ctaRouting.js` reads seven
       fields and none of them is a falls field; the claim was written without
       being checked and an audit caught it. The real consumers are worse, not
       better:

         `HandoverSlip.jsx`           a 20-year-old carries a printed slip to a
                                      community centre asserting a fall
         `CommunityInsightsPanel.jsx` the field is labelled "Fall in past 12 months
                                      (60+)", so one stale flag pollutes a
                                      population statistic a health system plans from

    It also silently disagreed with the chat, which never asks at that age.

    Found by `communitySimulation.test.js` on its first run, by walking the same
    person through both pathways — not by any unit test, because every unit here
    was behaving exactly as written.

    ⚠️ FIXED AT THE DERIVATION, NOT BY CLEARING THE FIELD ON CHANGE. Clearing would
       also throw away a correct answer when somebody fixes a typo in their age and
       changes it back, and it would leave the same trap for the next conditional
       field somebody adds. THE GATE THAT DECIDES WHETHER TO ASK IS NOW THE GATE
       THAT DECIDES WHETHER TO READ — one rule, and it is the same helper the UI
       calls, so the two cannot drift.

    An unasked question parses as an empty answer, which `parseFallsAnswer` already
    reports as `asked: false` — never as "no falls". That distinction is `CP26`.
  */
  const wasAskedFalls = isSixtyPlusPerson({ age_years: f.ageYears });
  const falls = parseFallsAnswer(wasAskedFalls ? f.falls : '');
  const healthierSgEnrolled = parseHealthierSg(f.healthierSg);
  const previousId = answerText(f.previousId).trim().toUpperCase() || null;

  // One reading of the age, shared by the band below and by `P9`'s comparisons.
  const ageYears = parseAgeYears(f.ageYears);

  /*
    ⚠️ THE SAME DERIVATION THE CHAT USES, FROM THE SAME MODULE. Two pathways reading
       a typed measurement two ways is how `CP9` happened. `pathwayParity.test.js`
       asserts both return the same keys; `measurementAnswers.js` is what makes them
       return the same VALUES for the same person.

       `functional` carries the raw figures and is for this device only;
       `functionalStorable` is the band-only record. `telemetry.js` strips the
       former by name, so neither pathway can leak it by forgetting.
  */
  // Same rule for the strength block: both sources start at 20, the block is not
  // rendered below that, and a figure typed at 65 must not survive a change to 18.
  const wasAskedMeasurements = sitToStandProtocolForAge(ageYears) !== null;
  const functional = measurementResults({
    gripAnswer: wasAskedMeasurements ? f.gripKg : '',
    stsAnswer: wasAskedMeasurements ? f.sitToStand : '',
    settingAnswer: wasAskedMeasurements ? f.measureSetting : '',
    ageYears,
    sex: answerText(f.gender, ''),
  });

  return {
    pavsScore,
    pavsDays,
    pavsMinutes,
    strengthDays,
    medFlag,
    symptomFlag,
    sdohFinancial,
    sdohSocial,
    sdohPsychological,
    caregiverStrain,
    fallsCount: falls.falls,
    fallsRisk: falls.fallsRisk,
    fearOfFalling: falls.avoidsActivity,
    fallsAsked: falls.asked,
    healthierSgEnrolled,
    psychoFlag: sdohPsychological,
    sdohFoodInsecure: f.foodInsecure === true,
    /*
      The SAME test the chat pathway applies in `clinicalParse.js`, rather than
      an equality check against one option string. Both front doors now offer
      the same six housing options, and a social-risk flag that depends on
      which door somebody walked through is a defect waiting for the next time
      one list is edited.
    */
    sdohHousing: matchesOneToTwoRoomRental(f.housing),
    ethnicity: answerText(f.race, 'Unknown') || 'Unknown',
    housingType: answerText(f.housing, 'Unknown') || 'Unknown',
    postalSector: toSector(f.postalCode),
    /*
      ⚠️ THE BAND IS DERIVED FROM THE YEAR, NOT ASKED FOR. `P9` replaced the form's
         age-group select with a whole-year input, because the strength references
         are cut in five-year bands and "60+" cannot be narrowed back down.
         `selectCTA`, `calculateRiskScore` and the resource plan all still branch on
         the band, and none of them should learn a new shape for this.
    */
    age: ageYears !== null ? parseAgeBand(String(ageYears)) : 'Unknown',
    ageYears,
    functional,
    functionalStorable: toStorableMeasurements(functional),
    gender: answerText(f.gender, 'Unknown') || 'Unknown',
    previousId,
  };
};
