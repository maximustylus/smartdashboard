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
    PERIODS, DAY_MS, ACTIVITY, ACTIVITY_KEYS, SIGNUP_MONTHS, VISIT_LIMIT, monthKey, lastMonths,
    normalisePeriod, toMillis, inPeriod, periodStart, summariseOwnerInsights,
} = require('./ownerInsights.cjs');

const NOW = Date.parse('2026-11-10T04:00:00Z');
const daysAgo = (n) => new Date(NOW - n * DAY_MS).toISOString();
const ts = (iso) => ({ toMillis: () => Date.parse(iso) });

const facts = (over = {}) => ({
    period: 'all',
    nowMs: NOW,
    year: 2026,
    teams: [
        { id: 'northside-sem', name: 'Sport and Exercise Medicine', institution: 'Northside', createdAt: daysAgo(80) },
        { id: 'sgh-rt', name: 'Respiratory Therapy', institution: 'SGH', createdAt: ts(daysAgo(10)) },
        { id: 'northside-aud', name: 'Audiology', institution: 'Northside' },
    ],
    members: [
        { teamId: 'northside-sem', uid: 'u-ann', role: 'lead', displayName: 'Ann Lee', email: 'ann.lee@northside.example' },
        { teamId: 'northside-sem', uid: 'u-ben', role: 'staff', displayName: 'Ben Ong', email: 'ben.ong@northside.example' },
        { teamId: 'northside-sem', uid: 'pending-cara-lim', role: 'staff', displayName: 'Cara Lim' },
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
    teamsWithRoster: ['northside-sem'],
    accounts: [
        { uid: 'u-ann', createdAt: daysAgo(80), activeAt: daysAgo(1), verified: true, email: 'ann.lee@northside.example' },
        { uid: 'u-ben', createdAt: daysAgo(40), activeAt: daysAgo(35), verified: true },
        { uid: 'u-dev', createdAt: daysAgo(10), activeAt: daysAgo(2), verified: true },
        { uid: 'u-fay', createdAt: daysAgo(3), activeAt: daysAgo(3), verified: false, email: 'fay@nuh.com.sg' }, // no team
        { uid: 'u-old', verified: true },                                                                       // undated
    ],
    activity: {
        'northside-sem': { rosters: 1, rosterEdits: 4, swaps: 7, feedPosts: 12, reports: 1, projects: 1, attendance: 1, pulse: 99 },
        'sgh-rt': { rosters: 1, swaps: 2 },
    },
    community: { respondents: 286, generatedAt: '2026-11-09T19:50:00.000Z', truncated: false },
    visits: [{ at: daysAgo(1), self: true, uid: 'u-ann' }, { at: ts(daysAgo(2)), self: false, uid: 'u-dev' }, { self: true }],
    visitsTotal: 14,
    ...over,
});

describe('what may leave the server', () => {
    it('contains no name, address or uid of any person, anywhere in the output', () => {
        const out = JSON.stringify(summariseOwnerInsights(facts()));
        for (const secret of ['Ann', 'Lee', 'Ben', 'Cara', 'Dev', 'Raj', 'Eve', 'Ghost', '@', 'u-ann', 'u-ben', 'u-dev', 'u-fay', 'u-old', 'fay', 'pending-']) {
            expect(out, secret).not.toContain(secret);
        }
    });

    it('team rows carry exactly the allowed keys', () => {
        for (const row of summariseOwnerInsights(facts()).teamRows) {
            expect(Object.keys(row).sort()).toEqual(
                ['activity', 'createdOn', 'hasRoster', 'institution', 'leads', 'members', 'name', 'pendingMembers'],
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
        expect(out.tiles.accounts.newInPeriod).toBe(2); // dev and fay; the undated account is not claimed
    });

    it('does NOT change the people count or the teams table', () => {
        const all = summariseOwnerInsights(facts());
        const month = summariseOwnerInsights(facts({ period: '30' }));
        expect(month.tiles.people).toEqual(all.tiles.people);
        expect(month.tiles.teams.value).toBe(all.tiles.teams.value);
        expect(month.teamRows).toEqual(all.teamRows);
        expect(month.signups).toEqual(all.signups);
        expect(month.tiles.screenings).toEqual(all.tiles.screenings);
        expect(month.tiles.accounts.value).toBe(all.tiles.accounts.value);
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
        expect(out.tiles.screenings).toEqual({ value: null, asOf: null, truncated: false });
        expect(out.tiles.accounts.value).toBe(0);
        expect(out.access).toEqual({ visits: [], total: 0 });
        expect(out.teamRows).toEqual([]);
    });

    it.each([[undefined], [NaN], ['many'], [null]])('a rollup with respondents %j is no rollup: a dash, not a zero', (respondents) => {
        const community = respondents === null ? null : { respondents };
        expect(summariseOwnerInsights(facts({ community })).tiles.screenings.value).toBeNull();
    });

    it.each([[undefined, null], ['not a date', null], [NaN, null], [{}, null]])('toMillis(%j) is null', (v, expected) => {
        expect(toMillis(v)).toBe(expected);
    });
});

describe('accounts: everybody who has signed up', () => {
    const out = summariseOwnerInsights(facts());

    it('counts accounts, confirmed addresses, and who is in a team', () => {
        expect(out.tiles.accounts).toEqual({
            value: 5, verified: 4, inTeams: 3, withoutTeam: 2, newInPeriod: 5, active30: 3, truncated: false,
        });
    });

    it('active means used in the last 30 days, and an account never seen is not active', () => {
        const later = summariseOwnerInsights(facts({ nowMs: NOW + 40 * DAY_MS }));
        expect(later.tiles.accounts.active30).toBe(0);
    });

    it('gives twelve months, oldest first, ending this month, zeros included', () => {
        expect(out.signups.months).toHaveLength(SIGNUP_MONTHS);
        expect(out.signups.months.map((m) => m.key)).toEqual(lastMonths(NOW, SIGNUP_MONTHS));
        expect(out.signups.months[SIGNUP_MONTHS - 1].key).toBe(monthKey(NOW));
        expect(out.signups.months.reduce((sum, m) => sum + m.count, 0)).toBe(4);
        expect(out.signups.undated).toBe(1);
    });

    it('says when the account read was cut short', () => {
        expect(summariseOwnerInsights(facts({ accountsTruncated: true })).tiles.accounts.truncated).toBe(true);
    });

    it('months are Singapore months', () => {
        expect(monthKey(Date.parse('2026-10-31T17:00:00Z'))).toBe('2026-11');
        expect(lastMonths(Date.parse('2026-01-15T00:00:00Z'), 3)).toEqual(['2025-11', '2025-12', '2026-01']);
    });
});

describe('what a team has made: counted, from a fixed list', () => {
    const out = summariseOwnerInsights(facts());
    const row = (name) => out.teamRows.find((t) => t.name === name);

    it('carries every listed count and nothing that is not on the list', () => {
        expect(row('Sport and Exercise Medicine').activity).toEqual({
            rosters: 1, rosterEdits: 4, swaps: 7, feedPosts: 12, reports: 1, projects: 1, attendance: 1,
        });
        expect(JSON.stringify(out)).not.toContain('99');
    });

    it('a team with no counts reads as zeros, not blanks', () => {
        expect(row('Audiology').activity).toEqual(Object.fromEntries(ACTIVITY_KEYS.map((k) => [k, 0])));
        expect(row('Respiratory Therapy').activity).toMatchObject({ rosters: 1, swaps: 2, feedPosts: 0 });
    });

    it('totals are the sum of the rows, and the columns are named', () => {
        expect(out.activity.totals).toMatchObject({ rosters: 2, swaps: 9, feedPosts: 12, rosterEdits: 4 });
        expect(out.activity.columns.map((c) => c.key)).toEqual(ACTIVITY_KEYS);
    });

    it('THE LIST HOLDS NO WELLBEING, PULSE, WORKLOAD, GRADE, MEMBER OR NOTIFICATION PATH', () => {
        for (const item of ACTIVITY) {
            expect(item.path, item.key).not.toMatch(/pulse|wellbeing|workload|loads|grades|members|notifications|settings|comments/i);
        }
        expect(ACTIVITY.map((a) => a.path)).toEqual(
            ['rosters', 'rosters/{year}/changes', 'swaps', 'feed', 'reports', 'projects', 'attendance'],
        );
    });
});

describe('screenings come from the rollup', () => {
    it('reports completed screenings and the day they were counted', () => {
        expect(summariseOwnerInsights(facts()).tiles.screenings)
            .toEqual({ value: 286, asOf: '2026-11-09T19:50:00.000Z', truncated: false });
    });
});

describe('the access log', () => {
    const out = summariseOwnerInsights(facts());

    it('says you or another approver, with a time, and never who', () => {
        expect(out.access.total).toBe(14);
        expect(out.access.visits).toEqual([
            { at: daysAgo(1), self: true },
            { at: daysAgo(2), self: false },
        ]);
    });

    it('returns no more than the limit', () => {
        const many = Array.from({ length: 40 }, (_, i) => ({ at: daysAgo(i), self: true }));
        expect(summariseOwnerInsights(facts({ visits: many })).access.visits).toHaveLength(VISIT_LIMIT);
    });
});
