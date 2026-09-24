/**
 * ==============================================================================
 * THE RULE MUST KNOW EVERY FIELD THE APP WRITES
 * ==============================================================================
 * Runner: Vitest.  Run: npm test
 *
 * Since 2026-09-24 `firestore.rules` accepts a `community_assessments` record
 * only if every field is one it names (`isFlags`). That closed the collection to
 * forged shapes, and it creates a new way to fail quietly: add a field to
 * `parseClinicalData` or `deriveFormClinicalData`, and every real assessment is
 * refused in production, with nothing on screen, because `telemetry.js` swallows
 * the write error by design so the resident still reaches their result.
 *
 * CI has no Firestore emulator (`scripts/firestore-rules-verify.mjs` runs by
 * hand), so this is the guard that runs on every push: it reads the field list
 * out of `firestore.rules` and compares it with what the parsers produce.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseClinicalData } from './clinicalParse';
import { deriveFormClinicalData } from './formClinicalData';

const rules = readFileSync(join(process.cwd(), 'firestore.rules'), 'utf8');

/** The quoted names inside the first `keys().hasOnly([...])` after `marker`. */
const allowedAfter = (marker) => {
    const from = rules.indexOf(marker);
    expect(from, `${marker} not found in firestore.rules`).toBeGreaterThan(-1);
    const open = rules.indexOf('hasOnly([', from);
    const close = rules.indexOf('])', open);
    return [...rules.slice(open, close).matchAll(/'([^']+)'/g)].map((m) => m[1]);
};

// Stripped by `telemetry.js` before any write; the rule refuses them on purpose.
const NEVER_STORED = ['ageYears', 'functional'];

describe('community_assessments: the rule names every field the app writes', () => {
    const flagKeys = allowedAfter('function isFlags(');

    it('every field the chat parser produces', () => {
        const parsed = parseClinicalData({ age_years: '67', grip_kg: '18', sit_to_stand: '12', measure_setting: 'At a community event' });
        const written = Object.keys(parsed).filter((k) => !NEVER_STORED.includes(k));
        expect(written.filter((k) => !flagKeys.includes(k))).toEqual([]);
    });

    it('every field the form produces, plus the perception answers it adds', () => {
        const flags = deriveFormClinicalData({ ageYears: '67', gripKg: '18' });
        const written = [...Object.keys(flags).filter((k) => !NEVER_STORED.includes(k)), 'perception'];
        expect(written.filter((k) => !flagKeys.includes(k))).toEqual([]);
    });

    it('every perception answer, from either pathway', () => {
        const perceptionKeys = allowedAfter('function perception(');
        const chat = Object.keys(parseClinicalData({}).perception);
        const form = ['aware', 'referred', 'rating', 'trust', 'barriers', 'improve', 'incomeAdequacy'];
        expect([...chat, ...form].filter((k) => !perceptionKeys.includes(k))).toEqual([]);
    });

    it('and still refuses the two fields that must never be stored', () => {
        NEVER_STORED.forEach((key) => expect(flagKeys).not.toContain(key));
    });
});
