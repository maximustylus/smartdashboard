/**
 * ==============================================================================
 * DOMAIN PARITY — the client's step list against the server's allowlist
 * ==============================================================================
 * Runner: Vitest.  Run: npm test
 *
 * `AuraChat` sends `domain: stepKey` (AuraChat.jsx) for every answered step, and
 * `communityAck.validateAckRequest` rejects any domain outside `COMMUNITY_DOMAINS`
 * with "Unknown assessment domain."
 *
 * Those two lists live on opposite sides of a module-system boundary: the client
 * is ESM under `src/`, the Cloud Function is CommonJS under `functions/`, with a
 * separate `package.json` and a separate deploy. Nothing can import across it, so
 * nothing makes them agree. They drifted, and the drift was invisible: the client
 * gained two appended steps (`falls`, `healthier_sg`) and the server's allowlist
 * was never extended, so the acknowledgement for both was rejected in production.
 *
 * The falls step is gated to residents aged 60 and over, so the failure landed on
 * older adults specifically — the same population `CP26` took the shortest
 * assessment. That is the second time a step appended on the client has silently
 * degraded for the cohort least able to report it.
 *
 * ⚠️ THIS IS A CONTRACT TEST, AND IT IS THE ONLY THING HOLDING THE CONTRACT.
 *    Appending a step to `DOMAIN_CONFIG` without adding the same key to
 *    `COMMUNITY_DOMAINS` must fail here, in CI, and not in a resident's chat.
 *    The proposed functional-measures work (`COMMUNITY_TODO.md` P9, `CD17`-`CD25`)
 *    appends further conditional steps by exactly this mechanism, which is why
 *    this guard lands before any of it.
 */

import { describe, it, expect } from 'vitest';
import { DOMAIN_CONFIG } from '../data/communityDomains';
import rules from '../../functions/communityAck.js';

const { COMMUNITY_DOMAINS, validateAckRequest } = rules;

const clientKeys = DOMAIN_CONFIG.map((step) => step.key);

describe('every client step is a domain the server will accept', () => {
    it.each(clientKeys)('server accepts %s', (key) => {
        expect(COMMUNITY_DOMAINS).toContain(key);
    });

    // The per-key cases above name the offender; this one states the invariant, so
    // a reader of a failure sees the whole gap rather than the first item of it.
    it('the client sends no domain the server rejects', () => {
        const rejected = clientKeys.filter((key) => !COMMUNITY_DOMAINS.includes(key));
        expect(rejected).toEqual([]);
    });

    // Proves the rejection is real rather than theoretical: the same key, through
    // the actual validator the endpoint runs.
    it.each(clientKeys)('validateAckRequest admits %s end to end', (key) => {
        expect(validateAckRequest({ domain: key, answer: 'x' }).ok).toBe(true);
    });
});

describe('the server allowlist carries nothing the client cannot send', () => {
    // A server key with no client step is dead permission surface on the one
    // endpoint the public can reach unauthenticated. Not a live defect, but it
    // should be deliberate rather than residue.
    it('has no orphan domains', () => {
        const orphans = COMMUNITY_DOMAINS.filter((key) => !clientKeys.includes(key));
        expect(orphans).toEqual([]);
    });
});

describe('the step list is internally consistent', () => {
    it('has no duplicate keys', () => {
        expect(new Set(clientKeys).size).toBe(clientKeys.length);
    });

    it('gives every step a key, a badge and a group', () => {
        DOMAIN_CONFIG.forEach((step) => {
            expect(typeof step.key).toBe('string');
            expect(step.key.length).toBeGreaterThan(0);
            expect(typeof step.badge).toBe('string');
            expect(typeof step.group).toBe('string');
        });
    });
});
