import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { recordTelemetry } from '../utils/telemetry';
import { calculateRiskScore } from '../utils/scoring';
import { ChevronLeft, Send, Sun, Moon, ExternalLink, CheckCircle, BrainCircuit, Info as InfoIcon } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { readTheme, writeTheme } from '../utils/theme';

import { nextActiveStep, activeStepCount, activeStepPosition } from '../utils/chatSteps';
// The word-level matchers moved with the parser into `clinicalParse.js` (`AC5`);
// what stays is the one gate this component evaluates itself.
import { readLanguage, applyDocumentLanguage } from '../utils/language';
import { getSessionId, saveProgress, loadProgress, clearProgress } from '../utils/assessmentSession';
// `AC5` — the parser lives in its own tested module now; see its header.
import { parseClinicalData } from '../utils/clinicalParse';
import { selectCTA } from '../utils/ctaRouting';

// ── Cloud Function — same pattern as AuraPulseBot.jsx ────────────────────────
// Gemini API key is secured in Firebase Cloud Functions (never client-side)
const functions = getFunctions(undefined, 'us-central1');
// The community pathway's OWN endpoint. It was `chatWithAura`, which is the staff
// assistant's callable — see the note at the call site.
const communityAck = httpsCallable(functions, 'communityAck');

// ── Well Well persona system prompt for community health triage ───────────────
// Used as the `prompt` param passed to the Cloud Function, same as personas
// in AuraPulseBot. Well Well uses Motivational Interviewing (OARS) and is
// calibrated for Singapore community members, not clinical staff.
// ⚠️ `WELL_WELL_PROMPT` USED TO LIVE HERE, AND THAT WAS THE PROBLEM.
//
// The community persona was a client constant, shipped to every browser and sent
// back to the server on every turn as `prompt`. A system prompt the caller supplies
// is a system prompt the caller can replace — and the endpoint it was sent to,
// `chatWithAura`, accepted up to 8,000 characters of it without authentication.
//
// It now lives in `functions/index.js` beside `communityAck`, which takes no
// caller-supplied prompt at all. Nothing here needs it: this component sends the
// domain, the answer and the prior answers, and receives one sentence back.

import { DOMAIN_CONFIG } from '../data/communityDomains';

// `AC14`: `TOTAL_STEPS` lived here with a comment saying "// 13" while the
// array held 15 — `CP26` appended `falls` and `healthier_sg` and the comment
// kept its old count. Its only two uses were `step: TOTAL_STEPS - 1` on the
// completion and error messages, which badged the final plan with whatever
// domain happens to be last (`healthier_sg`) — so those messages carry no
// `step` now, and the constant had no remaining reader. Deleted rather than
// corrected: a count nothing consumes is a comment waiting to go stale again.

// Progress segment colour by group
const GROUP_COLOURS = {
  pavs:   'bg-emerald-500',
  safety: 'bg-amber-500',
  sdoh:   'bg-violet-500',
  admin:  'bg-slate-400',
};

// ─── TIERED CTA LIBRARY ───────────────────────────────────────────────────────
// Source: Northern Singapore Health Ecosystem Report, Section 5.7
const CTA = {
  symptoms_present: {
    emoji: '⚠️',
    primaryStep:
      'Please see your GP or visit a polyclinic before starting any new exercise. Chest pain or dizziness during activity requires medical clearance first.',
    healthierSG:
      'Your Healthier SG GP can assess your symptoms and update your Health Plan. Book via HealthHub → My Appointments.',
    resources: [
      '📞 Polyclinic appointment booking: healthhub.sg/appointments',
      '🏥 If symptoms are severe or sudden: call 995',
    ],
  },
  chronic_metabolic: {
    emoji: '🩺',
    primaryStep:
      'Enrol in the "Manage Metabolic Health" programme at Woodlands Active Health Lab — 7 structured sessions, from SGD 48, with healthcare professional supervision.',
    healthierSG:
      'Book your next Healthier SG annual check-in (FREE) and share your activity result. Your GP can issue a direct referral to the Active Health Lab.',
    resources: [
      '📱 Book Active Health Lab: activesg.gov.sg → Woodlands Sport Centre',
      '💳 CHAS subsidies may apply: chas.sg to check eligibility',
      '🩺 Healthier SG check-in: FREE via HealthHub app',
    ],
  },
  senior_low_activity: {
    emoji: '🏠',
    primaryStep:
      'Visit your nearest Active Ageing Centre (AAC) — walk in, no appointment needed. Activities are largely free for residents aged 60 and above.',
    healthierSG:
      'Your Healthier SG Health Plan includes a formal AAC referral pathway. Ask your GP at your next FREE check-in to document this.',
    resources: [
      '🔍 Find nearest AAC: aic.sg/care-services/active-ageing-centres',
      '📞 AIC Hotline: 1800-650-6060',
      '📺 Seniors workout library on HealthHub: free, chair and low-mobility options available',
    ],
  },
  mental_health_first: {
    emoji: '🌿',
    primaryStep:
      'Your wellbeing matters most. Connect with your polyclinic\'s counselling or mental health support service — this is your most important first step before any exercise programme.',
    healthierSG:
      'The Healthier SG mental health pathway includes polyclinic counselling and AAC social connector support. Raise this at your next Health Plan check-in.',
    resources: [
      '🤝 AAC Social Connector service: visit or call your nearest AAC',
      '📞 Samaritans of Singapore: 1767 (24 hours, 7 days)',
      '💬 Mental health resources: mindline.sg',
    ],
  },
  financial_low_activity: {
    emoji: '🆓',
    primaryStep:
      'Register for "Start2Move" — a completely FREE 6-session beginner exercise programme. Download the Healthy 365 app and search "Start2Move" under Explore → Events.',
    healthierSG:
      'Your first Healthier SG Health Plan consultation is FULLY SUBSIDISED. If not yet enrolled, book at any PHPC clinic — free for all Singapore residents.',
    resources: [
      '🆓 Start2Move: free via Healthy 365 app (App Store / Google Play)',
      '🧘 Free PA interest groups: onepa.gov.sg → search "healthiersg"',
      '💳 CHAS Blue/Orange subsidies available: chas.sg to check eligibility',
    ],
  },
  social_low_activity: {
    emoji: '👥',
    primaryStep:
      'Join Start2Move in a cohort group format — you will exercise alongside the same group of peers across 6 sessions, building both fitness and new friendships.',
    healthierSG:
      'Enrol in a HealthierSG-tagged People\'s Association interest group (Tai Chi, Brisk Walking, Qigong — many are free) and mention participation to your GP.',
    resources: [
      '🤝 PA interest groups: onepa.gov.sg → search "healthiersg" → filter by your area',
      '🏠 If aged 60+: visit nearest AAC for befriending and active ageing programmes',
      '📱 Healthy 365 Step Challenges: stay motivated with community leaderboards',
    ],
  },
  start2move: {
    emoji: '🚀',
    primaryStep:
      'Download the Healthy 365 app and search "Start2Move" under Explore → Events. Register for the free 6-session beginner programme — the most appropriate first step for your current activity level.',
    healthierSG:
      'Tell your Healthier SG doctor about your Start2Move enrolment at your next check-in. It counts directly toward your exercise health goals on your Health Plan.',
    resources: [
      '📱 Healthy 365: free on App Store and Google Play',
      '🏋️ Active Health Lab, Woodlands: Balance & Muscular Fitness from SGD 6 per session',
      '📋 Print or screenshot your activity result and bring it to your next GP visit as your starting point',
    ],
  },
  active_health_lab: {
    emoji: '💪',
    primaryStep:
      'You meet Singapore\'s minimum activity guidelines — now build on this. Book a "Strength 2.0 Foundation" or "Balance & Muscular Fitness" session at Woodlands Active Health Lab, from SGD 6.',
    healthierSG:
      'Active Health Lab programmes are formally recognised within the Healthier SG Health Plan community pathway. Mention your programme at your next annual check-in.',
    resources: [
      '🏋️ Book at activesg.gov.sg → Active Health Lab → Woodlands Sport Centre',
      '📊 Body Composition Assessment available: from SGD 7 (Tue/Thu/Sat/Fri)',
      '📱 Track sessions with the ActiveSG+ app',
    ],
  },
  perform: {
    emoji: '⚡',
    primaryStep:
      'You are well above minimum guidelines — outstanding. Try the "Perform 2.0 AMRAP" or "ENGINE Workout" at Woodlands Active Health Lab, from SGD 6, for structured high-intensity programming.',
    healthierSG:
      'Share your high activity level with your Healthier SG GP. You may be eligible for performance programme referrals and advanced tracking within your Health Plan.',
    resources: [
      '⚡ Free HIIT Workout Library (Adults 19–49, Workouts #1–12): HealthHub → Move It',
      '🏆 Perform 2.0 sessions: multiple weekly slots available April 2026',
      '📊 Consider a Body Composition Assessment to establish a performance baseline',
    ],
  },
  senior_isolated: {
    emoji: '📞',
    primaryStep:
      'We strongly recommend connecting with SingHealth CareLine, a 24/7 tele-befriending and social support service. It is completely free for eligible seniors and ensures you always have someone to talk to or call for health advice.',
    healthierSG:
      'Your Healthier SG doctor can work alongside CareLine and community partners to ensure your Health Plan includes dedicated social support.',
    resources: [
      '📞 SingHealth CareLine: Call 6340 7054 (24/7 Support)',
      '🏠 Active Ageing Centres: Drop by your nearest centre for daily activities',
      '💬 Silver Generation Office: Request a home care visit'
    ],
  },
};

import { copyFor } from '../data/communityChatCopy';

// ─── AURA AVATAR ──────────────────────────────────────────────────────────────
const AuraAvatar = ({ size = 'sm' }) => (
  <div className={`
    ${size === 'sm' ? 'w-7 h-7' : 'w-9 h-9'}
    rounded-full flex items-center justify-center text-white flex-shrink-0
    bg-gradient-to-br from-teal-400 to-emerald-600 shadow-sm ring-2 ring-teal-100 dark:ring-teal-900
  `}>
    <BrainCircuit size={size === 'sm' ? 14 : 18} strokeWidth={2} />
  </div>
);

// ─── PROGRESS BAR ─────────────────────────────────────────────────────────────
const ProgressBar = ({ currentStep, total, langData }) => {
  const pct = Math.round(((currentStep) / total) * 100);
  const domain = DOMAIN_CONFIG[currentStep] || DOMAIN_CONFIG[total - 1];
  const colour = GROUP_COLOURS[domain?.group] || 'bg-slate-400';

  return (
    <div className="px-4 pt-2 pb-1 bg-white dark:bg-[#111827]">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {langData.progressLabel(currentStep, total)}
        </span>
        <span className="text-xs text-slate-400 dark:text-slate-500">{pct}%</span>
      </div>
      <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${colour}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

// ─── CTA CARD ─────────────────────────────────────────────────────────────────
const CtaCard = ({ ctaData, langData }) => (
  <div className="mt-3 rounded-2xl border border-teal-100 dark:border-teal-900 bg-teal-50 dark:bg-teal-950/40 overflow-hidden shadow-sm">
    <div className="px-4 py-3 bg-teal-600 dark:bg-teal-700 flex items-center gap-2">
      <span className="text-lg">{ctaData.emoji}</span>
      <h3 className="text-sm font-semibold text-white">{langData.ctaTitle}</h3>
    </div>

    <div className="p-4 space-y-4">
      {/* Primary step */}
      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          <CheckCircle size={13} className="text-teal-600 dark:text-teal-400 flex-shrink-0" />
          <p className="text-xs font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wide">
            {langData.ctaPrimary}
          </p>
        </div>
        <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
          {ctaData.primaryStep}
        </p>
      </div>

      {/* HealthierSG connection */}
      <div className="border-t border-teal-100 dark:border-teal-900 pt-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <ExternalLink size={13} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
            {langData.ctaHealthierSG}
          </p>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {ctaData.healthierSG}
        </p>
      </div>

      {/* Additional resources */}
      <div className="border-t border-teal-100 dark:border-teal-900 pt-3">
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
          {langData.ctaResources}
        </p>
        <ul className="space-y-1.5">
          {ctaData.resources.map((r, i) => (
            <li key={i} className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{r}</li>
          ))}
        </ul>
      </div>
    </div>
  </div>
);

// ─── DOMAIN BADGE ─────────────────────────────────────────────────────────────
const DomainBadge = ({ step }) => {
  const domain = DOMAIN_CONFIG[step];
  if (!domain) return null;
  const colourMap = {
    pavs:     'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    safety: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    sdoh:     'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800',
    admin:    'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium border mb-1.5 ${colourMap[domain.group]}`}>
      {domain.badge}
    </span>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const AuraChatbot = () => {
  const [isDark, setIsDark] = useState(() => {
    try {
      const s = readTheme();
      const dark = s === 'dark' || (!s && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.classList.toggle('dark', dark); 
      return dark;
    } catch { return false; }
  });
  const navigate                    = useNavigate();
  const chatEndRef                  = useRef(null);
  const inputRef                    = useRef(null);
  /**
   * `AC16` — the completion latch. Between `setIsTyping(false)` on the final
   * step and the `setIsComplete(true)` that only fires inside a 1,200 ms
   * timeout, the submission guard used to be OPEN: a second tap re-entered the
   * completion branch and produced a second telemetry row under the same
   * sessionId and a second navigate. A REF, not state, because the second tap
   * can land in the same tick as the first and a `setState` latch is not yet
   * visible to it. Cleared only on a FAILED completion, so the person can
   * answer again; a successful one stays latched until the navigate.
   */
  const concludingRef               = useRef(false);

  const [lang]      = useState(() => applyDocumentLanguage(readLanguage()));
  const langData    = copyFor(lang);
  // Copy is addressed by question name, never by counting. See `COPY_ORDER`.
  const keyAt       = (i) => DOMAIN_CONFIG[i]?.key;
  const [sessionId] = useState(getSessionId);

  /**
   * ⚠️ RESTORED, NOT RESET. A thirteen-question conversation lived only here, so a
   *    refresh, a rotation that triggered one, or iOS reclaiming a backgrounded
   *    tab started the person again at question one — after they had already
   *    answered questions about chest pain, food insecurity and their mental
   *    health. See `src/utils/assessmentSession.js`.
   *
   *    `messages` is restored too, not just the answers: resuming into an empty
   *    transcript at question nine would read as a different, broken product.
   */
  const saved = loadProgress('chat');
  const [currentStep,   setCurrentStep]   = useState(() => saved?.currentStep ?? 0);
  const [messages,      setMessages]      = useState(() => saved?.messages ?? []);
  const [userInput,     setUserInput]     = useState('');
  const [isTyping,      setIsTyping]      = useState(false);
  const [collectedData, setCollectedData] = useState(() => saved?.collectedData ?? {});
  const [isComplete,    setIsComplete]    = useState(false);

  // Mirrored on every turn, so the next load can resume mid-conversation.
  // `isComplete` is deliberately NOT saved: a finished assessment is restored from
  // the result store on `/individuals/result`, and resuming a completed chat into
  // a screen with no result would be a dead end.
  useEffect(() => {
    if (!isComplete) saveProgress('chat', { currentStep, messages, collectedData });
  }, [currentStep, messages, collectedData, isComplete]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    writeTheme(next);
  };

  useEffect(() => {
    if (messages.length === 0) appendBotMessage(langData.prompts[keyAt(0)], 0);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (!isTyping) inputRef.current?.focus();
  }, [isTyping]);

  const appendBotMessage = (text, step, ctaData = null) => {
    setIsTyping(true);
    setTimeout(() => {
      setMessages(prev => [...prev, { sender: 'bot', text, step, ctaData }]);
      setIsTyping(false);
    }, 850);
  };

  /**
   * `AC8`, resolved by CORRECTING THE FINDING rather than shipping its fix. The
   * ledger asked for "one AbortSignal" on this window so a discarded reply stops
   * billing. It would not: `httpsCallable` carries no signal, and — the part
   * that matters — aborting the HTTP request does not stop a Cloud Function
   * mid-execution. The server runs `communityAck` to completion and the Gemini
   * call bills identically whether the client is still listening or not. The
   * real cost controls are server-side and already in place: `maxOutputTokens:
   * 200`, a 20s timeout, and the `CP7` rate limits. What the window governs is
   * only whether a paid-for reply is USED — widening it would use more of them
   * at the price of rewriting text under the reader, which is `AC11` and the
   * owner's call.
   */
  const AI_UPGRADE_WINDOW_MS = 1500;

  const handleUserSubmission = (text) => {
    if (!text.trim() || isTyping || isComplete || concludingRef.current) return;

    setMessages(prev => [...prev, { sender: 'user', text }]);
    setUserInput('');

    const stepKey     = DOMAIN_CONFIG[currentStep]?.key || ('step_' + currentStep);
    const updatedData = { ...collectedData, [stepKey]: text };
    setCollectedData(updatedData);
    setIsTyping(true);

    const staticAck = langData.reflections[keyAt(currentStep)]?.(text) ?? '';
    // ⚠️ NOT `currentStep + 1`. Steps are skipped when they do not apply to this
    //    person (the falls branch is 60+ only) or when the active language has no
    //    prompt for them — see `src/utils/chatSteps.js`.
    const nextStep  = nextActiveStep(DOMAIN_CONFIG, currentStep, langData.prompts, updatedData);

    if (nextStep !== -1) {
      const nextPromptRaw = langData.prompts[keyAt(nextStep)];
      const nextPrompt    = typeof nextPromptRaw === 'function' ? nextPromptRaw(updatedData) : nextPromptRaw;
      const staticText    = (staticAck ? staticAck + ' ' : '') + nextPrompt;

      const msgId = Date.now();
      setCurrentStep(nextStep);
      setMessages(prev => [...prev, { sender: 'bot', text: staticText, step: nextStep, _id: msgId }]);
      setIsTyping(false);

      // ⚠️ WHAT THIS SENDS, AND WHAT IT DELIBERATELY NO LONGER SENDS.
      //
      // This used to call `chatWithAura` — the same callable as the internal staff
      // assistant, unauthenticated, whose system prompt names KKH/SingHealth and
      // prints the internal Firestore schema. It shipped `WELL_WELL_PROMPT` to the
      // browser and passed all 1,718 characters back on every turn as a
      // caller-supplied `CONTEXT/OVERRIDE`, which meant anybody could replace it.
      //
      // The persona now lives on the server (`functions/index.js`, `communityAck`)
      // and there is no `prompt` field to override. Two more things are gone:
      //
      //   `history`  — the whole transcript was sent alongside the answers, which
      //                duplicated `priorAnswers` for a one-sentence acknowledgement
      //                and re-sent the person's full health profile to Google twice
      //                per turn. Only the answers go now, and only known domains.
      //   `role`     — went into the model context verbatim from an unauthenticated
      //                caller, defaulting to 'Staff'.
      //
      // What the reply does is unchanged and worth restating: it rewrites the text
      // of the acknowledgement already on screen. `parseClinicalData`,
      // `calculateRiskScore` and `selectCTA` never see it.
      var upgradeExpired = false;
      var upgradeTimer   = setTimeout(function() { upgradeExpired = true; }, AI_UPGRADE_WINDOW_MS);

      communityAck({
        domain: stepKey,
        answer: text,
        priorAnswers: updatedData,
        language: lang,
      }).then(function(result) {
        clearTimeout(upgradeTimer);
        if (upgradeExpired) return;

        /**
         * `AC9` + `AC10`. Two layers of dead tolerance are gone. The error-word
         * screen — an unanchored substring test discarding any acknowledgement
         * containing "error" or "unavailable" ("if your usual class is
         * unavailable, the centre can suggest another"), the pattern this file
         * has had removed from it four times, with an unescaped `.` in
         * `/missing.api/` for good measure. And the THIRD copy of the
         * fence-strip-and-brace-scan, parsing JSON out of an endpoint whose own
         * server prompt says "No JSON, no preamble, no quotes" and whose errors
         * arrive as THROWN HttpsErrors (the .catch below), never as prose. What
         * a successful reply needs is exactly one check: that it is not empty.
         */
        var aiAck = String((result.data && result.data.text) || '').trim();
        if (!aiAck) return;

        setMessages(function(prev) {
          return prev.map(function(m) {
            return (m._id === msgId) ? Object.assign({}, m, { text: aiAck + ' ' + nextPrompt }) : m;
          });
        });
      }).catch(function() { clearTimeout(upgradeTimer); });

    } else {
      var closing = (staticAck ? staticAck + ' ' : '') + 'I have mapped your full profile. Generating your personalised plan now…';
      setMessages(prev => [...prev, { sender: 'bot', text: closing, step: currentStep }]);
      setIsTyping(false);
      concludingRef.current = true; // `AC16` — see the ref's declaration
      // `AC6`: the body traps its own throws now, but a promise rejection from
      // the async machinery itself must not become an unhandled rejection.
      concludeTriage(updatedData).catch((err) => console.error('[AuraChat] concludeTriage rejected:', err));
    }
  };
  
  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleUserSubmission(userInput);
  };

  const concludeTriage = async (finalData) => {
    /**
     * ⚠️ `AC6` / `AC7` — THE TRY USED TO GUARD THE ONE CALL THAT CANNOT THROW.
     *    `clearProgress()` ran on line one, then `parseClinicalData`,
     *    `calculateRiskScore` and `selectCTA` all ran OUTSIDE the try, and the
     *    only thing inside it was `recordTelemetry` — which catches everything
     *    and returns false by design (`telemetry.js`), so the catch was
     *    unreachable. A throw in any of the three real computations was an
     *    unhandled rejection: the visitor sat on "Generating your personalised
     *    plan now…" forever, and their answers were already gone, so even a
     *    refresh could not resume.
     *
     *    Now: everything that can throw is inside the try; the catch shows the
     *    error sentence (`AC7`: alive, and the only outcome for a failure); and
     *    `clearProgress()` runs only once there is a computed result to replace
     *    the in-progress copy — a failed COMPUTATION leaves the answers intact,
     *    so the person can answer the last question again instead of starting
     *    a 15-step screening from nothing.
     *
     * ⚠️ SCOPE OF THAT SENTENCE, precisely: it covers a THROW. A failed
     *    telemetry WRITE is a different case — `recordTelemetry` swallows its
     *    errors and returns `false` by design, so a Firestore outage still
     *    falls through to `clearProgress()` and the person still gets their
     *    plan (correct: their result must not be hostage to our analytics),
     *    but the answers are gone and no record was stored. That trade is
     *    telemetry.js's documented decision, not an accident of this try.
     */
    try {
      const parsed    = parseClinicalData(finalData);
      const riskScore = calculateRiskScore(parsed);
      const ctaSelection = selectCTA(parsed);
      const ctaData = CTA[ctaSelection.route];

      await recordTelemetry(parsed.postalSector, {
        event: 'aura_triage_complete_v2',
        sessionId,
        previousSessionId: parsed.previousId,
        payload: parsed,
        computedRisk: riskScore,
        ctaTier: ctaSelection.tier,
      });

      // The conversation has become a result; the in-progress copy is no longer
      // the live one and keeping it would resume a completed assessment.
      clearProgress();

      setTimeout(() => {
        setIsComplete(true);
        setMessages(prev => [...prev, {
          sender: 'bot',
          /*
           * Merge note (PR #2 -> PR #4): main's community branch reworded this
           * message (lay-person copy) AND still carried `step: TOTAL_STEPS - 1`,
           * which `AC14` had deleted on this side — the constant was a stale
           * count and the badge it produced on the final plan was wrong. The
           * copy is kept; the `step` field stays deleted, per AC14's comment
           * above the config array. Lint caught the half-merged state before
           * it could ship as a ReferenceError on the completion path.
           */
          text: 'Here is your personalised community health plan based on your activity level and health profile. Save or screenshot this screen, then tap anywhere to continue.',
          ctaData,
        }]);

        setTimeout(() => {
          navigate('/individuals/result', {
            state: {
              score: riskScore,
              data: parsed,
              postalSector: parsed.postalSector,
              sessionId,
              previousSessionId: parsed.previousId,
              ctaTier: ctaSelection.tier,
            },
          });
        }, 5000);
      }, 1200);

    } catch (err) {
      console.error('[AuraChat] completion failed; progress kept for resume:', err);
      // `AC16`: a FAILED completion unlatches, so the person can answer the
      // last question again — the same reasoning as keeping their progress.
      concludingRef.current = false;
      setTimeout(() => {
        setMessages(prev => [...prev, { sender: 'bot', text: langData.error }]);
      }, 1000);
    }
  };

  const showQuickReplies = !isTyping && !isComplete && Boolean(langData.quickReplies[keyAt(currentStep)]);

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-stone-50 dark:bg-slate-950 font-sans transition-colors duration-500">

      {/* ── HEADER ── */}
      <header className="flex items-center justify-between px-4 pt-4 pb-2 bg-white dark:bg-[#111827] shadow-sm border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            aria-label={langData.back}
          >
            <ChevronLeft size={22} />
          </button>
          <div className="flex items-center gap-2.5">
            <AuraAvatar size="md" />
            <div>
              <h1 className="font-semibold text-base text-slate-900 dark:text-white leading-tight">AURA</h1>
              <p className="text-[10px] text-teal-600 dark:text-teal-400 font-medium leading-none">
                {langData.sessionLabel}: {sessionId}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/*
            The persistent access point to the chatbot info card (`AURA-TODO.md`
            P9.3) — an info icon is sufficient per the IMDA guidelines, and the
            card itself is a hosted page. New tab, so the assessment in progress
            is not abandoned by reading about the assistant running it.
          */}
          <a
            href="/aura-info"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 shadow-sm hover:scale-105 active:scale-95 transition-all"
            aria-label="About this AI assistant: Chatbot Info Card"
          >
            <InfoIcon size={17} />
          </a>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 shadow-sm hover:scale-105 active:scale-95 transition-all"
            aria-label="Toggle theme"
          >
            {isDark
              ? <Sun size={17} className="text-amber-400" />
              : <Moon size={17} />}
          </button>
        </div>
      </header>

      {/* ── PROGRESS BAR ── */}
      {/*
        Counted from the steps this person will actually be asked, so the bar does
        not promise questions that are skipped. It changes once — when age is given
        and the 60+ branch opens or does not.
      */}
      <ProgressBar
        currentStep={activeStepPosition(DOMAIN_CONFIG, currentStep, langData.prompts, collectedData) - 1}
        total={activeStepCount(DOMAIN_CONFIG, langData.prompts, collectedData)}
        langData={langData}
      />

      {/* ── CHAT AREA ── */}
      {/*
        `AC12`. The staff roster announces its state changes with two polite live
        regions; the public screening — the surface `CP17` fixed `<html lang>` and
        pinch-zoom for BECAUSE its users are elderly — announced nothing: every
        question, the typing indicator and the final plan arrived silently to a
        screen reader. `role="log"` implies polite announcements of additions,
        stated explicitly for the older screen-reader/browser pairs this audience
        actually uses.
      */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" role="log" aria-live="polite">
        {messages.map((msg, idx) => (
          // `AC13`: `_id` was added precisely so the upgrade handler could find a
          // message; the key never moved to it. Index stays as the fallback for
          // messages minted before `_id` existed (greetings, restored progress).
          <div key={msg._id ?? idx} className={`flex gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>

            {/* Bot avatar */}
            {msg.sender === 'bot' && <AuraAvatar size="sm" />}

            <div className={`max-w-[82%] ${msg.sender === 'user' ? '' : ''}`}>
              {/* Domain badge */}
              {msg.sender === 'bot' && msg.step !== undefined && (
                <DomainBadge step={msg.step} />
              )}

              {/* Message bubble */}
              <div className={`px-4 py-3 rounded-2xl shadow-sm text-sm leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-teal-600 dark:bg-teal-500 text-white rounded-br-none'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-none'
              }`}>
                {msg.text}
              </div>

              {/* CTA card */}
              {msg.ctaData && <CtaCard ctaData={msg.ctaData} langData={langData} />}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex gap-2 items-end justify-start">
            <AuraAvatar size="sm" />
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-2xl rounded-bl-none shadow-sm">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* ── INPUT AREA ── */}
      <div className="px-4 pt-3 pb-4 bg-white dark:bg-[#111827] border-t border-slate-100 dark:border-slate-800 shadow-[0_-4px_8px_-2px_rgba(0,0,0,0.04)]">

        {/* Quick replies */}
        {showQuickReplies && (
          <div className="mb-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-0.5">
              {langData.hintText}
            </p>
            <div className="flex flex-wrap gap-2">
              {langData.quickReplies[keyAt(currentStep)].map((reply) => (
                <button
                  key={reply}
                  onClick={() => handleUserSubmission(reply)}
                  className="px-3 py-1.5 text-xs font-medium bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-500/30 rounded-full hover:bg-teal-100 dark:hover:bg-teal-500/20 active:scale-95 transition-all text-left"
                >
                  {reply}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Text input */}
        {!isComplete && (
          <form onSubmit={handleFormSubmit} className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder={langData.inputPlaceholder}
              disabled={isTyping}
              aria-label="Your message"
              className="flex-1 px-4 py-2.5 bg-stone-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-full text-sm focus:outline-none focus:border-teal-500 dark:focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 dark:focus:ring-teal-400/20 transition-all placeholder-slate-400 dark:placeholder-slate-500 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!userInput.trim() || isTyping}
              aria-label="Send message"
              className="p-2.5 bg-teal-600 dark:bg-teal-500 text-white rounded-full disabled:opacity-40 disabled:cursor-not-allowed hover:bg-teal-700 dark:hover:bg-teal-600 active:scale-95 transition-all shadow-sm"
            >
              <Send size={18} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default AuraChatbot;
