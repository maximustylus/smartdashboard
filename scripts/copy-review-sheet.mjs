#!/usr/bin/env node
/**
 * Prints the copy still owed a human read, as a sheet a reviewer can work from.
 * Run: node scripts/copy-review-sheet.mjs
 *
 * Exists because `CD13` has lived in a document since 2026-08-23, and a document
 * drifts. This reads the registry the build itself enforces, so what a reviewer is
 * handed and what CI checks cannot disagree.
 */
import { COPY_REVIEW, reviewDebt, blockingReviewGaps, isPending } from '../src/data/copyReview.js';
import { reachedByUi } from './copy-reachability.mjs';

// The same reachability the build gate uses, resolved against the real source tree,
// so a reviewer is never handed a sheet that disagrees with what CI enforces.
const onScreen = reachedByUi();
const debt = reviewDebt(onScreen);
const blocking = blockingReviewGaps(onScreen);

console.log('NEXUS Community — copy awaiting a human read\n');
console.log('The question for a reviewer is NOT "is this accurate".');
console.log('It is: would your mother understand this, and would she know what to do?\n');

if (!debt.length) { console.log('Nothing outstanding.'); process.exit(0); }

const critical = debt.filter((r) => r.safetyCritical);
const rest = debt.filter((r) => !r.safetyCritical);

if (critical.length) {
    console.log('── SAFETY-CRITICAL: these stop somebody doing something ──\n');
    critical.forEach((row) => {
        const e = COPY_REVIEW[row.key];
        const state = isPending(row.key)
            ? '  [copy not written yet]'
            : (row.live ? '  [ON SCREEN — blocking the build]' : '  [written, not on screen yet]');
        console.log(`  ${row.key}${state}`);
        console.log(`    where   : ${e.where}`);
        if (e.english) console.log(`    english : ${e.english}`);
        console.log(`    needs   : ${row.missing.join(', ')}\n`);
    });
}

if (rest.length) {
    console.log('── EVERYTHING ELSE ──\n');
    rest.forEach((row) => {
        console.log(`  ${row.key.padEnd(26)} ${COPY_REVIEW[row.key].where}`);
        console.log(`    needs   : ${row.missing.join(', ')}\n`);
    });
}

console.log(`${debt.length} strings outstanding, ${critical.length} safety-critical.`);
console.log(blocking.length
    ? `${blocking.length} of them are ON SCREEN and failing the build.`
    : 'None are on a resident-facing screen yet, so none are failing the build.');
console.log('A string marked "written, not on screen yet" starts failing the build the');
console.log('moment a component imports it. Reviewing it now is what stops that.');
