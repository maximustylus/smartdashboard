/**
 * ==============================================================================
 * OWNER INSIGHTS — is NEXUS working, and where should the owner look next?
 * ==============================================================================
 *
 * For the person who runs NEXUS and belongs to no team. Four parts: an overview
 * (sign-ups, activity, lead requests), the teams and what each has made, the
 * community report, and what this page may and may not open. It follows the
 * Insights pattern handed over from SMART START (v1.0, 2026-11-09), mapped to
 * what an owner may see, in the NEXUS shell: the same header card, the same pill
 * navigation, the same light and dark themes.
 *
 * ⚠️ THIS PAGE HOLDS NO PERMISSION. The platform figures come from one callable,
 *    `getOwnerInsights`, which refuses anybody who is not a super-admin and returns
 *    counts only — no person's name, address or wellbeing. If the call is refused
 *    the page shows `fallback` (the holding screen, when it stands in for it) and
 *    nothing else. See `functions/ownerInsights.cjs` for what may leave the server.
 *
 *    The community report is made from `community_insights/latest`, the nightly
 *    counts-only rollup any signed-in person may read. Nothing here can reach a
 *    team's roster or a screening record: there is no code path to one.
 *
 * Nothing here is stored and nothing is written.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
    Loader2, RefreshCw, AlertCircle, Inbox, LogOut, ShieldCheck, Sun, Moon, Download, Printer,
    Check, X, KeyRound,
} from 'lucide-react';
import {
    TABS, PERIOD_OPTIONS, PIPELINE_GROUPS, ACCESS_RULES, tilesFor, periodNote, pipelineLabel,
    pipelineSegments, isEmpty, signupBars, signupLabel, shortDayTime,
} from '../utils/ownerInsightsView';
import {
    buildCommunityReport, communityReportCsv, communityReportFilename, reportScopes,
} from '../utils/communityReport';

const call = (name) => httpsCallable(getFunctions(undefined, 'us-central1'), name);

/** The nightly rollup. Loaded only when the Community tab is opened. */
const readRollup = async () => {
    const [{ doc, getDoc }, { db }] = await Promise.all([import('firebase/firestore'), import('../firebase')]);
    const snap = await getDoc(doc(db, 'community_insights', 'latest'));
    return snap.exists() ? snap.data() : null;
};

const saveFile = (name, text) => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};

const TONE = {
    amber: { bar: 'bg-amber-500', dot: 'bg-amber-500' },
    emerald: { bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
    slate: { bar: 'bg-slate-400', dot: 'bg-slate-400' },
};

const card = 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm';
const heading = 'text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400';
const caption = 'text-xs text-slate-500 dark:text-slate-400 mt-3';
const iconButton = 'min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-full transition-all '
    + 'text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 active:scale-95 '
    + 'sm:hover:bg-slate-100 dark:sm:hover:bg-slate-700';
const button = 'min-h-[44px] inline-flex items-center gap-2 px-4 rounded-xl text-sm font-bold transition-all active:scale-95';

const Overview = ({ data, period, setPeriod, approvalsPath }) => {
    const tiles = tilesFor(data);
    const segments = pipelineSegments(data.pipeline);
    const bars = signupBars(data.signups);
    const note = periodNote(period);
    return (
        <>
            <div className="flex justify-end mb-3">
                <div className="inline-flex p-1 rounded-lg bg-slate-100 dark:bg-slate-900/50" role="group" aria-label="Period">
                    {PERIOD_OPTIONS.map((option) => (
                        <button
                            key={option.key}
                            type="button"
                            aria-pressed={period === option.key}
                            onClick={() => setPeriod(option.key)}
                            className={`min-h-[44px] px-3 rounded-md text-sm font-bold transition-all ${
                                period === option.key
                                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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

            {bars.length > 0 && (
                <section className={`${card} p-5 mt-4`} aria-labelledby="oi-signups">
                    <h2 id="oi-signups" className={heading}>Sign-ups by month</h2>
                    <div role="img" aria-label={signupLabel(data.signups)} className="mt-4 flex items-end gap-1.5 h-32">
                        {bars.map((bar) => (
                            <div key={bar.key} className="flex-1 h-full flex flex-col items-center justify-end gap-1 min-w-0">
                                <span className="text-[10px] font-bold tabular-nums text-slate-600 dark:text-slate-300">{bar.count > 0 ? bar.count : ''}</span>
                                <div
                                    className={`w-full rounded-t ${bar.count > 0 ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                                    style={{ height: bar.count > 0 ? `${Math.max(bar.height, 6)}%` : '2px' }}
                                />
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-1.5 mt-1" aria-hidden="true">
                        {bars.map((bar) => (
                            <span key={bar.key} className="flex-1 text-center text-[10px] text-slate-500 dark:text-slate-400">{bar.label}</span>
                        ))}
                    </div>
                    <p className={caption}>
                        Accounts created each month, the last twelve months. The period control does not change this chart.
                        {data.signups.undated > 0 && ` ${data.signups.undated} with no creation date are not shown.`}
                    </p>
                </section>
            )}

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
        </>
    );
};

const Teams = ({ data }) => {
    const columns = data.activity?.columns || [];
    return (
        <section className={`${card} p-5`} aria-labelledby="oi-teams">
            <h2 id="oi-teams" className={heading}>Teams and what they have made</h2>
            <div className="overflow-x-auto mt-3">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-xs text-slate-500 dark:text-slate-400">
                            <th scope="col" className="font-bold py-2 pr-3">Team</th>
                            <th scope="col" className="font-bold py-2 px-3 text-right">People</th>
                            <th scope="col" className="font-bold py-2 px-3 text-right">Leads</th>
                            <th scope="col" className="font-bold py-2 px-3 whitespace-nowrap">{data.year} roster</th>
                            {columns.map((column) => (
                                <th key={column.key} scope="col" className="font-bold py-2 px-3 text-right whitespace-nowrap">{column.label}</th>
                            ))}
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
                                <td className="py-2.5 px-3 text-right tabular-nums whitespace-nowrap">
                                    {team.members}
                                    {team.pendingMembers > 0 && <span className="text-xs text-slate-500 dark:text-slate-400"> +{team.pendingMembers} not registered</span>}
                                </td>
                                <td className="py-2.5 px-3 text-right tabular-nums">{team.leads}</td>
                                <td className="py-2.5 px-3 whitespace-nowrap">{team.hasRoster ? 'Yes' : 'Not yet'}</td>
                                {columns.map((column) => (
                                    <td key={column.key} className="py-2.5 px-3 text-right tabular-nums">{team.activity?.[column.key] ?? 0}</td>
                                ))}
                                <td className="py-2.5 pl-3 tabular-nums whitespace-nowrap text-slate-600 dark:text-slate-300">{team.createdOn || '–'}</td>
                            </tr>
                        ))}
                    </tbody>
                    {data.teamRows.length > 1 && (
                        <tfoot>
                            <tr className="border-t-2 border-slate-200 dark:border-slate-600 font-bold">
                                <th scope="row" className="py-2.5 pr-3 text-left">All teams</th>
                                <td className="py-2.5 px-3 text-right tabular-nums">{data.tiles.people.value}</td>
                                <td className="py-2.5 px-3 text-right tabular-nums">{data.tiles.people.leads}</td>
                                <td className="py-2.5 px-3 whitespace-nowrap">{data.tiles.teams.withRoster} of {data.tiles.teams.value}</td>
                                {columns.map((column) => (
                                    <td key={column.key} className="py-2.5 px-3 text-right tabular-nums">{data.activity.totals[column.key]}</td>
                                ))}
                                <td className="py-2.5 pl-3" />
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
            {data.teamRows.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">No teams yet.</p>}
            <p className={caption}>
                Counts only, all time; roster edits are for {data.year}. The database counts each item without loading it,
                so no roster, swap, post or report is opened. Pulse, wellbeing and workload are not counted at all.
                A person in two teams is counted once under People.
            </p>
        </section>
    );
};

const ReportTable = ({ title, head, rows }) => (rows.length === 0 ? null : (
    <div className="mt-5">
        <h3 className={heading}>{title}</h3>
        <table className="w-full text-sm mt-2">
            <thead>
                <tr className="text-left text-xs text-slate-500 dark:text-slate-400">
                    {head.map((label, index) => (
                        <th key={label} scope="col" className={`font-bold py-1.5 ${index === 0 ? 'pr-3' : 'px-3 text-right'}`}>{label}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.map((row) => (
                    <tr key={row[0]} className="border-t border-slate-100 dark:border-slate-700">
                        {row.map((value, index) => (index === 0
                            ? <th key={index} scope="row" className="py-1.5 pr-3 text-left font-medium">{value}</th>
                            : <td key={index} className="py-1.5 px-3 text-right tabular-nums">{value}</td>))}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
));

const Community = ({ loadRollup }) => {
    // 'loading' | 'ready' | 'empty' | 'error'
    const [state, setState] = useState({ status: 'loading', rollup: null });
    const [scope, setScope] = useState('all');

    useEffect(() => {
        let live = true;
        loadRollup()
            .then((rollup) => { if (live) setState(rollup ? { status: 'ready', rollup } : { status: 'empty', rollup: null }); })
            .catch(() => { if (live) setState({ status: 'error', rollup: null }); });
        return () => { live = false; };
    }, [loadRollup]);

    const report = useMemo(() => buildCommunityReport(state.rollup, { scope }), [state.rollup, scope]);

    if (state.status === 'loading') {
        return <div className={`${card} p-8 text-sm text-slate-500 dark:text-slate-400`} role="status">Loading the community figures…</div>;
    }
    if (state.status === 'error') {
        return <div role="alert" className={`${card} p-8 text-sm text-rose-700 dark:text-rose-300`}>The community figures could not be loaded. Check your connection and open this tab again.</div>;
    }
    if (!report) {
        return (
            <div className={`${card} p-8`}>
                <h2 className="text-lg font-black">No community figures yet</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    They are counted every night. If the public portal has had no completed screenings, there is nothing to report. This is not an error.
                </p>
            </div>
        );
    }

    return (
        <>
            <div className={`${card} p-4 flex flex-wrap items-end justify-between gap-3 print:hidden`}>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    <span className="block mb-1">Report covers</span>
                    <select
                        value={scope}
                        onChange={(event) => setScope(event.target.value)}
                        className="min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold"
                    >
                        {reportScopes(state.rollup).map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                    </select>
                </label>
                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => window.print()} className={`${button} border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200`}>
                        <Printer size={16} aria-hidden="true" /> Print or save as PDF
                    </button>
                    <button type="button" onClick={() => saveFile(communityReportFilename(report), communityReportCsv(report))} className={`${button} bg-indigo-600 text-white`}>
                        <Download size={16} aria-hidden="true" /> Download CSV
                    </button>
                </div>
            </div>

            <article className={`${card} p-6 mt-4 print:border-0 print:shadow-none print:p-0`} data-testid="community-report">
                <h2 className="text-xl font-black tracking-tight">{report.title}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {report.scopeLabel}{report.asOf && ` · figures as of ${report.asOf}`}
                </p>
                <div className="mt-4">
                    <div className={heading}>Completed screenings</div>
                    <div className="text-4xl font-black tabular-nums mt-1">{report.respondents}</div>
                </div>
                <ReportTable
                    title="What people reported"
                    head={['Need', 'People', 'Share']}
                    rows={report.domainRows.map((row) => [row.label, row.value, row.share || '–'])}
                />
                <ReportTable title="By region" head={['Region', 'People']} rows={report.regionRows.map((row) => [row.label, row.respondents])} />
                <ReportTable title="By month" head={['Month', 'People']} rows={report.monthRows.map((row) => [row.label, row.respondents])} />
                <ReportTable title="By postal sector" head={['Sector', 'People']} rows={report.sectorRows.map((row) => [row.label, row.respondents])} />
                <div className="mt-5">
                    <h3 className={heading}>How to read this</h3>
                    <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300 list-disc pl-4">
                        {report.notes.map((line) => <li key={line}>{line}</li>)}
                    </ul>
                </div>
            </article>
        </>
    );
};

const RuleList = ({ title, icon: Icon, tone, lines }) => (
    <div className="mt-4 first:mt-0">
        <h3 className="text-sm font-black">{title}</h3>
        <ul className="mt-2 space-y-1.5">
            {lines.map((line) => (
                <li key={line} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <Icon size={16} className={`shrink-0 mt-0.5 ${tone}`} aria-hidden="true" />
                    <span>{line}</span>
                </li>
            ))}
        </ul>
    </div>
);

const Access = ({ data }) => {
    const visits = data.access?.visits || [];
    return (
        <>
            <section className={`${card} p-5`} aria-labelledby="oi-rules">
                <h2 id="oi-rules" className={heading}>What this page can open</h2>
                <div className="mt-3">
                    <RuleList title="Counted" icon={Check} tone="text-emerald-600" lines={ACCESS_RULES.counted} />
                    <RuleList title="Never opened" icon={X} tone="text-rose-600" lines={ACCESS_RULES.neverOpened} />
                    <RuleList title="A team's own data, only when" icon={KeyRound} tone="text-amber-600" lines={ACCESS_RULES.byRequest} />
                </div>
                <p className={caption}>
                    These rules are enforced on the server. There is no button on this page that opens a team&apos;s data, and no hidden one.
                </p>
            </section>

            <section className={`${card} p-5 mt-4`} aria-labelledby="oi-visits">
                <div className="flex items-baseline justify-between">
                    <h2 id="oi-visits" className={heading}>Who has looked</h2>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 tabular-nums">{data.access?.total ?? 0} visits in all</span>
                </div>
                {visits.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">No earlier visits recorded.</p>
                ) : (
                    <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-700">
                        {visits.map((visit, index) => (
                            <li key={`${visit.at}-${index}`} className="py-2 flex items-center justify-between text-sm">
                                <span className="tabular-nums">{shortDayTime(visit.at)}</span>
                                <span className="text-slate-600 dark:text-slate-300">{visit.self ? 'You' : 'Another approver'}</span>
                            </li>
                        ))}
                    </ul>
                )}
                <p className={caption}>The last ten visits before this one, Singapore time. Every visit is recorded and no browser can change the record.</p>
            </section>
        </>
    );
};

const OwnerInsights = ({
    fallback = null, onSignOut, approvalsPath = '/admin/teams', isDark = false, onToggleTheme, loadRollup = readRollup,
}) => {
    const [period, setPeriod] = useState('all');
    const [tab, setTab] = useState('overview');
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

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white print:bg-white print:text-black">
            <div className="max-w-6xl mx-auto p-3 md:p-6">
                <header className={`${card} p-3 md:p-4 mb-4 md:mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden`}>
                    <div className="flex items-center gap-3">
                        <img src="/nexus.png" alt="NEXUS" className="h-8 md:h-10 w-auto object-contain drop-shadow-sm" onError={(event) => { event.target.style.display = 'none'; }} />
                        <h1 className="text-lg md:text-xl font-black tracking-tight">Insights</h1>
                    </div>

                    <nav className="order-last w-full lg:order-none lg:w-auto flex bg-slate-100 dark:bg-slate-900/50 p-1 rounded-lg" role="tablist" aria-label="Insights sections">
                        {TABS.map((item) => (
                            <button
                                key={item.key}
                                type="button"
                                role="tab"
                                id={`oi-tab-${item.key}`}
                                aria-selected={tab === item.key}
                                aria-controls="oi-panel"
                                onClick={() => setTab(item.key)}
                                className={`flex-1 lg:flex-none min-w-0 min-h-[44px] px-1.5 sm:px-3 xl:px-4 rounded-md text-xs sm:text-sm font-bold transition-all ${
                                    tab === item.key
                                        ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </nav>

                    <div className="flex items-center gap-1">
                        <button type="button" onClick={() => load(period)} aria-label="Refresh" className={iconButton}>
                            <RefreshCw size={18} aria-hidden="true" />
                        </button>
                        {onToggleTheme && (
                            <button type="button" onClick={onToggleTheme} aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'} className={iconButton}>
                                {isDark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
                            </button>
                        )}
                        {onSignOut && (
                            <button type="button" onClick={onSignOut} aria-label="Sign out" className={iconButton}>
                                <LogOut size={18} aria-hidden="true" />
                            </button>
                        )}
                    </div>
                </header>

                {status === 'error' && (
                    <div role="alert" className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-sm text-rose-800 dark:text-rose-200 print:hidden">
                        <AlertCircle size={18} className="shrink-0 mt-0.5" aria-hidden="true" />
                        <span>Insights could not be loaded. Check your connection, then press Refresh.</span>
                    </div>
                )}

                <main id="oi-panel" role="tabpanel" aria-labelledby={`oi-tab-${tab}`}>
                    {tab === 'community' && <Community loadRollup={loadRollup} />}
                    {tab !== 'community' && (isEmpty(data) ? (
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
                            {tab === 'overview' && <Overview data={data} period={period} setPeriod={setPeriod} approvalsPath={approvalsPath} />}
                            {tab === 'teams' && <Teams data={data} />}
                            {tab === 'access' && <Access data={data} />}
                        </>
                    ))}
                </main>

                <footer className="mt-6 text-xs text-slate-500 dark:text-slate-400 print:hidden">
                    <span className="inline-flex items-center gap-1.5">
                        <ShieldCheck size={14} aria-hidden="true" />
                        Visible to NEXUS approvers only. Each visit is logged.
                    </span>
                </footer>
            </div>
        </div>
    );
};

export default OwnerInsights;
