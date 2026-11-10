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
    `Counting sign-ups, lead requests and new teams from the last ${period} days. `
    + 'Everything else always shows everything.'
));

/** The page's four parts. One is shown at a time. */
export const TABS = Object.freeze([
    { key: 'overview', label: 'Overview' },
    { key: 'teams', label: 'Teams' },
    { key: 'community', label: 'Community' },
    { key: 'access', label: 'Access' },
]);

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const shortMonth = (key) => SHORT_MONTHS[Number(String(key).slice(5, 7)) - 1] || String(key);

/** `2026-11-10T03:50:00Z` → `10 Nov 2026`, Singapore time. Empty when unusable. */
export const shortDay = (iso) => {
    const ms = Date.parse(iso || '');
    if (!Number.isFinite(ms)) return '';
    const d = new Date(ms + 8 * 60 * 60 * 1000);
    return `${d.getUTCDate()} ${SHORT_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

/** `10 Nov 2026, 11:50`, Singapore time. */
export const shortDayTime = (iso) => {
    const ms = Date.parse(iso || '');
    if (!Number.isFinite(ms)) return '';
    const d = new Date(ms + 8 * 60 * 60 * 1000);
    return `${shortDay(iso)}, ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
};

/** The tiles: label, value, unit and one line of context that carries the base. */
export const tilesFor = (data) => {
    const t = data?.tiles;
    if (!t) return [];
    const windowed = data.period !== 'all';
    const tiles = [];
    if (t.accounts) {
        tiles.push({
            key: 'accounts',
            label: 'Sign-ups',
            value: `${t.accounts.value}${t.accounts.truncated ? '+' : ''}`,
            context: windowed
                ? `${t.accounts.newInPeriod} new in the last ${data.period} days`
                : `${t.accounts.verified} with a confirmed email, ${t.accounts.withoutTeam} not in a team`,
        });
        tiles.push({
            key: 'active',
            label: 'Active',
            value: String(t.accounts.active30),
            context: `of ${t.accounts.value} used NEXUS in the last 30 days`,
        });
    }
    tiles.push(
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
            label: 'In a team',
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
            // No rollup yet is a dash. It is not zero: nothing has been counted.
            value: t.screenings.value === null || t.screenings.value === undefined ? '–' : String(t.screenings.value),
            context: t.screenings.value === null || t.screenings.value === undefined
                ? 'No community rollup yet'
                : `completed on the public portal${t.screenings.asOf ? `, as of ${shortDay(t.screenings.asOf)}` : ''}`,
        },
    );
    return tiles;
};

/** The sign-up chart: one bar per month, heights relative to the tallest. */
export const signupBars = (signups) => {
    const months = signups?.months || [];
    const max = Math.max(0, ...months.map((m) => m.count));
    return months.map((m) => ({
        key: m.key,
        label: shortMonth(m.key),
        count: m.count,
        height: max === 0 ? 0 : Math.round((m.count / max) * 100),
    }));
};

/** The sign-up chart, as a sentence. Only months with somebody in them are named. */
export const signupLabel = (signups) => {
    const months = signups?.months || [];
    const total = months.reduce((sum, m) => sum + m.count, 0);
    if (total === 0) return `Sign-ups by month: none in the last ${months.length} months.`;
    const named = months.filter((m) => m.count > 0).map((m) => `${shortMonth(m.key)} ${m.key.slice(0, 4)} ${m.count}`);
    return `Sign-ups by month, last ${months.length} months, ${total} in all: ${named.join(', ')}.`;
};

/**
 * WHAT THE OWNER MAY AND MAY NOT OPEN, said on the page. These are the rules the
 * server enforces (`functions/ownerInsights.cjs`); they are written here once so
 * the page cannot drift into promising something else.
 */
export const ACCESS_RULES = Object.freeze({
    counted: [
        'How many accounts, teams and people there are, and when they arrived.',
        'How many rosters, roster edits, swaps, feed posts and reports each team has made.',
        'How many community screenings were completed, with small groups withheld.',
    ],
    neverOpened: [
        'A roster, a swap, a post or a report. They are counted by the database and never loaded.',
        'Pulse, wellbeing and workload. They are not counted and not read.',
        'Anybody\'s name, email address or account id.',
    ],
    byRequest: [
        'A team\'s lead asks, and adds you to their team from the Team panel. The team can see you are there, and the lead can remove you.',
        'A legal or safety duty requires it. That is done outside this page, in writing, with the team\'s lead told unless the law forbids it.',
    ],
});

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

/** Nothing to show at all: no accounts, no teams, no requests, no screenings. One empty state, no empty charts. */
export const isEmpty = (data) => !data?.tiles
    || (data.tiles.teams.value === 0 && data.pipeline.total === 0 && !data.tiles.screenings.value
        && (data.tiles.accounts?.value ?? 0) === 0);

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
