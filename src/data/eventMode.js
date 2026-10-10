/**
 * ==============================================================================
 * EVENT MODE — Health Fiesta 2026, and the short assessment it needs
 * ==============================================================================
 *
 * Sembawang GRC and Sembawang West SMC MAECs' Health Fiesta, Sunday 11 October
 * 2026, 7.45am to 2.00pm, Bukit Canberra. The organisers asked for the screening
 * to take two to three minutes at the stand rather than the six the journey-time
 * simulation measured, and for north-side residents to leave with the
 * M3@Woodlands "Scan & Follow" poster in their report.
 *
 * Three things live here so that nothing about the event is scattered:
 *
 *   1. WHEN the event gate is on. A date window in Singapore time, with a query
 *      string override for testing (`?event=fiesta` forces it on, `?event=off`
 *      forces it off). Outside the window the portal behaves exactly as before,
 *      so nothing has to be undone on Monday.
 *
 *   2. WHICH questions the short assessment keeps. Everything the risk score, the
 *      safety routing, the resource mapping and the strength bands need, and
 *      nothing else. The perception block, the social determinants and the
 *      record linkage are dropped for the day: a person who wants the full
 *      screening can do it at home from the same link.
 *
 *   3. The north poster: the sectors it applies to and the four links behind its
 *      QR codes, decoded from the poster itself on 2026-10-10.
 *
 * ⚠️ THE SHORT LIST IS A FILTER OVER `DOMAIN_CONFIG`, NOT A SECOND CONFIG. The
 *    chat drops a question by withholding its prompt (`isStepAvailable` treats a
 *    missing prompt as a step to skip), and the form hides the matching fields,
 *    so the order, the gates and the parsers are the ones already tested.
 */

export const EVENT = Object.freeze({
    id: 'health-fiesta-2026',
    name: 'Health Fiesta 2026',
    // Singapore time, the whole day. The stand runs 7.45am to 2.00pm, but a
    // window wider than the stand costs nothing and a narrower one risks the gate
    // switching off while residents are still queueing.
    start: '2026-10-11T00:00:00+08:00',
    end: '2026-10-11T23:59:59+08:00',
});

export const isEventWindow = (now = new Date()) =>
    now.getTime() >= Date.parse(EVENT.start) && now.getTime() <= Date.parse(EVENT.end);

/** `?event=fiesta` forces the gate on, `?event=off` forces it off, otherwise the window decides. */
export const isEventActive = (now = new Date(), search = '') => {
    const q = new URLSearchParams(search || '').get('event');
    if (q === 'off') return false;
    if (q === 'fiesta') return true;
    return isEventWindow(now);
};

/** The questions the short assessment keeps, by `DOMAIN_CONFIG` key. */
export const CONCISE_KEYS = Object.freeze([
    'pavs_days', 'pavs_mins', 'strength',
    'demographics', 'age_years',
    'medical',
    'falls',
    'postal_code',
    'grip_kg', 'sit_to_stand', 'measure_setting',
]);

/** The chat's prompt dictionary with the dropped questions removed. */
export const concisePrompts = (prompts) =>
    Object.fromEntries(Object.entries(prompts || {}).filter(([key]) => CONCISE_KEYS.includes(key)));

/** The form fields the short assessment does not ask. Hidden, and not required. */
export const CONCISE_FORM_SKIPS = Object.freeze([
    'wellbeing', 'barriers', 'social', 'foodInsecure', 'incomeAdequacy', 'housing',
    'aware', 'referred', 'rating', 'trust', 'improve',
    'race', 'healthierSg', 'previousId',
]);

/** The form's four pages, by index, that the short assessment shows. */
export const CONCISE_FORM_STEPS = Object.freeze([0, 3]);

export const NORTH_POSTER = Object.freeze({
    sectors: Object.freeze(['70', '71', '72', '73', '74', '75', '76']),
    title: Object.freeze({
        en: 'Scan and follow M3@Woodlands',
        ms: 'Imbas dan ikuti M3@Woodlands',
        zh: '扫码关注 M3@Woodlands',
        ta: 'M3@Woodlands ஐ ஸ்கேன் செய்து பின்தொடரவும்',
    }),
    lead: Object.freeze({
        en: 'For the latest updates, programmes and community happenings in Woodlands.',
        ms: 'Untuk kemas kini terkini, program dan aktiviti komuniti di Woodlands.',
        zh: '获取兀兰最新资讯、活动与社区动态。',
        ta: 'வூட்லண்ட்ஸில் சமீபத்திய தகவல்கள், நிகழ்ச்சிகள் மற்றும் சமூக நிகழ்வுகளுக்கு.',
    }),
    /*
      Decoded from the four QR codes on the poster, 2026-10-10, with OpenCV. The
      boxes are each code's footprint as a fraction of the poster's width and
      height, so the PDF can carry a tappable link over each one.
    */
    links: Object.freeze([
        Object.freeze({
            id: 'whatsapp',
            label: Object.freeze({ en: 'WhatsApp', ms: 'WhatsApp', zh: 'WhatsApp', ta: 'WhatsApp' }),
            url: 'https://go.gov.sg/m3wcwa',
            box: Object.freeze({ x: 0.302, y: 0.349, w: 0.152, h: 0.108 }),
        }),
        Object.freeze({
            id: 'facebook',
            label: Object.freeze({ en: 'Facebook', ms: 'Facebook', zh: 'Facebook', ta: 'Facebook' }),
            url: 'https://go.gov.sg/m3wfb',
            box: Object.freeze({ x: 0.764, y: 0.347, w: 0.158, h: 0.112 }),
        }),
        Object.freeze({
            id: 'instagram',
            label: Object.freeze({ en: 'Instagram', ms: 'Instagram', zh: 'Instagram', ta: 'Instagram' }),
            url: 'https://go.gov.sg/m3wig',
            box: Object.freeze({ x: 0.302, y: 0.574, w: 0.152, h: 0.107 }),
        }),
        Object.freeze({
            id: 'tiktok',
            label: Object.freeze({ en: 'TikTok', ms: 'TikTok', zh: 'TikTok', ta: 'TikTok' }),
            url: 'https://go.gov.sg/m3wdlstt',
            box: Object.freeze({ x: 0.766, y: 0.572, w: 0.151, h: 0.108 }),
        }),
    ]),
});

export const isNorthSector = (sector) => NORTH_POSTER.sectors.includes(String(sector ?? ''));
