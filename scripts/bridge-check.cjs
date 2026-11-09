'use strict';
/**
 * ==============================================================================
 * BRIDGE-CHECK — may the legacy email bridge be deleted yet? (read-only)
 * ==============================================================================
 *
 * Normally run from GitHub Actions: "NEXUS Admin" → task "bridge-check".
 *
 * `src/utils/legacyBridge.js` lets seven recognised addresses into the app shell
 * with no team behind them. It was a bridge for the August migration, and its
 * header says to delete it once every legacy member holds `teamIds`. Nobody had a
 * way to check that in production without a key file on a laptop. This is the way.
 *
 * ⚠️ IT WRITES NOTHING, and has no `--write` to pass. It lists sign-in accounts,
 *    reads each recognised account's `users/{uid}.teamIds`, and prints four counts.
 *
 * ⚠️ OUTPUT IS PUBLIC (the repository is): COUNTS ONLY. No address, no name, no
 *    uid, no digest — a digest printed beside "has no team" would let anybody who
 *    can guess an address work out whose it is.
 */

const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const { describeCredentialFile } = require('./credential.cjs');
const { readBridge, digestOf, summariseBridge } = require('./bridgeCheck.cjs');

const main = async () => {
    const credential = describeCredentialFile(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    if (!credential.ok) {
        console.error(`\n✗ ${credential.problem || credential.reason}\n`);
        process.exit(1);
    }

    const bridge = readBridge(readFileSync(resolve(__dirname, '../src/utils/legacyBridge.js'), 'utf8'));

    console.log('\n──────────────────────────────────────────────────────────────');
    console.log(`  PROJECT : ${credential.projectId}`);
    console.log('  MODE    : READ ONLY (this task cannot write)');
    console.log('──────────────────────────────────────────────────────────────\n');

    initializeApp({ credential: applicationDefault() });
    const auth = getAuth();
    const db = getFirestore();

    const wanted = new Set(bridge.digests);
    const accounts = [];
    let pageToken;
    do {
        const page = await auth.listUsers(1000, pageToken);
        for (const user of page.users) {
            if (!user.email || !bridge.salt || !wanted.has(digestOf(bridge.salt, user.email))) continue;
            const snap = await db.doc(`users/${user.uid}`).get();
            const data = snap.exists ? snap.data() : {};
            const teamIds = Array.isArray(data.teamIds) ? data.teamIds.filter((id) => typeof id === 'string' && id !== '') : [];
            let isLead = false;
            for (const teamId of teamIds) {
                const member = await db.doc(`teams/${teamId}/members/${user.uid}`).get();
                if (member.exists && member.data().role === 'lead') isLead = true;
            }
            accounts.push({ email: user.email, teamIds, isLead, docRole: data.role });
        }
        pageToken = page.pageToken;
    } while (pageToken);

    const summary = summariseBridge({
        salt: bridge.salt, digests: bridge.digests, adminDigests: bridge.adminDigests, accounts,
    });
    if (!summary.ok) {
        console.error('✗ Could not read the bridge table out of src/utils/legacyBridge.js.\n');
        process.exit(1);
    }

    console.log(`Addresses the bridge recognises        : ${summary.rows}`);
    console.log(`  with a sign-in account               : ${summary.recognised}`);
    console.log(`    of those, in at least one team     : ${summary.withTeam}`);
    console.log(`    of those, in NO team               : ${summary.withoutTeam}`);
    console.log(`  with no account at that address      : ${summary.noAccount}`);
    console.log(`Accounts the bridge makes an admin     : ${summary.admins}`);
    console.log(`  admin ONLY because of the bridge     : ${summary.adminsUncovered}`);
    console.log('');
    if (summary.safeToDelete) {
        console.log('✓ Nobody is relying on the bridge. It can be deleted.');
    } else {
        if (summary.withoutTeam > 0) {
            console.log(`✗ ${summary.withoutTeam} account(s) get into NEXUS only through the bridge. `
                + 'Deleting it sends them to the access gate until a lead adds them to a team.');
        }
        if (summary.adminsUncovered > 0) {
            console.log(`✗ ${summary.adminsUncovered} account(s) are an admin only through the bridge. `
                + 'Deleting it closes the admin panel to them until they are made a lead of their team.');
        }
    }
    console.log('');
};

main().catch((error) => {
    console.error('\n✗ bridge-check failed:', error && error.code ? error.code : (error && error.message) || error, '\n');
    process.exit(1);
});
