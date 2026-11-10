/** OWNER INSIGHTS — how the numbers are said, and the landing flag. */
import { describe, it, expect } from 'vitest';
import {
    tilesFor, periodNote, pipelineLabel, pipelineSegments, isEmpty, isOwnerLandingEnabled,
    OWNER_INSIGHTS_FLAG_KEY, OWNER_INSIGHTS_PATH, PERIOD_OPTIONS,
} from './ownerInsightsView.js';

const data = (over = {}) => ({
    period: 'all',
    year: '2026',
    tiles: {
        teams: { value: 4, newInPeriod: 4, withRoster: 3 },
        people: { value: 31, leads: 6, pendingMembers: 2, teams: 4 },
        requests: { pending: 1, approved: 3, decided: 4, approvalRate: 75 },
        screenings: { value: 412, total: 412 },
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
        expect(t.screenings).toMatchObject({ value: '412', context: 'completed on the public portal' });
    });

    it('a rate with nothing decided is a dash, never 0%', () => {
        const d = data();
        d.tiles.requests = { pending: 2, approved: 0, decided: 0, approvalRate: null };
        expect(byKey(d).requests).toMatchObject({ value: '–', unit: '', context: 'No lead requests decided yet' });
    });

    it('a period changes the context lines it should', () => {
        const d = data({ period: '30' });
        d.tiles.teams.newInPeriod = 1;
        d.tiles.screenings = { value: 37, total: 412 };
        const t = byKey(d);
        expect(t.teams.context).toBe('1 new in the last 30 days');
        expect(t.screenings).toMatchObject({ value: '37', context: 'of 412 all time' });
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
        expect(periodNote('90')).toMatch(/People, teams and the teams table always show everything\./);
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
        none.tiles.teams.value = 0; none.pipeline.total = 0; none.tiles.screenings.total = 0;
        expect(isEmpty(none)).toBe(true);
        none.tiles.screenings.total = 3;
        expect(isEmpty(none)).toBe(false);
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
