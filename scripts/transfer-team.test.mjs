/**
 * TRANSFER-TEAM and the NEXUS Admin workflow — what must stay true of the two files
 * that change a team's founding lead in production (v2.18.0). The judgment itself is
 * `assertTeamTransfer`, tested in `functions/teamMembership.test.js`; this pins the
 * wiring around it, the way `add-pending-member.test.mjs` pins its script.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const script = readFileSync(resolve(process.cwd(), 'scripts/transfer-team.cjs'), 'utf8');
const workflow = readFileSync(resolve(process.cwd(), '.github/workflows/nexus-admin.yml'), 'utf8');

describe('transfer-team.cjs', () => {
    it('is a dry run unless --write is passed', () => {
        expect(script).toMatch(/const WRITE = argv\.includes\('--write'\);/);
        expect(script).toMatch(/if \(!WRITE\) return plan;/);
    });

    it('decides with the tested pure function, not its own copy', () => {
        expect(script).toMatch(/require\('\.\.\/functions\/teamMembership\.js'\)/);
        expect(script).toMatch(/assertTeamTransfer\(/);
    });

    it('reads and writes in ONE transaction', () => {
        expect(script).toMatch(/db\.runTransaction\(/);
        expect(script).toMatch(/tx\.update\(teamRef/);
    });

    it('records every role change in the team\'s roleChanges log, on a server clock', () => {
        expect(script).toMatch(/collection\(`teams\/\$\{teamId\}\/roleChanges`\)/);
        expect(script).toMatch(/at: FieldValue\.serverTimestamp\(\)/);
    });

    it('names the project before doing anything', () => {
        expect(script).toMatch(/PROJECT : \$\{credential\.projectId\}/);
    });
});

describe('nothing personal reaches the public log', () => {
    /**
     * Every `console.*(...)` call, start to its closing `);` — what reaches the log.
     * The Firestore role-change record keeps the full name on purpose (it is read
     * by the team's leads, behind the rules), so only console output is checked.
     */
    const consoleCalls = () => {
        const calls = [];
        let at = script.indexOf('console.');
        while (at !== -1) {
            const end = script.indexOf(');', at);
            calls.push(script.slice(at, end + 2));
            at = script.indexOf('console.', end);
        }
        return calls;
    };

    it('masks addresses and prints names as initials only', () => {
        expect(script).toMatch(/NEW LEAD: \$\{maskEmail\(toEmail\)\}/);
        expect(script).toMatch(/require\('\.\/logMask\.cjs'\)/);
        const calls = consoleCalls();
        expect(calls.length).toBeGreaterThan(5);
        for (const call of calls) {
            for (const m of call.matchAll(/([A-Za-z_.(]*)\b(\w+)\.displayName/g)) {
                expect(m[1].endsWith('initials('), `unmasked name in: ${call}`).toBe(true);
            }
            for (const m of call.matchAll(/([A-Za-z_.(]*)\b(\w+)\.email\b/g)) {
                expect(m[1].endsWith('maskEmail('), `unmasked address in: ${call}`).toBe(true);
            }
            expect(call, 'a raw name field is printed').not.toMatch(/change\.name|plan\.toName|\btoEmail\b(?!\))/);
        }
    });

    it('the workflow never puts the new lead\'s address in a step env block, and masks it', () => {
        expect(workflow).not.toMatch(/NEW_LEAD:\s*'\$\{\{/);
        expect(workflow).not.toMatch(/env:[\s\S]*inputs\.newLeadEmail/);
        expect(workflow).toMatch(/echo "::add-mask::\$v"/);
        expect(workflow).toMatch(/for v in "\$NEW_LEAD"/);
    });
});

describe('the NEXUS Admin workflow', () => {
    it('previews unless "apply" is ticked, and apply defaults to off', () => {
        expect(workflow).toMatch(/apply:[\s\S]*?type: boolean[\s\S]*?default: false/);
        expect(workflow).toMatch(/if \[ "\$APPLY" = "true" \]; then WRITE_FLAG="--write"; fi/);
    });

    it('adds domains, never replaces them', () => {
        expect(workflow).toMatch(/bootstrap-config\.cjs --merge-domains --domain "\$DOMAIN"/);
    });

    it('never grants approval rights — no --super-admin anywhere', () => {
        expect(workflow).not.toMatch(/--super-admin/);
    });

    it('removes the key file however the step ends', () => {
        expect(workflow).toMatch(/trap 'rm -f "\$KEY"' EXIT/);
        expect(workflow).toMatch(/umask 077/);
    });

    it('is started by hand only', () => {
        expect(workflow).toMatch(/on:\s*\n\s*workflow_dispatch:/);
        expect(workflow).not.toMatch(/\bpush:|\bpull_request:|\bschedule:/);
    });
});
