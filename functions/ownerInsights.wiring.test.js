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
const strip = (text) => text.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
const code = strip(handler);
const fn = (name) => {
    const at = index.indexOf(`async function ${name}(`);
    return strip(index.slice(at, index.indexOf('\n}\n', at)));
};
const counter = fn('countTeamActivity');
const accounts = fn('listAccountFacts');
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

    it('reads no wellbeing, pulse or workload, and no roster CONTENT', () => {
        expect(code + counter).not.toMatch(/pulse|wellbeing|workload|loads|grades/i);
        // The roster is only asked whether it exists.
        expect(code).toMatch(/if \(snap\.exists\) teamsWithRoster\.push/);
        expect(code).not.toMatch(/snap\.data\(\)/);
    });

    it('what a team has made is COUNTED, from the fixed list, and never opened', () => {
        // The handler names no team subcollection itself except the roster existence check.
        expect(code).not.toMatch(/swaps|feed|reports|projects|attendance|changes/);
        expect(code).toMatch(/countTeamActivity\(db, team\.id, year\)/);
        // The counter takes its paths from the list and can only aggregate.
        expect(counter).toMatch(/ownerInsights\.ACTIVITY\.map\(/);
        expect(counter).toMatch(/db\.collection\(path\)\.count\(\)\.get\(\)/);
        expect(counter.match(/\.get\(\)/g).length).toBe(1);
        expect(counter).not.toMatch(/\.data\(\)\.(?!count)|\.docs|forEach\(function \(docSnap/);
    });

    it('an account is reduced to its dates, its confirmed flag and its uid: no address, no name', () => {
        expect(accounts).toMatch(/getAuth\(\)\.listUsers\(PAGE, token\)/);
        expect(accounts).not.toMatch(/\.email\b|displayName|phoneNumber|photoURL|providerData|customClaims/);
        expect(accounts).toMatch(/MAX_PAGES/);
        expect(accounts).toMatch(/truncated: !!token/);
    });

    it('screenings come from the rollup document; the records are not read or counted here', () => {
        expect(code).toMatch(/db\.doc\('community_insights\/latest'\)\.get\(\)/);
        expect(code).not.toMatch(/community_assessments/);
        expect(code).toMatch(/respondents: rollup\.national\.respondents, generatedAt: rollup\.generatedAt, truncated: rollup\.truncated === true/);
    });

    it('a visit leaves as a time and "was it you", never as a uid', () => {
        expect(code).toMatch(/visits\.push\(\{ at: data\.at, self: data\.uid === caller\.uid \}\)/);
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
