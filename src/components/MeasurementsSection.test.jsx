/**
 * ==============================================================================
 * MEASUREMENTS SECTION — the meters and heart rate zones ON THE SCREEN
 * ==============================================================================
 * Runner: Vitest.  Run: npm test
 *
 * ⚠️ THE FAILURE THIS FILE EXISTS FOR HAS ALREADY HAPPENED TWICE IN THIS REPO.
 *
 * Both times, content was written into the print template at
 * `position:absolute; top:-10000px`, rasterised correctly into the downloaded PDF,
 * and shown to NOBODY. First the medical disclaimer (see the note above
 * `MedicalDisclaimer` in `ResultPage.jsx`), then the whole measurements feature:
 * meters, bands and heart rate ranges, invisible in the app for anyone who did not
 * tap Download and open the file.
 *
 * The last test in this file is the guard: `MeasurementsSection` must be rendered
 * OUTSIDE the off-screen wrapper. It reads the source because that is where the
 * mistake is made — a component can be mounted and still be at -10000px.
 */

import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import MeasurementsSection from './MeasurementsSection';
import { MEASURES_COPY } from '../data/measuresCopy';
import { gripStrengthResult, sitToStandResult } from '../utils/functionalMeasures';
import { zonesFor } from '../utils/heartRateZones';
import { HR_ZONE_RAMP } from '../data/zonePalette';

afterEach(cleanup);

// Built from the real functions, never hand-written: a fixture that disagrees with
// what the app computes tests a screen no resident will ever see.
const functional = () => ({
    grip: gripStrengthResult({ ageYears: 67, sex: 'female', kg: 18, setting: 'community-event' }),
    sitToStand: sitToStandResult({
        ageYears: 67, sex: 'female', reps: 13, protocol: 'sts-30s', setting: 'community-event',
    }),
    setting: 'community-event',
});

const mount = (over = {}) => render(
    <MeasurementsSection
        functional={functional()}
        lang="en"
        ageYears={67}
        symptomFlag={false}
        medFlag={false}
        {...over}
    />,
);

describe('the measurements a resident actually gave', () => {
    it('shows both numbers, both bands, and a meter for each', () => {
        const { container } = mount();
        expect(screen.getByText(MEASURES_COPY.en.gripLabel)).toBeTruthy();
        expect(screen.getByText('18')).toBeTruthy();
        expect(screen.getByText('13')).toBeTruthy();

        // The meter draws the published band edges as text, so the numbers are
        // never carried by the picture alone.
        expect(screen.getByText('19.5')).toBeTruthy();
        expect(screen.getByText('30.5')).toBeTruthy();
        expect(screen.getByText('11')).toBeTruthy();

        // One tick per published point, plus the band fill and the marker.
        expect(container.querySelectorAll('div[style*="left:"]').length).toBeGreaterThan(10);
    });

    it('prints the safety-critical not-a-diagnosis line beside the numbers', () => {
        mount();
        expect(screen.getByText(MEASURES_COPY.en.notADiagnosis)).toBeTruthy();
    });

    it('cites only the sources a comparison was actually made against', () => {
        mount();
        expect(screen.getByText(/Tomkinson/)).toBeTruthy();
        expect(screen.getByText(/CDC STEADI/)).toBeTruthy();
        // Strassmann is the one-minute test; this resident did the thirty-second one.
        expect(screen.queryByText(/Strassmann/)).toBeNull();
    });
});

describe('the heart rate block', () => {
    it('renders all five zones, each with its range, name and purpose', () => {
        mount();
        const { zones } = zonesFor(67, {});
        zones.forEach((zone) => {
            expect(screen.getByText(`${zone.fromBpm}-${zone.toBpm}`), zone.id).toBeTruthy();
            expect(screen.getByText(MEASURES_COPY.en.hrZoneNames[zone.id])).toBeTruthy();
            expect(screen.getByText(MEASURES_COPY.en.hrZoneBenefits[zone.id])).toBeTruthy();
        });
    });

    it('labels its columns, so the middle one is not read as a verdict', () => {
        mount();
        expect(screen.getByText(MEASURES_COPY.en.hrColRange)).toBeTruthy();
        expect(screen.getByText(MEASURES_COPY.en.hrColZone)).toBeTruthy();
        expect(screen.getByText(MEASURES_COPY.en.hrColPurpose)).toBeTruthy();
    });

    /*
      ⚠️ COMPARED AS rgb(), NOT AS HEX. React writes an inline style object out
         through the CSSOM, which normalises `#94a3b8` to `rgb(148, 163, 184)`, so
         a substring search for the hex finds nothing and the test fails while the
         component is perfectly correct. Converting here keeps the assertion
         anchored to `zonePalette.js` rather than to a hard-coded rgb string that
         would not move if the palette did.
    */
    const asRgb = (hex) => {
        const n = parseInt(hex.slice(1), 16);
        return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
    };

    it('uses the validated ramp, not colours picked in this file', () => {
        const { container } = mount();
        const fills = [...container.querySelectorAll('[style*="background"]')]
            .map((el) => el.style.background || el.style.backgroundColor);
        Object.entries(HR_ZONE_RAMP).forEach(([id, skin]) => {
            // `HR_ZONE_RAMP` is the single source both media read. If the screen
            // ever grew its own copy, a resident's app and their PDF could disagree
            // about which band they are in.
            expect(fills, id).toContain(asRgb(skin.bg));
        });
    });

    it('carries the safety-critical caution under the table', () => {
        mount();
        expect(screen.getByText(MEASURES_COPY.en.hrCaution)).toBeTruthy();
    });

    it('shows NO zones at all when symptoms on exertion were reported', () => {
        mount({ symptomFlag: true });
        expect(screen.getByText(MEASURES_COPY.en.hrSuppressedSymptoms)).toBeTruthy();
        expect(screen.queryByText(MEASURES_COPY.en.hrZoneNames.maximum)).toBeNull();
        expect(screen.queryByText(MEASURES_COPY.en.hrCaution)).toBeNull();
        // And the equations are not cited either: citing a reference somebody was
        // never shown is a citation for something that did not happen.
        expect(screen.queryByText(/Tanaka/)).toBeNull();
    });

    it('shows the table WITH a caution when a rate-limiting medicine was reported', () => {
        mount({ medFlag: true });
        expect(screen.getByText(MEASURES_COPY.en.hrMedicationNote)).toBeTruthy();
        expect(screen.getByText(MEASURES_COPY.en.hrZoneNames.maximum)).toBeTruthy();
    });

    it('renders nothing rather than an apology when the age is unusable', () => {
        const { container } = render(
            <MeasurementsSection functional={null} lang="en" ageYears={null} />,
        );
        expect(container.innerHTML).toBe('');
    });
});

describe('every language renders without falling back to English', () => {
    ['ms', 'zh', 'ta'].forEach((lang) => {
        it(`${lang} shows its own heading, columns and caution`, () => {
            mount({ lang });
            const m = MEASURES_COPY[lang];
            expect(screen.getByText(m.hrHeading)).toBeTruthy();
            expect(screen.getByText(m.hrColZone)).toBeTruthy();
            expect(screen.getByText(m.hrCaution)).toBeTruthy();
            expect(screen.getByText(m.notADiagnosis)).toBeTruthy();
        });
    });

    it('says nothing about page numbers, because the screen has no pages', () => {
        // `hrColourNote` is shown in BOTH media. It read "the colour of your result
        // on page 1" until this block reached the screen, where that sent the
        // reader looking for a page that does not exist.
        ['en', 'ms', 'zh', 'ta'].forEach((lang) => {
            expect(MEASURES_COPY[lang].hrColourNote, lang).not.toMatch(/page 1|muka surat|第 1 页|பக்கம் 1/);
        });
    });
});

describe('⚠️ it is on the screen, not only in the download', () => {
    it('is rendered outside the off-screen print wrapper', () => {
        const source = fs.readFileSync(
            path.join(process.cwd(), 'src/components/ResultPage.jsx'), 'utf8',
        );
        const offScreenAt = source.indexOf("top: '-10000px'");
        expect(offScreenAt, 'the print wrapper moved; this guard needs rewriting').toBeGreaterThan(0);

        // The print template runs from the off-screen wrapper to the main content.
        const mainAt = source.indexOf('── MAIN CONTENT');
        expect(mainAt).toBeGreaterThan(offScreenAt);

        const usedAt = source.indexOf('<MeasurementsSection');
        expect(usedAt, 'MeasurementsSection is not rendered at all').toBeGreaterThan(0);
        expect(
            usedAt,
            'MeasurementsSection sits inside the off-screen print template, so it renders '
            + 'for html2canvas and for nobody else — the same defect twice over',
        ).toBeGreaterThan(mainAt);
    });
});
