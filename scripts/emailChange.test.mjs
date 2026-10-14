/**
 * EMAIL CHANGE (v2.19.0) — the planner, the masking, and the public-log wiring of
 * `change-email.cjs` and its NEXUS Admin task.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { planEmailChange } = require('./emailChange.cjs');
const { maskEmail, initials } = require('./logMask.cjs');

const script = readFileSync(resolve(process.cwd(), 'scripts/change-email.cjs'), 'utf8');
const workflow = readFileSync(resolve(process.cwd(), '.github/workflows/nexus-admin.yml'), 'utf8');

const OWNER = 'u-owner';
const base = {
    fromEmail: 'Owner@KKH.com.sg',
    toEmail: 'owner@me.com',
    account: { uid: OWNER },
    toTaken: false,
    user: { email: 'owner@kkh.com.sg', teamIds: ['kkh-sport-exercise-medicine'] },
    memberships: [{ teamId: 'kkh-sport-exercise-medicine', email: 'owner@kkh.com.sg' }],
    superAdmins: { emails: ['owner@kkh.com.sg'] },
};
const plan = (over = {}) => planEmailChange({ ...base, ...over });

describe('planEmailChange', () => {
    it('moves the account, its profile and its memberships to the new address, unverified', () => {
        const p = plan();
        expect(p.ok).toBe(true);
        expect(p.uid).toBe(OWNER);
        expect(p.auth).toEqual({ email: 'owner@me.com', emailVerified: false });
        expect(p.userDoc).toEqual({ path: ['users', OWNER], data: { email: 'owner@me.com' } });
        expect(p.members).toEqual([
            { path: ['teams', 'kkh-sport-exercise-medicine', 'members', OWNER], data: { email: 'owner@me.com' } },
        ]);
    });

    it('keeps an approver an approver: swaps the address AND pins the account uid', () => {
        expect(plan().superAdmins).toEqual({ emails: ['owner@me.com'], uids: [OWNER] });
    });

    it('keeps other approvers, and does not duplicate a uid already listed', () => {
        const p = plan({ superAdmins: { emails: ['owner@kkh.com.sg', 'other@kkh.com.sg'], uids: [OWNER, 'u-x'] } });
        expect(p.superAdmins).toEqual({ emails: ['other@kkh.com.sg', 'owner@me.com'], uids: [OWNER, 'u-x'] });
    });

    it('leaves the approver list alone for somebody who is not an approver', () => {
        expect(plan({ superAdmins: { emails: ['other@kkh.com.sg'] } }).superAdmins).toBeNull();
        expect(plan({ superAdmins: null }).superAdmins).toBeNull();
    });

    it('skips a membership that already carries the new address', () => {
        const p = plan({ memberships: [{ teamId: 't1', email: 'owner@me.com' }, { teamId: 't2', email: 'owner@kkh.com.sg' }] });
        expect(p.members.map((m) => m.path[1])).toEqual(['t2']);
    });

    it('refuses when no account has the current address', () => {
        expect(plan({ account: null })).toMatchObject({ ok: false });
        expect(plan({ account: null }).message).toMatch(/no NEXUS account at the current address/);
    });

    it('refuses when the new address already belongs to another account', () => {
        expect(plan({ toTaken: true }).message).toMatch(/already uses the new address/);
    });

    it('refuses a non-address and a no-op', () => {
        expect(plan({ toEmail: 'not-an-email' }).ok).toBe(false);
        expect(plan({ toEmail: ' OWNER@kkh.com.sg ' }).message).toMatch(/same as the current one/);
    });

    it('never puts an address in a refusal — refusals reach a public log', () => {
        for (const over of [{ account: null }, { toTaken: true }, { toEmail: 'x' }, { toEmail: 'owner@kkh.com.sg' }]) {
            const message = plan(over).message.toLowerCase();
            expect(message).not.toContain('owner@');
            expect(message).not.toContain('me.com');
        }
    });
});

describe('logMask', () => {
    it('shows an address as first letter and domain, and a name as initials', () => {
        expect(maskEmail('Muhammad.Alif@me.com')).toBe('m•••@me.com');
        expect(maskEmail('')).toBe('(no address)');
        expect(initials('Muhammad Alif')).toBe('M.A.');
        expect(initials('')).toBe('(no name)');
    });
});

describe('change-email.cjs prints nothing unmasked', () => {
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

    it('prints addresses only through maskEmail', () => {
        const calls = consoleCalls();
        expect(calls.length).toBeGreaterThan(5);
        for (const call of calls) {
            for (const m of call.matchAll(/([A-Za-z_.(]*)\b(fromEmail|toEmail)\b/g)) {
                expect(m[1].endsWith('maskEmail('), `unmasked address in: ${call}`).toBe(true);
            }
            expect(call, `raw account field in: ${call}`).not.toMatch(/account\.email|\.email\b/);
        }
    });

    it('is a dry run unless --write, and changes Auth before Firestore', () => {
        expect(script).toMatch(/const WRITE = argv\.includes\('--write'\);/);
        expect(script).toMatch(/if \(!WRITE\) \{/);
        expect(script.indexOf('auth.updateUser(')).toBeLessThan(script.indexOf('batch.commit()'));
    });
});

describe('the change-email task in NEXUS Admin', () => {
    it('masks both addresses and never puts them in an env block', () => {
        expect(workflow).toMatch(/CURRENT_EMAIL="\$\(input currentEmail\)"/);
        expect(workflow).toMatch(/NEW_EMAIL="\$\(input newEmail\)"/);
        expect(workflow).toMatch(/for v in "\$NEW_LEAD" "\$CURRENT_EMAIL" "\$NEW_EMAIL"; do\s*\n\s*if \[ -n "\$v" \]; then echo "::add-mask::\$v"; fi/);
        expect(workflow).not.toMatch(/env:[\s\S]*inputs\.(currentEmail|newEmail)/);
    });

    it('passes --write only when apply is ticked', () => {
        expect(workflow).toMatch(/change-email\)\s*\n\s*node scripts\/change-email\.cjs --from "\$CURRENT_EMAIL" --to "\$NEW_EMAIL" \$WRITE_FLAG/);
    });
});
