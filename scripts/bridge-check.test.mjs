/**
 * BRIDGE-CHECK — the judgment (`bridgeCheck.cjs`) and the wiring around it. The
 * script answers one production question on a public log, so the two things pinned
 * hardest are that it cannot write and that it prints nothing about anybody.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { readBridge, digestOf, summariseBridge } = require('./bridgeCheck.cjs');

const read = (p) => readFileSync(resolve(process.cwd(), p), 'utf8');
const script = read('scripts/bridge-check.cjs');
const workflow = read('.github/workflows/nexus-admin.yml');
const bridgeSource = read('src/utils/legacyBridge.js');

const SALT = 'test-salt|';
const row = (email) => digestOf(SALT, email);

describe('readBridge', () => {
    it('reads the salt and every digest row out of the real bridge source', () => {
        const { salt, digests } = readBridge(bridgeSource);
        expect(salt).toBe('nexus-legacy-bridge-v1|');
        expect(digests.length).toBeGreaterThan(0);
        expect(digests.every((d) => /^[0-9a-f]{64}$/.test(d))).toBe(true);
        expect(new Set(digests).size).toBe(digests.length);
    });

    it('agrees with the app: an address hashes to the same digest as legacyBridge.js', async () => {
        const { _internals } = await import('../src/utils/legacyBridge.js');
        const { sha256Hex } = await import('../src/utils/sha256.js');
        expect(digestOf(_internals.BRIDGE_SALT, ' Someone@Example.org '))
            .toBe(sha256Hex(_internals.BRIDGE_SALT + 'someone@example.org'));
    });
});

describe('summariseBridge', () => {
    const digests = [row('a@x.sg'), row('b@x.sg'), row('c@x.sg')];

    it('is safe only when no recognised account is without a team', () => {
        const s = summariseBridge({ salt: SALT, digests, accounts: [
            { email: 'a@x.sg', teamIds: ['t1'] },
            { email: 'B@X.sg', teamIds: ['t1', 't2'] },
            { email: 'stranger@x.sg', teamIds: [] },
        ] });
        expect(s).toMatchObject({ ok: true, rows: 3, recognised: 2, withTeam: 2, withoutTeam: 0, noAccount: 1, safeToDelete: true });
    });

    it('counts a recognised account with no team, and refuses', () => {
        const s = summariseBridge({ salt: SALT, digests, accounts: [
            { email: 'a@x.sg', teamIds: ['t1'] },
            { email: 'b@x.sg', teamIds: [] },
        ] });
        expect(s).toMatchObject({ withTeam: 1, withoutTeam: 1, safeToDelete: false });
    });

    it.each([[undefined], [null], ['t1'], [['']], [[null, 7]]])('treats teamIds %j as no team', (teamIds) => {
        const s = summariseBridge({ salt: SALT, digests, accounts: [{ email: 'a@x.sg', teamIds }] });
        expect(s.withoutTeam).toBe(1);
        expect(s.safeToDelete).toBe(false);
    });

    describe('the admin grant', () => {
        const adminDigests = [row('a@x.sg')];
        const base = { salt: SALT, digests, adminDigests };

        it('a bridge admin who is a lead of a team loses nothing', () => {
            const s = summariseBridge({ ...base, accounts: [{ email: 'a@x.sg', teamIds: ['t1'], isLead: true }] });
            expect(s).toMatchObject({ admins: 1, adminsUncovered: 0, safeToDelete: true });
        });

        it('nor does one whose own users document says admin', () => {
            const s = summariseBridge({ ...base, accounts: [{ email: 'a@x.sg', teamIds: ['t1'], docRole: 'admin' }] });
            expect(s).toMatchObject({ admins: 1, adminsUncovered: 0, safeToDelete: true });
        });

        it('an admin ONLY through the bridge blocks deletion, even with a team', () => {
            const s = summariseBridge({ ...base, accounts: [{ email: 'a@x.sg', teamIds: ['t1'], isLead: false, docRole: 'staff' }] });
            expect(s).toMatchObject({ admins: 1, adminsUncovered: 1, withoutTeam: 0, safeToDelete: false });
        });

        it('a non-admin row is not counted as an admin', () => {
            const s = summariseBridge({ ...base, accounts: [{ email: 'b@x.sg', teamIds: ['t1'] }] });
            expect(s).toMatchObject({ admins: 0, adminsUncovered: 0, safeToDelete: true });
        });

        it('reads the admin rows out of the real bridge source', () => {
            const { digests: all, adminDigests: real } = readBridge(bridgeSource);
            expect(real.length).toBeGreaterThan(0);
            expect(real.length).toBeLessThan(all.length);
            expect(real.every((d) => all.includes(d))).toBe(true);
        });
    });

    it('an unreadable bridge is never "safe"', () => {
        expect(summariseBridge({ salt: null, digests, accounts: [] }).safeToDelete).toBe(false);
        expect(summariseBridge({ salt: SALT, digests: [], accounts: [] }).safeToDelete).toBe(false);
        expect(summariseBridge({ salt: SALT, digests: [], accounts: [] }).ok).toBe(false);
    });

    it('returns numbers and booleans only — nothing that could identify anybody', () => {
        const s = summariseBridge({ salt: SALT, digests, accounts: [{ email: 'a@x.sg', teamIds: [] }] });
        for (const value of Object.values(s)) expect(['number', 'boolean']).toContain(typeof value);
    });
});

describe('bridge-check.cjs cannot write and names nobody', () => {
    it('has no write path at all', () => {
        // It reads no arguments at all, so there is no flag that could arm it.
        expect(script).not.toMatch(/process\.argv/);
        expect(script).not.toMatch(/\.(set|update|delete|create|add)\(|updateUser|deleteUser|createUser|batch\(|runTransaction/);
    });

    it('prints counts only: no console call interpolates an email, uid, name or digest', () => {
        const calls = [];
        let at = script.indexOf('console.');
        while (at !== -1) {
            const end = script.indexOf(');', at);
            calls.push(script.slice(at, end + 2));
            at = script.indexOf('console.', end);
        }
        expect(calls.length).toBeGreaterThan(5);
        for (const call of calls) {
            expect(call).not.toMatch(/\.email|\.uid|displayName|digest|accounts|teamId/);
        }
    });

    it('names the project before reading anything', () => {
        expect(script.indexOf('PROJECT : ${credential.projectId}')).toBeLessThan(script.indexOf('initializeApp('));
    });

    it('is a task in NEXUS Admin, run without the write flag', () => {
        expect(workflow).toMatch(/^\s+- bridge-check$/m);
        expect(workflow).toMatch(/bridge-check\)\s*\n\s*node scripts\/bridge-check\.cjs\s*\n/);
    });
});
