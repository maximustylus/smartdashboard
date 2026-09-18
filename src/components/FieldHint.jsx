/**
 * ==============================================================================
 * FieldHint — the "i" beside a setting, and the note it opens
 * ==============================================================================
 *
 * The second of the Configure wizard's three help layers (`rosterWizardHelp.js`
 * explains the three). A small round button carrying an info glyph; tap it and
 * the setting's explanation opens beside it. Tap again, tap outside, or press
 * Escape, and it closes.
 *
 * TAP, NOT HOVER. Most people who open the wizard open it on a phone, where
 * hover does not exist. So this is a real button with `aria-expanded`, and the
 * note is a `role="note"` region labelled by its title. A keyboard user reaches
 * it in the tab order; a screen reader hears "More about this setting, button,
 * collapsed" right after the label it sits beside.
 *
 * ⚠️ THE BUTTON'S ACCESSIBLE NAME IS FIXED, NOT THE SETTING'S TITLE. It sits
 *    beside a label, and a name repeating that label ("About Working hours")
 *    made every lookup by label text find two controls — the field and this
 *    button. The title is the tooltip instead, and the note is labelled by it.
 *
 * IT FLOATS ON A DESKTOP AND SITS ON THE BOTTOM EDGE ON A PHONE. The note is
 * rendered through a portal into `document.body`, positioned from the button's
 * rectangle at the moment it opens, so it cannot be clipped by the table
 * scrollers or the modal's own overflow. Below `sm:` it ignores the rectangle
 * and becomes a sheet across the bottom of the screen, which is where a thumb
 * is and where a 20rem popover would not fit anyway.
 *
 * ONE OPEN AT A TIME, ACROSS THE WHOLE PAGE. Opening a hint closes any other:
 * two notes stacked over a table are a wall of text again, which is the thing
 * this component exists to remove.
 *
 * NO STATE THAT MATTERS. Whether a note is open is not an answer to "what will
 * be generated", so it lives here and nowhere else. The copy comes from
 * `WIZARD_HELP` by id; an id with no copy renders NOTHING, and the test file
 * is what stops that being silent.
 * ==============================================================================
 */

import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info, X, ShieldAlert } from 'lucide-react';
import { helpFor } from '../data/rosterWizardHelp';

/** The note's width on a desktop; below `sm:` it is the screen's. */
const NOTE_WIDTH = 320;
const VIEWPORT_GUTTER = 12;

/** Every open hint registers a closer here, so opening one can close the others. */
const openHints = new Set();
const closeOtherHints = (mine) => {
    for (const close of openHints) if (close !== mine) close();
};

/** Where to put the note on a desktop: under the button, kept inside the viewport. */
const placeBelow = (rect) => {
    if (!rect) return { top: 0, left: 0 };
    const width = typeof window !== 'undefined' ? window.innerWidth : NOTE_WIDTH;
    const left = Math.max(VIEWPORT_GUTTER, Math.min(rect.left, width - NOTE_WIDTH - VIEWPORT_GUTTER));
    return { top: rect.bottom + 6, left };
};

const FieldHint = ({ id, className = '' }) => {
    const help = helpFor(id);
    const [open, setOpen] = useState(false);
    const [anchor, setAnchor] = useState(null);
    const buttonRef = useRef(null);
    const noteRef = useRef(null);
    const noteId = useId();

    const close = () => setOpen(false);

    useEffect(() => {
        if (!open) return undefined;
        openHints.add(close);
        closeOtherHints(close);

        const onKey = (event) => {
            if (event.key === 'Escape') {
                setOpen(false);
                buttonRef.current?.focus?.();
            }
        };
        const onPointer = (event) => {
            const inNote = noteRef.current?.contains?.(event.target);
            const onButton = buttonRef.current?.contains?.(event.target);
            if (!inNote && !onButton) setOpen(false);
        };
        // The wizard is a scrolling modal, and a tap often lands while a smooth
        // scroll is still settling — so the note FOLLOWS its button on scroll and
        // resize rather than closing, which is what it did first and read as
        // "the button does nothing".
        const onScroll = () => {
            const rect = buttonRef.current?.getBoundingClientRect?.();
            if (rect) setAnchor({ top: rect.top, bottom: rect.bottom, left: rect.left });
        };

        document.addEventListener('keydown', onKey);
        document.addEventListener('pointerdown', onPointer);
        window.addEventListener('scroll', onScroll, true);
        window.addEventListener('resize', onScroll);
        return () => {
            openHints.delete(close);
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('pointerdown', onPointer);
            window.removeEventListener('scroll', onScroll, true);
            window.removeEventListener('resize', onScroll);
        };
    }, [open]);

    if (!help) return null;

    const toggle = () => {
        if (!open) {
            const rect = buttonRef.current?.getBoundingClientRect?.() ?? null;
            setAnchor(rect ? { top: rect.top, bottom: rect.bottom, left: rect.left } : null);
        }
        setOpen((previous) => !previous);
    };

    const position = placeBelow(anchor);

    return (
        <>
            <button
                ref={buttonRef}
                type="button"
                onClick={toggle}
                aria-label="More about this setting"
                aria-expanded={open}
                aria-controls={open ? noteId : undefined}
                title={help.title}
                data-field-hint={id}
                // 44px on a phone, 20px from `sm:` up: the same touch rule the
                // rest of the wizard follows, on a control that sits beside a label.
                className={`inline-flex shrink-0 items-center justify-center min-h-11 min-w-11 sm:min-h-0 sm:min-w-0 sm:h-5 sm:w-5 rounded-full text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors ${open ? 'text-emerald-700 dark:text-emerald-400' : ''} ${className}`}
            >
                <Info size={14} aria-hidden="true" />
            </button>

            {open && typeof document !== 'undefined' && createPortal(
                <div
                    ref={noteRef}
                    id={noteId}
                    role="note"
                    aria-label={help.title}
                    data-field-hint-note={id}
                    style={{ '--hint-top': `${position.top}px`, '--hint-left': `${position.left}px`, '--hint-width': `${NOTE_WIDTH}px` }}
                    className="fixed z-[130] inset-x-3 bottom-3 sm:inset-auto sm:top-[var(--hint-top)] sm:left-[var(--hint-left)] sm:w-[var(--hint-width)] max-h-[70vh] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-4 animate-in fade-in zoom-in-95 duration-150"
                >
                    <div className="flex items-start justify-between gap-3">
                        <p className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                            {help.title}
                        </p>
                        <button
                            type="button"
                            onClick={() => { setOpen(false); buttonRef.current?.focus?.(); }}
                            aria-label="Close"
                            title={`Close: ${help.title}`}
                            className="inline-flex items-center justify-center min-h-11 min-w-11 sm:min-h-0 sm:min-w-0 sm:h-6 sm:w-6 -mt-1 -mr-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                            <X size={14} aria-hidden="true" />
                        </button>
                    </div>
                    <div className="mt-2 space-y-2">
                        {help.body.map((paragraph) => (
                            <p key={paragraph} className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                {paragraph}
                            </p>
                        ))}
                        {help.caution && (
                            <p className="flex items-start gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 leading-relaxed">
                                <ShieldAlert size={13} className="shrink-0 mt-0.5" aria-hidden="true" />
                                <span>{help.caution}</span>
                            </p>
                        )}
                    </div>
                </div>,
                document.body,
            )}
        </>
    );
};

export default FieldHint;
