/**
 * ==============================================================================
 * ZONE PALETTE — the measured colours, in ONE place, for both media
 * ==============================================================================
 *
 * The report is rendered twice: once into the off-screen A4 template that
 * `html2canvas` rasterises into the PDF, and once on the screen the resident
 * actually looks at. Those two have genuinely different constraints — a fixed
 * 794x1123 light-only box against a responsive, dark-capable app — so they are
 * separate components, following the same pattern `MedicalDisclaimer` and
 * `DataGovernance` already use in this repository.
 *
 * What they must NOT have separately is the colours. A zone ramp copied into two
 * files drifts the first time somebody adjusts one of them, and then a resident's
 * screen and their downloaded PDF disagree about which band they are in. So the
 * values live here and both import them.
 *
 * ------------------------------------------------------------------------------
 * ⚠️ THESE ARE VALIDATED VALUES. DO NOT NUDGE THEM BY EYE.
 * ------------------------------------------------------------------------------
 *
 *   node scripts/validate_palette.js "#94a3b8,#2563eb,#15803d,#f59e0b,#b91c1c" --mode light
 *
 *       PASS  lightness band        all five inside the band
 *       PASS  CVD separation        worst adjacent pair ΔE 17.4 protan  (floor 8)
 *       PASS  normal-vision floor   worst adjacent pair ΔE 24.4         (floor 15)
 *       FAIL  chroma floor          #94a3b8 "reads gray"
 *       WARN  contrast vs surface   relief required: visible labels
 *
 * The chroma failure is the intended reading rather than a defect: zone one IS
 * grey in every product the owner named (`CD27`). The contrast warning is
 * discharged by the labels, which every row carries.
 *
 * ⚠️ THE OBVIOUS PALETTE FAILS. Straight orange beside straight red
 *    (`#f97316` / `#f87171`) came back at ΔE 8.0 for NORMAL vision — under the
 *    floor of 15, meaning readers with full colour vision cannot reliably tell
 *    zone four from zone five. Amber and a deeper red separate them while still
 *    reading as the convention. If you are tempted to make zone four "more
 *    orange", run the validator first.
 */

/**
 * The conventional training-zone ramp, as Garmin, Polar and Apple use it (`CD27`).
 *
 * `fg` is chosen PER ROW against that row's own fill, not set once for all five:
 * the ramp runs light, dark, dark, light, dark, so a single text colour is
 * unreadable at one end or the other. Contrast of `fg` on `bg`, which is what a
 * resident actually has to read:
 *
 *     grey   #94a3b8 + #0f172a ... 6.6:1
 *     blue   #2563eb + #ffffff ... 5.1:1
 *     green  #15803d + #ffffff ... 5.0:1
 *     amber  #f59e0b + #0f172a ... 7.9:1
 *     red    #b91c1c + #ffffff ... 6.5:1
 */
export const HR_ZONE_RAMP = Object.freeze({
    'very-light': Object.freeze({ bg: '#94a3b8', fg: '#0f172a' }),
    light: Object.freeze({ bg: '#2563eb', fg: '#ffffff' }),
    moderate: Object.freeze({ bg: '#15803d', fg: '#ffffff' }),
    hard: Object.freeze({ bg: '#f59e0b', fg: '#0f172a' }),
    maximum: Object.freeze({ bg: '#b91c1c', fg: '#ffffff' }),
});

/**
 * The reference meter.
 *
 * ⚠️ THE BAND IS TEAL AND IS NOT PART OF THE ZONE RAMP. It answers a different
 *    question — "is this measurement inside the usual published range for your
 *    age" — and colouring it from the five-zone scale would imply the two are the
 *    same kind of statement. They are not: one is a reference range for a
 *    measured value, the other is a set of exercise intensities.
 *
 * `markerDark` is used on the screen's dark theme, where `marker` (slate-900)
 * would disappear into the card it is drawn on. The PDF never uses it: the export
 * strips the dark class before capture.
 */
export const METER_COLOURS = Object.freeze({
    track: '#e5e7eb',
    trackDark: '#334155',
    band: '#14b8a6',
    marker: '#0f172a',
    markerDark: '#f1f5f9',
    tick: '#cbd5e1',
    tickDark: '#475569',
});
