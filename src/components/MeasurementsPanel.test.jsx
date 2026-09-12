/**
 * ==============================================================================
 * MEASUREMENTS PANEL — page 3 of the printed report
 * ==============================================================================
 * Runner: Vitest.  Run: npm test
 *
 * Three failures this guards, in descending order of how much they would matter to
 * the person holding the report:
 *
 *   1. A blank space under a number they just gave. Every refusal in
 *      `functionalMeasures.js` is a state a real resident lands in, and an empty
 *      card reads as "your result was too bad to print".
 *
 *   2. A citation for a comparison that was never made. If the age was out of
 *      range, no source was consulted, and printing one says otherwise.
 *
 *   3. A reference population left implied. None of the three sources is
 *      Singaporean, and somebody comparing themselves to a Swiss sample is
 *      entitled to know that is what they are doing.
 */

import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import MeasurementsPanel from './MeasurementsPanel';
import { hasMeasurementsToShow } from '../utils/measurementAnswers';
import { MEASURES_COPY } from '../data/measuresCopy';
import { RESULT_REASONS } from '../utils/functionalMeasures';

afterEach(cleanup);

const banded = {
    grip: {
        ok: true, band: 'low', value: 22, unit: 'kg', ageBand: '65-69', sex: 'female',
        setting: 'community-event', sourceId: 'tomkinson-2025-absolute',
        referencePopulation: 'international',
    },
    sitToStand: {
        ok: true, band: 'at-or-above-average', value: 12, unit: 'reps', protocol: 'sts-30s',
        seconds: 30, implausibleForProtocol: false, ageBand: '65-69', sex: 'female',
        setting: 'community-event', sourceId: 'cdc-steadi-2017',
        referencePopulation: 'united-states',
    },
    setting: 'community-event',
};
const skipped = {
    grip: { ok: false, reason: 'missing', value: null },
    sitToStand: { ok: false, reason: 'missing', value: null, protocol: 'sts-30s' },
    setting: null,
};

describe('the page exists only when there is something on it', () => {
    it('has nothing to show when both were skipped', () => {
        expect(hasMeasurementsToShow(skipped)).toBe(false);
    });

    it('has something to show for a banded figure', () => {
        expect(hasMeasurementsToShow(banded)).toBe(true);
    });

    // A refusal is worth a page: the person gave a number and deserves to be told
    // why it was not compared, rather than getting silence.
    it('has something to show for a figure that could not be compared', () => {
        expect(hasMeasurementsToShow({
            grip: { ok: false, reason: 'no-reference-for-age', value: 22 },
            sitToStand: { ok: false, reason: 'missing', value: null },
        })).toBe(true);
    });

    it('never throws on an absent or malformed result set', () => {
        [undefined, null, {}, { grip: null }].forEach((input) => {
            expect(() => hasMeasurementsToShow(input)).not.toThrow();
            expect(hasMeasurementsToShow(input)).toBe(false);
        });
    });
});

describe('a compared measurement', () => {
    it('shows the number, the band and what to do about it', () => {
        render(<MeasurementsPanel functional={banded} lang="en" />);
        expect(screen.getByText('22')).toBeTruthy();
        expect(screen.getByText(MEASURES_COPY.en.gripLabel)).toBeTruthy();
        expect(screen.getAllByText(MEASURES_COPY.en.bands.below).length).toBeGreaterThan(0);
        expect(screen.getAllByText(MEASURES_COPY.en.advice.below).length).toBeGreaterThan(0);
    });

    it('names where it was measured', () => {
        render(<MeasurementsPanel functional={banded} lang="en" />);
        expect(screen.getByText(MEASURES_COPY.en.settings['community-event'])).toBeTruthy();
    });

    // Safety-critical, and on this page because this is the page with the numbers.
    it('prints the not-a-diagnosis line', () => {
        render(<MeasurementsPanel functional={banded} lang="en" />);
        expect(screen.getByText(MEASURES_COPY.en.notADiagnosis)).toBeTruthy();
    });

    it('cites both sources and names each reference population', () => {
        const { container } = render(<MeasurementsPanel functional={banded} lang="en" />);
        const text = container.textContent;
        expect(text).toContain('10.1016/j.jshs.2024.101014');
        expect(text).toContain('CDC STEADI');
        expect(text).toContain(MEASURES_COPY.en.populations.international);
        expect(text).toContain(MEASURES_COPY.en.populations['united-states']);
    });

    it('warns when a count does not fit the test it came from', () => {
        const odd = { ...banded, sitToStand: { ...banded.sitToStand, implausibleForProtocol: true } };
        render(<MeasurementsPanel functional={odd} lang="en" />);
        expect(screen.getByText(MEASURES_COPY.en.implausible)).toBeTruthy();
    });
});

describe('a measurement that could not be compared', () => {
    // THE ONE THAT MATTERS MOST. A blank card under a number somebody just gave.
    it.each(RESULT_REASONS.filter((r) => r !== 'missing'))(
        'explains %s rather than leaving a blank', (reason) => {
            const { container } = render(
                <MeasurementsPanel
                    functional={{ grip: { ok: false, reason, value: 22 }, sitToStand: null, setting: null }}
                    lang="en"
                />,
            );
            expect(container.textContent).toContain(MEASURES_COPY.en.reasons[reason]);
        },
    );

    it('keeps the number on screen so it can be shown to a doctor', () => {
        render(<MeasurementsPanel
            functional={{ grip: { ok: false, reason: 'no-reference-for-age', value: 22 }, sitToStand: null }}
            lang="en"
        />);
        expect(screen.getByText('22')).toBeTruthy();
    });

    // No comparison was made, so no paper was consulted. Printing one would be a
    // citation for something that did not happen.
    it('cites nothing when nothing was compared', () => {
        const { container } = render(<MeasurementsPanel
            functional={{ grip: { ok: false, reason: 'no-reference-for-age', value: 22 }, sitToStand: null }}
            lang="en"
        />);
        expect(container.textContent).not.toContain(MEASURES_COPY.en.comparedAgainst);
        expect(container.textContent).not.toContain('10.1016');
    });

    it('shows no card at all for a measurement that was simply skipped', () => {
        const { container } = render(<MeasurementsPanel
            functional={{ ...skipped, grip: banded.grip }}
            lang="en"
        />);
        expect(container.textContent).toContain(MEASURES_COPY.en.gripLabel);
        expect(container.textContent).not.toContain(MEASURES_COPY.en.stsLabel['sts-30s']);
    });
});

describe('every language', () => {
    it.each(['en', 'ms', 'zh', 'ta'])('%s renders the page in its own words', (lang) => {
        const { container } = render(<MeasurementsPanel functional={banded} lang={lang} />);
        expect(container.textContent).toContain(MEASURES_COPY[lang].reportHeading);
        expect(container.textContent).toContain(MEASURES_COPY[lang].notADiagnosis);
        expect(container.textContent).toContain(MEASURES_COPY[lang].populations.international);
    });

    /*
      ⚠️ `reportIntro`, NOT `intro`. `intro` is the question-time line — "you can
         skip this and your result will not change" — which is nonsense printed
         beside figures the person already gave. One string reused in two places
         reads as the portal not knowing where it is.
    */
    it.each(['en', 'ms', 'zh', 'ta'])('%s uses the report wording, not the question wording', (lang) => {
        const { container } = render(<MeasurementsPanel functional={banded} lang={lang} />);
        expect(container.textContent).toContain(MEASURES_COPY[lang].reportIntro);
        expect(container.textContent).not.toContain(MEASURES_COPY[lang].intro);
    });

    it('falls back to English rather than rendering blank for an unknown language', () => {
        const { container } = render(<MeasurementsPanel functional={banded} lang="de" />);
        expect(container.textContent).toContain(MEASURES_COPY.en.reportHeading);
    });
});
