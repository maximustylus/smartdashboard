/**
 * OWNER INSIGHTS, mounted. The page holds no permission, so the two things that
 * matter are what it does when the server says no, and that what it shows is what
 * the server sent.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';

const callable = vi.fn();
vi.mock('firebase/functions', () => ({
    getFunctions: () => ({}),
    httpsCallable: (_functions, name) => (payload) => callable(name, payload),
}));

import OwnerInsights from './OwnerInsights';

const payload = (over = {}) => ({
    period: 'all',
    year: '2026',
    generatedAt: '2026-11-10T04:00:00.000Z',
    tiles: {
        teams: { value: 2, newInPeriod: 2, withRoster: 1 },
        people: { value: 9, leads: 3, pendingMembers: 1, teams: 2 },
        requests: { pending: 1, approved: 2, decided: 3, approvalRate: 67 },
        accounts: { value: 12, verified: 11, inTeams: 9, withoutTeam: 3, newInPeriod: 12, active30: 7, truncated: false },
        screenings: { value: 412, asOf: '2026-11-09T19:50:00.000Z', truncated: false },
    },
    pipeline: { pending: 1, approved: 2, declined: 1, total: 4 },
    signups: { months: [{ key: '2026-09', count: 0 }, { key: '2026-10', count: 8 }, { key: '2026-11', count: 4 }], undated: 0 },
    activity: {
        columns: [{ key: 'rosters', label: 'Rosters' }, { key: 'swaps', label: 'Swaps' }, { key: 'feedPosts', label: 'Feed posts' }],
        totals: { rosters: 1, swaps: 5, feedPosts: 20 },
    },
    teamRows: [
        { name: 'Respiratory Therapy', institution: 'SGH', members: 6, leads: 2, pendingMembers: 1, hasRoster: true, createdOn: '2026-10-31', activity: { rosters: 1, swaps: 5, feedPosts: 18 } },
        { name: 'Audiology', institution: 'KKH', members: 3, leads: 1, pendingMembers: 0, hasRoster: false, createdOn: null, activity: { rosters: 0, swaps: 0, feedPosts: 2 } },
    ],
    access: { visits: [{ at: '2026-11-10T03:00:00.000Z', self: true }, { at: '2026-11-08T01:30:00.000Z', self: false }], total: 14 },
    ...over,
});

const rollup = () => ({
    generatedAt: '2026-11-09T19:50:00.000Z',
    national: { respondents: 120, domains: { foodInsecurity: 12, fallsRisk: '<5' } },
    regions: { north: { respondents: 70, domains: {} }, west: { respondents: 40, domains: {} } },
    sectors: { '82': { respondents: 30, domains: {} } },
    periods: { '2026-09': { respondents: 90, domains: { foodInsecurity: 9, fallsRisk: 0 } }, '2026-10': { respondents: 30, domains: { foodInsecurity: '<5', fallsRisk: 0 } } },
    suppression: { minCell: 10, minCount: 5, band: '<5', suppressedSectorCount: 3, suppressedRespondents: 10 },
    quality: { undatedRecords: 0, unlocatedRecords: 10 },
    domainKeys: ['foodInsecurity', 'fallsRisk'],
});

/** Renders, waits for the page, and opens a tab when asked. */
const open = async (props = {}, tab = null) => {
    render(<OwnerInsights {...props} />);
    await screen.findByRole('tablist');
    if (tab) fireEvent.click(screen.getByRole('tab', { name: tab }));
};

const refused = () => Object.assign(new Error('no'), { code: 'functions/permission-denied' });

beforeEach(() => { callable.mockReset(); });
afterEach(cleanup);

describe('when the server refuses', () => {
    it('shows the fallback and nothing of the page', async () => {
        callable.mockRejectedValue(refused());
        render(<OwnerInsights fallback={<div>HOLDING SCREEN</div>} />);
        expect(await screen.findByText('HOLDING SCREEN')).toBeTruthy();
        expect(screen.queryByText(/Insights/)).toBeNull();
        expect(screen.queryByRole('table')).toBeNull();
    });

    it('with no fallback, says so plainly', async () => {
        callable.mockRejectedValue(refused());
        render(<OwnerInsights />);
        expect(await screen.findByText(/for the people who run NEXUS/)).toBeTruthy();
    });

    it('treats signed-out the same way', async () => {
        callable.mockRejectedValue(Object.assign(new Error('no'), { code: 'functions/unauthenticated' }));
        render(<OwnerInsights fallback={<div>HOLDING SCREEN</div>} />);
        expect(await screen.findByText('HOLDING SCREEN')).toBeTruthy();
    });
});

describe('the overview', () => {
    it('calls the one callable, with the period', async () => {
        callable.mockResolvedValue({ data: payload() });
        await open();
        expect(callable).toHaveBeenCalledWith('getOwnerInsights', { period: 'all' });
    });

    it('shows the tiles with their bases', async () => {
        callable.mockResolvedValue({ data: payload() });
        await open();
        expect(screen.getByTestId('tile-accounts').textContent).toMatch(/Sign-ups12.*11 with a confirmed email, 3 not in a team/);
        expect(screen.getByTestId('tile-active').textContent).toMatch(/Active7.*of 12 used NEXUS in the last 30 days/);
        expect(screen.getByTestId('tile-teams').textContent).toMatch(/Teams2.*1 of 2 with a 2026 roster/);
        expect(screen.getByTestId('tile-people').textContent).toMatch(/9.*3 leads across 2 teams, 1 not yet registered/);
        expect(screen.getByTestId('tile-requests').textContent).toMatch(/67%.*2 of 3 decided, 1 waiting/);
        expect(screen.getByTestId('tile-screenings').textContent).toMatch(/412.*as of 10 Nov 2026/);
    });

    it('both charts have a sentence, and the chips open the approval queue', async () => {
        callable.mockResolvedValue({ data: payload() });
        await open({ approvalsPath: '/admin/teams' });
        const labels = screen.getAllByRole('img').map((node) => node.getAttribute('aria-label')).filter(Boolean);
        expect(labels).toContain('Sign-ups by month, last 3 months, 12 in all: Oct 2026 8, Nov 2026 4.');
        expect(labels).toContain('Lead requests: 1 waiting, 2 approved, 1 declined.');
        const chips = screen.getAllByRole('link').filter((a) => a.getAttribute('href') === '/admin/teams');
        expect(chips.length).toBe(3);
    });

    it('marks the chosen period, refetches, and explains what changed', async () => {
        callable.mockResolvedValue({ data: payload() });
        await open();
        expect(screen.queryByTestId('period-note')).toBeNull();
        expect(screen.getByRole('button', { name: 'All time' }).getAttribute('aria-pressed')).toBe('true');

        callable.mockResolvedValue({ data: payload({ period: '30' }) });
        fireEvent.click(screen.getByRole('button', { name: '30 days' }));
        await waitFor(() => expect(callable).toHaveBeenLastCalledWith('getOwnerInsights', { period: '30' }));
        expect(screen.getByRole('button', { name: '30 days' }).getAttribute('aria-pressed')).toBe('true');
        expect((await screen.findByTestId('period-note')).textContent).toMatch(/Everything else always shows everything/);
    });
});

describe('the teams tab', () => {
    it('lists each team with what it has made, and says "Not yet" and a dash rather than leaving blanks', async () => {
        callable.mockResolvedValue({ data: payload() });
        await open({}, 'Teams');
        const table = screen.getByRole('table');
        expect(table.textContent).toMatch(/Rosters.*Swaps.*Feed posts/);
        expect(table.textContent).toMatch(/Respiratory TherapySGH6 \+1 not registered2Yes15182026-10-31/);
        expect(table.textContent).toMatch(/AudiologyKKH31Not yet002–/);
        expect(table.textContent).toMatch(/All teams931 of 21520/);
    });

    it('says the items are counted and never opened', async () => {
        callable.mockResolvedValue({ data: payload() });
        await open({}, 'Teams');
        expect(screen.getByText(/no roster, swap, post or report is opened/)).toBeTruthy();
        expect(screen.getByText(/Pulse, wellbeing and workload are not counted at all/)).toBeTruthy();
    });
});

describe('the community tab', () => {
    it('loads the rollup only when opened, and lays it out as a report', async () => {
        callable.mockResolvedValue({ data: payload() });
        const loadRollup = vi.fn().mockResolvedValue(rollup());
        await open({ loadRollup });
        expect(loadRollup).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('tab', { name: 'Community' }));
        const report = await screen.findByTestId('community-report');
        expect(loadRollup).toHaveBeenCalledTimes(1);
        expect(report.textContent).toMatch(/NEXUS Community reportAll time · figures as of 10 November 2026/);
        expect(report.textContent).toMatch(/Completed screenings120/);
        expect(report.textContent).toMatch(/Food insecurity1210%/);
        // A withheld count stays withheld: no number, no share.
        expect(report.textContent).toMatch(/Fall in past 12 months \(60\+\)<5–/);
        expect(report.textContent).toMatch(/North70/);
        expect(report.textContent).toMatch(/3 postal sectors are withheld/);
    });

    it('a single month drops the area tables and says why', async () => {
        callable.mockResolvedValue({ data: payload() });
        await open({ loadRollup: () => Promise.resolve(rollup()) }, 'Community');
        await screen.findByTestId('community-report');
        fireEvent.change(screen.getByLabelText('Report covers'), { target: { value: '2026-10' } });
        const report = screen.getByTestId('community-report');
        expect(report.textContent).toMatch(/October 2026/);
        expect(report.textContent).toMatch(/Completed screenings30/);
        expect(report.textContent).not.toMatch(/By region/);
        expect(report.textContent).toMatch(/A single month has no area tables/);
    });

    it('offers a CSV and a print, and no rollup yet is not an error', async () => {
        callable.mockResolvedValue({ data: payload() });
        await open({ loadRollup: () => Promise.resolve(null) }, 'Community');
        expect(await screen.findByText('No community figures yet')).toBeTruthy();
        expect(screen.queryByRole('alert')).toBeNull();
        cleanup();
        await open({ loadRollup: () => Promise.resolve(rollup()) }, 'Community');
        await screen.findByTestId('community-report');
        expect(screen.getByRole('button', { name: /Download CSV/ })).toBeTruthy();
        expect(screen.getByRole('button', { name: /Print or save as PDF/ })).toBeTruthy();
    });

    it('a rollup that cannot be read says so', async () => {
        callable.mockResolvedValue({ data: payload() });
        await open({ loadRollup: () => Promise.reject(new Error('offline')) }, 'Community');
        expect((await screen.findByRole('alert')).textContent).toMatch(/could not be loaded/);
    });
});

describe('the access tab', () => {
    it('says what is counted, what is never opened, and the only ways into a team', async () => {
        callable.mockResolvedValue({ data: payload() });
        await open({}, 'Access');
        expect(screen.getByText('Counted')).toBeTruthy();
        expect(screen.getByText('Never opened')).toBeTruthy();
        expect(screen.getByText(/A team's lead asks, and adds you to their team/)).toBeTruthy();
        expect(screen.getByText(/A legal or safety duty requires it/)).toBeTruthy();
        expect(screen.getByText(/no button on this page that opens a team's data/)).toBeTruthy();
    });

    it('lists recent visits as you or another approver, never by name', async () => {
        callable.mockResolvedValue({ data: payload() });
        await open({}, 'Access');
        expect(screen.getByText('14 visits in all')).toBeTruthy();
        expect(screen.getByText('10 Nov 2026, 11:00')).toBeTruthy();
        expect(screen.getByText('You')).toBeTruthy();
        expect(screen.getByText('Another approver')).toBeTruthy();
    });
});

describe('the shell', () => {
    it('says who can see it and that visits are logged, on every tab', async () => {
        callable.mockResolvedValue({ data: payload() });
        await open({}, 'Teams');
        expect(screen.getByText(/Visible to NEXUS approvers only\. Each visit is logged\./)).toBeTruthy();
    });

    it('marks the open tab', async () => {
        callable.mockResolvedValue({ data: payload() });
        await open({}, 'Access');
        expect(screen.getByRole('tab', { name: 'Access' }).getAttribute('aria-selected')).toBe('true');
        expect(screen.getByRole('tab', { name: 'Overview' }).getAttribute('aria-selected')).toBe('false');
    });

    it('the theme button says where it goes and calls back; it is absent without a handler', async () => {
        callable.mockResolvedValue({ data: payload() });
        const onToggleTheme = vi.fn();
        await open({ isDark: true, onToggleTheme });
        fireEvent.click(screen.getByRole('button', { name: 'Switch to light theme' }));
        expect(onToggleTheme).toHaveBeenCalledTimes(1);
        cleanup();
        await open({ isDark: false, onToggleTheme });
        expect(screen.getByRole('button', { name: 'Switch to dark theme' })).toBeTruthy();
        cleanup();
        await open();
        expect(screen.queryByRole('button', { name: /theme/ })).toBeNull();
    });
});

describe('edges', () => {
    it('one empty state, no empty charts', async () => {
        const none = payload();
        none.tiles.teams.value = 0; none.pipeline = { pending: 0, approved: 0, declined: 0, total: 0 };
        none.tiles.screenings = { value: null, asOf: null, truncated: false }; none.teamRows = [];
        none.tiles.accounts.value = 0;
        callable.mockResolvedValue({ data: none });
        render(<OwnerInsights />);
        expect(await screen.findByText('No insights yet')).toBeTruthy();
        expect(screen.queryByRole('table')).toBeNull();
        expect(screen.queryByRole('img', { name: /Sign-ups|Lead requests/ })).toBeNull();
    });

    it('a network failure is an error with a next step, not the fallback', async () => {
        callable.mockRejectedValue(Object.assign(new Error('down'), { code: 'functions/unavailable' }));
        render(<OwnerInsights fallback={<div>HOLDING SCREEN</div>} />);
        expect((await screen.findByRole('alert')).textContent).toMatch(/could not be loaded.*Refresh/);
        expect(screen.queryByText('HOLDING SCREEN')).toBeNull();
    });

    it('offers sign out only when given a way to', async () => {
        callable.mockResolvedValue({ data: payload() });
        const onSignOut = vi.fn();
        await open({ onSignOut });
        fireEvent.click(screen.getByRole('button', { name: /Sign out/ }));
        expect(onSignOut).toHaveBeenCalledTimes(1);
        cleanup();
        await open();
        expect(screen.queryByRole('button', { name: /Sign out/ })).toBeNull();
    });
});
