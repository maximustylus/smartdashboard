/**
 * ==============================================================================
 * METER SCALE — the arithmetic behind `ReferenceMeter`, on its own
 * ==============================================================================
 *
 * Two pure functions, split out of the component so they can be tested against
 * thousands of real values without mounting anything, and so the component file
 * exports a component and nothing else.
 *
 * Neither throws and neither returns NaN. A meter that renders a `NaN%` CSS offset
 * collapses to the left edge, which puts a resident's marker at the bottom of a
 * scale they are nowhere near.
 */

/**
 * The drawn range: every published point plus the resident's own value, with a
 * margin so nothing sits flush against an edge.
 *
 * ⚠️ THE RESIDENT'S VALUE IS INCLUDED DELIBERATELY. Fixed to the published points
 *    alone, a genuinely strong or genuinely weak person has their marker clamped
 *    to the edge, which reads as "off the chart" — a judgement the data does not
 *    support and the worst one to print beside somebody's own number.
 *
 * ⚠️ A DEGENERATE SPAN IS THE NORMAL CASE FOR A CUT-OFF. The thirty-second chair
 *    stand publishes one figure; if the resident matched it exactly, `hi === lo`
 *    and every position would divide by zero. Widening around the point keeps the
 *    drawing honest, because the width carries no meaning in that case anyway.
 *
 * ⚠️ AN AXIS MAY BE SUPPLIED, AND FOR A SINGLE CUT-OFF IT MUST BE. One published
 *    point does not imply a range: derived from the point alone, the drawn axis
 *    collapses to the gap between the cut-off and the resident's own count, so two
 *    repetitions fill the whole track and the picture claims a scale that does not
 *    exist. `functionalMeasures.js` supplies `axisFrom` and `axisTo` for that case.
 *    The resident's value is still included, so an axis never clips them.
 *
 * @returns {{lo: number, hi: number}|null}  `null` when there is nothing to draw.
 */
export const spanFor = (points, value, axis) => {
    const all = (points || []).filter((n) => Number.isFinite(n));
    if (Number.isFinite(value)) all.push(value);
    if (axis) {
        if (Number.isFinite(axis.from)) all.push(axis.from);
        if (Number.isFinite(axis.to)) all.push(axis.to);
    }
    if (all.length === 0) return null;

    let lo = Math.min(...all);
    let hi = Math.max(...all);
    if (hi === lo) {
        const width = Math.max(1, Math.abs(lo) * 0.5);
        lo -= width;
        hi += width;
    }
    const pad = (hi - lo) * 0.08;
    return { lo: lo - pad, hi: hi + pad };
};

/** Position of a value on the drawn span, 0 to 100. Never NaN, never outside. */
export const pctOf = (value, span) => {
    if (!span || !Number.isFinite(value)) return null;
    const raw = ((value - span.lo) / (span.hi - span.lo)) * 100;
    if (!Number.isFinite(raw)) return null;
    return Math.min(100, Math.max(0, raw));
};
