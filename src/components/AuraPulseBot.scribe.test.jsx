/**
 * ==============================================================================
 * AURA PULSE BOT — THE ANIMATED AURA, WIRED
 * ==============================================================================
 * Run: npx vitest run src/components/AuraPulseBot.scribe.test.jsx
 *
 * `auraScribe.test.js` proves the decisions; this proves the panel feeds them
 * what is on screen: off by default, on with `?scribe=1`, and the pencil's
 * state follows real turns through the mounted panel.
 * ==============================================================================
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

const ctx = vi.hoisted(() => ({ isDemo: false, teamId: 'team-1' }));
const callable = vi.hoisted(() => ({ fn: null }));

vi.mock('../firebase', () => ({
    db: { __mock: 'firestore-db' },
    auth: { __mock: 'auth' },
    storage: { __mock: 'storage' },
    messaging: { __mock: 'messaging' },
    requestForToken: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
    doc: vi.fn(() => ({ __mock: 'docRef' })),
    setDoc: vi.fn(() => Promise.resolve()),
    getDoc: vi.fn(() => Promise.resolve({ exists: () => false })),
    updateDoc: vi.fn(() => Promise.resolve()),
    deleteField: vi.fn(() => ({ __mock: 'deleteField' })),
    arrayUnion: vi.fn((value) => ({ __mock: 'arrayUnion', value })),
    collection: vi.fn(() => ({ __mock: 'collectionRef' })),
    query: vi.fn(() => ({ __mock: 'query' })),
    where: vi.fn(() => ({ __mock: 'where' })),
    onSnapshot: vi.fn(() => () => {}),
    serverTimestamp: vi.fn(() => 'mock-timestamp'),
}));

vi.mock('firebase/functions', () => ({
    getFunctions: vi.fn(() => ({ __mock: 'functions' })),
    httpsCallable: vi.fn(() => (...args) => callable.fn(...args)),
}));

vi.mock('docx', () => ({
    Document: class {}, Packer: { toBlob: vi.fn() }, Paragraph: class {},
    TextRun: class {}, HeadingLevel: {}, AlignmentType: {},
}));

vi.mock('../context/NexusContext', async () => {
    const ReactModule = await import('react');
    return {
        useNexus: () => {
            const [auraHistory, setAuraHistory] = ReactModule.useState([]);
            return { isDemo: ctx.isDemo, auraHistory, setAuraHistory };
        },
        NexusProvider: ({ children }) => children,
    };
});

vi.mock('../context/TeamContext', () => ({ useTeam: () => ({ teamId: ctx.teamId }) }));

import AuraPulseBot from './AuraPulseBot';
import AuraGreeting from './AuraGreeting';

const USER = { uid: 'uid-alif', id: 'alif', name: 'Alif', title: 'Clinical Exercise Physiologist' };

const reply = (over = {}) => Promise.resolve({
    data: {
        text: JSON.stringify({
            reply: 'Here you go.', mode: 'ASSISTANT', diagnosis_ready: false, phase: null, energy: null,
            action: null,
            db_workload: { target_collection: null, target_doc: null, target_field: null, target_value: null, target_month: null },
            ...over,
        }),
        provenanceFooter: '',
    },
});

let clock = Date.now();
const tick = (ms) => { clock += ms; vi.setSystemTime(clock); };

const scribe = () => document.querySelector('[data-testid="aura-scribe-strip"] svg.aura-scribe');
const label = () => scribe()?.getAttribute('aria-label');

const openSession = () => fireEvent.click(screen.getByRole('listbox').querySelector('button'));
const typeOut = (text) => {
    const input = screen.getByPlaceholderText(/ask aura/i);
    for (let i = 1; i <= text.length; i++) { tick(120); fireEvent.change(input, { target: { value: text.slice(0, i) } }); }
};
const send = () => {
    const button = [...document.querySelectorAll('button')].find((b) => b.querySelector('.lucide-send'));
    tick(2050);
    fireEvent.click(button);
};

let scrollIntoView;
beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    window.history.replaceState({}, '', '/');
    clock = Date.now();
    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['Date'] });
    vi.setSystemTime(clock);
    scrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
    vi.useRealTimers();
    cleanup();
    window.history.replaceState({}, '', '/');
    Element.prototype.scrollIntoView = scrollIntoView;
});

describe('the animated AURA in the panel', () => {
    it('is off by default: no strip, the old launcher', () => {
        render(<AuraPulseBot isOpen onClose={() => {}} onOpen={() => {}} user={USER} />);
        openSession();
        expect(document.querySelector('[data-testid="aura-scribe-strip"]')).toBeNull();
        cleanup();
        const { container } = render(<AuraGreeting openAuraChat={() => {}} />);
        expect(container.querySelector('.aura-scribe-glyph')).toBeNull();
        expect(container.querySelector('.animate-ping')).toBeTruthy();
    });

    it('?scribe=1 turns it on, and the launcher becomes the still notebook', () => {
        window.history.replaceState({}, '', '/?scribe=1');
        const { container } = render(<AuraGreeting openAuraChat={() => {}} />);
        expect(container.querySelector('.aura-scribe-glyph')).toBeTruthy();
        expect(container.querySelector('.animate-ping')).toBeNull();
        expect(screen.getByRole('button', { name: 'Open AURA' })).toBeTruthy();
        expect(localStorage.getItem('nexus.auraScribe')).toBe('1');
    });

    it('listens to typing, thinks while the model works, then drafts in pencil', async () => {
        window.history.replaceState({}, '', '/?scribe=1');
        let release;
        callable.fn = vi.fn(() => new Promise((r) => { release = () => r(reply({ action: 'SOP: Rooming\n1. Purpose' })); }));
        render(<AuraPulseBot isOpen onClose={() => {}} onOpen={() => {}} user={USER} />);
        openSession();
        expect(scribe()).toBeTruthy();

        typeOut('Draft an SOP'); // exactly 12 keystrokes
        expect(label()).toBe('AURA is listening.');

        send();
        await waitFor(() => expect(label()).toBe('AURA is thinking.'));
        release();
        await waitFor(() => expect(label()).toMatch(/drafted a document in pencil/));
    });

    it('a few keystrokes are not enough to make it listen', () => {
        window.history.replaceState({}, '', '/?scribe=1');
        render(<AuraPulseBot isOpen onClose={() => {}} onOpen={() => {}} user={USER} />);
        openSession();
        typeOut('Hi there');
        expect(label()).not.toBe('AURA is listening.');
    });

    it('an unreachable model snaps the lead', async () => {
        window.history.replaceState({}, '', '/?scribe=1');
        callable.fn = vi.fn(() => Promise.reject(Object.assign(new Error('unavailable'), { code: 'functions/unavailable' })));
        render(<AuraPulseBot isOpen onClose={() => {}} onOpen={() => {}} user={USER} />);
        openSession();
        typeOut('Are you there?');
        send();
        await waitFor(() => expect(label()).toBe('AURA could not reach the model.'), { timeout: 4000 });
    });
});
