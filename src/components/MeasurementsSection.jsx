/**
 * ==============================================================================
 * MEASUREMENTS SECTION — the meters and the heart rate zones, ON SCREEN
 * ==============================================================================
 *
 * ⚠️ THIS EXISTS BECAUSE THE FEATURE WAS INVISIBLE IN THE APP.
 *
 * `MeasurementsPanel` is rendered once, inside the print template at
 * `position:absolute; top:-10000px`. It rasterises into the downloaded PDF and is
 * seen by nobody else. So a resident who had their grip measured, typed the number
 * in, and read their result on the screen saw NO meter and NO heart rate ranges at
 * any point — unless they happened to tap Download and open the file.
 *
 * That is the same defect this repository has already had once, with the medical
 * disclaimer, and the note above `MedicalDisclaimer` in `ResultPage.jsx` describes
 * it in the same words: "It rendered for `html2canvas` and for nobody else."
 *
 * ------------------------------------------------------------------------------
 * ⚠️ WHY THIS IS A SECOND COMPONENT AND NOT A PROP ON THE FIRST
 * ------------------------------------------------------------------------------
 *
 * The two media have genuinely different constraints. The print panel lives in a
 * fixed 794x1123 box with `overflow: hidden`, is always light, and is measured to
 * the pixel by `scripts/pdf-headroom.mjs`. This one is responsive, has a dark
 * theme, and has no height limit at all. A single component serving both would
 * carry a branch in every style object, and the print side is the one that fails
 * SILENTLY when it goes wrong.
 *
 * `MedicalDisclaimer` and `DataGovernance` already follow this pattern here. What
 * is NOT duplicated is anything that could drift and be wrong: the copy comes from
 * `measuresCopy.js`, the bands from `functionalMeasures.js`, the zones from
 * `zonesFor`, and the colours from `zonePalette.js`. Both media render the same
 * numbers in the same colours, or the shared module is broken and both fail.
 */

import React from 'react';
import { Activity, HeartPulse } from 'lucide-react';
import { measuresCopyFor, residentBand } from '../data/measuresCopy';
import { GRIP_SOURCE, CHAIR_STAND_SOURCE, STS_60S_SOURCE } from '../data/functionalNorms';
import { zonesFor, HR_EQUATIONS } from '../utils/heartRateZones';
import { hasMeasurementsToShow } from '../utils/measurementAnswers';
import { spanFor, pctOf } from '../utils/meterScale';
import { HR_ZONE_RAMP, METER_COLOURS } from '../data/zonePalette';

const SOURCE_BY_ID = {
    [GRIP_SOURCE.id]: GRIP_SOURCE,
    [CHAIR_STAND_SOURCE.id]: CHAIR_STAND_SOURCE,
    [STS_60S_SOURCE.id]: STS_60S_SOURCE,
};

const H2 = 'text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2';
const CARD = 'rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50 p-4';
const COL = 'text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500';

const fmt = (n) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10));

/**
 * The same meter the PDF draws, in Tailwind so it follows the theme.
 *
 * ⚠️ THE MARKER HAS A DARK-THEME COLOUR AND THE BAND DOES NOT. The band is teal
 *    because teal MEANS "the usual published range"; changing it per theme would
 *    change what it says. The marker is only "you are here", so on a dark card it
 *    switches to a light slate that can actually be seen. Both come from
 *    `zonePalette.js` so the PDF and the screen cannot disagree.
 */
const ScreenMeter = ({ result, unit, m }) => {
    const scale = result?.scale;
    if (!scale || !Array.isArray(scale.points) || scale.points.length === 0) return null;

    const span = spanFor(scale.points, result.value, { from: scale.axisFrom, to: scale.axisTo });
    if (!span) return null;

    const isCutOff = scale.resolution === 'cut-off' || scale.usualTo === null;
    const valuePct = pctOf(result.value, span);
    const fromPct = pctOf(scale.usualFrom, span);
    const toPct = isCutOff ? 100 : pctOf(scale.usualTo, span);
    if (fromPct === null || toPct === null) return null;

    const bandLeft = Math.min(fromPct, toPct);
    const bandWidth = Math.abs(toPct - fromPct);
    const labelled = isCutOff
        ? [{ value: scale.usualFrom, pct: fromPct }]
        : [{ value: scale.usualFrom, pct: fromPct }, { value: scale.usualTo, pct: toPct }];

    const caption = isCutOff
        ? (m.meterCaptionCutOff || '').replace('{cut}', fmt(scale.usualFrom)).replace('{unit}', unit)
        : (m.meterCaption || '').replace('{from}', fmt(scale.usualFrom))
            .replace('{to}', fmt(scale.usualTo)).replace('{unit}', unit);

    return (
        <div className="mt-3">
            <div className="relative h-3.5 rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                    className="absolute inset-y-0 rounded-full"
                    style={{ left: `${bandLeft}%`, width: `${bandWidth}%`, background: METER_COLOURS.band }}
                />
                {valuePct !== null && (
                    <div
                        className="absolute -top-1 -bottom-1 w-[3px] -ml-[1.5px] rounded-sm bg-slate-900 dark:bg-slate-100"
                        style={{ left: `${valuePct}%` }}
                    />
                )}
            </div>

            {/* Ticks below the track, never through it: drawn through, they cut the
                band into pieces and it reads as a segmented gauge. */}
            <div className="relative h-1">
                {scale.points.map((point, i) => {
                    const pct = pctOf(point, span);
                    if (pct === null) return null;
                    return (
                        <div key={i} className="absolute top-0 h-1 w-px bg-slate-300 dark:bg-slate-600" style={{ left: `${pct}%` }} />
                    );
                })}
            </div>

            <div className="relative h-4 mt-0.5">
                {labelled.map((tick, i) => (
                    <div
                        key={i}
                        className="absolute top-0 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold text-slate-500 dark:text-slate-400"
                        style={{ left: `${tick.pct}%` }}
                    >
                        {fmt(tick.value)}
                    </div>
                ))}
            </div>

            {caption && (
                <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400 mt-1">{caption}</p>
            )}
        </div>
    );
};

const Measurement = ({ result, label, unit, m }) => {
    if (!result) return null;
    if (result.ok !== true && result.value === null && result.reason === 'missing') return null;

    const band = residentBand(result);
    return (
        <div className={CARD}>
            <div className="flex justify-between items-baseline gap-3">
                <p className="text-xs font-black text-slate-800 dark:text-slate-100">{label}</p>
                {result.value !== null && (
                    <p className="text-lg font-black text-teal-600 dark:text-teal-400 whitespace-nowrap">
                        {result.value} <span className="text-[10px] font-bold text-slate-400">{unit}</span>
                    </p>
                )}
            </div>

            {band ? (
                <>
                    <p className="text-xs font-bold text-teal-600 dark:text-teal-400 mt-1">{m.bands[band]}</p>
                    {/* Inside the `band` branch: every other case is one where no
                        comparison was made, and drawing a scale there would put the
                        resident's number on a picture of a reference we have just
                        told them does not apply to them. */}
                    <ScreenMeter result={result} unit={unit} m={m} />
                    <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300 mt-2">
                        {m.advice[band] || m.advice[band === 'below-average' || band === 'below-typical' ? 'below' : 'usual']}
                    </p>
                </>
            ) : (
                <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300 mt-2">
                    {m.reasons[result.reason] || m.reasons.missing}
                </p>
            )}

            {result.maybeWrongProtocol === true && (
                <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-400 mt-2">{m.maybeWrongProtocol}</p>
            )}
            {result.implausibleForProtocol === true && result.maybeWrongProtocol !== true && (
                <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-400 mt-2">
                    {result.implausibleDirection === 'high' ? m.implausibleHigh : m.implausibleLow}
                </p>
            )}
        </div>
    );
};

const HeartRate = ({ result, m }) => {
    if (result.suppressed === 'symptoms') {
        return (
            <div className="pt-6">
                <h2 className={H2}><HeartPulse size={14} className="text-teal-500" /> {m.hrHeading}</h2>
                <div className="rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/30 p-4">
                    <p className="text-[11px] leading-relaxed text-rose-900 dark:text-rose-200">{m.hrSuppressedSymptoms}</p>
                </div>
            </div>
        );
    }
    // Age unknown renders nothing at all: this block was never asked for, so an
    // apology for its absence would be the portal talking about itself.
    if (result.suppressed) return null;

    const { zones, basis, hrMax, spreadBpm, cautionOnly } = result;
    const equationNote = (m.hrEquationNote || '')
        .replace('{tanaka}', String(basis.tanaka.bpm))
        .replace('{astrand}', String(basis.astrand.bpm));
    const spreadNote = (m.hrSpreadNote || '').replace('11', String(spreadBpm));

    return (
        <div className="pt-6">
            <h2 className={H2}><HeartPulse size={14} className="text-teal-500" /> {m.hrHeading}</h2>

            <div className={CARD}>
                <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">{m.hrIntro}</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2">
                    <span className="font-bold text-slate-800 dark:text-slate-100">{m.hrMaxLabel}:</span>{' '}
                    <span className="font-black text-teal-600 dark:text-teal-400">{hrMax} {m.hrBpm}</span>
                </p>

                {/* Column headings. Without them the middle column reads as a
                    verdict: "Light" and "Hard" beside somebody's own result look
                    like a grade until a heading says they name an intensity. */}
                <div className="mt-4 flex items-baseline gap-3">
                    <div className={`${COL} w-[88px] shrink-0 text-center`}>{m.hrColRange}</div>
                    <div className={`${COL} w-[76px] shrink-0`}>{m.hrColZone}</div>
                    <div className={COL}>{m.hrColPurpose}</div>
                </div>

                <div className="mt-1.5 flex flex-col gap-1">
                    {zones.map((zone) => {
                        const skin = HR_ZONE_RAMP[zone.id];
                        return (
                            <div key={zone.id} className="flex items-stretch gap-3">
                                {/* The range is printed INSIDE the colour, so the
                                    swatch is never a bare decoration that has to be
                                    decoded from a key elsewhere on the page. This is
                                    also the relief the palette's contrast warning
                                    requires, and what makes the table survive a
                                    greyscale photocopy. */}
                                <div
                                    className="w-[88px] shrink-0 rounded-md px-2 py-1 flex items-center justify-center text-[10px] font-black whitespace-nowrap leading-none"
                                    style={{ background: skin.bg, color: skin.fg }}
                                >
                                    {zone.fromBpm}-{zone.toBpm}
                                </div>
                                <div className="w-[76px] shrink-0 self-center text-[11px] font-bold text-slate-800 dark:text-slate-100">
                                    {m.hrZoneNames[zone.id]}
                                </div>
                                <div className="self-center text-[11px] leading-snug text-slate-600 dark:text-slate-300">
                                    {m.hrZoneBenefits[zone.id]}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400 mt-3">
                    {m.hrTalkTest} {m.hrColourNote}
                </p>
                {cautionOnly && (
                    <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400 mt-2">{m.hrMedicationNote}</p>
                )}
                <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400 mt-2">
                    {equationNote}
                    {basis.astrand.withinPopulation === false && <> {m.hrAstrandOutside}</>}
                    {' '}{spreadNote}
                </p>

                {/* ⚠️ SAFETY-CRITICAL, and gated by `copyReview.js`. */}
                <div className="mt-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/30 px-3 py-2">
                    <p className="text-[11px] leading-relaxed text-rose-900 dark:text-rose-200">{m.hrCaution}</p>
                </div>
            </div>
        </div>
    );
};

export default function MeasurementsSection({ functional, lang, ageYears, symptomFlag, medFlag }) {
    const m = measuresCopyFor(lang);
    const heartRate = zonesFor(ageYears, { symptomFlag, medFlag });
    const showsMeasurements = hasMeasurementsToShow(functional);

    // Nothing measured and no usable age: the whole section is absent rather than
    // being a heading over an empty space.
    if (!showsMeasurements && heartRate.suppressed === 'age-unknown') return null;

    const grip = functional?.grip;
    const sitToStand = functional?.sitToStand;
    const stsLabel = m.stsLabel[sitToStand?.protocol] || m.stsLabel.unsure;
    const sourceIds = [...new Set([grip?.sourceId, sitToStand?.sourceId].filter(Boolean))];
    const showsEquations = Array.isArray(heartRate.zones);

    return (
        <>
            {showsMeasurements && (
                <div className="pt-6">
                    <h2 className={H2}><Activity size={14} className="text-teal-500" /> {m.reportHeading}</h2>
                    <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300 -mt-2 mb-3">{m.reportIntro}</p>

                    <div className="flex flex-col gap-3">
                        <Measurement result={grip} label={m.gripLabel} unit={m.gripUnit} m={m} />
                        <Measurement result={sitToStand} label={stsLabel} unit={m.stsUnit} m={m} />
                    </div>

                    {functional?.setting && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3">
                            <span className="font-bold text-slate-600 dark:text-slate-300">{m.measuredAt}:</span> {m.settings[functional.setting]}
                        </p>
                    )}

                    {/* ⚠️ SAFETY-CRITICAL, and on screen because the numbers are. A
                        band beside a number looks like a finding. */}
                    <div className="mt-3 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/30 p-4">
                        <p className="text-[11px] leading-relaxed text-rose-900 dark:text-rose-200">{m.notADiagnosis}</p>
                    </div>
                </div>
            )}

            <HeartRate result={heartRate} m={m} />

            {(sourceIds.length > 0 || showsEquations) && (
                <div className="pt-4">
                    <p className={`${COL} mb-2`}>{m.comparedAgainst}</p>
                    {showsEquations && (
                        <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400 mb-1">
                            {HR_EQUATIONS.tanaka.short}
                            {HR_EQUATIONS.tanaka.doi && <> · doi:{HR_EQUATIONS.tanaka.doi}</>}
                            {' · '}{HR_EQUATIONS.astrand.short}
                        </p>
                    )}
                    {sourceIds.map((id) => {
                        const source = SOURCE_BY_ID[id];
                        if (!source) return null;
                        return (
                            <p key={id} className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400 mb-1">
                                {source.citation}
                                {source.doi && <> · doi:{source.doi}</>}
                                {/* The population is printed, not implied. None of
                                    these is Singaporean. */}
                                <> · {m.populations[source.referencePopulation] || source.referencePopulation}</>
                            </p>
                        );
                    })}
                </div>
            )}
        </>
    );
}
