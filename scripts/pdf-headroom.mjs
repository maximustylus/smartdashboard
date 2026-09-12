#!/usr/bin/env node
/**
 * ==============================================================================
 * PDF HEADROOM — how close the printed report is to losing content
 * ==============================================================================
 *
 * Run:  node scripts/pdf-headroom.mjs            (all languages, both scenarios)
 *       node scripts/pdf-headroom.mjs --assert   (exit 1 if anything is clipped)
 *
 * Requires a preview server on :4177 — `npm run build && npx vite preview --port 4177`.
 *
 * ------------------------------------------------------------------------------
 * ⚠️ WHY THIS EXISTS: THE REPORT LOSES CONTENT SILENTLY
 * ------------------------------------------------------------------------------
 *
 * `PDF_PAGE_STYLE` is a fixed 794x1123 box with `overflow: hidden`, and the PDF is
 * a rasterised screenshot of it. So a report page that grows does not spill onto
 * another page and does not shrink to fit: the bottom is simply CUT OFF. It still
 * looks right on screen, where the same content sits in a scrolling column.
 *
 * Nothing warns. No test fails. A resident downloads a report with the last thing
 * on it missing, and the only way anybody finds out is by opening the PDF and
 * knowing what should have been there.
 *
 * ------------------------------------------------------------------------------
 * ⚠️ MEASURING IT NEEDS A DETACHED CLONE, NOT THE PAGE ITSELF
 * ------------------------------------------------------------------------------
 *
 * The page is a fixed-height flex column, so its children stretch to fill it.
 * Every in-place measurement — `scrollHeight`, the bottom edge of the last child,
 * the content area's own box — comes back as exactly 1123 whether the content
 * needs 300px or 3000. The first three attempts at this script all reported
 * "0px spare" and meant nothing.
 *
 * The only honest measure is to take the constraint off, which means cloning the
 * node, setting `height: auto`, and reading what the content actually wants.
 */

/*
  ⚠️ PLAYWRIGHT IS NOT A DEPENDENCY OF THIS REPO, AND DELIBERATELY IS NOT.

     This measurement needs a real layout engine, so it needs a browser. Adding
     playwright to `devDependencies` would put a browser download on the critical
     path of every `npm ci` in `deploy.yml`, to run a check that belongs to the
     handful of commits that change the report. The trade is the wrong way round.

     So this is a tool you reach for, not a test that runs itself. Install it when
     you need it:

         npm i --no-save playwright && npx playwright install chromium

     `PLAYWRIGHT_CHROMIUM` points it at a browser you already have.
*/
let chromium;
try {
    ({ chromium } = await import('playwright'));
} catch {
    console.error(
        'This script needs playwright, which is not a dependency of this repo.\n' +
        '  npm i --no-save playwright && npx playwright install chromium\n' +
        'See the header for why it is not installed by default.',
    );
    process.exit(1);
}

const BASE = process.env.PDF_HEADROOM_URL || 'http://localhost:4177';
const LANGS = ['en', 'ms', 'zh', 'ta'];
const ASSERT = process.argv.includes('--assert');

/**
 * Two ends of the range. Page 1 grows with the number of flags raised and with the
 * length of the chosen call to action, so a healthy 45-year-old and a person who
 * triggered everything are not remotely the same height.
 */
const flags = (over) => ({
    pavsScore: 182, pavsDays: 3.5, pavsMinutes: 52, strengthDays: 2,
    medFlag: false, symptomFlag: false, sdohFinancial: false, sdohSocial: false,
    sdohPsychological: false, sdohFoodInsecure: false, caregiverStrain: false,
    sdohHousing: false, fallsCount: 0, fallsRisk: false, fearOfFalling: false,
    fallsAsked: true, healthierSgEnrolled: true, psychoFlag: false,
    gender: 'Female', age: '60+', ageYears: 67, ethnicity: 'Chinese',
    housingType: 'HDB 4 Room', postalSector: '73', previousId: null,
    ...over,
});

const SCENARIOS = {
    'low-risk': {
        score: 182, postalSector: '73', sessionId: 'NX-HEADROOM1', ctaTier: 'COMMUNITY',
        previousSessionId: null, data: flags({}),
    },
    // Every flag raised, the longest call to action, and a linked previous record.
    'worst-case': {
        score: 0, postalSector: '73', sessionId: 'NX-HEADROOM2', ctaTier: 'URGENT',
        previousSessionId: 'NX-OLD12345',
        data: flags({
            pavsScore: 0, pavsDays: 0, pavsMinutes: 0, strengthDays: 0,
            medFlag: true, symptomFlag: true, sdohFinancial: true, sdohSocial: true,
            sdohPsychological: true, sdohFoodInsecure: true, caregiverStrain: true,
            sdohHousing: true, fallsCount: 2, fallsRisk: true, fearOfFalling: true,
            healthierSgEnrolled: false, psychoFlag: true, previousId: 'NX-OLD12345',
        }),
    },
};

const measurePages = () => {
    const pages = [...document.querySelectorAll('div')].filter(
        (d) => d.style.width === '794px' && d.style.height === '1123px',
    );
    return pages.map((el, i) => {
        // See the header: a detached clone with the height constraint removed is
        // the only measurement that is not just the box reporting its own size.
        const clone = el.cloneNode(true);
        Object.assign(clone.style, {
            height: 'auto', overflow: 'visible', position: 'absolute',
            top: '-99999px', left: '0', width: '794px',
        });
        document.body.appendChild(clone);
        const natural = clone.scrollHeight;
        clone.remove();
        return { page: i + 1, naturalPx: natural, spareRoomPx: 1123 - natural };
    });
};

const browser = await chromium.launch(
    process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {},
);
const rows = [];
let pageErrors = 0;

for (const [name, state] of Object.entries(SCENARIOS)) {
    for (const lang of LANGS) {
        const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
        page.on('pageerror', () => { pageErrors += 1; });

        // The first visit redirects to the pathway picker because there is no
        // result yet, so seed the store the way a reload restores one and go back.
        await page.goto(`${BASE}/individuals/result`, { waitUntil: 'networkidle' });
        await page.evaluate(([s, l]) => {
            try {
                localStorage.setItem('nexus_language', l);
                sessionStorage.setItem('nexus_assessment_result', JSON.stringify(s));
                sessionStorage.setItem('nexus_assessment_id', s.sessionId);
            } catch { /* private mode throws; nothing to do */ }
        }, [state, lang]);
        await page.goto(`${BASE}/individuals/result`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(3000);

        (await page.evaluate(measurePages)).forEach((m) => {
            rows.push({ scenario: name, lang, ...m });
        });
        await page.close();
    }
}
await browser.close();

if (!rows.length) {
    console.error('No print pages found. Is the preview server running on :4177?');
    process.exit(1);
}

console.log('\nNEXUS report — room left inside each fixed 794x1123 PDF page\n');
console.log('scenario     lang  page  natural  spare');
rows.forEach((r) => {
    const flag = r.spareRoomPx < 0 ? '  ← CLIPPED' : r.spareRoomPx < 40 ? '  ← tight' : '';
    console.log(
        `${r.scenario.padEnd(12)} ${r.lang.padEnd(5)} ${String(r.page).padEnd(5)} ` +
        `${String(r.naturalPx).padStart(7)} ${String(r.spareRoomPx).padStart(6)}${flag}`,
    );
});

const tightest = rows.reduce((a, b) => (b.spareRoomPx < a.spareRoomPx ? b : a));
console.log(
    `\nTightest: ${tightest.scenario} / ${tightest.lang} / page ${tightest.page} ` +
    `with ${tightest.spareRoomPx}px spare.`,
);
if (pageErrors) console.log(`⚠️  ${pageErrors} page errors while measuring.`);

const clipped = rows.filter((r) => r.spareRoomPx < 0);
if (clipped.length) {
    console.log(`\n⚠️  ${clipped.length} page(s) ARE LOSING CONTENT in the downloaded PDF.`);
    if (ASSERT) process.exit(1);
}
