import { deriveFormClinicalData } from './src/utils/formClinicalData.js';
import { parseClinicalData } from './src/utils/clinicalParse.js';
import { parseAgeBand } from './src/utils/clinicalFlags.js';

const AGE=67, RAW_GRIP=27.5, RAW_REPS=11;
console.log('parseAgeBand("67") =', JSON.stringify(parseAgeBand('67')));
[45,52,67,74,88].forEach(a=>console.log('  age',a,'-> demographic band', JSON.stringify(parseAgeBand(String(a)))));

const formRaw = { pavsDays:'3–4 days', pavsMins:'30–45 mins', strength:'1 day a week',
  ageYears:String(AGE), gender:'Female', race:'Chinese', postalCode:'730123',
  medical:['High blood pressure'], barriers:['Too expensive'], social:'I mostly manage on my own',
  foodInsecure:false, wellbeing:'Some stress but managing', falls:'No falls', housing:'HDB 4-Room',
  healthierSg:'Yes', gripKg:String(RAW_GRIP), sitToStand:String(RAW_REPS),
  measureSetting:'At a community event', previousId:'', incomeAdequacy:'', aware:'', referred:'', rating:'', trust:'', improve:'' };
const flags = deriveFormClinicalData(formRaw);

// Replicate telemetry's strip EXACTLY as telemetry.js implements it
const NEVER_STORED=['ageYears','functional'];
const strip=(v)=>{ if(Array.isArray(v)) return v.map(strip);
  if(v===null||typeof v!=='object') return v;
  if(Object.getPrototypeOf(v)!==Object.prototype) return v;
  const o={}; Object.entries(v).forEach(([k,i])=>{ if(NEVER_STORED.includes(k)) return; o[k]=strip(i); }); return o; };

// FORM payload exactly as ConventionalForm.jsx:749 builds it
const f=formRaw;
const formPayload = { sessionId:'NX-TEST', action:'conventional_form_v4', language:'en',
  score:5, ctaTier:'COMMUNITY', flags,
  enrichment:{food:f.foodInsecure, income:f.incomeAdequacy, housing:f.housing},
  perception:{aware:f.aware, referred:f.referred, rating:f.rating, trust:f.trust, barriers:f.barriers, improve:f.improve},
  demographics:{age:flags.age, gender:f.gender, race:f.race, sector:flags.postalSector} };

const chatRaw={ pavs_days:'3–4 days', pavs_mins:'30–45 mins', strength:'1 day a week',
  demographics:'Female', age_years:String(AGE), medical:'High blood pressure', barriers:'Too expensive',
  social:'I mostly manage on my own', food_insecurity:'No', wellbeing:'Some stress but managing',
  falls:'No falls', ethnicity:'Chinese', housing_type:'HDB 4-Room', postal_code:'730123',
  healthier_sg:'Yes', grip_kg:String(RAW_GRIP), sit_to_stand:String(RAW_REPS),
  measure_setting:'At a community event', previous_id:'No' };
const parsed=parseClinicalData(chatRaw);
const chatPayload={ event:'aura_triage_complete_v2', sessionId:'NX-TEST', previousSessionId:parsed.previousId,
  payload:parsed, computedRisk:5, ctaTier:'COMMUNITY' };

for (const [name,p] of [['FORM',formPayload],['CHAT',chatPayload]]) {
  const doc={...strip(p), postalSector:'73', createdAt:'<serverTimestamp>'};
  const top=Object.keys(doc);
  console.log(`\n=== ${name} TELEMETRY DOC ===`);
  console.log('top-level keys ('+top.length+'/20 cap):', top.join(', '));
  const json=JSON.stringify(doc);
  console.log('contains raw grip 27.5 ?', json.includes('27.5'));
  console.log('contains raw reps 11 ?  ', /(^|[^\d.])11([^\d.]|$)/.test(json));
  console.log('contains precise age 67 ?', /(^|[^\d.])67([^\d.]|$)/.test(json));
  console.log('key "ageYears" present ?', json.includes('ageYears'));
  console.log('key "functional" present?', /"functional"/.test(json));
  console.log('functionalStorable present?', json.includes('functionalStorable'));
  // walk for any 5-year ageBand
  const bands=[...json.matchAll(/"ageBand":"([^"]*)"/g)].map(m=>m[1]);
  console.log('ageBand values leaving device:', JSON.stringify([...new Set(bands)]));
  console.log('demographic age band:', JSON.stringify(doc.demographics?.age ?? doc.payload?.age));
}
