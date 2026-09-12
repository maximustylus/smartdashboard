/**
 * ==============================================================================
 * COPY REVIEW — the gate on machine-translated safety instructions
 * ==============================================================================
 * Runner: Vitest.  Run: npm test
 *
 * Every non-English string here is machine-translated, deliberately. This suite
 * does not argue with that. It enforces the one carve-out the owner already wrote
 * down: a string whose job is to STOP somebody doing something is read by a person
 * in every language before it ships, or it carries a named waiver.
 *
 * The failure this prevents is quiet. A prohibition can come back from any
 * translator, human or machine, as a suggestion and still read perfectly well, so
 * nobody skimming for accuracy catches it. And an instruction no human ever read is
 * hard to defend if somebody is hurt, whether or not it was correct.
 */

import { describe, it, expect } from 'vitest';
import {
    COPY_REVIEW, REVIEW_WAIVERS, TRANSLATION_LANGUAGES,
    safetyCriticalKeys, unreviewedLanguages, blockingReviewGaps, reviewDebt, isPending,
} from './copyReview';

describe('the registry describes itself honestly', () => {
    it('gives every string a location a reviewer can open', () => {
        Object.entries(COPY_REVIEW).forEach(([key, entry]) => {
            expect(typeof entry.where, key).toBe('string');
            expect(entry.where.length, key).toBeGreaterThan(0);
        });
    });

    it('records a review state for all three languages on every string', () => {
        Object.entries(COPY_REVIEW).forEach(([key, entry]) => {
            TRANSLATION_LANGUAGES.forEach((lang) => {
                expect(entry.reviewedBy, `${key} is missing ${lang}`).toHaveProperty(lang);
            });
        });
    });

    it('says plainly whether each string is safety-critical', () => {
        Object.entries(COPY_REVIEW).forEach(([key, entry]) => {
            expect(typeof entry.safetyCritical, key).toBe('boolean');
        });
    });

    // A safety-critical string declared before its copy exists must carry the
    // English, or a reviewer has nothing to compare a translation against.
    it('carries the English for any safety-critical string not yet in a module', () => {
        safetyCriticalKeys().forEach((key) => {
            if (COPY_REVIEW[key].where.includes('pending')) {
                expect(typeof COPY_REVIEW[key].english, key).toBe('string');
                expect(COPY_REVIEW[key].english.length, key).toBeGreaterThan(10);
            }
        });
    });
});

describe('THE GATE: safety instructions are read by a person', () => {
    // This is the assertion the whole file exists for. It fails the build when a
    // safety-critical string is neither reviewed nor consciously waived, which
    // includes any new one somebody adds without noticing this rule.
    it('ships no safety-critical string that is unreviewed and unwaived', () => {
        const gaps = blockingReviewGaps();
        const detail = gaps.map((g) => `  ${g.key}: no reviewer for ${g.missing.join(', ')}`).join('\n');
        expect(gaps, gaps.length ? `\nUnreviewed safety-critical copy:\n${detail}\n` : '').toEqual([]);
    });

    it('waives nothing that is not a real registry entry', () => {
        Object.keys(REVIEW_WAIVERS).forEach((key) => {
            expect(COPY_REVIEW[key], `waiver for unknown string ${key}`).toBeDefined();
        });
    });

    // A waiver is a decision somebody owns. An anonymous or undated one is an
    // oversight wearing a waiver's clothes.
    it('requires an owner and a date on every waiver', () => {
        Object.entries(REVIEW_WAIVERS).forEach(([key, waiver]) => {
            expect(typeof waiver.by, `${key} waiver has no owner`).toBe('string');
            expect(String(waiver.on), `${key} waiver has no date`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });
    });
});

describe('the review debt is visible rather than assumed', () => {
    // `CD13` has lived in a document since 2026-08-23, where nothing checks it.
    // This is the same debt, countable, so "everything is reviewed" can never be
    // claimed on the strength of a stale table.
    it('reports what is still owed a human read', () => {
        const debt = reviewDebt();
        expect(Array.isArray(debt)).toBe(true);
        debt.forEach((row) => {
            expect(row.missing.length).toBeGreaterThan(0);
            row.missing.forEach((lang) => expect(TRANSLATION_LANGUAGES).toContain(lang));
        });
    });

    it('treats a string nobody has reviewed as owing all three languages', () => {
        const untouched = Object.keys(COPY_REVIEW).find(
            (k) => TRANSLATION_LANGUAGES.every((l) => !COPY_REVIEW[k].reviewedBy[l]),
        );
        if (untouched) expect(unreviewedLanguages(untouched)).toEqual([...TRANSLATION_LANGUAGES]);
    });

    it('owes nothing for a string it does not know about', () => {
        expect(unreviewedLanguages('no.such.string')).toEqual([...TRANSLATION_LANGUAGES]);
    });
});

describe('a pending declaration cannot quietly become live', () => {
    // The one way `where: pending` could lie: somebody writes the copy into a real
    // module and forgets to update the registry, so the gate never fires on a string
    // residents can now read. Checked against the shipped copy itself.
    it('finds no pending safety-critical English already shipping in a module', async () => {
        const { DICTIONARY } = await import('./communityChatCopy');
        const shipped = JSON.stringify(DICTIONARY);
        Object.entries(COPY_REVIEW).forEach(([key, entry]) => {
            if (!entry.safetyCritical || !entry.where.includes('pending')) return;
            const firstClause = entry.english.split(/[.,]/)[0].trim();
            expect(
                shipped.includes(firstClause),
                `${key} is marked pending but its English is already in communityChatCopy. Update \`where\` so the review gate applies.`,
            ).toBe(false);
        });
    });

    it('blocks a live safety-critical string the moment it stops being pending', () => {
        const live = safetyCriticalKeys().filter((k) => !isPending(k) && !REVIEW_WAIVERS[k]);
        // Every live one must already be reviewed, or `blockingReviewGaps` names it.
        live.forEach((key) => {
            if (unreviewedLanguages(key).length > 0) {
                expect(blockingReviewGaps().map((g) => g.key)).toContain(key);
            }
        });
    });
});
