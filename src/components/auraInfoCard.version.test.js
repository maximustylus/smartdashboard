/**
 * ==============================================================================
 * THE PUBLIC INFO CARD MUST NOT NAME A VERSION THE APP IS NOT
 * ==============================================================================
 * Runner: Vitest.  Run: npm test
 *
 * `docs/AURA-CHATBOT-INFO-CARD.md` is a controlled document under the IMDA
 * Transparency Guidelines, and it is not an inert file in `docs/`. `AuraInfoCard`
 * imports it with `?raw`, so it is compiled into the bundle and served to the
 * public at `/aura-info`, reachable without signing in.
 *
 * Its "Describes" line names the app version. Nothing kept that line in step with
 * `package.json`, and by the 2.13.0 release it was TWO MINORS stale — it said
 * v2.12.2 while the app shipped v2.12.4, then 2.13.0. A version string on a public
 * transparency card that disagrees with the product is precisely the failure
 * `src/version.js` was created to stop, reappearing in a file that module cannot
 * reach: the card is markdown, so it cannot import a constant.
 *
 * ⚠️ THIS IS NOT A RULE-12 SIGN-OFF CHECK. The app version is a factual pointer,
 *    not card content; it moves each release without re-approval. What Rule 12
 *    governs — what AURA does, how it is kept safe, how data is handled — is not
 *    touched by this test and must not be changed without the named sign-off.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import pkg from '../../package.json';

const CARD = 'docs/AURA-CHATBOT-INFO-CARD.md';
const card = readFileSync(join(process.cwd(), CARD), 'utf8');

describe('the published info card names the shipping version', () => {
    it('has a Describes line at all', () => {
        expect(card, `${CARD} has lost its "Describes" row`).toMatch(/\|\s*\*\*Describes\*\*\s*\|/);
    });

    it('names the version in package.json', () => {
        const row = card.split('\n').find((line) => line.includes('**Describes**'));
        expect(row).toBeTruthy();
        expect(
            row,
            `${CARD} says a different app version from package.json (${pkg.version}). ` +
            'This file is bundled with ?raw and served at /aura-info, so the stale ' +
            'version is live. Update the Describes row; it needs no fresh Rule 12 sign-off.',
        ).toContain(`v${pkg.version}`);
    });

    // The engine tier and the guardrail version move independently and must NOT be
    // dragged along by an app release. Asserted so a well-meaning bulk edit cannot.
    it('does not conflate the app version with the AURA engine or guardrail versions', () => {
        const row = card.split('\n').find((line) => line.includes('**Describes**'));
        expect(row, 'the AURA engine tier changed with an app release').toContain('v2.3');
        expect(row, 'the guardrail version changed with an app release').toContain('v1.0');
    });
});
