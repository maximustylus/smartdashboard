/**
 * ==============================================================================
 * `CP33` — THE REPORT MUST NOT PROMISE A CAPABILITY THAT HAS NO CODE BEHIND IT
 * ==============================================================================
 * Runner: Vitest.  Run: npm test
 *
 * Until 2026-09-13 the result page told every returning resident, in all four
 * languages:
 *
 *     "Longitudinal Tracking Active — your results have been linked to your
 *      previous assessment so you can track your progress over time."
 *
 * Nothing tracked anything. `previousId` is written to `community_assessments` and
 * read by NOBODY: not the resident, not the insights rollup, not any Cloud
 * Function. The security rules deny client reads of that collection outright, so
 * no comparison is possible from the browser at all, and the only two functions
 * that touch the collection are a deletion sweep and an anonymous counts rollup.
 *
 * This is the same class of defect the evidence page had, where housing was
 * described as a social-risk proxy with no mechanism behind it: a claim on a
 * public surface that nobody had checked was true.
 *
 * ⚠️ THIS TEST IS NOT "NEVER SAY THIS". It is "do not say it while it is false".
 *    When `CD23` is built, this file is updated IN THE SAME COMMIT as the
 *    mechanism, deliberately, by somebody who has just made it true. That is the
 *    whole point: the promise and the code move together or not at all.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { stripComments } from '../../scripts/strip-comments.mjs';

/*
  ⚠️ COMMENTS STRIPPED BEFORE SCANNING, AND THIS TEST IS WHY THE HELPER IS SHARED.
     The comment in `ResultPage.jsx` explaining what the old promise said QUOTES it,
     so the first version of this suite failed against its own documentation. The
     history is worth more than the scan's reach over it.
*/
const read = (file) => stripComments(readFileSync(join(process.cwd(), 'src', file), 'utf8'));

/**
 * Phrases that promise the resident a COMPARISON they can see, in each language.
 * Deliberately narrow: "linked" and "saved" are true and stay allowed. What is
 * banned is telling somebody they can watch themselves change over time.
 */
const PROMISES_TRACKING = [
    // English
    'track your progress', 'progress over time', 'Longitudinal Tracking Active',
    // Bahasa Melayu — "monitor your health progress"
    'memantau kemajuan',
    // 中文 — "track your health progress"
    '跟踪您的健康进展',
    // தமிழ் — "to track progress"
    'முன்னேற்றத்தைக் கண்காணிக்க',
];

describe('the result page claims only what the code does', () => {
    it.each(PROMISES_TRACKING)('does not promise "%s"', (phrase) => {
        expect(
            read('components/ResultPage.jsx'),
            `The report promises tracking ("${phrase}") and nothing reads previousId back. ` +
            'If you have just built CD23, update this list in the same commit.',
        ).not.toContain(phrase);
    });

    it.each(PROMISES_TRACKING)('the form does not promise "%s" either', (phrase) => {
        expect(read('components/ConventionalForm.jsx')).not.toContain(phrase);
    });

    it.each(PROMISES_TRACKING)('nor does the chat: "%s"', (phrase) => {
        expect(read('data/communityChatCopy.js')).not.toContain(phrase);
    });

    // The honest replacement must actually be there, in all four languages, or this
    // suite would also pass on a page that says nothing at all where it used to
    // reassure somebody their record was kept.
    it('still tells a returning resident their previous ID was kept', () => {
        const page = read('components/ResultPage.jsx');
        ['matched up later', 'dipadankan kemudian', '配对起来', 'ஒப்பிட முடியும்']
            .forEach((phrase) => expect(page, `missing the honest wording: ${phrase}`).toContain(phrase));
    });

    // And says plainly that the comparison is not available, rather than leaving a
    // reader to assume it is somewhere they have not looked.
    it('says the comparison cannot be shown yet, in all four languages', () => {
        const page = read('components/ResultPage.jsx');
        ['cannot show you the comparison', 'belum boleh menunjukkan perbandingan',
            '无法向您显示比较结果', 'காட்ட எங்களால் முடியவில்லை']
            .forEach((phrase) => expect(page, `missing: ${phrase}`).toContain(phrase));
    });
});
