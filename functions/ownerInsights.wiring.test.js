/**
 * `getOwnerInsights` — the wiring around the pure summary, read from source the
 * way `adminApiPin.test.js` reads it. The handler is the only one that crosses
 * teams, so the order of its steps is the security property.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const index = readFileSync(resolve(process.cwd(), 'functions/index.js'), 'utf8');
const start = index.indexOf('exports.getOwnerInsights = onCall(');
const handler = index.slice(start, index.indexOf('\n});\n', start));
const code = handler.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
const rules = readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8');

describe('getOwnerInsights', () => {
    it('exists', () => expect(start).toBeGreaterThan(-1));

    it('checks the caller is a super-admin BEFORE reading anything', () => {
        const gate = code.indexOf('await requireSuperAdmin(db, request)');
        expect(gate).toBeGreaterThan(-1);
        for (const read of ['db.collection(', 'db.collectionGroup(', 'db.getAll']) {
            expect(code.indexOf(read), read).toBeGreaterThan(gate);
        }
    });

    it('reduces a member document to team, uid and role before anything else sees it', () => {
        expect(code).toMatch(/members\.push\(\{ teamId: team\.id, uid: docSnap\.id, role: \(docSnap\.data\(\) \|\| \{\}\)\.role \}\)/);
        expect(code).not.toMatch(/displayName|\.email|shortName|grade/);
    });

    it('takes only status and date from a lead request', () => {
        expect(code).toMatch(/leadRequests\.push\(\{ status: data\.status, requestedAt: data\.requestedAt \}\)/);
    });

    it('reads no wellbeing, pulse, workload or roster CONTENT', () => {
        expect(code).not.toMatch(/pulse|wellbeing|workload|loads|swaps|feed/i);
        // The roster is only asked whether it exists.
        expect(code).toMatch(/if \(snap\.exists\) teamsWithRoster\.push/);
        expect(code).not.toMatch(/snap\.data\(\)/);
    });

    it('counts screenings with an aggregation, never by reading the records', () => {
        expect(code.match(/community_assessments'\)[^;]*\.count\(\)\.get\(\)/g).length).toBe(2);
        expect(code).not.toMatch(/community_assessments'\)\.get\(\)/);
    });

    it('logs every successful read, on a server clock, and returns only the summary', () => {
        expect(code).toMatch(/db\.collection\('owner_insights_access'\)\.add\(\{\s*uid: caller\.uid,\s*period: period,\s*at: FieldValue\.serverTimestamp\(\),\s*\}\)/);
        expect(code.trim().endsWith('return summary;')).toBe(true);
    });

    it('normalises the period rather than trusting the caller', () => {
        expect(code).toMatch(/ownerInsights\.normalisePeriod\(request\.data && request\.data\.period\)/);
    });

    it('no client can read or write the access log: the rules name no such path', () => {
        expect(rules).not.toMatch(/owner_insights_access/);
        expect(rules).toMatch(/match \/\{unmatched=\*\*\}/);
    });
});
