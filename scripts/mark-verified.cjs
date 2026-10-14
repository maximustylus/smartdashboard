'use strict';
/**
 * ==============================================================================
 * MARK-VERIFIED — confirm an account's email address on the owner's word (v2.19.1)
 * ==============================================================================
 *
 * Normally run from GitHub Actions: "NEXUS Admin" → task "mark-verified".
 *
 * ⚠️ WHY THIS EXISTS. NEXUS keeps an unconfirmed address away from team data, and
 *    the address is confirmed by a link Firebase emails to it. Some mail providers
 *    never deliver that email — on 2026-10-14 the owner moved their own account to
 *    a personal iCloud address and no link arrived, in the inbox or in junk, so the
 *    account was locked out of its own team. This lets the NEXUS owner vouch for an
 *    address instead.
 *
 *    That is a real power: it skips the proof that somebody can read the mailbox.
 *    So it is a task only somebody who can run this repository's workflows can
 *    start, it previews unless "apply" is ticked, and it changes NOTHING but the one
 *    flag — not the address, not the password, not any team.
 *
 * ⚠️ OUTPUT IS PUBLIC (the repository is): the address prints masked.
 */

const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { describeCredentialFile } = require('./credential.cjs');
const { maskEmail } = require('./logMask.cjs');

const argv = process.argv.slice(2);
const WRITE = argv.includes('--write');
const valueFor = (flag) => {
    const i = argv.indexOf(flag);
    const value = i === -1 ? null : argv[i + 1];
    return typeof value === 'string' && !value.startsWith('--') ? value.trim() : null;
};

const main = async () => {
    const email = valueFor('--email');
    if (!email) {
        console.error('\n✗ Pass --email <address to mark as confirmed>.\n');
        process.exit(1);
    }

    const credential = describeCredentialFile(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    if (!credential.ok) {
        console.error(`\n✗ ${credential.problem || credential.reason}\n`);
        process.exit(1);
    }

    console.log('\n──────────────────────────────────────────────────────────────');
    console.log(`  PROJECT : ${credential.projectId}`);
    console.log(`  ACCOUNT : ${maskEmail(email)}`);
    console.log(`  MODE    : ${WRITE ? 'WRITE' : 'DRY RUN (nothing is written)'}`);
    console.log('──────────────────────────────────────────────────────────────\n');

    initializeApp({ credential: applicationDefault() });
    const auth = getAuth();

    let account;
    try {
        account = await auth.getUserByEmail(email);
    } catch (error) {
        if (error && error.code === 'auth/user-not-found') {
            console.error('✗ There is no NEXUS account at that address.\n');
            process.exit(1);
        }
        throw error;
    }

    if (account.emailVerified) {
        console.log('Already confirmed. Nothing to change.\n');
        return;
    }

    console.log('Would change: mark this address as confirmed. Nothing else about the account changes.');
    if (!WRITE) {
        console.log('\nDry run only — nothing was written. Run again with apply ticked (or --write).\n');
        return;
    }

    await auth.updateUser(account.uid, { emailVerified: true });
    console.log('\n✓ Done. Sign out of NEXUS if the "Confirm your email" screen is showing, then sign in again.\n');
};

main().catch((error) => {
    console.error('\n✗ mark-verified failed:', error && error.code ? error.code : (error && error.message) || error, '\n');
    process.exit(1);
});
