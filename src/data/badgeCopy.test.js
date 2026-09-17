/**
 * `CP28`: every step badge exists in every language, and the emoji survives.
 * Runner: Vitest.  Run: npm test
 */

import { describe, it, expect } from 'vitest';
import { DOMAIN_CONFIG } from './communityDomains';
import { BADGE_COPY, badgeFor } from './badgeCopy';

const LANGS = ['en', 'ms', 'zh', 'ta'];

describe('step badges follow the chosen language', () => {
    it('has a row for every step in DOMAIN_CONFIG, and no row for a step that does not exist', () => {
        const steps = DOMAIN_CONFIG.map((s) => s.key).sort();
        expect(Object.keys(BADGE_COPY).sort()).toEqual(steps);
    });

    it.each(LANGS)('%s: every step has words, with no em dash and no "clinical"', (lang) => {
        DOMAIN_CONFIG.forEach((step) => {
            const words = BADGE_COPY[step.key]?.[lang];
            expect(words, `${step.key} has no ${lang} badge`).toBeTruthy();
            expect(words).not.toMatch(/—/);
            expect(words.toLowerCase()).not.toContain('clinical');
        });
    });

    it('English matches the literal in DOMAIN_CONFIG, so the fallback and the table cannot drift', () => {
        DOMAIN_CONFIG.forEach((step) => {
            const literal = step.badge.slice(step.badge.indexOf(' ') + 1);
            expect(BADGE_COPY[step.key].en, step.key).toBe(literal);
        });
    });

    it.each(['ms', 'zh', 'ta'])('%s: keeps the emoji and swaps the words', (lang) => {
        DOMAIN_CONFIG.forEach((step) => {
            const out = badgeFor(step, lang);
            const emoji = step.badge.slice(0, step.badge.indexOf(' ') + 1);
            expect(out.startsWith(emoji), `${step.key}: "${out}" lost its emoji`).toBe(true);
            expect(out.slice(emoji.length)).toBe(BADGE_COPY[step.key][lang]);
        });
    });

    it('falls back to the English literal for an unknown language or step', () => {
        expect(badgeFor(DOMAIN_CONFIG[0], 'xx')).toBe(DOMAIN_CONFIG[0].badge);
        expect(badgeFor(undefined, 'ms')).toBe('');
    });
});
