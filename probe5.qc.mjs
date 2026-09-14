import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import MeasurementsPanel from './src/components/MeasurementsPanel.jsx';
import { measurementResults } from './src/utils/measurementAnswers.js';
import { MEASURES_COPY } from './src/data/measuresCopy.js';

const strip = (h)=>h.replace(/<[^>]+>/g,'\n').split('\n').map(s=>s.trim()).filter(Boolean);

for (const lang of ['en','ms']) {
  const m = MEASURES_COPY[lang];
  // Resident aged 67 who typed 11 reps and tapped "I am not sure which test"
  const f = measurementResults({ gripAnswer:'', stsAnswer:m.stsUnsure, settingAnswer:m.settings['community-event'], ageYears:67, sex:'Female' });
  console.log(`\n=== [${lang}] resident tapped "${m.stsUnsure}" ===`);
  console.log('sitToStand result:', JSON.stringify(f.sitToStand));
  console.log('--- RENDERED PAGE 3 ---');
  console.log(strip(renderToStaticMarkup(React.createElement(MeasurementsPanel,{functional:f,lang}))).join('\n'));
}
