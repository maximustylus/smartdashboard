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
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    COPY_REVIEW, REVIEW_WAIVERS, TRANSLATION_LANGUAGES,
    safetyCriticalKeys, unreviewedLanguages, blockingReviewGaps, reviewDebt, isPending,
    reachabilityWatchlist, CROSS_CHECKS, looksLikeAModel,
} from './copyReview';
import { reachedByUi, REPO_ROOT, UI_ENTRY_POINTS } from '../../scripts/copy-reachability.mjs';

// Resolved once against the real source tree. This is what makes the gate fire on
// what a resident can READ rather than on what somebody has typed.
const ON_SCREEN = reachedByUi();

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
        const gaps = blockingReviewGaps(ON_SCREEN);
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

/**
 * ==============================================================================
 * A MODEL CANNOT BE RECORDED AS A REVIEWER
 * ==============================================================================
 *
 * The realistic way this gate dies is not somebody disabling it. It is somebody
 * running the strings through two other models, getting sensible answers, and
 * typing "Gemini 3.1 Pro" into `reviewedBy` — which turns the build green and
 * records, permanently, that a person read a safety instruction when none did.
 *
 * Machine cross-checks are worth doing and belong in `CROSS_CHECKS`. They are
 * evidence. They are not the answer to "would your mother understand this".
 */
describe('a machine cross-check is not a review', () => {
    it.each([
        'Gemini 3.1 Pro', 'ChatGPT6 Astra', 'Claude', 'GPT-5', 'Google Translate',
        'DeepL', 'machine translation', 'AI review', 'an LLM',
    ])('rejects %s as a reviewer', (name) => {
        expect(looksLikeAModel(name)).toBe(true);
    });

    // The check must not swallow real names. "Amir" contains no model token; a
    // person called Ai Ling is a person, and the word boundaries are what protect
    // her from being refused by a check about robots.
    it.each(['Siti Aisha', 'Amir bin Hassan', 'Ai Ling Tan', 'Raj', 'M. Alif', ''])(
        'accepts %s', (name) => {
            expect(looksLikeAModel(name)).toBe(false);
        },
    );

    it('lets no model name into the live registry', () => {
        Object.entries(COPY_REVIEW).forEach(([key, entry]) => {
            TRANSLATION_LANGUAGES.forEach((lang) => {
                const who = entry.reviewedBy[lang];
                expect(
                    looksLikeAModel(who),
                    `${key}.${lang} names "${who}", which is not a person. A machine ` +
                    'cross-check belongs in CROSS_CHECKS; to ship without a human read, ' +
                    'sign a waiver.',
                ).toBe(false);
            });
        });
    });

    it('records cross-checks against strings the registry knows about', () => {
        Object.keys(CROSS_CHECKS).forEach((key) => {
            expect(COPY_REVIEW[key], `cross-check for unknown string ${key}`).toBeDefined();
        });
    });

    // A cross-check is a claim about what was done. Undated or unattributed, it is
    // a rumour, and the whole reason this field exists is to be more honest than
    // `reviewedBy` would have been.
    it('dates and attributes every cross-check', () => {
        Object.entries(CROSS_CHECKS).forEach(([key, check]) => {
            expect(typeof check.by, `${key} cross-check has no source`).toBe('string');
            expect(String(check.on), `${key} cross-check has no date`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            expect(Array.isArray(check.languages), `${key} names no languages`).toBe(true);
            check.languages.forEach((l) => expect(TRANSLATION_LANGUAGES).toContain(l));
        });
    });

    // ⚠️ THE ASSERTION THE FIELD EXISTS FOR. A machine pass must never be mistaken
    //    for a human read, in either direction: it is recorded here, and `reviewedBy`
    //    stays empty until a person reads it.
    it('leaves reviewedBy untouched for everything it cross-checked', () => {
        Object.keys(CROSS_CHECKS).forEach((key) => {
            expect(
                unreviewedLanguages(key).length,
                `${key} was cross-checked and someone filled in reviewedBy`,
            ).toBeGreaterThan(0);
        });
    });

    // The whole point: a cross-check must not move the gate. If recording one ever
    // reduces the blocking set, the distinction has collapsed.
    it('does not open the gate for anything', () => {
        const blocking = blockingReviewGaps(new Set(reachabilityWatchlist())).map((g) => g.key);
        Object.keys(CROSS_CHECKS).forEach((key) => {
            if (safetyCriticalKeys().includes(key) && unreviewedLanguages(key).length > 0) {
                expect(blocking, `${key} was cross-checked and stopped blocking`).toContain(key);
            }
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
        const { MEASURES_COPY } = await import('./measuresCopy');
        const shipped = JSON.stringify(DICTIONARY) + JSON.stringify(MEASURES_COPY);
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
        const live = safetyCriticalKeys().filter(
            (k) => !isPending(k) && !COPY_REVIEW[k].reachableWhen && !REVIEW_WAIVERS[k],
        );
        // Every live one must already be reviewed, or `blockingReviewGaps` names it.
        live.forEach((key) => {
            if (unreviewedLanguages(key).length > 0) {
                expect(blockingReviewGaps(ON_SCREEN).map((g) => g.key)).toContain(key);
            }
        });
    });
});

/**
 * ==============================================================================
 * THE GATE CAN ACTUALLY GO RED
 * ==============================================================================
 *
 * A gate that never fires passes every build and protects nobody, and it looks
 * exactly like a gate that is satisfied. The measures copy is written and
 * unreviewed today, and the only reason the build is green is that no component
 * imports it yet. These assertions prove that reason is real: that the scanner
 * finds things, that it has not silently stopped finding them, and that the moment
 * the entry screen lands the build goes red.
 */
describe('the reachability gate is load-bearing, not decorative', () => {
    // POSITIVE CONTROL. `communityChatCopy.js` is on screen today: `AuraChat.jsx`
    // imports it and residents read it in four languages. If the walk breaks, this
    // fails here rather than quietly reporting nothing reachable and passing
    // everything downstream.
    it('finds copy that is demonstrably on screen today', () => {
        expect(ON_SCREEN.has('src/data/communityChatCopy.js')).toBe(true);
        expect(ON_SCREEN.has('src/data/screeningChips.js')).toBe(true);
        expect(ON_SCREEN.size).toBeGreaterThan(20);
    });

    it('resolves every resident-facing entry point it claims to walk from', () => {
        UI_ENTRY_POINTS.forEach((entry) => {
            expect(existsSync(resolve(REPO_ROOT, entry)), `${entry} does not exist`).toBe(true);
        });
    });

    // A `reachableWhen` naming a module that no longer exists can never be reached,
    // so its string would be permanently exempt. That is the quiet way this gate
    // dies: not by being switched off, but by pointing at nothing.
    it('watches only modules that exist', () => {
        reachabilityWatchlist().forEach((module) => {
            expect(existsSync(resolve(REPO_ROOT, module)), `${module} is watched but missing`).toBe(true);
        });
    });

    // THE ASSERTION THIS WHOLE MECHANISM RESTS ON. Simulate the measures copy being
    // imported by a component and confirm the build would fail. If this passes and
    // the gate test above also passes, the gate is armed and simply has not fired.
    it('fails the build once a component imports unreviewed safety copy', () => {
        const watched = reachabilityWatchlist();
        expect(watched.length, 'nothing is watched, so this proves nothing').toBeGreaterThan(0);

        const asIfShipped = new Set([...ON_SCREEN, ...watched]);
        const gaps = blockingReviewGaps(asIfShipped);
        expect(gaps.map((g) => g.key)).toEqual(
            expect.arrayContaining(['measures.doNotSelfTest', 'measures.noComparison', 'measures.notADiagnosis']),
        );
        gaps.forEach((gap) => expect(gap.missing).toEqual(['ms', 'zh', 'ta']));
    });

    // Unknown reachability must fail SHUT. A caller with no filesystem access gets
    // the cautious answer rather than a free pass.
    it('treats unknown reachability as reachable', () => {
        expect(blockingReviewGaps().map((g) => g.key)).toContain('measures.doNotSelfTest');
    });

    /*
      The debt sheet has to tell a reviewer WHICH strings are already in front of
      residents, because that is what decides what to read first.

      ⚠️ ASSERTED AGAINST BOTH REACHABILITY STATES, NOT AGAINST TODAY'S. This test
         used to pin `live === false`, which was true only while nothing imported
         the measures copy. It went stale the moment the questions shipped, and a
         test that has to be edited every time the app changes teaches people to
         edit it rather than read it. Driving it from an explicit set proves the
         distinction works in both directions and stays true either way.
    */
    it('separates copy that is on screen from copy that is merely written', () => {
        const key = 'measures.doNotSelfTest';
        expect(isPending(key), 'the copy exists, so it is not pending').toBe(false);

        const nothingShipped = reviewDebt(new Set()).find((r) => r.key === key);
        expect(nothingShipped.live, 'unimported copy no resident can read').toBe(false);

        const shipped = reviewDebt(new Set(reachabilityWatchlist())).find((r) => r.key === key);
        expect(shipped.live, 'imported copy a resident can read').toBe(true);
    });
});
