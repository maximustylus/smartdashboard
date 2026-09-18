/**
 * ==============================================================================
 * FieldHint + StepGuide — the wizard's two help surfaces (component tests)
 * ==============================================================================
 * Runner: Vitest + @testing-library/react (jsdom)
 * Run:    npx vitest run src/components/FieldHint.test.jsx
 *
 * WHAT IS PINNED:
 *   1. The info button is a real button with an accessible name and state;
 *      tapping opens the note, tapping again / Escape / tapping outside closes it.
 *   2. One note at a time: opening a second closes the first.
 *   3. The note carries the registry's title, paragraphs and caution, verbatim.
 *   4. An unknown id renders nothing (and `rosterWizardHelp.test.js` is what
 *      stops that being silent in the real wizard).
 *   5. The step guide opens by default, collapses, and REMEMBERS the collapse
 *      per step; storage being unavailable does not break it.
 * ==============================================================================
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import FieldHint from './FieldHint';
import WizardStep, { StepGuide } from './WizardStep';
import { WIZARD_HELP, WIZARD_STEP_GUIDES } from '../data/rosterWizardHelp';

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

const note = (id) => document.querySelector(`[data-field-hint-note="${id}"]`);
const hintButton = (id) => document.querySelector(`[data-field-hint="${id}"]`);

describe('FieldHint', () => {
    it('is a labelled button that opens and closes its note', () => {
        render(<FieldHint id="hours" />);
        const button = hintButton('hours');
        expect(button.getAttribute('aria-label')).toBe('More about this setting');
        expect(button.getAttribute('title')).toBe('Working hours');
        expect(button.getAttribute('aria-expanded')).toBe('false');
        expect(note('hours')).toBeNull();

        fireEvent.click(button);
        expect(button.getAttribute('aria-expanded')).toBe('true');
        const opened = note('hours');
        expect(opened).not.toBeNull();
        expect(opened.getAttribute('role')).toBe('note');
        expect(screen.getByText(WIZARD_HELP.hours.body[0])).toBeTruthy();
        expect(screen.getByText(WIZARD_HELP.hours.body[1])).toBeTruthy();

        fireEvent.click(button);
        expect(note('hours')).toBeNull();
    });

    it('renders the caution in the note when the entry has one', () => {
        render(<FieldHint id="windows" />);
        fireEvent.click(hintButton('windows'));
        expect(screen.getByText(WIZARD_HELP.windows.caution)).toBeTruthy();
    });

    it('closes on Escape and returns focus to the button', () => {
        render(<FieldHint id="bands" />);
        const button = hintButton('bands');
        fireEvent.click(button);
        expect(note('bands')).not.toBeNull();
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(note('bands')).toBeNull();
        expect(document.activeElement).toBe(button);
    });

    it('closes when something outside it is tapped', () => {
        render(<div><FieldHint id="bands" /><p data-testid="elsewhere">elsewhere</p></div>);
        fireEvent.click(hintButton('bands'));
        expect(note('bands')).not.toBeNull();
        fireEvent.pointerDown(screen.getByTestId('elsewhere'));
        expect(note('bands')).toBeNull();
    });

    it('has a close control inside the note', () => {
        render(<FieldHint id="bands" />);
        fireEvent.click(hintButton('bands'));
        fireEvent.click(screen.getByRole('button', { name: 'Close' }));
        expect(note('bands')).toBeNull();
    });

    it('opens one at a time', () => {
        render(<div><FieldHint id="bands" /><FieldHint id="hours" /></div>);
        fireEvent.click(hintButton('bands'));
        expect(note('bands')).not.toBeNull();
        fireEvent.click(hintButton('hours'));
        expect(note('hours')).not.toBeNull();
        expect(note('bands')).toBeNull();
    });

    it('renders nothing for an id with no copy', () => {
        const { container } = render(<FieldHint id="doesNotExist" />);
        expect(container.innerHTML).toBe('');
    });
});

describe('StepGuide', () => {
    let store;
    beforeEach(() => {
        store = new Map();
        vi.stubGlobal('localStorage', {
            getItem: (key) => (store.has(key) ? store.get(key) : null),
            setItem: (key, value) => store.set(key, String(value)),
            removeItem: (key) => store.delete(key),
        });
    });

    it('is closed by default, and opens to the three answers for its step', () => {
        render(<StepGuide stepId="tasks" />);
        const toggle = screen.getByRole('button', { name: /how this step works/i });
        // The owner's decision (2026-09-17): a decluttered wizard does not put a
        // paragraph back under every heading. Closed on load, in both universes.
        expect(toggle.getAttribute('aria-expanded')).toBe('false');
        expect(screen.queryByText(WIZARD_STEP_GUIDES.tasks.decide)).toBeNull();
        fireEvent.click(toggle);
        expect(toggle.getAttribute('aria-expanded')).toBe('true');
        expect(screen.getByText(WIZARD_STEP_GUIDES.tasks.decide)).toBeTruthy();
        expect(screen.getByText(WIZARD_STEP_GUIDES.tasks.example)).toBeTruthy();
        expect(screen.getByText(WIZARD_STEP_GUIDES.tasks.next)).toBeTruthy();
    });

    it('opens, and stays open for that step on the next render', () => {
        const first = render(<StepGuide stepId="hours" />);
        fireEvent.click(screen.getByRole('button', { name: /how this step works/i }));
        expect(screen.getByText(WIZARD_STEP_GUIDES.hours.decide)).toBeTruthy();
        first.unmount();

        render(<StepGuide stepId="hours" />);
        expect(screen.getByRole('button', { name: /how this step works/i }).getAttribute('aria-expanded')).toBe('true');
        expect(screen.getByText(WIZARD_STEP_GUIDES.hours.decide)).toBeTruthy();
        cleanup();

        // Another step is unaffected.
        render(<StepGuide stepId="staff" />);
        expect(screen.queryByText(WIZARD_STEP_GUIDES.staff.decide)).toBeNull();
    });

    it('treats a `collapsed` value left over from before v2.16.1 as the default', () => {
        store.set('nexus.roster.wizardGuide.period', 'collapsed');
        render(<StepGuide stepId="period" />);
        expect(screen.getByRole('button', { name: /how this step works/i }).getAttribute('aria-expanded')).toBe('false');
        // Closing an open guide removes the key rather than writing anything.
        cleanup();
        store.set('nexus.roster.wizardGuide.period', 'open');
        render(<StepGuide stepId="period" />);
        fireEvent.click(screen.getByRole('button', { name: /how this step works/i }));
        expect(store.has('nexus.roster.wizardGuide.period')).toBe(false);
    });

    it('survives storage being unavailable', () => {
        vi.stubGlobal('localStorage', {
            getItem: () => { throw new Error('blocked'); },
            setItem: () => { throw new Error('blocked'); },
            removeItem: () => { throw new Error('blocked'); },
        });
        render(<StepGuide stepId="bands" />);
        expect(screen.queryByText(WIZARD_STEP_GUIDES.bands.decide)).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: /how this step works/i }));
        expect(screen.getByText(WIZARD_STEP_GUIDES.bands.decide)).toBeTruthy();
    });

    it('renders nothing for a step with no guide', () => {
        const { container } = render(<StepGuide stepId="nope" />);
        expect(container.innerHTML).toBe('');
    });

    it('is mounted by WizardStep inside the step, numbered or not', () => {
        render(<WizardStep number={2} label="Dates and length" guide="period"><div>panel</div></WizardStep>);
        expect(document.querySelector('[data-step-guide="period"]')).not.toBeNull();
        expect(screen.getByRole('button', { name: /how this step works/i })).toBeTruthy();
        cleanup();
        render(<WizardStep number={null} guide="period"><div>panel</div></WizardStep>);
        expect(document.querySelector('[data-step-guide="period"]')).not.toBeNull();
    });
});
