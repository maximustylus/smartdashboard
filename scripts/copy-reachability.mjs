/**
 * ==============================================================================
 * COPY REACHABILITY — can a resident actually read this string yet?
 * ==============================================================================
 *
 * `copyReview.js` gates safety-critical translations on whether they are LIVE, and
 * live means a resident can read them, not that a developer has typed them. This
 * module answers that question against the real source tree, so nothing decides its
 * own reachability by declaring it.
 *
 * It walks the import graph FORWARD from the resident-facing entry points and
 * collects every module the walk lands on. Transitive on purpose: a component that
 * imports a view helper that imports the copy puts that copy on screen just as
 * surely as importing it directly, and a one-hop check would miss it. Missing it
 * means a prohibition nobody read shipping to somebody's grandmother.
 *
 * ⚠️ THIS IS A STATIC READ, NOT A PROOF OF RENDERING. A module can be imported and
 *    never rendered, so this OVER-reports rather than under-reports. That is the
 *    direction to be wrong in: the cost is a review somebody did not strictly owe,
 *    against the cost of an unreviewed safety instruction reaching a resident.
 *
 * ⚠️ IF THIS SCANNER SILENTLY RETURNS NOTHING, THE GATE NEVER FIRES. That is the
 *    failure mode worth fearing, so `copyReview.test.js` holds a positive control:
 *    a module known to be on screen today must come back reachable. If the walk
 *    breaks, that control fails before the gate can quietly pass everything.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(HERE, '..');

/**
 * Where a resident's eyes enter the code. `App.jsx` is the router, and everything
 * under `components/` is a surface; `main.jsx` only mounts `App`.
 *
 * ⚠️ A NEW TOP-LEVEL SURFACE DIRECTORY MUST BE ADDED HERE. `copyReview.test.js`
 *    asserts every entry point resolves, so a renamed directory fails loudly, but
 *    a brand-new one nobody lists is invisible to the walk.
 */
export const UI_ENTRY_POINTS = Object.freeze(['src/App.jsx', 'src/main.jsx', 'src/components']);

const SOURCE_EXTENSIONS = ['.js', '.jsx', '.mjs', '.ts', '.tsx'];
const isTestFile = (path) => /\.(test|spec)\.[a-z]+$/.test(path);

/** Static `import`/`export ... from` and dynamic `import()`, relative specifiers only. */
const SPECIFIER_PATTERNS = [
    /(?:^|\n)\s*import\s+[^;'"]*?from\s*['"]([^'"]+)['"]/g,
    /(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g,
    /(?:^|\n)\s*export\s+[^;'"]*?from\s*['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
];

const collectSpecifiers = (source) => {
    const found = new Set();
    SPECIFIER_PATTERNS.forEach((pattern) => {
        // `lastIndex` is shared state on a module-level regex; reset before each file.
        pattern.lastIndex = 0;
        let match = pattern.exec(source);
        while (match !== null) {
            found.add(match[1]);
            match = pattern.exec(source);
        }
    });
    return [...found];
};

/** Resolves a relative specifier the way Vite does: exact, then extensions, then index. */
const resolveSpecifier = (fromFile, specifier) => {
    if (!specifier.startsWith('.')) return null; // a package, not our source
    const base = resolve(dirname(fromFile), specifier);
    const candidates = [
        base,
        ...SOURCE_EXTENSIONS.map((ext) => `${base}${ext}`),
        ...SOURCE_EXTENSIONS.map((ext) => join(base, `index${ext}`)),
    ];
    return candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile()) || null;
};

const filesUnder = (path) => {
    if (!existsSync(path)) return [];
    if (statSync(path).isFile()) return [path];
    return readdirSync(path).flatMap((entry) => filesUnder(join(path, entry)));
};

const isSource = (path) => SOURCE_EXTENSIONS.some((ext) => path.endsWith(ext)) && !isTestFile(path);

/**
 * Every module a resident-facing entry point can reach, as repo-relative POSIX
 * paths, which is the form `reachableWhen` is written in.
 *
 * @param {string[]} [entryPoints] override for tests; defaults to `UI_ENTRY_POINTS`.
 * @returns {Set<string>}
 */
export const reachedByUi = (entryPoints = UI_ENTRY_POINTS) => {
    const seen = new Set();
    const queue = entryPoints
        .flatMap((entry) => filesUnder(resolve(REPO_ROOT, entry)))
        .filter(isSource);

    while (queue.length > 0) {
        const file = queue.pop();
        const key = relative(REPO_ROOT, file).split('\\').join('/');
        if (seen.has(key)) continue;
        seen.add(key);

        let source;
        try {
            source = readFileSync(file, 'utf8');
        } catch {
            continue; // unreadable is not reachable, and is not worth crashing over
        }
        collectSpecifiers(source).forEach((specifier) => {
            const target = resolveSpecifier(file, specifier);
            if (target && isSource(target)) queue.push(target);
        });
    }
    return seen;
};
