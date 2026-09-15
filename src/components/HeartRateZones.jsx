/**
 * ==============================================================================
 * HEART RATE ZONES — the five ranges, their benefits, and what they are not
 * ==============================================================================
 *
 * Fills the room left on the measurements page. `zonesFor` decides what may be
 * shown; this renders it and never recomputes anything.
 *
 * ------------------------------------------------------------------------------
 * ⚠️ THE RAMP IS THE CONVENTIONAL ONE: GREY, BLUE, GREEN, AMBER, RED
 * ------------------------------------------------------------------------------
 *
 * Owner's decision, 2026-09-14: *"I need heart rate chart to follow the heart rate
 * zone colours. Garmin, Polar, Apple, Acxta etc uses those heart rate colours"*.
 *
 * This overrides an earlier teal ramp chosen here to avoid red. The objection was
 * raised and settled by the owner, and the reasoning is recorded rather than
 * deleted, because it names a real hazard that the copy now has to carry instead:
 *
 *     Page 1 of this same report prints a traffic light in which RED MEANS
 *     "HIGH NEEDS". A red band at the top of a heart rate table on page 2 can
 *     read, to a resident holding both pages, as a second verdict about them.
 *     It is not one. The top zone labels an INTENSITY, and reaching it is
 *     neither good nor bad.
 *
 * Since the colour can no longer carry that distinction, `hrColourNote` says it in
 * words, directly under the table. The residents most likely to conflate the two
 * are the ones who got a red result on page 1, which is exactly the group this
 * portal exists to reach, so this is not a decorative caption.
 *
 * ------------------------------------------------------------------------------
 * ⚠️ WHAT WAS CHECKED, AND THE ONE CHECK THAT DELIBERATELY FAILS
 * ------------------------------------------------------------------------------
 *
 * `scripts/validate_palette.js "#94a3b8,#2563eb,#15803d,#f59e0b,#b91c1c" --mode light`
 *
 *     PASS  lightness band          all five inside the band
 *     PASS  CVD separation          worst adjacent pair ΔE 17.4 protan (floor is 8)
 *     PASS  normal-vision floor     worst adjacent pair ΔE 24.4 (floor is 15)
 *     FAIL  chroma floor            #94a3b8 "reads gray"
 *     WARN  contrast vs surface     relief required: visible labels
 *
 * The chroma failure is the intended reading, not a defect: zone one IS grey in
 * every product the owner named. The contrast warning is discharged by the labels
 * below, which the skill treats as the required relief rather than as optional.
 *
 * ⚠️ THE FIRST DRAFT OF THIS PALETTE FAILED, AND IT FAILED WHERE IT ALWAYS DOES.
 *    Straight orange beside straight red (`#f97316` / `#f87171`) came back at
 *    ΔE 8.0 for NORMAL vision — under the floor of 15, meaning readers with full
 *    colour vision cannot reliably tell zone four from zone five. Amber and a
 *    deeper red separate them while still reading as the convention.
 *
 * Colour is never the only channel here. Every row prints its own beats-per-minute
 * range INSIDE its swatch and its name in words beside it, so the table survives
 * both colour-vision deficiency and a greyscale photocopy, which is how a fair
 * number of these reports will actually be read. That matters more than usual for
 * this ramp: blue and green sit within 0.005 of each other in relative luminance,
 * so a photocopy cannot separate them and the words are doing the work.
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
import { HR_ZONE_RAMP } from '../data/zonePalette';

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
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/*
              ⚠️ THE SAME HEADING TREATMENT AS THE OTHER BLOCKS ON THIS PAGE.
                 This was 11px bold sentence case, which is the page's SUB-heading
                 style, so the biggest block on page 2 announced itself more quietly
                 than the citation list beneath it.
            */}
            <div>
                <div style={{ fontWeight: 900, fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: 2 }}>
                    {m.hrHeading}
                </div>
                <div style={{ fontSize: 8.5, color: '#475569', lineHeight: 1.45, marginTop: 4 }}>{m.hrIntro}</div>
            </div>

            <div style={{ fontSize: 10, color: '#475569' }}>
                <strong style={{ color: '#0f172a' }}>{m.hrMaxLabel}:</strong>{' '}
                <span style={{ fontWeight: 900, color: '#0f766e' }}>{hrMax} {m.hrBpm}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {/*
                  Column headings. Without them the middle column reads as a verdict:
                  "Light" and "Hard" beside somebody's own report look like a grade
                  until a heading says the word names an intensity.
                */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, paddingBottom: 3 }}>
                    <div style={{ width: 86, flexShrink: 0, fontSize: 7, fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'center' }}>
                        {m.hrColRange}
                    </div>
                    <div style={{ fontSize: 7, fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                        {m.hrColZone}
                    </div>
                    <div style={{ fontSize: 7, fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                        {m.hrColPurpose}
                    </div>
                </div>
                {zones.map((zone) => {
                    const skin = HR_ZONE_RAMP[zone.id];
                    return (
                        <div key={zone.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {/*
                              The range is printed INSIDE the colour, so the swatch is
                              never a bare decoration that has to be decoded from a
                              key somewhere else on the page.
                            */}
                            <div
                                /*
                                  ⚠️ ALL THE PADDING IS ON THE BOTTOM. THAT IS DELIBERATE,
                                     AND IT IS NOT A TYPO FOR SYMMETRIC PADDING.

                                     v2.14.0 shipped this block broken. The row was
                                     `alignItems: stretch`, so the chip took the
                                     row's height and, as a plain padded block, grew
                                     UPWARD into the column headings — drawing the
                                     pill straight through "Beats per minute" so it
                                     read as struck out.

                                     `alignItems: center` on the row fixes the
                                     collision. It does not fix the second half of
                                     the defect: html2canvas puts the text baseline
                                     lower in the line box than the browser does, so
                                     the digits sat on the floor of the pill.
                                     Measured off a 300dpi render of a real
                                     download, the shipped chip was 4.6 CSS px below
                                     centre; flex-centring the text inside the chip
                                     did not move it, and an explicit height with a
                                     matching lineHeight clipped the digits in half.

                                     What works is to leave the top padding at zero,
                                     hold the line box to exactly the font size, and
                                     put the whole 8px underneath. That pushes the
                                     pill's own box down around the text instead of
                                     trying to move the text inside the box. Same
                                     chip height as before (~19px), 1.7px below
                                     centre instead of 4.6px.

                                     ⚠️ CHANGE THESE FOUR NUMBERS AND YOU MUST
                                        MEASURE A RENDERED PDF, not read a headroom
                                        number. The headroom script passed through
                                        every broken state, correctly — height was
                                        never the problem, and that is precisely
                                        what it cannot see. The measurement is
                                        pdftoppm at 300dpi plus an ink-bounding-box
                                        check inside each pill; eyeballing a crop
                                        called the 4.6px version "centred".
                                                              */
                                style={{
                                    background: skin.bg, border: `1px solid ${skin.bg}`,
                                    color: skin.fg, borderRadius: 6, padding: '0 8px 8px',
                                    fontSize: 9, fontWeight: 900, whiteSpace: 'nowrap',
                                    lineHeight: 1,
                                    width: 86, flexShrink: 0, textAlign: 'center',
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                                <div style={{ fontSize: 8.5, fontWeight: 800, color: '#0f172a', width: 62, flexShrink: 0 }}>
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

            <div style={NOTE}>{m.hrTalkTest} {m.hrColourNote}</div>
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
