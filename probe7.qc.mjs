import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import MeasurementsPanel from './src/components/MeasurementsPanel.jsx';
import { measurementResults, hasMeasurementsToShow } from './src/utils/measurementAnswers.js';
import { parseFallsAnswer } from './src/utils/clinicalFlags.js';
import HandoverSlip from './src/components/HandoverSlip.jsx';
const strip=(h)=>h.replace(/<[^>]+>/g,'\n').split('\n').map(s=>s.trim()).filter(Boolean);

// Committed-branch derivation for "answered at 65, then set age to 20"
const falls = parseFallsAnswer('Yes, two or more times');
const data = { age:'18-40', ageYears:20, gender:'Female', pavsScore:200, medFlag:false, symptomFlag:false,
  fallsCount:falls.falls, fallsRisk:falls.fallsRisk, fearOfFalling:falls.avoidsActivity, fallsAsked:falls.asked,
  sdohFinancial:false, sdohSocial:false, sdohPsychological:false, caregiverStrain:false,
  sdohFoodInsecure:false, sdohHousing:false, healthierSgEnrolled:null, ethnicity:'Chinese', housingType:'HDB 4-Room' };
console.log('=== HANDOVER SLIP a 20-year-old carries to a community centre ===');
try { console.log(strip(renderToStaticMarkup(React.createElement(HandoverSlip,{data,lang:'en',score:5,sessionId:'NX-1',ctaTier:'LEVEL_UP'}))).join('\n')); }
catch(e){ console.log('render error:', e.message); }

console.log('\n=== STALE MEASUREMENT typed at 65, age changed to 18 (committed branch) ===');
const f = measurementResults({ gripAnswer:'30', stsAnswer:'12', settingAnswer:'', ageYears:18, sex:'Female' });
console.log('hasMeasurementsToShow:', hasMeasurementsToShow(f));
console.log(strip(renderToStaticMarkup(React.createElement(MeasurementsPanel,{functional:f,lang:'en'}))).join('\n'));
