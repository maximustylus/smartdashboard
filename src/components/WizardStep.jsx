/**
 * A NUMBERED STEP IN THE CONFIGURATION WIZARD, ON A CONNECTING SPINE.
 *
 * The wizard's panels are a sequence — who you are, when it runs, how the
 * department is shaped, who is in it, what they do — but they rendered as a stack
 * of similarly-styled cards, so nothing said they were ordered, and nothing told a
 * reader how much was still below the fold. This draws the badge and the line that
 * make the order visible, and it does not touch what is inside a panel.
 *
 * PURELY PRESENTATIONAL. It takes a number and children. It has no state, reads no
 * roster data, and cannot change a configuration — so numbering the wizard cannot
 * alter what the wizard produces. That matters because every panel it wraps is
 * pinned by existing tests that were written against the un-numbered markup.
 *
 * THE SPINE IS DRAWN, NOT FAKED WITH A BORDER ON THE CARD. The line lives in the
 * badge column and stretches to the bottom of the row, so it spans whatever height
 * the panel happens to be — a two-line panel and a forty-row table both get a
 * continuous line, and the last step stops it rather than trailing into nothing.
 *
 * WHY NOT `<ol>`: an ordered list would be the honest element for a sequence, but
 * these panels are already a stack of landmark-ish cards containing tables and
 * fieldsets, and wrapping each in `<li>` would put a list around a table for the
 * benefit of the numbering alone. Instead the number is announced as part of the
 * step's accessible name ("Step 4 of 7: Working hours") and the decorative parts
 * are hidden, which is what a screen-reader user actually needs to hear.
 */

import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronRight } from 'lucide-react';
import { WIZARD_STEP_COUNT } from '../utils/rosterWizard';
import { stepGuideFor } from '../data/rosterWizardHelp';

/**
 * THE STEP GUIDE — the third of the wizard's three help layers (see
 * `rosterWizardHelp.js`). One collapsible line under the step's heading:
 * "How this step works", opening to what to decide, an example, and what
 * happens next. It is the walk-through a first-time roster master can leave
 * open on every step, and the thing a tenth-time one collapses once.
 *
 * COLLAPSED STATE IS REMEMBERED PER STEP, PER BROWSER, in `localStorage`, and
 * it is the only thing remembered: a preference about reading, not a fact
 * about the roster. Every read and write is wrapped, because storage can be
 * absent (a private window, a cleared profile) and the guide must render the
 * same either way — open, which is the right default for somebody new.
 */
const GUIDE_STORAGE_PREFIX = 'nexus.roster.wizardGuide.';

const readCollapsed = (stepId) => {
    try {
        return window.localStorage.getItem(GUIDE_STORAGE_PREFIX + stepId) === 'collapsed';
    } catch (unavailable) {
        return false;
    }
};

const writeCollapsed = (stepId, collapsed) => {
    try {
        if (collapsed) window.localStorage.setItem(GUIDE_STORAGE_PREFIX + stepId, 'collapsed');
        else window.localStorage.removeItem(GUIDE_STORAGE_PREFIX + stepId);
    } catch (unavailable) {
        // Nothing to do: the preference simply does not survive the page.
    }
};

export const StepGuide = ({ stepId }) => {
    const guide = stepGuideFor(stepId);
    const [collapsed, setCollapsed] = useState(() => readCollapsed(stepId));
    if (!guide) return null;

    const toggle = () => {
        const next = !collapsed;
        setCollapsed(next);
        writeCollapsed(stepId, next);
    };
    const Chevron = collapsed ? ChevronRight : ChevronDown;

    return (
        <div data-step-guide={stepId} className="mb-3">
            <button
                type="button"
                onClick={toggle}
                aria-expanded={!collapsed}
                className="inline-flex items-center gap-1.5 min-h-11 sm:min-h-0 py-1 rounded text-[10px] font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
                <BookOpen size={12} aria-hidden="true" />
                How this step works
                <Chevron size={12} aria-hidden="true" />
            </button>
            {!collapsed && (
                <dl className="mt-1.5 grid gap-x-3 gap-y-1 sm:grid-cols-[auto_1fr] rounded-lg border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/60 dark:bg-indigo-900/20 p-3 text-[11px] leading-relaxed">
                    <dt className="font-black uppercase tracking-wider text-[10px] text-indigo-700 dark:text-indigo-300">Decide</dt>
                    <dd className="text-slate-700 dark:text-slate-200">{guide.decide}</dd>
                    <dt className="font-black uppercase tracking-wider text-[10px] text-indigo-700 dark:text-indigo-300">Example</dt>
                    <dd className="text-slate-700 dark:text-slate-200">{guide.example}</dd>
                    <dt className="font-black uppercase tracking-wider text-[10px] text-indigo-700 dark:text-indigo-300">Then</dt>
                    <dd className="text-slate-700 dark:text-slate-200">{guide.next}</dd>
                </dl>
            )}
        </div>
    );
};

/**
 * THE BADGE IS DELIBERATELY SMALL ON A PHONE.
 *
 * Below `sm:` the wizard's staff and task rows STACK rather than scroll
 * horizontally — a deliberate earlier decision, because a horizontally-scrolling
 * table on a phone hides columns. That means every pixel this gutter takes is a
 * pixel of stacked-row width, on the 375px screens most people testing this are
 * holding. So: 24px badge and an 8px gap on a phone (32px total), 28px and 12px
 * from `sm:` up where there is room.
 */
const BADGE = 'w-6 h-6 sm:w-7 sm:h-7 text-[11px] sm:text-xs';

const WizardStep = ({ number, label, isLast = false, guide = null, children }) => {
    // An unknown step id arrives as `null` from `wizardStepNumber`. Render the
    // panel unbadged rather than printing "step 0 of 7" or throwing: the wizard
    // stays usable and the omission is obvious in review.
    if (!Number.isInteger(number) || number < 1) {
        return <div>{guide && <StepGuide stepId={guide} />}{children}</div>;
    }

    return (
        <div className="flex gap-2 sm:gap-3">
            {/* The badge column: number, then the line filling whatever is left. */}
            <div className="flex flex-col items-center shrink-0">
                <div
                    className={`${BADGE} rounded-full flex items-center justify-center font-black
                        bg-white dark:bg-slate-800
                        text-slate-500 dark:text-slate-400
                        border-2 border-slate-300 dark:border-slate-600`}
                >
                    {number}
                </div>
                {/* `flex-1` makes this span the panel's full remaining height, so the
                    line is continuous whether the panel is two lines or a long table.
                    `aria-hidden` because it is a picture of adjacency, not information —
                    the order is already in each step's accessible name. */}
                {!isLast && (
                    <div
                        aria-hidden="true"
                        className="w-0.5 flex-1 min-h-[0.75rem] mt-1 rounded-full bg-slate-200 dark:bg-slate-700"
                    />
                )}
            </div>

            {/* `min-w-0` is load-bearing: without it a flex child refuses to shrink
                below its content's intrinsic width, and one wide table row would push
                the whole wizard into a horizontal scroll on a phone. */}
            <div className="flex-1 min-w-0" aria-label={label ? `Step ${number} of ${WIZARD_STEP_COUNT}: ${label}` : undefined}>
                {/* The guide sits INSIDE the step's column, above its panel, so it is
                    read as part of "Step 4 of 7: Working hours" and folds with it. */}
                {guide && <StepGuide stepId={guide} />}
                {children}
            </div>
        </div>
    );
};

export default WizardStep;
