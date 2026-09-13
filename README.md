# NEXUS: Smart Operations Dashboard v2.13.0

![Version](https://img.shields.io/badge/Version-v2.13.0-blue) ![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-646cff) ![Backend](https://img.shields.io/badge/Backend-Firebase-ffca28) ![Roster](https://img.shields.io/badge/Roster-deterministic-0f766e) ![AI](https://img.shields.io/badge/AI-Google%20Gemini-8e75b2) ![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2ea44f)

**NEXUS** (formerly IDC App) is a clinician-led progressive web application for team operations, workload tracking, staff wellbeing, rostering and community health screening. It uses a multi-team Firebase data model so each department and institution has its own membership, settings and operational records.

> **Master the Grind · Protect the Pulse · Build the Future**

## Who NEXUS supports

NEXUS brings the daily work of a department into connected views: understand workload, configure a roster, check in on wellbeing, prepare operational documents and share updates with colleagues. A separate public pathway supports community health navigation.

| Audience | How they use NEXUS |
|---|---|
| **Team members** | View assignments, request cover, record workload, complete wellbeing check-ins and participate in team discussions. |
| **Department leads** | Configure duties and staffing rules, review assignment gaps and workload, manage team membership and generate operational analysis. |
| **Community visitors** | Complete a structured health-screening conversation or form and receive a navigation result and printable handover slip. |
| **Evaluators and collaborators** | Explore sample workflows in Demo Mode and inspect the implementation, verification evidence and governance ledgers. |

## Implemented capabilities

The capabilities below are `IMPLEMENTED` in current code. Each surface has a distinct purpose; the [architecture](#product-boundaries) and [security guidance](#security-access-and-data-governance) explain its controls and operational limits.

### Roster Engine V2 — plan duties around your team's rules

Turn a department's staffing requirements into a repeatable roster. Leads configure the staff pool, duties and constraints, then review the generated assignments, unfilled slots and warnings.

- **Describe the service:** set duty days, grade bands and minimum grades, required skills, working hours, availability and FTE.
- **Control assignment patterns:** configure weekly rotation, quotas, consecutive-day limits, forbidden pairs and named standby assignments.
- **Review the result:** use department and personal-week views, inspect workload distribution and identify assignments the configuration cannot fill.
- **Coordinate cover:** request a colleague's help from the relevant shift and respond through the roster's coverage cards.
- **Take the roster with you:** export a PDF calendar, Excel workbook, CSV or ICS file for use outside the dashboard.

The engine is a deterministic constraint solver: the same inputs produce the same result. AURA does not generate or alter rosters. Leads should review the result and the [known limitations](#known-limitations) before operational use.

### Staff AURA Assistant — support everyday writing and check-ins

Use conversational assistance for routine operational tasks, with a person reviewing the output and confirming proposed entries.

- **Reflect on wellbeing:** hold a check-in conversation and review a proposed wellbeing log before saving it.
- **Prepare a first draft:** create memos, SOPs and incident-report drafts, then download a Word document for review and editing.
- **Record workload conversationally:** enter a request such as “I saw 145 patients in June,” review the extracted details and confirm the entry. Application validation checks the proposed write before it is saved.
- **Review targeted edits:** when a requested revision substantially shortens an earlier draft, an application-generated note highlights the change in length so the reader can check for omissions.

AURA uses Google Gemini. Generated text needs human review, particularly factual statements, references and procedural content. The [chatbot info card](docs/AURA-CHATBOT-INFO-CARD.md) explains intended use and data handling.

### NEXUS Feeds — keep your team informed

Share operational updates, useful resources and team discussions within your department. Feeds gives colleagues a common place to find posts and continue the conversation.

- **Share and discuss:** publish team updates and add comments to posts.
- **Find relevant content:** browse category filters and open posts in a focused reading view.
- **Bring colleagues to the discussion:** share a direct link to a post; access remains subject to team membership.
- **Organise posts with assistance:** submitted post text receives automated screening and categorisation before publication.

Automated screening supports responsible sharing. Members remain responsible for the information they submit; the specific checks and their coverage are documented under [access and data controls](#access-and-data-controls).

### Smart Workload / Intelligence — turn operational figures into discussion

Review workload dashboards and historical reports, then use AI-assisted analysis to prepare a department-level discussion of patterns, pressures and priorities.

- **See workload in context:** inspect operational figures and historical records within the selected team.
- **Generate a written analysis:** team leads can request a Gemini-generated brief based on the supplied workload and staff profiles.
- **Review both summaries:** examine the generated executive and team-facing text before archiving a report.
- **Revisit prior analysis:** open archived reports alongside the team's historical workload information.

These are decision-support drafts for human interpretation. Smart Analysis sends seniority bands rather than exact grades, and its Gemini payload can include staff names, titles and workload figures. Use information authorised for that purpose.

### Public health screening — make the next step easier to understand

The separate `/individuals` pathway lets community visitors answer structured questions through a conversation or conventional form, without a staff account.

- **Choose a format:** use the conversational pathway or work through the form.
- **Choose a language:** access English, Malay, Chinese or Tamil interface text; outstanding translation reviews are tracked in the Community ledger.
- **Receive a navigation result:** application code parses answers, calculates the screening score and selects the next-step routing.
- **Carry the result forward:** generate a printable handover slip to support a follow-up conversation.

Gemini supplies optional acknowledgement wording in the conversational pathway. It does not determine the screening score or routing. The result is a health-navigation aid, not a diagnosis or treatment recommendation.

## Using NEXUS responsibly

NEXUS combines team access controls, application validation and human review. These practices help users apply its capabilities appropriately:

- **Review before acting:** check roster gaps, generated documents and analysis before operational use. Confirm AURA-proposed entries only after reviewing the details.
- **Use authorised information:** AI features send their relevant inputs to Google's Gemini service. Staff names, titles and workload figures may be included in Smart Analysis; avoid patient-identifiable information and use placeholders in drafts.
- **Match the tool to the task:** staff wellbeing conversations support reflection; public screening supports health navigation. Professional judgement and appropriate care remain necessary.
- **Choose a deliberate demonstration workflow:** Demo Mode supplies sample data, but some signed-in actions still use production services. Follow the [Demo Mode guidance](#demo-mode-and-smoke-testing).
- **Consult the evidence:** code-enforced safeguards and model instructions are distinguished in the [guardrails](AURA-GUARDRAILS.md). Open engineering work and owner decisions remain visible in the [governance records](#the-paper-trail).

## Product boundaries

| Surface | Access and processing |
|---|---|
| **Roster Engine V2** | Team roster access; lead-only generation and configuration writes. The solver runs deterministically without Gemini. |
| **Staff AURA Assistant** | The internal UI uses staff access controls. Its separate `chatWithAura` callable requires Firebase authentication; proposed writes are subject to application validation, confirmation and applicable Firestore Rules. |
| **NEXUS Feeds** | `processFeedPost` verifies authentication and membership in the selected team. Post text is sent to Gemini for screening and categorisation; comments follow a separate write path. |
| **Smart Workload / Intelligence** | `generateSmartAnalysis` re-checks team-lead membership. Its model payload includes operational data and may identify staff. |
| **Public screening** | Public access through `/individuals`. `communityAck` handles acknowledgement wording; parsing, scoring and routing remain separate application code. |

A prompt instruction to Gemini is a request to a non-deterministic model. A technical guarantee requires application code that validates, constrains or rejects the relevant behaviour.

## Current release status

| Item | Status | Evidence and meaning |
|---|---|---|
| Application version | `IMPLEMENTED` — **v2.13.0** | `package.json` is the version source; `src/version.js` supplies the label rendered in the app. |
| Deployment | `IMPLEMENTED` | A push to `main` runs build, test and lint, then deploys Cloud Functions, Firestore Rules, indexes and Firebase Hosting. |
| AU18 response parser | `IMPLEMENTED` and `VERIFIED`, released in **v2.12.4** | The staff AURA client and Cloud Functions share `functions/responseParser.cjs`. It was deployed after v2.12.3 without changing the displayed version; v2.12.4 closes that gap. |
| Community functional measures | `PROPOSED` | No grip-strength or sit-to-stand feature has been built. Decisions `CD17`–`CD25` remain with the owner; `CD17`, `CD18`, `CD19` and `CD25` block implementation. |
| Open work | `OPEN` / `OWNER DECISION` | The live queues are in `AURA-TODO.md`, `ROSTER_TODO.md` and `COMMUNITY_TODO.md`. README summaries never close those rows. |

The deployed application reports **v2.13.0**, which adds the community portal’s two strength measurements, the precise-age pathway split and the printed report page that carries them. See [`CHANGELOG.md`](CHANGELOG.md) for the authoritative release record.

## Quick start

### Prerequisites

- Node.js **24** for parity with the Cloud Functions runtime.
- npm.
- Firebase CLI only for emulator or deployment work.

### Install and run

```bash
npm install
npm run dev
```

Vite prints the local URL. The repository contains its Firebase web configuration, so a local build can contact the configured Firebase project. Use test accounts and deliberate inputs; do not assume localhost or Demo Mode creates a separate backend.

### Verification gates

Run the same three gates used before deployment, in this order:

```bash
npm run build
npm test
npm run lint
```

Build runs first because bundle-level tests inspect the generated `dist/` artefact. Do not report a gate as passing unless its command completes successfully.

### Backend dependencies

Cloud Functions have their own lockfile and runtime:

```bash
cd functions
npm ci
```

`GEMINI_API_KEY` is a deployed Cloud Functions secret. App Check rollout also uses `VITE_APPCHECK_SITE_KEY` and `ENFORCE_APP_CHECK`; `RATE_LIMIT_SALT` is a repository secret. Follow the ordered rollout in [`COMMUNITY_TODO.md`](COMMUNITY_TODO.md) before enabling enforcement.

## Technical architecture and repository map

The frontend is a React/Vite PWA. Firebase provides Authentication, Firestore, Cloud Functions, Cloud Messaging, Storage and Hosting. Team-scoped data lives below `teams/{teamId}`; membership documents and endpoint checks are part of the authorization model. The public screening uses separate non-team collections and endpoints.

### Tech Stack
* **Frontend:** React (Vite build system)
* **Styling:** Tailwind CSS (utilising `animate-in` plugins and dynamic `dvh` math for mobile responsiveness)
* **Icons:** `lucide-react`
* **Charts:** `recharts`
* **Backend / Auth:** Firebase (Firestore, Authentication, Cloud Functions)
* **Document Generation:** `docx`

### Working on the repository

Use a feature branch and inspect the relevant ledger before changing a governed surface. The mandatory local gates are `npm run build`, `npm test` and `npm run lint`, in that order. A push to `main` starts `.github/workflows/deploy.yml`; after the gates pass, that workflow deploys Functions, Firestore Rules, indexes and Hosting.

The frontend and Functions have separate dependency manifests. Run `npm install` at the repository root for frontend development and tests; run `npm ci` inside `functions/` when working on or deploying the backend.

### Repository Structure
```text
nexus/
|-- .github/workflows/
|   |-- deploy.yml                 # CI: build, test, lint; deploys functions, rules, indexes, hosting
|   |-- tag-release.yml            # Cuts the vX.Y.Z tag on workflow_dispatch
|   |-- verify-aura.yml            # Manually runs the live AURA verification turns
|-- docs/                          # Info card, walkthrough deck, design prompts, translation workbook
|-- scripts/                       # Admin-SDK runbooks and the rules emulator suite (see below)
|   |-- firestore-rules-verify.mjs # Emulator checks against firestore.rules (149 as of 2026-09-03)
|   |-- migrate-to-teams.cjs       # The one-time v2.0.0 cutover — executed 2026-08-23
|   |-- bootstrap-config.cjs       # Seeds config/domains and config/superAdmins
|   |-- add-pending-member.cjs     # Roster a colleague who has not registered yet
|   |-- roster-stress.mjs          # Engine stress probes (with roster-scaling.mjs)
|-- functions/                     # Cloud Functions (Gemini calls, membership, rollups)
|   |-- index.js                   # All callables and scheduled jobs
|   |-- teamMembership.js          # inviteMember and the domain gate
|   |-- teamApproval.js            # Lead requests and super-admin approval
|   |-- communityAck.js            # The public screening's acknowledgement call
|   |-- rateLimit.js               # Public and staff AI-call ceilings
|   |-- responseParser.cjs         # Shared Gemini JSON parser (server and staff client)
|   |-- modelQuota.cjs             # Quota-aware model demotion (AU30)
|   |-- guardrails.cjs             # The prompt-carried guardrail preamble
|   |-- personas.cjs               # Persona texts, verbatim
|   |-- attachmentRules.cjs        # What the attachment path accepts, and the audit log
|   |-- insights.cjs               # Community rollup
|   |-- retention.cjs              # Retention windows
|   |-- package.json               # Backend dependencies (versioned separately)
|-- public/                        # Static assets and PWA manifest
|   |-- firebase-messaging-sw.js   # Service worker for push notifications
|   |-- manifest.json              # Progressive Web App configuration
|   |-- logo.png                   # Live department branding
|   |-- nexus.png                  # Sandbox branding
|   |-- logos/                     # Institution logos
|-- src/                           # React Frontend Source
|   |-- version.js                 # THE ONE PLACE the app learns its version (from package.json)
|   |-- components/                # Reusable React UI components
|   |   |-- AccessGate.jsx         # Sign-in and membership gate
|   |   |-- AdminPanel.jsx         # Executive overview and audit logs
|   |   |-- AdminWellbeingPanel.jsx
|   |   |-- AppGuide.jsx           # Application manual and onboarding
|   |   |-- AuraGreeting.jsx       # Contextual floating smart quote widget
|   |   |-- AuraInfoCard.jsx       # Renders docs/AURA-CHATBOT-INFO-CARD.md at /aura-info
|   |   |-- AuraPulseBot.jsx       # AURA staff assistant chat interface
|   |   |-- Aura.hooks.js          # Chat hooks
|   |   |-- CommunityInsightsPanel.jsx
|   |   |-- ConfirmationModal.jsx  # Secure action validation dialogs
|   |   |-- CoverageWatcher.jsx    # Listens for coverage requests addressed to you
|   |   |-- FeedbackWidget.jsx     # Ghost event-driven bug reporter
|   |   |-- FeedsView.jsx          # Digital watercooler and posts
|   |   |-- LeadRequestsPanel.jsx  # Super-admin approval of lead requests
|   |   |-- PostLightbox.jsx       # Immersive post expansion UI
|   |   |-- ProfileView.jsx        # User management and authentication
|   |   |-- ResponsiveLayout.jsx   # Core responsive shell (Mobile/Desktop)
|   |   |-- RosterView.jsx         # The roster: calendar, Department / My week, coverage
|   |   |-- RosterDemoWizardTables.jsx # Configure — the staff and task tables
|   |   |-- RosterExportMenu.jsx   # One Export control: PDF, Excel, CSV, ICS
|   |   |-- WizardStep.jsx         # Configure step shell
|   |   |-- StaffLoadEditor.jsx
|   |   |-- SmartAnalysis.jsx      # Year-end wellbeing analysis (lead only)
|   |   |-- SmartReportView.jsx    # Renders an archived analysis
|   |   |-- TeamMembersPanel.jsx   # A lead invites, removes, sets profession and grade
|   |   |-- TeamSwitcher.jsx       # Which team, for a member of more than one
|   |   |-- WelcomeScreen.jsx      # Sign-in
|   |   |-- WellbeingView.jsx      # Pulse and social battery tracking
|   |   |-- PathwaySelection.jsx   # PUBLIC /individuals — chat or form
|   |   |-- LanguageGate.jsx       # PUBLIC language choice (en, ms, zh, ta)
|   |   |-- AuraChat.jsx           # PUBLIC health screening (conversational)
|   |   |-- ConventionalForm.jsx   # PUBLIC health screening (form pathway)
|   |   |-- ResultPage.jsx         # PUBLIC result, CTA tiers and the printable slip
|   |   |-- HandoverSlip.jsx       # PUBLIC printable slip
|   |-- config/
|   |   |-- personas.js            # AURA behaviour models
|   |-- context/
|   |   |-- NexusContext.jsx       # Theme, demo mode, auth state
|   |   |-- TeamContext.jsx        # WHICH TEAM — membership, isLead, the switcher
|   |   |-- TeamGate.jsx           # Nothing team-scoped renders without a team
|   |-- data/
|   |   |-- mockData.js            # Marvel superhero simulation dataset and the demo shapes
|   |   |-- mohAlliedHealth.js     # MOH's 28 professions, plus the roles MOH does not name
|   |   |-- screeningChips.js      # PUBLIC screening answer chips
|   |   |-- slipFlagLines.js       # PUBLIC slip flag copy
|   |-- hooks/
|   |   |-- useTeamGrades.js       # Pay grades, lead only, one read per member
|   |   |-- useMemberGrade.js      # Your own grade
|   |   |-- useDomainAllowlist.js  # config/domains, with a `configured` flag
|   |-- utils/
|   |   |-- rosterEngineV2.js      # THE ROSTER ENGINE — deterministic, no AI
|   |   |-- rosterWizard.js        # Configure ⇄ engine mapping and validation
|   |   |-- rosterSettings.js      # teams/{id}/settings/roster — survives a reload
|   |   |-- rosterGrid.js          # Calendar grid model
|   |   |-- rosterPersonView.js    # My week
|   |   |-- rosterCoverage.js      # Coverage requests
|   |   |-- rosterCategories.js    # Task categories and colours
|   |   |-- rosterPdf.js           # PDF wall calendar export
|   |   |-- rosterXlsx.js          # Excel workbook export (with zipWriter.js)
|   |   |-- memberProfile.js       # onlyTasks, shortName, grade parsing
|   |   |-- auraEngine.js          # Roster primitives, ICS/CSV export, swap planning
|   |   |-- dataEntryGuard.js      # What the model is allowed to write (pure)
|   |   |-- clinicalFlags.js       # Shared clinical parsers for both public pathways
|   |   |-- clinicalParse.js       # PUBLIC free-text parsing (AC5)
|   |   |-- scoring.js             # PUBLIC risk scoring
|   |   |-- language.js            # PUBLIC translations (en, ms, zh, ta)
|   |   |-- accessPolicy.js        # Domain allowlist defaults
|   |   |-- legacyBridge.js        # Salted digests in place of the deleted directory (AN14)
|   |   |-- teamPaths.js           # Every Firestore path, derived from teamId
|   |   |-- contrast.js            # WCAG contrast, pinned by contrast.test.js
|   |   |-- index.js               # Shared utilities
|   |-- App.jsx                    # Main application router and shell
|   |-- firebase.js                # Firebase client initialisation
|   |-- main.jsx                   # React DOM entry point
|   |-- index.css                  # Global styles
|   |-- style.css                  # Component-specific overrides
|-- firestore.rules                # THE authorization boundary — read before changing
|-- firestore.indexes.json         # Deployed with the rules
|-- firebase.json                  # Hosting (with cache headers), functions, firestore
|-- package.json                   # THE app version, dependencies, scripts
|-- vitest.config.js               # The suite includes src/, functions/ and scripts/
|-- tailwind.config.js             # Tailwind CSS styling configuration
|-- cors.json                      # Cross-Origin Resource Sharing rules
```

### System flows

```mermaid
flowchart LR
    Staff[Signed-in staff] --> AuraUI[Staff AURA]
    AuraUI --> StaffCall[chatWithAura]
    StaffCall --> Gemini[Google Gemini]
    StaffCall --> Proposal[Validated proposal]
    Proposal --> Confirm[Human confirmation]

    Lead[Team lead] --> Smart[Smart Analysis]
    Smart --> SmartCall[generateSmartAnalysis]
    SmartCall --> Gemini

    Member[Team member] --> Feeds[NEXUS Feeds]
    Feeds --> FeedCall[processFeedPost]
    FeedCall --> Gemini
    FeedCall --> TeamFeed[Team-scoped Firestore feed]

    Public[Public visitor] --> Screening["/individuals"]
    Screening --> Score[Deterministic parsing and scoring]
    Screening --> Ack[communityAck]
    Ack -->|Acknowledgement wording only| Gemini

    Lead --> RosterUI[Roster configuration]
    RosterUI --> Solver[Deterministic Roster Engine V2]
    Solver --> TeamRoster[Team-scoped roster]
```

The roster and public score paths do not call Gemini. Staff AURA, Feeds, Smart Analysis and the public acknowledgement endpoint each have separate inputs and controls.

### Development guardrails

1. Keep the roster deterministic. Changes to `rosterEngineV2.js` require deterministic fixtures and invariant checks; Gemini must not enter the roster path.
2. Treat `firestore.rules` and callable authorization checks as security boundaries. Client-side visibility and domain checks do not grant access.
3. Keep team paths derived from `teamId` and verify membership on Admin SDK functions, because Admin SDK calls bypass Firestore Rules.
4. Validate Gemini output in application code wherever behaviour must be guaranteed. Prompt text alone is not enforcement.
5. Preserve human confirmation for AURA-proposed writes.
6. Update the relevant ledger without renumbering or reusing remediation identifiers.

***

## Security, Access and Data Governance

**THE INTERNAL STAFF UI REQUIRES AUTHENTICATION AND TEAM MEMBERSHIP. `/individuals` IS A SEPARATE PUBLIC PATHWAY.**
NEXUS is an operational and workload management tool. It is not a clinical system and is not a fully integrated hospital system managed by Synapxe. Firebase Authentication identifies staff, Firestore rules gate team-scoped stored data by membership, and callable functions apply their own endpoint-specific checks. The public health-screening pathway does not use the internal staff assistant.

### Supported versions

The current application version is **2.13.0**. [`SECURITY.md`](SECURITY.md) is the authority for support and vulnerability-reporting policy; `package.json` is the authority for the application version. Release changes belong in [`CHANGELOG.md`](CHANGELOG.md), avoiding a second release table that can drift.

### Access and data controls

- **Authentication and membership:** Firebase Authentication identifies staff. Firestore Rules check membership against `teams/{teamId}/members/{uid}` for team-scoped reads and writes. A registered account without membership cannot read team data.
- **Roles:** lead authority is stored on the team membership document and checked again inside privileged Cloud Functions that use the Admin SDK. Client-side role checks are presentation controls only.
- **Registration domain:** the institution-domain check is an onboarding aid. It can be bypassed through the Firebase Auth SDK and is not the authorization boundary.
- **Feeds:** post creation runs through `processFeedPost`, which re-checks authentication and membership before writing. Gemini screens the post, while a deterministic check separately rejects NRIC/FIN-shaped tokens. Comments bypass Gemini and have narrower client and Firestore-rule checks. These controls do not establish general privacy screening or PDPA compliance.
- **Privacy assurance:** the controls described here have specific scopes; they do not establish anonymity, de-identification or PDPA compliance. Assessment of an intended deployment must consider its actual data, access, use and governance arrangements.
- **Attachments:** the staff callable limits count, declared MIME type and encoded size and records pass-through metadata. The client does not currently send attachments, and the server does not inspect file content. The policy decision remains `AU17`.
- **Public screening:** `/individuals` is intentionally unauthenticated. Assessment records are not readable by clients. The separate `communityAck` endpoint is rate-limited; App Check code is present but enforcement remains pending the ordered `CP7` console rollout.
- **Demo Mode:** mock data and write guards reduce demo-side effects, but Demo Mode is not a separate Firebase project or database boundary.

NEXUS has no EMR integration. Do not enter or upload patient-identifiable information; use placeholders such as `[Patient]` and `[Clinician]`.

### Generative AI transparency

[`docs/AURA-CHATBOT-INFO-CARD.md`](docs/AURA-CHATBOT-INFO-CARD.md) is the owner-approved disclosure for the staff assistant, public conversational screening and year-end analysis. The application serves it at `/aura-info`, links to it from the relevant chat surfaces and records its approval history. It is structured after the voluntary IMDA *Transparency Guidelines for Generative AI Chatbots*. This is a transparency baseline, not a certification or a general compliance claim.

The roster engine is outside the card because it contains no model. NEXUS Feeds uses Gemini for post screening and categorisation and is described separately in this README and the governance ledgers. A dedicated public support mailbox remains an `OWNER DECISION` follow-up in `AURA-TODO.md`.

### Known limitations

- **Public scoring validation:** the current scoring model has not been clinically validated against outcomes. Its results support navigation rather than clinical decisions.

- **AURA writes require confirmation.** Staff AURA can propose a workload entry; application code validates the proposal and a person must confirm it before the client writes. Model wording alone does not execute a write.
- **Coverage acceptance does not re-run every roster constraint.** Replacing the requester can create a consecutive-working-day issue for the accepting colleague. The requester is also not notified of the result (`Q3`).
- **Eligibility has one skill slot.** A task cannot currently require both registration status and a separate competency (`Q12`).
- **On-call is not modelled.** A named standby exists, but call-in and post-call-rest semantics do not.
- **Public App Check is not yet enforced.** Rate limits are active; the remaining console rollout is recorded under `CP7`.
- **Gemini output remains non-deterministic.** The repository distinguishes prompt-carried requests from code-enforced controls in `AURA-GUARDRAILS.md` and the AURA ledger.

***

## The paper trail

The live record lives beside the code. [`IDS.md`](IDS.md) is the legend for every id series
(`P`, `Q`, `D`, `CP`, `CD`, `AU`, `AC`, `AN`, …) used across these files. The convention: a
**TODO ledger** is the live status and a row is `DONE` only with pasted evidence; the
**changelog** is the record of what shipped.

| Document | What it is |
|---|---|
| [`CHANGELOG.md`](CHANGELOG.md) | The authoritative release record, Keep-a-Changelog format, newest first |
| [`SECURITY.md`](SECURITY.md) | Supported versions, how to report a vulnerability, the IMDA transparency pointer |
| [`IDS.md`](IDS.md) | Which prefix means what, and the rule that a new series adds a row |
| [`ROSTER_TODO.md`](ROSTER_TODO.md) | The roster engine: the remediation ledger, the current queue, the expressiveness ledger, and the owner's open `Q`n decisions |
| [`AURA-TODO.md`](AURA-TODO.md) · [`AURA-CHANGELOG.md`](AURA-CHANGELOG.md) | AURA, the assistant: the ledger — 65 findings, 55 closed with evidence, 10 open (all owner decisions) — and the engine-tier history |
| [`AURA-GUARDRAILS.md`](AURA-GUARDRAILS.md) | The owner's sixteen working rules, verbatim, with the honest conformance table — what is CODE, what is only asked of a model |
| [`AURA-VERIFICATION-TURNS.md`](AURA-VERIFICATION-TURNS.md) · `docs/P8.8-owner-read-2026-09-05.md` | The 20 real turns that gate any claim that AURA *follows* the guardrails, and the drafted read from three live runs on 2026-09-05 — owner verdicts pending |
| [`docs/AURA-CHATBOT-INFO-CARD.md`](docs/AURA-CHATBOT-INFO-CARD.md) | The IMDA-aligned chatbot info card for AURA's generative surfaces — owner-approved, served in-app at `/aura-info` |
| [`COMMUNITY_TODO.md`](COMMUNITY_TODO.md) · [`COMMUNITY_CHANGELOG.md`](COMMUNITY_CHANGELOG.md) | The public portal (`/individuals`): the `CP`n defect / `CD`n decision ledger and the surface's changelog |
| [`docs/FUNCTIONAL-MEASURES-ADDIE.md`](docs/FUNCTIONAL-MEASURES-ADDIE.md) | `PROPOSED` grip-strength and sit-to-stand plan for the public portal; nothing built, with `CD17`–`CD25` awaiting owner decisions |
| [`TRANSLATION-BRIEF.md`](TRANSLATION-BRIEF.md) | The `CD10` brief: what needs translating into ms/zh/ta, and why machine-translating clinical advice is dangerous |
| `docs/NEXUS-roster-walkthrough.pptx` · `docs/CLAUDE-DESIGN-PROMPTS.md` | The AHP walkthrough deck (v2.1.0 screens; the roster toolbar has since changed) and the prompt pack for restyling it |
| `docs/CD13-translation-review.xlsx` | The native-speaker review workbook for the 19 machine-translated strings |
| [`docs/NATIVE-APP-PORTING.md`](docs/NATIVE-APP-PORTING.md) | The workflow for shipping the staff app to the App Store and Google Play with Capacitor — phases, gates, the four seams that must change, and the owner's decisions. Not started |

**The audit history is in git, not in the tree.** The post-mortems, the QC audits, the two
handoffs, the go-live gate and the two executed runbooks were dated snapshots whose findings
were never edited once fixed; by v2.12 every one of them described a repository that no
longer existed, and they were removed on 2026-09-06. They are one command away, with their
last status banners, at the tag **`docs-archive-2026-09-06`** — for example:

```bash
git show docs-archive-2026-09-06:ROSTER_POSTMORTEM.md
```

Every finding id cited in `CHANGELOG.md` or in a source comment (`A`–`E`, `A-RC`, `M`, `D`,
`AU`/`AC`/`AN`) resolves there.

## Demo Mode and smoke testing

Demo Mode supplies a Marvel-themed mock team for stakeholder walkthroughs. It is not a separate backend, so use test accounts and avoid real personal or patient information. Do not submit a Feeds post merely to test the interface: a signed-in team member's demo-tagged post is still stored in that team's production feed collection.

Use these focused checks after a deployment:

1. **Roster coverage:** use two signed-in live test users. One requests cover from their shift; the addressed colleague should see the inline roster card and be able to accept or decline. This path is unavailable in Demo Mode.
2. **AURA data entry:** tell staff AURA, “I saw 145 patients in June.” It should show a `DATA_ENTRY` confirmation card. In Demo Mode, confirming should state that nothing was saved.
3. **Document export:** ask staff AURA to draft a one-page SOP and verify that `.docx` export completes.
4. **Smart Analysis:** in Demo Mode, generation should return the local Marvel-themed brief without calling the live analysis endpoint.

***

## Releases and current work

[`CHANGELOG.md`](CHANGELOG.md) is the authoritative release history. The current version is **v2.13.0**.

The next work is governed by the live ledgers:

- [`AURA-TODO.md`](AURA-TODO.md): staff AURA, public chat and intelligence findings. The engineering queue is currently empty; ten items require owner decisions.
- [`ROSTER_TODO.md`](ROSTER_TODO.md): deterministic roster queue and `Q`-series owner decisions. Current gaps include single-cell editing, half-day sessions, registration as an eligibility axis, supervision pairing and on-call semantics.
- [`COMMUNITY_TODO.md`](COMMUNITY_TODO.md): no unblocked engineering finding remains. App Check console work, translation review, resource-content freshness policy and the other owner decisions remain open.
- [`docs/FUNCTIONAL-MEASURES-ADDIE.md`](docs/FUNCTIONAL-MEASURES-ADDIE.md): a `PROPOSED` plan only. No implementation is authorised while its blocking decisions remain open.

***

## Project Lead and License

* **Muhammad Alif** : *Lead and Senior Clinical Exercise Physiologist*
* *Concept, Architecture and Development Phase (2026)*

**Copyright 2026 Muhammad Alif. All Rights Reserved.** This repository is provided for portfolio and demonstration purposes only. You may not copy, reproduce, distribute, publish, display, perform, modify, create derivative works, transmit, or in any way exploit any such content, nor may you distribute any part of this content over any network, sell or offer it for sale, or use such content to construct any kind of database.
