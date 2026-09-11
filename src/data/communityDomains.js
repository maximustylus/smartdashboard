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

import { isSixtyPlus } from '../utils/clinicalFlags';

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
  { key: 'pavs_days',    badge: '🏃 Physical Activity · Q1 of 2', group: 'pavs'   }, // 0
  { key: 'pavs_mins',    badge: '⏱️ Physical Activity · Q2 of 2', group: 'pavs'   }, // 1
  { key: 'strength',     badge: '💪 Strength Training',           group: 'pavs'   }, // 2
  { key: 'medical',      badge: '🩺 Health & Safety Check',       group: 'safety' }, // 3
  { key: 'barriers',     badge: '🔑 Cost & Access',               group: 'sdoh'   }, // 4
  { key: 'social',       badge: '🤝 Social Support',              group: 'sdoh'   }, // 5
  { key: 'food_insecurity', badge: '🥗 Food Security',            group: 'sdoh'   }, // 6
  { key: 'wellbeing',    badge: '🧠 Mood & Wellbeing',            group: 'sdoh'   }, // 7
  { key: 'demographics', badge: '👤 Your Profile',               group: 'admin'    }, // 8
  { key: 'ethnicity',    badge: '🌍 Cultural Background',        group: 'admin'    }, // 9 
  { key: 'housing_type', badge: '🏢 Housing Environment',        group: 'admin'    }, // 10 
  { key: 'postal_code',  badge: '📍 Resource Mapping',           group: 'admin'    }, // 11
  { key: 'previous_id',  badge: '🔗 NEXUS Record Linkage',       group: 'admin'    }, // 12

  /*
    ⚠️ APPENDED, NOT INSERTED. `prompts`, `quickReplies` and `reflections` are
    parallel arrays in four language dictionaries. Inserting a step in the middle
    means renumbering twelve arrays by hand, which is exactly how a question goes
    missing in one language and nobody notices for months. New steps go on the end
    and `when` decides whether they are asked.

    Both are gated by `src/utils/chatSteps.js`: a step with no prompt in the active
    language is SKIPPED, so these appear in English only until the other three are
    translated (`CD10`). A question somebody cannot read produces a WRONG answer,
    not a missing one — it still feeds the risk score.
  */
  {
    key: 'falls', badge: '\u{1F9B5} Falls & Function (60+)', group: 'safety', // 13
    /**
     * 60+ only. A Regional Health System reviewer's point: for somebody being
     * considered for an Active Ageing Centre, falls history matters more than a
     * weekly minutes figure — PAVS alone can route a 75-year-old to "150 minutes a
     * week" without ever asking whether they have fallen. Asking everybody would be
     * noise, and every unnecessary question costs completions in the population
     * least likely to finish.
     */
    // ⚠️ `isSixtyPlus`, NOT a substring test for "60+". The gate used to be
    //    `/60\s*\+/` over the raw answer, which only ever matched the CHIP text —
    //    somebody who typed "72" or "I am 65 years old" was silently never asked.
    //    See `parseAgeBand` in `clinicalFlags.js`; `CP26`.
    when: (data) => isSixtyPlus(data?.demographics),
  },
  {
    key: 'healthier_sg', badge: '\u{1FA7A} Healthier SG', group: 'admin', // 14
    // Asked of everyone. The portal references Healthier SG throughout and cannot
    // currently tell whether the person is enrolled — which changes almost every
    // recommendation it makes.
  },
];
