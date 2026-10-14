'use strict';
/**
 * ==============================================================================
 * EMAIL CHANGE — the plan, pure (v2.19.0)
 * ==============================================================================
 *
 * Moves ONE existing account to a new address, keeping its uid — so its teams,
 * roles, roster history and approver right all stay — and writes the new address
 * everywhere NEXUS stores a copy of it. Built for the owner keeping their account
 * after leaving KKH; general enough for anybody whose address changes.
 *
 * `scripts/change-email.cjs` does the reading and writing; this decides. No
 * Firestore, no Auth, no clock, so every refusal is a unit test.
 *
 * ⚠️ THE APPROVER RIGHT IS PINNED TO THE ACCOUNT, NOT THE ADDRESS. `config/superAdmins`
 *    accepts `emails` only as a bootstrap path (see `teamApproval.js isSuperAdmin`):
 *    matched against the VERIFIED sign-in email. Change the email and that match
 *    silently stops. So when the old address is an approver, the plan adds the uid to
 *    `uids` — the durable list — and swaps the address in `emails`. Approval then
 *    survives the change, and the verification gap after it.
 */

const SHAPE = /^[^\s@]+@[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
const clean = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

/**
 * `{ fromEmail, toEmail, account, toTaken, user, memberships, superAdmins }`:
 *   account      `{ uid }` of the account at `fromEmail`, or null if none
 *   toTaken      whether another account already uses `toEmail`
 *   user         the `users/{uid}` data, or null
 *   memberships  `[{ teamId, email }]` — this person's membership in each team
 *   superAdmins  the `config/superAdmins` data, or null
 *
 * Returns `{ ok, message, uid, auth, userDoc, members, superAdmins }` — each write
 * the caller should make, or null where nothing changes.
 */
const planEmailChange = ({ fromEmail, toEmail, account, toTaken, user, memberships, superAdmins }) => {
    const no = (message) => ({ ok: false, message, uid: null, auth: null, userDoc: null, members: [], superAdmins: null });
    const from = clean(fromEmail);
    const to = clean(toEmail);

    if (!SHAPE.test(from) || !SHAPE.test(to)) return no('Both the current and the new address must be email addresses.');
    if (from === to) return no('The new address is the same as the current one. Nothing to change.');
    if (!account || typeof account.uid !== 'string') return no('There is no NEXUS account at the current address.');
    if (toTaken) {
        return no('Another NEXUS account already uses the new address. One address can belong to one '
            + 'account only; that account would have to be deleted or changed first.');
    }

    const uid = account.uid;
    const members = (Array.isArray(memberships) ? memberships : [])
        .filter((m) => m && typeof m.teamId === 'string')
        .map((m) => ({ teamId: m.teamId, change: clean(m.email) !== to }))
        .filter((m) => m.change)
        .map(({ teamId }) => ({ path: ['teams', teamId, 'members', uid], data: { email: to } }));

    let superAdminsWrite = null;
    if (superAdmins && typeof superAdmins === 'object') {
        const emails = Array.isArray(superAdmins.emails) ? superAdmins.emails : [];
        const uids = Array.isArray(superAdmins.uids) ? superAdmins.uids : [];
        const wasApprover = emails.some((e) => clean(e) === from) || uids.includes(uid);
        if (wasApprover) {
            const nextEmails = [...new Set(emails.map(clean).filter((e) => e && e !== from).concat(to))];
            const nextUids = uids.includes(uid) ? uids : [...uids, uid];
            superAdminsWrite = { emails: nextEmails, uids: nextUids };
        }
    }

    return {
        ok: true,
        message: null,
        uid,
        // `emailVerified: false`: the new address has to be PROVED, by the link the
        // sign-in screen sends to an unverified account. Setting it true here would be
        // the script asserting a fact nobody checked.
        auth: { email: to, emailVerified: false },
        userDoc: user ? { path: ['users', uid], data: { email: to } } : null,
        members,
        superAdmins: superAdminsWrite,
    };
};

module.exports = { planEmailChange };
