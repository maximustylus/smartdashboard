/**
 * OWNER INSIGHTS — the words and the flag, pure, so the page's honesty rules are
 * tested rather than eyeballed. The numbers come from the server
 * (`functions/ownerInsights.cjs`); this decides how they are SAID.
 *
 * The rules, from the Insights pattern this page follows:
 *   - every number shows its base ("3 of 4 decided");
 *   - a rate with nothing behind it is a dash, never 0%;
 *   - the page says what the period filter does and does not touch;
 *   - every chart has a sentence a screen reader can read instead.
 */

export const OWNER_INSIGHTS_PATH = '/admin/insights';

export const PERIOD_OPTIONS = Object.freeze([
    { key: 'all', label: 'All time' },
    { key: '90', label: '90 days' },
    { key: '30', label: '30 days' },
]);

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** What the period changes, said under the tiles. Empty for all time. */
export const periodNote = (period) => (period === 'all' ? '' : (
    `Counting lead requests, new teams and screenings from the last ${period} days. `
    + 'People, teams and the teams table always show everything.'
));

/** The four tiles: label, value, unit and one line of context that carries the base. */
export const tilesFor = (data) => {
    const t = data?.tiles;
    if (!t) return [];
    const windowed = data.period !== 'all';
    return [
        {
            key: 'teams',
            label: 'Teams',
            value: String(t.teams.value),
            context: windowed
                ? `${t.teams.newInPeriod} new in the last ${data.period} days`
                : `${t.teams.withRoster} of ${t.teams.value} with a ${data.year} roster`,
        },
        {
            key: 'people',
            label: 'People',
            value: String(t.people.value),
            context: `${plural(t.people.leads, 'lead', 'leads')} across ${plural(t.people.teams, 'team', 'teams')}`
                + (t.people.pendingMembers > 0 ? `, ${t.people.pendingMembers} not yet registered` : ''),
        },
        {
            key: 'requests',
            label: 'Approval rate',
            value: t.requests.approvalRate === null ? '–' : String(t.requests.approvalRate),
            unit: t.requests.approvalRate === null ? '' : '%',
            context: t.requests.decided === 0
                ? 'No lead requests decided yet'
                : `${t.requests.approved} of ${t.requests.decided} decided, ${t.requests.pending} waiting`,
        },
        {
            key: 'screenings',
            label: 'Screenings',
            value: String(t.screenings.value),
            context: windowed
                ? `of ${t.screenings.total} all time`
                : 'completed on the public portal',
        },
    ];
};

export const PIPELINE_GROUPS = Object.freeze([
    { key: 'pending', label: 'Waiting', tone: 'amber' },
    { key: 'approved', label: 'Approved', tone: 'emerald' },
    { key: 'declined', label: 'Declined', tone: 'slate' },
]);

/** The pipeline bar, as a sentence. */
export const pipelineLabel = (pipeline) => {
    if (!pipeline || pipeline.total === 0) return 'Lead requests: none.';
    return `Lead requests: ${PIPELINE_GROUPS.map((g) => `${pipeline[g.key]} ${g.label.toLowerCase()}`).join(', ')}.`;
};

/** Each segment's share of the bar, in percent. Zero-count groups get no segment. */
export const pipelineSegments = (pipeline) => {
    if (!pipeline || pipeline.total === 0) return [];
    return PIPELINE_GROUPS
        .filter((g) => pipeline[g.key] > 0)
        .map((g) => ({ ...g, count: pipeline[g.key], width: (pipeline[g.key] / pipeline.total) * 100 }));
};

/** Nothing to show at all: no teams and no requests. One empty state, no empty charts. */
export const isEmpty = (data) => !data?.tiles
    || (data.tiles.teams.value === 0 && data.pipeline.total === 0 && data.tiles.screenings.total === 0);

/**
 * THE LANDING FLAG. Off unless turned on, for one browser by `?insights=1`
 * (remembered) or for everyone by `VITE_OWNER_INSIGHTS=on` at build. `?insights=0`
 * turns it back off for that browser. Same shape as the AURA scribe flag.
 *
 * It governs ONE thing: whether a signed-in person with no team is offered the
 * Insights page instead of the holding screen. The page's own route is always
 * there, and the server decides who may read it either way.
 */
export const OWNER_INSIGHTS_FLAG_KEY = 'nexus.ownerInsights';

export function isOwnerLandingEnabled({ search = '', storage, env = {} } = {}) {
    let fromUrl = null;
    try { fromUrl = new URLSearchParams(search).get('insights'); } catch { /* malformed */ }
    if (fromUrl === '1' || fromUrl === '0') {
        try { storage?.setItem(OWNER_INSIGHTS_FLAG_KEY, fromUrl); } catch { /* blocked */ }
        return fromUrl === '1';
    }
    try {
        const stored = storage?.getItem(OWNER_INSIGHTS_FLAG_KEY);
        if (stored === '1') return true;
        if (stored === '0') return false;
    } catch { /* blocked */ }
    return env.VITE_OWNER_INSIGHTS === 'on';
}
