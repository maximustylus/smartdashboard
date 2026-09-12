# NEXUS Community Portal — Remediation Ledger

**This file is the plan and the live status.** The finding text behind each `CP` row was
`POSTMORTEM-COMMUNITY.md`, a frozen 2026-08-21 snapshot, removed on 2026-09-06 and
readable at tag `docs-archive-2026-09-06`. AURA — the AI behind the chat pathway — has its
own ledger in [AURA-TODO.md](AURA-TODO.md) (`AU`n / `AC`n / `AN`n). Three things there bear directly on this
ledger: `AU13` corrects `CP12`'s `Math.random` evidence string, which was false as
written (row 4.6 now says what the grep returns; the code half of `AU13` is still open);
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
| `DONE`, evidenced | 16 | `CP1` `CP2` `CP3` `CP5` `CP6` `CP7` `CP9` `CP12` `CP13` `CP14` `CP15` `CP16` `CP17` `CP18` `CP19` · `CP27` (P10, on `community`, not yet on `main`) |
| `OPEN`, mine | 0 | — |
| `OWNER DECISION`, console only | 1 | `CP7`'s last two steps — see *Turning App Check on*, below. The code is shipped and inert. |
| `OPEN`, translation | 1 | `CP10`/`CD10` groups 2, 3 and the rest of 4 — group 1 and the slip's flag lines are shipped, see `7.7` |
| `OWNER DECISION`, content governance | 1 | `CP8`: name the content owner, review interval and stale-claim action. |
| `OWNER DECISION` | 17 | `CD4` `CD10` `CD11` `CD12` (design) `CD13` (translation review) · `CD14`–`CD16` (consent, referral partner, retention) · `CD17`–`CD25` (proposed functional measures; P9) |

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

## P7 — Found by the pre-merge stress test · `CP22`–`CP26` · risk: **high** · **FIXED** (bar `7.7`)

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
| 7.7 | **Falls and Healthier SG are English-only** | `CP26`, and a consequence of `CD10`. `en` shipped **15** prompts, `ms`/`zh`/`ta` shipped **13**. `isStepAvailable` correctly skipped the untranslated two, so a Malay, Chinese or Tamil speaker was never asked about falls or Healthier SG — the older, less English-dominant residents an Active Ageing Centre referral targets got the shortest assessment. | **OWNER** → me | `DONE` — see below. **The translation was the safe half.** |
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

## P9 — `PROPOSED` functional measures · `CD17`–`CD25` · owner's

[`docs/FUNCTIONAL-MEASURES-ADDIE.md`](docs/FUNCTIONAL-MEASURES-ADDIE.md) explores adding
grip-strength and sit-to-stand values to the public pathway. Nothing is implemented or
authorised for build. Revision 1 replaces the original recommendation where they differ.

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
same mechanism that broke here. Fixed on branch `community`; not yet on `main`.

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
