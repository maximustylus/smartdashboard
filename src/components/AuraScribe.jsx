import React, { useEffect, useRef, useState } from 'react';
import './AuraScribe.css';
import { SCRIBE_STATES, tapIntervalSeconds } from '../utils/auraScribe';

/*
 * The drawing. `state` comes from `deriveScribeState`; this component never
 * decides one. Right-handed (owner, 2026-11-09): the tip points to 8 o'clock
 * and the body leans up to 2 o'clock, the way a pencil sits in a right hand.
 *
 * Geometry is in viewBox units, 220 × 140. The pencil is 104 long, tip at its
 * origin and the body along −x, so a pose is just "where is the tip, at what
 * angle". At the writing angle (150°) the eraser sits 90 right and 52 above the
 * tip; turned end over end (−30°) it sits 90 left and 52 below.
 */

const WRITE = 150;
const FLIP = -30;
const HOME = { x: 116, y: 74, r: WRITE };

const ROWS = [54, 66, 78, 90, 102, 114];
const DRAFT = [50, 40, 46, 30, 44, 24];
const LISTEN = [[42, 54, 16], [62, 54, 20], [42, 66, 12]];
const NOTES = [58, 82, 106];
const CRUMBS = [[56, -3], [62, 2], [68, -1], [74, 4], [80, -4]];

const prefersReducedMotion = () => {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
};

/** A timed list of steps for each state: [ms, pose?, flags-to-turn-on?]. */
function script(state) {
    const s = [];
    const at = (ms, pose, ...flags) => s.push([ms, pose, flags]);
    switch (state) {
    case 'typing':
        at(0, { x: 64, y: 70, r: WRITE });
        break;
    case 'thinking':
        at(0, { x: 70, y: 60, r: WRITE + 6 });
        break;
    case 'listen':
        LISTEN.forEach(([x, y, len], i) => at(250 + i * 420, { x: x + len, y, r: WRITE }, `listen${i}`));
        at(250 + LISTEN.length * 420 + 300, HOME);
        break;
    case 'drafting':
        ROWS.forEach((y, i) => at(200 + i * 380, { x: 42 + DRAFT[i], y, r: WRITE }, `draft${i}`));
        at(200 + ROWS.length * 380 + 150, { x: 86, y: 122, r: WRITE + 8 }, 'sig');
        at(200 + ROWS.length * 380 + 900, HOME);
        break;
    case 'research':
        NOTES.forEach((y, i) => at(200 + i * 500, { x: 34, y, r: WRITE }, `note${i}`, `q${i}`));
        at(200 + NOTES.length * 500 + 300, HOME);
        break;
    case 'propose':
        at(0, { x: 56, y: 82, r: WRITE }, 'box');
        at(450, { x: 80, y: 82, r: WRITE }, 'value');
        at(1000, { x: 94, y: 70, r: WRITE });
        break;
    case 'approve':
        at(0, { x: 94, y: 70, r: WRITE }, 'box', 'value', 'ink');
        at(700, HOME);
        break;
    case 'refuse':
        at(0, { x: 94, y: 70, r: WRITE }, 'box', 'value');
        at(350, { x: 56 + 90, y: 84 - 52, r: FLIP });
        at(800, { x: 80 + 90, y: 84 - 52, r: FLIP });
        at(1200, { x: 62 + 90, y: 84 - 52, r: FLIP }, 'crumbs', 'rubbed');
        at(1900, HOME);
        break;
    case 'rework':
        ROWS.forEach((_, i) => at(0, null, `draft${i}`));
        at(500, null, 'ghosted', 'short');
        at(1300, { x: 78, y: 89, r: WRITE }, 'shorter');
        at(2100, HOME);
        break;
    case 'snap':
        at(0, { x: 60, y: 66, r: WRITE });
        at(350, { x: 60, y: 70, r: WRITE });
        at(650, { x: 62, y: 62, r: WRITE + 6 }, 'snapped', 'chip');
        at(1150, { x: 62, y: 62, r: WRITE - 6 }, 'snapped');
        at(1350, { x: 62, y: 62, r: WRITE + 4 }, 'snapped');
        at(1600, HOME);
        break;
    case 'rest':
        at(0, { x: 110, y: 134, r: 180 });
        at(600, null, 'closed');
        break;
    default:
        at(0, HOME);
    }
    return s;
}

export default function AuraScribe({ state = 'idle', ghost = false, proposal = '', tint = null, draftLength = 0 }) {
    const [pose, setPose] = useState(HOME);
    const [on, setOn] = useState({});
    const [tapUp, setTapUp] = useState(false);
    const draftRef = useRef(draftLength);
    draftRef.current = draftLength;

    // Run the state's script from a clean page. Steps that turn flags on keep
    // them on; a later step may also hold a flag (`snapped`) for its duration.
    useEffect(() => {
        const reduce = prefersReducedMotion();
        const timers = [];
        setOn({});
        script(state).forEach(([ms, p, flags], i, all) => {
            const run = () => {
                if (p) setPose(p);
                if (flags.length) setOn((prev) => ({ ...prev, ...Object.fromEntries(flags.map((f) => [f, true])) }));
                // The snapped tip comes back once the wiggles are done.
                if (state === 'snap' && i === all.length - 1) setOn((prev) => ({ ...prev, snapped: false }));
            };
            if (reduce || ms === 0) run(); else timers.push(setTimeout(run, ms));
        });
        return () => timers.forEach(clearTimeout);
    }, [state]);

    // The tap. Only while listening to typing. Lifts the tip 2.5 units and
    // settles; leaves no mark. The interval is re-read every tap, so it eases
    // as the draft grows without restarting.
    useEffect(() => {
        if (state !== 'typing') return undefined;
        if (prefersReducedMotion()) return undefined; // the CSS breath stands in
        let next;
        let settle;
        const tap = () => {
            setTapUp(true);
            settle = setTimeout(() => setTapUp(false), 180);
            next = setTimeout(tap, tapIntervalSeconds(draftRef.current) * 1000);
        };
        next = setTimeout(tap, 400);
        return () => { clearTimeout(next); clearTimeout(settle); setTapUp(false); };
    }, [state]);

    const label = SCRIBE_STATES[state] ?? SCRIBE_STATES.idle;
    const cls = (base, flag) => `${base}${on[flag] ? ' on' : ''}`;

    return (
        <svg
            className="aura-scribe"
            viewBox="0 0 220 140"
            role="img"
            aria-label={label}
            data-state={state}
            data-ghost={ghost ? 'true' : 'false'}
            data-tapping={state === 'typing' ? 'true' : 'false'}
            style={tint ? { '--cover': tint } : undefined}
        >
            <g className="book">
                <rect className="cover" x="8" y="34" width="96" height="100" rx="8" fill="var(--cover)" />
                <rect className="binding" x="8" y="34" width="10" height="100" rx="4" fill="var(--brand-deep)" />

                <g className="page" style={{ opacity: on.ghosted ? 0.35 : 1, transition: 'opacity .5s' }}>
                    <rect x="24" y="40" width="74" height="88" rx="4" fill="var(--paper)" stroke="var(--rule)" />
                    {ROWS.map((y) => <path key={y} d={`M30 ${y}h64`} stroke="var(--rule)" strokeWidth="1" />)}
                    <path d="M38 44v80" stroke="var(--margin)" strokeWidth="1" />

                    {LISTEN.map(([x, y, len], i) => (
                        <path key={`l${i}`} className={cls('stroke', `listen${i}`)} style={{ '--len': len }} d={`M${x} ${y}h${len}`} />
                    ))}
                    {ROWS.map((y, i) => (
                        <path key={`d${i}`} className={cls('stroke', `draft${i}`)} style={{ '--len': DRAFT[i], '--dur': '0.35s' }} d={`M42 ${y}h${DRAFT[i]}`} />
                    ))}
                    {NOTES.map((y, i) => (
                        <g key={`n${i}`}>
                            <path className={cls('stroke', `note${i}`)} style={{ '--len': 7 }} d={`M26 ${y}h7`} />
                            <text className={cls('fade', `q${i}`)} style={{ '--delay': '0.25s' }} x="30" y={y - 2} fontSize="7">?</text>
                        </g>
                    ))}
                    <path className={cls('stroke', 'sig')} style={{ '--len': 26 }} d="M64 122c3-4 6 3 9-1s4 1 7-2" />
                </g>

                {/* The shorter page of a rework, over the ghost of the one before it. */}
                <g className={cls('fade', 'short')}>
                    <rect x="24" y="40" width="74" height="54" rx="4" fill="var(--paper)" stroke="var(--rule)" />
                    {ROWS.slice(0, 3).map((y, i) => (
                        <path key={y} d={`M42 ${y}h${DRAFT[i]}`} stroke="var(--pencil-grey)" strokeWidth="1.6" strokeLinecap="round" />
                    ))}
                    <text className={cls('fade', 'shorter')} x="42" y="89" fontSize="7">shorter</text>
                </g>

                {/* A proposal: pencilled into a ruled box. Only the person's confirmation inks it. */}
                <rect
                    className={cls('fade', 'box')}
                    x="50" y="70" width="36" height="16" rx="3" fill="none"
                    stroke={on.ink ? 'var(--ink)' : 'var(--pencil-grey)'}
                    strokeDasharray={on.ink ? '0' : '3 2.5'}
                />
                <text
                    className={`${cls('fade', 'value')}${on.ink ? ' ink' : ''}`}
                    style={{ opacity: on.rubbed ? 0 : undefined }}
                    x="68" y="81.5" fontSize="8.5" textAnchor="middle"
                >
                    {proposal}
                </text>
                {CRUMBS.map(([x, dx], i) => (
                    <circle key={x} className={cls('crumb', 'crumbs')} style={{ '--dx': `${dx}px`, '--delay': `${i * 0.05}s` }} cx={x} cy="89" r="1" />
                ))}

                <rect className={cls('closing', 'closed')} x="18" y="34" width="86" height="100" rx="8" fill="var(--cover)" />
            </g>

            {/* The animation owns the chip's transform, so its position lives on the group. */}
            <g transform="translate(62 62)">
                <polygon className={cls('chip', 'chip')} points="0,0 4,-1.5 4,1.5" fill="var(--lead)" />
            </g>

            <g className="pencil" style={{ transform: `translate(${pose.x}px, ${pose.y}px)` }}>
                <g className="hover">
                    <g style={{ transform: `translateY(${tapUp ? -2.5 : 0}px)`, transition: 'transform .18s ease-out' }}>
                        <g style={{ transform: `rotate(${pose.r}deg)`, transition: 'transform .6s cubic-bezier(.2,.7,.2,1)' }}>
                            <rect x="-104" y="-4.5" width="10" height="9" rx="2" fill="var(--rubber)" />
                            <rect x="-94" y="-4.5" width="6" height="9" fill="var(--ferrule)" />
                            <rect x="-88" y="-4.5" width="72" height="9" fill="var(--brand)" />
                            <rect x="-88" y="-4.5" width="72" height="2.2" fill="rgba(255,255,255,.28)" />
                            <rect x="-88" y="2.3" width="72" height="2.2" fill="rgba(0,0,0,.14)" />
                            <polygon points="-16,-4.5 -16,4.5 -5,1.5 -5,-1.5" fill="var(--wood)" />
                            <polygon className="tip" points="-5,-1.5 -5,1.5 0,0" fill="var(--lead)" style={{ opacity: on.snapped ? 0 : 1 }} />
                        </g>
                    </g>
                </g>
            </g>
        </svg>
    );
}

/**
 * The launcher: a small closed notebook with the pencil tucked in its strap.
 * Still. AURA is not working until it is opened, so nothing pings.
 */
export function AuraScribeGlyph({ size = 30 }) {
    return (
        <svg className="aura-scribe-glyph" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
            <rect x="7" y="5" width="17" height="22" rx="3" fill="#fffdfa" />
            <rect x="7" y="5" width="3.5" height="22" rx="1.5" fill="#c9c2f5" />
            {[11, 15, 19].map((y) => <path key={y} d={`M13 ${y}h8`} stroke="#c9c2f5" strokeWidth="1.2" strokeLinecap="round" />)}
            <rect x="20.5" y="5" width="2" height="22" fill="#e4e1f3" />
            <g transform="rotate(-18 22 16)">
                <rect x="20.2" y="2" width="3.6" height="5" rx="1" fill="#f7c8d3" />
                <rect x="20.2" y="7" width="3.6" height="1.6" fill="#c9cbd6" />
                <rect x="20.2" y="8.6" width="3.6" height="16" fill="#5843de" />
                <polygon points="20.2,24.6 23.8,24.6 22,28.6" fill="#e9d9c3" />
                <polygon points="21.4,27.2 22.6,27.2 22,28.6" fill="#3b4256" />
            </g>
        </svg>
    );
}
