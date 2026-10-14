'use strict';
/**
 * ==============================================================================
 * TRANSFER-TEAM — hand a team to a new lead (v2.18.0)
 * ==============================================================================
 *
 * Normally run from the GitHub Actions tab: "NEXUS Admin" → task "transfer-team".
 * From a laptop instead:
 *
 *   npm i --no-save firebase-admin
 *
 *   # DRY RUN — the default. Names the project, prints the plan, writes nothing.
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json node scripts/transfer-team.cjs \
 *     --team kkh-sport-exercise-medicine --to new.lead@kkh.com.sg --previous-lead-becomes viewer
 *
 *   # FOR REAL — the same command with --write.
 *
 * ⚠️ WHY THIS EXISTS. `teams/{id}.leadUid` is the lead a team was created for, and
 *    the app will not demote or remove that person: it is the one guard a lead count
 *    cannot satisfy by accident. That also made it permanent. When the founding lead
 *    resigned there was no way to hand the team on — `firestore.rules` forbids a
 *    client writing `leadUid`, and nothing else did. Only the NEXUS owner should, so
 *    this runs on the Admin SDK, and only from somewhere that holds its key.
 *
 * WHAT IT DOES, IN ONE TRANSACTION:
 *   · `teams/{id}.leadUid` becomes the new lead's uid, with `leadTransferredFrom` and
 *     `leadTransferredAt` beside it;
 *   · the new lead's membership becomes `role: 'lead'` if it was not already;
 *   · the outgoing lead's membership becomes what `--previous-lead-becomes` says
 *     (`lead`, `staff` or `viewer`; a viewer is never rostered);
 *   · each role change is recorded in `teams/{id}/roleChanges`, as the Team panel's
 *     own changes are, so the team's leads can see what happened and who did it.
 *
 * The judgment is `assertTeamTransfer` in `functions/teamMembership.js`, pure and
 * unit-tested. This file only reads, prints and writes.
 */

const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { describeCredentialFile } = require('./credential.cjs');
const { assertTeamTransfer } = require('../functions/teamMembership.js');

const argv = process.argv.slice(2);
const WRITE = argv.includes('--write');
const valueFor = (flag) => {
    const i = argv.indexOf(flag);
    const value = i === -1 ? null : argv[i + 1];
    return typeof value === 'string' && !value.startsWith('--') ? value.trim() : null;
};

/** Who the log says made the change. Not a person's uid: no person's session did. */
const OWNER_ACTOR = { byUid: 'nexus-admin-workflow', byName: 'NEXUS owner (admin workflow)' };

const main = async () => {
    const teamId = valueFor('--team');
    const toEmail = valueFor('--to');
    const previousLeadBecomes = (valueFor('--previous-lead-becomes') || 'lead').toLowerCase();

    if (!teamId || !toEmail) {
        console.error('\n✗ Pass --team <team id> and --to <new lead email>.\n');
        process.exit(1);
    }

    const credential = describeCredentialFile(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    if (!credential.ok) {
        console.error(`\n✗ ${credential.problem || credential.reason}\n`);
        process.exit(1);
    }

    console.log('\n──────────────────────────────────────────────────────────────');
    console.log(`  PROJECT : ${credential.projectId}`);
    console.log(`  TEAM    : ${teamId}`);
    console.log(`  NEW LEAD: ${toEmail}`);
    console.log(`  OUTGOING LEAD BECOMES: ${previousLeadBecomes}`);
    console.log(`  MODE    : ${WRITE ? 'WRITE' : 'DRY RUN (nothing is written)'}`);
    console.log('──────────────────────────────────────────────────────────────\n');

    initializeApp({ credential: applicationDefault() });
    const db = getFirestore();
    const teamRef = db.doc(`teams/${teamId}`);
    const membersRef = db.collection(`teams/${teamId}/members`);

    const outcome = await db.runTransaction(async (tx) => {
        const [teamSnap, membersSnap] = await Promise.all([tx.get(teamRef), tx.get(membersRef)]);
        const team = teamSnap.exists ? teamSnap.data() : null;
        const members = membersSnap.docs.map((d) => ({ uid: d.id, ...d.data() }));

        const plan = assertTeamTransfer({ team, members, toEmail, previousLeadBecomes });
        if (!plan.ok || plan.noChange) return plan;

        const outgoing = members.find((m) => m.uid === plan.fromUid);
        console.log(`Team "${team.name || teamId}"`);
        console.log(`  founding lead: ${outgoing ? (outgoing.displayName || outgoing.email) : plan.fromUid || '(none)'}`
            + `  →  ${plan.toName}`);
        for (const change of plan.roleChanges) {
            console.log(`  ${change.name}: ${change.fromRole} → ${change.toRole}`
                + `${change.toRostered ? '' : ' (not rostered)'}`);
        }

        if (!WRITE) return plan;

        tx.update(teamRef, {
            leadUid: plan.toUid,
            leadTransferredFrom: plan.fromUid,
            leadTransferredAt: FieldValue.serverTimestamp(),
        });
        for (const change of plan.roleChanges) {
            tx.update(membersRef.doc(change.uid), { role: change.toRole, rostered: change.toRostered });
            tx.set(db.collection(`teams/${teamId}/roleChanges`).doc(), {
                targetUid: change.uid,
                targetName: change.name,
                fromRole: change.fromRole,
                toRole: change.toRole,
                fromRostered: change.fromRostered,
                toRostered: change.toRostered,
                ...OWNER_ACTOR,
                at: FieldValue.serverTimestamp(),
            });
        }
        return plan;
    });

    if (!outcome.ok) {
        console.error(`✗ ${outcome.message}\n`);
        process.exit(1);
    }
    if (outcome.noChange) {
        console.log(`${outcome.message}\n`);
        return;
    }
    console.log(`\n${WRITE ? '✓ Done. The team is handed over.' : 'Dry run only — nothing was written. Run again with apply ticked (or --write).'}\n`);
};

main().catch((error) => {
    console.error('\n✗ transfer failed:', error && error.message ? error.message : error, '\n');
    process.exit(1);
});
