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
        screenings: { value: 412, total: 412 },
    },
    pipeline: { pending: 1, approved: 2, declined: 1, total: 4 },
    teamRows: [
        { name: 'Respiratory Therapy', institution: 'SGH', members: 6, leads: 2, pendingMembers: 1, hasRoster: true, createdOn: '2026-10-31' },
        { name: 'Audiology', institution: 'KKH', members: 3, leads: 1, pendingMembers: 0, hasRoster: false, createdOn: null },
    ],
    ...over,
});

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

describe('when the server answers', () => {
    it('calls the one callable, with the period', async () => {
        callable.mockResolvedValue({ data: payload() });
        render(<OwnerInsights />);
        await screen.findByRole('table');
        expect(callable).toHaveBeenCalledWith('getOwnerInsights', { period: 'all' });
    });

    it('shows the four tiles with their bases', async () => {
        callable.mockResolvedValue({ data: payload() });
        render(<OwnerInsights />);
        await screen.findByRole('table');
        expect(screen.getByTestId('tile-teams').textContent).toMatch(/Teams2.*1 of 2 with a 2026 roster/);
        expect(screen.getByTestId('tile-people').textContent).toMatch(/9.*3 leads across 2 teams, 1 not yet registered/);
        expect(screen.getByTestId('tile-requests').textContent).toMatch(/67%.*2 of 3 decided, 1 waiting/);
        expect(screen.getByTestId('tile-screenings').textContent).toMatch(/412/);
    });

    it('the pipeline has a text equivalent and chips into the approval queue', async () => {
        callable.mockResolvedValue({ data: payload() });
        render(<OwnerInsights approvalsPath="/admin/teams" />);
        const bar = await screen.findByRole('img');
        expect(bar.getAttribute('aria-label')).toBe('Lead requests: 1 waiting, 2 approved, 1 declined.');
        const chips = screen.getAllByRole('link').filter((a) => a.getAttribute('href') === '/admin/teams');
        expect(chips.length).toBe(3);
    });

    it('lists teams, and says "Not yet" and a dash rather than leaving blanks', async () => {
        callable.mockResolvedValue({ data: payload() });
        render(<OwnerInsights />);
        const table = await screen.findByRole('table');
        expect(table.textContent).toMatch(/Respiratory TherapySGH6 \+1 not registered2Yes2026-10-31/);
        expect(table.textContent).toMatch(/AudiologyKKH31Not yet–/);
    });

    it('says who can see it and that visits are logged', async () => {
        callable.mockResolvedValue({ data: payload() });
        render(<OwnerInsights />);
        await screen.findByRole('table');
        expect(screen.getByText(/Visible to NEXUS approvers only\. Each visit is logged\./)).toBeTruthy();
        expect(screen.getByText(/No person is named on this page/)).toBeTruthy();
    });
});

describe('the period control', () => {
    it('marks the chosen period, refetches, and explains what changed', async () => {
        callable.mockResolvedValue({ data: payload() });
        render(<OwnerInsights />);
        await screen.findByRole('table');
        expect(screen.queryByTestId('period-note')).toBeNull();
        expect(screen.getByRole('button', { name: 'All time' }).getAttribute('aria-pressed')).toBe('true');

        callable.mockResolvedValue({ data: payload({ period: '30' }) });
        fireEvent.click(screen.getByRole('button', { name: '30 days' }));
        await waitFor(() => expect(callable).toHaveBeenLastCalledWith('getOwnerInsights', { period: '30' }));
        expect(screen.getByRole('button', { name: '30 days' }).getAttribute('aria-pressed')).toBe('true');
        expect((await screen.findByTestId('period-note')).textContent).toMatch(/always show everything/);
    });
});

describe('edges', () => {
    it('one empty state, no empty charts', async () => {
        const none = payload();
        none.tiles.teams.value = 0; none.pipeline = { pending: 0, approved: 0, declined: 0, total: 0 };
        none.tiles.screenings = { value: 0, total: 0 }; none.teamRows = [];
        callable.mockResolvedValue({ data: none });
        render(<OwnerInsights />);
        expect(await screen.findByText('No insights yet')).toBeTruthy();
        expect(screen.queryByRole('table')).toBeNull();
        expect(screen.queryByRole('img')).toBeNull();
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
        render(<OwnerInsights onSignOut={onSignOut} />);
        await screen.findByRole('table');
        fireEvent.click(screen.getByRole('button', { name: /Sign out/ }));
        expect(onSignOut).toHaveBeenCalledTimes(1);
    });
});
