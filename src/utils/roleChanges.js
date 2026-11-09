/**
 * ==============================================================================
 * ROLE CHANGES — what the Team panel may offer, and how the log reads (v2.18.0)
 * ==============================================================================
 *
 * The server decides (`setMemberRole`, `functions/teamMembership.js`
 * `assertRoleChangeable`). This file is the same rule stated a second time, on
 * purpose, so the panel can say WHY a choice is unavailable before anybody presses
 * Save — a disabled radio with no reason reads as a broken screen. The two are held
 * together by `roleChanges.test.js`, which runs both against the same cases.
 *
 * Pure: no React, no Firestore.
 * ==============================================================================
 */

export const MEMBER_ROLE_VALUES = Object.freeze(['staff', 'lead', 'viewer']);

const ROLE_WORDS = Object.freeze({ staff: 'staff', lead: 'lead', viewer: 'viewer' });

/** A membership's role, reading a missing or unknown one as staff — as the server does. */
export const roleOf = (member) =>
    (member && MEMBER_ROLE_VALUES.includes(member.role) ? member.role : 'staff');

/**
 * Why `member` may not be moved to `nextRole`, or `null` if they may.
 *
 * Only DEMOTING A LEAD can be refused here; promotions and viewer/staff moves are
 * always allowed. `leadCount` is the team's current number of leads.
 */
export const roleChangeBlockedReason = ({ member, team, leadCount, nextRole, isSelf = false }) => {
    if (!member || roleOf(member) !== 'lead' || nextRole === 'lead') return null;
    if (team && team.leadUid === member.uid) {
        return 'This is the lead the team was created for. The NEXUS owner transfers a team.';
    }
    const leads = Number.isFinite(Number(leadCount)) ? Number(leadCount) : 1;
    if (leads <= 1) {
        return isSelf
            ? 'You are the only lead. Make somebody else a lead first, then step down.'
            : 'The only lead. Make somebody else a lead first.';
    }
    return null;
};

/**
 * The role-change log snapshot as plain records, newest first as queried. `at` is a
 * Firestore Timestamp on the wire and becomes a `Date`, or `null` before the server
 * has stamped it.
 */
export const readRoleChanges = (snapshot) => {
    const docs = Array.isArray(snapshot?.docs) ? snapshot.docs : [];
    return docs.flatMap((entry) => {
        if (!entry || typeof entry.data !== 'function') return [];
        const data = entry.data();
        if (!data || typeof data !== 'object') return [];
        const at = data.at && typeof data.at.toDate === 'function'
            ? data.at.toDate()
            : (data.at instanceof Date ? data.at : null);
        return [{ ...data, docId: typeof entry.id === 'string' ? entry.id : null, at }];
    });
};

const nonEmpty = (value) => (typeof value === 'string' && value.trim() !== '' ? value.trim() : null);

/**
 * One sentence per record, or `null` for a record that cannot be read — never a
 * sentence with "undefined" in it.
 */
export const describeRoleChange = (change) => {
    if (!change || typeof change !== 'object') return null;
    const who = nonEmpty(change.targetName) || 'A member';
    const from = ROLE_WORDS[change.fromRole];
    const to = ROLE_WORDS[change.toRole];
    if (!from || !to) return null;
    const by = nonEmpty(change.byName);

    let what;
    if (from !== to) {
        what = `${who} changed from ${from} to ${to}`;
        if (change.fromRostered !== change.toRostered && to !== 'viewer') {
            what += change.toRostered ? ', now in the roster' : ', no longer in the roster';
        }
    } else if (change.fromRostered !== change.toRostered) {
        what = change.toRostered ? `${who} is now in the roster` : `${who} is no longer in the roster`;
    } else {
        return null;
    }
    return `${what}${by ? ` (changed by ${by})` : ''}.`;
};
