/**
 * Convert the conventional form's controlled answers into the shared result shape.
 *
 * This is intentionally separate from React: the values produced here feed the
 * public score, routing, telemetry and result screen, so they need direct tests.
 * The conversational pathway assembles the same shape in `clinicalParse.js`.
 */
import { toSector } from './singapore/postalSectors';
import { parseFallsAnswer, parseHealthierSg, parseAgeBand, parseAgeYears } from './clinicalFlags';

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
  'Overwhelmed — caregiving',
  'Overwhelmed — financial pressure',
]);
const CAREGIVER_FLAG_VALUES = new Set(['Overwhelmed — caregiving']);

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

  const falls = parseFallsAnswer(f.falls);
  const healthierSgEnrolled = parseHealthierSg(f.healthierSg);
  const previousId = answerText(f.previousId).trim().toUpperCase() || null;

  // One reading of the age, shared by the band below and by `P9`'s comparisons.
  const ageYears = parseAgeYears(f.ageYears);

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
    sdohHousing: f.housing === 'HDB 1-2 Room',
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
    gender: answerText(f.gender, 'Unknown') || 'Unknown',
    previousId,
  };
};
