# Chatbot Info Card — AURA (the NEXUS assistant)

**Understanding the AI assistant inside NEXUS: what it can do, how it is kept safe, how your
data is handled, and how to raise a concern.**

| | |
|---|---|
| **Card status** | ✅ **In effect.** Approved 2026-08-28 by **Muhammad Alif (owner)** — the named sign-off `AURA-GUARDRAILS.md` Rule 12 requires. The owner read draft v0.3 in full and approved it as written; the same session's `AU29` fix and 9.5 decision are folded into this version, recorded in the changelog below. |
| **Card version** | 1.3 |
| **Last updated** | 2026-09-06 |
| **Describes** | NEXUS **v2.16.2** (app) · AURA engine tier **v2.3** · guardrails **v1.0** |
> **The app version on the "Describes" line is a factual pointer, not card content.**
> It moves with `package.json` at each release and does NOT make a new card version
> or require a fresh sign-off under `AURA-GUARDRAILS.md` Rule 12 — the card's
> statements about what AURA does, how it is kept safe and how data is handled are
> what Rule 12 governs, and those are unchanged. `auraInfoCard.version.test.js`
> fails the build when this line drifts from `package.json`, because this file is
> bundled with `?raw` and served to the public at `/aura-info`: a stale version here
> is a stale version on the live site, which is the exact failure `src/version.js`
> exists to prevent. It had already drifted two releases before that guard existed.

| **Framework** | Structured after the **IMDA Transparency Guidelines for Generative AI Chatbots** (Infocomm Media Development Authority, Singapore, published 20 July 2026), Annex B sample format. The guidelines are voluntary; NEXUS adopts them as its transparency baseline. |

> **This is a consolidated card for a family of AURA surfaces** (the guidelines allow one
> card for a family of closely related chatbot experiences). §1 tells you which variant you
> are using. **The NEXUS roster engine is deliberately outside this card**: it is a
> deterministic constraint solver with no model, no inference and no network call — same
> inputs, same roster, every time. A roster is never AI-generated, and describing it here
> would repeat the exact misdescription this project already corrected (`AU1`).

---

## 1 · What AURA does

### The AURA family, and how to tell which one you are using

| Variant | Where you meet it | Who can use it | Model involved |
|---|---|---|---|
| **Staff assistant** | The chat panel inside NEXUS (`AuraPulseBot`) | Signed-in staff of onboarded teams only | Google Gemini |
| **Public health screening** | The conversational pathway at `/individuals` | Anyone with the link | Google Gemini (acknowledgement text only, capped at 200 tokens) |
| **Year-end analysis** | The Smart Analysis view | Team leads only, signed in | Google Gemini |
| **Demo sandbox** | Demo Mode | Anyone | **None** — local, deterministic scripted replies; nothing is sent to any model |

### Capabilities

The **staff assistant** can:

- Hold a wellbeing check-in conversation using Motivational Interviewing (OARS) techniques —
  peer-level support, not therapy (see §2 and §3).
- Draft memos, SOPs and incident reports, and export them as native Microsoft Word `.docx`
  downloads. When you ask for a **targeted edit** of a document it has already drafted
  ("change only what that requires", "just make it a memo") and the new version comes back
  under 70% of the previous length, the application appends one sentence under AURA's reply
  stating the measurement — *"this version is 48% the length of the previous one; check
  that nothing you needed was dropped"* — because in live testing AURA condensed documents
  and reported them unchanged, on every run, under two prompt wordings written to stop it
  (`AU33`, v2.12.0). AURA's own words are never altered; the note is added beside them.
- Read a workload figure out of natural language ("I saw 145 patients in June") and prepare
  a database entry — which is **only saved when a human presses the confirmation button**,
  and only after the proposed write is validated field by field in code
  (`src/utils/dataEntryGuard.js`; 82 passing tests as of 2026-08-27). Since v2.11.0 a
  proposal is also **discarded in code unless the message you just sent contains a figure**:
  in live testing, "Log my workload" with no number returned a ready-to-approve card
  carrying the previous turn's figure, three runs out of three (`AU31`). AURA now asks
  instead.

The **public screening** pathway asks structured health and activity questions and produces
a navigation result with recommended next steps, tiered by risk. The model's role is limited
to short acknowledgement text between questions; scoring and routing are code, and your
answers are treated as data for the model, never as instructions to it.

The **year-end analysis** turns a team's workload and wellbeing data into a written brief
for its lead.

### About the AI models

AURA's generative surfaces are built on **Google Gemini** models, reached over the Gemini
API from Firebase Cloud Functions. The specific model is resolved at runtime from a
configured list (`functions/modelAvailability.cjs` — as of v2.12: `gemini-3.1-pro-preview`,
`gemini-pro-latest`, `gemini-2.5-pro`, `gemini-3.5-flash`, `gemini-2.5-flash`,
`gemini-flash-latest`, with the `gemini-flash-latest` alias as the safe fallback, kept
last so it can never be a name nothing else resolves). A candidate is **probed with a real
generation before it is trusted**; one the service lists but refuses — for quota, or
because Google has withdrawn it — is set aside for thirty minutes and the request retried
once on the next in the list, so a provider-side problem degrades the model tier rather
than the service (`AU30`, both halves: v2.1.x for quota, v2.11.0 for availability, after
three of the four names then configured were found withdrawn without notice). Google
changes this list; the card names what the code names on its date. **Which model answered
is recorded** —
every assistant and analysis response carries a provenance record
(model id, guardrail version, timestamp) that is stamped into `.docx` exports, audit rows
and archived reports. The models are Google's; what is NEXUS's own is the prompting,
validation and scaffolding around them.

### Accuracy and limitations

- AURA can **hallucinate**: generate information that sounds convincing but is incorrect,
  presented confidently as fact. Treat drafts as drafts and verify anything load-bearing.
- AURA has **no retrieval**. It cannot look documents up, so **every citation it produces
  comes from the model's memory and is unverified by construction**. Its own instructions
  require it to label references `model-recalled (unverified)` and forbid it from ever
  claiming a citation is verified.
- AURA has **no access to electronic medical records**, the internet, or anything beyond
  what you type, attach, or what the specific function sends it.
- AURA can **misdescribe its own edits**. Asked to change one thing and keep the rest, it
  has shortened a document by half and reported it unchanged — four live runs out of four
  (`AU33`). The application now measures and says so (§1, *Capabilities*); the model's
  self-report is not to be trusted on its own.
- Sixteen working rules govern AURA's output (`AURA-GUARDRAILS.md`). Read that document's
  conformance table before relying on any of them: some are enforced in code, most are
  instructions to a language model, and instructions to a language model are requests, not
  controls. **This is now evidenced, not asserted:** in the live read of 2026-09-05, two
  rules written into the prompt were ignored on every run (`AU31`, `AU33`) and became code;
  three others (`AU32`, `AU34`, `AU35`) remain prompt-carried requests with a detector in the
  test harness, not a control.

---

## 2 · What AURA shouldn't be used for

To keep everyone safe, AURA is not for:

- **Medical advice, diagnosis or treatment.** The public screening result says this on the
  screen it appears on: it is *"an initial community health navigation tool and does not
  constitute medical advice, diagnosis, or a treatment plan"*. Always consult a qualified
  healthcare professional before acting on it. **If you are experiencing chest pain,
  dizziness or any acute symptoms, seek immediate medical attention** — AURA is not an
  emergency service.
- **Generating or changing the roster.** The assistant cannot touch the roster. Rostering
  is a separate, deterministic, non-AI system.
- **Writing to the database on its own.** Every database write AURA proposes sits behind a
  human confirmation click, and the proposal is validated in code before that click.
- **Patient-identifiable data.** Do not type or attach patient data or PHI; use
  placeholders (e.g. `[Patient]`, `[Clinician]`). ⚠️ Said plainly rather than implied: the
  attachment path bounds **count, size and declared type** in code (five files, ~4 MB each,
  ~8 MB per request, five accepted formats) and logs the pass-through — but **nothing
  inspects what is inside a file**. Size and type say nothing about content, so this is a
  cost bound and an audit trail, **not** a data-classification control; the actual control
  on what you paste or attach is you, and what the control should be is an open owner
  decision (`AU17`). What you send is forwarded to Google's API, so treat it with the same
  care as an email to an external party.
- **Companionship or crisis support.** The wellbeing coach offers peer-level,
  conversation-shaped support. It is not a companion product, not therapy and not a crisis
  line; the staff assistant has **no coded crisis-detection or escalation path**. If you or
  someone you know is in distress, contact professional support directly.

**Access restrictions:** the staff assistant and year-end analysis require a signed-in
account with team membership, which only a team lead's invitation or approval can create.
The public screening is open to anyone with the link; it has **no age assurance** (declared
in §6 — the gaps block, not the small print).

---

## 3 · Safety and reliability

*Structured per the IMDA guidelines: for each risk, the safeguards, what is honestly known
about their effectiveness, and what you can do. NEXUS publishes **no quantitative
effectiveness figures because none have been measured**; the guidelines permit qualitative
statements, and a percentage this project cannot evidence would violate its own first
guardrail (fail loud, never silent).*

### Incorrect information (all generative surfaces)

- **Safeguards:** a guardrail preamble on every model call forbids invented citations,
  requires references to be labelled `model-recalled (unverified)`, requires declared
  assumptions, and forbids silent trimming. Output length is bounded in code
  (`maxOutputTokens`). Analysis responses must return a declared assumptions block, and a
  missing one is surfaced as `NO_ASSUMPTIONS_DECLARED` rather than papered over.
- **Effectiveness, honestly:** the code-enforced parts fail closed and are tested. The
  prompt-carried parts are verified to **reach** the model on every call
  (`functions/guardrails.test.js`); **nothing can verify in advance that the model follows
  them**, so the 20-turn read of real transcripts (`AURA-VERIFICATION-TURNS.md`) is the
  gate before compliance is claimed. **That read has now run — three times against the
  live model on 2026-09-05** (`.github/workflows/verify-aura.yml`, `P8.8`). What it showed:
  the prompt-injection block held on every turn of every run; the structured-reply
  contract held on every turn; fourteen of eighteen automated turns passed on the drafted
  read, two failed (a re-proposed workload figure, `AU31`; a claim that a wellbeing note
  had been saved, `AU32`) and two held the rule's spirit but not its letter. All five
  behaviours found were fixed the same day, two of them in code because the prompt was
  ignored. The drafted verdicts (`docs/P8.8-owner-read-2026-09-05.md`) await the owner's
  signature; until they carry it, this card reports the run and does not claim compliance.
- **What you can do:** verify anything important against an authoritative source before
  acting on it; treat every citation AURA offers as unverified, because it is.

### High-risk topics on the public screening (health)

- **Safeguards:** the result page carries a prominent medical disclaimer; results are
  tiered (Red / Amber / Green) with next-step guidance routed by tier, including urgent
  care wording on the highest tier; the model cannot steer the assessment — questions,
  scoring and routing are code, the model writes only short acknowledgements capped at 200
  tokens against a fixed prompt no caller can modify, and answers are framed as data.
- **Effectiveness, honestly:** parser defects found in audit (`AC1`, `AC2`) are closed with
  evidence. The disclaimer and urgent-action wording are live in English only; the formal
  clinical review of that wording is an open item (`CD10`). **No translated string on this
  service has been read by a native speaker.** Around 68 machine-translated strings are
  unreviewed (`CD13`), and five of them are safety instructions — sentences whose job is to
  stop somebody — that were shipped under the repository owner's signed waivers on
  2026-09-13 and 2026-09-15 rather than review.
- **What you can do:** treat the result as a starting point for a conversation with your GP,
  not a conclusion; seek immediate care for acute symptoms regardless of what any screening
  tool says.

### Harmful content and misuse

- **Safeguards:** Gemini's own safety behaviour applies to all generative output. The
  team feed's AI guard screens posts server-side before creation (clients cannot create
  posts directly). The public endpoint accepts no caller-supplied system prompt and
  validates inputs against closed sets. Per-user and global rate ceilings bound both the
  staff assistant and the public endpoint, so a runaway or hostile caller hits a loud
  ceiling rather than an unbounded bill.
- **Effectiveness, honestly:** the audit's reachable-and-dangerous list is empty as of
  2026-08-24, with the ledger (`AURA-TODO.md`) holding pasted evidence per closed finding.
  Feed **comments** are not routed through the model guard that posts get; they are fenced
  in `firestore.rules` against NRIC/FIN-shaped tokens — one identifier class, not PDPA
  compliance (`AN13`, closed 2026-08-24; an earlier draft called this an accepted gap,
  understating a shipped control and misstating a ledger status). No red-team exercise
  has been run against the deployed prompts.
- **What you can do:** report anything harmful or wrong through the channels in §5 — the
  reporting path exists precisely because no filter is complete.

### Emotional safety (staff wellbeing coach)

- **Safeguards:** the coach is deliberately framed as a productivity-adjacent wellbeing
  check-in, not a companion; chat history lives only in memory and is never written to a
  database. *(An earlier draft added "and is gone when the panel closes" and built an
  attachment-limiting argument on it — steward review found both false; see §4 for what
  actually clears the history.)*
- **Effectiveness, honestly:** there is **no coded detection of distress or self-harm
  expressions and no automatic crisis routing** in the staff assistant. This is a known
  property of the current build, not an oversight this card is smoothing over. The live
  read also found the coach **claiming a check-in had been "noted"** when nothing is written
  until you confirm a card (`AU32`, two runs of three), and asking for a 0-to-10 rating
  twice in two turns (`AU34`). Both are addressed by prompt rules since v2.11.0 — a closing
  rule that forbids any claim of saving, and one scale question per check-in — which are
  requests to the model, detected by the test harness on every live run, not controls.
- **What you can do:** treat AURA as a tool. For real distress, use your department's
  staff-support channels or professional help; a check-in slider is not a clinical signal.

---

## 4 · Data practices

### What data is collected, per variant

**Staff assistant:**

- **Chat history is held in memory only.** It is never written to any database, and it is
  cleared when you **sign out** or when a **different account signs in** — as well as by
  reloading the page, closing the tab, or the panel's "Clear Conversation" button. Closing
  the panel alone does **not** clear it: your conversation is still there when you reopen
  it in the same signed-in session, by design. *(History: this card's first draft claimed
  panel-close clearing that never existed, and until 2026-08-28 sign-out did not clear the
  transcript either — found by steward review of the draft, opened as `AU29`, and fixed
  with tests the next day.)*
- What you type (and attach) is sent to Google's Gemini API to generate the reply.
  Attachments are forwarded within the coded bounds described in §2; their contents are
  not inspected first.
- A workload figure is written to the team's database **only** after your confirmation
  click, and the write is validated in code first. Exports and audit rows carry an AI
  provenance record (model id, guardrail version, timestamp).

**Public health screening:**

- The assessment record is **de-identified by construction**: no name, no NRIC, no contact
  details, and no browser fingerprint (the one telemetry field that undermined this,
  `clientReference: navigator.userAgent`, was found in audit and removed — `CP3`). Said
  precisely: this is a property of what the current screens write, not a schema the
  database enforces against a future caller.
- **Records are deleted automatically after 24 months**, and that sentence is enforced by a
  scheduled sweep in code (`functions/retention.cjs`), not just stated. A notice appears
  before the assessment starts and in full with the result.
- Your answers are sent to Google's Gemini API only to generate the short acknowledgement
  lines.

**Year-end analysis (leads only):** what reaches Gemini is stated plainly rather than
implied: **real clinician names, their titles, their workload figures, and their seniority
band** — never their job grade, and a test fails the build if a grade appears in the
payload. "Band, not grade" is a line that holds; "no identifying data" is not one, and this
card will not offer it.

### Who has access

- Team data is partitioned by membership: `firestore.rules` requires a membership document,
  and a member of one team reads nothing of another's (149 emulator checks in
  `scripts/firestore-rules-verify.mjs` as of 2026-09-06, run in CI on every deploy; an
  earlier draft cited 91, then 140 — the count moves, and the script, not this card, is
  the source). Year-end analysis is lead-only, enforced server-side.
- Message content is processed by **Google** (Gemini API) as the model provider, and the
  application runs on **Firebase** (Google Cloud). No other third party receives chat
  content. Data is not sold.

### Whether data is used for model training

NEXUS itself trains no models and fine-tunes nothing on your data. Handling by Google's
Gemini API, including any use for model improvement, is governed by **Google's API terms**.
Per the IMDA guidelines, a deployer on a third-party model discloses what is reasonably
available to it: NEXUS has **not independently verified** Google's internal handling and
does not claim to have.

### Your controls

- **Staff chat:** nothing is stored, so there is nothing to request deletion of. A workload
  entry is only ever created by your explicit click.
- **Public screening:** the record holds nothing that links to you — which also means it
  **cannot be looked up or selectively deleted on request**; there is nothing to search by.
  It expires automatically at 24 months. If that trade-off matters to you, the form pathway
  shows the same notice before you answer anything.

---

## 5 · Feedback and reporting

### How to report

- **In the app:** the built-in feedback reporter, which writes to a `beta_feedback`
  collection. Use it for wrong or harmful AURA output, incorrect screening behaviour, and
  bugs.
- **Security and data concerns:** email the lead developer directly at the address
  published in the repository's security policy (`SECURITY.md`). Do not raise security
  issues in public issue trackers. ⚠️ The address is deliberately not reproduced here:
  this card ships in the public application bundle, and a standing control (`AN14`)
  keeps staff email addresses out of that bundle. Whether to publish a dedicated
  public contact address on this card is an open owner decision (§6).

### What you can report

Harmful, offensive or incorrect AI output; privacy or data-handling concerns; suspected
disclosure of anything identifying; screening results that seem clinically wrong; technical
faults.

### What to expect

Security reports are acknowledged within 24 hours with a remediation timeline
(`SECURITY.md`). ⚠️ **For general AURA feedback, no response-time commitment is published
yet** — defining that process is an open item on the transparency ledger rather than a
promise this card invents. What can be said with evidence: audit findings here are tracked
on a public-in-repo ledger where an item is only `DONE` with pasted evidence, and user
reports enter that same pipeline.

---

## 6 · Assumptions, gaps and unverified items

*Required by guardrail P1; deliberately in the body of the card, not a footnote.*

1. ~~**This card is a draft with no named sign-off**~~ — **signed off 2026-08-28** by
   Muhammad Alif (owner) as v1.0; the card is in effect. Struck through, not deleted.
2. **The card is surfaced in the product and in force in the codebase.** The app serves
   this document at `/aura-info`, shows a safety statement with a link at first use of the
   staff assistant and before the public pathways, and keeps a persistent info icon in
   both chat headers (`AURA-TODO.md` 9.2/9.3, closed with test evidence). Deployed with
   app v2.1.x (merged to `main` 2026-08-28/29).
3. **Prompt-carried safeguards are verified only by a read the owner has not yet signed.**
   The 20-turn read (`P8.8`) ran three times against the live model on 2026-09-05; the
   injection block and the JSON contract held on every run, five behaviours found were
   fixed the same day (`AU31`–`AU35`), and the drafted verdicts
   (`docs/P8.8-owner-read-2026-09-05.md`) await the owner's acceptance. Until then this
   card does not claim the safeguards are followed.
4. **No attachment content inspection exists** (`AU17`): count, size and type are bounded
   in code and logged, but nothing classifies what is inside a file before it reaches
   Google's API. User instruction is the current data-classification control, and whether
   that is sufficient is an open owner decision. (No current client UI sends attachments;
   the bound defines the contract before a UI exists.)
5. **No age assurance exists on the public screening**, and no child-specific safeguards
   are implemented. The tool is aimed at adults making their own health decisions; that
   aim is not enforced.
6. **Google's data handling is taken from Google's terms, not verified independently.**
7. **The medical disclaimer and urgent CTA wording await formal clinical review** (`CD10`),
   and roughly **68 machine-translated strings await native-speaker review** (`CD13`) — none
   has been read by one. **Five are safety instructions that shipped under owner waivers**
   rather than review, two of them added with the heart-rate block in v2.14.0. The waivers,
   and the risks accepted in each, are recorded in `src/data/copyReview.js`.
8. **No quantitative safety metrics exist.** Every effectiveness statement above is
   qualitative by necessity, not by preference.
9. **No public contact email appears on this card yet**, by design conflict rather than
   oversight: the IMDA guidelines suggest a support address, and the `AN14` control keeps
   staff addresses out of the public bundle this card ships in. **Decision 2026-08-28:**
   the owner opted for the industry-standard resolution — a dedicated, non-personal
   support address. That mailbox does not exist yet; until it is created and published
   here in a card update, the in-app reporter is the public channel. Ledger row 9.5 stays
   open on exactly that.
10. ~~**Staff chat history survives sign-out**~~ — **fixed 2026-08-28** (`AU29`, found by
   steward review of this card's own first draft): sign-out and any identity change now
   clear the transcript, persona and panel state, asserted by 4 tests
   (`AuraPulseBot.au29.test.jsx`), including that a re-render under the same account
   clears nothing. Kept struck through rather than deleted — this list is also the record
   of what was wrong.
11. **The public first-use statement is bypassable by deep link.** It lives on the pathway
   selection screen; a person handed `/individuals/chat` directly reaches the chat with
   only the header's info icon. Known, disclosed, and on the ledger (`AURA-TODO.md` 9.2).
12. **Three claims in this card's first draft were wrong and are corrected in place**, per
   the same rule the guardrails document follows: the panel-close history claim (item 10),
   a stale "91 emulator checks" citation, and `AN13` described as an accepted gap after it
   had closed. They were found by steward review, not by a test — the argument for reading
   this card adversarially rather than trusting it.
13. **The model does not reliably follow rules written into its prompt.** Not a hypothesis
   any more: in the 2026-09-05 live read, two prompt rules were ignored on every run
   (`AU31` three of three, `AU33` four of four, through two wordings) and were replaced by
   code. Every rule in §3 that is described as "prompt-carried" should be read with that
   result in mind — it is a request the model usually honours, verified after the fact by a
   test harness, not a control.
14. **The provider changes the model list without notice.** Between 2026-08-28 and
   2026-09-05 three of the four model names AURA was configured to use were withdrawn by
   Google and the fourth was refused to new keys; production survived only because its key
   pre-dated the change. Model resolution now probes before trusting a name (`AU30`), but
   the list in §1 is a snapshot and the model that answers you is the one named in the
   provenance record, not the one this card names.
15. **Five card versions on, the owner has re-read §1 to §3 against v2.11–v2.12 only in
   summary.** Card v1.0 was approved read in full; v1.1–v1.3 were folded in by the
   engineer with the owner's approval standing. A full re-read is due at the next annual
   review or the next capability change, whichever comes first.

---

## Source table

*Required of controlled documents by guardrail P3 (claim, source, verification status).
Verification: an independent steward audit on 2026-08-27 checked every row below against
source, re-ran the cited tests, and rebuilt the bundle from scratch before checking it.
"Confirmed" means checked against the named source on that date — not permanently true;
the update triggers below exist because these facts move.*

| Claim (§) | Source | Status |
|---|---|---|
| Chat history in memory only, never written to a database; cleared on sign-out and identity change (§4) | `src/context/NexusContext.jsx`, `src/components/AuraPulseBot.jsx`, `src/App.jsx` (`handleLogout`) | Confirmed 2026-08-27 (memory-only half); the first draft's "cleared on panel close" was found **false**, opened as `AU29`, and the sign-out clear was **built and tested 2026-08-28** — `AuraPulseBot.au29.test.jsx`, 4 passed |
| Human click gates every write; proposal validated in code first (§1, §2) | `src/components/AuraPulseBot.jsx` (`onClick` is the only path), `src/utils/dataEntryGuard.js` | Confirmed 2026-08-27 |
| 82 passing validation tests (§1) | `src/utils/dataEntryGuard.test.js` | Confirmed 2026-08-27 — re-run by the steward, 82 |
| Assistant cannot touch the roster (§2) | `dataEntryGuard.js` collection/field allowlists | Confirmed 2026-08-27 |
| Model list and `gemini-flash-latest` fallback; probe before trust; 30-minute demotion on quota or availability refusal (§1) | `functions/modelAvailability.cjs` `MODEL_PRIORITY`, `SAFE_FALLBACK_MODEL`; `functions/modelQuota.cjs` `DEMOTION_TTL_MS`; `functions/index.js` `resolveModel()` | Confirmed 2026-08-27 against the old list in `index.js`; **re-confirmed 2026-09-06** against the v2.11.0 module after the list was rewritten (`AU30`, second half) |
| A workload card is discarded in code when the current message carries no figure (§1) | `functions/workloadIntent.cjs` `currentTurnRule()`, wired in `chatWithAura`; `workloadIntent.test.js` with the three live turns as fixtures | Confirmed 2026-09-06 (`AU31`, v2.11.0) |
| A shortened targeted rework is announced by the application, AURA's words unaltered (§1) | `src/utils/reworkNote.js` (`SHRINK_THRESHOLD` 0.7), `AuraPulseBot.jsx`; `reworkNote.test.js` (33), `AuraPulseBot.au33.test.jsx` (4) | Confirmed 2026-09-06 (`AU33`, v2.12.0); verified live on cloud run 3 |
| Closing rule, one scale question per check-in, declare-both-halves — prompt rules with harness detectors, not controls (§3) | `functions/index.js` MODE 1 / MODE 2 rules; `scripts/guardrailTurnChecks.mjs` | Confirmed 2026-09-06 (`AU32` `AU34` `AU35`, v2.11.0–v2.12.0) — present in the prompt; followed on the runs read, not guaranteed |
| Provenance (model id, guardrail version, timestamp) stamped and rendered (§1, §4) | `functions/index.js`, `AuraPulseBot.jsx`, `SmartReportView.jsx` | Confirmed 2026-08-27 |
| Attachment bounds: 5 files, ~4 MB each, ~8 MB total, five formats, logged (§2) | `functions/attachmentRules.cjs`, `functions/index.js` (logger) | Confirmed 2026-08-27 |
| No attachment content inspection; no client UI sends attachments (§2, gap 4) | `attachmentRules.cjs` header and code | Confirmed 2026-08-27 |
| Public acknowledgement capped at 200 tokens, no caller-supplied prompt (§1, §3) | `functions/index.js` `communityAck` | Confirmed 2026-08-27 |
| 24-month deletion enforced by a real scheduled job (§4) | `functions/index.js` `expireCommunityAssessments` (daily, `Asia/Singapore`), `functions/retention.cjs` | Confirmed 2026-08-27 |
| Rate ceilings, per-caller and global, on both endpoints (§3) | `functions/rateLimit.js` and its call sites | Confirmed 2026-08-27 |
| Year-end payload carries names, titles, workload, band — never grade (§4) | `src/components/SmartAnalysis.jsx`, `SmartAnalysis.publish.test.jsx` (8 passed) | Confirmed 2026-08-27 |
| Analysis is lead-only, server-side (§4) | `functions/index.js` `generateSmartAnalysis` membership re-read | Confirmed 2026-08-27 |
| Team partitioning: 149 emulator checks (§4) | `scripts/firestore-rules-verify.mjs` (`grep -c 'await check('`) | Corrected 2026-08-27 (draft cited a superseded 91) to 140; **re-counted 2026-09-06 at 149** — cite the script, not a document |
| Feed posts screened server-side; clients cannot create (§3) | `firestore.rules` (`allow create: if false`) | Confirmed 2026-08-27 |
| Comments fenced against NRIC/FIN tokens, not model-screened (§3) | `firestore.rules` comment fence; `AN13` closed | Corrected 2026-08-27 (draft called it an accepted gap), then confirmed |
| No coded crisis routing in the staff assistant (§2, §3) | Zero matches for crisis/self-harm/escalation terms across the assistant's code | Confirmed 2026-08-27 |
| Demo sandbox sends nothing to any model (§1) | `src/utils/demoAura.js` — no network call of any kind | Confirmed 2026-08-27 |
| Medical disclaimer quoted verbatim; Red/Amber/Green tiers (§2, §3) | `src/components/ResultPage.jsx` | Confirmed 2026-08-27 |
| Community record de-identified by construction; fingerprint removed (§4) | `src/utils/telemetry.js`, `CP3` | Confirmed 2026-08-27, with the "construction, not schema" hedge the audit asked for |
| Versions: app 2.14.0, engine v2.3, guardrails 1.0 (header) | `package.json`, `AURA-CHANGELOG.md`, `functions/guardrails.cjs` `GUARDRAIL_VERSION` | Confirmed 2026-08-27 at 2.1.0; re-checked 2026-08-28 (2.1.3), 2026-09-03 (2.10.0), 2026-09-06 (2.12.2) and 2026-09-15 (2.14.0). ⚠️ This row drifted two minors behind the header before the 09-15 check: `auraInfoCard.version.test.js` guards only the **Describes** line, so nothing catches this one. The guardrail preamble is unchanged at 1.0 — v2.11–v2.12's new rules live in the base prompt's MODE sections, which the preamble version does not stamp; noted so the provenance record is read correctly. |
| Model follows its prompt-carried rules (§3) | `docs/P8.8-owner-read-2026-09-05.md`; `.github/workflows/verify-aura.yml` run logs | **Unverifiable from source.** Observed on three live runs 2026-09-05: injection block and JSON contract held throughout; two behavioural failures, both fixed; drafted verdicts **awaiting the owner's signature** |
| Google's internal data handling (§4) | Google's API terms | **Not independently verified**, stated as such (gap 6) |

---

## Card versioning

Per the IMDA guidelines' timeliness principle, this card is updated when a development
meaningfully changes AURA's capabilities or safety profile — a model change in
`resolveModel()`'s list, a guardrail revision (the guardrail version is stamped into every
provenance record, so drift is detectable), a new AURA capability, or a newly identified
risk — and reviewed at least annually even without one. Routine UI and infrastructure
changes do not trigger an update. The card carries its own version and last-updated date in
the header, alongside the app and engine versions it describes; `package.json` remains the
single authoritative app version.

| Card version | Date | Change |
|---|---|---|
| 1.3 | 2026-09-06 | Brought up to v2.11.0–v2.12.0, the releases the P8.8 live read produced. §1: the model list and fallback rewritten to `modelAvailability.cjs` (three of the four previous names had been withdrawn by Google; resolution now probes before trusting a name); the two code controls the read forced — a workload card needs a figure in the current message (`AU31`), a shortened targeted rework is announced (`AU33`) — added to *Capabilities* and *Limitations*. §3: the read's results stated (injection and JSON contract held on every run; two behavioural fails, both fixed), the `AU32`/`AU34`/`AU35` prompt rules named as requests with detectors. §4: emulator checks 140 → 149. §6: gaps 13–15 added (prompt rules are demonstrably not controls; the provider withdraws models without notice; the owner's full re-read is due). Source table extended with the new modules. Approval stands; v1.0 remains the last version the owner read in full. |
| 1.2 | 2026-09-06 | Header: app version 2.1.3 → 2.12.1. §5 item 2: "when the branch carrying it deploys" → deployed with v2.1.x. §5 item 3: the P8.8 read has now run (three live runs, 2026-09-05) and the card says so, still without claiming the safeguards are followed until the owner signs the read. v2.11.0–v2.12.0 added controls the read found necessary (`AU31` a proposal needs a figure in the current message; `AU33` a shortened rework is announced) — behaviour that narrows what AURA does, none that widens it. Approval stands; the owner should re-read §1–§3 against those releases. |
| 1.1 | 2026-08-28 | §1 updated after a live failure the same day (`AU30`): model selection is now quota-aware — a model the key can see but not use is set aside and the call retried once on the next in the list — and API failures reach the browser as a clean sentence, never the upstream quota/billing text. No other content change; approval stands. |
| **1.0** | 2026-08-28 | **Signed off by the owner (Muhammad Alif) and in effect** — approval given against draft v0.3, read in full. Folded into this version, from the same session: `AU29` fixed (sign-out and identity change now clear the AURA session; 4 tests), §3/§4 rewritten to the fixed behaviour, and the 9.5 decision recorded (a dedicated non-personal support address will be published here once created; in-app reporter until then). |
| 0.3 (draft) | 2026-08-27 | Steward audit corrections before sign-off: the false panel-close history claim replaced with the true clearing behaviour and the `AU29` shared-terminal caveat; "91 emulator checks" corrected to the current 140; `AN13` corrected from "accepted gap" to its shipped NRIC/FIN fence; "by design" hedged to "by construction"; gap items 10–12 added. 21 other load-bearing claims steward-CONFIRMED against source. |
| 0.2 (draft) | 2026-08-27 | Surfaced in-app: served at `/aura-info` from this file verbatim, first-use safety statements on both chat surfaces, persistent header links. The security contact address was replaced with a reference to `SECURITY.md` — the `AN14` bundle control refused the literal address in the public bundle, and the conflict is declared as gap item 9. |
| 0.1 (draft) | 2026-08-27 | First draft, structured after IMDA Annex B. Not yet signed off, not yet surfaced in-app. |
