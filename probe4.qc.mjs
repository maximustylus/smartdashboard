import { MEASURES_COPY, residentBand, measuresCopyFor } from './src/data/measuresCopy.js';
import { MEASUREMENT_SETTINGS, GRIP_SOURCE, CHAIR_STAND_SOURCE, STS_60S_SOURCE } from './src/data/functionalNorms.js';
import * as FM from './src/utils/functionalMeasures.js';
const L=['en','ms','zh','ta'];
const bad=[];
const chk=(lang,dict,key,what)=>{const v=dict?.[key];
  if(v===undefined||v===null||(typeof v==='string'&&v.trim()==='')) bad.push(`[${lang}] ${what}[${key}] = ${JSON.stringify(v)}`);};

console.log('MEASUREMENT_SETTINGS:', JSON.stringify(MEASUREMENT_SETTINGS));
console.log('settingIdFor free text -> "other"; is "other" a listed setting?', MEASUREMENT_SETTINGS.includes('other'));

L.forEach(l=>{const m=MEASURES_COPY[l];
  MEASUREMENT_SETTINGS.forEach(s=>chk(l,m.settings,s,'settings'));
  chk(l,m.settings,'other','settings');
  ['sts-30s','sts-60s','unsure'].forEach(p=>chk(l,m.stsLabel,p,'stsLabel'));
  Object.keys(MEASURES_COPY.en.bands).forEach(b=>chk(l,m.bands,b,'bands'));
  Object.keys(MEASURES_COPY.en.advice).forEach(b=>chk(l,m.advice,b,'advice'));
  Object.keys(MEASURES_COPY.en.reasons).forEach(r=>chk(l,m.reasons,r,'reasons'));
  Object.keys(MEASURES_COPY.en.populations).forEach(p=>chk(l,m.populations,p,'populations'));
});
console.log('\nbands keys:', JSON.stringify(Object.keys(MEASURES_COPY.en.bands)));
console.log('advice keys:', JSON.stringify(Object.keys(MEASURES_COPY.en.advice)));
console.log('reasons keys:', JSON.stringify(Object.keys(MEASURES_COPY.en.reasons)));
console.log('populations keys:', JSON.stringify(Object.keys(MEASURES_COPY.en.populations)));

// Every source's referencePopulation must have copy, else the resident sees a raw id
[GRIP_SOURCE,CHAIR_STAND_SOURCE,STS_60S_SOURCE].forEach(s=>{
  L.forEach(l=>{ if(!MEASURES_COPY[l].populations?.[s.referencePopulation])
    bad.push(`[${l}] populations["${s.referencePopulation}"] MISSING -> resident sees raw id for ${s.id}`); });
});

// Every band residentBand can emit must have a bands[] label AND an advice fallback
const emitted=new Set();
for(const age of [25,45,59,60,67,74,85,101]) for(const sex of ['Male','Female','Unknown'])
  for(const kg of [null,5,27.5,80]) {
    const r=FM.gripStrengthResult({ageYears:age,sex,kg,setting:'community-event'});
    const b=residentBand(r); if(b) emitted.add('grip:'+b);
    if(r&&!b&&r.reason) emitted.add('gripReason:'+r.reason);
  }
for(const age of [25,45,59,60,67,74,85,101]) for(const sex of ['Male','Female','Unknown'])
  for(const reps of [null,0,4,11,30,99]) for (const protocol of ['sts-30s','sts-60s','unsure']) {
    const r=FM.sitToStandResult({ageYears:age,sex,reps,protocol,setting:'community-event'});
    const b=residentBand(r); if(b) emitted.add('sts:'+b);
    if(r&&!b&&r.reason) emitted.add('stsReason:'+r.reason);
  }
console.log('\nbands/reasons actually reachable:', JSON.stringify([...emitted].sort(),null,0));
[...emitted].forEach(e=>{const [k,v]=e.split(':');
  L.forEach(l=>{const m=MEASURES_COPY[l];
    if(k.endsWith('Reason')){ if(!m.reasons[v]) bad.push(`[${l}] reasons["${v}"] MISSING (reachable)`); }
    else { if(!m.bands[v]) bad.push(`[${l}] bands["${v}"] MISSING (reachable)`);
           const fb=m.advice[v]||m.advice[v==='below-average'||v==='below-typical'?'below':'usual'];
           if(!fb) bad.push(`[${l}] advice for band "${v}" resolves to BLANK`); } });
});

console.log('\n=== PROBLEMS ===');
console.log(bad.length? bad.join('\n') : 'none — every reachable band, reason, setting, protocol and population has non-empty copy in all four languages');
