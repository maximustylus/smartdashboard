/**
 * THE PERMANENT MONTHLY RECORD — counts that outlive the screening records, which
 * expire at 24 months. Two things are pinned: a month once saved is never replaced
 * by a smaller one, and a day's breakdown cannot be recovered by subtraction.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import insights from './insights.cjs';

const { MIN_CELL, BAND, buildHistory, buildInsights, publishableCells, keepFullerMonth, dayOf, pathwayOf } = insights;

const form = (iso, flags = {}) => ({ createdAt: new Date(iso), flags, postalSector: '82' });
const chat = (iso, payload = {}) => ({ createdAt: new Date(iso), payload, event: 'aura_triage_complete' });
const tap = (iso) => ({ createdAt: new Date(iso), action: 'download_pdf', postalSector: '82' });
const times = (n, make) => Array.from({ length: n }, (_, i) => make(i));

describe('what a month holds', () => {
    const september = [
        ...times(12, (i) => form('2026-09-26T03:00:00Z', { sdohFoodInsecure: i < 6 })),
        ...times(8, () => chat('2026-09-26T04:00:00Z')),
        ...times(11, (i) => form('2026-09-27T03:00:00Z', { sdohFoodInsecure: i < 2 })),
        tap('2026-09-26T03:00:00Z'),
    ];
    const alone = buildHistory(september);
    const history = buildHistory([
        ...september,
        { flags: {} }, // undated
        form('2026-10-01T03:00:00Z'),
    ]);

    it('counts completed screenings only, by pathway, and leaves taps and undated rows out', () => {
        expect(history['2026-09']).toMatchObject({ month: '2026-09', respondents: 31, chat: 8, form: 23 });
        expect(Object.keys(history)).toEqual(['2026-09', '2026-10']);
    });

    it('bands the month and each day large enough to publish', () => {
        expect(alone['2026-09'].domains.foodInsecurity).toBe(8);
        expect(alone['2026-09'].days['2026-09-26']).toMatchObject({ respondents: 20, chat: 8, form: 12 });
        expect(alone['2026-09'].days['2026-09-26'].domains.foodInsecurity).toBe(6);
        expect(alone['2026-09'].days['2026-09-27'].domains.foodInsecurity).toBe(BAND);
    });

    /**
     * ⚠️ THE SAME MONTH, BESIDE TWO PEOPLE IT WOULD GIVE AWAY. One screening in
     *    October and one with no date: the all-time breakdown minus September's is
     *    exactly those two. So September keeps its counts and loses its breakdown,
     *    and its days go with it.
     */
    it('a month that would give a small one away keeps its counts and loses its breakdown', () => {
        expect(history['2026-09']).toMatchObject({ respondents: 31, chat: 8, form: 23, domains: null });
        expect(history['2026-09'].days['2026-09-26']).toMatchObject({ respondents: 20, domains: null });
        expect(history['2026-09'].days['2026-09-27'].domains).toBeNull();
    });

    it('a month below the floor says how many came and nothing about them', () => {
        expect(history['2026-10']).toMatchObject({ respondents: 1, chat: 0, form: 1, domains: null });
        expect(history['2026-10'].days['2026-10-01'].domains).toBeNull();
    });

    it('holds nothing but counts: no sector, no id, no free text', () => {
        const out = JSON.stringify(history);
        expect(out).not.toMatch(/postalSector|sessionId|"82"|aura_triage|download_pdf/);
    });

    it('days and months are Singapore days and months', () => {
        expect(dayOf({ createdAt: new Date('2026-09-30T17:00:00Z') })).toBe('2026-10-01');
        expect(dayOf({ createdAt: { toDate: () => new Date('2026-09-26T03:00:00Z') } })).toBe('2026-09-26');
        expect(dayOf({})).toBeNull();
        expect(pathwayOf({ flags: {} })).toBe('form');
        expect(pathwayOf({ payload: {} })).toBe('chat');
    });
});

describe('⚠️ a small day cannot be recovered by subtraction', () => {
    it('30 on one day and 3 on another: NEITHER day gets a breakdown, the month still does', () => {
        const month = buildHistory([
            ...times(30, (i) => form('2026-09-26T03:00:00Z', { sdohFoodInsecure: i < 10 })),
            ...times(3, () => form('2026-09-27T03:00:00Z', { sdohFoodInsecure: true })),
        ])['2026-09'];
        expect(month.domains.foodInsecurity).toBe(13);
        // Published, the big day (10) would give the small one away: 13 − 10 = all 3 of them.
        expect(month.days['2026-09-26'].domains).toBeNull();
        expect(month.days['2026-09-27'].domains).toBeNull();
        expect(month.days['2026-09-27'].respondents).toBe(3);
    });

    it('when what is left over is itself a publishable group, the big day is published', () => {
        const month = buildHistory([
            ...times(30, () => form('2026-09-26T03:00:00Z')),
            ...times(6, () => form('2026-09-27T03:00:00Z')),
            ...times(4, () => form('2026-09-28T03:00:00Z')),
        ])['2026-09'];
        expect(month.days['2026-09-26'].domains).not.toBeNull();
        expect(month.days['2026-09-27'].domains).toBeNull();
        expect(month.days['2026-09-28'].domains).toBeNull();
    });

    it('a day exactly at the floor is published when nothing is left over', () => {
        const month = buildHistory(times(MIN_CELL, () => form('2026-09-26T03:00:00Z')))['2026-09'];
        expect(month.days['2026-09-26'].domains).not.toBeNull();
    });
});

describe('⚠️ a small month cannot be recovered by subtraction', () => {
    const sizes = (obj) => new Map(Object.entries(obj));

    it('the live shape: two months of one person cost the smallest published month its breakdown', () => {
        const open = publishableCells(sizes({ '2026-04': 62, '2026-05': 1, '2026-07': 1, '2026-08': 24, '2026-09': 38, '2026-10': 44 }), 170);
        expect([...open].sort()).toEqual(['2026-04', '2026-09', '2026-10']);
    });

    it('nothing small, nothing lost; a small group of ten or more is safe as it stands', () => {
        expect(publishableCells(sizes({ a: 10, b: 30 }), 40).size).toBe(2);
        expect(publishableCells(sizes({ a: 10, b: 30, c: 6, d: 4 }), 50).size).toBe(2);
    });

    it('people with no date are part of what is left over', () => {
        expect([...publishableCells(sizes({ a: 12, b: 30 }), 45)]).toEqual(['b']);
    });

    it('the smallest goes first, and one is always enough', () => {
        expect([...publishableCells(sizes({ a: 10, b: 11, c: 3 }), 24)]).toEqual(['b']);
        expect(publishableCells(sizes({ a: 10, c: 3 }), 13).size).toBe(0);
    });

    /**
     * The rollup's month table and the permanent record are two views of the same
     * people. If they ever cut a month differently, or withheld different months,
     * the difference between them would be a third, unreviewed publication.
     */
    it('the rollup and the permanent record withhold the same months, cut the same way', () => {
        const records = [
            ...times(62, () => form('2026-04-18T03:00:00Z', { sdohFoodInsecure: true })),
            form('2026-05-02T03:00:00Z', { sdohFoodInsecure: true }),
            form('2026-07-09T03:00:00Z'),
            ...times(24, () => form('2026-08-28T03:00:00Z')),
            // 01:00 on 1 October in Singapore is still September in UTC.
            ...times(38, () => chat('2026-09-30T17:00:00Z')),
        ];
        const rollup = buildInsights(records, () => 'east');
        const history = buildHistory(records);
        const published = Object.keys(history).filter((m) => history[m].domains !== null);
        expect(Object.keys(rollup.periods)).toEqual(published);
        expect(published).toEqual(['2026-04', '2026-10']);
        expect(rollup.suppression.suppressedPeriods).toEqual(['2026-05', '2026-07']);
        expect(rollup.suppression.complementPeriods).toEqual(['2026-08']);
        // What is left over is May, July and August together: 26 people, not 2.
        expect(rollup.national.respondents - published.reduce((n, m) => n + history[m].respondents, 0)).toBe(26);
        // The withheld month still says how many came, and on which day.
        expect(history['2026-08']).toMatchObject({ respondents: 24, domains: null });
        expect(history['2026-08'].days['2026-08-28']).toMatchObject({ respondents: 24, domains: null });
    });
});

describe('a saved month is never replaced by a smaller one', () => {
    const saved = { month: '2026-04', respondents: 62, chat: 35, form: 27 };

    it('tonight wins while the month is still growing or unchanged', () => {
        const more = { ...saved, respondents: 63 };
        expect(keepFullerMonth(saved, more)).toBe(more);
        const same = { ...saved };
        expect(keepFullerMonth(saved, same)).toBe(same);
        expect(keepFullerMonth(null, same)).toBe(same);
    });

    it('once rows have expired, the saved month stays', () => {
        expect(keepFullerMonth(saved, { ...saved, respondents: 20 })).toBe(saved);
        expect(keepFullerMonth(saved, { ...saved, respondents: 0 })).toBe(saved);
    });
});

describe('the nightly job writes it one-way, beside the rollup', () => {
    const index = readFileSync(resolve(process.cwd(), 'functions/index.js'), 'utf8');
    const start = index.indexOf('exports.buildCommunityInsights = onSchedule(');
    const job = index.slice(start, index.indexOf('\n});\n', start)).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

    it('writes a month only when keepFullerMonth chose tonight\'s', () => {
        expect(job).toMatch(/insightsLib\.buildHistory\(records\)/);
        expect(job).toMatch(/if \(insightsLib\.keepFullerMonth\(monthSnap\.exists \? monthSnap\.data\(\) : null, fresh\) !== fresh\) return;/);
        expect(job).toMatch(/db\.doc\(`community_insights\/\$\{key\}`\)/);
    });

    it('never deletes a month', () => {
        expect(job).not.toMatch(/\.delete\(/);
    });

    it('the months sit where every client write is already refused', () => {
        const rules = readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8');
        expect(rules).toMatch(/match \/community_insights\/\{period\} \{\s*allow read: if isSignedIn\(\);\s*allow write: if false;/);
    });
});

describe('the export workflow keeps no rows', () => {
    const workflow = readFileSync(resolve(process.cwd(), '.github/workflows/event-export.yml'), 'utf8');
    const steps = workflow.split('\n').filter((line) => !line.trim().startsWith('#')).join('\n');

    it('prints no CSV into the public log and uploads none', () => {
        expect(steps).not.toMatch(/cat [^\n]*\.csv/);
        expect(steps).not.toMatch(/CSV-BEGIN/);
        expect(steps).toMatch(/rm -f \.\/\*\.csv/);
        expect(steps.indexOf('rm -f ./*.csv')).toBeLessThan(steps.indexOf('actions/upload-artifact'));
    });
});
