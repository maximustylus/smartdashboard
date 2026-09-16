/**
 * ==============================================================================
 * NO EM DASHES IN ANYTHING A RESIDENT READS
 * ==============================================================================
 * Runner: Vitest.  Run: npm test
 *
 * The owner's standing instruction for `/individuals/*` is plain English with no
 * em dashes. That had been applied to the report copy and never to the chat, the
 * form or the result page, so v2.14.1 was live with em dashes in all three:
 * question prompts, chip labels, the "Select —" placeholder on every dropdown in
 * the conventional form, and every call-to-action sentence in four languages.
 *
 * ⚠️ THIS FILE CHECKS STRINGS, NOT SOURCE. Comments in this repository are long
 *    and use em dashes throughout, deliberately: they are read by whoever is
 *    editing the file, not by a resident. Grepping the file would flag hundreds
 *    of them and would be turned off within a week. What is checked here is the
 *    copy that is actually rendered, reached through the modules that export it.
 *
 * ⚠️ WHAT THIS CANNOT REACH. Roughly half of each AURA turn is written by the
 *    model at request time, not stored here. That half is governed by a line in
 *    the persona in `functions/index.js`, and no test in `src/` can see it. If
 *    an em dash shows up on the live site in an acknowledgement sentence, this
 *    file is not where the fix goes.
 */

import { describe, it, expect } from 'vitest';
import { DICTIONARY, COPY_ORDER } from './communityChatCopy';

const EM = '—';
const LANGS = ['en', 'ms', 'zh', 'ta'];

/** Every leaf string inside a value, however deeply it is nested. */
const leaves = (value, path = '', out = []) => {
    if (typeof value === 'string') out.push([path, value]);
    else if (Array.isArray(value)) value.forEach((v, i) => leaves(v, `${path}[${i}]`, out));
    else if (value && typeof value === 'object') {
        Object.entries(value).forEach(([k, v]) => leaves(v, path ? `${path}.${k}` : k, out));
    }
    return out;
};

describe('the chat says nothing to a resident with an em dash in it', () => {
    it.each(LANGS)('%s prompts, quick replies and fixed labels are clean', (lang) => {
        const dict = DICTIONARY[lang];
        const offenders = leaves(dict)
            .filter(([, text]) => text.includes(EM))
            .map(([where, text]) => `${where}: ${text.slice(0, 80)}`);
        expect(offenders, `${lang} has ${offenders.length} string(s) with an em dash`).toEqual([]);
    });

    it.each(LANGS)('%s reflections are clean for every answer they branch on', (lang) => {
        /*
          `reflections` are FUNCTIONS of the answer, so the strings inside them are
          unreachable by walking the object. The zero-days branch is exactly where
          one lived, so the branches are called rather than inspected.
        */
        const answers = ['0', '0 days', '1', '2', '3', '5', '7', '15', '30', '60',
            'yes', 'no', 'ya', 'tidak', '是', '否', 'ஆம்', 'இல்லை', ''];
        const offenders = [];
        DICTIONARY[lang].reflections.forEach((fn, i) => {
            if (typeof fn !== 'function') return;
            answers.forEach((a) => {
                const out = String(fn(a) ?? '');
                if (out.includes(EM)) offenders.push(`${COPY_ORDER[i]}("${a}"): ${out.slice(0, 80)}`);
            });
        });
        expect(offenders, `${lang} reflections produced ${offenders.length} em dash(es)`).toEqual([]);
    });

    it.each(LANGS)('%s prompts are clean for every answer they branch on', (lang) => {
        const states = [
            {}, { pavs_days: '0 days' }, { pavs_days: '3 days' }, { pavs_days: '0 hari' },
            { age_years: '67' }, { age_years: '24' },
        ];
        const offenders = [];
        DICTIONARY[lang].prompts.forEach((p, i) => {
            states.forEach((data) => {
                const out = String((typeof p === 'function' ? p(data) : p) ?? '');
                if (out.includes(EM)) offenders.push(`${COPY_ORDER[i]}: ${out.slice(0, 80)}`);
            });
        });
        expect(offenders, `${lang} prompts produced ${offenders.length} em dash(es)`).toEqual([]);
    });
});
