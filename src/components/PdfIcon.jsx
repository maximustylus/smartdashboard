/**
 * ==============================================================================
 * AN ICON FOR THE PRINTED REPORT, DRAWN AS AN IMAGE
 * ==============================================================================
 *
 * The report is a picture of the page taken by html2canvas. Two things about it
 * decide how an icon beside text has to be built, both measured in the real
 * downloaded PDF on 2026-09-24:
 *
 *   1. html2canvas draws TEXT about 6px lower than the browser lays it out, and
 *      draws everything else where the browser put it. An icon beside a word
 *      therefore printed above the word.
 *   2. An inline SVG moved to compensate (by `top`, by a transform, or by
 *      margins) was printed CROPPED: only its lower half survived.
 *
 * So the icon is rendered once as ordinary SVG, serialised, and swapped for an
 * `<img>` of itself, which html2canvas draws faithfully wherever it sits. The
 * image is then moved down 6px with `position: relative`, which moves it alone
 * and leaves the row, and the page (7px to spare in Tamil), exactly as tall.
 *
 * Print templates only. The app's screen uses the lucide components directly.
 */
import React, { useLayoutEffect, useRef, useState } from 'react';

export const PDF_TEXT_DROP = 6;

export default function PdfIcon({ icon: Icon, size = 14, color = '#0d9488', strokeWidth = 2.25, nudge = PDF_TEXT_DROP }) {
    const holder = useRef(null);
    const [src, setSrc] = useState(null);

    useLayoutEffect(() => {
        const svg = holder.current?.querySelector('svg');
        if (!svg || typeof XMLSerializer === 'undefined') return;
        const markup = new XMLSerializer().serializeToString(svg);
        setSrc(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`);
    }, [Icon, size, color, strokeWidth]);

    const place = { flexShrink: 0, position: 'relative', top: nudge };
    if (src) {
        return <img src={src} width={size} height={size} alt="" style={{ ...place, display: 'block', width: size, height: size }} />;
    }
    return (
        <span ref={holder} style={{ ...place, display: 'inline-flex', width: size, height: size }}>
            <Icon size={size} color={color} strokeWidth={strokeWidth} />
        </span>
    );
}
