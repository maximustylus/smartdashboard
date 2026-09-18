/**
 * ==============================================================================
 * ROSTER VIEW — REASSIGN NOW, END TO END (component tests)
 * ==============================================================================
 * Runner: Vitest + @testing-library/react (jsdom)
 * Run:    npx vitest run src/components/RosterView.reassign.test.jsx
 *
 * ROSTER_TODO.md queue item 3: a lead changes one duty on one day without
 * regenerating, and the change is logged. Cardiology's roster master corrects
 * the week inside the week; until this shipped her only tool was Generate.
 *
 * WHAT IS PINNED HERE:
 *
 *   1. A MEMBERSHIP LEAD WHO IS NOT ON THE SHIFT can open it — the roster master
 *      is a lead and is often not in the pool at all — and is offered "Reassign
 *      now", disabled until a colleague is chosen.
 *   2. REASSIGNING RUNS THE VERIFIED SEQUENCE, IN ORDER: read the roster → write
 *      ONE day → READ THE DOCUMENT BACK → find the change in it → and only THEN
 *      write the change record. Asserted off a call log; the success sentence
 *      quotes the read-back document; the record has the shape `firestore.rules`
 *      pins and a server clock.
 *   3. A WRITE THAT DOES NOT LAND IS NOT LOGGED, and says so.
 *   4. A PLANNER REFUSAL TOUCHES NOTHING — no roster write, no log — and names
 *      the reason.
 *   5. THE LOG FAILING AFTER A VERIFIED ROSTER WRITE is reported as exactly that:
 *      the roster DID change.
 *   6. A STAFF MEMBER IS NEVER OFFERED IT, even on their own shift.
 *   7. THE CHANGE LOG PANEL lists what the listener delivers, and a rules denial
 *      on it is visible (M8).
 *   8. THE SANDBOX reassigns on screen, writes nothing, and says so.
 *
 * `planShiftReassignment` / `findReassignedShift` are NOT re-tested here —
 * `auraEngine.reassign.test.js` owns them. What is tested is that this view
 * calls them in the right order and reports only what came back.
 * ==============================================================================
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, act, within } from '@testing-library/react';

// --- MOCKS (hoisted above the imports below by Vitest) ------------------------

const ctx = vi.hoisted(() => ({ isDemo: false, isLead: false }));

vi.mock('../firebase', () => ({
    db: { __mock: 'firestore-db' },
    auth: { __mock: 'auth' },
    storage: { __mock: 'storage' },
    messaging: { __mock: 'messaging' },
    requestForToken: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
    doc: vi.fn(),
    collection: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    onSnapshot: vi.fn(),
    setDoc: vi.fn(),
    addDoc: vi.fn(),
    getDoc: vi.fn(),
    updateDoc: vi.fn(),
    serverTimestamp: vi.fn(() => 'mock-timestamp'),
}));

vi.mock('../context/NexusContext', () => ({
    useNexus: () => ({ isDemo: ctx.isDemo }),
    NexusProvider: ({ children }) => children,
}));

const TEAM_ID = 'kkh-sport-exercise-medicine';
const TEAM_MEMBERS = [
    { uid: 'uid-brandon', displayName: 'Brandon' },
    { uid: 'uid-derlinder', displayName: 'Derlinder' },
    { uid: 'uid-fadzlynn', displayName: 'Fadzlynn' },
    { uid: 'uid-ying-xian', displayName: 'Ying Xian' },
];
// Hoisted and stable, for the reason `RosterView.coverage.test.jsx` gives: a
// fresh array per call re-runs the live effect forever.
const TEAM_ROSTERED = TEAM_MEMBERS.filter((m) => m.rostered !== false);
const TEAM_UID_BY_NAME = Object.fromEntries(TEAM_MEMBERS.map((m) => [m.displayName, m.uid]));
vi.mock('../context/TeamContext', () => ({
    useTeam: () => ({
        teamId: TEAM_ID,
        members: TEAM_MEMBERS,
        rosteredMembers: TEAM_ROSTERED,
        memberUidByName: TEAM_UID_BY_NAME,
        // The gate under test. `membership.role === 'lead'` in the real provider.
        isLead: ctx.isLead,
    }),
}));

import {
    doc,
    collection,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    setDoc,
    addDoc,
    getDoc,
    updateDoc,
} from 'firebase/firestore';
import RosterView from './RosterView';

// --- FIXTURES ----------------------------------------------------------------

const today = new Date();
const DATE_KEY = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-15`;

const ROSTER_PATH = `teams/${TEAM_ID}/rosters/2026`;
const CHANGES_PATH = `teams/${TEAM_ID}/rosters/2026/changes`;

const MODERN_ROSTER = () => ({
    [DATE_KEY]: [
        { task: 'EFT', week: 1, lead: 'Brandon', coLead: 'Ying Xian', staff: 'Lead: Brandon, Co: Ying Xian', category: 'EFT' },
        { task: 'NC', week: 1, lead: 'Fadzlynn', coLead: 'Ying Xian', staff: 'Lead: Fadzlynn, Co: Ying Xian', category: 'CORE' },
    ],
});

/** The roster master: a membership lead, NOT in the pool, app role plain staff. */
const NISA = { uid: 'uid-nisa', name: 'Nisa', role: 'staff', email: 'nisa@example.org' };
const BRANDON = { uid: 'uid-brandon', name: 'Brandon', role: 'staff', email: 'brandon@example.org' };
const VISITOR = { name: 'Visiting Therapist', role: 'staff', email: 'visitor@example.org' };

// --- MOCK STATE --------------------------------------------------------------

let rosterDoc;
let rosterWritesLand;
let changeDocs;
let changesListener;
let logWriteFails;
/** When set, the first roster read waits until `releaseRosterRead()` is called. */
let holdRosterRead;
let releaseRosterRead;
let callLog;

const clone = (value) => JSON.parse(JSON.stringify(value));

const changesSnapshot = () => ({
    docs: changeDocs.map((entry) => ({ id: entry.id, data: () => ({ ...entry.data }) })),
});

/** The reassignment sequence, with the department's grade reads at mount taken out. */
const sequence = () => callLog.filter((entry) => !entry.includes('/grades/'));

beforeEach(() => {
    vi.clearAllMocks();
    ctx.isDemo = false;
    ctx.isLead = false;
    rosterDoc = MODERN_ROSTER();
    rosterWritesLand = true;
    changeDocs = [];
    changesListener = null;
    logWriteFails = false;
    holdRosterRead = false;
    releaseRosterRead = null;
    callLog = [];

    doc.mockImplementation((_db, ...segments) => ({ __mock: 'docRef', path: segments.join('/') }));
    collection.mockImplementation((_db, ...segments) => ({ __mock: 'collectionRef', path: segments.join('/') }));
    query.mockImplementation((ref, ...constraints) => ({ __mock: 'query', ref, constraints }));
    where.mockImplementation((field, op, value) => ({ __mock: 'where', field, op, value }));
    orderBy.mockImplementation((field, direction) => ({ __mock: 'orderBy', field, direction }));
    limit.mockImplementation((n) => ({ __mock: 'limit', n }));

    // Routed on the ref's PATH, as the coverage test learned to.
    onSnapshot.mockImplementation((target, onNext, onError) => {
        const queryPath = target && target.__mock === 'query' && target.ref ? target.ref.path : '';
        const path = target && typeof target.path === 'string' ? target.path : '';
        if (queryPath.endsWith('/swaps')) {
            onNext({ docs: [] });
        } else if (queryPath.endsWith('/changes')) {
            changesListener = { onNext, onError };
            onNext(changesSnapshot());
        } else if (path === ROSTER_PATH) {
            onNext({ exists: () => true, data: () => clone(rosterDoc) });
        } else if (path.endsWith('/settings/roster')) {
            onNext({ exists: () => false, data: () => undefined });
        }
        return () => {};
    });

    getDoc.mockImplementation((ref) => {
        callLog.push(`getDoc:${ref.path}`);
        if (ref.path === ROSTER_PATH) {
            const snap = { exists: () => true, data: () => clone(rosterDoc) };
            if (holdRosterRead) {
                holdRosterRead = false;
                return new Promise((resolve) => { releaseRosterRead = () => resolve(snap); });
            }
            return Promise.resolve(snap);
        }
        return Promise.resolve({ exists: () => false, data: () => undefined });
    });

    updateDoc.mockImplementation((ref, patch) => {
        callLog.push(`updateDoc:${ref.path}`);
        if (ref.path === ROSTER_PATH && rosterWritesLand) Object.assign(rosterDoc, clone(patch));
        return Promise.resolve();
    });

    addDoc.mockImplementation((ref) => {
        callLog.push(`addDoc:${ref.path}`);
        if (ref.path === CHANGES_PATH && logWriteFails) {
            return Promise.reject(Object.assign(new Error('denied'), { code: 'permission-denied' }));
        }
        return Promise.resolve({ id: 'change-new' });
    });

    setDoc.mockImplementation(() => Promise.resolve());
});

afterEach(() => {
    cleanup();
});

// --- HELPERS -----------------------------------------------------------------

/** Click the calendar chip that renders `task`, opening the modal. */
const openShift = (task) => {
    const label = screen.getAllByText(task)[0];
    const button = label.closest('button');
    fireEvent.click(button);
    return button;
};

const selectOffering = (optionValue) => {
    const option = Array.from(document.querySelectorAll('option')).find(
        (candidate) => candidate.value === optionValue && !candidate.disabled,
    );
    if (!option) throw new Error(`No enabled <option> with value "${optionValue}" is on screen`);
    return option.closest('select');
};

const chooseColleague = (name) => fireEvent.change(selectOffering(name), { target: { value: name } });
const chooseDuty = (role) => fireEvent.change(selectOffering(role), { target: { value: role } });

/** The same button before and during the write: it reads "Reassigning…" in flight. */
const reassignButton = () => screen.getByRole('button', { name: /reassign now|reassigning…/i });
const modal = () => document.querySelector('[data-overlay="swap-modal"]');
const changeLog = () => document.querySelector('[data-roster-view="change-log"]');

const rosterPatches = () =>
    updateDoc.mock.calls.filter(([ref]) => ref.path === ROSTER_PATH).map(([, patch]) => patch);
const logWrites = () =>
    addDoc.mock.calls.filter(([ref]) => ref.path === CHANGES_PATH).map(([, payload]) => payload);

/** The full live path up to the click: a lead opens EFT, picks the duty and the colleague. */
const armReassignment = () => {
    ctx.isLead = true;
    render(<RosterView user={NISA} />);
    openShift('EFT');
    chooseDuty('lead');
    chooseColleague('Derlinder');
};

// ─── 1. WHO IS OFFERED IT ─────────────────────────────────────────────────────

describe('a membership lead who is not on the shift', () => {
    it('can open it, and is offered Reassign now once a colleague is chosen', () => {
        ctx.isLead = true;
        render(<RosterView user={NISA} />);

        const chip = openShift('EFT');
        expect(chip.disabled).toBe(false);
        expect(modal()).not.toBeNull();

        // Both doors are in the one modal.
        expect(screen.getByRole('button', { name: /ask someone to cover|arrange cover/i })).toBeTruthy();
        const reassign = reassignButton();
        expect(reassign.disabled).toBe(true);

        chooseDuty('lead');
        chooseColleague('Derlinder');
        expect(reassignButton().disabled).toBe(false);
        expect(reassignButton().textContent).toMatch(/reassign now to Derlinder/i);
        // The copy says what will happen, in plain words, before the tap.
        expect(screen.getByText(/takes effect immediately, without asking Derlinder/i)).toBeTruthy();
        expect(screen.getByText(/Brandon comes off the lead duty/i)).toBeTruthy();
    });
});

describe('a staff member', () => {
    it('is not offered Reassign now, even on their own shift', () => {
        ctx.isLead = false;
        render(<RosterView user={BRANDON} />);

        openShift('EFT');
        expect(modal()).not.toBeNull();
        expect(screen.getByRole('button', { name: /ask someone to cover/i })).toBeTruthy();
        expect(screen.queryByRole('button', { name: /reassign now/i })).toBeNull();
        expect(screen.queryByText(/or change it now/i)).toBeNull();
    });

    it('still cannot open a colleague\'s shift', () => {
        ctx.isLead = false;
        render(<RosterView user={BRANDON} />);
        const nc = screen.getAllByText('NC')[0].closest('button');
        expect(nc.disabled).toBe(true);
    });
});

// ─── 2. THE VERIFIED SEQUENCE ─────────────────────────────────────────────────

describe('reassigning', () => {
    it('reads, writes ONE day, reads back, and only then logs — and quotes the read-back document', async () => {
        armReassignment();
        fireEvent.click(reassignButton());

        await waitFor(() => expect(screen.getByText(/reassigned, and verified against the master roster/i)).toBeTruthy());

        expect(sequence()).toEqual([
            `getDoc:${ROSTER_PATH}`,
            `updateDoc:${ROSTER_PATH}`,
            `getDoc:${ROSTER_PATH}`,
            `addDoc:${CHANGES_PATH}`,
        ]);

        // One key, one day — the other shift that day untouched.
        const [patch] = rosterPatches();
        expect(Object.keys(patch)).toEqual([DATE_KEY]);
        expect(patch[DATE_KEY][0]).toEqual({
            task: 'EFT', week: 1, lead: 'Derlinder', coLead: 'Ying Xian', staff: 'Lead: Derlinder, Co: Ying Xian', category: 'EFT',
        });
        expect(patch[DATE_KEY][1]).toEqual(MODERN_ROSTER()[DATE_KEY][1]);

        // The record: the shape firestore.rules pins, the actor is the caller, the clock is the server's.
        expect(logWrites()).toEqual([{
            kind: 'reassign',
            dateKey: DATE_KEY,
            task: 'EFT',
            role: 'lead',
            from: 'Brandon',
            to: 'Derlinder',
            before: 'Lead: Brandon, Co: Ying Xian',
            after: 'Lead: Derlinder, Co: Ying Xian',
            reason: '',
            byUid: 'uid-nisa',
            byName: 'Nisa',
            at: 'mock-timestamp',
        }]);

        // The sentence is built from the document that was read back.
        expect(screen.getByText(/now reads “Lead: Derlinder, Co: Ying Xian”/)).toBeTruthy();
        expect(screen.getByText(/Derlinder takes over as lead from Brandon/)).toBeTruthy();
        expect(screen.getByText(/tell them both/i)).toBeTruthy();

        // Done: the modal is gone.
        expect(modal()).toBeNull();
    });

    it('records the reason typed into the modal', async () => {
        armReassignment();
        fireEvent.change(screen.getByPlaceholderText(/attending a medical conference/i), { target: { value: 'Sick leave' } });
        fireEvent.click(reassignButton());

        await waitFor(() => expect(logWrites()).toHaveLength(1));
        expect(logWrites()[0].reason).toBe('Sick leave');
    });

    it('a write that does not land is NOT logged, and says so', async () => {
        rosterWritesLand = false;
        armReassignment();
        fireEvent.click(reassignButton());

        await waitFor(() => expect(screen.getByText(/could not find it when it read the roster back/i)).toBeTruthy());
        expect(screen.getByText(/has NOT logged it/)).toBeTruthy();
        expect(sequence()).toEqual([
            `getDoc:${ROSTER_PATH}`,
            `updateDoc:${ROSTER_PATH}`,
            `getDoc:${ROSTER_PATH}`,
        ]);
        expect(logWrites()).toEqual([]);
        // Still open: nothing was done.
        expect(modal()).not.toBeNull();
    });

    it('a refusal from the planner touches nothing and names the reason', async () => {
        ctx.isLead = true;
        render(<RosterView user={NISA} />);
        openShift('EFT');
        chooseDuty('lead');
        chooseColleague('Derlinder');

        // Between the calendar being drawn and the click, somebody else moved Brandon.
        rosterDoc[DATE_KEY][0] = {
            ...rosterDoc[DATE_KEY][0], lead: 'Fadzlynn', staff: 'Lead: Fadzlynn, Co: Ying Xian',
        };
        fireEvent.click(reassignButton());

        await waitFor(() => expect(screen.getByText(/not reassigned — the roster is unchanged/i)).toBeTruthy());
        expect(screen.getByText(/Brandon is no longer on the EFT shift/)).toBeTruthy();
        expect(sequence()).toEqual([`getDoc:${ROSTER_PATH}`]);
        expect(rosterPatches()).toEqual([]);
        expect(logWrites()).toEqual([]);
        expect(modal()).not.toBeNull();
    });

    it('the log failing AFTER a verified roster write is reported as "the roster DID change"', async () => {
        logWriteFails = true;
        armReassignment();
        fireEvent.click(reassignButton());

        await waitFor(() => expect(screen.getByText(/roster DID change/)).toBeTruthy());
        expect(screen.getByText(/permission-denied/)).toBeTruthy();
        expect(screen.getByText(/the change log will not show it/i)).toBeTruthy();
        // The roster really was written and read back before the log was tried.
        expect(sequence()).toEqual([
            `getDoc:${ROSTER_PATH}`,
            `updateDoc:${ROSTER_PATH}`,
            `getDoc:${ROSTER_PATH}`,
            `addDoc:${CHANGES_PATH}`,
        ]);
        expect(rosterDoc[DATE_KEY][0].lead).toBe('Derlinder');
    });

    it('a second tap while the first is in flight does nothing', async () => {
        armReassignment();
        // Hold the first read open so the sequence is genuinely in flight when the
        // second tap lands — resolved mocks would otherwise finish inside the
        // first click's act() and the second tap would find the modal gone.
        holdRosterRead = true;
        fireEvent.click(reassignButton());
        expect(reassignButton().disabled).toBe(true);
        expect(reassignButton().textContent).toMatch(/reassigning…/i);
        fireEvent.click(reassignButton());

        await act(async () => { releaseRosterRead(); });
        await waitFor(() => expect(screen.getByText(/reassigned, and verified/i)).toBeTruthy());
        expect(rosterPatches()).toHaveLength(1);
        expect(logWrites()).toHaveLength(1);
    });
});

// ─── 3. THE CHANGE LOG PANEL ──────────────────────────────────────────────────

describe('the change log panel', () => {
    it('subscribes newest-first with a cap, and lists what the listener delivers', () => {
        changeDocs = [
            { id: 'c2', data: { kind: 'reassign', dateKey: DATE_KEY, task: 'EFT', role: 'lead', from: 'Brandon', to: 'Derlinder', reason: 'sick leave', byName: 'Nisa', at: { toDate: () => new Date('2026-03-09T09:00:00+08:00') } } },
            { id: 'c1', data: { kind: 'reassign', dateKey: DATE_KEY, task: 'NC', role: 'coLead', from: 'Ying Xian', to: 'Brandon', reason: '', byName: 'Nisa', at: null } },
        ];
        render(<RosterView user={BRANDON} />);

        expect(collection).toHaveBeenCalledWith(expect.anything(), 'teams', TEAM_ID, 'rosters', '2026', 'changes');
        expect(orderBy).toHaveBeenCalledWith('at', 'desc');
        expect(limit).toHaveBeenCalledWith(20);

        const panel = changeLog();
        expect(panel).not.toBeNull();
        expect(within(panel).getByText(/changed by hand \(2\)/i)).toBeTruthy();
        const items = panel.querySelectorAll('[data-roster-change]');
        expect(items).toHaveLength(2);
        expect(items[0].textContent).toMatch(/EFT on .*: Derlinder took over as lead from Brandon — sick leave \(changed by Nisa\)\./);
        expect(items[1].textContent).toMatch(/NC on .*: Brandon took over as co-lead from Ying Xian \(changed by Nisa\)\./);
    });

    it('renders nothing when there is nothing to show', () => {
        render(<RosterView user={BRANDON} />);
        expect(changeLog()).toBeNull();
    });

    it('a rules denial on the log is visible, not an empty panel (M8)', async () => {
        render(<RosterView user={BRANDON} />);
        await act(async () => {
            changesListener.onError({ code: 'permission-denied', message: 'denied' });
        });
        expect(within(changeLog()).getByText(/do not have permission to read the roster change log/i)).toBeTruthy();
        expect(within(changeLog()).getByText(/not because nothing has been changed by hand/i)).toBeTruthy();
    });

    it('shows a change this session made, once the listener delivers it', async () => {
        armReassignment();
        fireEvent.click(reassignButton());
        await waitFor(() => expect(logWrites()).toHaveLength(1));

        changeDocs = [{ id: 'change-new', data: { ...logWrites()[0], at: { toDate: () => new Date() } } }];
        await act(async () => {
            changesListener.onNext(changesSnapshot());
        });
        expect(within(changeLog()).getByText(/Derlinder took over as lead from Brandon/)).toBeTruthy();
    });
});

// ─── 4. THE SANDBOX ───────────────────────────────────────────────────────────

describe('in the sandbox', () => {
    it('reassigns on screen, writes nothing, and lists the change as this session\'s', async () => {
        ctx.isDemo = true;
        render(<RosterView user={VISITOR} />);

        fireEvent.click(screen.getByRole('button', { name: /configure/i }));
        fireEvent.change(screen.getByLabelText(/shape to start from/i), { target: { value: 'marvel-worked-example' } });
        fireEvent.click(screen.getByRole('button', { name: /^draft roster$/i }));

        // Any staffed chip in the drafted month will do; the sandbox lets every one open.
        const chip = Array.from(document.querySelectorAll('[data-date] button')).find((b) => !b.disabled);
        expect(chip, 'the sandbox drafted no shift into the visible month').toBeTruthy();
        fireEvent.click(chip);
        expect(modal()).not.toBeNull();

        // Pick a duty if the shift has two, then the first colleague on offer.
        const dutyOption = Array.from(document.querySelectorAll('option')).find((o) => o.value === 'lead' && !o.disabled);
        if (dutyOption) chooseDuty('lead');
        const colleagueSelect = Array.from(document.querySelectorAll('select')).find((s) =>
            Array.from(s.options).some((o) => /select a colleague/i.test(o.textContent)));
        const firstColleague = Array.from(colleagueSelect.options).find((o) => !o.disabled && o.value !== '');
        fireEvent.change(colleagueSelect, { target: { value: firstColleague.value } });

        expect(screen.getByText(/sandbox: changes the roster on this screen only/i)).toBeTruthy();
        fireEvent.click(reassignButton());

        await waitFor(() => expect(screen.getByText(/^Sandbox: the .+ shift on .+ now reads/)).toBeTruthy());
        expect(screen.getByText(/nothing was saved/i)).toBeTruthy();

        // Nothing touched Firestore.
        expect(getDoc).not.toHaveBeenCalled();
        expect(updateDoc).not.toHaveBeenCalled();
        expect(addDoc).not.toHaveBeenCalled();
        expect(onSnapshot).not.toHaveBeenCalled();

        // And the on-screen roster moved: the new name is in the chip that was clicked.
        expect(chip.textContent).toContain(firstColleague.value);

        const panel = changeLog();
        expect(within(panel).getByText(/changed by hand this session \(1\)/i)).toBeTruthy();
        expect(within(panel).getByText(new RegExp(`${firstColleague.value} took over as`))).toBeTruthy();
        expect(within(panel).getByText(/live on this screen only/i)).toBeTruthy();
    });
});
