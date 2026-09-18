/**
 * ==============================================================================
 * THE WIZARD'S HELP COPY — pinned (v2.16.0)
 * ==============================================================================
 * Runner: Vitest
 * Run:    npx vitest run src/data/rosterWizardHelp.test.js
 *
 * Three claims, each of which would otherwise fail silently:
 *
 *   1. EVERY id A COMPONENT ASKS FOR HAS COPY. `FieldHint` renders NOTHING for an
 *      unknown id and `StepGuide` renders nothing for an unknown step, so a typo
 *      in `<FieldHint id="…">` would simply remove the help from that setting.
 *      The source is scanned here and every id checked against the registry.
 *   2. EVERY WIZARD STEP HAS A GUIDE, and no guide names a step that does not exist.
 *   3. THE COPY MAKES NO CLAIM THE PRODUCT DOES NOT: nothing is "recommended"
 *      (owner's decision, 2026-09-17), no paragraph is empty, and the word the
 *      owner asked to be removed from the product does not appear.
 * ==============================================================================
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { WIZARD_HELP, WIZARD_STEP_GUIDES, helpFor, stepGuideFor } from './rosterWizardHelp';
import { WIZARD_STEPS } from '../utils/rosterWizard';

const COMPONENTS = join(process.cwd(), 'src', 'components');
const componentSources = () =>
    readdirSync(COMPONENTS)
        .filter((name) => /\.jsx$/.test(name) && !/\.test\.jsx$/.test(name))
        .map((name) => readFileSync(join(COMPONENTS, name), 'utf8'));

const idsAskedFor = (pattern) => {
    const found = new Set();
    for (const source of componentSources()) {
        for (const match of source.matchAll(pattern)) found.add(match[1]);
    }
    return [...found].sort();
};

describe('every help id a component asks for exists', () => {
    it('FieldHint ids', () => {
        const asked = idsAskedFor(/(?:<FieldHint\s+id=|\bhint=)"([A-Za-z]+)"/g);
        expect(asked.length).toBeGreaterThan(15);
        const missing = asked.filter((id) => helpFor(id) === null);
        expect(missing, `FieldHint ids with no copy in WIZARD_HELP: ${missing.join(', ')}`).toEqual([]);
    });

    it('every WIZARD_HELP entry is asked for by some component (no orphaned copy)', () => {
        const asked = new Set(idsAskedFor(/(?:<FieldHint\s+id=|\bhint=)"([A-Za-z]+)"/g));
        const orphaned = Object.keys(WIZARD_HELP).filter((id) => !asked.has(id));
        expect(orphaned, `copy nothing renders: ${orphaned.join(', ')}`).toEqual([]);
    });

    it('step guide ids are wizard steps, and every step has one', () => {
        const stepIds = WIZARD_STEPS.map((step) => step.id);
        expect(Object.keys(WIZARD_STEP_GUIDES).sort()).toEqual([...stepIds].sort());
        const asked = idsAskedFor(/\bguide="([A-Za-z]+)"/g);
        const unknown = asked.filter((id) => !stepIds.includes(id));
        expect(unknown).toEqual([]);
        // Every step is asked for at least once (the team step twice: live and sandbox).
        const notAsked = stepIds.filter((id) => !asked.includes(id));
        expect(notAsked, `steps with no guide mounted: ${notAsked.join(', ')}`).toEqual([]);
    });
});

describe('the copy itself', () => {
    const allText = () => [
        ...Object.values(WIZARD_HELP).flatMap((entry) => [entry.title, ...entry.body, entry.caution ?? '']),
        ...Object.values(WIZARD_STEP_GUIDES).flatMap((entry) => [entry.decide, entry.example, entry.next]),
    ];

    it('has a title and at least one non-empty paragraph per setting', () => {
        for (const [id, entry] of Object.entries(WIZARD_HELP)) {
            expect(entry.title, id).toMatch(/\S/);
            expect(entry.body.length, id).toBeGreaterThan(0);
            for (const paragraph of entry.body) expect(paragraph, id).toMatch(/\S/);
        }
    });

    it('every step guide answers all three questions', () => {
        for (const [id, entry] of Object.entries(WIZARD_STEP_GUIDES)) {
            expect(entry.decide, id).toMatch(/\S/);
            expect(entry.example, id).toMatch(/\S/);
            expect(entry.next, id).toMatch(/\S/);
        }
    });

    it('recommends nothing — the owner asked for no recommended defaults', () => {
        const offenders = allText().filter((text) => /recommend/i.test(text));
        expect(offenders).toEqual([]);
    });

    it('never uses the acronym the owner asked to be removed', () => {
        const offenders = allText().filter((text) => /\bMOH\b/i.test(text));
        expect(offenders).toEqual([]);
    });

    it('is plain text: no markup leaked in from the inline version', () => {
        const offenders = allText().filter((text) => /<[a-z]+|&[a-z]+;|\{'/.test(text));
        expect(offenders).toEqual([]);
    });

    it('is frozen, and unknown ids resolve to null rather than throwing', () => {
        expect(Object.isFrozen(WIZARD_HELP)).toBe(true);
        expect(Object.isFrozen(WIZARD_HELP.bands)).toBe(true);
        expect(helpFor('nope')).toBeNull();
        expect(helpFor('__proto__')).toBeNull();
        expect(stepGuideFor('nope')).toBeNull();
    });
});

describe('the word budget the refactor was for', () => {
    it('the wizard tables render far less guidance by default than before', () => {
        // The tables carried ~1,800 words of always-on guidance before v2.16.0.
        // What is left inline is state-dependent, and it has to stay small or the
        // refactor has quietly undone itself.
        const source = readFileSync(join(COMPONENTS, 'RosterDemoWizardTables.jsx'), 'utf8');
        const paragraphs = [...source.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)]
            .map((match) => match[1].replace(/\{[^}]*\}|<[^>]+>|\s+/g, ' ').trim())
            .filter((text) => text.split(' ').length > 6);
        const words = paragraphs.reduce((sum, text) => sum + text.split(' ').length, 0);
        expect(words, `${paragraphs.length} inline paragraphs, ${words} words`).toBeLessThan(400);
    });
});
