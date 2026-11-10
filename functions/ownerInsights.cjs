'use strict';
/**
 * ==============================================================================
 * OWNER INSIGHTS — the platform in counts, for the person who runs it (v2.22.0)
 * ==============================================================================
 *
 * The NEXUS owner belongs to no team's data and should not have to join one to see
 * whether the platform is working. This is what they see instead: how many teams,
 * how many people, where the lead requests stand, how many screenings.
 *
 * ⚠️ IT CROSSES TEAMS, WHICH NOTHING ELSE IN NEXUS DOES. `SECURITY.md` names the
 *    property this sits beside — a member of one team reads nothing of another's —
 *    as the highest-severity report the project can receive. So three rules, and
 *    they are enforced HERE rather than trusted to a page:
 *
 *      1. COUNTS ONLY. Nothing this module returns names or identifies a person:
 *         no display name, no email, no uid. A team is named by its department
 *         and institution, which are not people. The test suite feeds it members
 *         with names and addresses and asserts none survive into the output.
 *      2. NO WELLBEING. Pulse, wellbeing logs and workload are not read at all.
 *         An owner does not need them and they are the most sensitive data here.
 *         What a team has MADE (rosters, swaps, posts, reports) is counted by the
 *         database and never opened: `ACTIVITY` below is the whole list of what
 *         may be counted, and the handler may only `.count()` those paths.
 *      3. THE CALLER IS A SUPER-ADMIN, checked by the handler before any read, and
 *         every successful call is logged.
 *
 * Pure: the handler gathers documents, this decides what may leave the server.
 * Every definition lives here so no two cards can disagree.
 */

const PERIODS = Object.freeze(['all', '90', '30']);
const REQUEST_STATUSES = Object.freeze(['pending', 'approved', 'declined']);
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * WHAT A TEAM HAS MADE — the only team subcollections the handler may touch, and
 * it may only COUNT them (`.count()`, an aggregation: no document is loaded).
 * `{year}` is the current year. Wellbeing, pulse, loads, workload, grades and
 * notifications are absent ON PURPOSE and a test pins that they stay absent.
 */
const ACTIVITY = Object.freeze([
    { key: 'rosters', path: 'rosters', label: 'Rosters' },
    { key: 'rosterEdits', path: 'rosters/{year}/changes', label: 'Roster edits' },
    { key: 'swaps', path: 'swaps', label: 'Swaps' },
    { key: 'feedPosts', path: 'feed', label: 'Feed posts' },
    { key: 'reports', path: 'reports', label: 'Reports' },
    { key: 'projects', path: 'projects', label: 'Project years' },
    { key: 'attendance', path: 'attendance', label: 'Attendance years' },
]);
const ACTIVITY_KEYS = Object.freeze(ACTIVITY.map((a) => a.key));

/** How many months the sign-up series shows, ending with the current one. */
const SIGNUP_MONTHS = 12;
/** How many recent visits the access log returns. */
const VISIT_LIMIT = 10;

const normalisePeriod = (value) => (PERIODS.includes(String(value)) ? String(value) : 'all');

/** Firestore Timestamp, Date, ISO string or epoch millis → millis, else null. */
const toMillis = (value) => {
    if (value == null) return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value.toMillis === 'function') {
        const ms = value.toMillis();
        return Number.isFinite(ms) ? ms : null;
    }
    if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
    if (typeof value === 'string') {
        const ms = Date.parse(value);
        return Number.isFinite(ms) ? ms : null;
    }
    return null;
};

/** Start of the period in millis, or null for all time. */
const periodStart = (period, nowMs) => (period === 'all' ? null : nowMs - Number(period) * DAY_MS);

/**
 * In the period? An undated item is counted under "all time" ONLY: it cannot be
 * shown to have happened inside a window, so it is not claimed for one.
 */
const inPeriod = (ms, start) => (start === null ? true : ms !== null && ms >= start);

const text = (value) => (typeof value === 'string' ? value.trim() : '');
const count = (value) => (Number.isFinite(Number(value)) && Number(value) >= 0 ? Math.floor(Number(value)) : 0);

/** `YYYY-MM` in Singapore time, which is where every team so far works. */
const monthKey = (ms) => new Date(ms + 8 * 60 * 60 * 1000).toISOString().slice(0, 7);

/** The last `n` month keys ending at `nowMs`, oldest first. */
const lastMonths = (nowMs, n) => {
    const d = new Date(nowMs + 8 * 60 * 60 * 1000);
    const out = [];
    for (let i = n - 1; i >= 0; i -= 1) {
        out.push(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1)).toISOString().slice(0, 7));
    }
    return out;
};

const emptyActivity = () => Object.fromEntries(ACTIVITY_KEYS.map((k) => [k, 0]));

/** A placeholder member (`scripts/add-pending-member.cjs`): rostered, cannot sign in. */
const isPending = (member) => typeof member.uid === 'string' && member.uid.startsWith('pending-');

/**
 * @param {object} facts
 * @param {Array<{id, name, institution, createdAt}>} facts.teams
 * @param {Array<{teamId, uid, role}>} facts.members   every membership document
 * @param {Array<{status, requestedAt}>} facts.leadRequests
 * @param {Array<string>} facts.teamsWithRoster        team ids with a roster for `year`
 * @param {Array<{createdAt, activeAt, verified, uid}>} [facts.accounts]  one per sign-in account
 * @param {boolean} [facts.accountsTruncated]          the account read hit its cap
 * @param {Object<string, Object<string, number>>} [facts.activity]  team id → counts by `ACTIVITY` key
 * @param {{respondents:number, generatedAt:string, truncated:boolean}|null} [facts.community]
 *        from the nightly rollup, which counts completed screenings only
 * @param {Array<{at, self:boolean}>} [facts.visits]   recent reads of this page, newest first
 * @param {number} [facts.visitsTotal]
 * @param {string} facts.period  'all' | '90' | '30'
 * @param {number} facts.nowMs
 * @param {number|string} facts.year
 */
const summariseOwnerInsights = (facts = {}) => {
    const period = normalisePeriod(facts.period);
    const nowMs = Number.isFinite(facts.nowMs) ? facts.nowMs : 0;
    const start = periodStart(period, nowMs);

    const teams = Array.isArray(facts.teams) ? facts.teams.filter((t) => t && text(t.id) !== '') : [];
    const teamIds = new Set(teams.map((t) => t.id));
    // A membership whose team document is gone is not a member of anything.
    const members = (Array.isArray(facts.members) ? facts.members : [])
        .filter((m) => m && teamIds.has(m.teamId) && text(m.uid) !== '');
    const withRoster = new Set(Array.isArray(facts.teamsWithRoster) ? facts.teamsWithRoster : []);

    const perTeam = new Map(teams.map((t) => [t.id, { members: 0, leads: 0, pending: 0 }]));
    const people = new Set();
    for (const member of members) {
        const row = perTeam.get(member.teamId);
        if (isPending(member)) { row.pending += 1; continue; }
        row.members += 1;
        if (member.role === 'lead') row.leads += 1;
        people.add(member.uid); // a set, so somebody in two teams is one person
    }

    const requests = (Array.isArray(facts.leadRequests) ? facts.leadRequests : [])
        .filter((r) => r && REQUEST_STATUSES.includes(r.status))
        .filter((r) => inPeriod(toMillis(r.requestedAt), start));
    const pipeline = { pending: 0, approved: 0, declined: 0 };
    for (const request of requests) pipeline[request.status] += 1;
    const decided = pipeline.approved + pipeline.declined;

    const teamRows = teams.map((team) => {
        const row = perTeam.get(team.id);
        const created = toMillis(team.createdAt);
        const made = (facts.activity && facts.activity[team.id]) || {};
        const activity = emptyActivity();
        for (const key of ACTIVITY_KEYS) activity[key] = count(made[key]);
        return {
            // Department and institution: what a team IS. Not a person.
            name: text(team.name) || text(team.department) || 'Unnamed team',
            institution: text(team.institution),
            members: row.members,
            leads: row.leads,
            pendingMembers: row.pending,
            hasRoster: withRoster.has(team.id),
            // Counts of what the team has made. Never the things themselves.
            activity,
            createdOn: created === null ? null : new Date(created).toISOString().slice(0, 10),
        };
    }).sort((a, b) => b.members - a.members || a.name.localeCompare(b.name));

    // ── Accounts: everybody who has signed up, in a team or not ────────────────
    const accounts = (Array.isArray(facts.accounts) ? facts.accounts : []).filter(Boolean);
    const months = lastMonths(nowMs, SIGNUP_MONTHS);
    const byMonth = new Map(months.map((m) => [m, 0]));
    const activeFrom = nowMs - 30 * DAY_MS;
    let verified = 0, newInPeriod = 0, active30 = 0, undated = 0, inTeams = 0;
    for (const account of accounts) {
        const createdMs = toMillis(account.createdAt);
        const activeMs = toMillis(account.activeAt);
        if (account.verified === true) verified += 1;
        if (createdMs === null) undated += 1;
        else if (byMonth.has(monthKey(createdMs))) byMonth.set(monthKey(createdMs), byMonth.get(monthKey(createdMs)) + 1);
        if (inPeriod(createdMs, start)) newInPeriod += 1;
        if (activeMs !== null && activeMs >= activeFrom) active30 += 1;
        // The uid is used HERE to ask "is this account in a team" and goes no further.
        if (people.has(account.uid)) inTeams += 1;
    }

    const activityTotals = emptyActivity();
    for (const row of teamRows) for (const key of ACTIVITY_KEYS) activityTotals[key] += row.activity[key];

    // ── Community: completed screenings, from the nightly rollup ───────────────
    // The rollup separates a completed screening from a tap or a download, which a
    // raw count of the collection cannot (v2.21.0 counted both and overstated it).
    const community = facts.community && Number.isFinite(Number(facts.community.respondents))
        ? {
            respondents: count(facts.community.respondents),
            asOf: text(facts.community.generatedAt) || null,
            truncated: facts.community.truncated === true,
        }
        : null;

    const visits = (Array.isArray(facts.visits) ? facts.visits : [])
        .map((v) => ({ at: toMillis(v && v.at), self: !!(v && v.self) }))
        .filter((v) => v.at !== null)
        .slice(0, VISIT_LIMIT)
        // "You" or "another approver". Never who.
        .map((v) => ({ at: new Date(v.at).toISOString(), self: v.self }));

    return {
        period,
        year: String(facts.year ?? ''),
        generatedAt: nowMs ? new Date(nowMs).toISOString() : null,
        tiles: {
            teams: {
                value: teams.length,
                newInPeriod: teams.filter((t) => inPeriod(toMillis(t.createdAt), start)).length,
                withRoster: teamRows.filter((t) => t.hasRoster).length,
            },
            people: {
                value: people.size,
                leads: teamRows.reduce((sum, t) => sum + t.leads, 0),
                pendingMembers: teamRows.reduce((sum, t) => sum + t.pendingMembers, 0),
                teams: teams.length,
            },
            requests: {
                pending: pipeline.pending,
                // Approval rate counts only requests somebody has DECIDED. A pending
                // request has not had the chance to be approved.
                approved: pipeline.approved,
                decided,
                approvalRate: decided > 0 ? Math.round((pipeline.approved / decided) * 100) : null,
            },
            accounts: {
                value: accounts.length,
                verified,
                inTeams,
                withoutTeam: accounts.length - inTeams,
                newInPeriod,
                active30,
                truncated: facts.accountsTruncated === true,
            },
            // `value` is null when there is no rollup yet: a dash, never a zero.
            screenings: {
                value: community ? community.respondents : null,
                asOf: community ? community.asOf : null,
                truncated: community ? community.truncated : false,
            },
        },
        pipeline: { ...pipeline, total: requests.length },
        signups: {
            months: months.map((key) => ({ key, count: byMonth.get(key) })),
            undated,
        },
        activity: { columns: ACTIVITY.map(({ key, label }) => ({ key, label })), totals: activityTotals },
        teamRows,
        access: { visits, total: count(facts.visitsTotal) },
    };
};

module.exports = {
    PERIODS, REQUEST_STATUSES, DAY_MS, ACTIVITY, ACTIVITY_KEYS, SIGNUP_MONTHS, VISIT_LIMIT,
    monthKey, lastMonths,
    normalisePeriod, toMillis, periodStart, inPeriod, summariseOwnerInsights,
};
