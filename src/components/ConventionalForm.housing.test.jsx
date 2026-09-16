/**
 * ==============================================================================
 * HOUSING TYPE — the two front doors must offer the same answers
 * ==============================================================================
 * Runner: Vitest.  Run: npm test
 *
 * `/individuals/*` has two pathways onto ONE screening: the AURA chat and the
 * conventional form. They write into the same `housingType` field, which is
 * stored, flagged on as a social-risk proxy, and sent to telemetry.
 *
 * ⚠️ THEY DRIFTED, AND NOTHING SAW IT. The chat offered six housing options and
 *    the form offered three, collapsing 3-Room, 4-Room and 5-Room/Executive into
 *    one "HDB 3 to 5 Room" and condo with landed into one "Private Property". A
 *    resident in a 4-room flat could say so in the chat and could not say so in
 *    the form, and the same person answering the same question got a different
 *    stored value depending on which door they walked through. Live in v2.14.1.
 *
 * This file is the thing that would have caught it. It reads the form's option
 * list out of the source, because `HOUSING_OPTIONS` is module-private and
 * exporting it from a `.jsx` component file trips `react-refresh`.
 *
 * ⚠️ WHAT IS COMPARED IS `value`, NOT THE LABEL. The four per-language labels are
 *    what a resident reads and may legitimately differ in wording between the two
 *    pathways. Only the STORED string has to match, because that is what
 *    `formClinicalData.js` and `clinicalParse.js` both feed into `sdohHousing`.
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { copyFor } from '../data/communityChatCopy';

const SOURCE = path.resolve(__dirname, 'ConventionalForm.jsx');

/** The `value:` of every entry in the form's `HOUSING_OPTIONS`, in order. */
const formHousingValues = () => {
    const src = fs.readFileSync(SOURCE, 'utf8');
    const start = src.indexOf('const HOUSING_OPTIONS = [');
    expect(start, 'HOUSING_OPTIONS has been renamed or removed').toBeGreaterThan(-1);
    const end = src.indexOf('];', start);
    const block = src.slice(start, end);
    return [...block.matchAll(/value:\s*'([^']+)'/g)].map((m) => m[1]);
};

const LANGS = ['en', 'ms', 'zh', 'ta'];

describe('housing type is asked the same way in both pathways', () => {
    it('offers exactly the chat’s stored values, in the same order', () => {
        expect(formHousingValues()).toEqual(copyFor('en').quickReplies.housing_type);
    });

    it('offers six options, not the three the form used to have', () => {
        const values = formHousingValues();
        expect(values).toHaveLength(6);
        // The collapse that was live: a 4-room resident had no way to say so.
        expect(values).toContain('HDB 4 Room');
        expect(values).not.toContain('HDB 3-5 Room');
        expect(values).not.toContain('Private Property');
    });

    it('gives the form a label in all four languages for every option', () => {
        const src = fs.readFileSync(SOURCE, 'utf8');
        const start = src.indexOf('const HOUSING_OPTIONS = [');
        const block = src.slice(start, src.indexOf('];', start));
        const rows = block.split('\n').filter((l) => l.includes('value:'));
        expect(rows).toHaveLength(6);
        rows.forEach((row) => {
            LANGS.forEach((lang) => {
                expect(row, `${row.trim().slice(0, 40)} has no ${lang} label`)
                    .toMatch(new RegExp(`\\b${lang}:\\s*'`));
            });
        });
    });

    it('keeps a 1-2 room option, which is the only one that raises a flag', () => {
        // `sdohHousing` is derived by regex in BOTH pathways now. If the option
        // that matches it ever disappears, the flag silently never fires again
        // and the evidence page's claim about housing becomes untrue.
        const values = formHousingValues();
        expect(values.some((v) => /1-2 room|1–2 room/i.test(v))).toBe(true);
    });
});
