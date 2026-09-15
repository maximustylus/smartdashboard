#!/usr/bin/env node
/**
 * ==============================================================================
 * PDF VERIFY — what is actually in the file a resident downloads
 * ==============================================================================
 *
 * Run:  node scripts/pdf-verify.mjs            (report)
 *       node scripts/pdf-verify.mjs --assert   (exit 1 if anything is wrong)
 *
 * Requires a preview server on :4177 — `npm run build && npx vite preview --port 4177`.
 *
 * ------------------------------------------------------------------------------
 * ⚠️ THIS IS NOT `pdf-headroom.mjs`, AND NEITHER COVERS THE OTHER
 * ------------------------------------------------------------------------------
 *
 * `pdf-headroom.mjs` measures the TEMPLATES: it asks whether the content fits the
 * fixed 794x1123 box before `html2canvas` clips it. It never opens a PDF.
 *
 * This drives the real app, taps Download, and reads the finished file. The two
 * failures it catches are ones the headroom tool cannot see:
 *
 *   1. THE WRONG NUMBER OF PAGES. The report is three pages for a resident who
 *      gave a measurement and two for one who skipped, so the count is CONDITIONAL
 *      and a mistake produces a blank page in somebody's download, or loses a page
 *      that is on screen.
 *
 *   2. LINKS ON THE WRONG PAGE. `pdf.link` stamps an annotation on whatever page
 *      is CURRENT, so every link depends on the order pages were added in. When
 *      the measurements page moved ahead of governance, the template order and the
 *      builder order both had to change; if only one had, the printed footer would
 *      number the pages one way and the PDF would bind them the other. That looks
 *      like a rendering glitch and is actually a wrong document.
 *
 * ⚠️ WHY THE ASSERTIONS ARE ABOUT LINKS AND NOT TEXT. Every page is a rasterised
 *    JPEG, so the finished PDF has no text layer at all: `pdftotext` returns
 *    nothing and there is no heading to match on. The link annotations are the only
 *    structured content that survives the rasterisation, and they are enough —
 *    the Healthier SG card exists on exactly one template, so finding its links
 *    identifies that page beyond doubt.
 */

/*
  Playwright is not a dependency of this repo, deliberately — see the same note in
  `pdf-headroom.mjs`. Install it when you need it:

      npm i --no-save playwright && npx playwright install chromium
*/
let chromium;
try {
    ({ chromium } = await import('playwright'));
} catch {
    console.error(
        'This script needs playwright, which is not a dependency of this repo.\n'
        + '  npm i --no-save playwright && npx playwright install chromium',
    );
    process.exit(1);
}

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BASE = process.env.PDF_VERIFY_URL || 'http://localhost:4177';
const ASSERT = process.argv.includes('--assert');
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-pdf-'));

// A link that appears on the governance template and nowhere else, so finding it
// identifies that page without needing to read rasterised text.
const GOVERNANCE_LINK = 'healthiersg.gov.sg';

const GRIP_F_65_69 = [14.3, 16.6, 19.5, 21.6, 23.3, 25, 26.6, 28.4, 30.5, 33.4, 35.8];

const functional = {
    grip: {
        ok: true, band: 'low', value: 18, unit: 'kg', ageBand: '65-69', sex: 'female',
        lowThreshold: 19.5, setting: 'community-event',
        sourceId: 'tomkinson-2025-absolute', referencePopulation: 'international',
        scale: {
            resolution: 'percentiles', levels: [5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95],
            points: GRIP_F_65_69, usualFrom: 19.5, usualTo: 30.5,
        },
    },
    sitToStand: {
        ok: true, band: 'at-or-above-average', value: 13, unit: 'reps', protocol: 'sts-30s',
        seconds: 30, implausibleForProtocol: false, ageBand: '65-69', sex: 'female',
        belowAverageThreshold: 11, setting: 'community-event',
        sourceId: 'cdc-steadi-2017', referencePopulation: 'united-states',
        scale: {
            resolution: 'cut-off', levels: null, points: [11],
            usualFrom: 11, usualTo: null, axisFrom: 0, axisTo: 35,
        },
    },
    setting: 'community-event',
};

const state = (withMeasurements) => ({
    score: 182, postalSector: '73', sessionId: 'NX-PDFVERIFY', ctaTier: 'COMMUNITY',
    previousSessionId: null,
    data: {
        pavsScore: 182, pavsDays: 3.5, pavsMinutes: 52, strengthDays: 2,
        medFlag: false, symptomFlag: false, sdohFinancial: false, sdohSocial: false,
        sdohPsychological: false, sdohFoodInsecure: false, caregiverStrain: false,
        sdohHousing: false, fallsCount: 0, fallsRisk: false, fearOfFalling: false,
        fallsAsked: true, healthierSgEnrolled: true, psychoFlag: false,
        gender: 'Female', age: '60+', ageYears: 67, ethnicity: 'Chinese',
        housingType: 'HDB 4 Room', postalSector: '73', previousId: null,
        ...(withMeasurements ? { functional } : {}),
    },
});

const CASES = [
    { name: 'gave a measurement', state: state(true), expectedPages: 3 },
    // Everybody who skips the questions must get exactly the report they got
    // before this feature existed, with no blank page in their download.
    { name: 'skipped the questions', state: state(false), expectedPages: 2 },
];

/**
 * Links per page, in page order.
 *
 * ⚠️ jsPDF writes annotations as INLINE dictionaries inside each page's `/Annots`
 *    array, NOT as indirect `N 0 R` references. A parser that resolves references
 *    finds zero links on every page and reads as a catastrophic regression when
 *    nothing is wrong at all.
 */
const linksByPage = (buffer) => {
    const pdf = buffer.toString('latin1');
    const pages = [];
    const objectRe = /(\d+)\s+0\s+obj\s*<<([\s\S]*?)>>\s*endobj/g;
    let match = objectRe.exec(pdf);
    while (match !== null) {
        const [, num, body] = match;
        if (/\/Type\s*\/Page[^s]/.test(body)) {
            const urls = [...body.matchAll(/\/S\s*\/URI\s*\/URI\s*\(([\s\S]*?)\)/g)].map((u) => u[1]);
            pages.push({ num: Number(num), urls });
        }
        match = objectRe.exec(pdf);
    }
    return pages.sort((a, b) => a.num - b.num).map((p) => p.urls);
};

const browser = await chromium.launch(
    process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {},
);
const problems = [];

for (const testCase of CASES) {
    const context = await browser.newContext({
        viewport: { width: 1280, height: 1000 }, acceptDownloads: true,
    });
    const page = await context.newPage();

    // The first visit redirects to the pathway picker because there is no result
    // yet, so seed the store the way a reload restores one and go back.
    await page.goto(`${BASE}/individuals/result`, { waitUntil: 'networkidle' });
    await page.evaluate((s) => {
        try {
            localStorage.setItem('nexus_language', 'en');
            localStorage.setItem('nexus_theme', 'light');
            sessionStorage.setItem('nexus_assessment_result', JSON.stringify(s));
            sessionStorage.setItem('nexus_assessment_id', s.sessionId);
        } catch { /* private mode throws; nothing to do */ }
    }, testCase.state);
    await page.goto(`${BASE}/individuals/result`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3500);

    const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 90000 }),
        page.getByRole('button', { name: /download/i }).click(),
    ]);
    const file = path.join(OUT, `${testCase.name.replace(/\W+/g, '-')}.pdf`);
    await download.saveAs(file);
    await context.close();

    const pages = linksByPage(fs.readFileSync(file));
    console.log(`\n${testCase.name}: ${pages.length} page(s)`);
    pages.forEach((urls, i) => {
        console.log(`  page ${i + 1}: ${urls.length} link(s)`);
    });

    if (pages.length !== testCase.expectedPages) {
        problems.push(
            `${testCase.name}: ${pages.length} pages in the download, expected ${testCase.expectedPages}`,
        );
    }
    if (pages.length === 0) {
        problems.push(`${testCase.name}: no page objects parsed — the PDF or this parser is broken`);
        continue;
    }

    // Governance is ALWAYS last, in both shapes. This is the assertion that would
    // have caught a template reordered without its builder, or the reverse.
    const lastPage = pages[pages.length - 1];
    if (!lastPage.some((u) => u.includes(GOVERNANCE_LINK))) {
        problems.push(
            `${testCase.name}: the last page carries no ${GOVERNANCE_LINK} link, so governance is not last`,
        );
    }
    const strayGovernance = pages
        .slice(0, -1)
        .findIndex((urls) => urls.some((u) => u.includes(GOVERNANCE_LINK)));
    if (strayGovernance !== -1) {
        problems.push(
            `${testCase.name}: governance links found on page ${strayGovernance + 1}, which is not the last page`,
        );
    }

    // Every page carries the header's own link, so a page with none was never
    // stamped at all and its links are somewhere they should not be.
    pages.forEach((urls, i) => {
        if (urls.length === 0) {
            problems.push(`${testCase.name}: page ${i + 1} has no link annotations at all`);
        }
    });
}

await browser.close();
fs.rmSync(OUT, { recursive: true, force: true });

if (problems.length > 0) {
    console.log('\n⚠️  the downloaded report is wrong:\n');
    problems.forEach((p) => console.log(`  - ${p}`));
    if (ASSERT) process.exit(1);
} else {
    console.log('\n✅ page counts and link placement are correct in the downloaded file.');
}
