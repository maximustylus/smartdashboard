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
