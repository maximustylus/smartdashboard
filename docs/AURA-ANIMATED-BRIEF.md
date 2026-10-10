# AURA, animated — design brief

**Status:** ideation, v0.1 · 2026-10-10 · owner: Muhammad Alif · drafted with Claude
**Sibling:** Motus, the voxel robot in [smartmotion](https://github.com/maximustylus/smartmotion) (`site/src/motus/motus.js`)
**Applies to:** the AURA panel in NEXUS (`src/components/AuraPulseBot.jsx`), launcher and open state

> This is a brief, not a spec. Every behaviour below is a proposal until the owner has seen it
> move. The prototype is where decisions get made; this document is where they get recorded.

---

## 1 · The idea in one line

**AURA is a pencil and a notebook, working hand in hand. AURA writes in pencil. Only you ink it.**

Not a robot that has a job. The job itself. Every one of AURA's four modes is an act of writing:
taking down a check-in, drafting a memo, entering a figure in a ledger, noting citations. The
metaphor is the product, not decoration on it.

### Why this and not a character

- **It solves clinical restraint structurally.** A robot at rest is a robot waiting to perform;
  nobody has to resist making it cute. A pencil at rest is a pencil.
- **Pencil is provisional by nature.** Erasable, grey, unofficial. That is exactly what the
  guardrails (`AURA-GUARDRAILS.md`) say AURA's output *is*: nothing is permanent until a person
  confirms it. The metaphor shows this without a sentence of explanation.
- **A clinician already carries one.** It is not a mascot. It is the ward's stationery, alive.

---

## 2 · The two characters, and the one rule between them

| | The pencil | The notebook |
|---|---|---|
| Role | Acts. Quick, fallible, erasable. | Holds. Patient, keeps everything. |
| Is | AURA trying | The record: ledger, provenance, audit trail |

**The rule: the notebook never moves unless the pencil does something to it.** One actor, one
stage. Two characters is twice the surface to get wrong; this rule is what keeps the pair from
looking busy.

---

## 3 · The mechanics that carry the guardrails

These are the places the animation *is* a guardrail made visible, not a flourish beside one.

| Guardrail | How it shows |
|---|---|
| Nothing writes without your click (`AC16`, `AU31`) | A proposal is **pencilled** into a ruled box. The pencil then stops dead and waits. Your approval turns the grey stroke to **ink**. Your refusal brings the **eraser** round: a rub, a few crumbs, a clean box. |
| Citations are model-recalled, unverified (P3) | A pencilled margin note with a **`?`** beside it. It becomes a tick only when a person verifies it, which the app cannot do, so in-app it stays `?` forever. |
| Provenance on every reply (Rule 12) | **The pencil signs the bottom of the page.** The footer is literally written, not rendered as grey text. |
| Certainty is legible (`AU30`, the whole P8.8 read) | **Line quality.** Sketchy, hatched, searching strokes when AURA is working from recall. One clean confident stroke when it is grounded. This is Motus's fidelity arc, translated: Motus sharpens with the eras; AURA sharpens with certainty. Everyone already reads that grammar. |
| A shortened rework is reported (`AU33`) | The new page is **visibly shorter, and the previous page shows through the paper.** You see what was dropped. The pencil writes the margin note, *"this is shorter"*. |
| Content is data, not instructions (Rule 15, Block E) | **One calm line through the smuggled instruction.** Then it carries on. A mascot flinches; a pencil strikes it. *"I read that. I struck it. Moving on."* The correct register for routine refusal. |
| Fail loud, never silent (P1) | An assumptions declaration is a **dog-ear** on the page. Present, not alarming. It stays until the gap is filled. |

---

## 4 · Behaviour table

| State | Pencil | Notebook |
|---|---|---|
| **Listening while you type** | **Taps, like a listener, never like a clock.** See §5. Leaves no mark. | Open, waiting. Does not react. |
| Listening, reply arriving (Coach) | Short marks as AURA *replies*. | Turns a fresh page at the start of a check-in. |
| Thinking | Rises, hovers, settles. No tapping. | — |
| Drafting (Assistant) | Quick lines fill the page, left to right. | Page fills. Export: a clean tear along the perforation. That is the `.docx`. |
| Proposing a write (Data Entry) | Pencils the figure into a ruled box, then stops and waits. No blink, no sway, until you click. | Holds the page up. |
| → approved | Grey stroke becomes ink. | Page stays. |
| → refused | Eraser end: rub, crumbs, clean box. | Page stays, blank where it was. |
| Research | Margin notes with `?` marks. | Flips to a page with wide margins. |
| Reworked document (`AU33`) | Writes the margin note. | New page shorter; previous page ghosts through. |
| Injection caught | One line through it. Carries on. | — |
| Cannot reach the model | **The lead snaps.** A small, honest tick. Then it sharpens: that is the retry (`verify-guardrail-turns.mjs` already retries once). | Waits. |
| Rest (after ~30s idle) | Lies in the gutter. | Closes gently. **No zzz.** 3am is a real shift. |
| Ghost Protocol (anonymous) | Writes lighter. | **Unbound**: a loose sheet, no cover, no name. Anonymous means there is no book to be found in. |
| Persona switch | Paint on the pencil tints to the persona's colour (`src/config/personas.js` `color`). | Cover tints to match. |

### What never happens

- No hop. No bounce. No grin, wink or surprise. Nothing in a wellbeing tool is a cause for bouncing.
- No random idle faces. The pencil has no face; the notebook has no face. Expression is in the gesture.
- No celebration. No confetti, no checkmark pop. Someone's patient may have died an hour ago.
- No sound.
- The pencil never writes while you are typing. It taps. Writing is after, in pencil, where you can see it.

---

## 5 · The tap: presence without surveillance

A pencil tapping can mean two opposite things. Fast, sharp, lifted high: *hurry up*. Slow, soft,
barely lifting: the visual *mm-hm*. The difference is entirely tempo and weight.

| Rule | Value | Why |
|---|---|---|
| Tempo | one tap every **4 to 5 s** | a calm breathing rate; nothing a person could mistake for a metronome |
| Weight | tip lifts **2 to 3 px** and settles | no bounce, no rotation, no sound |
| Mark | **none** | tapping is presence, not note-taking. The pencil is with you and is not recording you |
| As the message grows | tempo eases from 4 s toward **7 s** | someone at 400 characters about two arrests gets a *quieter* presence, not a busier one. From length and typing cadence only, never from reading the words |
| When keystrokes stop | **still within 2 s** | a tap into silence is a prompt. Presence while they speak, silence when they stop |
| First tap | after the first few words, **not** on the first keystroke | a pencil that starts on contact is waiting for you; one that joins a sentence in has been listening |
| Reduced motion | a faint opacity breath on the tip at the same rate | presence without movement |

This replaces an earlier rule, "the pencil never moves while the user types". Stillness solved the
surveillance problem but read as *absent*. The no-mark tap solves it and reads as *listening*.
The second is the product.

---

## 6 · Look

**Family with Motus by craft, not by species.** The same pixel treatment: voxel pencil, voxel
notebook, `image-rendering: pixelated` at small sizes sharpening to smooth at large. Motus is the
talk's guide; AURA is the ward's stationery that came alive. Siblings by the same hand.

**Palette:** the owner's language from `docs/CLAUDE-DESIGN-PROMPTS.md`. Pastel violet `#B9A7F2`,
sky `#B7DBF7`, mint `#9FE3C6` on the notebook cover, the pencil's paint and the page ruling.
Lead and ink are soft slate `#3B4256`, never black. The duo sits on the frosted-glass panel with
the dual extruded shadow beneath it. Motus keeps its fuchsia-to-lime; the resemblance is in the
voxels, not the colour.

**Launcher.** At 44 px a pencil and notebook is unreadable. Closed state: a small notebook with
the pencil tucked in its elastic strap, one recognisable silhouette. Open panel: the full 96 px
stage. Replaces the current `BrainCircuit` icon with `animate-pulse`.

**Phase mirror (open decision).** After a check-in, the notebook cover could tint one notch toward
the clinician's phase (`PHASE_CONFIG`: emerald, amber, orange, red, all at pastel saturation). An
acknowledgement, not a label. If adopted: the check-in moment only, never the persistent launcher.
Being colour-coded ILL by your employer's app all day is a different thing. **Owner's call.**

---

## 7 · Production: Blender via MCP

The owner's instinct is to model and animate the pair in Blender, driven through an MCP server
from Claude. That is the right tool for the asset and the right place for the craft to live.

### Pipeline

```
Blender (via MCP)                       NEXUS
─────────────────                       ─────
model pencil + notebook  ──►  glTF  ──►  three.js, lazy-loaded chunk   (simple path)
rig: tap, write, erase,                  OR
     strike, snap, rest  ──►  sprite sheets (PNG, 8 angles × states)  (light path)
voxel / pixel material
```

- **Blender owns the asset.** One source of truth for the model, the rig and every named action.
  Each state in §4 is a named Blender action (`tap`, `write`, `ink`, `erase`, `strike`, `snap`,
  `rest`, `unbind`). The MCP is how Claude iterates on them with the owner watching the viewport.
- **Export is a decision, not a default.** NEXUS already warns about chunk size and runs on ward
  tablets. Motus ships three.js + gsap for one page; AURA would ship them into a PWA.
  - *Simple:* glTF, three.js lazy-loaded only when the panel opens. Proven, one codebase, measure.
  - *Light:* bake the actions to sprite sheets at build time; NEXUS ships ~50 KB of PNG and CSS.
    Loses live 3D sway unless angles are baked.
  - **Lean:** simple first, measure on a real tablet, bake only if it hurts.
- **State drives it, not the reverse.** The component (`AuraPulseBot.jsx`) already holds every
  input the animation needs: `mode`, `phase`, `loading`, `pendingLog`, `isAnonymous`,
  `selectedPersona`, input length and typing cadence. The animation reads state; it never owns any.
- **Testable the way the panel is tested.** Assert the state attribute, not the pixels
  (`AuraPulseBot.au33.test.jsx` is the pattern).

### What the MCP needs to do, minimum

1. Create and name actions on the rig; set keyframes; scrub to a frame and render a still so the
   owner can judge a pose from chat.
2. Export glTF with animations, and render sprite frames at fixed angles.
3. Nothing else. Modelling by hand in Blender is faster than modelling by chat; the MCP's value
   is iteration on *motion* with the viewport open.

> Which Blender MCP server, and whether it does all three cleanly, is **not yet checked** (gap 2).

---

## 8 · Open decisions for the owner

1. **Phase mirror:** yes, no, or check-in only?
2. **Does the pencil write the check-in down on screen** (honest: in pencil, after you finish
   speaking) **or only its replies?** Lean: honest.
3. **Pastel palette or Motus's gradient as a family mark?** Lean: pastel; the resemblance is the
   voxels.
4. **Launcher silhouette:** notebook-with-pencil-in-strap. Agree?
5. **Tap tempo:** 4 s, 5 s or 7 s at rest. The prototype makes this switchable so it is felt, not read.

---

## 9 · Next step

A prototype canvas with every state in §4 switchable, the tap tempo curve adjustable, and
reduced-motion toggled, so the owner judges the strikethrough and the eraser rather than a
description of them. Then Blender.

---

## Assumptions, gaps and unverified items

*Required by P1. In the body, not a footnote.*

1. **Nothing here has moved yet.** Every behaviour is a proposal. Tempos, weights and durations
   are starting values to be felt in the prototype, not measurements.
2. **The Blender MCP is unverified.** Which server, what it exposes, whether it exports glTF with
   named actions and renders stills from chat: not yet checked. §7 describes the pipeline that is
   wanted, not one that is confirmed to exist.
3. **three.js cost on ward tablets is unmeasured.** The "simple first" lean is a guess at the
   order of work, not a performance claim.
4. **The tap's effect on a person is untested.** "Reads as listening" is the design intent. Whether
   a clinician mid-confession experiences it that way needs a person to try it. The tempo curve is
   mechanical (length and cadence) precisely so it never depends on reading the words.
5. **No accessibility review.** Every state must have a text or badge equivalent so a colourblind
   or screen-reader user loses nothing; that mapping is not yet written.
6. **The phase mirror is a people decision**, deferred to the owner, and would need the same
   scrutiny `AU32` got: is reflecting someone's state back at them helpful or labelling?
