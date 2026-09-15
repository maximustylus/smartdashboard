# Functional measures in NEXUS Community: ADDIE ideation

**Status:** `SHIPPED` — built in v2.13.0, extended in v2.14.0. **Phase:** `HISTORICAL`
before any build hand-off.
**Written:** 2026-09-08 · **Ledger ids opened:** `CD17`–`CD25` (owner's).
**Scope:** the `/individuals/*` surface. Roster side untouched.
**Source verification:** `UNKNOWN` — the three citations were supplied by the owner, but
their tables, protocols and licence implications have not been independently verified in
this repository. That review is part of `CD21` and precedes implementation.

> ⚠️ **HISTORICAL — this is the design record, not a description of what shipped.**
> It is frozen at the point of hand-off. The feature was built in **v2.13.0** and extended
> in **v2.14.0**; for what actually exists, read `CHANGELOG.md` and `COMMUNITY_TODO.md`.
> Decisions this document lists as open have mostly been settled — `CD17`, `CD18`, `CD19`,
> `CD20`, `CD22` and `CD25` are recorded as settled in the code and the changelogs, and
> `CD26`, `CD27` and `CD28` were opened after it was written and appear nowhere below.
> **`CD21` and `CD23` are the two that genuinely remain with the owner.**
>
> Two specifics a reader should not take from this document: §3.2's five-times
> sit-to-stand *in seconds* was reversed by Revision 1 and never shipped (the protocols
> are 60-second and 30-second, counted in repetitions), and §5's deferral of heart rate
> behind `CD24` was overtaken — a heart-rate block shipped in v2.14.0 under `CD27`.
>
> **This document does not authorise a build.** Nine decisions in §6 belong to the
> owner, and four of them (`CD17`, `CD18`, `CD19`, `CD25`) determine what is built
> and what a member of the public is told about their own body. `COMMUNITY_TODO.md`
> already treats that class of change
> as the owner's, not engineering's (`CD4`, `CD10`, `CD11`). This one is larger than any
> of those, because it is the first time the portal would return a physiological
> measurement to a resident.

---

## 0. `HISTORICAL` — original proposal, `SUPERSEDED` by Revision 1

This section records the first assessment. Revision 1 below is the current proposal.

The feature is worth building and the version proposed cannot ship. Three things block
it, each independently fatal: the app would be asking people it has just flagged with
chest pain on exertion to perform a maximal exertion test alone at home; the South East
Asian norms it would compute a percentile against do not exist for the 30-second chair
stand and are publicly disputed for grip; and a percentile cannot be computed at all
from three adult comparison bands when norms are stratified in fives. Change three things
and the feature becomes strong: **NEXUS never administers a test, it accepts a value measured
elsewhere and points people to where it is measured**; **the sit-to-stand instrument
becomes the five-times version, which has an Asian consensus threshold**; and **the
output is a band against a named threshold, not a percentile**. That version is safer,
more honest, more equitable, cheaper to build, and it does something the percentile
version never could, which is send people to the services this portal exists to
connect them to.

---

## 0.1 `PROPOSED` Revision 1 (2026-09-08): three sources supplied by the owner

The owner supplied three primary sources after the first pass. They **materially improve
the feature's feasibility** and correct one of my findings, which was stated too strongly.
The original text is left standing below rather than quietly edited, in the ledger's own
tradition; where it is superseded, this section governs.

**The sources**

1. **Tomkinson GR, Lang JJ, Rubín L, et al.** *International norms for adult handgrip
   strength: a systematic review of data on 2.4 million adults aged 20 to 100+ years from
   69 countries and regions.* J Sport Health Sci 2025;14:101014.
   doi 10.1016/j.jshs.2024.101014. **Open access, CC BY.**
2. **CDC STEADI**, *Assessment: 30-Second Chair Stand* (2017).
3. **Strassmann A, Steurer-Stey C, Dalla Lana K, et al.** *Population-based reference
   values for the 1-min sit-to-stand test.* Int J Public Health 2013;58:949-53.
   doi 10.1007/s00038-013-0504-z.

### What this corrects

**My "the norms do not exist" finding was too strong, and I was working from a weaker
source than the best available.** The first pass surfaced a disputed 2026 pooled-Asian
paper. Tomkinson 2025 is larger, newer to my knowledge of it, open access, and not the
subject of that dispute. It supplies **exactly the artefact the feature needs**: absolute
grip strength percentiles (P5 to P95) by sex, in **5-year age bands from 20-24 to 100+**,
modelled with GAMLSS and population-weighted to UN 2021 demographics. Table 2 of that
paper is directly usable.

Likewise, **the 30-second chair stand does have citable age and sex cut-offs.** CDC STEADI
publishes "below average" thresholds for ages 60 to 94 (for example, 60-64: men under 14,
women under 12; 85-89: both under 8), with a below-average score indicating fall risk. And
Strassmann 2013 covers the **under-60 gap** for a sit-to-stand variant, with percentiles
for the 1-minute test across ages 20 to 79, though in a Swiss population.

### What this does not change

**None of the three is a South East Asian norm.** Tomkinson is explicitly *international*,
population-weighted to global demographics and framed for "global peer-comparisons"; the
paper itself notes that for within-country comparison its scores may be complementary to
national norms. STEADI is US-derived. Strassmann is Swiss. **The phrase "South East Asian
population norms" cannot appear in the product**, and the on-screen and page 2 wording must
name the actual reference population. This is a labelling correction, not a design blocker.

**The age-band problem is now the single remaining data blocker.** Every one of these
sources is stratified in 5-year bands. NEXUS collects three (21-40, 41-60, an unbounded
60+), and `parseAgeBand` discards a typed exact age. A 5-year band cannot be derived from
a 20-year one. This is now `CD25` and it gates any age-specific comparison at all.

### What this reinforces

**The CDC's own form is the strongest argument yet for `CD17`.** It is a practitioner
instrument with Patient, Date and Time fields, whose instructions read "Instruct the
patient", carry the marginal note **"Stand next to the patient for safety"**, and include a
stop rule ("if the patient must use his/her arms to stand, stop the test") that requires
somebody watching. It also specifies a 17-inch seat height. A browser can do none of this.
The reference protocol for the test the owner proposed **presumes a supervising person in
the room**, which is precisely why the portal should accept a measured value rather than
elicit a performance.

**Protocol variation is bigger than assumed, which hardens the provenance requirement.**
Tomkinson's harmonisation adjustments run from under 1% to 10% across dynamometer types and
participant positions, and **up to 17% for different reporting variants**. Their reference
protocol is specific: hydraulic dynamometer, seated, elbow flexed, forearm neutral, handle
adjusted to hand size, both hands, 3 reps per hand, maximum value. The authors recommend
applying their adjustment factors when comparing against their norms. So a stored value is
only interpretable if the portal also stores **which device, which position, how many
reps and which summary statistic**. Provenance moves from good practice to a correctness
requirement.

**Their lower percentiles may be biased high.** The authors note grip testing is often
contraindicated in adults with chronic conditions, pain or injury, so included samples were
probably healthier than the general population and "our lower percentiles overestimate true
general population values". For a screening tool this errs toward flagging more people,
which is the safe direction, but it must be said on page 2.

### The output design, now with an author-endorsed framework

Tomkinson §4.2 prescribes a **quintile interpretation** rather than a bare percentile:
below the 20th percentile is "low", 20th to 39th "somewhat low", 40th to 59th "moderate",
60th to 79th "somewhat high", 80th and above "high". They further note the lowest quintile
has been used as a threshold for low fitness and linked to poor health and early death, and
propose it as an interim cut-point for identifying at-risk adults.

This is better than what I proposed and it supersedes it. The recommendation stays **a band,
not a raw number**, but the band is now a five-level framework taken from the source itself,
with the 20th percentile as the actionable threshold. `CD18` is therefore resolved in
favour of a band **derived from a real percentile table**, not in favour of abandoning
percentiles as uncomputable.

### Revised instrument position

`CD19` is no longer a straight swap. There are three defensible instruments and the choice
now turns on the target age range:

| Instrument | Reference | Ages | Output | Population |
|---|---|---|---|---|
| Grip strength | Tomkinson 2025 | 20 to 100+ | Percentiles, quintile bands | International |
| 30-second chair stand | CDC STEADI | 60 to 94 | Below-average cut-off | US |
| 1-minute sit-to-stand | Strassmann 2013 | 20 to 79 | Percentiles | Swiss |

**Recommendation:** keep grip strength on Tomkinson as the primary measure, because it is
the only one covering the whole adult lifespan from one source. For sit-to-stand, if the
target is 60+, **the owner's original 30-second chair stand is fine** and STEADI is the
citation; the five-times swap is no longer necessary. If the portal wants sit-to-stand for
under-60s as well, Strassmann's 1-minute test is the only option and it is Swiss, which is
a weaker claim than the grip table.


---

## 1. What changed from the proposal, and why

| Proposed | Recommended | Why |
|---|---|---|
| Resident performs a 30-second chair sit-to-stand and enters reps | Resident enters a value **measured elsewhere**, or is routed to where it can be measured | No web page can guard, stop, or call help for a person mid-exertion. §2.6 |
| 30-second chair stand (reps) | ~~Five-times sit-to-stand~~ **Keep the 30-second chair stand for 60+, cited to CDC STEADI** | Superseded by Revision 1. STEADI publishes age and sex cut-offs for 60 to 94. For under-60s no sit-to-stand reference exists outside a Swiss cohort. §0.1 |
| Instant percentile vs South East Asian norms | **Quintile band** off a real percentile table, reference population named honestly | Revised by Revision 1. Percentiles exist (Tomkinson 2025, ages 20 to 100+) but are international, not South East Asian, and the authors themselves prescribe quintile bands. §0.1 |
| Feeds the report and Firebase | Feeds the report; **band only** to Firebase, raw value stays on the device | Two continuous values make the record re-identifiable to anyone who ran the session. §2.7 |
| Inserted before the NEXUS record question (index 12) | **Appended after** the existing conditional steps | The gating data (age, falls, symptoms) only exists after them, and insertion means renumbering 13 index-aligned arrays with no test covering them. §2.5 |
| Affects the result | **Display-only.** Does not touch `calculateRiskScore` or the traffic light | The repo has already answered this once: falls is conditional and deliberately unscored. §2.5 |

Everything the owner asked for survives except the act of testing through the web page.
Residents still enter their numbers, still see them interpreted, still get them in the
report, and the health system still gets the data.

---

## 2. ANALYSIS

Five lenses were run in parallel against the live codebase and the published literature.
Four completed. Their findings converge, which is the main reason to trust them: the
evidence lens, the safety lens and the learner lens independently reached the same
conclusion about self-administration without seeing each other's work.

### 2.1 The need

NEXUS Community currently asks fourteen questions that are all answerable from memory.
It produces a traffic light and a plan. What it cannot currently do is tell anyone
anything about their actual physical capacity, which is the thing an exercise
physiologist would most want to know and the thing a resident can most tangibly improve.
Grip strength and sit-to-stand are the right two measures to want: cheap, fast, strongly
associated with function, and meaningful to a lay person in a way that a risk band is not.

### 2.2 The learner

The portal targets inactive, isolated and cost-constrained residents, in four languages,
many over 60, some on shared or borrowed devices. Two consequences:

- **Grip strength needs a dynamometer, which this population does not own.** A feature
  usable mainly by people who already attend a gym or a lab inverts the portal's equity
  mission. This is the single strongest argument for making "where to get measured" a
  first-class outcome rather than a fallback.
- **A percentile is the wrong feedback format for a low performer.** Telling a 68-year-old
  they are in the 8th percentile is a rank, and rank feedback reliably reduces effort in
  the people at the bottom of it. A threshold band ("at or above the level used as a flag")
  plus a next step is feedback the person can act on. This is standard goal-setting and
  self-efficacy design, and it happens to also be the honest option.

### 2.3 The task

For a valid five-times sit-to-stand you need a chair of standardised height, no arms,
against a wall, arms folded across the chest, a stopwatch, and someone positioned to
guard. For grip you need a calibrated dynamometer, a seated position with the elbow at
90 degrees, a specified hand, and best of a specified number of trials. A resident alone
with a phone reliably has none of these. A staff member at an Active Health Lab, an
Active Ageing Centre, a polyclinic, or the owner's own Sport and Exercise Medicine
Service has all of them.

**That asymmetry is the design.** The measurement belongs where the equipment and the
supervision already are. The portal's job is to carry the number, interpret it
conservatively, and route the person.

### 2.4 The evidence, which is the decisive finding

> These citations came from a literature pass, not from my own reading of the papers.
> The owner is a senior exercise physiologist and should verify them before anything
> ships. They are recorded here with DOIs precisely so that is possible.

**Grip strength.** Asian percentile norms do exist (Grgic et al., *Journal of Cachexia,
Sarcopenia and Muscle*, 2026, doi 10.1002/jcsm.70216). They are **publicly disputed in
the same journal** by Lim WS, Assantachai P and Merchant RA (doi 10.1002/jcsm.70317),
who state the pooled distributions are "unlikely to represent true normative references"
and specifically flag the Singapore values as implausibly low. Two of those authors are
Singapore clinicians. Publishing a resident-facing percentile derived from a source that
Singapore's own sarcopenia leadership has challenged in print is a named, foreseeable
reputational exposure for this service. The **AWGS 2019 consensus cut-points** are a
different and much safer object: they are thresholds, not distributions, they are
explicitly Asian, and they are what practice in this region already uses.

**Sit-to-stand.** There are **no South East Asian or Singaporean normative percentiles
for the 30-second chair stand at any age, and none anywhere for ages 36 to 59.** The
Rikli and Jones Senior Fitness Test tables begin at 60 and derive from a US cohort. The
instrument the Asian consensus actually uses is the **five-times sit-to-stand**, with a
threshold of 12 seconds or more, and it has published Asian and Singapore reference
values. Substituting the instrument costs nothing professionally and is the single
highest-leverage change available.

**Measurement error swamps a percentile.** Device disagreement alone (Camry versus
Jamar, limits of agreement roughly -4.1 to +5.6 kg) is about 0.6 of an adult standard
deviation, which moves a true 50th percentile to anywhere between roughly the 27th and
the 73rd. On the chair stand, seat height alone changes the score materially and about
one repetition is worth ten percentile points. A percentile implies a precision the
measurement does not have. A band does not.

**A percentile is also arithmetically impossible here.** Norms are stratified in
five-year age bands. The portal collects three adult comparison bands (21–40, 41–60,
and an unbounded 60+); Under 21 is a separate option outside the cited adult tables.
`parseAgeBand` actively discards a typed exact age. Sex is not collected; gender is,
with two options. Collecting a narrower age band would reduce data minimisation and
ripple through `isSixtyPlus`,
`selectCTA`'s `age === '60+'` comparison, the falls gate and the insights rollup.

### 2.5 The system

Read against the live code, not assumed.

- **Placement.** `nextActiveStep` (`chatSteps.js:75`) walks ascending array indices with
  no ordering layer, so the requested position immediately before `previous_id` (index 12)
  cannot be reached by appending. Insertion means renumbering thirteen index-aligned
  arrays across four languages, with **no test asserting those arrays are the same
  length** and a documented history of a question going missing in one language for
  months. Appending after the existing conditional steps is both cheaper and safer, and
  it is the only placement where the gating data exists: `falls` is index 13, after the
  proposed insertion point.
- **The 20-key Firestore cap is not the control it appears to be.** `firestore.rules`
  counts **top-level** keys, and the payload already nests unbounded objects. New
  physiological fields would land inside `flags`/`payload` and pass the rules with no
  validation of type, range or plausibility at all. This should be stated honestly as a
  code-review convention, or given an explicit nested-field allowlist. It is a finding
  about a weak control, not a blocker.
- **The report has no room.** Both pages are fixed at 794x1123 with `overflow: hidden`,
  so content that does not fit is **silently clipped, not errored**. Page 1 has roughly
  917px of usable column against a worst case already around 875 to 890px. A new
  standalone block does not fit. The workable options are two extra tiles inside the
  existing activity strip at zero vertical cost, cutting the resource plan from six items
  to four, or a third page. The content most likely to be pushed off page 2 is the
  medical disclaimer and the data policy, which is the worst possible thing to lose.
- **Scoring precedent already exists.** `falls` is collected conditionally and
  **deliberately kept out of `calculateRiskScore`**. The repo has already answered the
  question "what do we do with a measure only some people can give", and the answer was
  "do not score it".
- **Numeric free entry is new to this portal.** Every question today is a chip or a
  radio; only postal code and previous ID are text. The codebase has already been burned
  by digit extraction from chat answers, when a chip reading "North (e.g. 73)" caused
  every respondent who tapped it to be recorded as sector 73. A kilogram value typed into
  a chat box reintroduces that parser hazard with a health number attached.
- **Nothing in CI can see most of these failures.** There is no test asserting
  `DOMAIN_CONFIG` and the four prompt arrays are the same length, none asserting the
  server's `COMMUNITY_DOMAINS` matches `DOMAIN_CONFIG` (that drift is live today for
  `falls` and `healthier_sg`), none asserting the PDF fits, and none comparing the
  on-screen panel against the PDF template.

### 2.6 Safety, and this is the part that is not negotiable

**The app must never instruct anyone to perform a physical exertion test through a web
page.** It cannot see the person, cannot guard them, cannot stop the test and cannot call
for help. A supervised five-times sit-to-stand is administered with the chair against a
wall, a spotter positioned to guard, and stop rules on dizziness, chest pain,
disproportionate breathlessness and joint instability. None of those exist in a browser.

The proposed placement makes it worse rather than better. `symptomFlag` (chest pain or
dizziness on exertion) is captured at index 3. The test was proposed for index 12. So the
app would record that a person gets chest pain on exertion, then nine questions later ask
that same person to stand up and sit down five times as fast as they can, **before**
`selectCTA`'s safety-ordered ladder has fired and told them to see a GP before starting
any new exercise. The existing ladder puts `symptomFlag` first for a reason.

Warning copy does not fix this. A caution screen, a confirm chip and a "stop if you feel
unwell" line are read by the people who did not need them and skipped by the people who
did, they are the first thing lost to a low-literacy reader or a machine translation, and
they transfer risk to the resident rather than removing it.

**And the gate could not be built on the flags that exist.** `symptomFlag` is a substring
matcher over two symptom concepts and misses most of ACSM's cardiovascular warning signs;
`fallsRisk` is only collected for 60+, is English-only in the chat pathway, and returns
false when the question was never asked. A gate built on these fails **open** for
non-English-speaking older adults, which is precisely the population the gate exists for.

### 2.7 Privacy and regulation

- **Re-identification.** Combined with postal sector, age band, gender, ethnicity,
  housing type and a timestamp, two continuous physiological values give k=1 for anyone
  who attended the session at which they were measured, and the most likely operator of
  such a session is the owner's own service. The existing small-cell suppression protects
  proportions of booleans and offers nothing against a continuous variable. **Store the
  band, keep the raw number in `sessionStorage` for the resident's own PDF, and the
  problem does not arise.**
- **Regulatory posture.** Singapore HSA guidance from 21 July 2025 is the relevant line:
  software escapes device classification where its output rests solely on established
  guidelines with no adaptive logic or AI, and software that measures, monitors or
  analyses physiological processes is Class B. A band against a published, cited,
  versioned threshold sits on the safe side of that line. "A backend AI extrapolates from
  these variables" does not. This needs verifying against current HSA text before ship.
- **There is no written intended-purpose statement for this software and no named legal
  manufacturer.** HSA's wellness exclusion turns on intended purpose as evidenced by
  output. That document should be written now, in this phase, before any code.
- **There is no adverse-event pathway anywhere in the codebase.** If a resident reports
  feeling unwell after something the portal showed them, nobody receives it, nobody logs
  it and nothing happens. A tool that touches physical capacity needs a route before it
  ships, even if the route is a single monitored inbox.

### 2.8 The roadmap, assessed honestly

Wearable ingestion is **not an increment on this portal, it is a different product.**
Apple Health, Oura and Garmin all require an authenticated, persistent account and an
OAuth grant. NEXUS Community is `sessionStorage` only, deliberately, on the stated
grounds that the device may be a community centre terminal or a borrowed phone. The
current unauthenticated flow has no consented account to bind an OAuth grant to. There is
also no server-side Apple Health API: HealthKit requires a native iOS app, which the
no-install web portal is specifically designed to avoid.

On **MedGemma**: its licence and model card bar use in diagnosis or treatment and state
the outputs are not intended to directly inform decisions about care. Separately, it is
probably the wrong instrument for the stated job. Computing a threshold comparison and
selecting a programme is deterministic work that a small rules engine does correctly,
auditably and for free. A language model would make it non-deterministic, harder to
defend, and would move the software across the HSA line described above.

There is also a quieter equity problem worth naming now: device ownership is more steeply
distributed than dynamometer access. A model tuned on residents who own an Apple Watch
would be extrapolating a wealthier, younger, healthier cohort's physiology onto the
residents this portal was built for.

**The architectural instruction for today** is therefore to design the boundary rather
than the bridge. Record provenance on every measurement from the first version (who
measured it, with what, when, under what protocol), version the threshold table, and keep
the current portal free of resident accounts and contact details. Anything requiring an
account becomes a separate, consented, authenticated surface, and that decision is `CD24`.

---

## 3. DESIGN

### 3.1 Principles

1. **The portal never administers a test.** It accepts a measurement or it routes to one.
2. **Never show a number the source cannot support.** A band with a printed citation, not
   a percentile.
3. **Not owning equipment must never cost a resident anything**, in the score or in tone.
4. **The resident should leave knowing what to do next**, not merely where they rank.
5. **It must be buildable inside the real architecture** and leave the safety ladder,
   the parity test and the PDF geometry intact.

### 3.2 The feature

A final optional section, offered only to residents for whom it is safe and relevant,
with two doors.

**Door A, "I have been measured."** The resident enters a grip strength in kg and/or a
five-times sit-to-stand time in seconds, plus where and roughly when it was measured.
Numeric entry uses a stepper or a constrained numeric field with an explicit unit label,
never free text parsed for digits, in **both** pathways. Values outside a plausible
envelope are rejected on the spot with a plain sentence, not silently stored.

**Door B, "I have not been measured."** The resident is shown where they can have it done
free or cheaply near them, using the resource-mapping the portal already does by postal
sector. This is not a consolation prize. For most residents it is the more valuable
outcome, and it is the portal's actual core competence.

**Neither door involves the resident doing anything physical in front of the phone.**

### 3.3 Who is offered it

Offered only when **all** of these hold: no symptom flag; not routed to the urgent tier;
and the safety ladder has already produced its primary action. Door B (information about
where to get measured) can be shown to everyone, because reading about a service is safe.
Door A (entering a value) is what is gated, and it is gated on the flags that already
exist, used in the direction they can be trusted: absence of a flag is never treated as
proof of safety, so anyone the app is unsure about gets Door B.

Because it is appended after the existing conditional steps, all the gating data is
available by the time the question is reached. That is the whole reason for the placement
change.

### 3.4 What the resident sees

Draft English copy, ready for translation. UK English, no jargon, no ranking language.
**All four languages are a release gate for this section, not a follow-up.**

> **Your strength and mobility (optional)**
> Two simple measurements tell you a lot about how your body is doing: how strong your
> grip is, and how easily you can rise from a chair. You do not need them to finish this,
> and skipping them changes nothing about your result.
>
> *Have either of these been measured for you, for example at a health screening, an
> Active Ageing Centre or a check-up?*
> [ Yes, I have my numbers ] [ No, not yet ] [ Skip this ]

Door A, grip:
> **Hand grip strength**
> Enter the number the person measuring told you, in kilograms.
> [ ___ ] kg   Where was it measured? [ ... ]   Roughly when? [ ... ]

Door A, result:
> **Your grip strength: 24 kg**
> This is below the level that health services in Asia use as a prompt to look more
> closely at muscle strength. That is common and it responds well to regular strength
> work. It is not a diagnosis, and it does not change your result above.
> **A good next step:** [routed resource]

or

> **Your grip strength: 34 kg**
> This is at or above the level that health services in Asia use as a prompt to look more
> closely at muscle strength. Keeping it there is worth doing, and strength work twice a
> week is what maintains it.

Door B:
> **Where to get measured near you**
> These places can measure your grip strength and how easily you rise from a chair,
> usually free. It takes a few minutes and you can ask for the numbers to bring back here.
> [routed venues by postal sector]

Note what the copy does not do. It never says percentile, norm, sarcopenia, frailty, weak,
poor or below average. It never ranks the person against other people. It states the
comparison, names who uses it, says plainly it is not a diagnosis, and gives an action.

### 3.5 Data

- Client keeps the **raw value** in `sessionStorage` only, for the resident's own report.
- Firestore receives the **band** plus provenance: instrument, unit, threshold-table
  version, measurement setting, and a coarse recency bucket. No raw continuous value.
- Provenance is carried from version one, so a later wearable or staff-measured source is
  an added enum value rather than a schema migration.
- Plausibility envelopes are enforced client-side and again in the write path.
- The insights rollup treats the band as another suppressed categorical domain, under the
  existing minimum cell size.

### 3.6 Report

Two tiles inside the **existing activity strip**, at zero vertical cost, not a new block.
If the owner wants a standalone block instead, something on page 1 has to be cut to pay
for it, and that is `CD22`. Page 2 gains a citation row naming the threshold source, its
version and its retrieval date, matching the discipline the instrument citations page was
rewritten to enforce.

### 3.7 The learning design

This is the part that makes it worth doing at all. The measurement is the hook; the
learning objectives are what the resident leaves with:

1. **Know** that grip and chair rising are things that can be measured and improved.
2. **Know** where they can have it done, free, near them.
3. **Believe** a low number is a starting point rather than a verdict, and that it
   responds to training.
4. **Do** one specific next thing.

Mastery experience is the mechanism, which means the **re-test loop matters more than the
first number**. The existing `previous_id` linkage is the only mechanism the portal has
for showing someone a change over time, and today it depends on a resident keeping a code.
Making re-measurement real is `CD23`, and without it "starting point" is wording rather
than design.

---

## 4. DEVELOPMENT (build plan)

**v1 (the honest core)**
1. Threshold table module: values, units, sex and age applicability, source, version,
   retrieval date, and an explicit "no comparison available" return for uncovered cells.
2. Pure banding function with full boundary tests. No percentile anywhere in the codebase.
3. Numeric entry primitive with unit label and plausibility envelope, in both pathways.
4. Appended conditional step with a `when` predicate, plus **the missing array-length
   parity test** and a `COMMUNITY_DOMAINS` drift test.
5. Door B venue routing off the existing sector mapping.
6. Report tiles plus the page 2 citation row, plus a **height regression test at maximum
   content in all four languages**.
7. Firestore band-only write, rules updated, nested-field allowlist or a documented
   convention.
8. Four-language copy, reviewed, as a release gate.
9. A build-failing guard test asserting no timer, rep counter, countdown, movement
   animation or "start test" control exists on a public surface. This makes the safety
   boundary structural rather than a convention that erodes.

**v1.1** step-level telemetry and abandonment measurement; re-test linkage improvements.

**Deferred, explicitly** wearables, any AI interpretation, VO2max, body composition, HRV,
resting and walking heart rate. All of these are gated behind `CD24`.

**Version bump:** minor. New user-facing capability, backwards-compatible schema addition.

## 5. IMPLEMENTATION and EVALUATION

**Before build:** written intended-purpose statement; owner sign-off on the threshold
sources; named adverse-event inbox.

**Formative:** content review by the owner as exercise physiologist; native-speaker review
of all new strings in all four languages (this feature must not inherit the open `CD13`
debt); usability testing with residents over 60 on a low-end phone; an explicit safety
walkthrough attempting to reach Door A while flagged.

**Summative, structured on RE-AIM**, because the portal currently collects no resident
account or contact details. Reach and Adoption are measurable from aggregates while
Effectiveness at the individual level is not:
- *Reach*: proportion offered Door A versus Door B; uptake of each.
- *Effectiveness*: distribution of entered values as a data-quality signal; proportion
  below threshold; re-test rate via `previous_id`.
- *Adoption*: venue routing click-through.
- *Implementation*: **abandonment at the new step versus the pre-change baseline.** This
  requires step-level telemetry, which does not exist today, so the baseline must be
  captured **before** the feature ships. This is a prerequisite, not a follow-up.
- *Maintenance*: threshold table review date; citation still current.

**Stop criteria:** any implausible-value cluster suggesting unit confusion; abandonment at
the new step materially above baseline; any evidence of a resident self-testing; the
threshold source being withdrawn or the Grgic dispute resolving against it.

**Safety surveillance is near-impossible by design.** The portal holds no contact details.
This should be stated plainly rather than papered over, and it is a further argument for
the boundary in §3.2: a portal that never asks anyone to exert themselves does not need to
detect exertion harm.

**Research opportunity:** the honest publishable question is not about the measurements. It
is whether a navigation portal can move people from screening into supervised measurement,
that is, Door B conversion by language, age band and postal sector. That is novel, it fits
the owner's remit, and it needs the venue routing instrumented from day one to be
answerable later.

---

## 6. Owner decisions

| Id | Decision | Status | Proposed direction |
|---|---|---|---|
| `CD17` | Does the portal ever ask a resident to perform a physical test? | `OWNER DECISION` | **No.** Accept measured values and route to measurement. Encode as a build-failing test. |
| `CD18` | Percentile or band? | `OWNER DECISION` | **Band.** Revised: percentiles are now available (Tomkinson 2025). Use that source's own quintile framework, with the 20th percentile as the actionable threshold. |
| `CD19` | Which sit-to-stand instrument, and is the feature gated to 60+? | `OWNER DECISION` | Revised: **your 30-second chair stand is fine for 60+**, cited to CDC STEADI. Under-60 sit-to-stand has only a Swiss reference. Gating to 60+ is the cleaner call. |
| `CD20` | Do these values enter `calculateRiskScore` or move the traffic light? | `OWNER DECISION` | **No.** Follow the `falls` precedent. Display-only. |
| `CD21` | Which threshold sources, and who signs them off? | `OWNER DECISION` | The supplied sources narrow the options. Verify their tables, protocols, permitted use and population labels before approval; never describe them as South East Asian norms. |
| `CD22` | If a standalone report block is required, what is cut from page 1 to pay for it? | `OWNER DECISION` | Prefer tiles in the existing strip at zero cost. |
| `CD23` | Is re-measurement made real, or is "starting point" only wording? | `OWNER DECISION` | Make it real, or the learning case weakens substantially. |
| `CD24` | Wearables and AI: separate authenticated product, or extend this one? | `OWNER DECISION` | **Separate.** Extending it requires account and consent architecture the portal does not have. |
| `CD25` | Collect age in 5-year bands, or drop age-specific comparison? | `OWNER DECISION` | **The remaining blocker.** Every reference is stratified in fives; the portal collects three bands. No 5-year band, no age-specific comparison. |

---

## 7. `PROPOSED` build hand-off

**Definition of done for the build phase:** every item in §4 v1, with the four release
gates held: four-language copy reviewed by native speakers; the safety guard test in CI;
the PDF height regression test passing at maximum content in all four languages; and no
occurrence of the word percentile, or any ranking language, on a public surface.

**Nothing in §4 should start before `CD17`, `CD18`, `CD19` and `CD25` are answered**,
because each changes what is built rather than how.
