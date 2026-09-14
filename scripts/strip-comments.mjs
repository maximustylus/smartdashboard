/**
 * ==============================================================================
 * STRIP COMMENTS — so a source scan reads code, not the notes around it
 * ==============================================================================
 *
 * Several tests here assert that a string does NOT appear in a source file: a
 * hand-typed version (`version.test.js`), a promise the code cannot keep
 * (`ResultPage.claims.test.js`). All of them have the same problem, and it bites
 * immediately: the comment explaining why the string is banned CONTAINS the string.
 *
 * ⚠️ COMMENTS ARE EXEMPT, DELIBERATELY. This codebase annotates changes with the
 *    history that produced them, quoting the wording that was wrong. That history
 *    is the most valuable thing in the file and must stay writable. So a scan
 *    strips comments first and inspects only code. It is also the honest limit of
 *    every test built on this: it cannot catch a banned string typed into a
 *    comment, and it is not trying to.
 *
 * ⚠️ LIVES OUTSIDE `src/` ON PURPOSE. It is test scaffolding, not application code,
 *    and putting it in the bundle graph to serve tests is how a helper nobody ships
 *    ends up shipped.
 *
 * Moved here from `version.test.js` unchanged, because a second copy was about to
 * be written. `an14.bundle.test.js` keeps its OWN simpler stripper: that one guards
 * a security assertion about staff identities in the built bundle, and swapping its
 * implementation as a drive-by on an unrelated fix is how a security test quietly
 * stops testing what it used to.
 */

export const stripComments = (code) => {
    let out = '';
    let i = 0;
    let mode = 'code';           // code | line | block | single | double | tick
    while (i < code.length) {
        const c = code[i];
        const next = code[i + 1];
        if (mode === 'code') {
            if (c === '/' && next === '/') { mode = 'line'; i += 2; continue; }
            if (c === '/' && next === '*') { mode = 'block'; i += 2; continue; }
            if (c === "'") mode = 'single';
            else if (c === '"') mode = 'double';
            else if (c === '`') mode = 'tick';
            out += c; i += 1; continue;
        }
        if (mode === 'line') {
            if (c === '\n') { mode = 'code'; out += '\n'; }
            i += 1; continue;
        }
        if (mode === 'block') {
            if (c === '*' && next === '/') { mode = 'code'; i += 2; continue; }
            if (c === '\n') out += '\n';   // keep line numbers honest
            i += 1; continue;
        }
        // inside a string: copy through, respect escapes, and end on the quote
        if (c === '\\') { out += c + (next ?? ''); i += 2; continue; }
        if ((mode === 'single' && c === "'") || (mode === 'double' && c === '"') || (mode === 'tick' && c === '`')) mode = 'code';
        out += c; i += 1; continue;
    }
    return out;
};
