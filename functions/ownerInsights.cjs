'use strict';
/**
 * ==============================================================================
 * OWNER INSIGHTS — the platform in counts, for the person who runs it (v2.21.0)
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
 *      3. THE CALLER IS A SUPER-ADMIN, checked by the handler before any read, and
 *         every successful call is logged.
 *
 * Pure: the handler gathers documents, this decides what may leave the server.
 * Every definition lives here so no two cards can disagree.
 */

const PERIODS = Object.freeze(['all', '90', '30']);
const REQUEST_STATUSES = Object.freeze(['pending', 'approved', 'declined']);
const DAY_MS = 24 * 60 * 60 * 1000;

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

/** A placeholder member (`scripts/add-pending-member.cjs`): rostered, cannot sign in. */
const isPending = (member) => typeof member.uid === 'string' && member.uid.startsWith('pending-');

/**
 * @param {object} facts
 * @param {Array<{id, name, institution, createdAt}>} facts.teams
 * @param {Array<{teamId, uid, role}>} facts.members   every membership document
 * @param {Array<{status, requestedAt}>} facts.leadRequests
 * @param {Array<string>} facts.teamsWithRoster        team ids with a roster for `year`
 * @param {{total:number, inPeriod:number}} facts.screenings
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
        return {
            // Department and institution: what a team IS. Not a person.
            name: text(team.name) || text(team.department) || 'Unnamed team',
            institution: text(team.institution),
            members: row.members,
            leads: row.leads,
            pendingMembers: row.pending,
            hasRoster: withRoster.has(team.id),
            createdOn: created === null ? null : new Date(created).toISOString().slice(0, 10),
        };
    }).sort((a, b) => b.members - a.members || a.name.localeCompare(b.name));

    const screenings = facts.screenings || {};

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
            screenings: {
                value: period === 'all' ? count(screenings.total) : count(screenings.inPeriod),
                total: count(screenings.total),
            },
        },
        pipeline: { ...pipeline, total: requests.length },
        teamRows,
    };
};

module.exports = {
    PERIODS, REQUEST_STATUSES, DAY_MS,
    normalisePeriod, toMillis, periodStart, inPeriod, summariseOwnerInsights,
};
