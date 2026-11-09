'use strict';
/**
 * BRIDGE-CHECK, the judgment — pure, so the answer is tested rather than trusted.
 *
 * `src/utils/legacyBridge.js` waves seven recognised addresses past the access
 * gate whether or not they belong to a team. Its own header names the trigger for
 * deleting it: every legacy member's `users/{uid}` carries `teamIds`. This decides
 * whether that is true, from facts the script gathers, and returns COUNTS ONLY —
 * the caller prints to a public log.
 */
const { createHash } = require('node:crypto');

/** The digest rows and salt, read out of the bridge's own source — one copy. */
const readBridge = (source) => {
    const salt = (/const BRIDGE_SALT = '([^']+)';/.exec(source) || [])[1] || null;
    const digests = [...source.matchAll(/\['([0-9a-f]{64})',/g)].map((m) => m[1]);
    return { salt, digests };
};

const digestOf = (salt, email) => createHash('sha256')
    .update(salt + String(email).trim().toLowerCase()).digest('hex');

/**
 * `accounts` is `[{ email, teamIds }]` — every sign-in account, with the teamIds
 * from its users document (missing document = no teams).
 *
 * `safeToDelete` is true only when no recognised account is without a team: those
 * are exactly the people the bridge is still carrying, who would meet the access
 * gate the day it goes. An unreadable bridge is never safe.
 */
const summariseBridge = ({ salt, digests, accounts }) => {
    const rows = Array.isArray(digests) ? digests : [];
    if (!salt || rows.length === 0) {
        return { ok: false, rows: 0, recognised: 0, withTeam: 0, withoutTeam: 0, noAccount: 0, safeToDelete: false };
    }
    const wanted = new Set(rows);
    const seen = new Set();
    let withTeam = 0;
    let withoutTeam = 0;
    for (const account of Array.isArray(accounts) ? accounts : []) {
        if (!account || typeof account.email !== 'string' || account.email === '') continue;
        const digest = digestOf(salt, account.email);
        if (!wanted.has(digest)) continue;
        seen.add(digest);
        const teams = Array.isArray(account.teamIds)
            ? account.teamIds.filter((id) => typeof id === 'string' && id !== '') : [];
        if (teams.length > 0) withTeam += 1; else withoutTeam += 1;
    }
    return {
        ok: true,
        rows: rows.length,
        recognised: withTeam + withoutTeam,
        withTeam,
        withoutTeam,
        noAccount: rows.length - seen.size,
        safeToDelete: withoutTeam === 0,
    };
};

module.exports = { readBridge, digestOf, summariseBridge };
