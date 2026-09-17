# NEXUS Community Portal — Remediation Ledger

**This file is the plan and the live status.** The finding text behind each `CP` row was
`POSTMORTEM-COMMUNITY.md`, a frozen 2026-08-21 snapshot, removed on 2026-09-06 and
readable at tag `docs-archive-2026-09-06`. AURA — the AI behind the chat pathway — has its
own ledger in [AURA-TODO.md](AURA-TODO.md) (`AU`n / `AC`n / `AN`n). Three things there bear directly on this
ledger: `AU13` corrects `CP12`'s `Math.random` evidence string, which was false as
written (row 4.6 now says what the grep returns; the code half of `AU13` closed on 2026-09-06 in `9c8ce15`);
`AC1`/`AC2` are the PAVS parser defects `P4.3` had `OPEN` for weeks — **closed 2026-08-23
(`a99ffa6`, 70 tests)**, with `parseClinicalData` extracted to `src/utils/clinicalParse.js`
under `AC5`; and `AN13` found that feed **comments** bypassed the PDPA guard that posts
are fenced by — closed 2026-08-24. This file is the plan; the post-mortem is the finding.

**Scope: the `/individuals/*` surface and nothing else.** Five routes, the two
pathways that feed them, and the Cloud Function behind the chat. The roster side has
its own ledger in [ROSTER_TODO.md](ROSTER_TODO.md) and the two do not share ids.

**Ledger rule, inherited from the roster ledger and not softened:** an item is `DONE`
only when the Evidence column holds **real, pasted output** — a test name and count, a
grep that returns zero, a commit sha whose diff can be read. *"The code was edited"* is
not evidence. A row marked `DONE` on the strength of an edit is the failure that
ledger rule exists to prevent, and it has happened in this repository before.

---

## Ids

**[IDS.md](IDS.md) is the legend for every prefix in the document set** — `P`, `Q`,
`A`–`E`, `A-RC`, `M`, `CP`, `CD`, `T` — including the one letter that means three
different things. The two series this file uses:

| Prefix | Means | Who closes it |
|---|---|---|
| **`CP`**n | a **defect** in the community portal | me |
| **`CD`**n | a **decision** that is the owner's, not mine | Alif |

`CP` numbers track the post-mortem's `§3.x` sections one-for-one, so `CP9` is `§3.9`.
That mapping is fixed and will not be renumbered — the roster ledger's worst problem is
an id that came to mean three different things, and the way to not have that problem is
to never reuse a number.

---

## ⚠️ The two things to read first

**1. Three of these are clinical, not technical.** `CD4`, `CD10` and `CD11` change what
a member of the public is told about their own health. I have deliberately not
implemented them. They are marked `OWNER` and they are not blocked on engineering time.

~~**2. Nothing here is deployed.** Every `DONE` row below is on a branch. The community
portal that members of the public can reach today still has `CP1` — the risk score that
never measured activity — live in it.~~ **Deployed.** The community branch merged to
`main` on 2026-08-25 (`2ba1c15`) and shipped in app v2.1.2/v2.1.3; the v2.1.3 lay-language
pass is in `CHANGELOG.md`. `CP1` is fixed on the live portal. *(Struck 2026-09-03 — this
sentence told a reader for nine days that a broken clinical score was live to the public.)*

---

## Status

| | Count | Ids / rows |
|---|---|---|
| `DONE`, evidenced | 41 | `CP1`–`CP3` `CP5`–`CP7` `CP9` `CP12`–`CP19` · `CP20`–`CP29` · `CP31`–`CP39` · `CP40`–`CP44` (v2.15.0) · `CP28` (v2.15.2) · `CP45` `CP46` `CP47` (on `community`) |
| `OPEN`, mine | 1 | `CP30` (the report's page 1 is 2px from clipping, worst-case English) |
| `OWNER DECISION`, console only | 1 | `CP7`'s last two steps — see *Turning App Check on*, below. The code is shipped and inert. |
| `OPEN`, translation | 1 | `CP10`/`CD10` groups 2, 3 and the rest of 4 — group 1 and the slip's flag lines are shipped, see `7.7` |
| `OWNER DECISION`, content governance | 1 | `CP8`: name the content owner, review interval and stale-claim action. |
| `OWNER DECISION` | 10 | `CD4` `CD10` `CD11` `CD12` (design) `CD13` (translation review) · `CD14`–`CD16` (consent, referral partner, retention) · `CD21` `CD23` (the two functional-measures decisions still open) |
| **Waived, not reviewed** | 5 | `measures.doNotSelfTest` `noComparison` `notADiagnosis` (2026-09-13) · `measures.hrCaution` `hrSuppressedSymptoms` (2026-09-15). Safety instructions live in ms/zh/ta that **no native speaker has read**, shipped on the owner's signature. `CD26` `CD27` `CD28` are settled. |

> ⚠️ **This table is the authoritative status for this surface.** `COMMUNITY_CHANGELOG.md`
> carries an older *Known issues* table under its v2.1.2/2.1.3 entry; that one is a frozen
> record of what that release knew and is labelled `HISTORICAL`. Read this one.
> Last reconciled against the ledger body and the code: **2026-09-16, at v2.15.0.**

**`CD13` opened 2026-08-23** — a native-speaker review of the 19 strings already
shipped in ms/zh/ta. Everything translated so far is machine output (group 1 by
Claude, the slip's flag lines by Google Gemini 3.1 Pro) and no person who reads
those languages has checked any of it. See `7.7`.

**`CP13` is fixed.** The portal wrote a health profile to a database while showing
the person no disclaimer and no privacy notice on screen — both rendered off-screen
inside a PDF template most people never download. Both are now on the page, and a
collection notice appears *before* either pathway starts rather than after the
record is written. Both are still English-only, which is `CD10` and is yours.

---

## P0 — The shared AI endpoint · `CP6` + `CP7` · risk: **high** · **SHIPPED** (bar App Check)

Everything else in this file is about what one member of the public is told. This is
about what *anyone on the internet* can reach, and it leads for that reason.

The public chat calls `chatWithAura` — **the same callable the internal staff assistant
uses** (`AuraChat.jsx:11`, `AuraPulseBot.jsx:57`). It has no `request.auth` check and no
App Check, and its `systemInstruction` is the staff-facing `AURA_SYSTEM_PROMPT` naming
KKH/SingHealth and printing the internal Firestore schema under a `MODE 3: DATA ENTRY
AGENT` heading.

| # | Item | Detail | Tier | Status | Evidence |
|---|---|---|---|---|---|
| 0.1 | Public callable, separate prompt | **`communityAck`** replaces `publicTriageChat` in `functions/index.js`. No KKH framing, no schema, no modes. It takes `{domain, answer, priorAnswers, language}` — **no caller-supplied prompt, no `role`, no `history`, no attachments** — and returns plain text. `WELL_WELL_PROMPT` moved out of the browser and onto the server, so the persona can no longer be replaced by the caller. | Fable-supervised | `DONE` | `functions/communityAck.js` + 41 tests |
| 0.2 | `request.auth` on `chatWithAura` | **DONE**, and the demo is now a real sandbox rather than a claimed one. Demo Mode called this function unconditionally — `isDemo` only chose the prompt text — so a visitor with no account, arriving from the *signed-out* landing page, sent their typing to Gemini on the project's billed key. `src/utils/demoAura.js` answers demo turns locally, deterministically and in the same object shape the component parses, so the mode badge, the document-export card and the wellbeing-log prompt all still work. With nothing unauthenticated left calling it, `chatWithAura` now refuses a caller with no `request.auth`. | Fable-supervised | `DONE` | 26 tests · the only remaining call site is the authenticated branch of `AuraPulseBot` |
| 0.3 | App Check + rate limit on the public callable | `CP7`. **The rate limit is live.** Two ceilings per hour: 300 calls per caller (600 once attested) and 6,000 across the whole endpoint as a circuit breaker, warning in the log at half. Counters live in `rate_limits`, keyed by a **hashed** caller key with the window in the document id — so a window self-resets whether or not any job runs, and the nightly sweep only removes the residue. **App Check is shipped but inert**: the client initialises it only when `VITE_APPCHECK_SITE_KEY` is set, the function enforces it only when `ENFORCE_APP_CHECK=true`, and until then an unattested caller simply gets the tighter ceiling and is counted in the logs. The two remaining steps are console work — see *Turning App Check on* below. | Opus-alone | `DONE` (code) · `OWNER` (console) | `functions/rateLimit.js` + **46 tests** |
| 0.4 | Validate content, not only length | `domain` and `language` are closed sets checked as closed sets. `priorAnswers` is **rebuilt** from the known domain list rather than filtered, so a caller cannot influence the shape of what reaches the model — only the values of at most thirteen known keys. `prompt`/`role`/`history`/`attachments` are ignored entirely, asserted by test. | Opus-alone | `DONE` | `functions/communityAck.test.js` — 41 tests |
| 0.5 | Abort on the discard window | `AuraChat.jsx` gives the model 1,500 ms then discards the answer without aborting, so it runs to completion server-side and bills in full. Reduced but not fixed: the server timeout is now 20s rather than 90s and the output cap 200 tokens rather than 8192. ⚠️ **This is `AC8`, which `AURA-TODO.md` 4.4 closed by correcting the finding**: `httpsCallable` carries no cancellation signal, so aborting in the client cannot stop the Cloud Function — the prescribed fix would not do what this row says. The 20s/200-token bounds *are* the fix. | Opus-alone | `DONE` (as `AC8`) | `AURA-TODO.md` 4.4 |
| 0.6 | Close the dead endpoints | `publicTriageChat` — 145 lines, unauthenticated, interpolated `request.data.language` into its own system instruction with no allowlist, **and had no callers**. Its body is gone; the **export deliberately remains as a stub that throws**. ⚠️ Deleting the source does not delete the deployed function, and `deploy.yml:37` runs `deploy --only functions,firestore:rules` with no `--force` on a TTY-less runner — firebase-tools ABORTS on an orphan rather than skipping it, which would half-apply the merge (rules land, `communityAck` does not, the auth check does not, Hosting never runs, and every later push fails the same way). `src/utils/auraChat.js` deleted outright — it is client code and deploys with the bundle. | Opus-alone | `DONE` | export diff vs `origin/main` shows **additions only**, so no deletion prompt |


### Turning App Check on — the console work the code cannot do

The code for this shipped inert, on purpose, and the ORDER below is the whole
reason. Enabling enforcement on the function before the client sends tokens takes
the public screening offline nationally, and from a browser it looks exactly like an
outage. Enabling it in the client before a site key exists throws on every page load.

1. **Firebase console → App Check → Apps → register the web app** with a reCAPTCHA
   Enterprise provider. Copy the site key.
2. **GitHub → Settings → Secrets and variables → Actions → Variables**, add
   `VITE_APPCHECK_SITE_KEY`, then push to `main`. Tokens start flowing. Nothing is
   enforced yet, so nothing can break — this step is safe on its own.
   *(A site key is served to every browser and is not a secret, so it is a
   repository **variable**. The deploy workflow reads it into the build; unset, it
   is an empty string and the App Check block in `src/firebase.js` does nothing.)*
3. **Watch the logs.** `communityAck` logs `appCheckVerified` on every call. Wait
   until it is ~100% over a period that includes a real weekday. Anything short of
   that is a browser, a device or a cache that would be refused in step 4.
4. **Add the repository variable `ENFORCE_APP_CHECK=true`** and push. The deploy
   workflow writes it into `functions/.env`, which is what firebase-tools reads to
   set a v2 function's environment. Only now does an unattested call fail.

**Optionally, and worth doing at step 2: add the repository SECRET `RATE_LIMIT_SALT`**
— any value at all, as long as it is not in this repository. The counter document ids
contain a hash of the caller's address; with the built-in salt that is obfuscation
rather than anonymisation, since the IPv4 space is small enough to enumerate. One
secret makes the tokens genuinely irreversible. A **secret**, not a variable, and
`functions/.env` is gitignored for the same reason: a salt that lives in git is not a
salt. The reasoning is in `functions/rateLimit.js`, stated as a limitation rather than
left implied.

**Rotating the salt is free.** Every counter is at most an hour old and the nightly
sweep removes the rest, so changing it costs one window of counting, not a migration.

**Rollback at any point is the reverse and is immediate**: set `ENFORCE_APP_CHECK` to
anything other than `true` (or delete the variable) and push. The rate limit is unaffected either way — it does not depend on App
Check, it only gives an attested caller a higher ceiling.

---

## P1 — Clinical correctness · `CP1` `CP2` `CP9` · risk: high · **SHIPPED**

The three that changed what a person was told about their own health.

| # | Item | Detail | Tier | Status | Evidence |
|---|---|---|---|---|---|
| 1.1 | PAVS weekly minutes | `CP1`. `scoring.js` compared **per-session** minutes against the 150 **min/week** benchmark. `MINS_MIDPOINT` maxes at 65, so the threshold could never be met and every respondent was charged the inactivity point — including one doing 390 min/week, who was shown "Moderate Risk" beside a banner congratulating them. | Opus-alone | `DONE` | `35f46ad` · `src/utils/scoring.test.js` 9 tests, was 0 |
| 1.2 | Missing data scored as health | `CP2`. Absent fields coerced to a passing value. Now `asNumber()` returns `null` and `null` counts as a deficit, not as fitness. | Opus-alone | `DONE` | `35f46ad`, same suite |
| 1.3 | The isolation tier routed to nothing | `CP9`. The shared `selectCTA` ranks `SOCIAL_CARE` **second**, behind only chest pain. `ResultPage` had no banner for it and both read sites fall back to `START`, so an isolated resident 60+ was told *"Download the Healthy 365 app"* and the CareLine referral vanished silently. Banner composed only from copy already reviewed in the same file. | Opus-alone | `DONE` | `189a61b` · `src/utils/ctaRouting.test.js` verifies every shared tier has a banner and resource plan |

---

## P2 — Privacy · `CP3` `CP5` · risk: high · **SHIPPED**

| # | Item | Detail | Tier | Status | Evidence |
|---|---|---|---|---|---|
| 2.1 | Stop fingerprinting | `CP3`. `telemetry.js` wrote `clientReference: navigator.userAgent` on a screen that told the public the record was de-identified (`ResultPage.jsx:758`). Removed. | Opus-alone | `DONE` | `301bb5a` |
| 2.2 | Close the read rule | `CP5`. `community_assessments` allowed `read: if isSignedIn()` — every signed-in staff member could read the public's health records. Grep proved no reader exists. Now `if false`. | Opus-alone | `DONE` | `301bb5a` · `45323f2` · re-verified 2026-08-23: **101 emulator checks, 0 failed** |

---

## P3 — What the portal says · `CP10` + `CD4` `CD10` `CD11` · risk: high

**Three of these four are the owner's call and are not blocked on me.**

| # | Item | Detail | Tier | Status | Evidence |
|---|---|---|---|---|---|
| 3.1 | Translate the urgent CTA copy | `CP10`/`CD10`. The in-chat card renders `primaryStep`, `healthierSG` and `resources` raw from a flat English object; only labels are translated. A Tamil speaker reporting chest pain reads *"call 995"* in English. `ResultPage`'s `CTA_BANNER` already has reviewed `ms`/`zh`/`ta` for the same tiers and is the source to adapt from. **I have not machine-translated urgent clinical advice and will not.** | **OWNER** | `OPEN` | — |
| 3.2 | Split the cardiac question | `CD11`. `AuraChat.jsx:241` asks two things at once with single-tap chips, so high blood pressure **and** exertional chest pain cannot both be recorded. Tap the condition and `symptomFlag` is false — the person loses URGENT and is routed to a paid exercise programme. The form pathway records both correctly. Splitting it changes the instrument. | **OWNER** | `OPEN` | — |
| 3.3 | Decide the URGENT tier | `CD4`. The red-flag tier's resource list includes an exercise programme. My recommendation: its own resource set with no exercise in it, and its own visual treatment. Yours to decide. | **OWNER** | `OPEN` | — |
| 3.4 | Resource freshness contract | `CP8`. The dead seeded inventory and its unsupported *"VERIFIED RESOURCE INVENTORY"* framing are gone (`CP16`), but live ResultPage, handover and chat copy still make maintainable claims such as programme availability, price, eligibility, phone service and opening arrangements. Before code can enforce freshness, the owner must name the accountable content role, review interval and stale-claim action (hide, reduce to an official finder, or fail a release check). A deploy date cannot serve as review evidence. | **OWNER** | `OWNER DECISION` | `ffca5dd` establishes the importable live ResultPage registry and removes the false seed timestamp; policy remains unset |

---

## P3b — Found by the deep audit · `CP13`–`CP17` · risk: **high**

A 158-agent adversarial sweep of the portal returned 75 verified findings after my
own pass was written. These five are the ones I re-verified myself and that change
what a member of the public sees. **`CP16` corrects `CP8` above.**

| # | Item | Detail | Tier | Status | Evidence |
|---|---|---|---|---|---|
| 3b.1 | **No disclaimer and no privacy notice on screen** | `CP13`. Both the *"Important Medical Disclaimer"* (`ResultPage.jsx:746`) and the full data-governance text (`:782`) sit **four to five divs deep inside the off-screen PDF template** opened at `:636` with `position:absolute; top:-10000px`. Neither renders on the visible page. On screen the form pathway offers one half-sentence, on step 4 of 4, after the health questions are already answered (`ConventionalForm.jsx:253`). **The chat pathway offers nothing at all** — `grep -ci "de-identified\|privacy\|consent\|we collect" AuraChat.jsx` returns `0`, and it writes age band, gender, ethnicity, housing, postal sector and four health flags. | Fable-supervised | `DONE` | `MedicalDisclaimer` + `DataGovernance` render on the visible page; `PathwaySelection` carries a collection notice **before** either pathway starts. English only — `CD10`. |
| 3b.2 | **"Green" tells people below the guidelines that they meet them** | `CP14`. `greenDesc` is *"You meet the physical activity guidelines."* The tier comes from the **risk score**, not from PAVS: `getRiskTier` returns Green for 0–1. Someone at 100 min/week who strength-trains twice a week scores exactly 1 → Green → told they meet guidelines, **on the same screen where `getPavsTier(100)` renders `below`**. | Opus-alone | `DONE` | Green now uses `pavsBelowDesc` — already translated in all four languages — when the figure is below target |
| 3b.3 | **Chat flags are unanchored substring regex** | `CP15`. `AuraChat.jsx:516-530` tests raw free text. `/low/` is unanchored, so *"I walk slowly but I feel great"*, *"I follow a routine"* and *"I allow myself rest days"* all flag as **psychological distress** and route to the WELLBEING tier. It is also negation-blind: *"I do not get chest pain"* sets `symptomFlag` and triggers URGENT. Both directions over-triage, which is the safe way to be wrong — but it is wrong, and it is the tier ladder's input. | Opus-alone | `DONE` | `src/utils/clinicalFlags.js` · 46 tests · plus a linkage bug of my own finding, below |
| 3b.4 | **The seeded resource collection reached nobody** — ⚠️ **corrects `CP8`** | `CP16`. The unused 22-record Firestore seed was retired. Its `lastVerified` value was the time the seed ran, not evidence of a human review, and `publicTriageChat` is a closed stub that reads no Firestore. ResultPage now consumes the importable 16-record `COMMUNITY_RESOURCES` registry and pure `generateCommunityResourcePlan`; existing ids, translations, URLs, route order, deduplication, regional additions and six-card cap are preserved. The broader freshness policy remains `CP8`. | Opus-alone | `DONE` | `ffca5dd` · `src/data/communityResources.test.js` (2) + `src/utils/communityResourcePlan.test.js` (22) + focused related suites: **122 passed** · full `npm test`: **112 files, 3745 passed** · `npm run build` and `npm run lint` passed · `rg "firestore_seed|lastVerified|verifiedBy" src functions scripts firestore.rules` → 0 |
| 3b.5 | **The page is not usable by the people it targets** | `CP17`. `index.html:5` sets `maximum-scale=1.0, user-scalable=no` — **pinch-zoom is disabled portal-wide** on a tool explicitly built for elderly users. `index.html:2` is `<html lang="en">` and never changes, so a screen reader announces Malay, Chinese and Tamil content as English. | Opus-alone | `DONE` | `user-scalable=no` removed; `src/utils/language.js` sets `<html lang>` on every screen · 16 tests |

**The audit returned 70 further findings** — clinical safety, reliability, correctness
and the resource registry — at `/tmp/…/tasks/wem72mlov.output`. They are not
transcribed here because I have not personally verified them, and this ledger's
evidence rule does not allow rows I have not checked.

---

## P3c — Found while fixing `CP15` · `CP18` · risk: **high** · **SHIPPED**

| # | Item | Detail | Tier | Status | Evidence |
|---|---|---|---|---|---|
| 3c.1 | **A returning respondent's record linkage was silently discarded** | `CP18`. "Have you done this before?" was read with `/(no\|none\|tidak\|tiada\|没\|无\|不\|இல்லை)/i` over the raw answer — an unanchored substring test, like the flags. Assessment ids are base-36 uppercase, so an id **containing** the letters "no" was read as the word "no": `NX-XKNO4J2`, `NX-A3NONE1` and `NX-KZ1NOV8` all had `previousId` set to `null`. The person typed their id in, the page told them nothing, and the longitudinal link the portal advertises was dropped. `isNoPreviousId` now recognises an id by shape before testing for a negative word. | Opus-alone | `DONE` | 4 ids that used to be discarded, now kept |

---

## P3e — The RHS asks, settled · **SHIPPED**

Decisions taken by the owner, recorded so the reasoning survives:

| | Decision |
|---|---|
| **Consent model** | **No contact pathway.** NEXUS recommends; it does not refer. No consent-to-refer, partner queue, closed-loop tracking or re-contact exists. The screening flow collects no resident account or contact details; this does not establish a legal de-identification status. `CD5` is settled on that narrower basis. |
| **Retention** | **24 months**, stated in both public notices and enforced nightly by `expireCommunityAssessments`. |

| # | Item | Status | Evidence |
|---|---|---|---|
| 3e.1 | Retention enforced, not just stated | `DONE` | `functions/retention.cjs` · 26 tests · a test asserts the constant and both notices state one number |
| 3e.2 | Evidence page corrected (`CP20`) | `DONE` | five of seven rows rewritten to what is administered |
| 3e.3 | Caregiver strain its own domain | `DONE` | split in 4 languages from existing wording · routes to `caregiverSupport` |
| 3e.4 | Falls & function for 60+ | `DONE` | `parseFallsAnswer` · routes ahead of the activity route · "No falls" pinned |
| 3e.5 | Healthier SG enrolment | `DONE` | `parseHealthierSg` · `null` for "not sure" AND "not asked", never `false` |
| 3e.6 | Printable handover slip | `DONE` | `HandoverSlip.jsx` + print CSS · **49 tests**, most of them about what it does NOT claim. Print output verified in headless Chromium after `CP21`: **one A4 page**, slip at 0,0, 0 stray controls. ⚠️ Now **bilingual** in the Reported block — English first, the person's language beneath (`CD10` group 4). Re-measured: one page to **five** reported flags, two from six, where English-only reached eight. Both pages carry content; this is not `CP21`'s blank-page defect. |

**Not built, because the consent decision forecloses them:** partner-facing queue,
closed-loop referral status, re-assessment recall, proxy/assisted mode with an
identified handoff. If the model ever changes, `HandoverSlip.jsx` is where a real
reference number would go and where the "this is not a referral" notice would come
out — that file carries the note.

⚠️ **Still open from the review, and still the owner's:** `CD10`. The falls and
Healthier SG questions, the disclaimer, the privacy notice and the printed slip are
all **English-only**. `src/utils/chatSteps.js` skips a question the active language
cannot render, so nobody is asked something they cannot read — but a Malay, Chinese
or Tamil speaker currently gets a shorter assessment and an English slip. Adding a
translation is one line per question.

---

## P4 — Structure · `CP12` + the duplication · risk: low

Cheap, and each one removes a way the portal can drift back into a P1.

| # | Item | Detail | Tier | Status | Evidence |
|---|---|---|---|---|---|
| 4.1 | One theme key | `CP12`. A prior *"FIX 1"* changed three files to `nexus-theme` and left four on `nexus_theme`, including `App.jsx`, which owns the class on `<html>` — splitting the setting along the pathway gate rather than unifying it. | Opus-alone | `DONE` | `189a61b` · `src/utils/theme.js` |
| 4.2 | Share `selectCTA` and the tier table | ~~Two copies kept in agreement by a comment that was already false (`CP9`).~~ `src/utils/ctaRouting.js` now owns the route precedence and route-to-tier table. Chat and form both call it; the form now preserves the established `SOCIAL_CARE` priority for an isolated respondent aged 60+. The source-scanning parity test was replaced by direct contract and ResultPage coverage tests. | Opus-alone | `DONE` | `src/utils/ctaRouting.test.js` — **18 tests**; focused Community run — **73 passed**; `npm run build` — pass; `npm test` — **110 files / 3,721 tests passed**; `npm run lint` — pass, 0 warnings |
| 4.3 | Test the remaining pure logic | ~~`deriveFlags` and `parseClinicalData` have no tests.~~ `parseClinicalData` was extracted to `src/utils/clinicalParse.js` with tests under `AC5` (`AURA-TODO.md` 4.6). The form derivation is now exported from `src/utils/formClinicalData.js`; the component calls that tested function for previews and submission. | Opus-alone | `DONE` | `src/utils/formClinicalData.test.js` — **32 tests**; focused derivation + pathway parity — **55 passed**; `npm run build` — pass; `npm test` — **110 files / 3,708 tests passed**; `npm run lint` — pass, 0 warnings |
| 4.4 | Persist in-progress state | `CP12`. **`sessionStorage`, not `localStorage`** — the portal runs on community-centre terminals and clinic tablets, and answers about food insecurity and psychological distress left for the next person are identifying in practice. The result is mirrored on arrival and restored before the redirect effect runs; both pathways resume mid-assessment; `clearAssessment()` wipes id, answers and result together. | Opus-alone | `DONE` | `src/utils/assessmentSession.js` · 15 tests |
| 4.5 | `path="*"` route | `CP12`. `firebase.json` rewrites everything to `index.html`, so a mistyped URL loaded the whole SPA and rendered **nothing** — a blank page, indistinguishable from a broken site, for visitors arriving from a QR code or a forwarded link. | Opus-alone | `DONE` | `NotFound.jsx` · 14 tests asserting the wildcard cannot shadow a real route, against react-router's own matcher |
| 4.6 | One session id | `CP12`. **Five** were minted — the four screens plus a fallback in `ResultPage` — and all were shown as *"ID:"*. The one written to Firestore was the third, so an id quoted off any other screen matched nothing in the record, on a portal that invites returning respondents to type a previous id in. | Opus-alone | `DONE` | `getSessionId()` · `grep Math.random src/components/` returns **one hit, not a session id**: `AuraGreeting.jsx` (picks a quote). *(Two until 2026-09-06 — `AuraPulseBot.jsx`'s anonymous wellbeing-log key, `AU13`, closed in v2.12.3.)* *(Corrected 2026-09-03: this cell said "returns nothing", which was false — `AU13`'s own subject, and the document set's worked example of an evidence string that outran its grep.)* |

---

## Manual, once — retiring the stub

`publicTriageChat` is closed but still deployed, for the deploy-safety reason in
`P0.6`. To remove it properly, after the branch has merged and deployed cleanly:

```
firebase functions:delete publicTriageChat --project idc-app-e0c59 --force
```

Then delete the stub block from `functions/index.js`. **Do not** add `--force` to
`deploy.yml` instead — it also suppresses the unsafe-trigger-migration,
min-instance-billing and service-account confirmations, permanently, for every
future deploy.

---

## P3d — From the Regional Health System review · `CP19` `CP20` · risk: **high**

An RHS lead weighted toward social prescribing reviewed the portal — see
`REVIEW-RHS-SOCIAL-PRESCRIBING.md` at tag `docs-archive-2026-09-06`. Two findings
are defects rather than opinions and are verified.

| # | Item | Detail | Tier | Status | Evidence |
|---|---|---|---|---|---|
| 3d.1 | **The chat's postal sector is the chip's example, not the person's** | `CP19`. The form asks for the real first two digits; the chat offers region chips and `parseClinicalData` runs `locStr.match(/\d{2}/)` over the LABEL. So `'North (e.g. 73, 75)'` records sector **73** for everyone who taps North — and `getRegionalHealthSystem` then picks which RHS's resources to show from that. The geographic data collected "for population-level resource planning" is four constants from the chat pathway, and the two pathways are not comparable. | Opus-alone | `DONE` | `src/utils/singapore/` — all **81** live sectors, 28 districts · 52 tests · chips carry no digits in any of the four languages · unknown stays `null` end to end |
| 3d.2 | **The evidence page claims more instrument than is administered** | `CP20`. The PDF cites the **Lubben Social Network Scale (LSNS-6)** with an alpha coefficient, and a **PHQ-2 aligned** wellbeing domain. LSNS-6 is six items and PHQ-2 is two; the portal asks **one** question each. A one-item screen is defensible — citing a validated multi-item scale beside it, to the public, with a reliability statistic attached, is not. Either administer it or cite it as *"adapted from"* and say how. | **OWNER** | `OPEN` | `ResultPage.jsx` evidence block vs `DOMAIN_CONFIG` |

**Also raised, as design rather than defect** — recorded here so they are not lost:
caregiver strain is merged into one wellbeing chip with financial pressure (the highest
value entry point in social prescribing, currently invisible); the 60+ cohort is screened
on PAVS with no falls or frailty question; and the URGENT tier hands off to nobody. The
review's central argument — that social prescribing needs a consent-to-refer path and a
human on the other end, which the absence of contact details forecloses — belongs with
`CD5` in `P5`.

---

## P6 — Result page revamp · `CD12` · **owner's design direction** · risk: low

The traffic-light result screen and everything it exports should follow the house
style: **liquid glass, rounded containers and boxes, clean and modern**. Recorded
here rather than done on the spot because it touches the one screen a member of
the public actually keeps.

| # | Item | Detail | Tier | Status |
|---|---|---|---|---|
| 6.1 | The result screen | **`DONE`** — `src/utils/glass.js` is the surface vocabulary; the hero, cards, panels, flag rows, resource cards and controls all use it. ⚠️ The tier label moved onto a dark frosted panel because the old treatment measured **1.51:1** on amber — see below. | Fable-supervised | `DONE` |
| 6.2 | The downloaded PDF | Currently a `html2canvas` raster of a hidden template with its own hardcoded inline styles — a **second, divergent design** that no change to the screen ever reaches. It should follow the same system. | Fable-supervised | `OPEN` |
| 6.3 | The share output | `selectCTA`-driven share text today. Should carry the same visual identity where the surface allows one. | Opus-alone | `OPEN` |

**⚠️ What the restyle found, and it was not cosmetic.** `src/utils/contrast.js`
composites each surface over the tier behind it and measures it. The old screen:

| Pair | Ratio | |
|---|---|---|
| The tier chip (`bg-white/20`) over amber | **1.51 : 1** | the person's own result, effectively unreadable in daylight |
| White directly on amber-400 | 1.67 : 1 | |
| White directly on emerald-400 | 1.92 : 1 | |
| White directly on rose-500 | 3.67 : 1 | large text only |

AA for normal text is 4.5:1. `ON_COLOR` is 55% slate-900 — the **lowest** opacity
that clears 4.5:1 on all three tiers while still letting the colour read through
(amber, the worst, lands at 5.79:1). `contrast.test.js` re-measures on every run,
so a lighter glass fails `npm test` and names the tier.

**⚠️ And the print slip never printed.** `@media print` said
`body > * { display: none }`, which hides `#root` — and the slip is a *descendant*
of `#root`, so `display: block !important` could not revive it. Printing produced a
blank page. The slip's 19 tests all checked what it *says*, not whether it could
reach paper.

**⚠️ The first fix got it onto paper, and it still printed badly** (`CP21`). Switching
to the `visibility` pattern revealed the slip, but nobody had looked at the sheet.
Screenshotting the print media measured three faults: the slip landed **237px down and
62px in**, because `position: absolute` resolves against the result page's `relative`
glass card; that card's `transform` and `backdrop-filter` each establish a containing
block, so no positioning value could escape it; and `visibility: hidden` boxes still
occupy layout, leaving the document 7591px tall and "Save as PDF" producing **eight**
pages, seven of them blank. The slip is now **portalled to `document.body`** and the
print block hides its siblings with `display: none`, which collapses the layout instead
of merely hiding it. Measured after: **one page, slip at 0,0**. `printCss.test.js` now
reads the component as well as the stylesheet, because that `display: none` is safe only
while the portal is there.

**⚠️ Three constraints that are not negotiable, because they are fixes already
shipped on this branch and a restyle is exactly how they get undone:**

1. **The medical disclaimer and the privacy notice must stay ON SCREEN** (`CP13`).
   They spent the project's whole life rendered at `top: -10000px`, visible only
   inside a PDF most people never downloaded. A redesign that tucks them back into
   an accordion, a modal or a "details" drawer re-creates that defect with better
   styling.
2. **Glass must not eat contrast.** Translucent surfaces over a coloured hero are
   where text contrast quietly fails, and this page tells people about their own
   health in four languages, on cheap phones, in bright light. Every text/background
   pair needs to hold up — the tier colours are already saturated.
3. **The print stylesheet stays plain** (`P3e.6`). `@media print` deliberately
   strips gradients, glass and dark mode: a handover slip goes to a centre's office
   printer, and blur effects render as grey mud and empty a cartridge. The screen
   and the paper are two different designs on purpose.

**Worth folding in while the file is open:** `6.2` is the natural moment to retire
the `html2canvas` raster. It produces a picture of text — unselectable,
unsearchable, invisible to a screen reader — and it is why the PDF template had to
carry a duplicate set of styles at all.

---

## P5 — What the data is for · `CD5` · **SETTLED & SHIPPED**

Every screening is written and read by nothing (`CP5`). Two honest options, and the
current state is the worse of both — the cost and risk of holding health data about the
public, with none of the benefit.

| # | Item | Detail | Tier | Status |
|---|---|---|---|---|
| 5.1 | Use it, or stop collecting it | **Settled: use only the aggregate output.** `community_insights/latest` is a nightly Admin-SDK rollup of counts — region, sector and month — with small-cell suppression. The screening flow collects no resident account or contact details, but no claim of anonymity or legal de-identification is made. ⚠️ `community_assessments` stays `read: if false` for every client: reopening it "just for the dashboard" is the `CP5` defect returning with a chart attached. | Opus-alone | `DONE` |
| 5.2 | Move the notice to the front | **`DONE`** — `PathwaySelection` carries it before either pathway starts (`CP13`). | Whichever of the above: a short screen *before* the first question, with a way to decline and still get the result. Today the claim appears on the result page, after the data is written. | Fable-supervised | `DONE` — stale `OPEN` cell corrected 2026-09-10; `CP13` was already closed with evidence. |

---

## P7 — Found by the pre-merge stress test · `CP22`–`CP26` · risk: **high** · **FIXED**

Run `npm run stress:community` to reproduce every number below. These were found
by driving the built app and fuzzing the pure logic, **not** by the unit suites —
all 2253 tests were passing throughout, and still are. That is the point of the
harness: a unit test asks whether a function does what its author meant, and every
one of these is a case where it does exactly that and the system is still wrong.

| # | What | Evidence | Owner | Status |
|---|---|---|---|---|
| 7.1 | **A completed assessment dead-ends when Firestore is unreachable** | `CP24`. Both pathways `await recordTelemetry(...)` **before** navigating to the result (`AuraChat.jsx:987`, `ConventionalForm.jsx:764`). Firestore's `addDoc` does not reject when the backend is unreachable — it queues the write and the promise never settles, so the `catch` that exists for this never runs. Measured in Chromium with `firestore.googleapis.com` blocked: the chat completes every question and then sits on *"Generating your personalised plan now…"* — **still waiting after 45s**. The form's `finally { setBusy(false) }` never runs either, so its Submit stays on "Processing…" — the state `FIX 4` in that file claims to have fixed. `telemetry.js`'s header says the visitor "must still reach their result if the write fails"; against a hang, it does not. | me | `DONE` — `WRITE_DEADLINE_MS = 1500` inside `recordTelemetry`, so no caller can forget it. The write is **not** cancelled: it stays queued in the SDK and still lands if connectivity returns. Re-measured in Chromium with Firestore blocked: **45s+ and counting → 6.4s, result reached**. 9 tests, including a promise that never settles. |
| 7.2 | **Interaction telemetry is counted as respondents in the population rollup** | `CP23`. `buildCommunityInsights` reads `community_assessments` with **no filter** (`functions/index.js:988`), and `ResultPage` writes four kinds of interaction row to that same collection — `print_handover_slip`, `download_pdf`, `share_result` and one `click_<id>` per resource tapped — none carrying `flags` or `payload`. `flagsOf` returns `{}` for them; `tallyInto` counts a respondent anyway. Measured: **12 respondents all reporting need became 96 "respondents", and every domain rate fell from 100% to 13%.** A health system would plan from that. | me | `DONE` — `isAssessment` in `insights.cjs`; the rollup now counts only documents that HAVE a `flags`/`payload` object, and reports `quality.assessmentRecords` / `nonAssessmentRecords` so the figures reconcile against `recordsRead`. Re-measured: **12 people + 84 interaction rows → 12 respondents, foodInsecurity back to 100%.** |
| 7.3 | **`MIN_CELL` can be cleared by one person's interaction trail** | `CP23`, the disclosure half of 7.2. Primary suppression is supposed to guarantee ten respondents before a sector is published. Measured: **1 assessment + 11 of that person's own clicks published sector 18 with `respondents: 12`.** The privacy control the dashboard rests on can be satisfied by a single individual. | me | `DONE` — same fix as 7.2. Re-measured: **1 assessment + 11 clicks → sector 18 suppressed.** |
| 7.4 | **Region and period cells publish a raw respondent count with no minimum** | `CP25`. `MIN_CELL` is applied to `sectors` only; `regions` and `periods` publish `respondents` as-is and band domains at `MIN_COUNT`. At `respondents: 1` the band stops banding: `'<5'` can only mean 1. Measured — one respondent in the North in November 2026 published **eight domains reading `'<5'`**, which is that person's complete flag profile, located to a region and a month. This is the state the dashboard will be in for its first weeks, which is exactly when it will be shown. | me | `DONE` — the floor is uniform now: **no breakdown cell is published below `MIN_CELL`**, sectors, regions and months alike, and the national *breakdown* is withheld below it too while the national headcount stays (a country-wide total locates nobody). Withholding is reported for each. A test walks the whole document and fails on any readable count under the band. |
| 7.5 | **Typed answers that DENY a symptom set the flag** | `CP22`. The chat renders a free-text input (`AuraChat.jsx:1146`) and prompts *"SELECT AN OPTION OR TYPE FREELY"*; typed text goes to the same substring matchers. `parseFallsAnswer` handles negation — because "No falls" contains "fall" — and **no other matcher does**. Measured: **16 of 22 realistic typed answers set a flag the answer denied**, 0 missed a real report. A fit person typing *"no chest pain"* scores **5 → Red**, is told to consult a GP before any exercise, and the handover slip prints *"Chest pain or dizziness on exertion"* to a centre as fact. **The quick-reply chips are all correct** — this is the text box only. | me | `DONE` — **16 → 1.** `buildMatcher` is negation-aware: a cue must sit in the same clause, immediately before the term (or immediately after it in Tamil, where negation is postfix). Deliberately timid — `and` breaks a denial, `or` does not, and anything ambiguous keeps the flag, so over-triage stays the direction this fails in. Bare `'low'` was also replaced with the phrasings that mean low mood, because `"low back pain"` and `"low income household"` are not denials and negation could not rescue them. **Every chip maps to exactly the same flag as before** — re-verified. 40 new tests. |
| 7.6 | **The falls screen misses anyone who types their age** | `CP26`. The gate is `when: (data) => /60\s*\+/.test(String(data.demographics))` — literal `60+` only. Measured: `"72"`, `"I am 72"`, `"I am 65 years old"`, `"60 plus"`, `"sixty five"` all fail it. The chips emit `"Male, 60+"`, so tapping works and typing does not — in the one cohort the falls screen exists for. | me | `DONE` — `parseAgeBand` / `isSixtyPlus` in `clinicalFlags.js`, shared by the chat gate, the form gate and both pathways' `age` derivation, which was a second substring test with the same defect and also cost the two 60+ CTA tiers. A closed range is read as a range, so `"41–60"` does not become 60+. 14 tests. |
| 7.7 | ~~**Falls and Healthier SG are English-only**~~ **CLOSED 2026-09-12** — all four languages now ship prompts 14 and 15 (`src/data/communityChatCopy.js`; verified 2026-09-15 by reading the `falls` and `healthier_sg` entries under each of `en`/`ms`/`zh`/`ta`). The finding as written: | `CP26`, and a consequence of `CD10`. `en` shipped **15** prompts, `ms`/`zh`/`ta` shipped **13**. `isStepAvailable` correctly skipped the untranslated two, so a Malay, Chinese or Tamil speaker was never asked about falls or Healthier SG — the older, less English-dominant residents an Active Ageing Centre referral targets got the shortest assessment. | **OWNER** → me | `DONE` — see below. **The translation was the safe half.** |
| 7.8 | **`/individuals` is a 404** | The section root has no route (`App.jsx:764`–`768` define `/individuals/*` only). Anyone who trims the URL, or types what they were told verbally, gets the not-found page. It recovers well — it offers "Start a health check" — but a redirect to `/individuals/pathway` is one line. | me | `DONE` — `<Route path="/individuals" element={<Navigate to="/individuals/pathway" replace />} />`. Verified in Chromium. |

### ⚠️ `7.7` — what shipping the translation actually required

The owner's call was to machine-translate Group 1 rather than keep asking nobody.
Doing it surfaced a defect that had been invisible for as long as the questions had
existed, because nothing had ever exercised the path.

`parseFallsAnswer` and `parseHealthierSg` match **token lists**, and the lists were
English-only:

```
matchesNoFalls    = ['no falls', 'none', 'no']
matchesEnrolledNo = ['no', 'not enrolled']
```

`"Tiada jatuh"` matches nothing in the first, so the parser falls through to
`falls = 1, fallsRisk = true`. **Translating the chips alone would have recorded
every Malay, Chinese and Tamil speaker who had never fallen as having fallen** —
added to their risk score, printed on their result, and written onto a handover
slip given to a community centre as fact. That is missing data becoming *wrong*
data, which is precisely the trade `chatSteps.js`'s skip rule exists to refuse; and
unlike a skipped question, nothing about it would have looked incomplete.

| | |
|---|---|
| Chips moved to | `src/data/screeningChips.js` — the text is parser input, so it lives where a test can import it without React |
| Matchers extended | `matchesNoFalls`, `matchesTwoOrMore`, `matchesAvoidance`, `matchesEnrolledYes`, `matchesEnrolledNo` |
| Parity test | `src/utils/clinicalFlags.i18n.test.js` — **33 tests**: chip *n* in any language must parse to what chip *n* in English parses to |
| Evidence it is load-bearing | reverting the matchers to English-only fails **12 of the 33**; restored, 33 pass |
| Suite | **2714** tests across 73 files, was 2681 · lint 0 · build green |

**Two phrasings are dictated by the parser rather than by the language, and both
were found by the test rather than by reading:**

- Tamil `falls.chip3` avoids *"இரண்டு அல்லது…"* — அல்லது ("or") begins with அல்ல,
  a Tamil negator, and Tamil negation is postfix, so the parser read it as denying
  the "two" beside it and the chip counted as **one** fall. The sentence is correct
  Tamil; only the parity test saw it.
- The Malay "not enrolled" token is `tidak berdaftar`, not `tidak` — because *"Saya
  tidak pasti"* ("I am not sure") contains `tidak` and `matchesEnrolledNo` is tested
  first. A bare token would have turned *"the portal does not know"* into *"this
  person is not enrolled"*, for every Malay speaker who was unsure, silently.

## `P9` — the report page landed 2026-09-12

Page 3 of the printed report, rendered **only when the resident gave a figure**.
Everybody who skips the questions gets exactly the two-page report they get today,
with no blank page in their download. The footer's "PAGE n OF 2" was a literal and
is now passed in, so a three-page report does not insist it has two.

Each measurement shows the number, the band, and one sentence about what to do.
Where no comparison could be made it shows the NUMBER and the REASON, because a
blank card under a figure somebody just gave reads as "your result was too bad to
print". All nine refusal states are covered by test.

`measuresCopy.reportIntro` is a separate string from `intro`. The question-time
line says "you can skip this and your result will not change", which is nonsense
printed beside figures the person already gave.

**The sources are named, with their populations.** None of the three is
Singaporean, and a resident comparing themselves to a Swiss or United States
sample is entitled to know that is what they are doing. Nothing is cited when no
comparison was made: a citation for a comparison that did not happen is worse than
none. That closes the citation half of `CD21`; the wording still wants the owner's
sign-off.

Headroom after the change, measured not assumed:

    scenario           lang  page  natural  spare
    measured           en    3         646    477
    measured-refused   en    3         505    618
    measured-refused   zh    3         489    634
    (pages 1 and 2 unchanged: 71px and 77px, exactly as before)

The `measured-refused` scenario exists because the worst case for page 3 is NOT
two clean bands: the reason strings are far longer than a band label. A page sized
against the happy path clips exactly the residents it was most important to
explain things to.


---

## `P9b` — the measurements page gets a picture · **SHIPPED** (`CD26` waived 2026-09-15)

Owner's direction, 2026-09-14, after trying v2.13.0 live: *"page needs to move to
page 2. Page 2 where the grip strength and sit to stand measurements are shown needs
a bit more visual. Im thinking of percentile graphs"*, and then, with a screenshot of
the remaining space: *"Possible to build a heart rate graph based on user's age so
they can see the heart rate ranges and the general benefits and the coloured zones
using the astrand's equation and tanaka's equation"*.

### It is a meter, not a percentile graph, and that is the whole design

A percentile graph needs a distribution, and two of the three references do not
publish one:

| measure | what the source actually publishes |
|---|---|
| grip (Tomkinson 2025) | 11 percentiles per age and sex |
| 1-minute STS (Strassmann 2013) | 5 points: p2.5, p25, p50, p75, p97.5 |
| **30-second chair stand (STEADI)** | **ONE cut-off, and nothing above it** |

The third is the test **every resident aged 60 and over takes**. Drawing a smooth
curve through one published point means drawing a shape invented here and
attributing it to the CDC. So `functionalMeasures.js` now exposes `scale` — the
figures a chart is ALLOWED to draw — and `ReferenceMeter` draws those and nothing
between them. It degrades from eleven marks to five to one without ever changing
what it claims. `CD18` already refused to REPORT a rank for grip; plotting one would
have reintroduced it through a picture.

### Two defects the previews caught that no test would have

1. **The cut-off meter overstated two repetitions.** With the axis derived from the
   single published point plus the resident's own count, a woman of 67 who stood up
   13 times against a cut-off of 11 got a meter whose entire span was those two
   repetitions: the teal band filled nine tenths of the track, her marker sat near
   the end of it. Every number printed beside it was correct. The drawing said she
   was near the top of a scale that has no top. Fixed by giving the cut-off case a
   real axis (`axisFrom: 0`, `axisTo` = the protocol's plausible maximum) and
   covered by test.
2. **`81 to 97` printed in Malay, Chinese and Tamil.** The zone chip's connector was
   an English word written into the component instead of copy. Now a hyphen.

### Heart rate: both equations shown, only one used

    Tanaka (2001) .... 208 - 0.7 x age ...... healthy adults .......... computes the zones
    Astrand .......... 216.6 - 0.84 x age ... STATED POPULATION 4-34 ... shown, never used

Astrand's own sample stops at 34 and this page is mostly read by people past 60.
Both figures are printed because both were asked for, and a resident comparing them
learns something true; the zones are computed from Tanaka alone, and the page says
in words why. `ESTIMATE_SPREAD_BPM` (about 11 bpm between individuals of the same
age) is printed beside them, because the uncertainty is most of the width of a zone
and arithmetic that looks exact would otherwise be read as personal thresholds.

**Two suppressions, and the symptom one is checked BEFORE the age lookup.** A
resident who reported symptoms on exertion is shown no table at all — a table of
intensity ranges is an invitation to exert. Ordering that check second would make
the suppression depend on the calculation succeeding. Medication (`medFlag`) does
NOT suppress: it makes the estimate wrong in a known direction, so the table is
shown with a caution, because hiding it would remove the explanation along with it.

### `CD27` — the ramp is the conventional one, and the copy now carries what the colour used to

Built teal first, to avoid red. Owner's decision, 2026-09-14: *"I need heart rate
chart to follow the heart rate zone colours. Garmin, Polar, Apple, Acxta etc uses
those heart rate colours"*. Applied: **grey, blue, green, amber, red.**

The objection that produced the teal ramp was raised before the decision and is not
retracted by it, because it names a hazard that still exists:

> Page 1 of this same report prints a traffic light in which **red means "High
> Needs"**. A red top zone on page 2 can read, to a resident holding both pages, as
> a second verdict about them. It is not one. The top zone labels an INTENSITY, and
> reaching it is neither good nor bad. The residents most likely to conflate the two
> are the ones who got a red result on page 1, which is the group this portal exists
> to reach.

Since the colour can no longer carry that distinction, a sentence does:
`hrColourNote`, printed directly under the table in all four languages, says these
are the usual exercise zone colours and do not mean the same thing as the result
colour. Deleting that line puts the ambiguity back with nothing holding it.

**The first draft of the palette failed a check, and it failed where this palette
always does.** Straight orange beside straight red came back at ΔE 8.0 for NORMAL
vision, under the floor of 15 — readers with full colour vision could not reliably
tell zone four from zone five:

    scripts/validate_palette.js "#94a3b8,#2563eb,#15803d,#f59e0b,#b91c1c" --mode light

    PASS  lightness band        all five inside the band
    PASS  CVD separation        worst adjacent pair ΔE 17.4 protan  (floor 8)
    PASS  normal-vision floor   worst adjacent pair ΔE 24.4         (floor 15)
    FAIL  chroma floor          #94a3b8 "reads gray"
    WARN  contrast vs surface   relief required: visible labels

The chroma failure is the intended reading, not a defect: zone one **is** grey in
every product the owner named. The contrast warning is discharged by the labels.

Colour is never the only channel. Every row prints its bpm range **inside** its
swatch and its name in words beside it. That matters more than usual for this ramp:
blue and green sit within 0.005 of each other in relative luminance, so a greyscale
photocopy cannot separate them and the words are doing the work. Text contrast on
each swatch is 5.0:1 or better, with the foreground chosen per row, because the ramp
runs light, dark, dark, light, dark and one shared text colour fails at an end.

### Headroom, measured — and it caught a real clip

The measurements page moved to **page 2** at the owner's request (a resident who had
themselves measured should not have to go past a disclaimer page to reach their own
figures). Governance is last and is numbered from `totalPages`.

First run after the heart rate block went in:

    measured-medication  ms  page 2   -44px  ← CLIPPED
    measured-medication  ta  page 2   -44px  ← CLIPPED
    measured             ms  page 2   -14px  ← CLIPPED
    measured             ta  page 2   -14px  ← CLIPPED

**What was falling off the bottom was `hrCaution`, the safety string.** Space was
recovered from spacing and from repeated wording, **not from type size** — 8px on A4
is already about six points and these readers are mostly over 60. Three sentences
saying "this number is soft" became one paragraph; five per-row restatements of the
talk test became one line below the table; the two equation citations moved into the
page's existing "Compared against" block.

    scenario             lang  page  natural  spare
    measured             en    2        1024     99
    measured             ta    2        1069     54
    measured-medication  ta    2        1095     28   ← tightest page 2
    measured-symptoms    en    2         818    305
    measured-refused     zh    2         795    328
    (page 1 unchanged: worst case still 2px — `CP30`, untouched by this work)

Adding `hrColourNote` cost the tightest page 8px of its margin, which was taken back
out of chip padding and row gaps — spacing again, never type size.

### `CP39` — the chips were drawn through their own heading · **FIXED in v2.14.1**

Found five hours after v2.14.0 went live, in a **production PDF** — a report a
resident could have been handed. Not in a preview, not by a test, not by the headroom
script.

    what it looked like   the first range chip was drawn OVER the words "Beats per
                          minute", so the heading read as struck out, and the numbers
                          in all five chips sat on the floor of their pill

Two causes stacked in one block:

1. The row was `alignItems: stretch`. The chip took the row's height and, as a plain
   padded block, grew UPWARD into the headings. `alignItems: center` fixes this half.
2. html2canvas places the text baseline lower in the line box than the browser does.
   The digits sat **4.6 CSS px** below the centre of a 19px chip. Zero top padding, a
   line box held to the font size, and the whole 8px underneath: the box moves down
   around the text instead of the text moving inside the box. Now 1.7px, at the same
   chip height, so headroom is untouched.

### ⚠️ The lesson from `CP39`: three checks passed and a fourth was an eyeball

This one is worth more than the fix. Everything this repository has for checking the
report passed it, and each was right to:

    pdf-headroom.mjs   measures whether content FITS inside the 1123px box. It
                       passed through every broken state, correctly. Height was
                       never the problem, and that is exactly what it cannot see.
    pdf-verify.mjs     checks page count and which page the links are stamped on.
                       Both were right.
    vitest             asserts the chips carry the right colours and the right
                       numbers. They did.

**And then the eyeball failed too.** The first attempt at the fix cleared the
collision, was checked by looking at a 300dpi crop, and left the digits exactly as low
as they had been — the render was read as "centred" when it was 4.6px out. The defect
only closed once it was *measured*: `pdftoppm` at 300dpi, then the ink bounding box
inside each pill against the pill's own box. The numbers above come from that.

The chip's `style` block in `HeartRateZones.jsx` carries this as a comment, because
the four values in it look like typos for symmetric padding and are not.

---

### ⚠️ `CD26` — TWO NEW PROHIBITIONS, AND THE GATE IS RED · **OWNER'S CALL**

`measures.hrCaution` and `measures.hrSuppressedSymptoms` are registered in
`copyReview.js` as safety-critical. Neither is covered by the 2026-09-13 waiver, and
**they were not added to it.** That waiver names three keys and was signed against
three specific stated risks; extending somebody else's signature to cover work they
have not seen is the failure this module exists to prevent.

So the build is red, on purpose, exactly as the rule says it should be:

    FAIL src/data/copyReview.test.js > ships no safety-critical string that is unreviewed and unwaived
    FAIL src/data/copyReview.test.js > would block every waived string if the signature were withdrawn
    Test Files  1 failed | 124 passed (125)
    Tests       2 failed | 4248 passed (4250)

`hrCaution` is the harder of the two. It sits directly beneath a table of heart rate
ranges, and a table of ranges reads as a set of targets. If the prohibition softens
in translation, what is left is a portal handing an older resident numbers to chase.

**Two ways to clear it, and both are Alif's:** a named reviewer per language in
`reviewedBy`, or a waiver line signed for these two keys by name. Nothing here ships
until one of them exists.

#### 2026-09-14 — the wording was corrected first, and the gate stayed red

Owner's instruction, relayed from a ChatGPT pass: correct the wording BEFORE native
review, create no waiver, mark no language reviewed, and do not weaken the test.

**What that pass found is the reason it was worth running: the softness was in the
ENGLISH.** `hrSuppressedSymptoms` ended *"Please speak to a doctor before you increase
how hard you exercise"* — a polite request. All three translations were faithful to
it, so all four languages were equally soft, and **a translation reviewer reading for
accuracy would have passed every one of them.** No amount of checking the translations
would have surfaced that. The English had to change first.

| | before | after |
|---|---|---|
| **en** | Please speak to a doctor before you increase how hard you exercise. | Do not increase how hard you exercise until you have spoken to a doctor. |
| **ms** | Sila berbincang dengan doktor sebelum anda menambah **kekuatan** senaman anda. | **Jangan tingkatkan intensiti** senaman anda sehingga anda berbincang dengan doktor. |
| **zh** | 请先与医生**谈一谈**。 | 在**咨询**医生之前，**不要**加大运动强度。 |
| **ta** | …மருத்துவரிடம் **பேசுங்கள்**. | …அதிகரிக்க**க் கூடாது**. |

`hrCaution`: English and Chinese unchanged. Malay gains the verb
(`memaksa diri **bersenam** lebih kuat`). Tamil's **வேண்டாம்** — which carries both
"do not" and the weaker "there is no need to" — becomes **கூடாது**, "must not".

`谈一谈` was NOT treated as a defect in itself. The Chinese construction changed
because the English became a prohibition.

**Recorded as a `CROSS_CHECKS` entry, not as review.** `NOT_A_PERSON` refuses a model
in `reviewedBy` on purpose: a model cannot be accountable for a prohibition a resident
acts on. Two entries, one per real registry key — an earlier attempt used a made-up
composite key `measures.hrPair` and the registry's own test rejected it, correctly.

The `english` snapshot in `copyReview.js` was updated so the gate protects the text
that now ships; `measuresCopy.test.js` binds the two together and would have failed
otherwise. **The 13 September waiver was not extended. All three `reviewedBy` values
remain null. `CD26` is still red:**

    FAIL src/data/copyReview.test.js > ships no safety-critical string that is unreviewed and unwaived
    FAIL src/data/copyReview.test.js > would block every waived string if the signature were withdrawn
    Test Files  1 failed | 125 passed (126)
    Tests       2 failed | 4263 passed (4265)

Page 2 headroom unchanged by the rewrite: Tamil with the medication caution still has
22px spare, nothing clipped.

#### 2026-09-15 — `CD26` closed by the owner's signature

A third machine pass (Gemini, relayed) was run. **It was reviewing superseded text**:
it flagged Tamil வேண்டாம், Chinese 谈一谈 and Malay `Sila berbincang` as still present.
All three had already been corrected the day before. Its proposed Malay replacement,
*"Sila dapatkan nasihat doktor"* ("please seek a doctor's advice"), is a polite request
and would have **undone** the prohibition that had just gone in. Not applied, and NOT
recorded in `CROSS_CHECKS`: it did not check what ships, so recording it as a
cross-check of the shipped text would be a false claim.

That is three machine passes on two sentences, not converging: the first wrote the copy
and then missed that its own English was the root cause; the second found it; the third
re-flagged fixed items and proposed a regression.

**The owner then chose the final English themselves**, and chose a form softer than
what it replaced, with the difference put to them explicitly beforehand:

| | |
|---|---|
| was | Do **not** increase how hard you exercise **until** you have spoken to a doctor. |
| now | **Consult** your healthcare professional **before** you increase how hard you exercise. |

The first forbids exercising harder. The second instructs the reader to consult and
does not forbid it. `hrCaution` remains a prohibition, so **the two strings now carry
deliberately different force** — recorded in `measuresCopy.js` beside the strings so
nobody later reads the inconsistency as a drafting slip and "fixes" one to match.

ms, zh and ta follow the English as instructions: `Rujuk profesional kesihatan anda…`,
`请咨询您的医护人员`, `…சுகாதார நிபுணரிடம் ஆலோசனை பெறுங்கள்`.

**Waived, signed for these two keys by name, on their own line.** The 2026-09-13 waiver
was not extended — that one covers three different strings signed against three
different risks. `reviewedBy` stays null in all three languages: nobody has read them.

    Test Files  126 passed (126)
    Tests       4265 passed (4265)

##### ⚠️ A safety test was edited, and it was made STRICTER

Waiving exposed a gap in `copyReview.test.js` → *"does not open the gate for anything"*.
Its property is **a machine cross-check must never be what opens the gate**; its
implementation only checked that a cross-checked string still appeared in
`blockingReviewGaps`, which conflates *"a cross-check opened it"* with *"anything
opened it"*. A human signature is allowed to open it. The first key that was ever both
cross-checked **and** waived made a correct state fail.

Rewritten to name the mechanism instead of the outcome: a cross-checked string may stop
blocking **only** via a waiver, and that waiver's signature must pass `looksLikeAModel`.
**Nothing checked the second half before.** Proved by sabotage — signing the waiver
`by: 'Gemini 3.1 Pro'`:

    × does not open the gate for anything
      → measures.hrCaution is waived by "Gemini 3.1 Pro", which is not a person.
        A machine cross-check cannot become a signature by being written on one.

Reverted, 40/40 green.

#### ⚠️ Still open — `doNotSelfTest` has the same Tamil ambiguity

`measures.doNotSelfTest` is the sentence telling a resident not to attempt a timed
chair stand alone. It is safety-critical and it **still ends in வேண்டாம்**, the exact
construction just corrected in `hrCaution`.

It was deliberately not touched. It is covered by the 2026-09-13 waiver, and rewriting
waived copy would silently invalidate the text the owner actually signed for. Changing
it is a decision, not a fix, and it is Alif's.


---

## ⚠️ `CP38` — the whole measurements feature was invisible in the app · **FIXED**

Found by the owner asking for PWA screenshots of it, 2026-09-14: *"Currently I'm
only seeing screenshots of the pdf report."* There were none to take.

`MeasurementsPanel` was rendered exactly once, at `ResultPage.jsx:1003`, inside the
print template that lives at `position:absolute; top:-10000px`. It rasterised
correctly into the downloaded PDF and was seen by nobody else. **A resident who had
their grip measured, typed the number in, and read their result on the screen saw no
meter, no band and no heart rate ranges at any point** — unless they happened to tap
Download and open the file.

**This is the second time this exact defect has shipped in this repository.** The
first was the medical disclaimer, and the note above `MedicalDisclaimer` in
`ResultPage.jsx` describes it in the same words: *"It rendered for `html2canvas` and
for nobody else."* A person who read their risk band and a Primary Action telling
them to start exercising saw no disclaimer at all.

Fixed by `MeasurementsSection.jsx`, the screen-native rendering: responsive, dark
theme, same content. It is a second component rather than a prop on the first
because the two media have genuinely different constraints — a fixed 794x1123
light-only box measured to the pixel, against a responsive page with no height
limit — and the print side is the one that fails silently. `MedicalDisclaimer` and
`DataGovernance` already follow that pattern here.

What is **not** duplicated is anything that could drift and be wrong. Copy comes
from `measuresCopy.js`, bands from `functionalMeasures.js`, zones from `zonesFor`,
and the colours from the new `src/data/zonePalette.js`. Both media render the same
numbers in the same colours, or the shared module is broken and both fail.

**The guard against a third occurrence** is the last test in
`MeasurementsSection.test.jsx`. It reads `ResultPage.jsx` and asserts the component
is used AFTER the `── MAIN CONTENT` marker rather than inside the off-screen
wrapper, because a component can be mounted, correct, and still be at -10000px:

    ⚠️ it is on the screen, not only in the download
      ✓ is rendered outside the off-screen print wrapper

### `CD28` — proper headers, in both media

Owner: *"The heart rate zones should also receive proper headers."* Two things were
wrong and both are fixed in the print page and on the screen:

1. **The block heading was the page's SUB-heading style** — 11px bold sentence case
   — so the largest block on page 2 announced itself more quietly than the citation
   list beneath it. It now uses the same uppercase, letter-spaced treatment as
   "Compared against", and on screen the same `<h2>` idiom with an icon that every
   other section of the result page uses.
2. **The table had three unlabelled columns.** Three lists that happen to line up is
   not a table, and the middle one is the reason it matters: "Light" and "Hard"
   printed beside somebody's own result read as a grade until a heading says they
   name an intensity. Now `hrColRange` / `hrColZone` / `hrColPurpose`, in all four
   languages.

The headings cost the tightest print page 13px, taken back out of block gaps.

    scenario             lang  page  natural  spare
    measured             ta    2        1075     48
    measured-medication  ta    2        1101     22   ← tightest page 2
    measured-medication  en    2        1037     86
    (page 1 unchanged: worst case still 2px — `CP30`)

### `hrColourNote` no longer names a page number

It read *"the colour of your result on page 1"*. That was correct on paper and
nonsense on the screen, where there are no pages and the sentence sent the reader
looking for one. Copy shared by two media cannot describe the furniture of either,
and `MeasurementsSection.test.jsx` now asserts no language mentions a page.


---

## The downloaded file itself, verified · `scripts/pdf-verify.mjs`

Moving measurements to page 2 changed TWO things that had to change together: the
order of the templates, and the order the builder binds them in. If only one had
moved, the printed footer would number the pages one way and the PDF would bind
them the other — which looks like a rendering glitch and is actually a wrong
document. `pdf-headroom.mjs` cannot see this: it measures the templates and never
opens a PDF.

So the real file was checked, by driving the app and tapping Download:

    case                    pages   page 1     page 2       page 3
    gave a measurement        3     15 links   1 link       6 links
    skipped the questions     2     15 links   6 links      —

Fifteen links on page 1 are the resource cards. The single link on the
measurements page is the header's own, which every page carries. The six are the
Healthier SG card, which exists on the governance template and nowhere else — so
finding them identifies that page beyond doubt, and they are **last in both
shapes**. Footers read `PAGE 2 OF 3` and `PAGE 3 OF 3` with measurements, and
`PAGE 2 OF 2` without.

⚠️ **The assertions are about links because the pages are rasterised JPEGs.** The
finished PDF has no text layer at all, so `pdftotext` returns nothing and there is
no heading to match on. The annotations are the only structured content that
survives.

**The check was verified by breaking the thing it guards**, rather than by being
green once. Binding governance before measurements while leaving the templates
alone — the exact half-reorder described above — produced:

    ⚠️  the downloaded report is wrong:
      - gave a measurement: the last page carries no healthiersg.gov.sg link, so governance is not last
      - gave a measurement: governance links found on page 2, which is not the last page
    exit 1

A check that has never failed proves nothing, and this repository has already
shipped one that measured nothing: the headroom fixtures lacked `scale`, so the
meter did not render and the result came back unchanged, which looked like good
news.

---

## ⚠️ `CP30` — the printed report is 2px from losing content, today

`PDF_PAGE_STYLE` is a fixed 794x1123 box with `overflow: hidden`, and the PDF is a
rasterised screenshot of it. A page that grows does not spill onto another page and
does not shrink to fit. **The bottom is cut off.** It still looks right on screen,
where the same content sits in a scrolling column, so nothing warns and no test
fails. A resident downloads a report with the last thing on it missing.

`scripts/pdf-headroom.mjs` measures it. Run 2026-09-12, before any `P9` change:

    scenario     lang  page  natural  spare
    low-risk     en    1        1052     71
    low-risk     ms    1        1037     86
    low-risk     zh    1         988    135
    low-risk     ta    1         988    135
    worst-case   en    1        1121      2  ← tight
    worst-case   ms    1        1091     32  ← tight
    worst-case   zh    1        1056     67
    worst-case   ta    1        1056     67
    (page 2 is static: 77px spare in every language and scenario)

    Tightest: worst-case / en / page 1 with 2px spare.

**Two pixels.** A resident who raises every flag and reads English is two pixels
from losing the bottom of their own plan. One more line of English copy anywhere on
page 1 — a longer call to action, a new resource row, a wrapped sentence at a
different font size — and content starts disappearing from people's PDFs with
nothing to say it did.

⚠️ **CONSEQUENCE FOR `P9`: THE MEASUREMENTS CANNOT GO ON PAGE 1 OR PAGE 2.** Neither
has room for a two-row block plus its source citations. They go on a third page,
which exists only when the resident gave a figure, so everybody who skips gets
exactly the report they get today.

`CP30` itself stays OPEN. The third page routes around it; it does not fix it, and
page 1 is still two pixels from the edge for the next person who edits it.

⚠️ Measuring this needs a detached clone with `height: auto`. The page is a
fixed-height flex column, so its children stretch: `scrollHeight`, the bottom edge
of the last child and the content area's own box ALL report exactly 1123 whether
the content needs 300px or 3000. Three attempts at this measurement returned "0px
spare" and meant nothing. The script's header says so, at length, because the
obvious measurement is the wrong one and looks right.

---

## Pre-merge simulation and audit, 2026-09-14 — seven defects found, seven fixed

Three agents audited the branch while a permutation simulation and a browser sweep
ran against it. Everything below was verified before being acted on, because one
audit finding was wrong (see the foot of this section).

| | What it was | Found by |
|---|---|---|
| `CP35` | **The exact age, grip in kg and rep count were posted to Gemini on every chat turn.** | gap hunt |
| `CP36` | A part-finished assessment saved before this deploy resumed at a moved index and filed answers under the wrong questions. | gap hunt |
| `CP37` | An age the portal could not read ("75+", "seventy five") silently cost a resident the whole 60+ pathway. | gap hunt |
| `B1` | The wrong-stopwatch guard did not fire in the case it exists for. | gap hunt |
| `F2`/`F3` | The report named "thirty seconds" above a sentence saying the duration was unknown, and claimed to have kept a number that did not exist. | both audits, independently |
| `F4` | The README stated twice that this feature does not exist. | QC audit |
| `F5` | **My own `CP34` write-up stated a mechanism that is not real.** | QC audit |

### `CP35` — the second door, opened in the same change that documented the first

`priorAnswerLines` walked `COMMUNITY_DOMAINS`. `P9` added four domains to that list
so the endpoint would ACCEPT the new answers — and that same list decides what is
forwarded to the model. From the age question onward, every turn sent:

    age_years: 78
    grip_kg: 16.5
    sit_to_stand: 7

to a third party, to generate a one-sentence acknowledgement. Three files state
those figures stay on the device; `telemetry.js` strips them by name to enforce it
against Firestore. This was the same `CP29` shape — a list that enumerates
everything, and a new field that ships by default — reopened by the person who had
just written about it.

**The rule is now inverted.** Sending is opt-in per domain (`MODEL_VISIBLE_DOMAINS`).
Accepting an answer and forwarding it are two different permissions. Forgetting now
costs context in an acknowledgement, which is recoverable.

### `B1` — the guard that compared a value to itself

`protocol-age-mismatch` is unreachable from either pathway: both derive the protocol
from the age and then check it against the protocol derived from the age. The flat
plausibility floor of 10 did not catch the case that matters — a 55-year-old typing
a thirty-second count of 14 was told, confidently, that they were far below the
one-minute range.

The floor is now **the lowest value the source publishes** for that person (`p2.5`),
and the warning names the wrong-stopwatch case specifically. The band is still shown,
because the number may be genuine; what changed is that it is no longer shown alone.

Also fixed: the warning read "unusually **high**" in all four languages while firing
on counts far too low, so a 65-year-old who could not stand up once was told their
count was unusually high.

### ⚠️ `F5` — I recorded a false mechanism, and an audit caught it

The `CP34` entry said the stale falls answer "changed the routing, because
`selectCTA` branches on falls". **It does not.** `ctaRouting.js` reads seven fields
and none is a falls field. I wrote it without checking.

Corrected rather than softened, because the truth is worse: the real consumers are
the printed handover slip a resident carries to a community centre, and
`CommunityInsightsPanel`, which labels the field "Fall in past 12 months (60+)" — so
one stale flag from a 20-year-old pollutes a population statistic a health system
plans from.

### ⚠️ One audit finding was WRONG, and checking it mattered

An audit reported that the telemetry document carries 25 to 26 top-level keys
against a rules cap of 20, concluding that **every community write is being
rejected**. Measured directly:

    CHAT  top-level keys = 8   :: event, sessionId, previousSessionId, payload,
                                 computedRisk, ctaTier, postalSector, createdAt
    FORM  top-level keys = 11  :: sessionId, action, language, score, ctaTier,
                                  flags, enrichment, perception, demographics,
                                  postalSector, createdAt

`request.resource.data.keys()` is top-level only; the audit counted nested fields.
Both are comfortably inside the cap and no rules change is needed. Recorded because
acting on it would have meant widening a security rule to fix nothing.

### ⚠️ Also my mistake: seven scratch files committed

`git add -A` in commit `45b05bd` swept up seven throwaway probe scripts another
agent had left in the repository root. Removed. They never reached the bundle, since
Vite builds from the import graph — but committing a public-health repository
without reading what is staged is the process failure, and next time they may not be
seven harmless files.

### What the simulation and the sweep found

    vitest:  735 residents x 4 languages, all invariants hold
    browser: 64 residents walked to completion in the real app
             page errors: 0   broken tokens on screen: 0

---

## ⚠️ `CP34` — a hidden form field kept its answer. FIXED 2026-09-14

Found by `communitySimulation.test.js` **on its first run**, by walking the same
person through both pathways. No unit test could have caught it: every unit was
behaving exactly as written.

    enter age 65  ->  answer "two or more falls"  ->  change the age to 20

The falls dropdown is rendered only from 60, and hiding a field does not clear it.
`deriveFormClinicalData` read `f.falls` unconditionally, so a 20-year-old derived as:

    age 20, stale falls  ::  fallsAsked=true  fallsCount=2  fallsRisk=true

That reached the record and printed on the handover slip to a community centre as
fact. The chat never asks at that age, so the two pathways silently disagreed about
the same person — the `CP9` shape again.

⚠️ **THE FIRST VERSION OF THIS ENTRY SAID IT "CHANGED THE ROUTING, BECAUSE
`selectCTA` BRANCHES ON FALLS". IT DOES NOT.** `ctaRouting.js` reads seven fields
and none is a falls field. I wrote that without checking it and an audit caught it.
Corrected rather than softened, because the real impact is worse: the printed slip,
and `CommunityInsightsPanel`, which labels the field "Fall in past 12 months (60+)"
— so one stale flag from a 20-year-old pollutes a population statistic a health
system plans from.

The strength block had the same hole: a figure typed at 65 survived a change to 18.

**Fixed at the derivation, not by clearing the field on change.** Clearing would
also throw away a correct answer when somebody fixes a typo in their age and changes
it back, and it would leave the same trap for the next conditional field anybody
adds. THE GATE THAT DECIDES WHETHER TO ASK IS NOW THE GATE THAT DECIDES WHETHER TO
READ — the same helper the UI calls, so the two cannot drift.

An unasked question parses as an empty answer, which reports `asked: false` and
never "no falls". That distinction is `CP26` and it is preserved.

⚠️ **TWO EXISTING FIXTURES DESCRIBED A RESIDENT WHO CANNOT EXIST** — a 52-year-old
who had answered the falls question. They passed only because the defect let them.
Aged to 65 so the answers are ones a real person could give.

⚠️ **NOT INTRODUCED BY `P9`.** The same trap existed with the old age-group select:
choose 60+, answer falls, change to 21-40. `P9` makes it easier to reach, because
the age is now a free-typed field people correct.

---

## `communitySimulation.test.js` — the whole assessment, every kind of resident

Added 2026-09-14 ahead of the merge. Runs the WHOLE public assessment, first
question to derived flags, for **735 residents x 4 languages**, and asserts what is
only visible end to end:

- nothing throws, anywhere in the pipeline
- the walk terminates, asks each question at most once, and never offers a question
  whose predicate reads an answer not yet given
- every prompt shown is real text in the ACTIVE language
- the progress counter is 1..total and total equals what was asked
- **all four languages ask the same questions of the same person** (`CP26`)
- nothing a resident can read contains `undefined`, `NaN`, `null`, `[object Object]`
- what may be stored carries neither raw figure nor exact age, checked by WALKING
  the output rather than naming the fields it knows about
- **skipping both measurements changes neither score nor routing** (`CD20`) — the
  promise that keeps the feature optional in fact and not only in wording
- the chat and the form agree on every shared flag, for the same person

⚠️ It drives the real step machinery, the real copy and the real parsers, so it
catches ordering, gating, language and derivation faults. **It cannot catch anything
about rendering, layout or the PDF.** `scripts/pdf-headroom.mjs` and the Playwright
walks cover that, and saying so is the honest limit of the file.

---

## ⚠️ `CP33` — the report promised tracking that does not exist. FIXED 2026-09-13

Live on the site until today, in all four languages, to every returning resident:

> **Longitudinal Tracking Active** — Your results have been linked to your previous
> assessment so you can track your progress over time.

**Nothing tracked anything.** `previousId` is written to `community_assessments` and
read by NOBODY:

| Reader | Reads `previousId`? |
|---|---|
| the resident | no — `firestore.rules` denies client reads of that collection outright |
| the insights rollup (`insights.cjs`) | no — zero occurrences in the file |
| the retention sweep | no — it deletes by `createdAt` |
| any other Cloud Function | there are no others that touch the collection |

Found while scoping `CD23`, not by looking for it. Same class as the housing claim
on the evidence page: a statement on a public surface with no mechanism behind it.

**What was actually false, and where.** Only the English overpromised in the chat
and the form; the other three languages already said just "link records", which is
true. The result page overpromised in **all four**. Fixed exactly the false parts and
left the true copy alone.

The Tamil also said *மருத்துவ முன்னேற்றம்* — "MEDICAL progress" — where the English
said "progress over time". Gone with the rest, but worth noting as a pattern: the
Tamil copy medicalises in a portal where that word is banned on public surfaces.

**Verified in the built app**, all four languages, returning-resident state:

    [en] Previous assessment linked · Your previous ID has been saved with today's
         answers, so the two can be matched up later. We cannot show you the
         comparison yet.
    [ms] Penilaian lepas dipautkan · …
    [zh] 已连结之前的评估 · …
    [ta] முந்தைய மதிப்பீடு இணைக்கப்பட்டது · …

`ResultPage.claims.test.js` guards it in all four languages, on both sides: the
promise must be absent AND the honest wording must be present, so a page that simply
says nothing where it used to reassure somebody also fails.

⚠️ **THE GUARD IS "NOT WHILE IT IS FALSE", NOT "NEVER SAY THIS".** When `CD23` is
built, that test is updated in the SAME commit as the mechanism, by somebody who has
just made it true.

⚠️ A third copy of `stripComments` was about to be written for that test, since the
comment explaining the banned wording contains it. Extracted to
`scripts/strip-comments.mjs` and shared with `version.test.js` instead.
`an14.bundle.test.js` keeps its own simpler one deliberately: it guards a security
assertion about the built bundle, and swapping its implementation as a drive-by on
an unrelated fix is how a security test quietly stops testing what it used to.

---

## Owner decisions, 2026-09-13 — four settled

| | Decision | State |
|---|---|---|
| Translation gate | Go live without a native-speaker review | Waiver signed, above |
| `CD24` fear in the falls chip | **Yes, add it** | Done, four languages, parser re-tested |
| `fallsAvoiding.ta` | **Change it** — earlier decision reversed | Done, honorific form |
| `CD23` re-measurement | **The app should show the change** | ⬜ NOT BUILT. Blocked on a privacy decision: the assessment ID would be the only credential and it is printed on paper residents carry. The false claim it exposed is fixed (`CP33`). Ceiling: records are deleted at 24 months, so tracking can never span longer. |
| SSMC access | Call 6394 8488 / 6394 7171 to enquire | Done, venue now surfaces |

### The falls chip now mentions fear

Astra found the gap: the review instruction requires the chip to convey avoidance
**out of fear**, and the English did not mention it. The translations were faithful
to a source that was wrong. Now, in four languages, with the parser re-run chip by
chip: all sixteen still parse identically to English at the same index.

### `CP32` — the form offered seven answers in English to every language

Every other option list on the conventional form was translated. Falls and Healthier
SG were not, so a Malay, Chinese or Tamil speaker reached the falls question — asked
only of residents aged 60 and over, **the cohort least likely to read English** — and
chose between "No falls / One fall / Two or more falls".

Fixed at the cause rather than the symptom: the form now builds its options from the
chat's chips instead of keeping a second hand-maintained copy. Two copies of one
answer set is how the pathways drift, and the chat's copy is already guarded against
the parser by a test the form's private copy was never covered by.

### SSMC@KKH now surfaces

    grip     :: ssmc_kkh  ·  6394 8488 / 6394 7171
    sts-30s  :: ssmc_kkh
    sts-60s  :: ssmc_kkh

⚠️ The copy says **call and ask**, not "come in", and does not state a price. Those
are the two things owner confirmation did not cover: whether a referral is needed and
what a given payment class pays. This is a factual claim on a public surface (`CP8`)
that sends a cost-constrained resident on a bus journey, so it claims only what the
evidence supports.

---

## Two machine cross-checks, 2026-09-13 — and what they did not cover

Gemini 3.1 Pro and ChatGPT6 Astra both reviewed `docs/CD13-translation-review.xlsx`.

⚠️ **NEITHER COVERED THE THREE `measures.*` STRINGS.** Both ran against the workbook
as it stood before Group 5 was appended, so the three prohibitions blocking the build
are exactly as unreviewed as they were. The gate has not moved. That is the single
most important line in this section.

### What they found in the nineteen they did cover

| | |
|---|---|
| Both agreed | ms "no falls" chip; "GP" unexplained in ms and ta |
| Astra alone | the ms Healthier SG question referred **programmes to you** rather than **you to programmes**; **"on exertion" dropped** from the chest-pain slip line in all three languages; "belum" says "not YET enrolled" |
| Disagreed | ms and zh avoidance chips, ms caregiving line — kept as shipped |

**Where two reviewers disagree and neither finds an error, what ships stays.** One
model's fluency preference against another's "this matches the English" is not
grounds to change copy, least of all parser input.

**Astra found what a back-translation cannot.** "Programmes referred to you" is
fluent, faithful-looking Malay that says the wrong thing. Dropping "on exertion" from
the chest-pain flag leaves a grammatical sentence that describes a different symptom,
on the one line carrying the absolute contraindication.

### ⚠️ Two corrections would have broken the parser

Chip text is parser input, and a reviewer reading for language cannot see that.

| Correction | Applied as written | Effect |
|---|---|---|
| ms "Tidak pernah jatuh" | `falls=1, fallsRisk=true` | every Malay speaker who never fell recorded as having fallen |
| ms "mengelakkan diri daripada…" | `avoidsActivity: false` | the fear-of-falling flag lost for Malay speakers |
| ta "இரண்டு அல்லது அதற்கு மேற்பட்ட…" | `falls=1` | two-or-more read as one |

`clinicalFlags.i18n.test.js` catches all three, and was run with the tokens removed
to prove it does rather than to assume it. The first two were fixed by extending the
token list, keeping the old tokens so answers already collected still parse.

### `CP31` — the Tamil copy was working around a parser bug

The third is different. `அல்லது` ("or") begins with `அல்ல`, a negator, and Tamil
negation is adjacent — so "இரண்டு அல்லது…" read as a denial of "two". That was worked
around **in the copy**: the chip said "இரண்டு முறை அல்லது அதிகமாக", with முறை wedged
in to break the adjacency. It parsed, and it is not how anybody would say it.

Both reviewers proposed the natural wording without knowing that history, which is
the signal that the constraint was in the wrong place. A parser that forces awkward
copy onto residents to protect itself has the dependency backwards, and every future
reviewer would have proposed the same correction again. Fixed in the parser; the
Tamil now reads as Tamil.

### Still owed, and now visible

- `slip.flagLines` **was never in the registry at all.** Ten lines printed on the slip
  a resident carries to a community centre, translated for group 4 and never entered,
  so `reviewDebt` under-reported and no reviewer working from the registry would have
  been shown them. Found because a cross-check was recorded against them and the test
  refused a cross-check for a string it did not know — written to catch a typo, caught
  a gap.
- ⚠️ **A DECISION FOR THE OWNER, RE-OPENED BY BOTH REVIEWERS.** `fallsAvoiding.ta`
  uses the neuter `தவிர்க்கிறது` ("it avoids") where a person is being described.
  Raised once before and **settled by the owner: left as it is**. Both models have now
  flagged it independently, and they propose different fixes — Gemini the verbal noun
  `தவிர்ப்பது`, Astra the honorific `தவிர்க்கிறார்`. Not changed. The prior decision
  stands until the owner says otherwise; recorded here because the evidence behind it
  has changed.
- ⚠️ **A GAP IN THE ENGLISH, NOT THE TRANSLATIONS.** Astra flagged the same thing in
  all three languages: the review instruction says the avoidance chip must convey
  avoidance **out of fear**, and the English chip — "A fall, and I now avoid some
  activities" — does not mention fear. The translations match the English faithfully.
  The English is what needs deciding first.

---

## ⚠️ THE BUILD IS GREEN BECAUSE SOMEBODY SIGNED, NOT BECAUSE IT IS REVIEWED

**2026-09-13 — the owner signed a waiver for all three `measures.*` strings.**

    node scripts/copy-review-sheet.mjs

    measures.doNotSelfTest  [⚠️ ON SCREEN, UNREVIEWED — waived by Repository owner
                             (maximustylus) on 2026-09-13]
    measures.noComparison   [same]
    measures.notADiagnosis  [same]

    9 strings outstanding, 3 safety-critical.
    None are failing the build.

    ⚠️  3 of them are ON SCREEN AND UNREVIEWED, and the build is green only
        because somebody signed for them.

The owner was shown in plain terms what the waiver permits, including the specific
failure it exposes: a machine turning *"do not try this on your own"* into *"you
might prefer someone with you"*, which reads perfectly and is not a prohibition.
They chose to ship for community testing.

**This is a debt, not a resolution.** `reviewDebt()` still returns all three, the
sheet still lists them, and nothing about the strings has changed. To clear it
properly: three reviewer names in `reviewedBy`, then delete the waiver entries.
`docs/CD13-translation-review.xlsx` group 5 has everything a reviewer needs.

⚠️ **THE WAIVER COVERS THE WORDS, NOT THE KEY.** Reword any of the three, in any
language, and the signature is over text nobody decided about. `copyReview.test.js`
asserts the shipped English still matches the `english` recorded in the registry
and fails the build if it drifts, so a silent reword cannot ride the old signature.

⚠️ **TWO MACHINE CROSS-CHECKS COVERED NONE OF THESE THREE.** Gemini and Astra both
reviewed the workbook as it stood before Group 5 was added to it. Nothing has
checked these three, in any language, by any means.

---

## `P9` — the measurement questions landed 2026-09-12

Three questions, immediately before record linkage, in both pathways:

| | Asked when | Answer |
|---|---|---|
| Grip strength | a published reference covers the age (20+) | kilograms, or skip |
| Standing up from a chair | the same | repetitions, or skip, or "not sure which test" |
| Where it was measured | either figure was given | one of eight settings |

**The protocol comes from the age**, one minute under 60 and thirty seconds from
60, and the question NAMES its stopwatch so a resident timed differently can say
so. Verified in the built app: a 45-year-old is asked about one minute, a
67-year-old about thirty seconds, in all four languages, zero page errors.

**"I am not sure which test" is an answer, not a blank.** It keeps the number and
refuses the comparison. A thirty-second count read against one-minute norms would
tell somebody they are far weaker than they are, and that is the likeliest way
this feature hurts anyone.

**Neither figure feeds `calculateRiskScore`** (`CD20`). Skipping both changes
nothing about the result.

⚠️ `CP29` **FOUND AND FIXED HERE, INTRODUCED BY ME IN THE COMMIT BEFORE.** The chat
passes the WHOLE parsed object to `recordTelemetry` as its payload. When `ageYears`
was added to `parseClinicalData`, the precise age therefore started going to
Firestore beside postal sector, sex, ethnicity and housing type. I caught it in the
form and missed it in the chat.

The fix is not at the call site, because that is where it failed: the strip now
happens INSIDE `recordTelemetry`, so no caller can leak by forgetting. `ageYears`
and the raw measurement figures are removed at any depth before the write.
`telemetry.test.js` covers it.

---

## `P9` — the pathway split landed 2026-09-12

The conversation now runs: physical activity, then sex, then a precise age, then
everything that branches on it.

| | Before | After |
|---|---|---|
| Activity questions | 1-3 | 1-3 |
| Sex | 9, as "age group and gender" | 4, sex only |
| Age | 9, as a band | **5, as a year** |
| Falls (60+) | 14, after record linkage | 11, after the age is known |
| Record linkage | 13 | last |

**Why a year and not a band.** The published strength references are cut in
five-year rows from 20 to 100+. "60+" spans eight of them, so a record collected
as a band can never be compared and nobody can be told why. `parseAgeYears`
returns `null` for a range rather than picking an end of it: a guess here does not
produce a missing comparison, it produces a WRONG one, shown to somebody as if it
were about them.

**Only the band is stored.** The year is used to pick the reference row and is then
dropped. The telemetry payload already carries postal sector, sex, ethnicity and
housing type, and a whole-year age beside them narrows a record to very few people
in a sector.

**Both pathways changed together.** The form's age-group select is gone too, and
`pathwayParity.test.js` now asserts that neither pathway offers bands again and
that both gate the falls question through `isSixtyPlusPerson`. That gate has now
broken twice for the same cohort: first as a `/60\s*\+/` substring test that only
matched the chip text (`CP26`), then it would have broken again reading
`demographics` for an age that had moved out of it.

Verified in the built app, four languages, zero page errors: the progress total
goes 15 → 16 at the age question for a 67-year-old and stays 15 for a 45-year-old.
The only console errors are blocked Firebase calls in the sandbox.

~~⚠️ `CP28` **OPEN, PRE-EXISTING, NOT INTRODUCED HERE.**~~ **FIXED 2026-09-16** on `community`: `badgeCopy.js` carries the words for all 25 steps in four languages and `badgeFor` keeps the emoji; `badgeCopy.test.js` fails if a step or a language is missing. Machine translated, under `CD13`. The original note: the step badges
("👤 About You", "🎂 Your Age", "🩺 Health & Safety Check") are English in all four
languages, and always have been — every badge in `DOMAIN_CONFIG` is a literal. It
is visible to a Chinese or Tamil speaker on every question. Out of scope for `P9`
and logged rather than left unsaid.

---

⚠️ **STILL OWED, AND IT IS A REAL DEBT — `CD13`.** Everything translated so far is
machine-translated and **reviewed by no native speaker**. Two models were involved
and that is not a second opinion, since neither can read back what it wrote.
**2026-08-24: the review instrument exists** — `docs/CD13-translation-review.xlsx`,
one sheet per language, all 19 strings beside their English and (for group 1) the
machine back-translation, the four value-changing checks marked CRITICAL, and a
named sign-off per sheet. Ten minutes per reviewer; what remains is three readers:

| Set | Strings | Translator |
|---|---|---|
| Group 1 — falls & Healthier SG | 9 × 3 | Claude |
| Group 4 — the ten slip flag lines | 10 × 3 | Google Gemini 3.1 Pro |
| Group 5 — P9 functional measures | 3 × 3 **safety-critical** | Claude |

**2026-09-12: group 5 landed, and it is a different kind of string.** Groups 1 and 4
are questions and observations: a mistranslation collects a wrong answer or reads
awkwardly. The three in group 5 are **prohibitions**, and the owner's own standing
rule is that this category is not machine-translated alone:

| Key | What it has to stop |
|---|---|
| `measures.doNotSelfTest` | somebody attempting a timed chair stand alone, unassisted |
| `measures.noComparison` | somebody reading a comparison that was never made |
| `measures.notADiagnosis` | somebody treating a number as a diagnosis |

A prohibition degrades quietly. *"Do not try this on your own"* comes back as a
suggestion and still reads perfectly well, so a reviewer skimming for accuracy
passes it. That is why these three are gated rather than tracked.

**The gate is now in code, not in this document.** `src/data/copyReview.js` is the
registry, `src/data/copyReview.test.js` fails the build, and
`scripts/copy-reachability.mjs` decides when. The trigger is **when a resident can
read the string**, resolved against the real import graph, not when somebody types
it: the copy exists in four languages today and no component imports it, so the
build is green. It goes red the moment the entry screen lands, which is exactly when
a reviewer is needed and not weeks before.

    $ node scripts/copy-review-sheet.mjs
    7 strings outstanding, 3 safety-critical.
    None are on a resident-facing screen yet, so none are failing the build.

⚠️ **THE BUILD WILL GO RED WHEN THE UI IS WIRED.** That is the mechanism working, not
a regression. It clears one of two ways, and only these two: three names against the
three strings in `reviewedBy`, or a dated, owner-named entry in `REVIEW_WAIVERS`. A
waiver is a debt somebody signs, not a way past the gate.

`copyReview.test.js` proves the gate can actually fire — it simulates the import and
asserts the build fails — because a gate that never goes red looks identical to a
gate that is satisfied.

`TRANSLATION-BRIEF.md` carries a back-translation of every string and names the four
a reviewer must check, because they change a value rather than a sentence:
`falls.chip1` must not read as *"I fell"*; `hsg.chip3` must not read as *"no"*;
`falls.chip4` must convey avoidance **out of fear**; and each slip flag line must
read as something a person would accept being said about them to a stranger.

**Ten minutes from somebody who reads the language, and it is the only thing between
the current state and being able to call the portal translated.**

⚠️ One Tamil query was raised and **settled by the owner: left as it is.**
`fallsAvoiding.ta` uses the third-person neuter verb where the honorific would be
expected. Recorded in `slipFlagLines.js` so it is not re-discovered and "fixed" by
somebody who also cannot read Tamil.

⚠️ **AND GROUPS 2, 3 AND 4 ARE STILL ENGLISH ONLY, DELIBERATELY.** Group 2 is the
in-chat action cards, including the URGENT tier — the text somebody reads
immediately after reporting chest pain. Questions and clinical instructions are not
the same risk, and the argument for machine-translating the first does not carry to
the second.

---

**Deliberately NOT filed as defects, because they are judgement calls that belong
to the owner rather than to me:**

- **`'Some stress but managing'` sets `psychologicalDistress`.** The chip's own
  wording says the person is coping; the flag adds a risk point and counts them in
  the population distress figure. Defensible either way, but it should be a
  decision rather than a side effect of the term list containing `'stress'`.
- **`'I mostly manage on my own'` sets `socialIsolation`.** Same shape, and this one
  reads correct to me — recorded so the next pass does not "fix" it.

---

## Current queue

In order. `P0` first because it is the only item on this page whose blast radius is
larger than one respondent.

```
P0.3  App Check + rate limit                 ─ needs the Firebase console
CD13  native-speaker review of 19 strings    ─ owner's; the only thing left on group 1 + 4
CD10  groups 2, 3, rest of 4                 ─ owner's call; group 2 is the URGENT tier
CD4 / CD11                                   ─ owner's, in parallel, not blocked on me
P3.4  CP8 resource freshness policy             ─ OWNER DECISION; engineering scaffold shipped under CP16
P6.2  P6.3                                    ─ CD12 owner design: PDF and share output
CD14  CD15  CD16                             ─ owner's, from the RHS review (P8 below)
CD17  through CD25                           ─ OWNER DECISION; proposed measures, no build authorised
```

`P0.5`, `P4.2`–`P4.6`, `P5` and the completed translation work in `P7.7` were removed
from the active queue on 2026-09-10: their own rows already record them as closed,
`DONE`, or settled and shipped. `CD13` retains the native-speaker review that remains.
This is a queue correction, not a new closure.

---

## P8 — Decisions promoted from the RHS review · `CD14` `CD15` `CD16` · owner's

`REVIEW-RHS-SOCIAL-PRESCRIBING.md` (2026-08-22, an external-perspective read of the
portal; archived at tag `docs-archive-2026-09-06`) ended with five things a Regional
Health System would need before piloting. Two were code and became `CP` rows. Three are
decisions and were tracked nowhere until 2026-09-03; they are recorded here, which is what
let the review be archived without losing them.

| # | Id | Decision | Owner | Status |
|---|---|---|---|---|
| 8.1 | `CD14` | **A consent model** that lets a respondent opt into being contacted. Today the screening flow collects no resident account or contact details, so nobody can be contacted; whether the remaining fields and session identifiers meet any legal de-identification standard is not established. A referral pathway needs contact data only on the person's say-so. | **OWNER** | `OPEN` |
| 8.2 | `CD15` | **A named partner willing to receive referrals**, and the channel they receive them through. The printable slip (3e.6) is the current answer; it assumes the person carries it. | **OWNER** | `OPEN` |
| 8.3 | `CD16` | **The data-retention position in writing** — how long `community_assessments` are kept and who may read them. `functions/retention.cjs` implements *a* window; the policy it implements has not been stated anywhere a member of the public could read. Overlaps `P5` and the info card's §4. | **OWNER** | `OPEN` |

---

## ~~P9 — `PROPOSED` functional measures~~ · **SHIPPED** v2.13.0 / v2.14.0 · `CD21` `CD23` open

> ⚠️ **This section is the pre-build proposal and is kept as the record of it. The feature
> is deployed.** Grip strength and sit-to-stand shipped in **v2.13.0**; the reference meters,
> the heart rate block and the on-screen rendering shipped in **v2.14.0**. See `P9` (the
> report page), `P9b` (the picture) and `CHANGELOG.md`.
>
> Of the nine decisions below, **`CD17` `CD18` `CD19` `CD20` `CD22` `CD25` are settled** —
> recorded in the code (`src/utils/functionalMeasures.js`, `src/data/functionalNorms.js`) and
> in `COMMUNITY_CHANGELOG.md`. **`CD21` (source wording) and `CD23` (re-measurement) are the
> two that remain with the owner.** `CD24` was overtaken: heart rate shipped under `CD27`.

[`docs/FUNCTIONAL-MEASURES-ADDIE.md`](docs/FUNCTIONAL-MEASURES-ADDIE.md) explores adding
grip-strength and sit-to-stand values to the public pathway. Revision 1 replaces the original
recommendation where they differ.

| # | Id | Decision | Status | Proposed direction |
|---|---|---|---|---|
| 9.1 | `CD17` | May the portal ask a resident to perform a physical test? | `OWNER DECISION` | No; accept a value measured elsewhere and route to supervised measurement. |
| 9.2 | `CD18` | Show a percentile or a band? | `OWNER DECISION` | Use the source's quintile band and keep ranking language off public surfaces. |
| 9.3 | `CD19` | Which sit-to-stand instrument and age range? | `OWNER DECISION` | Use the 30-second chair stand only for 60+, cited to CDC STEADI. |
| 9.4 | `CD20` | May these values change `calculateRiskScore` or the traffic light? | `OWNER DECISION` | No; display and route without changing the existing risk score. |
| 9.5 | `CD21` | Which threshold sources are approved, and how are their populations described? | `OWNER DECISION` | Independently verify the supplied tables, protocols, permitted use and population labels before approval. |
| 9.6 | `CD22` | Where does the result fit in the report? | `OWNER DECISION` | Prefer tiles in the existing strip instead of displacing page-one safety content. |
| 9.7 | `CD23` | Is re-measurement implemented or is “starting point” removed? | `OWNER DECISION` | Implement linkage only if it can be made real and explained accurately. |
| 9.8 | `CD24` | Do wearables and AI extend this portal? | `OWNER DECISION` | Keep them in a separate authenticated, consented product. |
| 9.9 | `CD25` | Collect five-year age bands or drop age-specific comparison? | `OWNER DECISION` | No age-specific result until the input can select a supported source band. |

`CD17`, `CD18`, `CD19` and `CD25` block every build item because they determine the
instrument, input shape and public output. The other five decisions remain open and must
be settled before their affected build steps. Recommendations above are `PROPOSED`, not
accepted policy.

---

## P10 — `CP27` · the chat asked two questions the server would not accept · risk: medium

Found while preparing the P9 build, because P9 appends conditional steps by the
same mechanism that broke here. Fixed on branch `community` and merged to `main` (`0feb71d`); live since v2.12.4.

`AuraChat` sends `domain: stepKey` for every answered step. `communityAck`'s
`validateAckRequest` rejects any domain outside `COMMUNITY_DOMAINS` with *"Unknown
assessment domain."* `CP26` appended `falls` and `healthier_sg` to the client's
`DOMAIN_CONFIG` and never extended the server list, so **both answers were rejected
at the endpoint and neither was ever acknowledged in the chat.** `falls` is gated to
residents aged 60 and over, so the failure landed on older adults specifically —
the same cohort `CP26` was itself about, failing a second time by a second route.

The two lists cannot import each other: the client is ESM under `src/`, the
function is CommonJS behind its own `package.json` and its own deploy. Nothing made
them agree and nothing could see that they did not.

| # | What | Id | Status | Evidence |
|---|---|---|---|---|
| 10.1 | Extract `DOMAIN_CONFIG` so the step list can be imported without `AuraChat` | `CP27` | `DONE` | `src/data/communityDomains.js`. Importing `AuraChat` pulls `src/firebase.js`, which calls `getMessaging(app)` at module scope and throws outside a browser: `FirebaseError: messaging/unsupported-browser`. The invariant was untestable until this moved. |
| 10.2 | Contract test: every client step is a domain the server accepts | `CP27` | `DONE` | `src/components/AuraChat.domainParity.test.jsx`, **34 tests**. Before the fix: **5 failed**, `expected [ 'falls', 'healthier_sg' ] to deeply equal []`, including `validateAckRequest` returning `ok: false` for both through the real validator. |
| 10.3 | Add the two keys to `COMMUNITY_DOMAINS` | `CP27` | `DONE` | `functions/communityAck.js`. After: **34 passed**. Full suite **3781 passed, 113 files**; `npm run lint` clean at `--max-warnings 0`; `npm run build` ✓. |
| 10.4 | Follow the extraction in `pathwayParity.test.js` | `CP27` | `DONE` | The falls-gate assertion read `AuraChat.jsx` for `isSixtyPlus(` and failed on the move. Now asserts `data/communityDomains.js`, keeping both the positive gate and the "must not re-introduce a substring test" guard. **23 passed**. |
| 10.5 | Remove the hardcoded "thirteen lines" count in `priorAnswerLines` | `CP27` | `DONE` | It would have read thirteen against a list of fifteen. `AC14` is the precedent for exactly this; the comment now describes the bound instead of counting it. |

⚠️ **The parity test is the only thing holding this contract.** There is no shared
module and there cannot be one across the two deploys. Appending a step without
adding its key must fail in CI, and `AuraChat.domainParity.test.jsx` is where.

---

## `P11` — the two front doors asked different questions · `CP40`–`CP44` · **SHIPPED v2.15.0**

Found 2026-09-16 by the owner reading v2.14.1 on the live site, one screenshot at a
time, and then by the tests written for what the screenshots showed. None of the
five was visible to anything the repository had. Shipped in v2.15.0 on 2026-09-16.

### `CP40` — AURA acknowledged twice in one breath · **FIXED**

Every bot turn is `reflections[key](answer) + ' ' + prompts[nextKey]`. Somebody
who answered "0 days" was told "Starting from zero is completely valid, many people
are in the same position, and that is exactly why these programmes exist" and then,
without a pause, "No problem at all, most people start exactly where you are, and
that is why these programmes exist." Two more prompts did it in a milder form:
"A solid base to build on. **Great.** And on those active days..." and "...just as
important as aerobic activity. **Thank you.** Now two quick things about you...".

Neither half was wrong on its own, which is why this passed review in four
languages: the duplication only exists in the JOIN, which no reader of either file
ever sees. Prompts now ask and nothing else; `chatTurnShape.test.js` builds the
join and fails on a repeated six-word run or a prompt that opens with an
acknowledgement, in all four languages.

### `CP41` — three languages asked a question that contradicted the answer · **FIXED**

English branched `pavs_mins` on a zero answer precisely because "on those active
days, how many minutes do you usually exercise" is nonsense to somebody who just
said zero. Malay, Chinese and Tamil had no branch and asked it anyway. The server
persona had forbidden the model from doing this since it was written; the static
copy, which is what a resident sees when the model is slow, was doing it regardless.

⚠️ The three new question strings are machine translated. See `CD13` and the
   review pack at `docs/TRANSLATION-REVIEW-2026-09-16.md`.

### `CP42` — the form could not record a 4-room flat · **FIXED**

The chat offered six housing options and the form three, collapsing 3-Room, 4-Room
and 5-Room/Executive into "HDB 3 to 5 Room" and condo with landed into "Private
Property". The same resident stored a different `housingType` depending on which
door they walked through. The form now offers the chat's six, `value` for `value`,
and `ConventionalForm.housing.test.jsx` fails if the lists drift.

### ⚠️ `CP43` — the housing risk flag only ever fired in English · **FIXED, and worth an audit**

Found by the parity test on its first run, and the most serious thing in this
section. `sdohHousing` tested `/1-2 room|1–2 room/i` against the chip the resident
tapped, and the chips are translated:

    en   HDB 1-2 Room     matched
    ms   HDB 1-2 Bilik    NEVER MATCHED
    zh   HDB 1-2 房式      NEVER MATCHED
    ta   HDB 1-2 அறை      NEVER MATCHED

So for every Malay, Chinese and Tamil resident in a one or two room rental flat,
the social-risk proxy the evidence page describes was false, and
`communityServices.js` routes on it. Same shape as `CP26`: a matcher written
against the English chip in a portal that ships four. It now matches the room
COUNT, which is the one part nobody translates, plus HDB anywhere in the string.

**Owner's question, not mine:** how many stored records this touched. The flag is
derived at submission and the chip text is not retained, so it cannot be
recomputed from what was kept.

### `CP44` — "Last one" was said three times, and "one more" with a dozen to go · **FIXED**

`healthier_sg` opened "Last one." in four languages and stopped being last in
v2.13.0 when the measurements were appended after it. `food_insecurity` opened
"One more quick question" as the ninth of up to twenty-four. Adding the perception
block put a second "Last one." on the free-text question, five after the first,
with record linkage still to come. `previous_id` is unconditional and genuinely
last, so it alone may say so, and the test pins that.

### The six questions the form asked alone · **SHIPPED v2.15.0**

The conventional form had asked six questions since it shipped that AURA never
did. The owner chose to add all six to the chat rather than remove them from the
form or document the difference.

| Key | Where | What it does |
|---|---|---|
| `income_adequacy` | after food security | **feeds `sdohFinancial`** — the one that changed a result |
| `services_aware` `ever_referred` `service_rating` `care_comfort` `one_change` | last, before record linkage | stored as `perception`, scored by nothing |

Built from one table in `perceptionCopy.js` and appended, the way the measurement
questions are, so a language cannot be short by construction. `service_rating` is
not asked of somebody who has just said they have not heard of the services and was
never referred, in any of the four languages. The chat is now **up to 24 steps** for
a 60+ resident who is measured, from 15; the five perception questions sit last so
that abandoning there costs nothing the assessment needs.

⚠️ 21 new strings × 3 languages, machine translated, none safety-critical, none
   gating the build. Listed for review in `docs/TRANSLATION-REVIEW-2026-09-16.md`.

---

## `P12` — the owner's Malay read-through · `CP45` `CP46` · **on `community`**

The first native read of any of this portal's Malay, by the owner's team on
2026-09-17. It found what two model rounds did not.

### `CP45` — "manage on my own" flagged social isolation in English only · **FIXED**

The Malay chip read `Saya mostly uruskan sendiri`, with the English word left in.
Worse than the word: the social-isolation matcher knew "on my own" and
"keseorangan" and nothing else, so the Malay, Chinese and Tamil chips for the
same answer never flagged. A resident who said they mostly manage alone was
flagged in English and not in the other three languages. Same shape as `CP43`
and `CP26`. The chip is now `Saya kebanyakannya uruskan sendiri`, the matcher
carries a marker for each language, and `pathwayParity.test.js` runs all four
social chips through it in all four languages.

### `CP46` — "Share Result" sent a link to the portal, not the result · **FIXED**

Tapping Share opened the OS share sheet with one line of text and the NEXUS URL.
A resident sending their result to a family member sent an invitation to take the
assessment. It now builds the same three-page PDF the Download button produces and
shares the file where the browser can share files (`navigator.canShare`), and
downloads it where it cannot. The "Print summary" button is gone at the owner's
direction: the PDF covers it.

### `CP47` — page 3 of the report was English in every language · **FIXED**

The governance page (the medical disclaimer, the evidence table, the privacy
notice, the Healthier SG block) was a set of English literals. A Malay resident's
report was two pages of Malay and one of English, and the English page was the one
that says what the document is not. Now `governanceCopy.js`, four languages, and
the on-screen disclaimer and privacy blocks read from the same table.

⚠️ `governance.disclaimer` is registered as safety-critical. It tells somebody
with chest pain to seek immediate medical attention; its ms/zh/ta is machine
translated and unread, so the build is red until a person reviews it or the owner
signs a waiver, as with `hrCaution`. **Owner's call.**

Also on the owner's direction the same day: every font in the printed report is
one step larger (7 to 8.5, 9 to 10.5, 10 to 11.5, 11 to 12.5, 14 to 16, 24 to 27),
with the room taken back from padding and gaps and one changelog sentence in the
evidence table, never from type. The Healthier SG logos are 40 to 44px and the
printed URLs are gone; each row stays a live link in the PDF. Headroom after:
page 1 worst case 24px, Tamil page 3 37px, nothing clipping in sixteen scenarios.
The heart-rate chips were re-measured at the new size and sit 1.6px below centre,
as before.

### Malay terminology, per the owner and Malaysia's MOH physical activity guidance

| Was | Now | Where |
|---|---|---|
| `pelan` | `rancangan` | chat CTA title, one reflection, the form's housing note |
| `senaman sederhana atau kuat` | `aktiviti fizikal tahap sederhana atau tinggi` | the first chat question |
| `bersenam lebih kuat` | `bersenam pada intensiti lebih tinggi` | `hrCaution`, the medication note, the symptoms note |
| `julat yang lebih kuat` / `Sangat kuat` / zone `Kuat` | `... lebih tinggi` / `Sangat tinggi` / `Tinggi` | the heart-rate table |

⚠️ Two of those are the waived safety strings (`measures.hrCaution`,
`hrSuppressedSymptoms`). The change is one word of intensity vocabulary each,
directed by the owner; the prohibition is untouched. Recorded in
`TRANSLATION-BRIEF.md` as the first human correction to Group 5.

The sit-to-stand wording was checked against the MOH text supplied; that text
describes the physical activity guidelines and does not name the chair-stand
test, so the Malay for it (`bangun dari kerusi`) is unchanged pending a term.

---

## What not to rebuild

Recorded so a future pass does not "fix" something that is already right:

- **The two pathways converging on one scoring function.** `ConventionalForm` and
  `AuraChat` gather differently and then share `calculateRiskScore`, `selectCTA` and
  `ResultPage`. That is the best structural decision in the portal. `P4.2` extends it;
  it does not replace it.
- **The CTA precedence ladder.** `symptomFlag` → `medFlag` → age → SDOH → activity is
  clinically right, even where `CD4` questions the destination.
- **The four-language support.** It is real, it covers the resource registry, and
  `CP10` is a gap in it — not a reason to reconsider it.
- **The localized ResultPage resource cards.** The 16 stable ids, destinations,
  logos and four-language copy now live in `src/data/communityResources.js` and
  feed a directly tested deterministic plan. The former branch-level Firestore
  inventory, addresses, prices and hours were unused and are `HISTORICAL`; they
  must not be described as verified current data. `CP8` governs review of the
  factual claims that remain on live public surfaces.
