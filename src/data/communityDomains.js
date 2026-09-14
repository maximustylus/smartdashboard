/**
 * ==============================================================================
 * COMMUNITY DOMAINS — the ordered step list for the public assessment
 * ==============================================================================
 *
 * Extracted from `AuraChat.jsx` so it can be imported without the component.
 * `AuraChat` reaches `src/firebase.js` through `telemetry`, and that module calls
 * `getMessaging(app)` at import time, which throws outside a real browser. The step
 * list was therefore untestable while it lived there, and the one invariant that
 * most needed a test — that every key here is a domain the Cloud Function will
 * accept — could not be written at all. It is now
 * `AuraChat.domainParity.test.jsx`, and it found the drift live.
 *
 * Same reason `clinicalParse.js` and `screeningChips.js` were pulled out before
 * this: a value the whole assessment depends on should not be hostage to a
 * component's import graph.
 *
 * ⚠️ ADDING A STEP IS A TWO-DEPLOY CHANGE. The server's allowlist lives in
 *    `functions/communityAck.js` (`COMMUNITY_DOMAINS`), which is CommonJS behind
 *    its own `package.json` and its own deploy, so it cannot import this file. A
 *    key added here and not there is rejected at the endpoint with "Unknown
 *    assessment domain." The parity test is the only thing holding that contract.
 */

import { isSixtyPlusPerson, exactAge } from '../utils/clinicalFlags';
import { sitToStandProtocolForAge } from '../utils/functionalMeasures';
import { numberIn } from '../utils/measurementAnswers';

/**
 * Whether a published reference exists for this person at all. Both sources start
 * at 20, so under that there is nothing to compare against and the honest thing is
 * not to ask. `sitToStandProtocolForAge` already encodes that floor, so asking it
 * keeps one definition rather than a second copy of the same number.
 */
const hasStrengthReference = (data) => sitToStandProtocolForAge(exactAge(data)) !== null;

/** Whether either measurement actually produced a figure worth attributing. */
const gaveAMeasurement = (data) =>
    numberIn(data?.grip_kg) !== null || numberIn(data?.sit_to_stand) !== null;

// ─── DOMAIN CONFIGURATION ─────────────────────────────────────────────────────
// Each step declares its screening domain for badge display and progress colouring.
/*
  ⚠️ BADGES ARE LAY LANGUAGE, ON PURPOSE. They used to read "ACSM PAVS · Q1 of
     2", "SDOH · Psychological", "Clinical Safety Screen" — instrument acronyms
     shown to the public mid-question, which nobody outside a health system
     reads. The instrument citations live on the PDF's governance page, where
     they belong; here the person answering sees plain words. The word
     "clinical" is banned from every public-facing surface.
*/
export const DOMAIN_CONFIG = [
  /*
    ⚠️ THIS IS THE ORDER QUESTIONS ARE ASKED IN, AND IT IS NOW SAFE TO CHANGE.
       It was not. This list used to double as the index into four language
       dictionaries, so moving a step here silently reassigned every prompt after
       it — the `CP26` failure. `COPY_ORDER` in `communityChatCopy.js` now holds
       that binding by NAME, so the two orders are independent: this one is the
       conversation, that one is the order the copy happens to be written in.

       The old "APPENDED, NOT INSERTED" warning that lived here has gone with it.
       It was correct when written and would now be actively wrong: it told the
       next person that `falls` and `healthier_sg` must stay at the end, which is
       why they were asked AFTER "do you have a previous NEXUS record", which is
       the last question in any sensible reading.
  */

  // ── Physical activity first ────────────────────────────────────────────────
  // The Physical Activity Vital Sign is the measure this portal exists to take,
  // and it is asked before anything personal for a plain reason: somebody who
  // abandons the assessment after three questions has still given the thing it is
  // for. Front-loading demographics would collect a profile and no vital sign.
  { key: 'pavs_days',    badge: '🏃 Physical Activity · Q1 of 2', group: 'pavs'   },
  { key: 'pavs_mins',    badge: '⏱️ Physical Activity · Q2 of 2', group: 'pavs'   },
  { key: 'strength',     badge: '💪 Strength Training',           group: 'pavs'   },

  /*
    ── Then who this person is, because the pathway splits here ───────────────

    ⚠️ SEX AND AGE ARE ASKED AT POSITION 4 AND 5 SPECIFICALLY. They used to sit at
       position 9, and `falls` — the one question that exists for the 60+ cohort —
       was gated on an answer given four questions later than the gate needed it.
       That worked only because `falls` was appended at the very end.

       Everything downstream of here can now branch on age: the falls screen, the
       sit-to-stand protocol (one minute under 60, thirty seconds from 60), and
       which services the result page offers. A branch cannot read an answer that
       has not been given yet, so this position is load-bearing, not cosmetic.
  */
  { key: 'demographics', badge: '👤 About You',                  group: 'admin'  },
  {
    key: 'age_years',    badge: '🎂 Your Age',                   group: 'admin',
    /*
      ⚠️ A YEAR, NOT A BAND, AND THE DIFFERENCE IS THE WHOLE FEATURE. The strength
         references are cut in FIVE-YEAR bands from 20 to 100+, so "60+" spans
         eight rows of the table and cannot be narrowed afterwards. `parseAgeYears`
         returns `null` for a range rather than guessing at one, and everything
         that needs a year says "we were not told" instead of comparing somebody
         against the wrong row. See `CD25`.
    */
  },

  // ── Safety, then the social determinants ──────────────────────────────────
  { key: 'medical',      badge: '🩺 Health & Safety Check',       group: 'safety' },
  { key: 'barriers',     badge: '🔑 Cost & Access',               group: 'sdoh'   },
  { key: 'social',       badge: '🤝 Social Support',              group: 'sdoh'   },
  { key: 'food_insecurity', badge: '🥗 Food Security',            group: 'sdoh'   },
  { key: 'wellbeing',    badge: '🧠 Mood & Wellbeing',            group: 'sdoh'   },

  {
    key: 'falls', badge: '\u{1F9B5} Falls & Function (60+)', group: 'safety',
    /**
     * 60+ only. A Regional Health System reviewer's point: for somebody being
     * considered for an Active Ageing Centre, falls history matters more than a
     * weekly minutes figure — PAVS alone can route a 75-year-old to "150 minutes a
     * week" without ever asking whether they have fallen. Asking everybody would be
     * noise, and every unnecessary question costs completions in the population
     * least likely to finish.
     */
    // ⚠️ `isSixtyPlusPerson`, WHICH READS THE WHOLE ANSWER SET. This gate has now
    //    broken twice for the same cohort in two different ways. First it was
    //    `/60\s*\+/` over the raw answer, which only matched the CHIP text, so
    //    anybody who typed "72" was never asked (`CP26`). Then age moved out of
    //    `demographics` into its own question, which would have left the gate
    //    reading "Female" and finding no age at all. It now asks the one helper
    //    that knows where an age can live.
    when: (data) => isSixtyPlusPerson(data),
  },

  // ── Where and who, for mapping and population reporting ───────────────────
  { key: 'ethnicity',    badge: '🌍 Cultural Background',        group: 'admin'  },
  { key: 'housing_type', badge: '🏢 Housing Environment',        group: 'admin'  },
  { key: 'postal_code',  badge: '📍 Resource Mapping',           group: 'admin'  },
  {
    key: 'healthier_sg', badge: '\u{1FA7A} Healthier SG', group: 'admin',
    // Asked of everyone. The portal references Healthier SG throughout and cannot
    // currently tell whether the person is enrolled — which changes almost every
    // recommendation it makes.
  },

  /*
    ── The strength measurements, immediately before record linkage ───────────

    ⚠️ OPTIONAL, AND THEY MUST STAY OPTIONAL. `CD20` settled that neither of these
       feeds `calculateRiskScore`, following the `falls` precedent: charging a
       deficit for not owning a dynamometer penalises exactly the cohort this
       portal exists for. Skipping both changes nothing about the result.

    ⚠️ ASKED ONLY WHERE A REFERENCE EXISTS. Both sources start at 20. Asking an
       18-year-old for a number nothing can be compared against collects a figure
       we would then have to explain away, and every unnecessary question costs
       completions.
  */
  {
    key: 'grip_kg', badge: '🤝 Grip Strength', group: 'pavs',
    when: hasStrengthReference,
  },
  {
    key: 'sit_to_stand', badge: '🪑 Standing Up From a Chair', group: 'pavs',
    /*
      The prompt itself changes with age: one minute under 60, thirty seconds from
      60, per the two published sources. That choice lives in the prompt function
      in `communityChatCopy.js` and in `measurementAnswers.js`, and both read it
      from `sitToStandProtocolForAge` so there is one rule.
    */
    when: hasStrengthReference,
  },
  {
    key: 'measure_setting', badge: '📋 Where It Was Measured', group: 'admin',
    /*
      ⚠️ ASKED ONLY WHEN THERE IS SOMETHING TO ATTRIBUTE. A resident who skipped
         both measurements must not then be asked where they were taken. It reads
         as the portal not listening, and it is the question most likely to be the
         one somebody abandons on, right before record linkage.
    */
    when: gaveAMeasurement,
  },

  // ── And last, the record linkage ──────────────────────────────────────────
  // Genuinely last: it is the only question whose answer is an identifier rather
  // than an answer, and somebody who abandons here has already given everything
  // the assessment needs.
  { key: 'previous_id',  badge: '🔗 NEXUS Record Linkage',       group: 'admin'  },
];
