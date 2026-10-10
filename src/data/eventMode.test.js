import { describe, it, expect } from 'vitest';
import {
    EVENT, isEventWindow, isEventActive, CONCISE_KEYS, concisePrompts, CONCISE_FORM_STEPS,
    NORTH_POSTER, isNorthSector,
} from './eventMode';
import { DOMAIN_CONFIG } from './communityDomains';
import { copyFor } from './communityChatCopy';

describe('the event window', () => {
    it('is the whole of 11 October 2026, Singapore time', () => {
        expect(isEventWindow(new Date('2026-10-10T23:59:00+08:00'))).toBe(false);
        expect(isEventWindow(new Date('2026-10-11T00:00:00+08:00'))).toBe(true);
        expect(isEventWindow(new Date('2026-10-11T07:45:00+08:00'))).toBe(true);
        expect(isEventWindow(new Date('2026-10-11T23:59:59+08:00'))).toBe(true);
        expect(isEventWindow(new Date('2026-10-12T00:00:00+08:00'))).toBe(false);
    });
    it('the query string overrides the window both ways', () => {
        const off = new Date('2026-09-01T10:00:00+08:00'), on = new Date('2026-10-11T10:00:00+08:00');
        expect(isEventActive(off, '?event=fiesta')).toBe(true);
        expect(isEventActive(on, '?event=off')).toBe(false);
        expect(isEventActive(on, '')).toBe(true);
        expect(isEventActive(off, '')).toBe(false);
        expect(isEventActive(off, '?event=other')).toBe(false);
    });
    it('has an id for the session flag', () => {
        expect(EVENT.id).toMatch(/^[a-z0-9-]+$/);
    });
});

describe('the short assessment', () => {
    it('keeps only keys that exist in DOMAIN_CONFIG', () => {
        const keys = DOMAIN_CONFIG.map((d) => d.key);
        CONCISE_KEYS.forEach((k) => expect(keys).toContain(k));
    });
    it('keeps what the score, the safety routing, the mapping and the bands need', () => {
        ['pavs_days', 'pavs_mins', 'strength', 'demographics', 'age_years', 'medical', 'falls', 'postal_code', 'grip_kg', 'sit_to_stand']
            .forEach((k) => expect(CONCISE_KEYS).toContain(k));
    });
    it('drops the perception block and record linkage', () => {
        ['services_aware', 'ever_referred', 'service_rating', 'care_comfort', 'one_change', 'previous_id', 'wellbeing', 'social']
            .forEach((k) => expect(CONCISE_KEYS).not.toContain(k));
    });
    for (const lang of ['en', 'ms', 'zh', 'ta']) {
        it(`${lang}: concisePrompts keeps a prompt for every kept key and nothing else`, () => {
            const p = concisePrompts(copyFor(lang).prompts);
            expect(Object.keys(p).sort()).toEqual([...CONCISE_KEYS].sort());
            Object.values(p).forEach((v) => expect(v).toBeTruthy());
        });
    }
    it('the form shows the first and last pages', () => {
        expect(CONCISE_FORM_STEPS).toEqual([0, 3]);
    });
});

describe('the north poster', () => {
    it('applies to sectors 70 to 76 and nothing else', () => {
        ['70', '71', '72', '73', '74', '75', '76'].forEach((s) => expect(isNorthSector(s)).toBe(true));
        ['69', '77', '46', '--', null, undefined, ''].forEach((s) => expect(isNorthSector(s)).toBe(false));
    });
    it('carries four go.gov.sg links with footprints inside the poster', () => {
        expect(NORTH_POSTER.links).toHaveLength(4);
        NORTH_POSTER.links.forEach((l) => {
            expect(l.url).toMatch(/^https:\/\/go\.gov\.sg\/[a-z0-9]+$/);
            const { x, y, w, h } = l.box;
            expect(x).toBeGreaterThan(0); expect(y).toBeGreaterThan(0);
            expect(x + w).toBeLessThan(1); expect(y + h).toBeLessThan(1);
            ['en', 'ms', 'zh', 'ta'].forEach((lang) => expect(l.label[lang]).toBeTruthy());
        });
        expect(new Set(NORTH_POSTER.links.map((l) => l.url)).size).toBe(4);
    });
});
