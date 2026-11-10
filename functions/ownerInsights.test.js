/**
 * OWNER INSIGHTS — the one place in NEXUS that reads across teams. What is pinned
 * hardest is what may NOT leave the server: anything that identifies a person.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
    PERIODS, DAY_MS, normalisePeriod, toMillis, inPeriod, periodStart, summariseOwnerInsights,
} = require('./ownerInsights.cjs');

const NOW = Date.parse('2026-11-10T04:00:00Z');
const daysAgo = (n) => new Date(NOW - n * DAY_MS).toISOString();
const ts = (iso) => ({ toMillis: () => Date.parse(iso) });

const facts = (over = {}) => ({
    period: 'all',
    nowMs: NOW,
    year: 2026,
    teams: [
        { id: 'kkh-sem', name: 'Sport and Exercise Medicine', institution: 'KKH', createdAt: daysAgo(80) },
        { id: 'sgh-rt', name: 'Respiratory Therapy', institution: 'SGH', createdAt: ts(daysAgo(10)) },
        { id: 'kkh-aud', name: 'Audiology', institution: 'KKH' },
    ],
    members: [
        { teamId: 'kkh-sem', uid: 'u-ann', role: 'lead', displayName: 'Ann Lee', email: 'ann.lee@kkh.com.sg' },
        { teamId: 'kkh-sem', uid: 'u-ben', role: 'staff', displayName: 'Ben Ong', email: 'ben.ong@kkh.com.sg' },
        { teamId: 'kkh-sem', uid: 'pending-cara-lim', role: 'staff', displayName: 'Cara Lim' },
        { teamId: 'sgh-rt', uid: 'u-dev', role: 'lead', displayName: 'Dev Raj', email: 'dev.raj@sgh.com.sg' },
        { teamId: 'sgh-rt', uid: 'u-ann', role: 'viewer', displayName: 'Ann Lee' },
        { teamId: 'deleted-team', uid: 'u-ghost', role: 'lead', displayName: 'Ghost' },
    ],
    leadRequests: [
        { status: 'pending', requestedAt: daysAgo(2), email: 'eve@ttsh.com.sg', displayName: 'Eve' },
        { status: 'approved', requestedAt: daysAgo(80) },
        { status: 'approved', requestedAt: daysAgo(10) },
        { status: 'declined', requestedAt: daysAgo(40) },
        { status: 'approved' },                       // undated
        { status: 'weird', requestedAt: daysAgo(1) }, // not a status
    ],
    teamsWithRoster: ['kkh-sem'],
    screenings: { total: 412, inPeriod: 37 },
    ...over,
});

describe('what may leave the server', () => {
    it('contains no name, address or uid of any person, anywhere in the output', () => {
        const out = JSON.stringify(summariseOwnerInsights(facts()));
        for (const secret of ['Ann', 'Lee', 'Ben', 'Cara', 'Dev', 'Raj', 'Eve', 'Ghost', '@', 'u-ann', 'u-ben', 'u-dev', 'pending-']) {
            expect(out, secret).not.toContain(secret);
        }
    });

    it('team rows carry exactly the allowed keys', () => {
        for (const row of summariseOwnerInsights(facts()).teamRows) {
            expect(Object.keys(row).sort()).toEqual(
                ['createdOn', 'hasRoster', 'institution', 'leads', 'members', 'name', 'pendingMembers'],
            );
        }
    });

    it('the module never mentions wellbeing, pulse or workload data', () => {
        const code = readFileSync(resolve(process.cwd(), 'functions/ownerInsights.cjs'), 'utf8')
            .replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
        expect(code).not.toMatch(/pulse|wellbeing|workload|energy|grade/i);
    });
});

describe('counting people and teams', () => {
    const out = summariseOwnerInsights(facts());

    it('counts a person in two teams once', () => {
        expect(out.tiles.people.value).toBe(3); // ann, ben, dev
    });

    it('keeps placeholders apart from people who can sign in', () => {
        expect(out.tiles.people.pendingMembers).toBe(1);
        expect(out.teamRows.find((t) => t.name === 'Sport and Exercise Medicine'))
            .toMatchObject({ members: 2, leads: 1, pendingMembers: 1, hasRoster: true });
    });

    it('ignores a membership whose team no longer exists', () => {
        expect(out.tiles.teams.value).toBe(3);
        expect(out.tiles.people.leads).toBe(2);
    });

    it('shows a team with nobody in it rather than hiding it', () => {
        expect(out.teamRows.find((t) => t.name === 'Audiology'))
            .toMatchObject({ members: 0, leads: 0, hasRoster: false, createdOn: null });
    });

    it('sorts teams by size, then name', () => {
        expect(out.teamRows.map((t) => t.name))
            .toEqual(['Respiratory Therapy', 'Sport and Exercise Medicine', 'Audiology']);
    });

    it('reads a Firestore Timestamp and an ISO string alike', () => {
        expect(out.teamRows.find((t) => t.name === 'Respiratory Therapy').createdOn)
            .toBe(daysAgo(10).slice(0, 10));
    });
});

describe('the lead-request pipeline and its rate', () => {
    it('counts each status, and ignores a status that is not one', () => {
        expect(summariseOwnerInsights(facts()).pipeline)
            .toEqual({ pending: 1, approved: 3, declined: 1, total: 5 });
    });

    it('approval rate counts only DECIDED requests, and shows its base', () => {
        const { requests } = summariseOwnerInsights(facts()).tiles;
        expect(requests).toMatchObject({ approved: 3, decided: 4, approvalRate: 75, pending: 1 });
    });

    it('is null, not 0%, when nothing has been decided', () => {
        const out = summariseOwnerInsights(facts({ leadRequests: [{ status: 'pending', requestedAt: daysAgo(1) }] }));
        expect(out.tiles.requests.approvalRate).toBeNull();
    });
});

describe('the period filter', () => {
    it('30 days: requests and new teams inside the window only; undated items are not claimed', () => {
        const out = summariseOwnerInsights(facts({ period: '30' }));
        expect(out.pipeline).toEqual({ pending: 1, approved: 1, declined: 0, total: 2 });
        expect(out.tiles.teams.newInPeriod).toBe(1);
        expect(out.tiles.screenings).toEqual({ value: 37, total: 412 });
    });

    it('does NOT change the people count or the teams table', () => {
        const all = summariseOwnerInsights(facts());
        const month = summariseOwnerInsights(facts({ period: '30' }));
        expect(month.tiles.people).toEqual(all.tiles.people);
        expect(month.tiles.teams.value).toBe(all.tiles.teams.value);
        expect(month.teamRows).toEqual(all.teamRows);
    });

    it('all time counts undated items', () => {
        expect(summariseOwnerInsights(facts()).tiles.teams.newInPeriod).toBe(3);
    });

    it.each([['7'], ['year'], [undefined], [null], [30.5]])('an unknown period %j falls back to all', (period) => {
        expect(normalisePeriod(period)).toBe('all');
    });

    it('knows its three periods', () => {
        expect(PERIODS).toEqual(['all', '90', '30']);
        expect(periodStart('all', NOW)).toBeNull();
        expect(periodStart('30', NOW)).toBe(NOW - 30 * DAY_MS);
        expect(inPeriod(null, NOW - DAY_MS)).toBe(false);
        expect(inPeriod(null, null)).toBe(true);
    });
});

describe('bad input never throws and never invents', () => {
    it('empty facts give zeros', () => {
        const out = summariseOwnerInsights();
        expect(out.tiles.teams.value).toBe(0);
        expect(out.tiles.people.value).toBe(0);
        expect(out.tiles.screenings).toEqual({ value: 0, total: 0 });
        expect(out.teamRows).toEqual([]);
    });

    it.each([[undefined], [NaN], [-4], ['many']])('a screening count of %j is 0', (total) => {
        expect(summariseOwnerInsights(facts({ screenings: { total } })).tiles.screenings.total).toBe(0);
    });

    it.each([[undefined, null], ['not a date', null], [NaN, null], [{}, null]])('toMillis(%j) is null', (v, expected) => {
        expect(toMillis(v)).toBe(expected);
    });
});
