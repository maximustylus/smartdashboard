/**
 * ==============================================================================
 * REFERENCE METER — where one number sits against the figures a source publishes
 * ==============================================================================
 *
 * The owner asked for a percentile graph. This is a meter instead, and the
 * difference is the whole point of the component.
 *
 * ------------------------------------------------------------------------------
 * ⚠️ WHY NOT A PERCENTILE CURVE
 * ------------------------------------------------------------------------------
 *
 * A percentile curve needs a distribution. Two of the three references here do not
 * publish one:
 *
 *     grip (Tomkinson 2025) ...... 11 percentiles per age and sex
 *     1-minute STS (Strassmann) ... 5 points: p2.5, p25, p50, p75, p97.5
 *     30-second chair stand ....... ONE cut-off, and nothing above it
 *
 * The third is the test EVERY resident aged 60 and over takes. Drawing a smooth
 * curve through one published point means drawing a shape invented here and
 * attributing it to the CDC. So the meter draws `result.scale.points` and nothing
 * between them: it degrades from eleven marks to five to one without ever changing
 * what it claims. `functionalMeasures.js` decides what may be drawn; this only
 * renders it.
 *
 * `CD18` already refused to REPORT a rank for grip, for reasons that apply just as
 * hard to plotting one. A band survives measurement variation of the size these
 * sources describe. A position on a curve does not.
 *
 * ------------------------------------------------------------------------------
 * ⚠️ HTML AND CSS, NOT SVG, AND THAT IS NOT A STYLE PREFERENCE
 * ------------------------------------------------------------------------------
 *
 * This is rendered inside a page that `html2canvas` rasterises into a PDF. SVG
 * `<text>` does not wrap, so a caption in Malay or Tamil is CLIPPED rather than
 * reflowed, and it is clipped only in the PDF, where nobody sees it until a
 * resident has one. Positioned divs wrap, rasterise predictably, and inherit the
 * font the rest of the page already loaded.
 *
 * ------------------------------------------------------------------------------
 * ⚠️ THE RESIDENT'S OWN VALUE IS PART OF THE SPAN
 * ------------------------------------------------------------------------------
 *
 * `spanFor` includes it deliberately. If the axis were fixed to the published
 * points, a genuinely strong or genuinely weak person would have their marker
 * clamped to the edge, which reads as "off the chart" — a judgement the data does
 * not support and the worst possible one to print beside somebody's own number.
 */

import React from 'react';
import { spanFor, pctOf } from '../utils/meterScale';

const TRACK = '#e5e7eb';   // slate-200
const BAND = '#14b8a6';    // teal-500, the same teal the report uses throughout
const MARKER = '#0f172a';  // slate-900
const TICK = '#cbd5e1';    // slate-300

const fmt = (n) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10));

export default function ReferenceMeter({ result, unit, m }) {
    const scale = result?.scale;
    if (!scale || !Array.isArray(scale.points) || scale.points.length === 0) return null;

    const span = spanFor(scale.points, result.value, { from: scale.axisFrom, to: scale.axisTo });
    if (!span) return null;

    const valuePct = pctOf(result.value, span);
    const fromPct = pctOf(scale.usualFrom, span);
    /*
      `usualTo === null` is the cut-off case and is NOT a missing value to be
      defaulted. It means the source names a floor and stops. The band therefore
      runs to the right-hand edge of the drawing, which says "at or above this, and
      we are not told how far above" — the only reading STEADI supports.
    */
    const isCutOff = scale.resolution === 'cut-off' || scale.usualTo === null;
    const toPct = isCutOff ? 100 : pctOf(scale.usualTo, span);
    if (fromPct === null || toPct === null) return null;

    const bandLeft = Math.min(fromPct, toPct);
    const bandWidth = Math.abs(toPct - fromPct);

    // Only the band edges are labelled. Eleven percentile labels across 480px are
    // unreadable, and labelling the ones a resident is not told the meaning of
    // invites them to read a rank off the picture, which `CD18` refused.
    const labelled = isCutOff
        ? [{ value: scale.usualFrom, pct: fromPct }]
        : [{ value: scale.usualFrom, pct: fromPct }, { value: scale.usualTo, pct: toPct }];

    const caption = isCutOff
        ? (m.meterCaptionCutOff || '')
            .replace('{cut}', fmt(scale.usualFrom))
            .replace('{unit}', unit)
        : (m.meterCaption || '')
            .replace('{from}', fmt(scale.usualFrom))
            .replace('{to}', fmt(scale.usualTo))
            .replace('{unit}', unit);

    return (
        <div style={{ marginTop: 6 }}>
            {/* ── The track, the usual band, and the resident's marker ────────── */}
            <div style={{ position: 'relative', height: 14, background: TRACK, borderRadius: 7 }}>
                <div
                    style={{
                        position: 'absolute', top: 0, bottom: 0,
                        left: `${bandLeft}%`, width: `${bandWidth}%`,
                        background: BAND, borderRadius: 7,
                    }}
                />
                {valuePct !== null && (
                    <div
                        style={{
                            position: 'absolute', top: -4, bottom: -4,
                            left: `${valuePct}%`, width: 3, marginLeft: -1.5,
                            background: MARKER, borderRadius: 2,
                        }}
                    />
                )}
            </div>

            {/*
              ⚠️ TICKS SIT BELOW THE TRACK, NOT THROUGH IT. Drawn through, the light
                 tick lines cut the teal band into pieces and the whole thing read as
                 a segmented gauge with categories nobody had defined.
            */}
            <div style={{ position: 'relative', height: 4 }}>
                {scale.points.map((point, i) => {
                    const pct = pctOf(point, span);
                    if (pct === null) return null;
                    return (
                        <div
                            key={i}
                            style={{
                                position: 'absolute', top: 0, height: 4, width: 1,
                                left: `${pct}%`, background: TICK,
                            }}
                        />
                    );
                })}
            </div>

            {/* Numbers for the band edges, so the picture is never the only source. */}
            <div style={{ position: 'relative', height: 12, marginTop: 1 }}>
                {labelled.map((tick, i) => (
                    <div
                        key={i}
                        style={{
                            position: 'absolute', top: 0, left: `${tick.pct}%`,
                            transform: 'translateX(-50%)', whiteSpace: 'nowrap',
                            fontSize: 8, fontWeight: 700, color: '#64748b',
                        }}
                    >
                        {fmt(tick.value)}
                    </div>
                ))}
            </div>

            {/*
              The caption is ordinary flowing HTML, so it wraps in every language.
              It also states in words what the colours mean, because a reader who
              cannot separate the teal from the grey still gets the whole message.
            */}
            {caption && (
                <div style={{ fontSize: 8, color: '#64748b', lineHeight: 1.5, marginTop: 2 }}>
                    {caption}
                </div>
            )}
        </div>
    );
}
