/**
 * ==============================================================================
 * STEP BADGES, IN THE LANGUAGE THE RESIDENT CHOSE — `CP28`
 * ==============================================================================
 *
 * The small label above each chat question ("Your Age", "Housing Environment")
 * was an English literal in `DOMAIN_CONFIG`, so a resident who chose Chinese or
 * Tamil saw an English label on every one of up to twenty-four questions. Logged
 * as `CP28` on 2026-09-12, visible again in the v2.15.0 screenshots, fixed here.
 *
 * ⚠️ THE EMOJI STAYS IN `DOMAIN_CONFIG`, THE WORDS LIVE HERE. `DOMAIN_CONFIG`
 *    keeps its English badge as the fallback and as the source of the emoji, so
 *    the step list still reads on its own and nothing that inspects it changes.
 *    `badgeFor` swaps the words after the emoji for the active language and
 *    leaves the emoji where it was.
 *
 * ⚠️ ONE TABLE, KEYED BY STEP, FOR THE SAME REASON AS `perceptionCopy.js`: a
 *    language cannot be short by construction, and `badgeCopy.test.js` fails if a
 *    step in `DOMAIN_CONFIG` has no row here or a row is missing a language.
 *
 * ⚠️ MACHINE TRANSLATED AND UNVERIFIED, like the rest of ms/zh/ta. Not
 *    safety-critical: a badge names a topic, it never instructs. Not registered
 *    in `copyReview.js`. Tracked under `CD13`.
 */

export const BADGE_COPY = Object.freeze({
    pavs_days:       Object.freeze({ en: 'Physical Activity · Q1 of 2', ms: 'Aktiviti Fizikal · 1 dari 2', zh: '体力活动 · 第 1 题，共 2 题', ta: 'உடல் செயல்பாடு · 1 / 2' }),
    pavs_mins:       Object.freeze({ en: 'Physical Activity · Q2 of 2', ms: 'Aktiviti Fizikal · 2 dari 2', zh: '体力活动 · 第 2 题，共 2 题', ta: 'உடல் செயல்பாடு · 2 / 2' }),
    strength:        Object.freeze({ en: 'Strength Training',            ms: 'Latihan Kekuatan',           zh: '力量训练',            ta: 'வலிமைப் பயிற்சி' }),
    demographics:    Object.freeze({ en: 'About You',                    ms: 'Tentang Anda',               zh: '关于您',              ta: 'உங்களைப் பற்றி' }),
    age_years:       Object.freeze({ en: 'Your Age',                     ms: 'Umur Anda',                  zh: '您的年龄',            ta: 'உங்கள் வயது' }),
    medical:         Object.freeze({ en: 'Health & Safety Check',        ms: 'Semakan Kesihatan & Keselamatan', zh: '健康与安全检查',   ta: 'உடல்நலம் & பாதுகாப்பு' }),
    barriers:        Object.freeze({ en: 'Cost & Access',                ms: 'Kos & Akses',                zh: '费用与途径',          ta: 'செலவு & அணுகல்' }),
    social:          Object.freeze({ en: 'Social Support',               ms: 'Sokongan Sosial',            zh: '社会支持',            ta: 'சமூக ஆதரவு' }),
    food_insecurity: Object.freeze({ en: 'Food Security',                ms: 'Keselamatan Makanan',        zh: '食物保障',            ta: 'உணவுப் பாதுகாப்பு' }),
    income_adequacy: Object.freeze({ en: 'Making Ends Meet',             ms: 'Mencukupi Perbelanjaan',     zh: '收支情况',            ta: 'செலவுகளைச் சமாளித்தல்' }),
    wellbeing:       Object.freeze({ en: 'Mood & Wellbeing',             ms: 'Mood & Kesejahteraan',       zh: '情绪与身心健康',      ta: 'மனநிலை & நல்வாழ்வு' }),
    falls:           Object.freeze({ en: 'Falls & Function (60+)',       ms: 'Jatuh & Keupayaan (60+)',    zh: '跌倒与活动能力 (60+)', ta: 'விழுதல் & செயல்பாடு (60+)' }),
    ethnicity:       Object.freeze({ en: 'Cultural Background',          ms: 'Latar Belakang Budaya',      zh: '文化背景',            ta: 'கலாச்சாரப் பின்னணி' }),
    housing_type:    Object.freeze({ en: 'Housing Environment',          ms: 'Persekitaran Perumahan',     zh: '居住环境',            ta: 'வீட்டுச் சூழல்' }),
    postal_code:     Object.freeze({ en: 'Resource Mapping',             ms: 'Pemetaan Sumber',            zh: '资源定位',            ta: 'வள வரைபடம்' }),
    healthier_sg:    Object.freeze({ en: 'Healthier SG',                 ms: 'Healthier SG',               zh: 'Healthier SG',        ta: 'Healthier SG' }),
    grip_kg:         Object.freeze({ en: 'Grip Strength',                ms: 'Kekuatan Genggaman',         zh: '握力',                ta: 'பிடி வலிமை' }),
    sit_to_stand:    Object.freeze({ en: 'Standing Up From a Chair',     ms: 'Bangun Dari Kerusi',         zh: '从椅子上站起',        ta: 'நாற்காலியிலிருந்து எழுதல்' }),
    measure_setting: Object.freeze({ en: 'Where It Was Measured',        ms: 'Di Mana Ia Diukur',          zh: '测量地点',            ta: 'எங்கு அளக்கப்பட்டது' }),
    services_aware:  Object.freeze({ en: 'Local Services',               ms: 'Perkhidmatan Tempatan',      zh: '本地服务',            ta: 'உள்ளூர் சேவைகள்' }),
    ever_referred:   Object.freeze({ en: 'Referral History',             ms: 'Sejarah Rujukan',            zh: '转介记录',            ta: 'பரிந்துரை வரலாறு' }),
    service_rating:  Object.freeze({ en: 'Your Experience',              ms: 'Pengalaman Anda',            zh: '您的体验',            ta: 'உங்கள் அனுபவம்' }),
    care_comfort:    Object.freeze({ en: 'Comfort With Care',            ms: 'Keselesaan Dengan Penjagaan', zh: '照护舒适度',         ta: 'பராமரிப்பில் வசதி' }),
    one_change:      Object.freeze({ en: 'One Thing To Change',          ms: 'Satu Perkara Untuk Diubah',  zh: '想改变的一件事',      ta: 'மாற்ற வேண்டிய ஒன்று' }),
    previous_id:     Object.freeze({ en: 'NEXUS Record Linkage',         ms: 'Pautan Rekod NEXUS',         zh: 'NEXUS 记录关联',      ta: 'NEXUS பதிவு இணைப்பு' }),
});

/**
 * The badge for one step in one language: the emoji from `DOMAIN_CONFIG`, then
 * the words from the table above. Falls back to the English literal whenever a
 * language or a step is missing, so a gap shows as English rather than as
 * nothing, and the test is what stops a gap reaching a resident.
 *
 * @param {{ key: string, badge: string }} step   an entry of `DOMAIN_CONFIG`
 * @param {string} lang                           'en' | 'ms' | 'zh' | 'ta'
 */
export const badgeFor = (step, lang) => {
    if (!step) return '';
    const literal = String(step.badge || '');
    const words = BADGE_COPY[step.key]?.[lang];
    if (!words || lang === 'en') return literal;
    // The emoji is the first space-separated token; the English words follow it.
    const space = literal.indexOf(' ');
    const emoji = space === -1 ? '' : literal.slice(0, space + 1);
    return emoji + words;
};
