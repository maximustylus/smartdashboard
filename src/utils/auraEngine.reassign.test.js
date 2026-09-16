/**
 * ==============================================================================
 * DIRECT REASSIGNMENT BY A LEAD — the pure half (ROSTER_TODO.md queue item 3)
 * ==============================================================================
 * Runner: Vitest
 * Run:    npx vitest run src/utils/auraEngine.reassign.test.js
 *
 * `planShiftReassignment` is a one-party version of `planSwapApplication`: the
 * lead decides, nobody is asked, and the roster moves. It MUST make the same
 * substitution the swap planner makes on the same roster — the substitution rule
 * has one home (`applyShiftSubstitution`) and two callers, and this file is what
 * stops the two callers drifting apart. Section 1 pins that parity directly.
 *
 * The rest pins what a lead can rely on: every refusal names its reason and
 * touches nothing; the legacy shape is upgraded on write exactly as a swap
 * upgrades it; the read-back finder is the swap finder; and the change record
 * has the shape `firestore.rules` pins, with NO clock — the clock is the
 * server's, set at the call site.
 * ==============================================================================
 */

import { describe, it, expect } from 'vitest';
import {
    planShiftReassignment,
    planSwapApplication,
    findReassignedShift,
    findAppliedSwapShift,
    buildRosterChangeRecord,
    describeRosterChange,
    readRosterChanges,
    buildShiftStaffLabel,
    ROSTER_CHANGE_KIND_REASSIGN,
    SHIFT_ROLE_LEAD,
    SHIFT_ROLE_CO_LEAD,
} from './auraEngine';

// --- FIXTURES ----------------------------------------------------------------

const DATE = '2026-03-09';

const modernRoster = () => ({
    [DATE]: [
        { task: 'EFT', week: 1, lead: 'Brandon', coLead: 'Ying Xian', staff: 'Lead: Brandon, Co: Ying Xian', category: 'EFT' },
        { task: 'NC', week: 1, lead: 'Fadzlynn', coLead: 'Ying Xian', staff: 'Lead: Fadzlynn, Co: Ying Xian', category: 'CORE' },
    ],
    '2026-03-10': [
        { task: 'EFT', week: 1, lead: 'Derlinder', staff: 'Lead: Derlinder', category: 'EFT' },
    ],
});

const legacyRoster = () => ({
    [DATE]: [{ task: 'EFT', week: 1, staff: 'Brandon', category: 'EFT' }],
});

const reassign = (overrides = {}) => planShiftReassignment({
    roster: modernRoster(),
    dateKey: DATE,
    task: 'EFT',
    role: SHIFT_ROLE_LEAD,
    from: 'Brandon',
    to: 'Derlinder',
    ...overrides,
});

// ─── 1. PARITY WITH THE SWAP PLANNER ──────────────────────────────────────────

describe('planShiftReassignment — the same substitution an accepted swap makes', () => {
    const cases = [
        ['lead of a two-person shift', { task: 'EFT', role: SHIFT_ROLE_LEAD, from: 'Brandon', to: 'Derlinder' }],
        ['co-lead of a two-person shift', { task: 'EFT', role: SHIFT_ROLE_CO_LEAD, from: 'Ying Xian', to: 'Derlinder' }],
        ['co-lead who is on two shifts that day (only the named task moves)', { task: 'NC', role: SHIFT_ROLE_CO_LEAD, from: 'Ying Xian', to: 'Brandon' }],
    ];

    it.each(cases)('%s: the new day array is byte-identical to the swap planner\'s', (_label, args) => {
        const viaReassign = planShiftReassignment({ roster: modernRoster(), dateKey: DATE, ...args });
        const viaSwap = planSwapApplication({
            roster: modernRoster(),
            swap: { originalShiftDate: DATE, originalTask: args.task, requestedBy: args.from, swapRole: args.role },
            coveringStaff: args.to,
        });

        expect(viaReassign.ok).toBe(true);
        expect(viaSwap.ok).toBe(true);
        expect(viaReassign.shifts).toEqual(viaSwap.shifts);
        expect(viaReassign.index).toBe(viaSwap.index);
        expect(viaReassign.role).toBe(viaSwap.role);
    });

    it('a legacy bare-`staff` shift is upgraded on write, exactly as a swap upgrades it', () => {
        const viaReassign = planShiftReassignment({ roster: legacyRoster(), dateKey: DATE, task: 'EFT', role: SHIFT_ROLE_LEAD, from: 'Brandon', to: 'Derlinder' });
        const viaSwap = planSwapApplication({
            roster: legacyRoster(),
            swap: { originalShiftDate: DATE, originalTask: 'EFT', requestedBy: 'Brandon', swapRole: SHIFT_ROLE_LEAD },
            coveringStaff: 'Derlinder',
        });

        expect(viaReassign.shifts).toEqual(viaSwap.shifts);
        expect(viaReassign.shifts[0]).toMatchObject({ lead: 'Derlinder', staff: 'Lead: Derlinder' });
        expect('coLead' in viaReassign.shifts[0]).toBe(false);
        // The log reads the bare name as it was, not a label invented for it.
        expect(viaReassign.before).toBe('Brandon');
        expect(viaReassign.after).toBe('Lead: Derlinder');
    });

    it('a legacy shift is reassignable even when the caller says coLead — there is only one duty on it', () => {
        const plan = planShiftReassignment({ roster: legacyRoster(), dateKey: DATE, task: 'EFT', role: SHIFT_ROLE_LEAD, from: 'Brandon', to: 'Derlinder' });
        expect(plan.ok).toBe(true);
        expect(plan.role).toBe(SHIFT_ROLE_LEAD);
    });
});

// ─── 2. WHAT A SUCCESSFUL PLAN CARRIES ────────────────────────────────────────

describe('planShiftReassignment — the plan', () => {
    it('changes ONE shift on ONE day and nothing else', () => {
        const roster = modernRoster();
        const plan = planShiftReassignment({ roster, dateKey: DATE, task: 'EFT', role: SHIFT_ROLE_LEAD, from: 'Brandon', to: 'Derlinder' });

        expect(plan.ok).toBe(true);
        expect(plan.dateKey).toBe(DATE);
        expect(plan.index).toBe(0);
        expect(plan.shifts).toHaveLength(2);
        expect(plan.shifts[0]).toEqual({
            task: 'EFT', week: 1, lead: 'Derlinder', coLead: 'Ying Xian', staff: 'Lead: Derlinder, Co: Ying Xian', category: 'EFT',
        });
        // The other shift that day is the same object, untouched.
        expect(plan.shifts[1]).toBe(roster[DATE][1]);
        // And the input roster was not mutated: a plan is a proposal.
        expect(roster[DATE][0].lead).toBe('Brandon');
    });

    it('records before and after labels for the log, from the shift\'s own text', () => {
        const plan = reassign();
        expect(plan.before).toBe('Lead: Brandon, Co: Ying Xian');
        expect(plan.after).toBe('Lead: Derlinder, Co: Ying Xian');
        expect(plan.after).toBe(buildShiftStaffLabel('Derlinder', 'Ying Xian'));
    });

    it('a modern shift with no `staff` label still gets a `before` built from its identities', () => {
        const roster = { [DATE]: [{ task: 'EFT', lead: 'Brandon', coLead: 'Ying Xian' }] };
        const plan = planShiftReassignment({ roster, dateKey: DATE, task: 'EFT', role: SHIFT_ROLE_LEAD, from: 'Brandon', to: 'Derlinder' });
        expect(plan.before).toBe('Lead: Brandon, Co: Ying Xian');
    });
});

// ─── 3. EVERY REFUSAL NAMES ITS REASON AND TOUCHES NOTHING ────────────────────

describe('planShiftReassignment — refusals', () => {
    const expectRefusal = (plan, pattern) => {
        expect(plan.ok).toBe(false);
        expect(plan.reason).toMatch(pattern);
        expect(plan.shifts).toBeNull();
        expect(plan.dateKey).toBeNull();
        expect(plan.index).toBe(-1);
    };

    it('no date or task', () => {
        expectRefusal(reassign({ dateKey: '' }), /missing date or duty/i);
        expectRefusal(reassign({ task: null }), /missing date or duty/i);
    });

    it('a role that is not lead or coLead', () => {
        expectRefusal(reassign({ role: 'assignee' }), /which duty on the shift/i);
        expectRefusal(reassign({ role: undefined }), /which duty on the shift/i);
    });

    it('nobody to take off, or nobody to put on', () => {
        expectRefusal(reassign({ from: '' }), /who is being taken off/i);
        expectRefusal(reassign({ to: '  ' }), /choose who takes over/i);
    });

    it('the same person both sides', () => {
        expectRefusal(reassign({ to: 'Brandon' }), /already holds that duty/i);
    });

    it('no roster document', () => {
        expectRefusal(reassign({ roster: null }), /could not be read/i);
        expectRefusal(reassign({ roster: 'nope' }), /could not be read/i);
    });

    it('a day the roster does not store', () => {
        expectRefusal(reassign({ dateKey: '2026-03-11' }), /no shifts stored on 2026-03-11/i);
        expectRefusal(reassign({ roster: { [DATE]: [] } }), /no shifts stored/i);
    });

    it('a task not on that day', () => {
        expectRefusal(reassign({ task: 'CPET' }), /no CPET shift on 2026-03-09/i);
    });

    it('the outgoing person is not on that shift', () => {
        expectRefusal(reassign({ from: 'Derlinder', to: 'Fadzlynn' }), /Derlinder is no longer on the EFT shift/i);
    });

    it('the outgoing person holds the OTHER duty — refuse rather than guess', () => {
        // Brandon is the lead; the caller says coLead.
        expectRefusal(reassign({ role: SHIFT_ROLE_CO_LEAD }), /Brandon is now the lead of the EFT shift on 2026-03-09, not the co-lead/i);
    });

    it('the incoming person already holds the other duty on the same shift', () => {
        expectRefusal(reassign({ to: 'Ying Xian' }), /Ying Xian is already the co-lead of the EFT shift/i);
        expectRefusal(reassign({ role: SHIFT_ROLE_CO_LEAD, from: 'Ying Xian', to: 'Brandon' }), /Brandon is already the lead of the EFT shift/i);
    });

    it('never mutates the roster it was given, on any refusal', () => {
        const roster = modernRoster();
        const snapshot = JSON.stringify(roster);
        reassign({ roster, to: 'Ying Xian' });
        reassign({ roster, role: SHIFT_ROLE_CO_LEAD });
        reassign({ roster, task: 'CPET' });
        expect(JSON.stringify(roster)).toBe(snapshot);
    });
});

// ─── 4. THE READ-BACK FINDER IS THE SWAP FINDER ───────────────────────────────

describe('findReassignedShift — evidence after a read-back', () => {
    it('finds the shift once the plan has been applied', () => {
        const plan = reassign();
        const written = { ...modernRoster(), [DATE]: plan.shifts };

        const found = findReassignedShift({ roster: written, dateKey: DATE, task: 'EFT', role: SHIFT_ROLE_LEAD, from: 'Brandon', to: 'Derlinder' });
        expect(found).toEqual(plan.shifts[0]);
    });

    it('returns null when the document still reads as it did — a write that did not land is not success', () => {
        const found = findReassignedShift({ roster: modernRoster(), dateKey: DATE, task: 'EFT', role: SHIFT_ROLE_LEAD, from: 'Brandon', to: 'Derlinder' });
        expect(found).toBeNull();
    });

    it('is the swap finder with a synthetic request, so "it landed" has one definition', () => {
        const plan = reassign();
        const written = { ...modernRoster(), [DATE]: plan.shifts };
        const args = { roster: written, dateKey: DATE, task: 'EFT', role: SHIFT_ROLE_LEAD, from: 'Brandon', to: 'Derlinder' };

        expect(findReassignedShift(args)).toEqual(findAppliedSwapShift({
            roster: written,
            swap: { originalShiftDate: DATE, originalTask: 'EFT', requestedBy: 'Brandon' },
            coveringStaff: 'Derlinder',
            role: SHIFT_ROLE_LEAD,
        }));
    });
});

// ─── 5. THE CHANGE RECORD — the shape firestore.rules pins, minus the clock ───

describe('buildRosterChangeRecord', () => {
    const actor = { uid: 'uid-alif', name: 'Alif', email: 'alif@example.org' };

    it('carries everything the rule checks, and no `at` — the clock is the server\'s', () => {
        const plan = reassign();
        const record = buildRosterChangeRecord({ plan, task: 'EFT', from: 'Brandon', to: 'Derlinder', reason: 'sick leave', actor });

        expect(record).toEqual({
            kind: ROSTER_CHANGE_KIND_REASSIGN,
            dateKey: DATE,
            task: 'EFT',
            role: SHIFT_ROLE_LEAD,
            from: 'Brandon',
            to: 'Derlinder',
            before: 'Lead: Brandon, Co: Ying Xian',
            after: 'Lead: Derlinder, Co: Ying Xian',
            reason: 'sick leave',
            byUid: 'uid-alif',
            byName: 'Alif',
        });
        expect('at' in record).toBe(false);
    });

    it('an empty reason is stored as an empty string, never undefined (M7)', () => {
        const record = buildRosterChangeRecord({ plan: reassign(), task: 'EFT', from: 'Brandon', to: 'Derlinder', reason: undefined, actor });
        expect(record.reason).toBe('');
        expect(Object.values(record).some((v) => v === undefined)).toBe(false);
    });

    it('falls back from name to email to a fixed string for the actor', () => {
        const base = { plan: reassign(), task: 'EFT', from: 'Brandon', to: 'Derlinder' };
        expect(buildRosterChangeRecord({ ...base, actor: { uid: 'u', email: 'x@y.z' } }).byName).toBe('x@y.z');
        expect(buildRosterChangeRecord({ ...base, actor: { uid: 'u' } }).byName).toBe('Unknown User');
        expect(buildRosterChangeRecord({ ...base, actor: null }).byUid).toBeNull();
    });

    it('refuses to build a record for a plan that was refused', () => {
        expect(buildRosterChangeRecord({ plan: reassign({ to: 'Brandon' }), task: 'EFT', from: 'Brandon', to: 'Brandon', actor })).toBeNull();
        expect(buildRosterChangeRecord({ plan: null, actor })).toBeNull();
    });
});

describe('describeRosterChange', () => {
    it('reads as one sentence with the day formatted for a clinician', () => {
        expect(describeRosterChange({
            kind: 'reassign', dateKey: DATE, task: 'EFT', role: SHIFT_ROLE_LEAD, from: 'Brandon', to: 'Derlinder', reason: 'sick leave', byName: 'Alif',
        })).toBe('EFT on Mon 9 Mar 2026: Derlinder took over as lead from Brandon — sick leave (changed by Alif).');
    });

    it('omits the clauses it has no words for', () => {
        expect(describeRosterChange({
            dateKey: DATE, task: 'NC', role: SHIFT_ROLE_CO_LEAD, from: 'Ying Xian', to: 'Brandon', reason: '', byName: '',
        })).toBe('NC on Mon 9 Mar 2026: Brandon took over as co-lead from Ying Xian.');
    });

    it('returns null rather than a sentence with "undefined" in it', () => {
        expect(describeRosterChange(null)).toBeNull();
        expect(describeRosterChange({ task: 'EFT' })).toBeNull();
        expect(describeRosterChange({ dateKey: DATE, task: 'EFT', to: 'X' })).toBeNull();
    });
});

// ─── 6. READING THE LOG BACK ──────────────────────────────────────────────────

describe('readRosterChanges', () => {
    const entry = (id, data) => ({ id, data: () => data });
    const ts = (date) => ({ toDate: () => date });

    it('turns a snapshot into plain records with a Date, keeping the query order', () => {
        const first = new Date('2026-03-09T09:00:00+08:00');
        const second = new Date('2026-03-08T09:00:00+08:00');
        const out = readRosterChanges({ docs: [
            entry('c2', { kind: 'reassign', task: 'EFT', at: ts(first) }),
            entry('c1', { kind: 'reassign', task: 'NC', at: ts(second) }),
        ] });
        expect(out.map((c) => c.docId)).toEqual(['c2', 'c1']);
        expect(out[0].at).toBe(first);
        expect(out[1].task).toBe('NC');
    });

    it('a record whose server clock has not arrived yet has `at: null`, not a crash', () => {
        const out = readRosterChanges({ docs: [entry('c1', { kind: 'reassign', at: null })] });
        expect(out[0].at).toBeNull();
    });

    it('tolerates an empty or malformed snapshot', () => {
        expect(readRosterChanges(null)).toEqual([]);
        expect(readRosterChanges({})).toEqual([]);
        expect(readRosterChanges({ docs: [null, {}, entry('x', null)] })).toEqual([]);
    });
});
