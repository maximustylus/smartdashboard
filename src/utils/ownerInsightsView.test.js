/** OWNER INSIGHTS — how the numbers are said, and the landing flag. */
import { describe, it, expect } from 'vitest';
import {
    tilesFor, periodNote, pipelineLabel, pipelineSegments, isEmpty, isOwnerLandingEnabled,
    OWNER_INSIGHTS_FLAG_KEY, OWNER_INSIGHTS_PATH, PERIOD_OPTIONS,
    TABS, ACCESS_RULES, signupBars, signupLabel, shortDay, shortDayTime,
} from './ownerInsightsView.js';

const data = (over = {}) => ({
    period: 'all',
    year: '2026',
    tiles: {
        teams: { value: 4, newInPeriod: 4, withRoster: 3 },
        people: { value: 31, leads: 6, pendingMembers: 2, teams: 4 },
        requests: { pending: 1, approved: 3, decided: 4, approvalRate: 75 },
        accounts: { value: 40, verified: 36, inTeams: 31, withoutTeam: 9, newInPeriod: 40, active30: 22, truncated: false },
        screenings: { value: 412, asOf: '2026-11-09T19:50:00.000Z', truncated: false },
    },
    pipeline: { pending: 1, approved: 3, declined: 1, total: 5 },
    teamRows: [],
    ...over,
});

const byKey = (d) => Object.fromEntries(tilesFor(d).map((t) => [t.key, t]));

describe('tiles — every number shows its base', () => {
    it('all time', () => {
        const t = byKey(data());
        expect(t.teams).toMatchObject({ value: '4', context: '3 of 4 with a 2026 roster' });
        expect(t.people).toMatchObject({ value: '31', context: '6 leads across 4 teams, 2 not yet registered' });
        expect(t.requests).toMatchObject({ value: '75', unit: '%', context: '3 of 4 decided, 1 waiting' });
        expect(t.screenings).toMatchObject({ value: '412', context: 'completed on the public portal, as of 10 Nov 2026' });
        expect(t.accounts).toMatchObject({ label: 'Sign-ups', value: '40', context: '36 with a confirmed email, 9 not in a team' });
        expect(t.active).toMatchObject({ value: '22', context: 'of 40 used NEXUS in the last 30 days' });
    });

    it('a rate with nothing decided is a dash, never 0%', () => {
        const d = data();
        d.tiles.requests = { pending: 2, approved: 0, decided: 0, approvalRate: null };
        expect(byKey(d).requests).toMatchObject({ value: '–', unit: '', context: 'No lead requests decided yet' });
    });

    it('a period changes the context lines it should', () => {
        const d = data({ period: '30' });
        d.tiles.teams.newInPeriod = 1;
        d.tiles.accounts.newInPeriod = 3;
        const t = byKey(d);
        expect(t.teams.context).toBe('1 new in the last 30 days');
        expect(t.accounts.context).toBe('3 new in the last 30 days');
        // Screenings are not windowed, so the tile says the same thing either way.
        expect(t.screenings).toEqual(byKey(data()).screenings);
    });

    it('no rollup is a dash, not a zero; a cut-short account read says so', () => {
        const d = data();
        d.tiles.screenings = { value: null, asOf: null, truncated: false };
        d.tiles.accounts.truncated = true;
        expect(byKey(d).screenings).toMatchObject({ value: '–', context: 'No community rollup yet' });
        expect(byKey(d).accounts.value).toBe('40+');
    });

    it('a payload from before accounts existed still renders its tiles', () => {
        const d = data();
        delete d.tiles.accounts;
        expect(tilesFor(d).map((t) => t.key)).toEqual(['teams', 'people', 'requests', 'screenings']);
    });

    it('singular reads as singular, and no placeholders means no clause', () => {
        const d = data();
        d.tiles.people = { value: 1, leads: 1, pendingMembers: 0, teams: 1 };
        expect(byKey(d).people.context).toBe('1 lead across 1 team');
    });

    it('no data, no tiles', () => {
        expect(tilesFor(null)).toEqual([]);
        expect(tilesFor({})).toEqual([]);
    });
});

describe('the period note says what the filter does and does not touch', () => {
    it('is empty for all time', () => expect(periodNote('all')).toBe(''));
    it('names both halves for a window', () => {
        expect(periodNote('90')).toMatch(/last 90 days/);
        expect(periodNote('90')).toMatch(/sign-ups, lead requests and new teams/);
        expect(periodNote('90')).toMatch(/Everything else always shows everything\./);
    });
});

describe('the pipeline', () => {
    it('reads as a sentence', () => {
        expect(pipelineLabel(data().pipeline)).toBe('Lead requests: 1 waiting, 3 approved, 1 declined.');
        expect(pipelineLabel({ total: 0 })).toBe('Lead requests: none.');
        expect(pipelineLabel(undefined)).toBe('Lead requests: none.');
    });

    it('segments sum to 100 and skip empty groups', () => {
        const segments = pipelineSegments({ pending: 1, approved: 3, declined: 0, total: 4 });
        expect(segments.map((s) => s.key)).toEqual(['pending', 'approved']);
        expect(segments.reduce((sum, s) => sum + s.width, 0)).toBeCloseTo(100);
        expect(pipelineSegments({ total: 0 })).toEqual([]);
    });
});

describe('isEmpty', () => {
    it('is true only when there is nothing at all', () => {
        expect(isEmpty(null)).toBe(true);
        expect(isEmpty(data())).toBe(false);
        const none = data();
        none.tiles.teams.value = 0; none.pipeline.total = 0; none.tiles.screenings.value = null;
        none.tiles.accounts.value = 0;
        expect(isEmpty(none)).toBe(true);
        none.tiles.screenings.value = 3;
        expect(isEmpty(none)).toBe(false);
        none.tiles.screenings.value = 0; none.tiles.accounts.value = 1;
        expect(isEmpty(none)).toBe(false);
    });
});

describe('the sign-up chart', () => {
    const signups = { months: [{ key: '2026-09', count: 0 }, { key: '2026-10', count: 4 }, { key: '2026-11', count: 2 }], undated: 0 };

    it('bars are relative to the tallest month', () => {
        expect(signupBars(signups)).toEqual([
            { key: '2026-09', label: 'Sep', count: 0, height: 0 },
            { key: '2026-10', label: 'Oct', count: 4, height: 100 },
            { key: '2026-11', label: 'Nov', count: 2, height: 50 },
        ]);
    });

    it('all zeros is flat, not a division by zero', () => {
        expect(signupBars({ months: [{ key: '2026-11', count: 0 }] })[0].height).toBe(0);
        expect(signupBars(undefined)).toEqual([]);
    });

    it('reads as a sentence that names only months with somebody in them', () => {
        expect(signupLabel(signups)).toBe('Sign-ups by month, last 3 months, 6 in all: Oct 2026 4, Nov 2026 2.');
        expect(signupLabel({ months: [{ key: '2026-11', count: 0 }] })).toBe('Sign-ups by month: none in the last 1 months.');
    });
});

describe('dates are said in Singapore time', () => {
    it('a late-evening UTC time is the next day', () => {
        expect(shortDay('2026-11-09T19:50:00.000Z')).toBe('10 Nov 2026');
        expect(shortDayTime('2026-11-09T19:50:00.000Z')).toBe('10 Nov 2026, 03:50');
        expect(shortDay('nonsense')).toBe('');
        expect(shortDayTime(undefined)).toBe('');
    });
});

describe('what the page says it can open', () => {
    it('has four parts', () => {
        expect(TABS.map((t) => t.key)).toEqual(['overview', 'teams', 'community', 'access']);
    });

    it('says team data is never opened, and names the only two ways in', () => {
        expect(ACCESS_RULES.neverOpened.join(' ')).toMatch(/never loaded/);
        expect(ACCESS_RULES.neverOpened.join(' ')).toMatch(/Pulse, wellbeing and workload/);
        expect(ACCESS_RULES.byRequest).toHaveLength(2);
        expect(ACCESS_RULES.byRequest[0]).toMatch(/lead asks/);
        expect(ACCESS_RULES.byRequest[1]).toMatch(/legal or safety duty/);
    });
});

describe('the landing flag', () => {
    const store = (initial = {}) => {
        const map = new Map(Object.entries(initial));
        return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, v), map };
    };

    it('is OFF by default', () => {
        expect(isOwnerLandingEnabled()).toBe(false);
        expect(isOwnerLandingEnabled({ storage: store(), env: {} })).toBe(false);
    });

    it('?insights=1 turns it on for this browser and remembers', () => {
        const storage = store();
        expect(isOwnerLandingEnabled({ search: '?insights=1', storage })).toBe(true);
        expect(storage.map.get(OWNER_INSIGHTS_FLAG_KEY)).toBe('1');
        expect(isOwnerLandingEnabled({ search: '', storage })).toBe(true);
    });

    it('?insights=0 turns it back off, even when the build says on', () => {
        const storage = store({ [OWNER_INSIGHTS_FLAG_KEY]: '1' });
        expect(isOwnerLandingEnabled({ search: '?insights=0', storage, env: { VITE_OWNER_INSIGHTS: 'on' } })).toBe(false);
        expect(isOwnerLandingEnabled({ storage, env: { VITE_OWNER_INSIGHTS: 'on' } })).toBe(false);
    });

    it('the build variable turns it on for everyone, and only the exact word does', () => {
        expect(isOwnerLandingEnabled({ env: { VITE_OWNER_INSIGHTS: 'on' } })).toBe(true);
        expect(isOwnerLandingEnabled({ env: { VITE_OWNER_INSIGHTS: 'true' } })).toBe(false);
        expect(isOwnerLandingEnabled({ env: { VITE_OWNER_INSIGHTS: '' } })).toBe(false);
    });

    it('blocked storage never throws', () => {
        const storage = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
        expect(isOwnerLandingEnabled({ search: '?insights=1', storage })).toBe(true);
        expect(isOwnerLandingEnabled({ storage })).toBe(false);
    });
});

it('constants', () => {
    expect(OWNER_INSIGHTS_PATH).toBe('/admin/insights');
    expect(PERIOD_OPTIONS.map((p) => p.key)).toEqual(['all', '90', '30']);
});
