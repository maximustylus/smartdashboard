'use strict';
/**
 * ==============================================================================
 * DAY EXPORT — one day's completed assessments, de-identified, as a CSV   READ ONLY
 * ==============================================================================
 * Run:  GOOGLE_APPLICATION_CREDENTIALS=key.json node scripts/day-export.cjs 2026-09-26
 *
 * For an outreach that ran before `event_records` existed (10 October 2026), or
 * for any day: reads `community_assessments` created on that date, Singapore
 * time, and writes one row per record with only the fields a report needs.
 * Free text (`perception.improve`), the previous-record id and anything else
 * that is not a band, a flag or a label is left out.
 */
const fs = require('fs');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const { describeCredentialFile } = require('./credential.cjs');

// One day, a range (`2026-09-01..2026-09-30`), or `all`. Singapore time throughout.
const arg = process.argv[2] || '';
const m = arg.match(/^(\d{4}-\d{2}-\d{2})(?:\.\.(\d{4}-\d{2}-\d{2}))?$/);
if (!m && arg !== 'all') { console.error('Usage: node scripts/day-export.cjs YYYY-MM-DD | YYYY-MM-DD..YYYY-MM-DD | all'); process.exit(2); }
const day = arg === 'all' ? 'all' : m[2] ? `${m[1]}..${m[2]}` : m[1];
const start = arg === 'all' ? new Date('2020-01-01T00:00:00+08:00') : new Date(`${m[1]}T00:00:00+08:00`);
const end = arg === 'all' ? new Date('2100-01-01T00:00:00+08:00') : new Date(`${m[2] || m[1]}T23:59:59.999+08:00`);

const COLS = ['createdAt', 'kind', 'action', 'sessionId', 'language', 'postalSector', 'score', 'ctaTier',
    'pavsScore', 'pavsDays', 'pavsMinutes', 'strengthDays', 'symptomFlag', 'medFlag', 'psychoFlag',
    'sdohFinancial', 'sdohSocial', 'sdohPsychological', 'sdohFoodInsecure', 'caregiverStrain', 'sdohHousing',
    'fallsAsked', 'fallsCount', 'fallsRisk', 'fearOfFalling', 'healthierSgEnrolled',
    'gender', 'ageBand', 'ethnicity', 'housingType', 'gripBand', 'stsBand', 'stsProtocol', 'measureSetting',
    'aware', 'referred', 'rating', 'incomeAdequacy'];
const cell = (v) => { if (v === undefined || v === null) return ''; const s = typeof v?.toDate === 'function' ? v.toDate().toISOString() : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

const flatten = (d) => {
    const f = d.payload || d.flags || {};
    const fs_ = f.functionalStorable || {}, p = f.perception || {};
    const kind = /^aura_triage_complete/.test(d.event || '') ? 'chat'
        : /^conventional_form/.test(d.action || '') ? 'form'
        : d.action ? 'action' : 'other';
    return {
        createdAt: d.createdAt, kind, action: kind === 'action' ? d.action : '', sessionId: d.sessionId || '',
        language: d.language || '', postalSector: d.postalSector, score: kind === 'chat' ? d.computedRisk : d.score, ctaTier: d.ctaTier,
        pavsScore: f.pavsScore, pavsDays: f.pavsDays, pavsMinutes: f.pavsMinutes, strengthDays: f.strengthDays,
        symptomFlag: f.symptomFlag, medFlag: f.medFlag, psychoFlag: f.psychoFlag,
        sdohFinancial: f.sdohFinancial, sdohSocial: f.sdohSocial, sdohPsychological: f.sdohPsychological, sdohFoodInsecure: f.sdohFoodInsecure,
        caregiverStrain: f.caregiverStrain, sdohHousing: f.sdohHousing,
        fallsAsked: f.fallsAsked, fallsCount: f.fallsCount, fallsRisk: f.fallsRisk, fearOfFalling: f.fearOfFalling, healthierSgEnrolled: f.healthierSgEnrolled,
        gender: f.gender, ageBand: f.age, ethnicity: f.ethnicity, housingType: f.housingType,
        gripBand: fs_.grip?.band, stsBand: fs_.sitToStand?.band, stsProtocol: fs_.sitToStand?.protocol, measureSetting: fs_.setting,
        aware: p.aware, referred: p.referred, rating: p.rating, incomeAdequacy: p.incomeAdequacy,
    };
};

(async () => {
    console.log('='.repeat(78)); console.log(`  NEXUS — day export: ${day} (Singapore time)      READ ONLY`); console.log('='.repeat(78));
    const cred = describeCredentialFile(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    console.log(`  Key:     ${cred.path || '(GOOGLE_APPLICATION_CREDENTIALS is not set)'}`);
    initializeApp();
    const db = getFirestore();
    const snap = await db.collection('community_assessments')
        .where('createdAt', '>=', Timestamp.fromDate(start)).where('createdAt', '<=', Timestamp.fromDate(end)).get();
    const rows = snap.docs.map((d) => flatten(d.data()));
    rows.sort((a, b) => (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0));
    const file = `day-${day}.csv`;
    fs.writeFileSync(file, [COLS.join(','), ...rows.map((r) => COLS.map((c) => cell(r[c])).join(','))].join('\n') + '\n');
    const by = (k) => rows.filter((r) => r.kind === k);
    console.log(`\n  ${rows.length} records → ${file}`);
    console.log(`  Completed: ${by('chat').length} chat, ${by('form').length} form · action rows: ${by('action').length} · other: ${by('other').length}`);
    // Completed screenings by month and the busiest days, Singapore time.
    const sgDate = (t) => { const d = t?.toDate ? t.toDate() : new Date(t); return new Date(d.getTime() + 8 * 3600e3).toISOString(); };
    const done = rows.filter((r) => r.kind === 'chat' || r.kind === 'form');
    const months = {}, days = {};
    done.forEach((r) => { const iso = sgDate(r.createdAt); const mo = iso.slice(0, 7), dy = iso.slice(0, 10); months[mo] ??= { chat: 0, form: 0 }; months[mo][r.kind] += 1; days[dy] = (days[dy] || 0) + 1; });
    console.log('\n  Completed screenings by month');
    Object.keys(months).sort().forEach((k) => console.log(`    ${k}  ${String(months[k].chat + months[k].form).padStart(5)}   (chat ${months[k].chat}, form ${months[k].form})`));
    console.log('\n  Busiest days');
    Object.entries(days).sort((a, b) => b[1] - a[1]).slice(0, 12).forEach(([k, v]) => console.log(`    ${k}  ${String(v).padStart(5)}`));
})().catch((e) => { console.error(e.message || e); process.exit(1); });
