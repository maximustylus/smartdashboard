# Changelog — NEXUS Community Portal

Changes to the **`/individuals/*` surface**: the public health screening, its two
pathways, and the Cloud Function behind the chat.

> ### How this relates to the other two files
>
> | | |
> |---|---|
> | **[CHANGELOG.md](CHANGELOG.md)** | the whole application, and **authoritative for the version**. `package.json` `version` is the single source of truth; nothing here overrides it. |
> | **this file** | the community portal only, in more detail than a whole-app changelog can carry, and cross-referenced to the ledger |
> | **[COMMUNITY_TODO.md](COMMUNITY_TODO.md)** | what is still open, with ids `CP`n and `CD`n |
>
> The portal ships inside the same bundle as the roster, so it has **no version of its
> own**. Entries below are filed under the app version they will ship in. Creating a
> separate version series for one surface is how a project ends up with two numbers that
> disagree, and this repository already documents that failure once.
>
> ### ~~⚠️ Nothing in this file is deployed~~ Shipped — 2026-08-25
>
> ~~Every entry below is on a branch. The portal members of the public can reach **today**
> still contains the defects listed under *Fixed* — including `CP1`, the risk score that
> never measured activity. This file records what is ready, not what is live. It will
> say otherwise on the day it is true and not before.~~
>
> **It is true now.** The community branch merged to `main` on 2026-08-25 (`2ba1c15`) and
> the entries below shipped in app **v2.1.2 / v2.1.3**; the v2.1.3 lay-language pass over
> the same surfaces is recorded in `CHANGELOG.md`. Nothing on the live portal carries `CP1`.

---

## Unreleased — on `community` · `P11`, the two front doors asked different questions

Ids in **bold** are from [COMMUNITY_TODO.md](COMMUNITY_TODO.md). **Nothing in this
section is live.** `main` is v2.14.1; this is on `community` awaiting a merge.

### Fixed

- **CP40** — AURA acknowledged twice in one breath. The zero-days turn said
  "starting from zero is fine" in two consecutive sentences; two other turns ran
  "A solid base to build on. Great." and "...aerobic activity. Thank you.". Each
  half was fine alone; the duplication lived only in the join, which nobody reading
  either file sees. Prompts now ask and nothing else, and a test builds the join.
- **CP41** — Malay, Chinese and Tamil asked a resident who had just said "0 days"
  how many minutes they exercise on those active days. English had a branch for
  this; the other three did not.
- **CP42** — the conventional form offered three housing options where the chat
  offers six, so a 4-room resident could not say so and the two pathways stored
  different values for the same person. The form now offers the chat's six.
- **CP43** — **the housing social-risk flag only ever fired in English.** The chip
  test required the word "room"; the chips are translated. For every Malay, Chinese
  and Tamil resident in a 1-2 room rental flat the proxy was false, and resources
  route on it. Now matched on the room count, which is never translated.
- **CP44** — "Last one" was said by a question that has not been last since
  v2.13.0, and by a second question after it; "one more question" by the ninth of
  up to twenty-four. Only the final question may say so now.
- Em dashes out of the chat, the form, the result page and every call to action,
  in four languages, and "for example 67" out of both age questions. Both were
  standing instructions that had reached the report copy and not the rest. The
  model-written half of each turn is governed by a new persona rule, since it
  cannot be swept from the repository.

### Added

- **The six questions the form asked alone**, now asked by the chat: income
  adequacy (feeds the financial-strain flag; the one that changed a result) and
  five about how community care is experienced (stored, scored by nothing). Built
  from one table so no language can be short. The chat is now up to 24 steps for
  a 60+ resident who is measured; the five sit last so abandoning there costs
  nothing the assessment needs.
- Four guards: the reflection+prompt join, em dashes in rendered copy, the two
  housing option lists, and pathway parity for every flag both doors derive.

### Translation

21 new strings and 12 reworded, × 3 languages, machine translated, none
safety-critical. Review pack: `docs/TRANSLATION-REVIEW-2026-09-16.md`.

---

## Shipped in [2.14.1] — `CP39`, the chips were drawn through their own heading

Ids in **bold** are from [COMMUNITY_TODO.md](COMMUNITY_TODO.md).

### Fixed

- **CP39** — on page 2 of the printed report, the first heart rate range chip was
  drawn over the words "Beats per minute", which then read as struck out, and the
  numbers in all five chips sat on the floor of their pill rather than in the middle
  of it. Found in a **production download** a resident could have been handed, five
  hours after v2.14.0 went live.

The row was `alignItems: stretch`. The chip took the row's height and, being a plain
padded block, grew upward into the headings. `alignItems: center` fixes that half.

The other half is html2canvas: it places the text baseline lower in the line box than
the browser does, so the digits sat **4.6 CSS px** below the centre of a 19px chip.
Flex-centring the text inside the chip did not move it; an explicit height with a
matching line height clipped the digits through the middle. What works is to leave the
top padding at zero, hold the line box to exactly the font size, and put the whole 8px
underneath — the box moves down around the text instead of the text moving inside the
box. 1.7px below centre, at the same chip height, so headroom is unchanged.

The app view is not rendered through html2canvas and needed none of this; it centres
with flex and always did.

### What this cost, and what it changed about how the report gets checked

Nothing in the repository could see either half of this defect.

    pdf-headroom.mjs   measures whether content FITS. It passed, correctly,
                       through every broken state. Height was never the problem.
    pdf-verify.mjs     checks page count and where links are stamped. Both right.
    vitest             asserts the chips render with the right colours and the
                       right numbers in them. They did.

And **reading a crop did not see it either**. The first attempt at this fix cleared
the collision, was eyeballed against a render, and left the digits exactly as low as
they had been — the correction went into the commit message of the fix itself. The
check that found it is a measurement, not a look: `pdftoppm` at 300dpi, then the ink
bounding box inside each pill compared against the pill's own box.

---

## Shipped in [2.14.0] — `P9b`, the measurements page gets a picture

**The copy-review gate was cleared on 2026-09-15 by the repository owner's signature
for the two heart-rate strings, on its own waiver line.** The 13 September waiver was
not extended. `reviewedBy` remains null in Malay, Chinese and Tamil: the wording was
corrected across two machine passes, but no person has read it. See `CD26` in
[COMMUNITY_TODO.md](COMMUNITY_TODO.md) for the risks stated and accepted.

Ids in **bold** are from [COMMUNITY_TODO.md](COMMUNITY_TODO.md).

### Added

- **A reference meter under each measurement.** It draws only the figures the source
  publishes: eleven percentile marks for grip, five for the one-minute chair stand,
  and **one** for the thirty-second chair stand, which is the test every resident
  aged 60 and over takes and for which STEADI publishes a single cut-off and nothing
  above it. `functionalMeasures.js` now exposes `scale` — what a chart is allowed to
  draw — so the picture cannot claim a precision the paper does not have.
- **Heart rate ranges from the resident's age**, with the five zones, what each is
  for, and both requested equations printed. Tanaka computes the numbers; Astrand is
  shown for comparison and never used, because its stated population stops at 34 and
  this page is read mostly by people past 60. The spread between individuals of the
  same age is printed beside every figure.
- **No heart rate table at all** for a resident who reported symptoms on exertion.
  One sentence in its place, and the two equations are then absent from the citation
  list as well, because citing a reference somebody was never shown is a citation for
  something that did not happen.

### Changed

- **The symptoms line is an instruction, and the caution is a prohibition** — the two
  deliberately differ in force (`CD26`, 2026-09-15). The owner chose "Consult your
  healthcare professional before you increase how hard you exercise" over the
  prohibition that briefly replaced it, with the difference put to them explicitly:
  the chosen form tells the reader to consult and does not forbid exercising harder
  first. `hrCaution` stays a prohibition. Recorded beside the strings so the
  inconsistency is not later "fixed" by someone who assumes it is a slip.
- **Both heart-rate safety sentences were made explicit prohibitions first, in all
  four languages** (`CD26`, 2026-09-14). A machine cross-check found the softness was in
  the **English**: the suppressed-symptoms line ended "Please speak to a doctor
  before you increase how hard you exercise", and all three translations were
  faithful to that politeness — so a reviewer checking translation accuracy would
  have passed every one of them. The English now reads "Do not increase how hard you
  exercise until you have spoken to a doctor", and Malay, Chinese and Tamil follow.
  Malay also corrects `kekuatan senaman` to `intensiti senaman`; Tamil replaces
  வேண்டாம் ("do not" / "no need to") with கூடாது ("must not") in the caution.
  Recorded as a cross-check, **not** as review: no reviewer name was entered, no
  waiver was created, the 13 September waiver was not extended, and the gate stays
  red.
- **The heart rate zones use the conventional colours** — grey, blue, green, amber,
  red — as Garmin, Polar and Apple use them (`CD27`). They were teal, chosen to
  avoid red because page 1 prints a traffic light in which red means "High Needs".
  That hazard is real and did not go away with the decision, so a sentence now
  carries it: `hrColourNote` says under the table, in all four languages, that these
  are the usual exercise zone colours and do not mean the same thing as the result
  colour. The first palette draft failed validation where this palette always does —
  straight orange beside straight red at ΔE 8.0 for **normal** vision, under the
  floor of 15. Amber and a deeper red separate them at ΔE 24.4 while still reading
  as the convention. Every row also prints its range inside its swatch and its name
  in words, which is what makes the table survive a greyscale photocopy: blue and
  green are within 0.005 of each other in relative luminance.
- **The heart rate zones got proper headers** (`CD28`), in both media. The block
  heading was the page's sub-heading style, so the largest block on page 2
  announced itself more quietly than the citation list beneath it; it now matches
  its neighbours, and on screen uses the same `<h2>` idiom as every other section.
  The zone table's three columns were unlabelled, which matters most for the middle
  one: "Light" and "Hard" beside somebody's own result read as a grade until a
  heading says they name an intensity.
- **The measurements page is now page 2**, ahead of governance, at the owner's
  request. Governance is last and its footer is numbered from `totalPages` rather
  than a literal, so the printed numbering cannot disagree with the order the PDF is
  bound in.
- Zone benefit lines are short phrases and the talk test is stated **once** below the
  table instead of five times inside it. This was a layout fix with a real cause: see
  below.

### Fixed

- **The whole feature was invisible in the app** (`CP38`). `MeasurementsPanel` was
  rendered once, inside the print template at `position:absolute; top:-10000px`, so
  a resident who had their grip measured, typed the number in and read their result
  on screen saw no meter, no band and no heart rate ranges at any point unless they
  tapped Download and opened the file. **This is the second time this exact defect
  has shipped here** — the first was the medical disclaimer, described in the same
  words in `ResultPage.jsx`. `MeasurementsSection.jsx` is the screen-native
  rendering, and the last test in its suite reads `ResultPage.jsx` and fails if the
  component ever moves back inside the off-screen wrapper.
- **`hrColourNote` told screen readers to look at "page 1".** Correct on paper,
  nonsense in the app. Copy shared by two media cannot describe the furniture of
  either; no language mentions a page now, and a test holds it there.
- **The chair-stand meter overstated two repetitions.** Derived from its single
  published point plus the resident's own count, the drawn axis for a woman of 67 who
  stood 13 times against a cut-off of 11 spanned exactly those two repetitions: the
  band filled nine tenths of the track and her marker sat near the end. Every printed
  number was right; the drawing implied she was near the top of a scale that has no
  top.
- **`81 to 97` was printing in Malay, Chinese and Tamil.** The zone chip's connector
  was an English word written into the component rather than copy.
- **Page 2 was clipping by up to 44px in Malay and Tamil, and what fell off the
  bottom was the safety caution.** Found by `scripts/pdf-headroom.mjs`, whose
  fixtures were also fixed: they lacked `scale`, so the meter did not render and the
  headroom came back unchanged, which looked like good news and had measured nothing.
  Space was recovered from spacing and repeated wording, **not from type size** — 8px
  on A4 is about six points and these readers are mostly over 60. Tightest page 2 is
  now 22px spare (Tamil, with the medication caution). Page 1 is untouched and still
  has the 2px worst case recorded under **`CP30`**.

## Shipped in [2.13.0] — `P9`, the functional measures

Ids in **bold** are from [COMMUNITY_TODO.md](COMMUNITY_TODO.md).

### The shape of the conversation changed

Physical activity is asked first — somebody who abandons after three questions has
still given the vital sign this portal exists to take. Then sex, then a precise age,
and everything after that can branch on it.

| | Before | After |
|---|---|---|
| Sex | question 9, as "age group and gender" | 4, sex only |
| Age | question 9, as a band | **5, as a year** |
| Falls (60+) | 14, *after* record linkage | 11, once the age is known |
| Grip strength | — | 15 |
| Standing up from a chair | — | 16 |
| Where it was measured | — | 17, only if a figure was given |
| Record linkage | 13 | last |

`falls` and `healthier_sg` were asked after "do you have a previous NEXUS record"
because the old positional copy binding forced every new step onto the end. That
binding is gone; `COPY_ORDER` holds it by name.

### Added

- **Grip strength in kilograms and repetitions from a chair**, both optional, both in
  both pathways. The protocol follows the age: the one-minute test under 60
  (Strassmann 2013, Swiss, 20-79), the thirty-second chair stand from 60 (CDC STEADI,
  United States, 60-94). Grip against Tomkinson 2025 (international, 20 to 100+).
- **Each question names its stopwatch**, and "I am not sure which test" is an answer
  rather than a blank: it keeps the number and refuses the comparison. A
  thirty-second count read against one-minute norms would tell somebody they are far
  weaker than they are, and that is the likeliest way this feature hurts anyone.
- **Report page 3**, only when a figure was given. Band, number, one sentence about
  what to do — or the number and the REASON where no comparison could be made. All
  nine refusal states have words in four languages, because a blank card under a
  figure somebody just gave reads as "your result was too bad to print".
- **The sources are cited with their populations named.** None of the three is
  Singaporean. Nothing is cited where no comparison was made.

### Decisions

- **`CD20`** — neither measurement feeds `calculateRiskScore`, following the `falls`
  precedent. Charging a deficit for not owning a dynamometer penalises exactly the
  cohort this portal is for. Skipping both changes nothing about the result.
- **`CD25`** — a precise age is collected; only the five-year band is stored.
- **`CD22`** — the measurements go on page 3, decided by measurement rather than
  preference: pages 1 and 2 had 2px and 77px of spare room (`CP30`).

### Fixed

- **`CP29`** — the precise age was reaching Firestore beside postal sector, sex,
  ethnicity and housing type. `AuraChat` passes the whole parsed object to
  `recordTelemetry`, so a new field ships by default and silently. The strip now
  happens inside `recordTelemetry`, at any depth. Raw kilograms and repetitions never
  leave the device.

### Fixed after the first cut of this entry

Four commits landed after the release commit and none of them were recorded here
until an audit caught it. A changelog that stops before the branch tip is how a
reviewer signs off on work they have not seen.

- **`CP33`** — the report told every returning resident their progress was being
  tracked. `previousId` has ZERO consumers: the rules deny client reads, the insights
  rollup never mentions it, and the only other function that touches the collection
  deletes by date. Fixed in all four languages, with a two-sided guard — the promise
  must be absent AND the honest wording present, so a page that simply says nothing
  where it used to reassure somebody also fails.
- **`CP34`** — a hidden form field kept its answer. Age 65, answer falls, correct the
  age to 20, and a 20-year-old derived as having fallen twice with falls risk true.
  The gate that decides whether to ASK is now the gate that decides whether to READ.
- **Two Malay and one Tamil parser faults**, surfaced by reviewers correcting copy
  that is also parser input. "Tidak pernah jatuh" returned `falls=1` — every Malay
  speaker who had never fallen recorded as having fallen. Caught by running the
  parser before committing, not by reading the diff.
- **`CP31`** — the Tamil chip was phrased around a parser bug rather than the bug
  being fixed. Both reviewers proposed the natural wording independently, which is
  what showed the constraint was in the wrong place.
- **`CP32`** — the form offered falls and Healthier SG answers in English to every
  language, on a question asked only of residents aged 60 and over.
- The public AURA info card named **v2.12.2** while the app shipped 2.13.0. It is
  bundled with `?raw` and served at `/aura-info`, so the stale version was live. A
  test now fails the build when it drifts.

### The waiver was exercised, not just built

⚠️ On **2026-09-13 the owner signed `REVIEW_WAIVERS`** for all three safety-critical
prohibitions. The gate failed on them exactly as designed; the build is green only
because somebody signed. Recorded here because an accountability mechanism that logs
only its own existence, and not the decisions taken under it, is decoration.

### Simulation before merge

`communitySimulation.test.js` walks the whole assessment for 735 residents across
four languages — every age boundary the sources define (19/20, 59/60, 79/80, 94/95),
both sexes plus "prefer not to say", every measurement state, every falls answer.
It asserts that all four languages ask the SAME questions of the same person, that
nothing broken reaches a screen, that no raw figure or exact age can be stored, and
that **skipping both measurements changes neither the score nor the routing**.

It found `CP34` on its first run.

### Still open on this surface

- **`CD13`** — the three safety-critical strings ship unreviewed in Malay, Chinese
  and Tamil. Waived for this release by the owner, not bypassed. See `CHANGELOG.md`.
- **`CP30`** — worst-case English report page 1 is 2px from clipping. Routed around,
  not fixed.
- **`CP28`** — the chat's step badges are English in all four languages.
- **`CD21`** / **`CD23`** — source wording and whether re-measurement is real.

---

## Shipped in [2.1.2] / [2.1.3] — was *[Unreleased] — on `claude/nexus-community-portal`*

Ids in **bold** are from [COMMUNITY_TODO.md](COMMUNITY_TODO.md); `§` references are
sections of `POSTMORTEM-COMMUNITY.md`, which carried the evidence (archived 2026-09-06 at
tag `docs-archive-2026-09-06`).

### Fixed

- **`CP1`** *(§3.1)* — **The risk score never measured physical activity.** `scoring.js`
  compared `pavsMinutes` — minutes **per session** — against the ACSM benchmark of 150
  minutes **per week**. `MINS_MIDPOINT` tops out at `'60+ mins': 65`, so the threshold
  was unreachable and **every respondent who ever completed the screening** was charged
  the inactivity point. The weekly figure was sitting in the next field along,
  `pavsScore`, computed one line later. A person exercising 390 minutes a week was shown
  *"Moderate Risk"* on the same page whose banner — correctly using `pavsScore` —
  congratulated them at the ADVANCED tier. Now reads `pavsScore`. `35f46ad`

- **`CP2`** *(§3.2)* — **Missing data scored as perfect health.** Absent or unparseable
  fields coerced to a value that passed the check, so a gap in the record read as
  fitness. `asNumber()` now returns `null` for anything non-finite, and `null` counts as
  a deficit. `35f46ad`

- **`CP9`** *(§3.9)* — **The isolation tier routed to nothing.** `AuraChat.selectCTA`
  ranks `SOCIAL_CARE` **second**, behind only chest pain, for a resident aged 60+ who
  reports being isolated. `ResultPage` had no such key in `CTA_BANNER` or
  `tierPrimaries`, and both read sites fall back to `START` — so that person was told
  *"Download the Healthy 365 app and search Start2Move"*, and the SingHealth CareLine
  referral written for exactly them disappeared with no error and no log. The
  demographic least able to act on an app-store instruction was the one receiving it.

  Also corrected: `ConventionalForm.jsx:159` claims *"Identical to AuraChatbot
  selectCTA()"*. The two differ by exactly one rule — the isolation branch — and that
  one divergent rule was the broken one, so the same isolated senior got the right
  answer through the form and a silent fallback through the chat. The chat is the
  pathway built for elderly and non-English-first users. `189a61b`

- **`CP3`** *(§3.3)* — **The portal fingerprinted the public while telling them it had
  not.** `telemetry.js` wrote `clientReference: navigator.userAgent` into every
  `community_assessments` document, on a flow whose result page states the record is
  de-identified (`ResultPage.jsx:758`). Removed. `301bb5a`

- **`CP5`** *(§3.5)* — **Every signed-in staff member could read the public's health
  records.** `community_assessments` allowed `read: if isSignedIn()`. Grep confirmed no
  reader exists anywhere in the app — the permission was granted for an analysis screen
  that was never built. Now `read: if false`. `301bb5a`, verification `45323f2`

- **`CP12`** *(§3.12, theme)* — **The theme setting was split in half.** A prior repair
  recorded at `ConventionalForm.jsx:6` as *"FIX 1 — Theme key: nexus_theme →
  nexus-theme"* was applied to three files and not to the other four, including
  `App.jsx`, which owns the `dark` class on `<html>`. The result split the product along
  the pathway gate: choose dark on `/individuals/language`, tap through, and the form
  opens light. Centralised in `src/utils/theme.js`, which still reads the old key as a
  fallback so nobody loses a setting they already made. `189a61b`

- **`CP21`** — **The handover slip printed, but it printed badly: three A4 sheets, the
  first two-thirds empty.** The blank-page bug (`display: none` on an ancestor) was
  fixed earlier by switching to `visibility: hidden`, and that got the slip onto paper
  — but nobody had looked at the paper. Screenshotting the print media in headless
  Chromium showed three things at once:

  1. The slip is `position: absolute; top: 0; left: 0`, which resolves against its
     nearest **positioned** ancestor — the result page's `relative` glass card. Measured:
     the slip started **237px down and 62px in**, wasting roughly 63mm of the first
     sheet and printing off-centre.
  2. That card also carries a `transform` **and** a `backdrop-filter`. Either one
     establishes a containing block for an absolutely positioned descendant —
     `backdrop-filter` even for `position: fixed` — so no positioning value on the slip
     could escape it. Resetting `position` on the ancestors was tried and measured: it
     did not help, because the containing block came from the filter, not the position.
  3. `visibility: hidden` boxes **still occupy layout**. The document stayed 7591px
     tall, so "Save as PDF" produced **eight** pages: the slip, then seven blank.

  `HandoverSlip.jsx` now portals the slip to `document.body`, so it has no ancestor but
  `<body>`, and the print block hides its siblings with `display: none` — which collapses
  the layout rather than merely hiding it. Measured after: **one page**, slip at 0,0, no
  stray controls on the sheet. `printCss.test.js` now reads **both** files, because
  `display: none` on a body-level selector is the exact shape of the original bug and is
  safe only while the portal is there; either one alone prints a blank page.

  Found by producing the sample screenshot report, not by a test — no unit test can tell
  you what came out of a printer, which is why the slip's 19 tests all passed throughout.

### Added

- `src/utils/scoring.test.js` — **9 cases against a module that had none.**
  `calculateRiskScore` shipped to the public with zero tests and was wrong for its
  entire life. Covers the weekly/per-session distinction directly, so `CP1` cannot
  return silently. `35f46ad`

- `src/utils/ctaTierParity.test.js` — **5 cases.** Reads the tier names out of all three
  components and asserts every tier either pathway can emit has both a `CTA_BANNER`
  entry and a `tierPrimaries` entry. **It fails on `CP9` before the fix.** Parses by
  brace matching rather than indentation: an earlier draft sliced to end-of-file and
  reported `flexDirection` as a CTA tier, and a test whose parse is looser than the
  thing it checks is worse than none. `189a61b`

- `src/utils/theme.js` — one key, with a documented fallback and `try`/`catch` around
  every storage access, because Safari private mode throws on `localStorage`. `189a61b`

- 4 cases added to `scripts/firestore-rules-verify.mjs` for the
  `community_assessments` rule. Suite: **101 emulator checks, 0 failed** (re-run 2026-08-23 before the v2.0 merge). `45323f2`

### Audit

- A 158-agent adversarial sweep of the portal returned **75 verified findings** across
  seven surfaces. Five that change what a member of the public sees were re-verified
  by hand and are listed under Known Issues as `CP13`–`CP17`; one of them (`CP16`)
  corrects an earlier finding of my own. The remaining 70 are **not** transcribed into
  the ledger, because that file's evidence rule does not admit rows nobody has checked.

### Documentation

- `POSTMORTEM-COMMUNITY.md` (archived at tag `docs-archive-2026-09-06`) — architecture, stated purpose
  against delivered behaviour, twelve findings with `file:line`, and the plan for the
  next version. `31fafde`, corrected and extended `53f9bd7`.
- [COMMUNITY_TODO.md](COMMUNITY_TODO.md) — this work as a ledger, with the same
  evidence rule the roster ledger uses.

- **Eight findings, filed as `P7.1`–`P7.8` / `CP22`–`CP26`. Seven are fixed;
  `P7.7` needs translations rather than code.** See the Fixed entries below.

### Fixed — the pre-merge stress findings

- **`CP24`** — **A completed assessment dead-ended when Firestore was unreachable.**
  Both pathways `await recordTelemetry(...)` before navigating to the result, and
  the function's `try`/`catch` was documented as making that safe. It was not: a
  `catch` protects against a rejection, and `addDoc` does not reject when the
  backend is unreachable — it queues the write and the promise never settles. So a
  person answered fifteen questions about their own health and then watched
  *"Generating your personalised plan now…"* for as long as they were willing to
  wait. Measured at 45 seconds and counting, with `firestore.googleapis.com`
  blocked; an ad blocker or a corporate network is enough. `WRITE_DEADLINE_MS`
  bounds it **inside `recordTelemetry`**, not at the two call sites, because a
  caller that forgets re-creates the defect and there will be more callers. The
  write is not cancelled — it stays queued and still lands if connectivity returns;
  what is bounded is how long a person waits. Re-measured: **6.4s, result reached.**

- **`CP23`** — **Interaction telemetry was counted as respondents in the population
  rollup, and could clear the suppression threshold on its own.**
  `community_assessments` holds two kinds of document, because `recordTelemetry` is
  the portal's only write: one completed screening, and a row per interaction —
  print, download, share, one `click_<id>` per resource tapped. The rollup read the
  collection unfiltered. `flagsOf` returned `{}` for an interaction row, so it added
  nothing to any domain, and `tallyInto` counted a respondent anyway. Measured:
  **twelve respondents who all reported need became 96, and every domain rate fell
  from 100% to 13%.** The disclosure half was worse: `MIN_CELL` exists to guarantee
  ten respondents before a sector is published, and **one person's assessment plus
  eleven of their own clicks cleared it.** `isAssessment` now gates the tally on the
  presence of a `flags`/`payload` object, and `quality.assessmentRecords` /
  `nonAssessmentRecords` report the split so the figures reconcile.

- **`CP25`** — **Only sectors had a suppression floor.** `regions` and `periods`
  published `respondents` raw and banded their domains at `MIN_COUNT` — and
  `bandCounts` maps 0 to `0` and 1–4 to `'<5'`, so at a denominator of one the band
  stops banding: `'<5'` can only mean 1 and `0` can only mean no. Measured: one
  respondent in the North in November 2026 published **eight domains reading
  `'<5'`**, which is that person's complete flag profile, located to a region and a
  month. Regions were left alone because five areas felt coarse; in the weeks after
  launch — exactly when this page gets shown — a region holds a handful of people.
  The floor is uniform now, the national *breakdown* is withheld below it while the
  national headcount stays, and a test walks the whole document and fails on any
  readable count under the band.

- **`CP22`** — **Typed answers that denied a symptom set its flag.** The chat renders
  a free-text input beside the chips and prompts *"SELECT AN OPTION OR TYPE FREELY"*.
  `parseFallsAnswer` handled negation — because "No falls" contains "fall" — and no
  other matcher did. Measured: **16 of 22 realistic typed answers set a flag the
  answer denied**, and a fit person typing *"no chest pain"* scored **5 → Red**.

  `clinicalFlags.js` previously argued negation was deliberately unhandled, because
  an over-triage is the safe direction. That argument is answered rather than
  discarded: it was written when the cost was a wasted nudge toward a GP, and these
  flags are now printed on the **handover slip** a person carries to a centre, which
  states them as things they reported. The fix is deliberately timid — the cue must
  sit in the same clause, immediately before the term, or immediately after it in
  Tamil, where negation is postfix. `and` breaks a denial and `or` does not, because
  *"no chest pain and dizziness"* is genuinely ambiguous and *"no chest pain or
  dizziness"* is not. Anything ambiguous keeps the flag. **16 → 1**, still 0 false
  negatives, and **every quick-reply chip maps to exactly the flag it did before.**

  Bare `'low'` was also replaced with the phrasings that actually mean low mood.
  Negation could not rescue *"low back pain"*, *"low income household"* or *"my
  activity level is low"* — those are not denials, they are the word meaning
  something else, and all three routed the person to a mental health service.

- **`CP26`** — **The falls screen missed anyone who typed their age.** The gate was
  `/60\s*\+/` over the raw answer, which only ever matched the chip text; `"72"`,
  `"I am 72"`, `"I am 65 years old"` and `"60 plus"` all failed it. There was a
  second substring test with the same defect in `parseClinicalData`, so a typed age
  also became `Unknown` and lost both 60+ call-to-action tiers. `parseAgeBand` /
  `isSixtyPlus` replace all of them and are shared by both pathways; a closed range
  is read as a range, so `"41–60"` does not become 60+.

- **`/individuals` was a 404.** Only `/individuals/*` was routed, so the most obvious
  address for the service — the one somebody reaches by trimming the URL — sent a
  member of the public to the not-found page. It redirects to the pathway picker.

### Audit — pre-merge stress test, 2026-08-23

- `scripts/community-stress.mjs` + `npm run stress:community` — the counterpart to
  the roster harness, for the public screening. It reports; it applies no pass/fail
  threshold, because none has been agreed.

- **Green, and measured rather than assumed:** all 81 postal sectors parse in five
  written forms; 20,000 random digit strings produced no sector outside the table;
  the seven `CP19`-shaped labels all return `null`; 3,440 `servicesForSector` calls
  threw nothing, returned nothing empty and produced no duplicates; every quick-reply
  chip maps to the flag its author intended; the result page has no horizontal
  overflow between 280px and 1920px; ten hostile `sessionStorage` payloads produced
  no crash, no blank page and no script execution; the merged tree runs 2,277 tests
  green with a clean fast-forward and zero conflicts; `firestore.rules` passes 101
  emulator checks including cross-team isolation; all eleven Cloud Functions load,
  and the export set is a strict superset of `main`'s, so the deploy has nothing to
  orphan.

- **Eight findings, filed as `P7.1`–`P7.8` / `CP22`–`CP26` in
  [COMMUNITY_TODO.md](COMMUNITY_TODO.md); seven are now fixed above.** The three that
  had blocked the merge:
  a completed assessment **dead-ends when Firestore is unreachable** (measured: 45s
  and still waiting); interaction telemetry is **counted as respondents** in the
  population rollup (12 people became 96, every domain rate 100% → 13%); and
  `MIN_CELL` — the suppression threshold the dashboard's privacy claim rests on —
  **can be cleared by one person's own clicks**.

  None of these was visible to the unit suites. All 2,253 tests passed throughout.

### ~~Known issues — **authoritative list for this surface**~~ · `HISTORICAL` as at 2026-02

> ⚠️ **SUPERSEDED — do not read this table as current.** It was accurate when written and is
> now wrong about nine of its ten rows. `CP6` `CP7` `CP9` `CP14` `CP15` `CP16` are all `DONE`
> with evidence; `CP13`'s disclaimer and privacy notice render on the visible result page
> (`ResultPage.jsx`); `CP17`'s `user-scalable=no` is gone from `index.html`; and `CP12`'s
> missing catch-all route exists (`src/App.jsx`, `<Route path="*">`). **`CP8` (resource
> freshness) is the only row still genuinely open.**
>
> **The authoritative list is the Status table in
> [COMMUNITY_TODO.md](COMMUNITY_TODO.md), not this one.** Kept because the release entry it
> sits under is a frozen record of what that release knew.

Below is what was open **at the time of that release**. Full detail in
[COMMUNITY_TODO.md](COMMUNITY_TODO.md).

| Id | | Why it is still open |
|---|---|---|
| **`CP6`** | The public chat calls the **staff** AI endpoint. `chatWithAura` has no `request.auth` check and no App Check, and its system prompt names KKH/SingHealth and prints the internal Firestore schema under a `DATA ENTRY AGENT` heading. It returns text and performs no write, so this is disclosure and an injection surface, not data modification. | Needs a second callable with its own prompt, then auth on the first. Ordered as `P0` in the ledger. |
| **`CP7`** | Unauthenticated and uncapped against a paid API key. Also: the chat discards the model's answer after 1,500 ms without aborting the request, so every late answer is billed and thrown away. | Depends on `CP6.1`. |
| **`CD10`** | Urgent advice — including *"call 995"* — is **English-only** on a four-language tool. Only the labels around it are translated. | **Owner's.** Translating urgent clinical advice is not a paraphrase job. `CTA_BANNER` already holds reviewed `ms`/`zh`/`ta` for the same tiers and is the source to adapt from. |
| **`CD11`** | The chat's cardiac screen asks two questions at once with single-tap chips, so a condition and exertional chest pain cannot both be recorded. Tapping the condition loses `symptomFlag` — and with it the URGENT tier — and routes the person to a paid exercise programme. The form pathway records both correctly. | **Owner's.** Splitting it changes the assessment instrument. |
| **`CD4`** | The URGENT tier's resource list includes an exercise programme. | **Owner's clinical call.** My recommendation is in the post-mortem, §3.4. |
| **`CP8`** | The prompt labels the inventory *"VERIFIED RESOURCE INVENTORY"* and the model quotes prices and hours to the public as fact. `lastVerified` is written on every seed run and **read by nothing**, so it records when a script ran, not when a human checked a price. | Needs a freshness contract, or the word "VERIFIED" removed. |
| **`CP13`** | **The portal shows no medical disclaimer and no privacy notice on screen.** Both exist only inside the off-screen PDF template (`ResultPage.jsx:746` and `:782`, nested inside the `top:-10000px` block opened at `:636`). The form pathway offers one half-sentence on step 4 of 4; **the chat pathway offers nothing at all** and still writes age band, gender, ethnicity, housing, postal sector and four health flags. | The smallest change with the largest exposure — move both onto the page, and put the notice before the first question. |
| **`CP14`** | **"Low Needs (Green)" tells people below the activity guidelines that they meet them.** The tier is banded off the *risk score*, not off PAVS: 100 min/week plus twice-weekly strength training scores 1 → Green → *"You meet the physical activity guidelines"*, on the same screen where the PAVS panel renders `below`. | Same conflation as `CP1`, in the copy rather than the arithmetic. |
| **`CP15`** | **The chat's clinical flags are unanchored substring regex over free text.** `/low/` matches inside "slowly", "follow" and "allow", so *"I walk slowly but I feel great"* is flagged as psychological distress. Negation-blind too: *"I do not get chest pain"* triggers URGENT. | Both directions over-triage — the safe way to be wrong, but still wrong, and it feeds the tier ladder. |
| **`CP16`** | **The seeded `resources` collection reaches nobody**, and **this corrects `CP8`.** Its 22 records are read only by `publicTriageChat`, which has no callers. The public actually sees a second, unrelated 16-entry registry hardcoded at `ResultPage.jsx:191-208` — which has no `lastVerified` field at all. | The freshness problem is real but lives in the other registry. |
| **`CP17`** | `index.html:5` sets `user-scalable=no`, **disabling pinch-zoom** on a tool built for elderly users. `index.html:2` is `<html lang="en">` and never changes, so a screen reader announces Malay, Chinese and Tamil content as English. | Two lines. |
| **`CP12`** | No `path="*"` route, so a mistyped URL renders a blank page. Four session ids minted per person, all four shown as *"ID:"*, and the one written to Firestore is the third. A finished assessment does not survive a reload. | Cheap; queued together in `P4`. |

---

## Before this file existed

The community portal shipped inside app releases up to **v2.0.0** with no changelog of
its own, and — as `CP1` shows — with no tests on its scoring. Nothing before
`[Unreleased]` above has been reconstructed, and this file does not pretend to a history
it did not record. [CHANGELOG.md](CHANGELOG.md) is the record for those releases.
