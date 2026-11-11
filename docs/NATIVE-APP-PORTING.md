# Porting NEXUS from a PWA to the App Store and Google Play

**Written 2026-09-06 against v2.12.3.** A workflow, not a promise: nothing below has
been started. Each phase ends with a gate that says what must be true before the next
one begins, and the last section lists the decisions only the owner can make. Read
[`README.md`](../README.md) *What NEXUS actually is* first if you are new — the roster
engine and the AURA assistant need different assurance, and the store reviewers will
ask about the second.

---

## 0 · The decision this document assumes

**Wrap the existing web app with Capacitor.** NEXUS is a Vite/React bundle over a
Firebase backend, signs people in with email and password, and touches no native
hardware. Capacitor ships the unchanged `dist/` inside a native WebView shell and
produces an Xcode project and an Android Studio project that the stores accept. A
React Native rewrite would mean rewriting every component for no gain; a Trusted Web
Activity covers Android only.

**What ports:** the staff app — sign-in, dashboard, feeds, pulse, roster, AURA, profile,
the admin surfaces. **What stays a web URL:** the public screening at `/individuals/*`
(reached by QR code; the public must never be routed through a store) and the chatbot
info card at `/aura-info` (a public compliance page). The web app remains the
**canonical surface** throughout; the store apps are a second channel onto the same
backend, and a push to `main` still deploys the web app on its own.

**The four things that cannot be wrapped as they are**, each with its phase below:

| | Today | In a WebView | Phase |
|---|---|---|---|
| Push notifications | A web service worker, `public/firebase-messaging-sw.js`, registered at [`src/firebase.js:83`](../src/firebase.js) | No service worker exists; the 09:00 nudge and coverage alerts silently stop | 2.2 |
| File exports (roster PDF and Excel, AURA `.docx`, grant deadlines) | `URL.createObjectURL` + an anchor `download` attribute, five sites | Does nothing on iOS; unreliable on Android | 2.3 |
| Release cadence | Merge to `main` = live in minutes | Apple review, typically one to three days | 4, 5 |
| Abuse control | App Check with a web reCAPTCHA key (`VITE_APPCHECK_SITE_KEY`), observed not enforced | Native attestation is a different provider on each platform | 2.5 |

---

## 1 · Prerequisites

**Accounts and money**

- Apple Developer Program — paid, yearly. Enrolment for an organisation needs a D-U-N-S
  number and takes days; start it first. Decide whether the developer account is the
  hospital's, the department's, or the owner's: it is what the App Store shows as the
  seller, and moving an app between accounts later is painful.
- Google Play Console — one-off fee. Same ownership question.
- A Firebase project you can add native apps to: `idc-app-e0c59` already hosts the
  web app; the iOS and Android apps are added to the same project so they share Auth,
  Firestore and Functions. No second project.

**Machines**

- iOS builds need a Mac with the current Xcode; Android builds need Android Studio on
  any OS. Both can live on the owner's Mac.
- ⚠️ **Do the native work in a clone outside iCloud.** This repository's tests and lint
  already cannot run inside `~/Documents` because iCloud evicts `node_modules` (README,
  *Working on the repository*). Xcode's `DerivedData` and Gradle's caches are worse
  by an order of magnitude. Clone to `~/dev/nexus` or similar and never open the
  iCloud copy in Xcode.

**Team**

- One person with a Mac who can be the release engineer for both stores.
- The owner, for every decision in §8 and for the store listings, which are outward-
  facing statements about a clinical-adjacent tool.

---

## 2 · Phase 1 — scaffold, and prove the unchanged bundle runs

**Goal:** the current `dist/` runs on an iPhone simulator and an Android emulator with
no source change. This phase is a day, and it tells you what else breaks.

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npx cap init "NEXUS" sg.northside.nexus --web-dir dist     # bundle id: owner's decision, §8
npm run build
npx cap add ios
npx cap add android
npx cap sync
npx cap open ios        # Xcode
npx cap open android    # Android Studio
```

**Repository layout after this.** `ios/` and `android/` are committed (they carry
signing config, icons, entitlements and native plugin wiring); their build outputs
are ignored. `capacitor.config.ts` sits at the root beside `firebase.json`. Add to
`.gitignore`: `ios/App/build`, `ios/App/Pods`, `android/.gradle`, `android/app/build`,
`android/local.properties`, and `*.keystore` (see 5.1).

**Version is still `package.json`.** `src/version.js` is the one place the app learns
its version, and `src/version.test.js` fails the build on a hand-typed literal. The
native projects have their own `CFBundleShortVersionString` and `versionName`; add a
script, run by `npm version`, that copies `package.json` `version` into both, and a
monotonic build number (a date stamp is enough) into `CFBundleVersion` and
`versionCode`. Never hand-edit them — that is the drift `src/version.js` exists to end.

**Gate 1.** The app opens, signs in with a real account, renders the dashboard, the
roster and the pulse board on both simulators. Write down everything that is wrong;
that list is the input to Phase 2 and it will be longer than the four items above.

---

## 3 · Phase 2 — the platform seams

One rule for the whole phase: **the web build keeps working exactly as it does now.**
Every native behaviour sits behind a single `isNative` branch so `npm run build` for
Firebase Hosting is untouched and the existing 3,600 tests still describe the web app.

### 2.1 One place to ask "where am I running?"

`src/utils/platform.js`, ten lines: `isNative()` from `Capacitor.isNativePlatform()`,
`platform()` returning `'web' | 'ios' | 'android'`. Nothing else in `src/` imports
Capacitor directly; everything asks this module. That is the same discipline as
`src/utils/teamPaths.js` for Firestore paths — one seam, greppable.

### 2.2 Push notifications

**What exists.** The web path registers `firebase-messaging-sw.js`, obtains an FCM
token with `getToken`, stores it as `fcmToken` on `users/{uid}`, and the Cloud Function
that sends the 09:00 nudge and the coverage alerts sends to that token with a
`data.target_tab` payload. `App.jsx` listens with `onMessage` while the app is open.

**What changes.**

1. Install `@capacitor/push-notifications`. On iOS, create an APNs key in the Apple
   developer account and upload it to the Firebase project (Cloud Messaging settings);
   on Android, add `google-services.json` from the Firebase console to
   `android/app/`. Both are secrets-adjacent — the APNs key goes nowhere near the repo.
2. In the token registration at `src/firebase.js:83`, branch on `isNative()`: native
   asks the plugin for permission and a token, web keeps the service worker path.
   **The document field stays `fcmToken`** — the Cloud Function does not change, and
   on iOS the plugin hands you an FCM token, not a raw APNs one, so the server cannot
   tell the platforms apart and does not need to.
3. Notification taps: the service worker's `notificationclick` handler is replaced by
   the plugin's `pushNotificationActionPerformed` listener, which reads the same
   `target_tab` and calls the same view switch `App.jsx` already exposes.
4. **Do not register the service worker in native.** The `navigator.serviceWorker`
   branch must be skipped when `isNative()`; a WebView will either refuse it or
   register a worker nobody delivers to.

**Verify:** a real device, not a simulator — iOS simulators do not receive APNs. Send
the nudge from the Firebase console to one token; tap it; the app opens on Pulse.

### 2.3 File exports

**What exists.** Five sites build a `Blob`, call `URL.createObjectURL`, and click an
anchor with a `download` attribute:

| Site | File |
|---|---|
| `src/utils/rosterXlsx.js:350` | `AURA_Roster_Calendar.xlsx` |
| `src/utils/rosterPdf.js:341` | `AURA_Roster_Calendar.pdf` |
| `src/utils/auraEngine.js:1411` | the roster `.csv` and `.ics` |
| `src/components/AuraPulseBot.jsx:702` | `AURA_Grant_Deadlines_….docx` |
| `src/components/AuraPulseBot.jsx:821` | `AURA_Document_….docx` |

**What changes.** One helper, `src/utils/saveFile.js` — `saveFile(blob, filename)`.
On web it does exactly what the five sites do today. On native it writes the blob to
the app's cache directory with `@capacitor/filesystem` and opens the OS share sheet
with `@capacitor/share`, which is how a clinician gets the roster into Mail, Files or
Teams on a phone. The five sites call the helper; the `link.download` lines go.

**Why the share sheet and not a Downloads folder:** iOS has no user-visible downloads
directory for a WebView app, and "where did my roster go" is a support ticket. The
share sheet puts the choice in front of the person, on both platforms.

**Verify:** each of the five exports, on each platform, opens in the target app with
its content intact. The existing tests for the exporters (`rosterXlsx.test.js`,
`rosterPdf.test.js`) keep asserting the file contents; add a source-pinned test that
no `link.download =` survives outside `saveFile.js`.

### 2.4 Sign-in and sessions

Email and password (`signInWithEmailAndPassword`, and `createUserWithEmailAndPassword`
on the welcome screen) work in a WebView unchanged. Two things to check rather than
change:

- **Authorized domains.** Capacitor serves the bundle from `capacitor://localhost` on
  iOS and `http://localhost` on Android. Firebase Auth must list those origins under
  *Authorized domains* or sign-in is refused with a domain error that reads like a
  password problem.
- **Persistence.** Firebase Auth's default IndexedDB persistence works in both
  WebViews; a signed-in clinician stays signed in across launches, which is the
  expectation for a phone app. `AU29` (sign-out clears the AURA session) is client
  logic and carries over.

If Google or Microsoft sign-in is ever added, that is the point a native auth plugin
is needed — redirect flows do not complete inside a WebView. Not before.

### 2.5 App Check and the rate limits

The web app initialises App Check only when `VITE_APPCHECK_SITE_KEY` is set (a
reCAPTCHA v3 key), and `functions/index.js` **observes** tokens until
`ENFORCE_APP_CHECK=true`. `functions/rateLimit.js` already gives attested callers the
higher ceiling. On native, the provider is **App Attest** on iOS and **Play Integrity**
on Android, configured per app in the Firebase console and initialised through the
Capacitor Firebase App Check plugin behind `isNative()`. Same observed-then-enforced
rollout the web path documents at `src/firebase.js:39`: watch the attested share of
traffic in the function logs, then flip the env var. Do not enforce on the web and the
native apps on the same day; a bad native attestation config locks out every phone.

### 2.6 Origins, CORS and Storage

`cors.json` governs the Storage bucket. Add the two Capacitor origins to its allowed
list and re-apply it, or every feed image upload from a phone fails with an opaque
error. Cloud Functions are called through the Firebase callable SDK and need nothing.

### 2.7 The screen itself

- `ResponsiveLayout.jsx` uses `dvh` maths for the mobile shell; in a WebView the
  status bar and the iPhone home indicator overlap the viewport unless the
  `viewport-fit=cover` meta and `env(safe-area-inset-*)` padding are added to the
  shell. Small, but it is the first thing a reviewer sees.
- `manifest.json` pins `orientation: portrait`; set the same in both native projects.
- The PWA install prompt and "Add to Home Screen" hints, if any, are hidden when
  `isNative()`.
- The app icon: the native projects need full icon sets. Generate them from the
  existing `public/nexus-n-light-icon.png` / `nexus-n-dark-icon.png` with
  `@capacitor/assets`; do not hand-draw sizes.

### 2.8 Deep links

Not required for launch. `/individuals` stays on the web. If a coverage-alert push
should open the roster directly, `target_tab` already does that in-app. Universal
links and App Links (the `smartdashboard.web.app` URL opening the native app when
installed) are a later refinement and need a hosted association file on Firebase
Hosting; note it in §8.

**Gate 2.** All four seams work on a real iPhone and a real Android phone; the web
build is byte-for-byte unaffected except for the `isNative()` branches;
`npm test` and `npm run lint` pass with the new tests in 2.3; the README's demo
walkthrough (*Interactive Demo Mode*) passes on both phones.

---

## 4 · Phase 3 — quality gates specific to a native shell

- **The bundle test still runs on `dist/`.** `an14.bundle.test.js` greps the built
  bundle for colleagues' names and addresses. The native shell embeds the same
  `dist/`, so the same guarantee holds — but only if `npx cap sync` is run *after*
  `npm run build` and *after* the test. Put the order in a script, not in a memory.
- **Offline.** A WebView with no network shows a blank page unless the bundle is local
  — which with Capacitor it is. Firestore's offline cache then serves the last roster
  read. Test airplane mode on both platforms and write down what the pulse board and
  the feed show; "loading forever" is a rejection reason on iOS.
- **The two-user roster test** in the README needs two signed-in devices; a phone and
  the web app count.
- **Device matrix, minimum:** the oldest iPhone the department actually carries, one
  current iPhone, one Samsung and one Pixel. Ask the members, do not guess — v2.4's
  "NN8" episode was a department vocabulary nobody had asked about.

---

## 5 · Phase 4 — internal distribution, then review readiness

### 4.1 Signing

- iOS: an App Store distribution certificate and a provisioning profile, managed by
  Xcode's automatic signing under the developer account. Nothing to commit.
- Android: **generate the upload keystore once and back it up somewhere that is not
  this repository and not iCloud-only.** Losing it means never updating the app under
  the same listing. Play App Signing holds the final key; you hold the upload key.

### 4.2 Internal tracks

- **TestFlight** (iOS): internal testers are the department; no review for internal
  builds. This is where the Apple guideline 4.2 argument is tested privately.
- **Play internal testing** (Android): same idea, same audience.

Run the department on the internal builds for at least one roster cycle — one
weekly release and one coverage request — before submitting to either store.

### 4.3 What the reviewers will ask, and the answers this repository already has

| Reviewer concern | Where the answer is | What is still missing |
|---|---|---|
| **Apple 4.2 — minimum functionality.** "Is this just a website?" | Native push, native file sharing, offline roster reads, a home-screen presence with a real login | Make sure the review notes *say* so, and give the reviewer a demo account on a demo team — the sandbox is not enough, they need to see Live Mode |
| **Privacy policy URL** — both stores | `docs/AURA-CHATBOT-INFO-CARD.md` §4 and `SECURITY.md` say what is collected and by whom | A single public page titled *Privacy Policy* that links to both; the stores want one URL |
| **Data safety / App Privacy declaration** | The info card's §4 per-surface table: names, titles, workload, band; Gemini via Google; 24-month retention on the public record | Transcribe it into each store's form; declare Google as the third-party processor |
| **Account deletion** — Apple requires it in-app if the app offers account creation, and `WelcomeScreen.jsx` does | Nothing | A delete-my-account path: a Cloud Function that removes the auth user and the member document, with the lead notified. This is new work and an owner decision (§8) |
| **Health claims** | The README and the info card are explicit that NEXUS is not a clinical system and the screening is not diagnosis | Keep every store description sentence consistent with that; a reviewer reads the listing, not the repo |
| **AI disclosure** | The info card exists precisely for this | Link it from the listing |
| **Login for review** | — | A reviewer account on a demo department that is not real staff data |

**Gate 4.** Internal builds used for a full cycle; the privacy page is live; the
account-deletion path exists; the review notes are written and the owner has read them.

---

## 6 · Phase 5 — the release process, from then on

**The web app is unchanged:** a push to `main` still runs `deploy.yml` and is live in
minutes. The native shells are a second, slower channel with their own rules.

1. **Every release still starts with `version-steward`**: classify, bump
   `package.json`, align CHANGELOG and README, tag. The native version sync script
   from Phase 1 carries the number into both projects in the same commit.
2. **Native builds are manual at first.** `npm run build && npm test && npx cap sync`,
   then archive in Xcode and build a bundle in Android Studio, then upload. Automate
   with a GitHub Actions job (macOS runner for iOS, with the signing secrets in the
   repository's secret store) only once the manual process has worked three times.
3. **Two kinds of change.** A change that touches only `src/` can reach phones
   without a store review through a live-update service (Capacitor's own, or an
   open-source equivalent): the shell downloads the new `dist/` on launch. A change
   that touches `ios/`, `android/`, a plugin, or a permission always goes through
   review. Decide in §8 whether live updates are wanted; without them, expect the
   phones to be one to three days behind the web app after every fix, and say so in
   the release notes.
4. **Rollback.** The web app rolls back by redeploying the previous tag. A store app
   cannot be rolled back; you submit the previous build again and wait. That
   asymmetry is the strongest argument for keeping the web app canonical and for
   running every fix through the internal track first.

---

## 7 · What does not change, so nobody rebuilds it

- `firestore.rules`, the emulator suite, the Cloud Functions, the roster engine, the
  wizard, the sandbox, the AURA prompts and guardrails, the info card's content.
- The team-per-department data model; a phone is just another client.
- The ledgers. If native work opens findings, open a new id series per `IDS.md` rule 2
  and say so in the same commit; do not reuse `AU`, `CP` or `D`.

---

## 8 · Decisions only the owner can make

| # | Decision | Why it cannot be made by the engineer |
|---|---|---|
| 1 | **Store apps at all, or Play TWA plus iOS home-screen install?** iOS 16.4+ delivers web push to a home-screen PWA; a TWA is the live site in a Chrome container with no code change. Both keep push-to-main as the only deploy. | Whether NEXUS needs to be found by name in the App Store, or must run on MDM-managed devices that only allow store apps, is an institutional question |
| 2 | **Whose developer accounts** — hospital, department, or personal | Ownership of the listing, the seller name shown to the public, and who can be locked out |
| 3 | **Bundle identifier** (`sg.northside.nexus` is a placeholder) | Permanent; tied to the accounts in 2 |
| 4 | **Account deletion path** — required by Apple, currently absent | Removing a clinician's auth user and membership is a data decision with a lead in the loop |
| 5 | **Live updates** for `src/`-only changes, or accept review latency | Trade-off between speed of fixes and a third-party update service seeing the bundle |
| 6 | **The privacy policy page** — content and where it lives | An outward-facing statement about clinical-adjacent data; the info card is the draft |
| 7 | **Universal links** for `smartdashboard.web.app` | Cosmetic until a coverage alert needs to open the native app from an email |

---

## 9 · Time, honestly

Phase 1 is a day. Phase 2 is one to two weeks for one engineer who has not used
Capacitor before, most of it in 2.2 and 2.3 and in testing on real devices. Phase 4's
first Apple review is the unpredictable part: budget for one rejection on 4.2 and one
round of privacy-form corrections. The account-deletion path in 4.3 is the one piece
of genuinely new product work and should be scoped on its own.

*Sources for every code fact above: `src/firebase.js` (service worker, App Check),
the five `link.download` sites listed in 2.3, `src/components/WelcomeScreen.jsx`
(account creation), `functions/index.js` (`ENFORCE_APP_CHECK`),
`.github/workflows/deploy.yml`, `public/manifest.json`, `cors.json`. Checked
2026-09-06 at v2.12.3.*
