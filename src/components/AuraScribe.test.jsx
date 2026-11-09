/**
 * AURA SCRIBE, the drawing — it renders the state it is given, says it aloud,
 * and never inks what the person has not confirmed.
 * Run: npx vitest run src/components/AuraScribe.test.jsx
 */
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import AuraScribe, { AuraScribeGlyph } from './AuraScribe';
import { SCRIBE_STATES, STATE_NAMES } from '../utils/auraScribe';

const svg = (c) => c.querySelector('svg.aura-scribe');
const reduceMotion = (on) => {
    window.matchMedia = vi.fn(() => ({ matches: on, addEventListener() {}, removeEventListener() {} }));
};

afterEach(() => { cleanup(); vi.useRealTimers(); delete window.matchMedia; });

describe('AuraScribe', () => {
    it.each(STATE_NAMES)('%s: says its sentence and carries its state', (state) => {
        const { container } = render(<AuraScribe state={state} />);
        expect(svg(container).getAttribute('role')).toBe('img');
        expect(svg(container).getAttribute('aria-label')).toBe(SCRIBE_STATES[state]);
        expect(svg(container).dataset.state).toBe(state);
    });

    it('an unknown state reads as ready, not as nothing', () => {
        const { container } = render(<AuraScribe state="nonsense" />);
        expect(svg(container).getAttribute('aria-label')).toBe(SCRIBE_STATES.idle);
    });

    it('a proposal is pencilled; only approve inks it', () => {
        reduceMotion(true); // scripts complete at once
        const { container, rerender } = render(<AuraScribe state="propose" proposal="62%" />);
        const value = () => [...container.querySelectorAll('text')].find((t) => t.textContent === '62%');
        expect(value().classList.contains('on')).toBe(true);
        expect(value().classList.contains('ink')).toBe(false);
        rerender(<AuraScribe state="approve" proposal="62%" />);
        expect(value().classList.contains('ink')).toBe(true);
        rerender(<AuraScribe state="refuse" proposal="62%" />);
        expect(value().classList.contains('ink')).toBe(false);
        expect(value().style.opacity).toBe('0');
    });

    it('Ghost Protocol is unbound; the phase tint reaches the cover', () => {
        const { container } = render(<AuraScribe state="propose" ghost tint="#f4b4b4" />);
        expect(svg(container).dataset.ghost).toBe('true');
        expect(svg(container).style.getPropertyValue('--cover')).toBe('#f4b4b4');
    });

    it('taps only while typing, and stops when typing stops', () => {
        reduceMotion(false);
        vi.useFakeTimers();
        const { container, rerender } = render(<AuraScribe state="typing" draftLength={0} />);
        expect(svg(container).dataset.tapping).toBe('true');
        const lift = () => container.querySelector('.hover > g').style.transform;
        expect(lift()).toBe('translateY(0px)');
        act(() => { vi.advanceTimersByTime(400); });
        expect(lift()).toBe('translateY(-2.5px)');
        act(() => { vi.advanceTimersByTime(200); });
        expect(lift()).toBe('translateY(0px)');
        // Next tap is the base 4.5s after the first (t = 4.9s), not sooner.
        act(() => { vi.advanceTimersByTime(4250); }); // t = 4.85s
        expect(lift()).toBe('translateY(0px)');
        act(() => { vi.advanceTimersByTime(100); }); // t = 4.95s
        expect(lift()).toBe('translateY(-2.5px)');
        rerender(<AuraScribe state="listen" />);
        expect(svg(container).dataset.tapping).toBe('false');
        expect(lift()).toBe('translateY(0px)');
    });

    it('with reduced motion, the tap is left to the CSS breath', () => {
        reduceMotion(true);
        vi.useFakeTimers();
        const { container } = render(<AuraScribe state="typing" />);
        act(() => { vi.advanceTimersByTime(10000); });
        expect(container.querySelector('.hover > g').style.transform).toBe('translateY(0px)');
        expect(svg(container).dataset.tapping).toBe('true');
    });

    it('the launcher glyph is decorative', () => {
        const { container } = render(<AuraScribeGlyph />);
        expect(container.querySelector('svg').getAttribute('aria-hidden')).toBe('true');
    });
});
