import { MEASURES_COPY } from './src/data/measuresCopy.js';
const LANGS=['en','ms','zh','ta'];
// Every leaf key path present in en must exist and be non-empty in all four.
const paths=(o,p='')=>Object.entries(o).flatMap(([k,v])=>
  (v&&typeof v==='object'&&!Array.isArray(v))?paths(v,p?`${p}.${k}`:k):[[p?`${p}.${k}`:k,v]]);
const enPaths=paths(MEASURES_COPY.en);
console.log('MEASURES_COPY en leaf count:', enPaths.length);
let bad=0;
LANGS.forEach(l=>{
  enPaths.forEach(([path])=>{
    const v=path.split('.').reduce((a,k)=>a?.[k], MEASURES_COPY[l]);
    if(v===undefined||v===null||(typeof v==='string'&&v.trim()==='')){ console.log(`  MISSING/EMPTY [${l}] ${path} =`, JSON.stringify(v)); bad++; }
  });
  const lPaths=paths(MEASURES_COPY[l]||{}).map(([p])=>p);
  const extra=lPaths.filter(p=>!enPaths.some(([e])=>e===p));
  if(extra.length) console.log(`  EXTRA in [${l}]:`, extra);
});
console.log(bad===0?'MEASURES_COPY: all four languages complete, no empty leaves':`MEASURES_COPY: ${bad} problems`);

// Untranslated: identical to English (excluding legitimately-shared tokens)
LANGS.filter(l=>l!=='en').forEach(l=>{
  const same=enPaths.filter(([p,v])=>typeof v==='string'&&v.length>3&&
    p.split('.').reduce((a,k)=>a?.[k],MEASURES_COPY[l])===v).map(([p,v])=>`${p}="${v}"`);
  if(same.length) console.log(`\n  [${l}] IDENTICAL TO ENGLISH (${same.length}):`), same.forEach(s=>console.log('     ',s));
});
