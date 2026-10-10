'use strict';
/**
 * ==============================================================================
 * EVENT EXPORT — one event's records as a CSV and a summary       READ ONLY
 * ==============================================================================
 * Run:  GOOGLE_APPLICATION_CREDENTIALS=key.json node scripts/event-export.cjs health-fiesta-2026
 *
 * Reads `event_records` for the named event and writes `event-<id>-<date>.csv`
 * beside a printed summary: residents through the gate, pathway, language,
 * postal sector, completions, PDFs downloaded, links tapped. The shape is the
 * one `firestore.rules` accepts for that collection and `telemetry.js` writes;
 * nothing in it identifies a person.
 *
 * The collection is sorted here rather than in the query, so no composite index
 * is needed and the script works the day the event happens.
 */
const fs = require('fs');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { describeCredentialFile } = require('./credential.cjs');

const eventId = process.argv[2];
if (!eventId) {
    console.error('Usage: node scripts/event-export.cjs <eventId>   e.g. health-fiesta-2026');
    process.exit(2);
}

const COLUMNS = ['createdAt', 'action', 'pathway', 'language', 'postalSector', 'sessionId', 'ctaTier', 'score', 'measured', 'north'];
const csvCell = (v) => {
    if (v === undefined || v === null) return '';
    const s = typeof v?.toDate === 'function' ? v.toDate().toISOString() : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const tally = (rows, key) => rows.reduce((m, r) => { const k = r[key] ?? '(none)'; m[k] = (m[k] || 0) + 1; return m; }, {});
const show = (title, counts) => {
    console.log(`\n  ${title}`);
    Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([k, n]) => console.log(`    ${String(n).padStart(5)}  ${k}`));
};

(async () => {
    console.log('='.repeat(78));
    console.log(`  NEXUS — event export: ${eventId}      READ ONLY`);
    console.log('='.repeat(78));
    const cred = describeCredentialFile(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    console.log(`  Key:     ${cred.path || '(GOOGLE_APPLICATION_CREDENTIALS is not set)'}`);
    initializeApp();
    const db = getFirestore();

    const snap = await db.collection('event_records').where('eventId', '==', eventId).get();
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    rows.sort((a, b) => (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0));

    const date = new Date().toISOString().slice(0, 10);
    const file = `event-${eventId}-${date}.csv`;
    const lines = [COLUMNS.join(','), ...rows.map((r) => COLUMNS.map((c) => csvCell(r[c])).join(','))];
    fs.writeFileSync(file, lines.join('\n') + '\n');
    console.log(`\n  ${rows.length} records → ${file}`);

    const by = (action) => rows.filter((r) => r.action === action);
    const entered = by('enter'), completed = by('complete');
    const sessions = (list) => new Set(list.map((r) => r.sessionId)).size;
    console.log(`\n  Through the gate:   ${sessions(entered)} residents (${entered.length} taps)`);
    console.log(`  Completed:          ${sessions(completed)} residents`);
    console.log(`  PDFs downloaded:    ${by('download_pdf').length}`);
    console.log(`  Links tapped:       ${rows.filter((r) => String(r.action).startsWith('click_')).length}`);
    show('Completed, by pathway', tally(completed, 'pathway'));
    show('Completed, by language', tally(completed, 'language'));
    show('Completed, by postal sector', tally(completed, 'postalSector'));
    show('Completed, by routing tier', tally(completed, 'ctaTier'));
    show('Completed, with a strength measurement', tally(completed, 'measured'));
    show('Completed, shown the north poster', tally(completed, 'north'));
    show('Links tapped, by link', tally(rows.filter((r) => String(r.action).startsWith('click_')), 'action'));
})().catch((e) => { console.error(e.message || e); process.exit(1); });
