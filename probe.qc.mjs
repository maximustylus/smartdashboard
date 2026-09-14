import { deriveFormClinicalData } from './src/utils/formClinicalData.js';
import { parseClinicalData } from './src/utils/clinicalParse.js';
import { calculateRiskScore } from './src/utils/scoring.js';

const RAW_GRIP = 27.5, RAW_REPS = 11, AGE = 67;

// ---- CHAT raw answers (chip text / typed text keyed by domain key)
const chatRaw = {
  pavs_days: '3–4 days', pavs_mins: '30–45 mins', strength: '1 day a week',
  demographics: 'Female', age_years: String(AGE),
  medical: 'High blood pressure', barriers: 'Too expensive',
  social: 'I mostly manage on my own', food_insecurity: 'No',
  wellbeing: 'Some stress but managing', falls: 'No falls',
  ethnicity: 'Chinese', housing_type: 'HDB 4-Room', postal_code: '730123',
  healthier_sg: 'Yes', grip_kg: String(RAW_GRIP), sit_to_stand: String(RAW_REPS),
  measure_setting: 'At a community event', previous_id: 'No',
};

// ---- FORM answers (controlled values)
const formRaw = {
  pavsDays: '3–4 days', pavsMins: '30–45 mins', strength: '1 day a week',
  ageYears: String(AGE), gender: 'Female', race: 'Chinese',
  postalCode: '730123', medical: ['High blood pressure'], barriers: ['Too expensive'],
  social: 'I mostly manage on my own', foodInsecure: false,
  wellbeing: 'Some stress but managing', falls: 'No falls',
  housing: 'HDB 4-Room', healthierSg: 'Yes',
  gripKg: String(RAW_GRIP), sitToStand: String(RAW_REPS),
  measureSetting: 'At a community event', previousId: '',
  incomeAdequacy: '', aware: '', referred: '', rating: '', trust: '', improve: '',
};

const chat = parseClinicalData(chatRaw);
const form = deriveFormClinicalData(formRaw);

const keys = (o) => Object.keys(o).sort();
console.log('=== KEY PARITY ===');
console.log('chat-only:', keys(chat).filter(k=>!keys(form).includes(k)));
console.log('form-only:', keys(form).filter(k=>!keys(chat).includes(k)));

console.log('\n=== VALUE PARITY (shared keys, non-object) ===');
keys(chat).filter(k=>keys(form).includes(k)).forEach(k=>{
  const a=chat[k], b=form[k];
  const sa=JSON.stringify(a), sb=JSON.stringify(b);
  if (sa!==sb) console.log(`  DIFF ${k}: chat=${sa}  form=${sb}`);
});

console.log('\n=== RISK SCORE ===');
console.log('chat score:', calculateRiskScore(chat), ' form score:', calculateRiskScore(form));

// CD20: does skipping the measurements change the score?
const chatSkip = parseClinicalData({...chatRaw, grip_kg:'', sit_to_stand:'', measure_setting:''});
const formSkip = deriveFormClinicalData({...formRaw, gripKg:'', sitToStand:'', measureSetting:''});
console.log('chat score WITH measures:', calculateRiskScore(chat), '  WITHOUT:', calculateRiskScore(chatSkip));
console.log('form score WITH measures:', calculateRiskScore(form), '  WITHOUT:', calculateRiskScore(formSkip));

console.log('\n=== functionalStorable (what may be written) ===');
console.log(JSON.stringify(form.functionalStorable, null, 2));
console.log('\n=== functional (device only) ===');
console.log(JSON.stringify(form.functional, null, 2));
