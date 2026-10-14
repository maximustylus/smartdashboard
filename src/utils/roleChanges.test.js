/**
 * ==============================================================================
 * ROLE CHANGES — the panel's copy of the server rule, held to the server (v2.18.0)
 * ==============================================================================
 * Run: npx vitest run src/utils/roleChanges.test.js
 *
 * `roleChangeBlockedReason` exists so the Team panel can explain an unavailable
 * choice before Save. It must refuse exactly what `assertRoleChangeable` refuses,
 * or the panel either lets a lead press a button the server will reject or greys
 * out a change the server would allow. The parity block runs both on one table.
 * ==============================================================================
 */

import { describe, it, expect } from 'vitest';
import {
    roleOf,
    roleChangeBlockedReason,
    readRoleChanges,
    describeRoleChange,
    MEMBER_ROLE_VALUES,
} from './roleChanges';
import { assertRoleChangeable } from '../../functions/teamMembership.js';

const TEAM = { leadUid: 'uid-founder' };

describe('roleChangeBlockedReason agrees with the server on every case', () => {
    const cases = [];
    for (const fromRole of ['staff', 'lead', 'viewer']) {
        for (const nextRole of MEMBER_ROLE_VALUES) {
            for (const leadCount of [0, 1, 2, 3]) {
                for (const uid of ['uid-founder', 'uid-other']) {
                    cases.push({ fromRole, nextRole, leadCount, uid });
                }
            }
        }
    }

    it.each(cases)('$fromRole → $nextRole with $leadCount leads ($uid)', ({ fromRole, nextRole, leadCount, uid }) => {
        const member = { uid, role: fromRole, rostered: true };
        const client = roleChangeBlockedReason({ member, team: TEAM, leadCount, nextRole });
        const server = assertRoleChangeable({
            teamId: 't1', team: TEAM, callerUid: 'uid-caller', callerMembership: { role: 'lead' },
            targetUid: uid, targetMembership: member, leadCount, nextRole, nextRostered: true,
        });
        expect(client === null, `client said ${client}; server said ${server.message}`).toBe(server.ok);
    });
});

describe('roleChangeBlockedReason wording', () => {
    it('speaks in the first person when the lead is stepping down themselves', () => {
        const member = { uid: 'uid-me', role: 'lead' };
        expect(roleChangeBlockedReason({ member, team: TEAM, leadCount: 1, nextRole: 'staff', isSelf: true }))
            .toMatch(/^You are the only lead/);
        expect(roleChangeBlockedReason({ member, team: TEAM, leadCount: 1, nextRole: 'staff' }))
            .toMatch(/^The only lead/);
    });

    it('names the founding lead', () => {
        expect(roleChangeBlockedReason({ member: { uid: 'uid-founder', role: 'lead' }, team: TEAM, leadCount: 4, nextRole: 'viewer' }))
            .toMatch(/created for/);
    });

    it('never blocks a promotion or a lead staying a lead', () => {
        expect(roleChangeBlockedReason({ member: { uid: 'x', role: 'staff' }, team: TEAM, leadCount: 0, nextRole: 'lead' })).toBeNull();
        expect(roleChangeBlockedReason({ member: { uid: 'uid-founder', role: 'lead' }, team: TEAM, leadCount: 1, nextRole: 'lead' })).toBeNull();
    });
});

describe('roleOf', () => {
    it('reads a missing or unknown role as staff', () => {
        expect(roleOf({})).toBe('staff');
        expect(roleOf({ role: 'admin' })).toBe('staff');
        expect(roleOf(null)).toBe('staff');
        expect(roleOf({ role: 'viewer' })).toBe('viewer');
    });
});

describe('describeRoleChange', () => {
    it('reads a promotion', () => {
        expect(describeRoleChange({ targetName: 'Brandon', fromRole: 'staff', toRole: 'lead', fromRostered: true, toRostered: true, byName: 'Alif' }))
            .toBe('Brandon changed from staff to lead (changed by Alif).');
    });

    it('notes a roster change made in the same save', () => {
        expect(describeRoleChange({ targetName: 'Nisa', fromRole: 'staff', toRole: 'lead', fromRostered: true, toRostered: false, byName: '' }))
            .toBe('Nisa changed from staff to lead, no longer in the roster.');
    });

    it('does not mention the roster for a viewer, who is never in it', () => {
        expect(describeRoleChange({ targetName: 'Jo', fromRole: 'staff', toRole: 'viewer', fromRostered: true, toRostered: false }))
            .toBe('Jo changed from staff to viewer.');
    });

    it('reads a roster-only change', () => {
        expect(describeRoleChange({ targetName: 'Alif', fromRole: 'lead', toRole: 'lead', fromRostered: true, toRostered: false, byName: 'Nisa' }))
            .toBe('Alif is no longer in the roster (changed by Nisa).');
    });

    it('returns null rather than a sentence with "undefined" in it', () => {
        expect(describeRoleChange(null)).toBeNull();
        expect(describeRoleChange({ fromRole: 'boss', toRole: 'lead' })).toBeNull();
        expect(describeRoleChange({ fromRole: 'staff', toRole: 'staff', fromRostered: true, toRostered: true })).toBeNull();
    });

    it('falls back to "A member" when the name is missing', () => {
        expect(describeRoleChange({ fromRole: 'lead', toRole: 'staff', fromRostered: true, toRostered: true }))
            .toBe('A member changed from lead to staff.');
    });
});

describe('readRoleChanges', () => {
    it('turns a snapshot into plain records with a Date, in query order', () => {
        const at = new Date('2026-10-14T09:00:00+08:00');
        const out = readRoleChanges({ docs: [
            { id: 'b', data: () => ({ toRole: 'lead', at: { toDate: () => at } }) },
            { id: 'a', data: () => ({ toRole: 'staff', at: null }) },
        ] });
        expect(out.map((r) => r.docId)).toEqual(['b', 'a']);
        expect(out[0].at).toBe(at);
        expect(out[1].at).toBeNull();
    });

    it('tolerates an empty or malformed snapshot', () => {
        expect(readRoleChanges(null)).toEqual([]);
        expect(readRoleChanges({ docs: [null, {}, { id: 'x', data: () => null }] })).toEqual([]);
    });
});
