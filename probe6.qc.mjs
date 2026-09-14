import { parseFallsAnswer, isSixtyPlusPerson } from './src/utils/clinicalFlags.js';
import { parseClinicalData } from './src/utils/clinicalParse.js';
import { sitToStandProtocolForAge } from './src/utils/functionalMeasures.js';
import { measurementResults } from './src/utils/measurementAnswers.js';
import { selectCTA } from './src/utils/ctaRouting.js';

// The COMMITTED branch (HEAD 7947165) does: parseFallsAnswer(f.falls) UNCONDITIONALLY.
// Reproduce that exact call for a resident who answered falls at 65 then set age to 20.
const staleFalls = 'Yes, two or more times';
console.log('=== COMMITTED-BRANCH BEHAVIOUR (form), age changed 65 -> 20 ===');
const committed = parseFallsAnswer(staleFalls);
console.log('parseFallsAnswer(stale) =', JSON.stringify(committed));
console.log('isSixtyPlusPerson({age_years:"20"}) =', isSixtyPlusPerson({age_years:'20'}));
console.log('-> committed form derives: fallsCount=%s fallsRisk=%s fallsAsked=%s for a 20-year-old',
  committed.falls, committed.fallsRisk, committed.asked);

console.log('\n=== CHAT, same 20-year-old (never asked) ===');
const chat = parseClinicalData({ demographics:'Female', age_years:'20', falls:'' });
console.log('chat: fallsCount=%s fallsRisk=%s fallsAsked=%s', chat.fallsCount, chat.fallsRisk, chat.fallsAsked);

console.log('\n=== DOES IT CHANGE ROUTING? ===');
const base={ pavsScore:200, age:'18-40', medFlag:false, symptomFlag:false, fallsRisk:false, fallsAsked:false, fallsCount:0 };
console.log('CTA without stale falls:', JSON.stringify(selectCTA({...base})));
console.log('CTA with    stale falls:', JSON.stringify(selectCTA({...base, fallsRisk:true, fallsAsked:true, fallsCount:2})));

console.log('\n=== MEASUREMENTS: committed reads them at any age ===');
for (const age of [18,19,20,25]) {
  const proto = sitToStandProtocolForAge(age);
  const r = measurementResults({ gripAnswer:'30', stsAnswer:'12', settingAnswer:'', ageYears:age, sex:'Female' });
  console.log(`  age ${age}: sitToStandProtocolForAge=${JSON.stringify(proto)}  grip.ok=${r.grip.ok} grip.reason=${r.grip.reason ?? '-'} sts.ok=${r.sitToStand.ok} sts.reason=${r.sitToStand.reason ?? '-'}`);
}
