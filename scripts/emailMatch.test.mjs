/**
 * ==============================================================================
 * EMAIL NEAR-MATCHING — SPECIFICATION TEST SUITE
 * ==============================================================================
 * Runner: Vitest.  Run: npm test
 *
 * The migration told a lead that three of his seven colleagues had never
 * registered — two of whom have a year of clinical records in the database. The
 * likelier reading is a wrong address in the manifest. These cases are the shapes
 * that has actually taken, plus every way a suggestion could become a silent
 * decision, which it must never be.
 */

import { describe, it, expect } from 'vitest';
import emailMatch from './emailMatch.cjs';

const { canonical, domainOf, suggestMatches, suggestionReport } = emailMatch;

describe('canonical', () => {
    /**
     * ⚠️ THE OBSERVED CASE. `scripts/team-one-manifest.cjs` holds
     *    `barry.lim.k.g.@unityhealth.example`. A trailing dot in the local part is
     *    invalid under RFC 5321, so Firebase Auth most likely holds the same
     *    address without it — and the two must collapse onto one key.
     */
    it('collapses the trailing dot that made one manifest address invalid', () => {
        expect(canonical('barry.lim.k.g.@unityhealth.example'))
            .toBe(canonical('barry.lim.k.g@unityhealth.example'));
        expect(canonical('barry.lim.k.g.@unityhealth.example')).toBe('barrylimkg');
    });

    it('takes the local part only, so two domains do not merge by accident', () => {
        expect(canonical('a.b@northside.example')).toBe('ab');
        expect(canonical('a.b@unityhealth.example')).toBe('ab');
        expect(domainOf('a.b@northside.example')).toBe('northside.example');
    });

    it('is stable for junk rather than throwing', () => {
        expect(canonical(null)).toBe('');
        expect(canonical(undefined)).toBe('');
        expect(canonical('')).toBe('');
        expect(domainOf('no-at-sign')).toBe('');
    });
});

describe('suggestMatches', () => {
    const existing = [
        'barry.lim.k.g@unityhealth.example',
        'bradley.tan@northside.example',
        'muhammad.alif@northside.example',
        'unrelated.person@northside.example',
    ];

    it('ranks a punctuation-only difference highest', () => {
        const [top] = suggestMatches('barry.lim.k.g.@unityhealth.example', existing);
        expect(top.email).toBe('barry.lim.k.g@unityhealth.example');
        expect(top.strength).toBe('exact-canonical');
    });

    it('finds an address that is the same plus an extra initial', () => {
        const [top] = suggestMatches('bradley.tan.gg@northside.example', existing);
        expect(top.email).toBe('bradley.tan@northside.example');
        expect(top.strength).toBe('prefix');
    });

    /**
     * A canonical match across DIFFERENT domains is the dangerous one — two
     * clusters can hold the same local part for two different people — so it is
     * still surfaced but its reason says to check.
     */
    it('flags a canonical match on a different domain rather than hiding it', () => {
        const [top] = suggestMatches('a.b@northside.example', ['a.b@unityhealth.example']);
        expect(top.strength).toBe('exact-canonical');
        expect(top.why).toMatch(/DIFFERENT domain/);
    });

    it('returns nothing when nothing resembles the address', () => {
        expect(suggestMatches('nobody.here@northside.example', existing)).toEqual([]);
    });

    it('never suggests the address that was already tried', () => {
        const out = suggestMatches('bradley.tan@northside.example', existing);
        expect(out.map((s) => s.email)).not.toContain('bradley.tan@northside.example');
    });

    it('does not throw on an empty or missing account list', () => {
        expect(suggestMatches('a@b.com', [])).toEqual([]);
        expect(suggestMatches('a@b.com', undefined)).toEqual([]);
        expect(suggestMatches('', existing)).toEqual([]);
    });

    /**
     * A two-character local part must not "contain"-match half the directory.
     * The `contains` rule is gated at 6 characters for exactly this reason.
     */
    it('does not fire the weakest rule on a very short local part', () => {
        const out = suggestMatches('ab@northside.example', ['abcdefghij@northside.example']);
        expect(out.filter((s) => s.strength === 'contains')).toHaveLength(0);
    });
});

describe('suggestionReport — a question for a human, never a decision', () => {
    const member = { displayName: 'Bradley', email: 'bradley.tan.gg@northside.example' };

    it('says outright that nothing was used', () => {
        const lines = suggestionReport(member, suggestMatches(member.email, ['bradley.tan@northside.example'])).join('\n');
        expect(lines).toMatch(/NONE was used/);
        expect(lines).toMatch(/Do not guess/);
    });

    /**
     * ⚠️ THE PROPERTY THAT MAKES SUGGESTING SAFE AT ALL. If this module ever
     *    returns something the migration can resolve automatically, it can file
     *    one clinician's wellbeing history under a colleague who shares a surname.
     *    The report is text. It has no uid in it and nothing downstream can act
     *    on it.
     */
    it('carries no uid and nothing machine-actionable', () => {
        const suggestions = suggestMatches(member.email, ['bradley.tan@northside.example']);
        suggestions.forEach((s) => {
            expect(Object.keys(s).sort()).toEqual(['email', 'strength', 'why']);
            expect(s).not.toHaveProperty('uid');
        });
    });

    it('prints nothing at all when there is nothing to offer', () => {
        expect(suggestionReport(member, [])).toEqual([]);
    });

    it('caps the list, so a wide match does not bury the errors above it', () => {
        const many = Array.from({ length: 12 }, (_, i) => `bradley.tan${i}@northside.example`);
        const lines = suggestionReport(member, suggestMatches(member.email, many));
        expect(lines.filter((l) => l.trim().startsWith('·')).length).toBeLessThanOrEqual(4);
    });
});
