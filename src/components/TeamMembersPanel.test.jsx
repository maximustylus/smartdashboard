/**
 * ==============================================================================
 * TEAM MEMBERS PANEL — the screen that replaced editing source and redeploying
 * ==============================================================================
 *
 * Onboarding one clinician used to mean editing `TEAM_DIRECTORY` in
 * `src/utils/index.js`, editing `directory()` and `directoryNames()` in
 * `firestore.rules`, and redeploying the rules. This screen is what replaced all of
 * that, and it is the second half of an onboarding story that had no second half
 * until `inviteMember` and `removeMember` were written.
 *
 * WHAT THIS SUITE IS FOR, AND WHAT IT IS NOT FOR. The authority on who may add whom
 * is `functions/teamMembership.test.js` — 69 tests against the server's own decision
 * module, which re-reads the caller's membership from the database and cannot be
 * lied to. This file tests the SCREEN: that a refusal is shown as a sentence rather
 * than swallowed, that the sandbox writes nothing, and that the two removals which
 * would leave a team with nobody able to administer it are explained before the
 * button rather than after the failure.
 *
 * ⚠️ SO THE REFUSALS ASSERTED HERE ARE NOT SECURITY. Hiding the form from a
 *    non-lead is presentation. Every assertion below about what is on screen is
 *    about whether a clinician can understand what happened.
 * ==============================================================================
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';

vi.mock('../firebase', () => ({ db: {}, auth: {}, storage: {} }));

/**
 * ⚠️ THE DOMAIN ALLOWLIST IS MOCKED, AND `configured: true` IS THE DEFAULT.
 *
 * The panel reads `config/domains` on mount to decide whether to warn a lead that
 * adding anybody will be refused. Left real, that read appears in `getDocSpy` and
 * breaks the grade tests below, which assert the EXACT set of documents read — and
 * rightly so: "reads exactly one grade document" is the point of them, and an
 * unrelated read making it two would be a real regression they must keep catching.
 *
 * `true` is the default because it is the configured, working state — so every
 * existing assertion runs against a panel with no setup notice, exactly as before.
 * The notice's own tests set it false.
 */
const domainState = vi.hoisted(() => ({ configured: true, loaded: true }));
vi.mock('../hooks/useDomainAllowlist', () => ({
    useDomainAllowlist: () => ({
        domains: ['kkh.com.sg'],
        loaded: domainState.loaded,
        configured: domainState.configured,
    }),
}));

/**
 * ⚠️ THE FIRESTORE MOCK IDENTIFIES A CALL BY ITS PATH, NEVER BY SUBTRACTION.
 *
 *    Three helpers in this repository used to identify a listener as "the one that
 *    is not the other one", and all three broke the moment a second listener was
 *    added — twice, in files that already carried a comment saying they had been
 *    narrowed once for exactly this reason. `doc()` here returns the joined path and
 *    every assertion matches on it, so adding a fourth read to this component makes
 *    these tests fail loudly rather than quietly assert against the wrong document.
 */
const docPath = (_db, ...segments) => segments.join('/');
let getDocImpl = () => Promise.resolve({ exists: () => false, data: () => ({}) });
const getDocSpy = vi.fn((path) => getDocImpl(path));
const updateDocSpy = vi.fn(() => { callOrder.push('updateDoc'); return Promise.resolve(); });
const setDocSpy = vi.fn(() => Promise.resolve());

/**
 * v2.18.0: the panel also LISTENS to `teams/{id}/roleChanges` for a lead. The query
 * is routed by its collection path; `roleChangeDocs` is what it delivers, and
 * `roleChangeListens` counts the subscriptions so a non-lead can be shown to open none.
 */
let roleChangeDocs = [];
let roleChangeListens = 0;
let roleChangeListener = null;
vi.mock('firebase/firestore', () => ({
    doc: (...args) => docPath(...args),
    getDoc: (path) => getDocSpy(path),
    updateDoc: (path, payload) => updateDocSpy(path, payload),
    setDoc: (path, payload, options) => setDocSpy(path, payload, options),
    collection: (_db, ...segments) => ({ path: segments.join('/') }),
    query: (ref) => ({ path: ref.path, isQuery: true }),
    orderBy: () => ({}),
    limit: () => ({}),
    onSnapshot: (target, onNext, onError) => {
        if (target && /\/roleChanges$/.test(target.path)) {
            roleChangeListens += 1;
            roleChangeListener = { onNext, onError };
            onNext({ docs: roleChangeDocs.map((d) => ({ id: d.id, data: () => d.data })) });
        }
        return () => {};
    },
}));

/**
 * One spy per callable, resolving whatever the test sets. `httpsCallable` is mocked
 * at the module boundary rather than the component being handed an injected client,
 * because the region-pinning in `call()` is part of what this file should not let
 * regress — every other call site in the app pins `us-central1`.
 */
const invited = vi.fn();
const removed = vi.fn();
const roleSet = vi.fn();
/** Every write and call in order — the role call must come AFTER the membership write. */
const callOrder = [];
let lastRegion;

vi.mock('firebase/functions', () => ({
    getFunctions: vi.fn((_app, region) => { lastRegion = region; return {}; }),
    httpsCallable: vi.fn((_functions, name) => (payload) => {
        if (name === 'inviteMember') return invited(payload);
        if (name === 'setMemberRole') { callOrder.push('setMemberRole'); return roleSet(payload); }
        return removed(payload);
    }),
}));

let demoMode = false;
vi.mock('../context/NexusContext', () => ({ useNexus: () => ({ isDemo: demoMode }) }));

const TEAM_ID = 'kkh-respiratory-therapy';
const OWNER = { uid: 'leadUid0000000000000000000aa', displayName: 'Nur', role: 'lead' };
const STAFF = { uid: 'staffUid000000000000000000cc', displayName: 'Brandon', role: 'staff' };

let team;
vi.mock('../context/TeamContext', () => ({
    useTeam: () => team,
}));

import TeamMembersPanel from './TeamMembersPanel';

const asTeam = (over = {}) => ({
    teamId: TEAM_ID,
    team: { name: 'Respiratory Therapy', institution: 'KKH', leadUid: OWNER.uid },
    members: [OWNER, STAFF],
    isLead: true,
    ...over,
});

const ok = (data = {}) => Promise.resolve({ data: { success: true, ...data } });
const refused = (message, reason = 'no-account') =>
    Promise.resolve({ data: { success: false, reason, message } });

const fill = ({ email, name } = {}) => {
    if (email !== undefined) fireEvent.change(screen.getByPlaceholderText(/colleague@/i), { target: { value: email } });
    if (name !== undefined) fireEvent.change(screen.getByPlaceholderText(/how the roster/i), { target: { value: name } });
};

const submit = async () => {
    await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /add to team/i }));
    });
};

beforeEach(() => {
    demoMode = false;
    team = asTeam();
    invited.mockReset().mockReturnValue(ok({ alreadyMember: false, uid: 'newUid' }));
    removed.mockReset().mockReturnValue(ok({ alreadyGone: false }));
    lastRegion = undefined;
    roleSet.mockReset().mockReturnValue(ok({ noChange: false }));
    callOrder.length = 0;
    roleChangeDocs = [];
    roleChangeListens = 0;
    roleChangeListener = null;
    getDocSpy.mockClear();
    updateDocSpy.mockClear();
    setDocSpy.mockClear();
    getDocImpl = () => Promise.resolve({ exists: () => false, data: () => ({}) });
});

afterEach(() => cleanup());

// ── 1. ADDING ────────────────────────────────────────────────────────────────

/**
 * ==============================================================================
 * THE SETUP NOTICE — said before the lead presses Add, not after it fails
 * ==============================================================================
 *
 * Until `config/domains` exists, `inviteMember` refuses EVERY address — correctly,
 * because a gate that opens when its configuration is missing is not a gate. But
 * nothing said so, so the first a lead knew was a refusal naming their own
 * hospital, which reads as "your institution is not welcome". Reported from the
 * field on 2026-08-31, by the owner, on `kkh.com.sg`.
 */
describe('the domain allowlist is not configured yet', () => {
    beforeEach(() => {
        team = asTeam();
        domainState.configured = true;
        domainState.loaded = true;
    });
    afterEach(() => { domainState.configured = true; domainState.loaded = true; });

    it('warns the lead that adding anybody will be refused, and why', () => {
        domainState.configured = false;
        render(<TeamMembersPanel />);

        const notice = screen.getByRole('note');
        // It must name this as SETUP rather than as a refusal of their institution —
        // that conflation is the whole reason the notice exists.
        expect(notice.textContent).toMatch(/setup outstanding/i);
        expect(notice.textContent).toMatch(/no organisation is registered/i);
        // …say who can fix it…
        expect(notice.textContent).toMatch(/installed NEXUS/i);
        // …not send a clinician to a database path…
        expect(notice.textContent).not.toMatch(/config\/domains/i);
        // …and stay SHORT. It sits above a form, not in place of one, and the first
        // version was three sentences that repeated the refusal banner beneath it.
        expect(notice.textContent.trim().length).toBeLessThan(220);
    });

    it('steps aside once the server has said it — two banners for one point is noise', async () => {
        // The refusal from `inviteMember` covers the same ground in more words. Showing
        // both at once was the owner's "feels vulgar", and it was a fair verdict.
        domainState.configured = false;
        invited.mockReturnValue(refused('NEXUS has not been set up with any organisations yet.'));
        render(<TeamMembersPanel />);
        expect(screen.getByRole('note')).toBeTruthy();

        fill({ email: 'brandon@kkh.com.sg' });
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /add to team/i }));
        });

        expect(screen.getByText(/has not been set up with any organisations/i)).toBeTruthy();
        expect(screen.queryByRole('note'), 'the notice stacked under the refusal').toBeNull();
    });

    it('says nothing at all once the allowlist IS configured', () => {
        domainState.configured = true;
        render(<TeamMembersPanel />);
        expect(screen.queryByRole('note')).toBeNull();
    });

    it('does not flash while the read is still in flight', () => {
        // A notice that appears and vanishes on every mount is one people learn to
        // ignore, and then miss the time it matters.
        domainState.configured = false;
        domainState.loaded = false;
        render(<TeamMembersPanel />);
        expect(screen.queryByRole('note')).toBeNull();
    });

    it('is for the lead only — a staff member can do nothing about it', () => {
        domainState.configured = false;
        team = asTeam({ isLead: false });
        render(<TeamMembersPanel />);
        expect(screen.queryByRole('note')).toBeNull();
    });
});

describe('adding a colleague', () => {
    it('sends the team, the address and the role the lead chose', async () => {
        render(<TeamMembersPanel />);
        fill({ email: ' Brandon@KKH.com.sg ', name: 'Brandon' });
        await submit();

        expect(invited).toHaveBeenCalledTimes(1);
        expect(invited.mock.calls[0][0]).toMatchObject({
            teamId: TEAM_ID,
            email: 'Brandon@KKH.com.sg',   // trimmed here, lower-cased on the server
            displayName: 'Brandon',
            role: 'staff',
            rostered: true,
        });
    });

    it('pins the functions region, like every other call site', async () => {
        render(<TeamMembersPanel />);
        fill({ email: 'a@kkh.com.sg' });
        await submit();
        expect(lastRegion).toBe('us-central1');
    });

    it('does not call at all when no address was typed', async () => {
        render(<TeamMembersPanel />);
        await submit();
        expect(invited).not.toHaveBeenCalled();
        expect(screen.getByRole('alert').textContent).toMatch(/which email/i);
    });

    it('clears the form after a success, so the next colleague starts clean', async () => {
        render(<TeamMembersPanel />);
        fill({ email: 'a@kkh.com.sg', name: 'Ada' });
        await submit();
        expect(screen.getByPlaceholderText(/colleague@/i).value).toBe('');
        expect(screen.getByPlaceholderText(/how the roster/i).value).toBe('');
    });

    /**
     * ⚠️ THE REFUSAL PATH IS THE ONE THAT MATTERS. "They have not registered yet"
     *    comes back as `{ success: false }` on a 200, not as a thrown error — so a
     *    screen that only caught exceptions would report SUCCESS for every one of
     *    them and the lead would sit waiting for a colleague who was never added.
     */
    it('shows a server refusal as a sentence instead of reporting success', async () => {
        invited.mockReturnValue(refused('There is no NEXUS account for a@kkh.com.sg yet. Ask them to register first.'));
        render(<TeamMembersPanel />);
        fill({ email: 'a@kkh.com.sg' });
        await submit();

        expect(screen.getByRole('alert').textContent).toMatch(/register first/i);
        expect(screen.queryByRole('status')).toBeNull();
    });

    it('leaves the form filled in after a refusal, so it can be corrected', async () => {
        invited.mockReturnValue(refused('Not a registered domain.', 'domain-not-allowed'));
        render(<TeamMembersPanel />);
        fill({ email: 'a@gmail.com', name: 'Ada' });
        await submit();
        expect(screen.getByPlaceholderText(/colleague@/i).value).toBe('a@gmail.com');
    });

    it('reports a thrown error too, rather than hanging on the spinner', async () => {
        invited.mockReturnValue(Promise.reject(new Error('internal')));
        render(<TeamMembersPanel />);
        fill({ email: 'a@kkh.com.sg' });
        await submit();
        expect(screen.getByRole('alert').textContent).toContain('internal');
        expect(screen.getByRole('button', { name: /add to team/i }).disabled).toBe(false);
    });

    it('treats "already a member" as the success it is', async () => {
        invited.mockReturnValue(ok({ alreadyMember: true, message: 'Brandon is already in this team. Nothing was changed.' }));
        render(<TeamMembersPanel />);
        fill({ email: 'brandon@kkh.com.sg' });
        await submit();
        expect(screen.getByRole('status').textContent).toMatch(/already in this team/i);
        expect(screen.queryByRole('alert')).toBeNull();
    });
});

// ── 2. ROLE AND ROSTERED ARE TWO QUESTIONS ───────────────────────────────────

describe('role and rostered', () => {
    it('sends the chosen role', async () => {
        render(<TeamMembersPanel />);
        fill({ email: 'a@kkh.com.sg' });
        fireEvent.click(screen.getByRole('radio', { name: /lead/i }));
        await submit();
        expect(invited.mock.calls[0][0].role).toBe('lead');
    });

    /**
     * A ROSTER MASTER IS A LEAD WHO HOLDS NO DUTIES. If `role` decided `rostered`,
     * she would be handed clinical shifts she does not work — the modelling error
     * `TeamContext` documents at length. The form has to be able to say both.
     */
    it('lets a lead be added without clinical duties', async () => {
        render(<TeamMembersPanel />);
        fill({ email: 'nisa@kkh.com.sg' });
        fireEvent.click(screen.getByRole('radio', { name: /lead/i }));
        fireEvent.click(screen.getByRole('checkbox'));
        await submit();
        expect(invited.mock.calls[0][0]).toMatchObject({ role: 'lead', rostered: false });
    });

    /**
     * The server forces a viewer out of the staff pool whatever this form sends, so
     * offering the choice would be offering something that gets overruled.
     */
    it('takes the rostered control away for a viewer rather than lying about it', async () => {
        render(<TeamMembersPanel />);
        expect(screen.getByRole('checkbox')).toBeTruthy();
        fireEvent.click(screen.getByRole('radio', { name: /viewer/i }));
        expect(screen.queryByRole('checkbox')).toBeNull();
    });
});

// ── 3. REMOVING, AND THE TEAM NOBODY CAN ADMINISTER ──────────────────────────

describe('removing somebody', () => {
    it('sends the uid, never the display name', async () => {
        render(<TeamMembersPanel />);
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /remove brandon/i }));
        });
        expect(removed).toHaveBeenCalledWith({ teamId: TEAM_ID, uid: STAFF.uid });
    });

    /**
     * ⚠️ BOTH OF THESE WOULD PRODUCE A TEAM WITH NO ADMINISTRATOR, and there is no
     *    repair path inside the app — every screen that could fix it needs a lead.
     *    The server refuses both; this asserts the lead is told BEFORE clicking,
     *    because a button that always fails is worse than no button.
     */
    it('offers no remove button for the lead the team was created for', () => {
        render(<TeamMembersPanel />);
        expect(screen.queryByRole('button', { name: /remove nur/i })).toBeNull();
        expect(screen.getByText(/team was created for/i)).toBeTruthy();
    });

    it('offers no remove button for the only lead', () => {
        const deputy = { uid: 'deputy000000000000000000000d', displayName: 'Deputy', role: 'lead' };
        team = asTeam({
            team: { name: 'RT', institution: 'KKH', leadUid: 'somebody-else' },
            members: [deputy, STAFF],
        });
        render(<TeamMembersPanel />);
        expect(screen.queryByRole('button', { name: /remove deputy/i })).toBeNull();
        expect(screen.getByText(/only lead/i)).toBeTruthy();
    });

    it('does offer it once a second lead exists', () => {
        const deputy = { uid: 'deputy000000000000000000000d', displayName: 'Deputy', role: 'lead' };
        team = asTeam({
            team: { name: 'RT', institution: 'KKH', leadUid: 'somebody-else' },
            members: [OWNER, deputy, STAFF],
        });
        render(<TeamMembersPanel />);
        expect(screen.getByRole('button', { name: /remove deputy/i })).toBeTruthy();
    });

    it('shows a server refusal rather than claiming the removal happened', async () => {
        removed.mockReturnValue(refused('That is the team\'s only lead.', 'last-lead'));
        render(<TeamMembersPanel />);
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /remove brandon/i }));
        });
        expect(screen.getByRole('alert').textContent).toMatch(/only lead/i);
        expect(screen.queryByRole('status')).toBeNull();
    });
});

// ── 4. WHO SEES THE FORM ─────────────────────────────────────────────────────

describe('a member who is not a lead', () => {
    beforeEach(() => { team = asTeam({ isLead: false }); });

    it('sees the list', () => {
        render(<TeamMembersPanel />);
        expect(screen.getByText('Brandon')).toBeTruthy();
    });

    it('sees no add form and no remove buttons', () => {
        render(<TeamMembersPanel />);
        expect(screen.queryByRole('button', { name: /add to team/i })).toBeNull();
        expect(screen.queryByRole('button', { name: /remove/i })).toBeNull();
        expect(screen.getByText(/only a lead of this team/i)).toBeTruthy();
    });
});

// ── 5. THE SANDBOX WRITES NOTHING ────────────────────────────────────────────

describe('the sandbox', () => {
    /**
     * The demo team is not a real team. Every other write in the app is fenced by
     * `isDemo`, and this one is fenced BEFORE the `teamId` check for the same reason
     * as the rest: in demo mode the sandbox is the reason for the refusal, and "no
     * team selected" would be the wrong sentence for somebody who has one.
     */
    it('refuses to add anybody, and says the sandbox is why', async () => {
        demoMode = true;
        render(<TeamMembersPanel />);
        fill({ email: 'a@kkh.com.sg' });
        await submit();
        expect(invited).not.toHaveBeenCalled();
        expect(screen.getByRole('alert').textContent).toMatch(/sandbox/i);
    });

    it('refuses to remove anybody', async () => {
        demoMode = true;
        render(<TeamMembersPanel />);
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /remove brandon/i }));
        });
        expect(removed).not.toHaveBeenCalled();
        expect(screen.getByRole('alert').textContent).toMatch(/sandbox/i);
    });

    /**
     * The signed-in-with-no-team case the holding screen's sandbox door creates.
     * `teamId` is null and demo mode is OFF only if they toggled back — either way
     * nothing may be composed from a null id.
     */
    it('refuses when there is no team, naming that rather than the sandbox', async () => {
        team = asTeam({ teamId: null, team: null, members: [], isLead: false });
        render(<TeamMembersPanel />);
        expect(screen.queryByRole('button', { name: /add to team/i })).toBeNull();
        expect(screen.getByText(/only a lead of this team/i)).toBeTruthy();
    });
});


// ── 4. SETTING SOMEBODY ELSE'S PROFESSION AND GRADE ──────────────────────────
//
// `firestore.rules` has permitted a lead to write both since grades were split into
// their own collection — `allow create, update: if isSelf(memberUid) || isLead(teamId)`
// on the grade document, and `profession` inside the lead's membership allowlist.
// There was no screen, so in practice a grade could only ever be set by the person
// themselves: a department could not roster until every member had been chased for
// one, and a wrong grade — which decides who leads a shift — was uncorrectable.
//
// ⚠️ TWO COMMENTS IN THE SOURCE CLAIMED OTHERWISE. Both said a lead "can correct it
//    in the Configure staff table". Those rows come from `staffRowsFromMembers` and
//    are derived and read-only. The claim was never true, and the last test in this
//    block is the one that would have caught it.

const gradeDocOf = (uid) => `teams/${TEAM_ID}/grades/${uid}`;
const memberDocOf = (uid) => `teams/${TEAM_ID}/members/${uid}`;

const openEditorFor = async (name) => {
    await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: new RegExp(`edit role, profession, grade and roster limits for ${name}`, 'i') }));
    });
};

const chooseGrade = (uid, value) =>
    fireEvent.change(document.getElementById(`member-grade-${uid}`), { target: { value } });
const chooseProfession = (uid, value) =>
    fireEvent.change(document.getElementById(`member-profession-${uid}`), { target: { value } });

const save = async () => {
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /^save$/i })); });
};

describe('4. a lead sets profession and grade for a member', () => {
    it('offers an editor per member to a lead, and none at all to a non-lead', async () => {
        render(<TeamMembersPanel />);
        expect(screen.getAllByRole('button', { name: /edit role, profession, grade and roster limits/i })).toHaveLength(2);

        cleanup();
        team = asTeam({ isLead: false });
        render(<TeamMembersPanel />);
        expect(screen.queryByRole('button', { name: /edit role, profession, grade and roster limits/i })).toBeNull();
    });

    /**
     * ⚠️ THE LIST ITSELF MUST READ NO GRADES. This is the property that keeps the
     *    department's pay scale out of a component that also renders for a non-lead:
     *    a grade is fetched when one editor opens, and at no other moment.
     */
    it('reads no grade at all until an editor is opened', () => {
        render(<TeamMembersPanel />);
        expect(getDocSpy).not.toHaveBeenCalled();
    });

    it('reads exactly one grade document, for the member whose editor opened', async () => {
        render(<TeamMembersPanel />);
        await openEditorFor('Brandon');
        expect(getDocSpy.mock.calls.map(([path]) => path)).toEqual([gradeDocOf(STAFF.uid)]);
    });

    it('shows the stored grade, and writes it back with setBy and merge when changed', async () => {
        getDocImpl = () => Promise.resolve({ exists: () => true, data: () => ({ grade: 'AH11' }) });
        render(<TeamMembersPanel />);
        await openEditorFor('Brandon');

        expect(document.getElementById(`member-grade-${STAFF.uid}`).value).toBe('AH11');
        chooseGrade(STAFF.uid, 'AH14');
        await save();

        expect(setDocSpy).toHaveBeenCalledTimes(1);
        const [path, payload, options] = setDocSpy.mock.calls[0];
        expect(path).toBe(gradeDocOf(STAFF.uid));
        expect(payload.grade).toBe('AH14');
        expect(payload.setBy).toBe('lead');
        expect(typeof payload.updatedAt).toBe('string');
        // The document may not exist yet — `updateDoc` on a missing document fails.
        expect(options).toEqual({ merge: true });
    });

    /**
     * The membership write carries `profession` AND NOTHING ELSE. The lead's rule is
     * `changedKeys().hasOnly([...])`, so one stray key refuses the WHOLE write with
     * `permission-denied` — an error naming nothing the lead did.
     */
    it('writes profession to the membership, on its own', async () => {
        render(<TeamMembersPanel />);
        await openEditorFor('Brandon');
        chooseProfession(STAFF.uid, 'physiotherapist');
        await save();

        expect(updateDocSpy).toHaveBeenCalledTimes(1);
        const [path, payload] = updateDocSpy.mock.calls[0];
        expect(path).toBe(memberDocOf(STAFF.uid));
        expect(Object.keys(payload)).toEqual(['profession']);
        expect(payload.profession).toBe('physiotherapist');
        // Grade untouched, so no second write.
        expect(setDocSpy).not.toHaveBeenCalled();
    });

    it('writes nothing when neither value changed', async () => {
        getDocImpl = () => Promise.resolve({ exists: () => true, data: () => ({ grade: 'AH11' }) });
        render(<TeamMembersPanel />);
        await openEditorFor('Brandon');
        await save();

        expect(setDocSpy).not.toHaveBeenCalled();
        expect(updateDocSpy).not.toHaveBeenCalled();
    });

    /**
     * ⚠️ A REFUSED READ IS A REFUSAL TO WRITE, and this is the case that would
     *    otherwise destroy data: a caller who cannot READ the grade sees the field
     *    empty, which is indistinguishable from "they have not set one". Saving
     *    would write over a value never seen.
     */
    it('refuses to save when the grade could not be read, and says why', async () => {
        getDocImpl = () => Promise.reject(new Error('permission-denied'));
        render(<TeamMembersPanel />);
        await openEditorFor('Brandon');
        chooseProfession(STAFF.uid, 'physiotherapist');
        await save();

        expect(setDocSpy).not.toHaveBeenCalled();
        expect(updateDocSpy).not.toHaveBeenCalled();
        expect(screen.getByRole('alert').textContent).toMatch(/could not be read/i);
    });

    it('writes nothing in the sandbox', async () => {
        demoMode = true;
        render(<TeamMembersPanel />);
        await openEditorFor('Brandon');
        chooseProfession(STAFF.uid, 'physiotherapist');
        await save();

        expect(setDocSpy).not.toHaveBeenCalled();
        expect(updateDocSpy).not.toHaveBeenCalled();
        expect(screen.getByRole('alert').textContent).toMatch(/sandbox/i);
    });

    /**
     * ⚠️ THE SEED EFFECT MUST NOT CLOBBER A CHOICE MADE WHILE THE READ WAS IN
     *    FLIGHT. The hook starts at `grade: ''`; an unguarded effect seeds that,
     *    then the real value lands and overwrites whatever the lead picked in
     *    between — silently reverting a selection they watched themselves make.
     */
    it('keeps a grade chosen before the read resolves', async () => {
        let release;
        getDocImpl = () => new Promise((resolve) => { release = () => resolve({ exists: () => true, data: () => ({ grade: 'AH11' }) }); });

        render(<TeamMembersPanel />);
        await openEditorFor('Brandon');
        chooseGrade(STAFF.uid, 'AH16');
        await act(async () => { release(); });

        expect(document.getElementById(`member-grade-${STAFF.uid}`).value).toBe('AH16');
    });

    /**
     * Closing drops the grade rather than keeping it. Without this, opening a second
     * member shows the first member's grade until their read resolves — one
     * colleague's pay grade rendered under another colleague's name.
     */
    it('does not carry one member\'s grade into another\'s editor', async () => {
        getDocImpl = (path) => Promise.resolve({
            exists: () => path === gradeDocOf(STAFF.uid),
            data: () => (path === gradeDocOf(STAFF.uid) ? { grade: 'AH17' } : {}),
        });

        render(<TeamMembersPanel />);
        await openEditorFor('Brandon');
        expect(document.getElementById(`member-grade-${STAFF.uid}`).value).toBe('AH17');

        await openEditorFor('Nur');
        expect(document.getElementById(`member-grade-${OWNER.uid}`).value).toBe('');
    });

    it('tells the member, on their own row, when a lead set the grade rather than them', async () => {
        getDocImpl = () => Promise.resolve({ exists: () => true, data: () => ({ grade: 'AH14', setBy: 'lead' }) });
        render(<TeamMembersPanel />);
        await openEditorFor('Brandon');
        expect(screen.getByText(/set by a lead, not by them/i)).toBeTruthy();
    });

    /**
     * ⚠️ THE TEST THAT WOULD HAVE CAUGHT THE FALSE COMMENT. Both source files
     *    claimed a lead could correct a grade in the Configure staff table. Nothing
     *    asserted that a correction path existed anywhere, so the claim survived
     *    two reviews. This asserts the path by its effect: a grade a lead did not
     *    set reaches Firestore.
     */
    it('gives a lead a working path to set a grade for somebody who never set one', async () => {
        render(<TeamMembersPanel />);
        await openEditorFor('Brandon');
        expect(document.getElementById(`member-grade-${STAFF.uid}`).value).toBe('');

        chooseGrade(STAFF.uid, 'AH13');
        await save();

        expect(setDocSpy).toHaveBeenCalledTimes(1);
        expect(setDocSpy.mock.calls[0][1].grade).toBe('AH13');
    });
});

// =============================================================================
// 5. THE ROSTER LIMITS — SHORT NAME AND DUTIES
// =============================================================================
/**
 * ⚠️ THIS SECTION EXISTS BECAUSE AN AUDIT FOUND IT MISSING ENTIRELY. When `shortName`
 *    and `onlyTasks` shipped, this file contained ZERO references to either — and
 *    this editor is the ONLY place in live NEXUS where they are set. The value layer
 *    was well covered and the write was not covered at all.
 */
describe('5. a lead sets the roster limits: short name and duties', () => {
    const setShortName = (uid, value) =>
        fireEvent.change(document.getElementById(`member-shortname-${uid}`), { target: { value } });
    const setOnlyTasks = (uid, value) =>
        fireEvent.change(document.getElementById(`member-onlytasks-${uid}`), { target: { value } });

    it('writes both fields to the membership, and only those keys', async () => {
        render(<TeamMembersPanel />);
        await openEditorFor('Brandon');
        setShortName(STAFF.uid, 'BF');
        setOnlyTasks(STAFF.uid, 'Exercise Test, New Case');
        await save();

        expect(updateDocSpy).toHaveBeenCalledTimes(1);
        const [path, payload] = updateDocSpy.mock.calls[0];
        expect(path).toBe(memberDocOf(STAFF.uid));
        expect(Object.keys(payload).sort()).toEqual(['onlyTasks', 'shortName']);
        expect(payload.shortName).toBe('BF');
        // Split, trimmed and de-duplicated on the way in.
        expect(payload.onlyTasks).toEqual(['Exercise Test', 'New Case']);
    });

    /**
     * ⚠️ ONE WRITE, ASSEMBLED FROM TWO ALLOWLISTED BUILDERS. A membership update
     *    carrying a single key outside the rule's `changedKeys().hasOnly` list is
     *    refused ENTIRELY, so the payload cannot be built from the form. The builders
     *    are separate because `buildMemberProfileUpdate` is also called by
     *    `ProfileView` with a person's OWN form object — teaching it these two keys
     *    would make every ordinary profile save attempt a lead-only field and fail.
     */
    it('merges a profession change and both limits into a single write', async () => {
        render(<TeamMembersPanel />);
        await openEditorFor('Brandon');
        chooseProfession(STAFF.uid, 'physiotherapist');
        setShortName(STAFF.uid, 'BF');
        setOnlyTasks(STAFF.uid, 'Clinic');
        await save();

        expect(updateDocSpy).toHaveBeenCalledTimes(1);
        const [, payload] = updateDocSpy.mock.calls[0];
        expect(Object.keys(payload).sort()).toEqual(['onlyTasks', 'profession', 'shortName']);
    });

    it('refuses a comma in a short name and writes nothing at all', async () => {
        render(<TeamMembersPanel />);
        await openEditorFor('Brandon');
        setShortName(STAFF.uid, 'A,B');
        // Set a VALID duty list too, so the test proves the refusal blocks the whole
        // save rather than merely skipping the bad field.
        setOnlyTasks(STAFF.uid, 'Clinic');
        await save();

        expect(updateDocSpy).not.toHaveBeenCalled();
        expect(setDocSpy).not.toHaveBeenCalled();
        expect(screen.getByText(/commas or semicolons/i)).toBeTruthy();
    });

    it('writes nothing when the editor is opened and saved untouched', async () => {
        // The fields are seeded through the normalizer, so reopening and saving must
        // not register as an edit — otherwise every visit writes to Firestore.
        team = asTeam({
            isLead: true,
            members: [OWNER, { ...STAFF, shortName: 'BF', onlyTasks: ['Clinic', 'Ward'] }],
        });
        getDocImpl = () => Promise.resolve({ exists: () => true, data: () => ({ grade: 'AH11' }) });
        render(<TeamMembersPanel />);
        await openEditorFor('Brandon');

        expect(document.getElementById(`member-shortname-${STAFF.uid}`).value).toBe('BF');
        expect(document.getElementById(`member-onlytasks-${STAFF.uid}`).value).toBe('Clinic, Ward');

        await save();
        expect(updateDocSpy).not.toHaveBeenCalled();
    });

    it('can clear a restriction back to every duty', async () => {
        // The field that gives duties BACK has to work as reliably as the one that
        // takes them away, or a lead cannot undo a mistake.
        team = asTeam({
            isLead: true,
            members: [OWNER, { ...STAFF, onlyTasks: ['Clinic'] }],
        });
        render(<TeamMembersPanel />);
        await openEditorFor('Brandon');
        setOnlyTasks(STAFF.uid, '');
        await save();

        expect(updateDocSpy).toHaveBeenCalledTimes(1);
        const [, payload] = updateDocSpy.mock.calls[0];
        expect(payload.onlyTasks).toEqual([]);
    });

    it('tells the lead that naming duties is a LIMIT, not an addition', async () => {
        // The one thing somebody can get catastrophically wrong here is assuming this
        // adds duties. Leave one out and the person silently stops being rostered for
        // it, and nobody notices until the day.
        render(<TeamMembersPanel />);
        await openEditorFor('Brandon');
        expect(screen.getByText(/limit, not an addition/i)).toBeTruthy();
    });
});


// ── 6. A LEAD CHANGES SOMEBODY'S ROLE (v2.18.0) ──────────────────────────────
//
// Staff, lead or viewer, from the same editor. The change goes to `setMemberRole`,
// never to `updateDoc`: the rules no longer let a client write `role` or `rostered`,
// because only the server can count leads. The owner's decisions are pinned here:
// all three roles; server-checked; a lead may step down if another lead remains,
// with a second press; and a log the team's leads can read.

const SECOND_LEAD = { uid: 'secondLead0000000000000000dd', displayName: 'Nisa', role: 'lead' };

const chooseRole = (label, name) =>
    fireEvent.click(screen.getByLabelText(new RegExp(`^${label} — ${name}$`)));

const saveButton = () => screen.getByRole('button', { name: /^save/i });

describe('6. a lead changes somebody\'s role', () => {
    it('promotes staff to lead through setMemberRole, never through a direct write', async () => {
        render(<TeamMembersPanel />);
        await openEditorFor('Brandon');
        chooseRole('Lead', 'Brandon');
        await save();

        expect(roleSet).toHaveBeenCalledWith({ teamId: TEAM_ID, uid: STAFF.uid, role: 'lead', rostered: true });
        expect(updateDocSpy).not.toHaveBeenCalled();
        expect(lastRegion).toBe('us-central1');
        expect(screen.getByRole('status').textContent).toMatch(/Brandon is now a lead\./);
    });

    it('makes somebody a viewer, takes the roster switch away, and sends rostered false', async () => {
        render(<TeamMembersPanel />);
        await openEditorFor('Brandon');
        expect(screen.getByLabelText('Include Brandon in the roster')).toBeTruthy();
        chooseRole('Viewer', 'Brandon');
        expect(screen.queryByLabelText('Include Brandon in the roster')).toBeNull();
        await save();
        expect(roleSet).toHaveBeenCalledWith({ teamId: TEAM_ID, uid: STAFF.uid, role: 'viewer', rostered: false });
    });

    it('changes the roster flag alone, keeping the role', async () => {
        render(<TeamMembersPanel />);
        await openEditorFor('Brandon');
        fireEvent.click(screen.getByLabelText('Include Brandon in the roster'));
        await save();
        expect(roleSet).toHaveBeenCalledWith({ teamId: TEAM_ID, uid: STAFF.uid, role: 'staff', rostered: false });
        expect(screen.getByRole('status').textContent).toMatch(/Brandon is now staff, not in the roster\./);
    });

    it('calls nothing when the role and roster flag are unchanged', async () => {
        render(<TeamMembersPanel />);
        await openEditorFor('Brandon');
        await save();
        expect(roleSet).not.toHaveBeenCalled();
    });

    it('will not offer to demote the only lead, and says why', async () => {
        render(<TeamMembersPanel />);
        await openEditorFor('Nur');
        expect(screen.getByLabelText('Staff — Nur').disabled).toBe(true);
        expect(screen.getByLabelText('Viewer — Nur').disabled).toBe(true);
        expect(screen.getByLabelText('Lead — Nur').disabled).toBe(false);
        expect(screen.getAllByText(/created for|only lead/i).length).toBeGreaterThan(0);
    });

    it('will not offer to demote the lead the team was created for, even with two leads', async () => {
        team = asTeam({ members: [OWNER, SECOND_LEAD, STAFF] });
        render(<TeamMembersPanel />);
        await openEditorFor('Nur');
        expect(screen.getByLabelText('Staff — Nur').disabled).toBe(true);
        // Said twice on purpose: beside the remove button, and under the role cards.
        expect(screen.getAllByText(/the lead the team was created for/i).length).toBeGreaterThanOrEqual(2);
    });

    it('lets another lead be demoted once a second lead exists', async () => {
        team = asTeam({ members: [OWNER, SECOND_LEAD, STAFF] });
        render(<TeamMembersPanel />);
        await openEditorFor('Nisa');
        expect(screen.getByLabelText('Staff — Nisa').disabled).toBe(false);
        chooseRole('Staff', 'Nisa');
        await save();
        expect(roleSet).toHaveBeenCalledWith({ teamId: TEAM_ID, uid: SECOND_LEAD.uid, role: 'staff', rostered: true });
    });

    it('asks a lead stepping down THEMSELVES to press Save a second time', async () => {
        team = asTeam({ members: [OWNER, SECOND_LEAD, STAFF], membership: { uid: SECOND_LEAD.uid, role: 'lead' } });
        render(<TeamMembersPanel />);
        await openEditorFor('Nisa');
        chooseRole('Staff', 'Nisa');
        await save();

        // First press: a warning, and nothing sent.
        expect(roleSet).not.toHaveBeenCalled();
        expect(screen.getByRole('alert').textContent).toMatch(/about to step down from lead/i);
        expect(saveButton().textContent).toMatch(/step down/i);

        // Second press: sent.
        await act(async () => { fireEvent.click(saveButton()); });
        expect(roleSet).toHaveBeenCalledWith({ teamId: TEAM_ID, uid: SECOND_LEAD.uid, role: 'staff', rostered: true });
        expect(screen.getByRole('status').textContent).toMatch(/You are now staff in this team/);
    });

    it('drops the pending step-down if the lead picks a different role first', async () => {
        team = asTeam({ members: [OWNER, SECOND_LEAD, STAFF], membership: { uid: SECOND_LEAD.uid, role: 'lead' } });
        render(<TeamMembersPanel />);
        await openEditorFor('Nisa');
        chooseRole('Staff', 'Nisa');
        await save();
        expect(screen.queryByText(/about to step down/i)).toBeTruthy();
        chooseRole('Lead', 'Nisa');
        expect(screen.queryByText(/about to step down/i)).toBeNull();
    });

    it('shows a server refusal as a sentence and leaves the editor open', async () => {
        roleSet.mockReturnValue(refused('That is the team\'s only lead. Make somebody else a lead first.', 'last-lead'));
        team = asTeam({ members: [OWNER, SECOND_LEAD, STAFF] });
        render(<TeamMembersPanel />);
        await openEditorFor('Nisa');
        chooseRole('Staff', 'Nisa');
        await save();
        expect(screen.getByRole('alert').textContent).toMatch(/only lead\. Make somebody else a lead first/);
        expect(saveButton()).toBeTruthy();
    });

    it('writes the other changes FIRST and the role LAST, and says which half failed', async () => {
        roleSet.mockReturnValue(refused('No.', 'last-lead'));
        render(<TeamMembersPanel />);
        await openEditorFor('Brandon');
        chooseProfession(STAFF.uid, 'physiotherapist');
        chooseRole('Lead', 'Brandon');
        await save();
        expect(callOrder).toEqual(['updateDoc', 'setMemberRole']);
        expect(screen.getByRole('alert').textContent).toMatch(/^Their other changes were saved, but the role was not\./);
    });

    it('sends nothing in the sandbox', async () => {
        demoMode = true;
        render(<TeamMembersPanel />);
        await openEditorFor('Brandon');
        chooseRole('Lead', 'Brandon');
        await save();
        expect(roleSet).not.toHaveBeenCalled();
    });
});

describe('6b. the role-change log', () => {
    it('lists recent changes for a lead, newest first, as sentences', () => {
        roleChangeDocs = [
            { id: 'r2', data: { targetName: 'Brandon', fromRole: 'staff', toRole: 'lead', fromRostered: true, toRostered: true, byName: 'Nur', at: { toDate: () => new Date('2026-10-14T09:00:00+08:00') } } },
            { id: 'r1', data: { targetName: 'Jo', fromRole: 'staff', toRole: 'viewer', fromRostered: true, toRostered: false, byName: 'Nur', at: null } },
        ];
        render(<TeamMembersPanel />);
        const log = screen.getByRole('region', { name: 'Role changes' });
        const items = log.querySelectorAll('[data-role-change]');
        expect(items).toHaveLength(2);
        expect(items[0].textContent).toMatch(/^Brandon changed from staff to lead \(changed by Nur\)\./);
        expect(items[1].textContent).toMatch(/^Jo changed from staff to viewer \(changed by Nur\)\./);
    });

    it('is not shown, and not even listened for, by a non-lead', () => {
        team = asTeam({ isLead: false });
        render(<TeamMembersPanel />);
        expect(roleChangeListens).toBe(0);
        expect(screen.queryByRole('region', { name: 'Role changes' })).toBeNull();
    });

    it('opens no listener in the sandbox', () => {
        demoMode = true;
        render(<TeamMembersPanel />);
        expect(roleChangeListens).toBe(0);
    });

    it('says so when the log cannot be read, rather than showing nothing', async () => {
        render(<TeamMembersPanel />);
        await act(async () => { roleChangeListener.onError({ code: 'permission-denied' }); });
        expect(screen.getByRole('region', { name: 'Role changes' }).textContent).toMatch(/could not be read/i);
    });
});
