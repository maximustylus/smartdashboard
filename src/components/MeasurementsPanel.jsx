/**
 * ==============================================================================
 * MEASUREMENTS PANEL — the strength figures, for page 3 of the printed report
 * ==============================================================================
 *
 * ⚠️ PAGE 3, AND NOT PAGE 1 OR 2, FOR A MEASURED REASON. `CP30`: the report's
 *    pages are fixed 794x1123 boxes with `overflow: hidden`, so a page that grows
 *    loses its bottom from the PDF silently while still looking right on screen.
 *    `scripts/pdf-headroom.mjs` measured the room left before this was written:
 *
 *        worst-case / en / page 1 ....  2px spare
 *        worst-case / ms / page 1 ... 32px spare
 *        every page 2 ............... 77px spare
 *
 *    Neither page has room for two measurements plus their source citations. A
 *    third page costs nothing to anybody who skips the questions, because it is
 *    not rendered at all when there is nothing to put on it.
 *
 * ⚠️ `notADiagnosis` IS ON THIS PAGE BECAUSE THIS IS THE PAGE WITH THE NUMBERS ON
 *    IT. A resident reads a band, and a band beside a number looks like a finding.
 *    It is a safety-critical string and `copyReview.js` gates it.
 *
 * The panel renders a REASON wherever it cannot render a band. Every refusal in
 * `functionalMeasures.js` has words in `measuresCopy.js`, because a blank space
 * under a number a person just gave reads as "your result was too bad to print".
 */

import React from 'react';
import { measuresCopyFor, residentBand } from '../data/measuresCopy';
import { GRIP_SOURCE, CHAIR_STAND_SOURCE, STS_60S_SOURCE } from '../data/functionalNorms';

const SOURCE_BY_ID = {
    [GRIP_SOURCE.id]: GRIP_SOURCE,
    [CHAIR_STAND_SOURCE.id]: CHAIR_STAND_SOURCE,
    [STS_60S_SOURCE.id]: STS_60S_SOURCE,
};

const ROW = {
    border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 18px',
    background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 4,
};

const Measurement = ({ result, label, unit, m }) => {
    if (!result) return null;
    // Nothing given and nothing refused: the resident skipped it, so it does not
    // appear at all rather than appearing as an empty row about themselves.
    if (result.ok !== true && result.value === null && result.reason === 'missing') return null;

    const band = residentBand(result);
    return (
        <div style={ROW}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                <div style={{ fontWeight: 800, fontSize: 11, color: '#0f172a' }}>{label}</div>
                {result.value !== null && (
                    <div style={{ fontWeight: 900, fontSize: 15, color: '#0f766e', whiteSpace: 'nowrap' }}>
                        {result.value} <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b' }}>{unit}</span>
                    </div>
                )}
            </div>

            {band ? (
                <>
                    <div style={{ fontWeight: 700, fontSize: 11, color: '#0f766e' }}>{m.bands[band]}</div>
                    {/*
                      The grip bands collapse to three; the thirty-second chair stand
                      has only two, because STEADI publishes one cut-off and nothing
                      above it. `at-or-above-average` therefore has no advice line of
                      its own and borrows the one for staying where you are, rather
                      than this page inventing a third level the source does not have.
                    */}
                    <div style={{ fontSize: 10, color: '#475569', lineHeight: 1.6 }}>
                        {m.advice[band] || m.advice[band === 'below-average' || band === 'below-typical' ? 'below' : 'usual']}
                    </div>
                </>
            ) : (
                <div style={{ fontSize: 10, color: '#475569', lineHeight: 1.6 }}>
                    {m.reasons[result.reason] || m.reasons.missing}
                </div>
            )}

            {result.implausibleForProtocol === true && (
                <div style={{ fontSize: 10, color: '#b45309', lineHeight: 1.6 }}>{m.implausible}</div>
            )}
        </div>
    );
};

export default function MeasurementsPanel({ functional, lang }) {
    const m = measuresCopyFor(lang);
    const grip = functional?.grip;
    const sitToStand = functional?.sitToStand;

    const stsLabel = m.stsLabel[sitToStand?.protocol] || m.stsLabel['sts-30s'];

    // Only the sources a comparison was actually made against. Listing a paper
    // nobody was compared to is a citation for something that did not happen.
    const sourceIds = [...new Set([grip?.sourceId, sitToStand?.sourceId].filter(Boolean))];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
                <div style={{ fontWeight: 900, fontSize: 13, color: '#0f172a', letterSpacing: 0.3 }}>
                    {m.reportHeading}
                </div>
                {/*
                  ⚠️ `reportIntro`, NOT `intro`. `intro` is the question-time line
                     ("you can skip this and your result will not change"), which is
                     nonsense printed beside figures the person already gave. One
                     string reused in two places reads as the portal not knowing
                     where it is.
                */}
                <div style={{ fontSize: 10, color: '#475569', lineHeight: 1.6, marginTop: 4 }}>{m.reportIntro}</div>
            </div>

            <Measurement result={grip} label={m.gripLabel} unit={m.gripUnit} m={m} />
            <Measurement result={sitToStand} label={stsLabel} unit={m.stsUnit} m={m} />

            {functional?.setting && (
                <div style={{ fontSize: 10, color: '#64748b' }}>
                    <strong style={{ color: '#475569' }}>{m.measuredAt}:</strong> {m.settings[functional.setting]}
                </div>
            )}

            {/* ⚠️ SAFETY-CRITICAL, AND ON THIS PAGE BECAUSE THE NUMBERS ARE. */}
            <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 12, padding: '12px 18px' }}>
                <div style={{ fontSize: 10, color: '#4c0519', lineHeight: 1.7 }}>{m.notADiagnosis}</div>
            </div>

            {sourceIds.length > 0 && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '12px 18px' }}>
                    <div style={{ fontWeight: 900, fontSize: 9, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 2 }}>
                        {m.comparedAgainst}
                    </div>
                    {sourceIds.map((id) => {
                        const source = SOURCE_BY_ID[id];
                        if (!source) return null;
                        return (
                            <div key={id} style={{ fontSize: 9, color: '#475569', lineHeight: 1.6, marginBottom: 5 }}>
                                {source.citation}
                                {source.doi && <> · doi:{source.doi}</>}
                                {/*
                                  The population is printed, not implied. None of
                                  these three is Singaporean, and a resident comparing
                                  themselves to a Swiss or United States sample is
                                  entitled to know that is what they are doing.
                                */}
                                <> · {m.populations[source.referencePopulation] || source.referencePopulation}</>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
