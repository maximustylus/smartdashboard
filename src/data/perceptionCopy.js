/**
 * ==============================================================================
 * THE SIX QUESTIONS THE FORM ASKED AND THE CHAT DID NOT
 * ==============================================================================
 *
 * `/individuals/*` has two front doors onto one screening. The conventional form
 * has always asked six questions AURA never did: income adequacy, and a block of
 * five about how community health care is experienced. So the two pathways
 * collected different data about the same population, and one of the six changed
 * a resident's actual result.
 *
 * ⚠️ INCOME ADEQUACY IS NOT LIKE THE OTHER FIVE. It feeds `sdohFinancial`, which
 *    routes resources. A resident who said their income was inadequate was
 *    flagged for financial strain through the form and NOT through the chat. The
 *    other five feed nothing: they are stored as a `perception` block for
 *    programme planning, and `DOMAIN_CONFIG` puts them last for that reason.
 *
 * WHY THIS FILE RATHER THAN FOUR HAND-WRITTEN COPIES, which is how the original
 * thirteen questions were authored: every translation defect this portal has had
 * has the same shape. A chip left out of Tamil, a connector written in English,
 * a branch that exists in one language and not the other three. `isStepAvailable`
 * SKIPS a step with no prompt in the active language rather than falling back, so
 * a question missing from one dictionary is simply never asked to the people who
 * cannot read English, and nothing reports it. Generating all four from one table
 * means a language cannot be short by construction. Same argument, and the same
 * arrangement, as `measuresCopy.js`.
 *
 * ⚠️ THE ENGLISH IS THE FORM'S OWN WORDING, not new copy. These questions have
 *    been live on the form since it shipped and the two pathways must ask the
 *    same thing, so the strings are lifted from `ConventionalForm.jsx` and
 *    adjusted only where a spoken question differs from a form label.
 *
 * ⚠️ THE ms/zh/ta WORDING IS MACHINE TRANSLATED AND UNVERIFIED, like the rest of
 *    this portal's non-English copy. Where the form already had a translation for
 *    a question it is reused verbatim rather than re-translated, which is most of
 *    this file. Tracked with the other translation debt as `CD13`. None of these
 *    six is safety-critical: no prohibition, no instruction about exertion, and
 *    nothing a resident could come to harm by misreading. They are therefore NOT
 *    registered in `copyReview.js` and do not gate the build.
 */

/**
 * Stored answers are the CHIP TEXT, so the four languages produce four different
 * values for the same answer. Nothing scores these five, so that is tolerable
 * where it would not be elsewhere; `income_adequacy` is the exception and is
 * matched by `matchesIncomeInadequacy` in `clinicalFlags.js`, per language, for
 * exactly the reason `CP26` exists.
 */
export const PERCEPTION_COPY = Object.freeze({
    en: Object.freeze({
        incomePrompt: 'Do you feel you have adequate income to meet your monthly expenses?',
        incomeChips: Object.freeze(['More than adequate', 'Adequate, just enough', 'Not adequate']),
        incomeAck: 'Thank you for telling me.',

        awarePrompt: 'Have you heard about the health and wellness services available in your neighbourhood? (e.g. Active Health Labs, Start2Move, Active Ageing Centres)',
        awareChips: Object.freeze(['Yes, I have heard of them', 'No, this is new to me']),
        awareAck: 'Noted.',

        referredPrompt: 'Has a doctor or another health professional ever referred you to a community health programme or an Active Health Lab?',
        referredChips: Object.freeze(['Yes, I was referred', 'No, never']),
        referredAck: 'Got it.',

        ratingPrompt: 'If you have used community health services, how was your experience compared to a hospital?',
        ratingChips: Object.freeze(['Better than hospital', 'About the same', 'Needs improvement', 'Not applicable, have not used community services']),
        ratingAck: 'Thank you, that is useful to know.',

        comfortPrompt: 'How comfortable and safe do you feel receiving health care in the community? 1 is not at all comfortable and 5 is very comfortable.',
        comfortChips: Object.freeze(['1, not at all comfortable', '2', '3', '4', '5, very comfortable']),
        comfortAck: 'Understood.',

        changePrompt: 'If you could change one thing about health care in your neighbourhood, what would it be?',
        changeChips: Object.freeze(['Nothing comes to mind']),
    }),

    ms: Object.freeze({
        incomePrompt: 'Adakah anda rasa pendapatan anda mencukupi untuk perbelanjaan bulanan?',
        incomeChips: Object.freeze(['Lebih daripada mencukupi', 'Mencukupi, cukup-cukup sahaja', 'Tidak mencukupi']),
        incomeAck: 'Terima kasih kerana memberitahu saya. ',

        awarePrompt: 'Pernahkah anda mendengar tentang perkhidmatan kesihatan dan kesejahteraan di kejiranan anda? (cth. Active Health Lab, Start2Move, Pusat Penuaan Aktif)',
        awareChips: Object.freeze(['Ya, saya pernah dengar', 'Tidak, ini baharu bagi saya']),
        awareAck: 'Baik. ',

        referredPrompt: 'Pernahkah doktor atau profesional kesihatan lain merujuk anda ke program kesihatan komuniti atau Active Health Lab?',
        referredChips: Object.freeze(['Ya, saya pernah dirujuk', 'Tidak, tidak pernah']),
        referredAck: 'Baik. ',

        ratingPrompt: 'Jika anda pernah menggunakan perkhidmatan kesihatan komuniti, bagaimana pengalaman anda berbanding di hospital?',
        ratingChips: Object.freeze(['Lebih baik daripada hospital', 'Lebih kurang sama', 'Perlu diperbaiki', 'Tidak berkenaan, belum guna perkhidmatan komuniti']),
        ratingAck: 'Terima kasih, itu berguna untuk kami. ',

        comfortPrompt: 'Sejauh mana anda berasa selesa dan selamat menerima penjagaan kesihatan dalam komuniti? 1 bermaksud tidak selesa langsung dan 5 bermaksud sangat selesa.',
        comfortChips: Object.freeze(['1, tidak selesa langsung', '2', '3', '4', '5, sangat selesa']),
        comfortAck: 'Difahami. ',

        changePrompt: 'Jika anda boleh mengubah satu perkara tentang penjagaan kesihatan di kejiranan anda, apakah itu?',
        changeChips: Object.freeze(['Tiada yang terlintas']),
    }),

    zh: Object.freeze({
        incomePrompt: '您觉得您的收入足以应付每月开销吗？',
        incomeChips: Object.freeze(['绰绰有余', '足够，刚刚好', '不足']),
        incomeAck: '谢谢您告诉我。',

        awarePrompt: '您听说过您社区里的健康与保健服务吗？（例如 Active Health Lab、Start2Move、活跃乐龄中心）',
        awareChips: Object.freeze(['听说过', '没有，我没听说过']),
        awareAck: '好的。',

        referredPrompt: '医生或其他医疗专业人员曾经转介您到社区健康计划或 Active Health Lab 吗？',
        referredChips: Object.freeze(['有，我被转介过', '没有，从来没有']),
        referredAck: '明白了。',

        ratingPrompt: '如果您使用过社区健康服务，与医院相比，您的体验如何？',
        ratingChips: Object.freeze(['比医院好', '差不多', '需要改进', '不适用，未使用过社区服务']),
        ratingAck: '谢谢，这对我们很有用。',

        comfortPrompt: '您在社区接受医疗照护时，觉得舒适和安心吗？1 表示完全不舒适，5 表示非常舒适。',
        comfortChips: Object.freeze(['1，完全不舒适', '2', '3', '4', '5，非常舒适']),
        comfortAck: '了解。',

        changePrompt: '如果您能改变社区医疗的一件事，那会是什么？',
        changeChips: Object.freeze(['暂时想不到']),
    }),

    ta: Object.freeze({
        incomePrompt: 'உங்கள் மாதச் செலவுகளைச் சமாளிக்க உங்கள் வருமானம் போதுமானது என நினைக்கிறீர்களா?',
        incomeChips: Object.freeze(['மிகவும் போதுமானது', 'போதுமானது, சரியாக இருக்கிறது', 'போதாது']),
        incomeAck: 'சொன்னதற்கு நன்றி. ',

        awarePrompt: 'உங்கள் அக்கம்பக்கத்தில் உள்ள சுகாதார மற்றும் நல்வாழ்வு சேவைகளைப் பற்றி கேள்விப்பட்டிருக்கிறீர்களா? (எ.கா. Active Health Lab, Start2Move, Active Ageing மையங்கள்)',
        awareChips: Object.freeze(['ஆம், கேள்விப்பட்டிருக்கிறேன்', 'இல்லை, இது எனக்குப் புதியது']),
        awareAck: 'சரி. ',

        referredPrompt: 'மருத்துவர் அல்லது வேறு சுகாதார நிபுணர் உங்களை சமூக சுகாதாரத் திட்டத்திற்கோ Active Health Lab-க்கோ பரிந்துரைத்ததுண்டா?',
        referredChips: Object.freeze(['ஆம், பரிந்துரைக்கப்பட்டேன்', 'இல்லை, ஒருபோதும் இல்லை']),
        referredAck: 'புரிந்தது. ',

        ratingPrompt: 'சமூக சுகாதார சேவைகளைப் பயன்படுத்தியிருந்தால், மருத்துவமனையுடன் ஒப்பிடும்போது உங்கள் அனுபவம் எப்படி இருந்தது?',
        ratingChips: Object.freeze(['மருத்துவமனையை விட சிறந்தது', 'சுமார் அதே', 'மேம்பாடு தேவை', 'பொருந்தாது, சமூக சேவைகளை பயன்படுத்தவில்லை']),
        ratingAck: 'நன்றி, இது எங்களுக்கு பயனுள்ளது. ',

        comfortPrompt: 'சமூகத்தில் சுகாதாரப் பராமரிப்பு பெறும்போது நீங்கள் எந்த அளவுக்கு வசதியாகவும் பாதுகாப்பாகவும் உணர்கிறீர்கள்? 1 என்றால் முற்றிலும் வசதியாக இல்லை, 5 என்றால் மிகவும் வசதியாக உள்ளது.',
        comfortChips: Object.freeze(['1, முற்றிலும் வசதியாக இல்லை', '2', '3', '4', '5, மிகவும் வசதியானது']),
        comfortAck: 'புரிந்தது. ',

        changePrompt: 'உங்கள் அக்கம்பக்கத்தில் சுகாதார சேவையில் ஒரு விஷயத்தை மாற்ற முடிந்தால், அது என்னவாக இருக்கும்?',
        changeChips: Object.freeze(['எதுவும் நினைவுக்கு வரவில்லை']),
    }),
});

export default PERCEPTION_COPY;
