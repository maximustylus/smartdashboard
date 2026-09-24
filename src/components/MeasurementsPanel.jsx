/**
 * ==============================================================================
 * MEASUREMENTS PANEL — the strength figures, on their own page of the report
 * ==============================================================================
 *
 * ⚠️ ITS OWN PAGE, NOT A BLOCK ON AN EXISTING ONE. `CP30`: the report's pages are
 *    fixed 794x1123 boxes with `overflow: hidden`, so a page that grows loses its
 *    bottom from the PDF silently while still looking right on screen.
 *    `scripts/pdf-headroom.mjs` measured the room left before this was written:
 *
 *        worst-case / en / cover page ....  2px spare
 *        worst-case / ms / cover page ... 32px spare
 *        governance page ................ 77px spare
 *
 *    Neither has room for two measurements plus their source citations. A separate
 *    page costs nothing to anybody who skips the questions, because it is not
 *    rendered at all when there is nothing to put on it.
 *
 *    ⚠️ THE SAME MEASUREMENT RULE NOW BINDS THIS PAGE TOO. It carries two meters
 *       and a heart rate table, and it has the same hard ceiling. Re-run
 *       `scripts/pdf-headroom.mjs` after adding ANYTHING here. A block that
 *       overflows does not wrap and does not warn: it is simply cut off the
 *       bottom of the download, and only in the download.
 *
 * ⚠️ IT SITS AHEAD OF GOVERNANCE, at the owner's request. A resident who had
 *    themselves measured should not have to go past a disclaimer page to reach
 *    their own figures. `ResultPage` numbers the footers from `totalPages` so the
 *    two orders cannot drift apart.
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
import ReferenceMeter from './ReferenceMeter';
import HeartRateZones from './HeartRateZones';
import { zonesFor, HR_EQUATIONS } from '../utils/heartRateZones';

const SOURCE_BY_ID = {
    [GRIP_SOURCE.id]: GRIP_SOURCE,
    [CHAIR_STAND_SOURCE.id]: CHAIR_STAND_SOURCE,
    [STS_60S_SOURCE.id]: STS_60S_SOURCE,
};

/*
  ⚠️ THE PADDING AND THE PANEL GAP BELOW ARE BOTH MEASURED. This page carries two
     meters and a heart rate table now, and `scripts/pdf-headroom.mjs` had it
     clipping in Malay and Tamil. Space was taken from spacing and from repeated
     wording, NOT from type size: 8px on A4 is already about six points, and the
     readers this page is for are mostly over 60.
*/
const ROW = {
    border: '1px solid #e2e8f0', borderRadius: 12, padding: '6px 14px 10px',
    background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 3,
};

/** The advice sentence for a banded result, or null. Shared so the panel can tell
    when both measurements would print the same sentence. */
const adviceFor = (result, m) => {
    const band = result ? residentBand(result) : null;
    if (!band) return null;
    return m.advice[band] || m.advice[band === 'below-average' || band === 'below-typical' ? 'below' : 'usual'];
};

const Measurement = ({ result, label, unit, m, hideAdvice = false }) => {
    if (!result) return null;
    // Nothing given and nothing refused: the resident skipped it, so it does not
    // appear at all rather than appearing as an empty row about themselves.
    if (result.ok !== true && result.value === null && result.reason === 'missing') return null;

    const band = residentBand(result);
    return (
        <div style={ROW}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                <div style={{ fontWeight: 800, fontSize: 12.5, color: '#0f172a' }}>{label}</div>
                {result.value !== null && (
                    <div style={{ fontWeight: 900, fontSize: 17, color: '#0f766e', whiteSpace: 'nowrap' }}>
                        {result.value} <span style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b' }}>{unit}</span>
                    </div>
                )}
            </div>

            {band ? (
                <>
                    <div style={{ fontWeight: 700, fontSize: 12.5, color: '#0f766e' }}>{m.bands[band]}</div>
                    {/*
                      ⚠️ THE METER IS INSIDE THE `band` BRANCH ON PURPOSE. The other
                         branch is every case where no comparison was made: age
                         outside the published range, sex not given, the wrong
                         stopwatch, "I do not know which test". Drawing a scale there
                         would put the resident's number on a picture of a reference
                         we have just finished telling them does not apply to them.
                         `ReferenceMeter` also returns null without a `scale`, so this
                         is two guards rather than one.
                    */}
                    <ReferenceMeter result={result} unit={unit} m={m} />
                    {/*
                      The grip bands collapse to three; the thirty-second chair stand
                      has only two, because STEADI publishes one cut-off and nothing
                      above it. `at-or-above-average` therefore has no advice line of
                      its own and borrows the one for staying where you are, rather
                      than this page inventing a third level the source does not have.
                    */}
                    <div style={{ fontSize: 11.5, color: '#475569', lineHeight: 1.45 }}>
                        {hideAdvice ? null : adviceFor(result, m)}
                    </div>
                </>
            ) : (
                <div style={{ fontSize: 11.5, color: '#475569', lineHeight: 1.45 }}>
                    {m.reasons[result.reason] || m.reasons.missing}
                </div>
            )}

            {/*
              ⚠️ THE WARNING NAMES THE DIRECTION, AND THE WRONG-STOPWATCH CASE GETS
                 ITS OWN SENTENCE. A single "unusually high" string used to be shown
                 for counts far too LOW as well, and the case this feature most needs
                 to survive — a thirty-second count read against one-minute norms —
                 got no warning at all, because the old flat floor of 10 did not
                 catch a plausible-looking 14.
            */}
            {result.maybeWrongProtocol === true && (
                <div style={{ fontSize: 11.5, color: '#b45309', lineHeight: 1.45 }}>{m.maybeWrongProtocol}</div>
            )}
            {result.implausibleForProtocol === true && result.maybeWrongProtocol !== true && (
                <div style={{ fontSize: 11.5, color: '#b45309', lineHeight: 1.45 }}>
                    {result.implausibleDirection === 'high' ? m.implausibleHigh : m.implausibleLow}
                </div>
            )}
        </div>
    );
};

export default function MeasurementsPanel({ functional, lang, ageYears, symptomFlag, medFlag }) {
    const m = measuresCopyFor(lang);
    const grip = functional?.grip;
    const sitToStand = functional?.sitToStand;

    /*
      ⚠️ `unsure` HAS ITS OWN LABEL, AND THE FALLBACK IS NO LONGER A DURATION. This
         read `|| m.stsLabel['sts-30s']`, so a resident who said they did not know how
         long they were timed for got "thirty seconds" as the heading, directly above
         a sentence saying the duration is unknown. The fallback now names no
         duration at all, which is the only honest thing to print when none is known.
    */
    const stsLabel = m.stsLabel[sitToStand?.protocol] || m.stsLabel.unsure;

    // Only the sources a comparison was actually made against. Listing a paper
    // nobody was compared to is a citation for something that did not happen.
    const sourceIds = [...new Set([grip?.sourceId, sitToStand?.sourceId].filter(Boolean))];

    /*
      Computed here rather than inside `HeartRateZones`, because the SAME answer
      decides two things: whether the block renders, and whether the two equations
      belong in the citation list below. A resident who reported symptoms on
      exertion is shown no equations, so citing them would be a reference for
      something they never saw.
    */
    const heartRate = zonesFor(ageYears, { symptomFlag, medFlag });
    const showsEquations = Array.isArray(heartRate.zones);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div>
                <div style={{ fontWeight: 900, fontSize: 14.5, color: '#0f172a', letterSpacing: 0.3 }}>
                    {m.reportHeading}
                </div>
                {/*
                  ⚠️ `reportIntro`, NOT `intro`. `intro` is the question-time line
                     ("you can skip this and your result will not change"), which is
                     nonsense printed beside figures the person already gave. One
                     string reused in two places reads as the portal not knowing
                     where it is.
                */}
                <div style={{ fontSize: 11.5, color: '#475569', lineHeight: 1.45, marginTop: 3, paddingBottom: 3 }}>{m.reportIntro}</div>
            </div>

            {/*
              ⚠️ ONE ADVICE SENTENCE, NOT THE SAME ONE TWICE. When both figures sit
                 in the same band, both cards printed the identical sentence, and in
                 Tamil the repeat was what pushed page 2 past its limit (stress test,
                 2026-09-24). The second card now omits it only when it is the same
                 words as the first.
            */}
            <Measurement result={grip} label={m.gripLabel} unit={m.gripUnit} m={m} />
            <Measurement result={sitToStand} label={stsLabel} unit={m.stsUnit} m={m}
                hideAdvice={Boolean(adviceFor(grip, m)) && adviceFor(grip, m) === adviceFor(sitToStand, m)} />

            {functional?.setting && (
                <div style={{ fontSize: 11.5, color: '#64748b', padding: '2px 0 3px' }}>
                    <strong style={{ color: '#475569' }}>{m.measuredAt}:</strong> {m.settings[functional.setting]}
                </div>
            )}

            {/* ⚠️ SAFETY-CRITICAL, AND ON THIS PAGE BECAUSE THE NUMBERS ARE. */}
            <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 12, padding: '6px 14px 10px' }}>
                <div style={{ fontSize: 11.5, color: '#4c0519', lineHeight: 1.5 }}>{m.notADiagnosis}</div>
            </div>

            {/*
              ⚠️ AFTER THE MEASUREMENTS, BEFORE THE CITATIONS, AND NOT ON PAGE 1.
                 These are reference ranges worked out from an age, not something
                 measured. Placing them above a figure the resident actually gave
                 would rank an estimate over a measurement. `HeartRateZones` renders
                 nothing when the age is unknown and a single sentence when the
                 resident reported symptoms on exertion.
            */}
            <HeartRateZones result={heartRate} lang={lang} />

            {(sourceIds.length > 0 || showsEquations) && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '8px 14px' }}>
                    <div style={{ fontWeight: 900, fontSize: 10.5, color: '#64748b', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 2 }}>
                        {m.comparedAgainst}
                    </div>
                    {/*
                      ONE PARAGRAPH, references separated by semicolons. One block per
                      reference cost a line and a gap each, and in Tamil that was the
                      last 20px page 2 did not have (stress test, 2026-09-24).
                    */}
                    <div style={{ fontSize: 10.5, color: '#475569', lineHeight: 1.45 }}>
                        {[
                            ...(showsEquations ? [
                                <React.Fragment key="eq">
                                    {HR_EQUATIONS.tanaka.short}
                                    {HR_EQUATIONS.tanaka.doi && <> · doi:{HR_EQUATIONS.tanaka.doi}</>}
                                    {'; '}
                                    {/* Its own full stop would print as "1952.;" before the separator. */}
                                    {String(HR_EQUATIONS.astrand.short).replace(/\.$/, '')}
                                </React.Fragment>,
                            ] : []),
                            ...sourceIds.map((id) => {
                                const source = SOURCE_BY_ID[id];
                                if (!source) return null;
                                return (
                                    <React.Fragment key={id}>
                                        {source.citation}
                                        {source.doi && <> · doi:{source.doi}</>}
                                        {/*
                                          The population is printed, not implied. None of
                                          these three is Singaporean, and a resident comparing
                                          themselves to a Swiss or United States sample is
                                          entitled to know that is what they are doing.
                                        */}
                                        <> · {m.populations[source.referencePopulation] || source.referencePopulation}</>
                                    </React.Fragment>
                                );
                            }),
                        ].filter(Boolean).map((entry, i) => (
                            <React.Fragment key={i}>{i > 0 && '; '}{entry}</React.Fragment>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
