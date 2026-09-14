/**
 * ==============================================================================
 * HEART RATE ZONES — the five ranges, their benefits, and what they are not
 * ==============================================================================
 *
 * Fills the room left on the measurements page. `zonesFor` decides what may be
 * shown; this renders it and never recomputes anything.
 *
 * ------------------------------------------------------------------------------
 * ⚠️ THE RAMP IS TEAL, AND IT IS TEAL SPECIFICALLY TO AVOID RED
 * ------------------------------------------------------------------------------
 *
 * The reference chart this was drawn from runs green through yellow to red, which
 * is the convention for training zones. It cannot be used here. Page 1 of this
 * same report prints a traffic light, where RED MEANS "HIGH NEEDS". A red band at
 * the top of a heart rate table on page 2 would read, to a resident holding both
 * pages, as a second verdict about them. It is not one: the top zone is a label
 * for an intensity, and reaching it is neither good nor bad.
 *
 * So the ramp is a sequential teal, light to dark, which encodes ORDER without
 * encoding ALARM. Checked with `scripts/validate_palette.js`: lightness descends
 * monotonically (0.88, 0.66, 0.37, 0.14, 0.03), adjacent steps stay separable
 * under protanopia and deuteranopia, and each row's text colour is chosen against
 * its own background rather than set once for all five.
 *
 * Colour is never the only channel. Every row prints its own beats-per-minute
 * range and its name in words, so the table survives being photocopied in black
 * and white, which is how a fair number of these reports will actually be read.
 *
 * ------------------------------------------------------------------------------
 * ⚠️ NO ZONES AT ALL FOR A RESIDENT WHO REPORTED SYMPTOMS ON EXERTION
 * ------------------------------------------------------------------------------
 *
 * `zonesFor` returns `{ suppressed: 'symptoms' }` and this renders a single
 * sentence in its place. That is the whole output. There is no collapsed table, no
 * greyed-out version, nothing to read past the sentence, because a table of
 * intensity ranges is an invitation to exert and that is the one person who should
 * not be given one by a web page.
 */

import React from 'react';
import { measuresCopyFor } from '../data/measuresCopy';
import { zonesFor } from '../utils/heartRateZones';

/**
 * Sequential teal. `bg` is the row's fill, `fg` is chosen against that fill: the
 * two light steps take slate-900, the two dark steps take white. One shared text
 * colour across a ramp this long fails at one end or the other.
 */
const RAMP = Object.freeze({
    'very-light': { bg: '#f0fdfa', fg: '#0f172a', border: '#99f6e4' },
    light: { bg: '#5eead4', fg: '#0f172a', border: '#5eead4' },
    moderate: { bg: '#14b8a6', fg: '#042f2e', border: '#14b8a6' },
    hard: { bg: '#0f766e', fg: '#ffffff', border: '#0f766e' },
    maximum: { bg: '#042f2e', fg: '#ffffff', border: '#042f2e' },
});

/*
  ⚠️ 7.5px AND 1.4 ARE MEASURED VALUES, NOT TASTE. `scripts/pdf-headroom.mjs` had
     this page CLIPPING by 44px in Malay and Tamil, and the thing being cut off the
     bottom of the download was `hrCaution`, the prohibition. Re-run that script
     after changing anything here, including a font size.
*/
const NOTE = { fontSize: 8, color: '#64748b', lineHeight: 1.45 };

/**
 * `result` is computed ONCE by `MeasurementsPanel` and passed in, because that
 * panel also has to know whether the two equation citations belong in its
 * "Compared against" block. Two calls to `zonesFor` would be two places to forget
 * the symptom suppression, and the citations would then be printed for a resident
 * who was shown no equations at all.
 */
export default function HeartRateZones({ result: passed, ageYears, symptomFlag, medFlag, lang }) {
    const m = measuresCopyFor(lang);
    const result = passed || zonesFor(ageYears, { symptomFlag, medFlag });

    if (result.suppressed === 'symptoms') {
        return (
            <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 12, padding: '12px 18px' }}>
                <div style={{ fontWeight: 900, fontSize: 11, color: '#0f172a', marginBottom: 4 }}>{m.hrHeading}</div>
                <div style={{ fontSize: 10, color: '#4c0519', lineHeight: 1.7 }}>{m.hrSuppressedSymptoms}</div>
            </div>
        );
    }
    /*
      Age unknown renders NOTHING, unlike every refusal in `MeasurementsPanel`. The
      difference is that those refusals sit under a number the resident just gave,
      where a blank reads as a withheld verdict. This block was never asked for, so
      an apology for its absence would be the portal talking about itself.
    */
    if (result.suppressed) return null;

    const { zones, basis, hrMax, spreadBpm, cautionOnly } = result;

    const equationNote = (m.hrEquationNote || '')
        .replace('{tanaka}', String(basis.tanaka.bpm))
        .replace('{astrand}', String(basis.astrand.bpm));
    const spreadNote = (m.hrSpreadNote || '').replace('11', String(spreadBpm));

    return (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div>
                <div style={{ fontWeight: 900, fontSize: 11, color: '#0f172a' }}>{m.hrHeading}</div>
                <div style={{ fontSize: 8.5, color: '#475569', lineHeight: 1.45, marginTop: 2 }}>{m.hrIntro}</div>
            </div>

            <div style={{ fontSize: 10, color: '#475569' }}>
                <strong style={{ color: '#0f172a' }}>{m.hrMaxLabel}:</strong>{' '}
                <span style={{ fontWeight: 900, color: '#0f766e' }}>{hrMax} {m.hrBpm}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {zones.map((zone) => {
                    const skin = RAMP[zone.id];
                    return (
                        <div key={zone.id} style={{ display: 'flex', alignItems: 'stretch', gap: 8 }}>
                            {/*
                              The range is printed INSIDE the colour, so the swatch is
                              never a bare decoration that has to be decoded from a
                              key somewhere else on the page.
                            */}
                            <div
                                style={{
                                    background: skin.bg, border: `1px solid ${skin.border}`,
                                    color: skin.fg, borderRadius: 6, padding: '3px 8px',
                                    fontSize: 9, fontWeight: 900, whiteSpace: 'nowrap',
                                    width: 86, textAlign: 'center', flexShrink: 0,
                                }}
                            >
                                {/*
                                  A hyphen, not the word "to": this chip was
                                  rendering "81 to 97" inside the Malay, Chinese and
                                  Tamil reports, because the connector was English
                                  written into the component rather than copy.
                                */}
                                {zone.fromBpm}-{zone.toBpm}
                            </div>
                            {/*
                              ⚠️ ONE LINE PER ZONE. Each benefit used to carry its own
                                 version of the talk test ("easy enough to hold a
                                 conversation", "only a few words"), which wrapped to
                                 two lines per row in Malay and Tamil and was five
                                 restatements of ONE idea. That idea now appears once,
                                 below the table, and the rows say what the range is
                                 for and stop.
                            */}
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 0 }}>
                                <div style={{ fontSize: 8.5, fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' }}>
                                    {m.hrZoneNames[zone.id]}
                                </div>
                                <div style={{ fontSize: 8, color: '#475569', lineHeight: 1.35 }}>
                                    {m.hrZoneBenefits[zone.id]}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div style={NOTE}>{m.hrTalkTest}</div>
            {/*
              Shown only to somebody who said they take one. Printing it for
              everybody would turn a specific, useful warning into boilerplate that
              the people it is for have already learned to skip.
            */}
            {cautionOnly && <div style={NOTE}>{m.hrMedicationNote}</div>}

            {/*
              ⚠️ ONE PARAGRAPH, NOT THREE DIVS. All three sentences say the same
                 thing — this figure is softer than it looks — and as separate blocks
                 they cost two container gaps and three ragged last lines, which is
                 what pushed the safety caution off the bottom of the Tamil page.

                 The middle sentence is printed whenever the resident is outside
                 Astrand's stated population, which here is nearly everybody: that
                 sample stops at 34. The second figure is still shown, because both
                 equations were asked for, but never without saying why it is not
                 the one being used.
            */}
            <div style={NOTE}>
                {equationNote}
                {basis.astrand.withinPopulation === false && <> {m.hrAstrandOutside}</>}
                {' '}{spreadNote}
            </div>

            {/*
              The two equation citations are NOT printed here. They sit in the
              page's existing "Compared against" block beside the strength sources,
              which is where a reader already looks for provenance, and a second
              citation box thirty pixels below the first was what finally pushed
              this page over its limit in Tamil.
            */}

            {/* ⚠️ SAFETY-CRITICAL. A prohibition, gated by `copyReview.js`. */}
            <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 8, padding: '7px 10px' }}>
                <div style={{ fontSize: 8.5, color: '#4c0519', lineHeight: 1.5 }}>{m.hrCaution}</div>
            </div>
        </div>
    );
}
