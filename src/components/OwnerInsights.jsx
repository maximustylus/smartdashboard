/**
 * ==============================================================================
 * OWNER INSIGHTS — is NEXUS working, and where should the owner look next?
 * ==============================================================================
 *
 * For the person who runs NEXUS and belongs to no team. Tiles for the headline,
 * one wide picture of where lead requests stand, a table of teams, captions that
 * state the base. It follows the Insights pattern handed over from SMART START
 * (v1.0, 2026-11-09), mapped to what an owner may see.
 *
 * ⚠️ THIS PAGE HOLDS NO PERMISSION. Everything on it comes from one callable,
 *    `getOwnerInsights`, which refuses anybody who is not a super-admin and returns
 *    counts only — no person's name, address or wellbeing. If the call is refused
 *    the page shows `fallback` (the holding screen, when it stands in for it) and
 *    nothing else. See `functions/ownerInsights.cjs` for what may leave the server.
 *
 * Nothing here is stored and nothing is written.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { BarChart3, Loader2, RefreshCw, AlertCircle, Inbox, LogOut, ShieldCheck } from 'lucide-react';
import {
    PERIOD_OPTIONS, PIPELINE_GROUPS, tilesFor, periodNote, pipelineLabel, pipelineSegments, isEmpty,
} from '../utils/ownerInsightsView';

const call = (name) => httpsCallable(getFunctions(undefined, 'us-central1'), name);

const TONE = {
    amber: { bar: 'bg-amber-500', dot: 'bg-amber-500' },
    emerald: { bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
    slate: { bar: 'bg-slate-400', dot: 'bg-slate-400' },
};

const card = 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl';
const heading = 'text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400';
const caption = 'text-xs text-slate-500 dark:text-slate-400 mt-3';

const OwnerInsights = ({ fallback = null, onSignOut, approvalsPath = '/admin/teams' }) => {
    const [period, setPeriod] = useState('all');
    const [data, setData] = useState(null);
    // 'loading' | 'ready' | 'refused' | 'error'
    const [status, setStatus] = useState('loading');

    const load = useCallback(async (nextPeriod) => {
        setStatus((previous) => (previous === 'ready' ? 'ready' : 'loading'));
        try {
            const result = await call('getOwnerInsights')({ period: nextPeriod });
            setData(result.data);
            setStatus('ready');
        } catch (error) {
            const code = error?.code || '';
            setStatus(code.includes('permission-denied') || code.includes('unauthenticated') ? 'refused' : 'error');
        }
    }, []);

    useEffect(() => { load(period); }, [load, period]);

    if (status === 'refused') {
        return fallback || (
            <div className="max-w-xl mx-auto p-6 text-center">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                    This page is for the people who run NEXUS. Your account is not one of them.
                </p>
            </div>
        );
    }

    if (status === 'loading' && !data) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900" role="status">
                <Loader2 className="animate-spin text-indigo-600" size={32} aria-hidden="true" />
                <span className="sr-only">Loading insights</span>
            </div>
        );
    }

    const tiles = tilesFor(data);
    const segments = pipelineSegments(data?.pipeline);
    const note = periodNote(period);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">
            <div className="max-w-5xl mx-auto p-4 md:p-8">
                <header className="flex flex-wrap items-center justify-between gap-3 mb-6">
                    <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                        <BarChart3 size={24} className="text-indigo-600" aria-hidden="true" />
                        Insights <span className="text-slate-400 font-bold">· NEXUS</span>
                    </h1>
                    <div className="flex items-center gap-2">
                        <div className="inline-flex p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800" role="group" aria-label="Period">
                            {PERIOD_OPTIONS.map((option) => (
                                <button
                                    key={option.key}
                                    type="button"
                                    aria-pressed={period === option.key}
                                    onClick={() => setPeriod(option.key)}
                                    className={`min-h-[44px] px-3 rounded-lg text-sm font-bold transition-colors ${
                                        period === option.key
                                            ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white'
                                            : 'text-slate-600 dark:text-slate-300'
                                    }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={() => load(period)}
                            aria-label="Refresh"
                            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                        >
                            <RefreshCw size={18} aria-hidden="true" />
                        </button>
                    </div>
                </header>

                {status === 'error' && (
                    <div role="alert" className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-sm text-rose-800 dark:text-rose-200">
                        <AlertCircle size={18} className="shrink-0 mt-0.5" aria-hidden="true" />
                        <span>Insights could not be loaded. Check your connection, then press Refresh.</span>
                    </div>
                )}

                {isEmpty(data) ? (
                    <div className={`${card} p-10 text-center`}>
                        <Inbox size={32} className="mx-auto text-slate-400 mb-3" aria-hidden="true" />
                        <h2 className="text-lg font-black">No insights yet</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Nothing to count until the first lead request arrives.
                        </p>
                        <a href={approvalsPath} className="inline-flex items-center justify-center min-h-[44px] mt-4 px-4 rounded-xl bg-indigo-600 text-white text-sm font-bold">
                            Open lead requests
                        </a>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {tiles.map((tile) => (
                                <div key={tile.key} className={`${card} p-4`} data-testid={`tile-${tile.key}`}>
                                    <div className={heading}>{tile.label}</div>
                                    <div className="mt-1 text-3xl font-black tabular-nums">
                                        {tile.value}
                                        {tile.unit && <span className="text-base font-bold text-slate-400 ml-0.5">{tile.unit}</span>}
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{tile.context}</div>
                                </div>
                            ))}
                        </div>
                        {note && <p className={caption} data-testid="period-note">{note}</p>}

                        <section className={`${card} p-5 mt-4`} aria-labelledby="oi-pipeline">
                            <div className="flex items-baseline justify-between">
                                <h2 id="oi-pipeline" className={heading}>Lead requests</h2>
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 tabular-nums">{data.pipeline.total} in all</span>
                            </div>
                            <div
                                role="img"
                                aria-label={pipelineLabel(data.pipeline)}
                                className="mt-3 h-2.5 rounded-full overflow-hidden flex gap-0.5 bg-slate-100 dark:bg-slate-700"
                            >
                                {segments.map((segment) => (
                                    <div key={segment.key} className={TONE[segment.tone].bar} style={{ width: `${segment.width}%` }} />
                                ))}
                            </div>
                            <div className="grid grid-cols-3 gap-2 mt-3">
                                {PIPELINE_GROUPS.map((group) => (
                                    <a
                                        key={group.key}
                                        href={approvalsPath}
                                        className="min-h-[44px] flex items-center gap-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm"
                                    >
                                        <span className={`w-2.5 h-2.5 rounded-full ${TONE[group.tone].dot}`} aria-hidden="true" />
                                        <b className="tabular-nums">{data.pipeline[group.key]}</b>
                                        <span className="text-slate-600 dark:text-slate-300">{group.label}</span>
                                    </a>
                                ))}
                            </div>
                            <p className={caption}>Each chip opens the approval queue.</p>
                        </section>

                        <section className={`${card} p-5 mt-4`} aria-labelledby="oi-teams">
                            <h2 id="oi-teams" className={heading}>Teams</h2>
                            <div className="overflow-x-auto mt-3">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-xs text-slate-500 dark:text-slate-400">
                                            <th scope="col" className="font-bold py-2 pr-3">Team</th>
                                            <th scope="col" className="font-bold py-2 px-3 text-right">People</th>
                                            <th scope="col" className="font-bold py-2 px-3 text-right">Leads</th>
                                            <th scope="col" className="font-bold py-2 px-3">{data.year} roster</th>
                                            <th scope="col" className="font-bold py-2 pl-3">Created</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.teamRows.map((team, index) => (
                                            <tr key={`${team.name}-${team.institution}-${index}`} className="border-t border-slate-100 dark:border-slate-700">
                                                <th scope="row" className="py-2.5 pr-3 text-left font-bold">
                                                    {team.name}
                                                    {team.institution && <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">{team.institution}</span>}
                                                </th>
                                                <td className="py-2.5 px-3 text-right tabular-nums">
                                                    {team.members}
                                                    {team.pendingMembers > 0 && <span className="text-xs text-slate-500 dark:text-slate-400"> +{team.pendingMembers} not registered</span>}
                                                </td>
                                                <td className="py-2.5 px-3 text-right tabular-nums">{team.leads}</td>
                                                <td className="py-2.5 px-3">{team.hasRoster ? 'Yes' : 'Not yet'}</td>
                                                <td className="py-2.5 pl-3 tabular-nums text-slate-600 dark:text-slate-300">{team.createdOn || '–'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <p className={caption}>
                                Counts only. No person is named on this page, and wellbeing, pulse and workload are not read at all.
                                A person in two teams is counted once under People.
                            </p>
                        </section>
                    </>
                )}

                <footer className="flex flex-wrap items-center justify-between gap-3 mt-6 text-xs text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1.5">
                        <ShieldCheck size={14} aria-hidden="true" />
                        Visible to NEXUS approvers only. Each visit is logged.
                    </span>
                    {onSignOut && (
                        <button type="button" onClick={onSignOut} className="min-h-[44px] inline-flex items-center gap-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200">
                            <LogOut size={14} aria-hidden="true" /> Sign out
                        </button>
                    )}
                </footer>
            </div>
        </div>
    );
};

export default OwnerInsights;
