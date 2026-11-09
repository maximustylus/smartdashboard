'use strict';
/**
 * ==============================================================================
 * CHANGE-EMAIL — move one account to a new address (v2.19.0)
 * ==============================================================================
 *
 * Normally run from GitHub Actions: "NEXUS Admin" → task "change-email". From a
 * laptop instead:
 *
 *   npm i --no-save firebase-admin
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json node scripts/change-email.cjs \
 *     --from old@kkh.com.sg --to new@example.com          # preview
 *   …the same command with --write                       # apply
 *
 * Keeps the account (its uid), so teams, roles and history stay. Writes the new
 * address to Firebase Auth (unverified — the next sign-in sends a link to it), to
 * `users/{uid}`, to the person's membership in each of their teams, and — if they
 * approve new teams — to `config/superAdmins`, where the account's uid is added so
 * the approver right no longer depends on any address. The decision is
 * `planEmailChange` in `emailChange.cjs`, pure and unit-tested.
 *
 * ⚠️ OUTPUT IS PUBLIC (the repository is): addresses print masked, via `logMask.cjs`.
 */

const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { describeCredentialFile } = require('./credential.cjs');
const { planEmailChange } = require('./emailChange.cjs');
const { maskEmail } = require('./logMask.cjs');

const argv = process.argv.slice(2);
const WRITE = argv.includes('--write');
const valueFor = (flag) => {
    const i = argv.indexOf(flag);
    const value = i === -1 ? null : argv[i + 1];
    return typeof value === 'string' && !value.startsWith('--') ? value.trim() : null;
};

/** `getUserByEmail`, with "no such account" as null rather than a throw. */
const accountAt = async (auth, email) => {
    try {
        return await auth.getUserByEmail(email);
    } catch (error) {
        if (error && error.code === 'auth/user-not-found') return null;
        throw error;
    }
};

const main = async () => {
    const fromEmail = valueFor('--from');
    const toEmail = valueFor('--to');
    if (!fromEmail || !toEmail) {
        console.error('\n✗ Pass --from <current email> and --to <new email>.\n');
        process.exit(1);
    }

    const credential = describeCredentialFile(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    if (!credential.ok) {
        console.error(`\n✗ ${credential.problem || credential.reason}\n`);
        process.exit(1);
    }

    console.log('\n──────────────────────────────────────────────────────────────');
    console.log(`  PROJECT : ${credential.projectId}`);
    console.log(`  FROM    : ${maskEmail(fromEmail)}`);
    console.log(`  TO      : ${maskEmail(toEmail)}`);
    console.log(`  MODE    : ${WRITE ? 'WRITE' : 'DRY RUN (nothing is written)'}`);
    console.log('──────────────────────────────────────────────────────────────\n');

    initializeApp({ credential: applicationDefault() });
    const db = getFirestore();
    const auth = getAuth();

    let account;
    let taken;
    try {
        account = await accountAt(auth, fromEmail);
        taken = await accountAt(auth, toEmail);
    } catch (error) {
        const code = error && error.code ? error.code : 'unknown';
        console.error(`✗ Could not look the accounts up (${code}). If this says permission or insufficient, `
            + 'the deploy service account needs the "Firebase Authentication Admin" role in the Google '
            + 'Cloud console (IAM) before this task can run.\n');
        process.exit(1);
    }

    const userSnap = account ? await db.doc(`users/${account.uid}`).get() : null;
    const user = userSnap && userSnap.exists ? userSnap.data() : null;
    const teamIds = user && Array.isArray(user.teamIds) ? user.teamIds : [];
    const memberSnaps = await Promise.all(
        teamIds.map((teamId) => db.doc(`teams/${teamId}/members/${account.uid}`).get()),
    );
    const memberships = memberSnaps
        .map((snap, i) => (snap.exists ? { teamId: teamIds[i], email: snap.data().email } : null))
        .filter(Boolean);
    const superSnap = await db.doc('config/superAdmins').get();

    const plan = planEmailChange({
        fromEmail,
        toEmail,
        account: account ? { uid: account.uid } : null,
        toTaken: Boolean(taken),
        user,
        memberships,
        superAdmins: superSnap.exists ? superSnap.data() : null,
    });

    if (!plan.ok) {
        console.error(`✗ ${plan.message}\n`);
        process.exit(1);
    }

    console.log('Would change:');
    console.log('  · the sign-in address (the new one must be verified: the next sign-in sends a link)');
    if (plan.userDoc) console.log('  · the profile record');
    console.log(`  · the address on ${plan.members.length} team ${plan.members.length === 1 ? 'membership' : 'memberships'}`);
    console.log(plan.superAdmins
        ? '  · the approver list: new address in, old address out, and the account itself added, so approval no longer depends on an address'
        : '  · (not an approver — the approver list is left alone)');

    if (!WRITE) {
        console.log('\nDry run only — nothing was written. Run again with apply ticked (or --write).\n');
        return;
    }

    // Auth first: it is the step most likely to be refused (permissions), and a
    // refusal here leaves every copy of the address as it was.
    await auth.updateUser(plan.uid, plan.auth);

    const batch = db.batch();
    if (plan.userDoc) batch.set(db.doc(plan.userDoc.path.join('/')), plan.userDoc.data, { merge: true });
    for (const member of plan.members) batch.update(db.doc(member.path.join('/')), member.data);
    if (plan.superAdmins) batch.set(db.doc('config/superAdmins'), plan.superAdmins, { merge: true });
    await batch.commit();

    console.log('\n✓ Done. Sign in with the new address and the same password; NEXUS will send a '
        + 'verification link to it. Click the link, then sign in again.\n');
};

main().catch((error) => {
    console.error('\n✗ change-email failed:', error && error.code ? error.code : (error && error.message) || error, '\n');
    process.exit(1);
});
