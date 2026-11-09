/**
 * MEMBERSHIP IS THE ONLY WAY IN (v2.20.1).
 *
 * Until then seven recognised email addresses bypassed the access gate through a
 * "legacy bridge". It was deleted after a read-only production check counted nobody
 * relying on it. This pins the deletion: a list of people who skip the gate is the
 * hardcoded-team defect, and it has come back in a quieter form before.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const root = resolve(process.cwd(), 'src');
const walk = (dir) => readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
});
const sources = walk(root).filter((f) => /\.(js|jsx)$/.test(f) && !/\.test\./.test(f));
const app = readFileSync(join(root, 'App.jsx'), 'utf8');

describe('the access gate has no bypass list', () => {
    it('the bridge module is gone', () => {
        expect(existsSync(join(root, 'utils/legacyBridge.js'))).toBe(false);
    });

    it('nothing imports it or calls what it exported', () => {
        for (const file of sources) {
            const code = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
            expect(code, file).not.toMatch(/legacyBridge|checkAccess\(|isLegacyAdminEmail|isLegacyDirectoryMember/);
        }
    });

    it('the gate is decided by access state alone, with the approval queue its one exemption', () => {
        expect(app).toMatch(/if \(user && !isDemo && !isApprovalQueue && !canEnterApp\(accessState\)\) \{/);
    });

    it('admin access is the demo, a lead, or the person\'s own users document', () => {
        expect(app).toMatch(/const hasAdminAccess = isDemo\s*\|\| isLead\s*\|\| user\?\.role === 'admin';/);
    });
});
