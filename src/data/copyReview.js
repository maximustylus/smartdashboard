/**
 * ==============================================================================
 * COPY REVIEW — which translated strings a human has actually read
 * ==============================================================================
 *
 * Every non-English string in this portal is machine-translated. That is a
 * deliberate, reasonable choice: it is fast, the quality is good, and the
 * alternative that `CP26` proved is worse. `chatSteps.js` SKIPS an untranslated
 * question, so English-only copy does not degrade gracefully, it silently stops
 * asking. A machine translation beats a question never asked.
 *
 * What was missing is any record, in code, of which strings a person has read. It
 * lived in `TRANSLATION-BRIEF.md`, a document, which means it drifts and nothing
 * checks it. `CD13` has been open since 2026-08-23 on that basis.
 *
 * ------------------------------------------------------------------------------
 * ⚠️ THE ONE CATEGORY MACHINE TRANSLATION MUST NOT CARRY ALONE
 * ------------------------------------------------------------------------------
 *
 * `COMMUNITY_TODO.md` records the owner's standing rule, in their words: "I have
 * not machine-translated urgent clinical advice and will not." That was written
 * about the chest-pain routing copy, and it generalises to any string whose job is
 * to STOP somebody doing something.
 *
 * The risk is not accuracy. It is that instructions built on negation degrade
 * quietly: "do not try this on your own" can come back as a suggestion rather than
 * a prohibition and still read perfectly well, so a reviewer skimming for accuracy
 * will pass it. And if somebody is hurt, an instruction no human ever read is hard
 * to defend regardless of whether it happened to be correct.
 *
 * So `safetyCritical` strings must be reviewed by a person in every language, or
 * carry an explicit, dated, owner-named waiver. `copyReview.test.js` fails the
 * build otherwise. A new safety-critical string added without either does not ship.
 *
 * The gate fires when a resident can READ the string, which is not the same moment
 * a developer types it. `reachableWhen` and the walk in `scripts/copy-reachability.mjs`
 * decide that against the real import graph, so nothing declares itself exempt. See
 * "WHAT LIVE MEANS" further down for why that is the right trigger.
 *
 * ------------------------------------------------------------------------------
 * WHAT A REVIEW ACTUALLY ASKS
 * ------------------------------------------------------------------------------
 *
 * Not "is this translation accurate". A reviewer answers one question:
 *
 *     Would your mother understand this, and would she know what to do?
 *
 * Accuracy is what machines are good at. Comprehension by a 70-year-old with low
 * health literacy is what they cannot verify, and it is the thing that decides
 * whether this portal works for the residents it was built for.
 */

/** The three languages every string must exist in beyond English. */
export const TRANSLATION_LANGUAGES = Object.freeze(['ms', 'zh', 'ta']);

/**
 * One entry per translated string or tightly-grouped set.
 *
 *   `where`          the module holding it, so a reviewer can find it
 *   `safetyCritical` its job is to stop somebody doing something
 *   `reviewedBy`     per language: who read it and when, or `null` for nobody
 *
 * `null` is the honest default and is not a failure unless `safetyCritical`.
 */
export const COPY_REVIEW = Object.freeze({
    // ── Group 1, shipped 2026-08-23, machine-translated ──────────────────────
    // Screening questions rather than instructions: a mistranslation here collects
    // a wrong answer, which is bad, but it does not tell anybody to do something
    // unsafe. `clinicalFlags.i18n.test.js` already guards the parser side, which
    // was the sharper risk and is where a mistranslation would have recorded every
    // Malay, Chinese and Tamil speaker who had never fallen as having fallen.
    'chips.falls': Object.freeze({
        where: 'src/data/screeningChips.js',
        safetyCritical: false,
        reviewedBy: Object.freeze({ ms: null, zh: null, ta: null }),
    }),
    'chips.healthierSg': Object.freeze({
        where: 'src/data/screeningChips.js',
        safetyCritical: false,
        reviewedBy: Object.freeze({ ms: null, zh: null, ta: null }),
    }),
    'prompt.falls': Object.freeze({
        where: 'src/data/communityChatCopy.js',
        safetyCritical: false,
        reviewedBy: Object.freeze({ ms: null, zh: null, ta: null }),
    }),
    'prompt.healthier_sg': Object.freeze({
        where: 'src/data/communityChatCopy.js',
        safetyCritical: false,
        reviewedBy: Object.freeze({ ms: null, zh: null, ta: null }),
    }),

    /*
      ⚠️ REGISTERED ON 2026-09-13, AFTER SHIPPING — the registry did not know these
         existed. They are the ten lines printed on the handover slip a resident
         carries to a community centre, translated by Gemini for group 4 and never
         entered here, so `reviewDebt` under-reported for weeks and a reviewer
         working from this registry would never have been shown them.

         Found because a cross-check was recorded against them and
         `copyReview.test.js` refused a cross-check for a string it did not know.
         The test was written to catch a typo and caught a gap instead.

      Not safety-critical by the definition used here: they describe a person to a
      staff member rather than instructing the person. They are still the copy most
      likely to be read ABOUT somebody in front of them, which is its own reason to
      get right — and Astra's pass found "on exertion" missing from the chest-pain
      line in all three languages, on the one flag that carries the absolute
      contraindication.
    */
    'slip.flagLines': Object.freeze({
        where: 'src/data/slipFlagLines.js',
        safetyCritical: false,
        reviewedBy: Object.freeze({ ms: null, zh: null, ta: null }),
    }),

    // ── P9 functional measures, WRITTEN AND MACHINE-TRANSLATED, NOT YET ON SCREEN ──
    // All four languages exist in `src/data/measuresCopy.js`. Each is a prohibition,
    // which is the category the owner's standing rule is about, so each carries
    // `reachableWhen`: the gate fires the moment a resident-facing component imports
    // that module, and not before. See `reachableWhen` below for why that, rather
    // than the mere existence of the string, is the right trigger.
    'measures.doNotSelfTest': Object.freeze({
        where: 'src/data/measuresCopy.js',
        reachableWhen: 'src/data/measuresCopy.js',
        safetyCritical: true,
        reviewedBy: Object.freeze({ ms: null, zh: null, ta: null }),
        english: 'Please do not try either test on your own now. These are measured with someone there to help.',
    }),
    'measures.noComparison': Object.freeze({
        where: 'src/data/measuresCopy.js',
        reachableWhen: 'src/data/measuresCopy.js',
        safetyCritical: true,
        reviewedBy: Object.freeze({ ms: null, zh: null, ta: null }),
        english: 'We have kept your number so you can show it to your doctor. We do not have a published range that covers your age, so we are not going to guess one.',
    }),
    'measures.notADiagnosis': Object.freeze({
        where: 'src/data/measuresCopy.js',
        reachableWhen: 'src/data/measuresCopy.js',
        safetyCritical: true,
        reviewedBy: Object.freeze({ ms: null, zh: null, ta: null }),
        english: 'These numbers describe your strength today. They are not a diagnosis, and they have not changed your result above.',
    }),

    // The other 44 strings in that module: the two questions, the band labels, the
    // nine reasons a comparison was refused, the eight places a measurement is
    // taken. Registered as ONE entry rather than 44, because a reviewer reads the
    // module in one sitting and 44 rows would make the sheet unreadable without
    // telling anybody anything the module does not.
    //
    // Not safety-critical, and the distinction is real: a mistranslated band label
    // is wrong, a mistranslated prohibition is dangerous. It still owes a human
    // read, and `reviewDebt` still counts it, which is the whole point of `CD13`.
    'measures.uiCopy': Object.freeze({
        where: 'src/data/measuresCopy.js',
        safetyCritical: false,
        reviewedBy: Object.freeze({ ms: null, zh: null, ta: null }),
    }),
});

/**
 * ==============================================================================
 * A MACHINE CROSS-CHECK IS EVIDENCE. IT IS NOT A REVIEW.
 * ==============================================================================
 *
 * Running a translation back through two INDEPENDENT models is a genuinely good
 * catch-net for the one failure this gate is about. A prohibition that lost its
 * negation comes back, on back-translation, as a suggestion — and a second and
 * third model that never saw the first one's reasoning will usually say so. It is
 * worth doing and worth recording.
 *
 * It is not what the owner's rule asks for, and the difference is not pedantry:
 *
 *   A model checks whether the sentence MEANS the same thing.
 *   A reviewer answers whether a 70-year-old with low health literacy, reading it
 *   on a phone at a community event, would understand it and know what to do.
 *
 * The second question is the one that decides whether this portal works for the
 * people it was built for, and no amount of model agreement answers it.
 *
 * ⚠️ SO A CROSS-CHECK GOES HERE, NOT IN `reviewedBy`, AND IT DOES NOT OPEN THE
 *    GATE. Typing a model's name into `reviewedBy` would turn the build green and
 *    record, permanently and falsely, that a person had read the string.
 *    `copyReview.test.js` rejects a known model name there for exactly that
 *    reason. If you want to ship without a human read, the honest route is a
 *    waiver: it says so out loud, it carries your name and a date, and it is
 *    countable. That is the difference between a decision and an accident.
 */
export const CROSS_CHECKS = Object.freeze({
    /*
      2026-09-13 · Gemini 3.1 Pro, over `docs/CD13-translation-review.xlsx`.

      Two independent passes over the nineteen group 1 and group 4 strings, and the
      disagreement between them is the most useful thing here.

      WHERE THEY AGREED, the change went in: the Malay "no falls" chip, and "GP"
      being an unexplained abbreviation in Malay and Tamil.

      WHERE THEY DISAGREED and neither identified an ERROR, what ships stays. One
      model's fluency preference against another's "this matches the English" is not
      grounds to change copy, least of all parser input. That is the ms and zh
      avoidance chips, and the Malay caregiving line — where Gemini's "Beban"
      (burden) is arguably further from the English "strain" than the shipped
      "Tekanan".

      ASTRA FOUND WHAT A BACK-TRANSLATION CANNOT. That the Malay Healthier SG
      question referred PROGRAMMES TO YOU rather than you to programmes. That "on
      exertion" had been dropped from the chest-pain flag line in all three
      languages — on the one line that carries the absolute contraindication. That
      "belum" says "not YET enrolled". None of those is a mistranslation a
      round-trip would surface; each changes what the reader is told.

      ⚠️ IT ALSO NEARLY BROKE THE PARSER, WHICH IS THE POINT OF RECORDING THIS.
         Two of the six corrections are CHIP TEXT, which is parser input. Applied as
         written they returned `falls=1` for "Tidak pernah jatuh" and
         `avoidsActivity: false` for the reworded avoidance chip. A reviewer reading
         for language cannot see that, and should not have to: it is the code's job
         to survive being corrected. `clinicalFlags.i18n.test.js` catches it, and was
         run with the tokens removed to prove it does.

      ⚠️ THIS COVERS NONE OF THE `measures.*` STRINGS. The workbook it ran against
         predated them. They remain unreviewed and the gate remains red, which is
         why none of them appear below.
    */
    'chips.falls': Object.freeze({
        by: 'Gemini 3.1 Pro + ChatGPT6 Astra', on: '2026-09-13',
        languages: Object.freeze(['ms', 'zh', 'ta']),
        outcome: 'ms chip 1 reworded (both agreed) and ta chip 3 restored to natural '
            + 'wording after the parser was fixed; ms and zh chip 4 left as shipped '
            + 'because the two reviewers disagreed and neither found an error',
    }),
    'chips.healthierSg': Object.freeze({
        by: 'Gemini 3.1 Pro', on: '2026-09-13', languages: Object.freeze(['ms', 'zh', 'ta']),
        outcome: 'no change',
    }),
    'prompt.healthier_sg': Object.freeze({
        by: 'Gemini 3.1 Pro + ChatGPT6 Astra', on: '2026-09-13',
        languages: Object.freeze(['ms', 'zh', 'ta']),
        outcome: 'ms and ta rewritten. Both flagged "GP" as unexplained; only Astra '
            + 'caught that the sentence referred PROGRAMMES TO YOU rather than you '
            + 'to programmes, in two languages',
    }),
    'prompt.falls': Object.freeze({
        by: 'Gemini 3.1 Pro + ChatGPT6 Astra', on: '2026-09-13',
        languages: Object.freeze(['ms', 'zh', 'ta']),
        outcome: 'ms: "lantai" (a floor) widened to "tanah atau lantai", so somebody '
            + 'who fell outdoors is asked about it',
    }),
    'slip.flagLines': Object.freeze({
        by: 'ChatGPT6 Astra', on: '2026-09-13', languages: Object.freeze(['ms', 'zh', 'ta']),
        outcome: 'eleven of the thirty lines rewritten: "on exertion" restored in all '
            + 'three, zh caregiving un-narrowed from family care, food insecurity put '
            + 'into plain words in all three, "belum" (not YET enrolled) corrected',
    }),
});

/**
 * A safety-critical string knowingly shipped without review, with an owner and a
 * date. Not a loophole: it is how a conscious decision is distinguished from an
 * oversight, and every waiver is visible and countable.
 *
 * ⚠️ A WAIVER IS A DEBT, NOT A RESOLUTION. Adding one is a deliberate act by the
 *    person named in it. Empty is the correct state.
 */
export const REVIEW_WAIVERS = Object.freeze({});

/** Strings whose job is to stop somebody doing something. */
export const safetyCriticalKeys = () => Object.keys(COPY_REVIEW)
    .filter((key) => COPY_REVIEW[key].safetyCritical);

/**
 * Names that are not people. Not exhaustive and cannot be: it catches the obvious
 * mistake rather than policing the field, which is the right ambition for a check
 * whose job is to stop somebody typing "Gemini" into a box labelled "who read this".
 */
export const NOT_A_PERSON = Object.freeze([
    'claude', 'gpt', 'chatgpt', 'gemini', 'astra', 'llama', 'mistral', 'copilot',
    'deepl', 'google translate', 'machine', 'model', 'bot', 'llm',
]);

/**
 * ⚠️ "AI" IS CHECKED CASE-SENSITIVELY, AND THAT IS NOT FUSSINESS. Lower-cased with
 *    the rest, `ai` refuses a reviewer called **Ai Ling** — a common Chinese given
 *    name, in a portal whose whole point is serving Chinese speakers. A check about
 *    robots that turns away a real Singaporean reviewer has failed at the only job
 *    that matters. It was written that way first and the test caught it.
 */
const UPPERCASE_ONLY = Object.freeze(['AI']);

/** Whether a `reviewedBy` entry names something that is not a person. */
export const looksLikeAModel = (name) => {
    const raw = String(name ?? '').trim();
    if (raw === '') return false;
    const bounded = (token, haystack) => new RegExp(`(^|[^A-Za-z])${token}([^A-Za-z]|$)`).test(haystack);
    if (UPPERCASE_ONLY.some((token) => bounded(token, raw))) return true;
    return NOT_A_PERSON.some((token) => bounded(token, raw.toLowerCase()));
};

/** Languages in which `key` still has nobody's name against it. */
export const unreviewedLanguages = (key) => {
    const entry = COPY_REVIEW[key];
    if (!entry) return [...TRANSLATION_LANGUAGES];
    return TRANSLATION_LANGUAGES.filter((lang) => !entry.reviewedBy[lang]);
};

/**
 * A string declared here before its copy exists anywhere. Registering early is what
 * arms the gate ahead of the writing, rather than hoping somebody remembers the rule
 * afterwards.
 */
export const isPending = (key) => Boolean(COPY_REVIEW[key]?.where?.includes('pending'));

/**
 * ==============================================================================
 * WHAT "LIVE" MEANS, AND WHY IT IS NOT "THE STRING EXISTS"
 * ==============================================================================
 *
 * The gate protects residents, so it should fire when a resident can READ a string,
 * not when a developer has typed one. Those are different moments, and the gap
 * between them is where the measures copy sits right now: written in four
 * languages, imported by nothing.
 *
 * Blocking on existence alone would make the build red for weeks while the entry
 * screen and report tiles are built, protecting nobody, and a permanently red build
 * is a gate everybody learns to ignore. Blocking on nothing at all is how `CD13`
 * sat in a document for months.
 *
 * So an entry may name `reachableWhen`: the module whose import by a resident-facing
 * component makes its strings readable. `copyReview.test.js` resolves that against
 * the actual source tree, so nobody declares their own copy unreachable. The build
 * goes red the moment the UI lands, which is exactly when a reviewer is needed.
 *
 * ⚠️ UNKNOWN REACHABILITY COUNTS AS REACHABLE. A caller that cannot check the file
 *    system gets the cautious answer, so a gate that loses its evidence fails shut
 *    rather than quietly passing everything.
 */
const isLive = (key, reachedByUi) => {
    if (isPending(key)) return false;
    const { reachableWhen } = COPY_REVIEW[key];
    if (!reachableWhen) return true;
    if (!reachedByUi) return true; // fail shut, see above
    return reachedByUi.has(reachableWhen);
};

/**
 * Safety-critical strings that are LIVE and neither reviewed nor waived. Anything
 * in here fails the build, which is the entire point.
 *
 * @param {Set<string>} [reachedByUi] modules a resident-facing component imports.
 *   Omit it and every `reachableWhen` string is treated as reachable.
 */
export const blockingReviewGaps = (reachedByUi) => safetyCriticalKeys()
    .filter((key) => !REVIEW_WAIVERS[key] && isLive(key, reachedByUi))
    .map((key) => ({ key, missing: unreviewedLanguages(key) }))
    .filter((gap) => gap.missing.length > 0);

/** Modules named by `reachableWhen`, for a caller that has to go and check them. */
export const reachabilityWatchlist = () => Object.freeze([...new Set(
    Object.keys(COPY_REVIEW).map((k) => COPY_REVIEW[k].reachableWhen).filter(Boolean),
)]);

/** Everything still owed a human read, safety-critical or not. This is `CD13`. */
export const reviewDebt = (reachedByUi) => Object.keys(COPY_REVIEW)
    .map((key) => ({
        key,
        safetyCritical: COPY_REVIEW[key].safetyCritical,
        live: isLive(key, reachedByUi),
        missing: unreviewedLanguages(key),
    }))
    .filter((row) => row.missing.length > 0);
