/**
 * COMMUNITY REPORT — the nightly rollup, laid out as a report somebody can hand on.
 *
 * ⚠️ IT ADDS NOTHING AND OPENS NOTHING. The only input is `community_insights/latest`,
 *    which a scheduled function writes with counts only and with small groups
 *    already withheld (`functions/insights.cjs`). This module rearranges those
 *    counts into sections and a CSV. It cannot reach a screening record, so a
 *    report made here cannot describe one person however it is filtered.
 *
 * A withheld count arrives as a string (`'<5'`) and is passed through as that
 * string. It is never turned into a number, a share or a zero.
 */
import { REGION_LABEL } from './singapore/postalSectors';

export const DOMAIN_LABELS = Object.freeze({
    exertionalSymptoms: 'Chest pain or dizziness on exertion',
    chronicCondition: 'Ongoing health condition',
    belowActivityTarget: 'Below 150 min/week',
    psychologicalDistress: 'Psychological distress',
    caregiverStrain: 'Unpaid caregiving strain',
    socialIsolation: 'Limited social support',
    financialBarrier: 'Cost or distance a barrier',
    foodInsecurity: 'Food insecurity',
    housingRisk: '1–2 room HDB',
    fallsRisk: 'Fall in past 12 months (60+)',
    notEnrolledHealthierSg: 'Not enrolled with Healthier SG',
});

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
    'September', 'October', 'November', 'December'];

/** `2026-09` → `September 2026`. Anything else comes back unchanged. */
export const monthLabel = (key) => {
    const m = /^(\d{4})-(\d{2})$/.exec(String(key || ''));
    return m && MONTHS[Number(m[2]) - 1] ? `${MONTHS[Number(m[2]) - 1]} ${m[1]}` : String(key || '');
};

/** `2026-11-10T03:50:00Z` → `10 November 2026`, Singapore time. Empty when unusable. */
export const dayLabel = (iso) => {
    const ms = Date.parse(iso || '');
    if (!Number.isFinite(ms)) return '';
    const d = new Date(ms + 8 * 60 * 60 * 1000);
    return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

/** What a report can cover: everything, or one published month. Newest month first. */
export const reportScopes = (rollup) => [
    { key: 'all', label: 'All time' },
    ...Object.keys(rollup?.periods || {}).sort().reverse().map((key) => ({ key, label: monthLabel(key) })),
];

/** A share of the respondents, or '' when the count is withheld or there is no base. */
const share = (value, base) => (typeof value === 'number' && base > 0 ? `${Math.round((value / base) * 100)}%` : '');

const tallyRows = (map, labelFor) => Object.keys(map || {}).sort()
    .map((key) => ({ key, label: labelFor(key), respondents: map[key].respondents }));

/**
 * @param {object|null} rollup  the `community_insights/latest` document
 * @param {{scope?: string}} [options]  'all' or a month key from `reportScopes`
 * @returns {object|null} the report, or null when there is no rollup
 */
export const buildCommunityReport = (rollup, { scope = 'all' } = {}) => {
    if (!rollup || !rollup.national) return null;
    const month = scope !== 'all' && rollup.periods && rollup.periods[scope] ? scope : null;
    const tally = month ? rollup.periods[month] : rollup.national;
    const respondents = Number(tally.respondents) || 0;
    const keys = Array.isArray(rollup.domainKeys) && rollup.domainKeys.length
        ? rollup.domainKeys : Object.keys(DOMAIN_LABELS);
    const sup = rollup.suppression || {};
    const quality = rollup.quality || {};

    const domainRows = tally.domains
        ? keys.map((key) => ({
            key,
            label: DOMAIN_LABELS[key] || key,
            value: tally.domains[key] ?? 0,
            share: share(tally.domains[key], respondents),
        }))
        : [];

    const notes = [
        'Counts only. No line of this report describes one person, and no screening record was opened to make it.',
    ];
    if (sup.minCell) {
        notes.push(`Any group of fewer than ${sup.minCell} people is withheld, and a count from 1 to ${sup.minCount - 1} is shown as ${sup.band}.`);
    }
    if (!tally.domains) notes.push('What people reported is withheld here: too few people to publish safely.');
    if (!month && sup.suppressedSectorCount > 0) {
        notes.push(`${sup.suppressedSectorCount} postal sector${sup.suppressedSectorCount === 1 ? ' is' : 's are'} withheld from the area tables (${sup.suppressedRespondents} people). They are still counted in the total.`);
    }
    if (month) notes.push('A single month has no area tables: the rollup does not split areas by month.');
    if (!month && quality.unlocatedRecords > 0) notes.push(`${quality.unlocatedRecords} people gave no usable postal sector. They are counted in the total and in no area.`);
    if (!month && quality.undatedRecords > 0) notes.push(`${quality.undatedRecords} records have no date. They are counted in the total and in no month.`);
    if (rollup.truncated) notes.push('The rollup reached its read limit, so these figures describe the newest records only.');

    return {
        title: 'NEXUS Community report',
        scope: month || 'all',
        scopeLabel: month ? monthLabel(month) : 'All time',
        asOf: dayLabel(rollup.generatedAt),
        respondents,
        domainsWithheld: !tally.domains,
        domainRows,
        regionRows: month ? [] : tallyRows(rollup.regions, (key) => REGION_LABEL?.[key] || key),
        sectorRows: month ? [] : tallyRows(rollup.sectors, (key) => `Sector ${key}`),
        monthRows: month ? [] : tallyRows(rollup.periods, monthLabel),
        notes,
    };
};

const cell = (value) => {
    const s = String(value ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** The report as a CSV: one table, `Section, Item, Count, Share`, then the notes. */
export const communityReportCsv = (report) => {
    if (!report) return '';
    const rows = [
        ['Section', 'Item', 'Count', 'Share'],
        ['Report', report.title, '', ''],
        ['Report', 'Covers', report.scopeLabel, ''],
        ['Report', 'Figures as of', report.asOf, ''],
        ['Total', 'Completed screenings', report.respondents, ''],
        ...report.domainRows.map((r) => ['What people reported', r.label, r.value, r.share]),
        ...report.regionRows.map((r) => ['Region', r.label, r.respondents, share(r.respondents, report.respondents)]),
        ...report.sectorRows.map((r) => ['Postal sector', r.label, r.respondents, '']),
        ...report.monthRows.map((r) => ['Month', r.label, r.respondents, '']),
        ...report.notes.map((n) => ['Note', n, '', '']),
    ];
    return `${rows.map((row) => row.map(cell).join(',')).join('\n')}\n`;
};

/** `nexus-community-report-all-time.csv` */
export const communityReportFilename = (report) => (
    `nexus-community-report-${report ? report.scopeLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'empty'}.csv`
);
