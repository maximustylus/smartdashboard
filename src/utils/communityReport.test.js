/**
 * COMMUNITY REPORT — the rollup rearranged. What is pinned is that a withheld
 * count stays withheld through every form the report takes.
 */
import { describe, it, expect } from 'vitest';
import {
    DOMAIN_LABELS, monthLabel, dayLabel, reportScopes, buildCommunityReport, communityReportCsv,
    communityReportFilename,
} from './communityReport.js';

const rollup = (over = {}) => ({
    generatedAt: '2026-11-09T19:50:00.000Z',
    national: { respondents: 120, domains: { foodInsecurity: 12, fallsRisk: '<5', caregiverStrain: 0 } },
    regions: { north: { respondents: 70, domains: {} }, west: { respondents: 40, domains: {} } },
    sectors: { '82': { respondents: 30, domains: {} }, '56': { respondents: 12, domains: {} } },
    periods: {
        '2026-09': { respondents: 90, domains: { foodInsecurity: 9, fallsRisk: 0, caregiverStrain: 0 } },
        '2026-10': { respondents: 30, domains: { foodInsecurity: '<5', fallsRisk: 0, caregiverStrain: 0 } },
    },
    suppression: { minCell: 10, minCount: 5, band: '<5', suppressedSectorCount: 3, suppressedRespondents: 10 },
    quality: { undatedRecords: 2, unlocatedRecords: 10 },
    domainKeys: ['foodInsecurity', 'fallsRisk', 'caregiverStrain'],
    truncated: false,
    ...over,
});

describe('labels', () => {
    it('months and days are said in words, Singapore time', () => {
        expect(monthLabel('2026-09')).toBe('September 2026');
        expect(monthLabel('soon')).toBe('soon');
        expect(dayLabel('2026-11-09T19:50:00.000Z')).toBe('10 November 2026');
        expect(dayLabel('')).toBe('');
    });

    it('every domain the rollup can publish has a label', () => {
        expect(Object.keys(DOMAIN_LABELS)).toHaveLength(11);
    });
});

describe('what a report can cover', () => {
    it('all time, then each published month, newest first', () => {
        expect(reportScopes(rollup())).toEqual([
            { key: 'all', label: 'All time' },
            { key: '2026-10', label: 'October 2026' },
            { key: '2026-09', label: 'September 2026' },
        ]);
        expect(reportScopes(null)).toEqual([{ key: 'all', label: 'All time' }]);
    });
});

describe('the all-time report', () => {
    const report = buildCommunityReport(rollup());

    it('carries the total, the date and the scope', () => {
        expect(report).toMatchObject({ title: 'NEXUS Community report', scope: 'all', scopeLabel: 'All time', asOf: '10 November 2026', respondents: 120 });
    });

    it('a count has a share; A WITHHELD COUNT HAS NEITHER A NUMBER NOR A SHARE', () => {
        expect(report.domainRows).toEqual([
            { key: 'foodInsecurity', label: 'Food insecurity', value: 12, share: '10%' },
            { key: 'fallsRisk', label: 'Fall in past 12 months (60+)', value: '<5', share: '' },
            { key: 'caregiverStrain', label: 'Unpaid caregiving strain', value: 0, share: '0%' },
        ]);
    });

    it('lists regions, sectors and months by name', () => {
        expect(report.regionRows).toEqual([
            { key: 'north', label: 'North', respondents: 70 },
            { key: 'west', label: 'West', respondents: 40 },
        ]);
        expect(report.sectorRows.map((r) => r.label)).toEqual(['Sector 56', 'Sector 82']);
        expect(report.monthRows.map((r) => r.label)).toEqual(['September 2026', 'October 2026']);
    });

    it('says what is withheld, what is unlocated and what is undated', () => {
        const notes = report.notes.join(' ');
        expect(notes).toMatch(/fewer than 10 people is withheld, and a count from 1 to 4 is shown as <5/);
        expect(notes).toMatch(/3 postal sectors are withheld from the area tables \(10 people\)/);
        expect(notes).toMatch(/10 people gave no usable postal sector/);
        expect(notes).toMatch(/2 records have no date/);
        expect(notes).toMatch(/no screening record was opened/);
    });

    it('says when the rollup was cut short', () => {
        expect(buildCommunityReport(rollup({ truncated: true })).notes.join(' ')).toMatch(/read limit/);
    });
});

describe('a one-month report', () => {
    const report = buildCommunityReport(rollup(), { scope: '2026-10' });

    it('is that month only, with no area tables and a note saying why', () => {
        expect(report).toMatchObject({ scope: '2026-10', scopeLabel: 'October 2026', respondents: 30 });
        expect(report.regionRows).toEqual([]);
        expect(report.sectorRows).toEqual([]);
        expect(report.monthRows).toEqual([]);
        expect(report.notes.join(' ')).toMatch(/single month has no area tables/);
        expect(report.domainRows[0]).toMatchObject({ value: '<5', share: '' });
    });

    it('a month that is not published falls back to all time rather than inventing one', () => {
        expect(buildCommunityReport(rollup(), { scope: '2026-01' }).scope).toBe('all');
    });
});

describe('edges', () => {
    it('no rollup, no report', () => {
        expect(buildCommunityReport(null)).toBeNull();
        expect(buildCommunityReport({})).toBeNull();
        expect(communityReportCsv(null)).toBe('');
    });

    it('too few people nationally: the total is shown and what they reported is not', () => {
        const report = buildCommunityReport(rollup({ national: { respondents: 4, domains: null } }));
        expect(report.respondents).toBe(4);
        expect(report.domainsWithheld).toBe(true);
        expect(report.domainRows).toEqual([]);
        expect(report.notes.join(' ')).toMatch(/too few people to publish safely/);
    });
});

describe('the CSV', () => {
    const csv = communityReportCsv(buildCommunityReport(rollup()));
    const lines = csv.trim().split('\n');

    it('is one table with a header, and ends with the notes', () => {
        expect(lines[0]).toBe('Section,Item,Count,Share');
        expect(lines).toContain('Total,Completed screenings,120,');
        expect(lines).toContain('What people reported,Food insecurity,12,10%');
        expect(lines).toContain('Region,North,70,58%');
        expect(lines).toContain('Month,October 2026,30,');
        expect(lines[lines.length - 1]).toMatch(/^Note,/);
    });

    it('A WITHHELD COUNT IS WRITTEN AS WITHHELD', () => {
        expect(lines).toContain('What people reported,Fall in past 12 months (60+),<5,');
    });

    it('quotes a cell with a comma in it', () => {
        expect(csv).toMatch(/Note,"Any group of fewer than 10 people is withheld, and a count from 1 to 4 is shown as <5\."/);
    });

    it('names the file after what it covers', () => {
        expect(communityReportFilename(buildCommunityReport(rollup()))).toBe('nexus-community-report-all-time.csv');
        expect(communityReportFilename(buildCommunityReport(rollup(), { scope: '2026-10' }))).toBe('nexus-community-report-october-2026.csv');
    });
});
