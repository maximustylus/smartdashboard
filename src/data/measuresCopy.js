/**
 * ==============================================================================
 * FUNCTIONAL MEASURES COPY — what a resident reads about grip and chair stands
 * ==============================================================================
 *
 * Kept out of `communityChatCopy.js` on purpose. That module is fifteen questions
 * held together by array position, and adding a sixteenth block of four-language
 * copy to it would make the positional coupling worse at exactly the moment `P9`
 * is trying to undo it. Nothing here is positional: every string is addressed by
 * name, and the band ids are the ones `functionalMeasures.js` actually returns.
 *
 * ------------------------------------------------------------------------------
 * ⚠️ THE FIVE STORED GRIP BANDS ARE NOT THE THREE A RESIDENT READS
 * ------------------------------------------------------------------------------
 *
 * `gripStrengthResult` returns a quintile: low, somewhat-low, moderate,
 * somewhat-high, high. That is what gets STORED, because it is what the source
 * publishes and throwing it away would make the data useless for anything later.
 *
 * It is not what gets SHOWN. Five ranked levels invite a resident to read their
 * strength as a grade, and "somewhat low" is a sentence about a person rather
 * than a measurement. `RESIDENT_GRIP_BAND` collapses them to three, cut at the
 * 20th and 80th centiles, which is the same shape as the one-minute test's own
 * typical range (its published interquartile band) so the two measures do not
 * contradict each other on the same page.
 *
 * The thirty-second chair stand has TWO levels, not three, because STEADI
 * publishes a single below-average cut-off and nothing above it. Inventing a
 * third would be inventing a finding. `measuresCopy.test.js` asserts every band
 * id each function can return has copy here, so a band added to the logic fails
 * the build rather than rendering blank.
 *
 * ------------------------------------------------------------------------------
 * ⚠️ THREE OF THESE STRINGS ARE SAFETY-CRITICAL AND `copyReview.js` GATES THEM
 * ------------------------------------------------------------------------------
 *
 * `doNotSelfTest`, `noComparison` and `notADiagnosis` are prohibitions. Their job
 * is to STOP somebody: from attempting a timed chair stand alone at 78, from
 * reading a comparison we never made, from treating a number as a diagnosis.
 *
 * A prohibition survives translation badly. "Do not try this on your own" comes
 * back as a suggestion and still reads perfectly well, so a reviewer skimming for
 * accuracy passes it. The owner's standing rule in `COMMUNITY_TODO.md` is that
 * this category is not machine-translated alone, and `copyReview.test.js` enforces
 * it: the moment a resident-facing component imports this module, those three need
 * a named reviewer in Malay, Chinese and Tamil or the build fails.
 *
 * That is deliberate. It goes red when the UI lands, which is when a reviewer is
 * needed, and not before, when it would block work to protect nobody.
 */

/** The two grip cuts a resident sees, at the 20th and 80th centile. */
export const RESIDENT_GRIP_BAND = Object.freeze({
    low: 'below',
    'somewhat-low': 'usual',
    moderate: 'usual',
    'somewhat-high': 'usual',
    high: 'above',
});

/** Resident-facing band ids per measurement, which is what `bands` is keyed by. */
export const RESIDENT_BAND_IDS = Object.freeze({
    grip: Object.freeze(['below', 'usual', 'above']),
    'sts-60s': Object.freeze(['below-typical', 'typical', 'above-typical']),
    'sts-30s': Object.freeze(['below-average', 'at-or-above-average']),
});

/**
 * The band a resident reads, from a result object. Returns `null` for an
 * unsuccessful result, which is the caller's signal to show a `reasons` string
 * instead of a band. Never throws.
 */
export const residentBand = (result) => {
    if (!result || result.ok !== true || !result.band) return null;
    if (result.protocol) return result.band;
    return RESIDENT_GRIP_BAND[result.band] || null;
};

export const MEASURES_COPY = {
    en: {
        title: 'Strength measurements',
        intro: 'If someone has measured your strength recently, you can add it here. If not, you can skip this and your result will not change.',
        optional: 'This part is optional.',

        // ⚠️ SAFETY-CRITICAL. See the header. Registered in `copyReview.js`.
        doNotSelfTest: 'Please do not try either test on your own now. These are measured with someone there to help.',
        noComparison: 'We have kept your number so you can show it to your doctor. We do not have a published range that covers your age, so we are not going to guess one.',
        notADiagnosis: 'These numbers describe your strength today. They are not a diagnosis, and they have not changed your result above.',

        reportHeading: 'Your strength measurements',
        reportIntro: 'What you entered, and where each number sits against published ranges for your age.',
        measuredAt: 'Measured at',
        comparedAgainst: 'Compared against',
        populations: {
            international: 'an international reference population',
            swiss: 'a Swiss reference population',
            'united-states': 'a United States reference population',
        },

        gripPrompt: 'Has anyone measured your grip strength with a hand grip meter? If yes, enter the number in kilograms.',
        gripUnit: 'kilograms (kg)',
        gripLabel: 'Grip strength',
        stsPrompt: {
            'sts-60s': 'Has anyone timed you standing up from a chair for one minute? If yes, enter how many times you stood up in that minute.',
            'sts-30s': 'Has anyone timed you standing up from a chair for thirty seconds? If yes, enter how many times you stood up in those thirty seconds.',
        },
        stsUnit: 'times',
        stsLabel: {
            'sts-60s': 'Standing up from a chair, one minute',
            'sts-30s': 'Standing up from a chair, thirty seconds',
        },
        stsUnsure: 'I am not sure how long it was timed for',
        settingPrompt: 'Where was this measured?',
        skip: 'I have not had these measured',
        whereToGetMeasured: 'These places measure it',

        bands: {
            below: 'Below the usual range for your age',
            usual: 'In the usual range for your age',
            above: 'Above the usual range for your age',
            'below-typical': 'Below the usual range for your age',
            typical: 'In the usual range for your age',
            'above-typical': 'Above the usual range for your age',
            'below-average': 'Below the usual range for your age',
            'at-or-above-average': 'At or above the usual range for your age',
        },
        advice: {
            below: 'Strength can be built at any age. Two strength sessions a week is the usual advice, and the services below can show you how to start safely.',
            usual: 'Keeping this where it is matters more than adding to it. Two strength sessions a week is what holds it steady.',
            above: 'This is a good position to hold. Two strength sessions a week is what keeps it there.',
        },

        reasons: {
            missing: 'You have not entered a number yet.',
            'out-of-range': 'That number looks outside what this test can record. Please check it and enter it again.',
            'age-unknown': 'We need your age before we can compare this number.',
            'no-reference-for-age': 'We have kept your number so you can show it to your doctor. We do not have a published range that covers your age, so we are not going to guess one.',
            'no-reference-for-sex': 'Published ranges are separate for men and for women. Without knowing which to use, we are not going to guess.',
            'protocol-unknown': 'We have kept your number, but we do not know which test it came from, so we are not going to compare it.',
            'protocol-age-mismatch': 'We have kept your number. It looks like it came from a different version of this test than the one we compare at your age, so a comparison could tell you something wrong. Please show it to whoever measured you.',
            'reference-unavailable': 'We have kept your number, but the published range for this test is not loaded yet, so we are not going to compare it.',
            'protocol-not-known-by-resident': 'We have kept your number. Because we do not know whether the stopwatch ran for thirty seconds or a minute, we are not going to compare it. The two are very different.',
        },
        implausible: 'That count is unusually high for this test. Please check the number before you rely on it.',

        settings: {
            'community-event': 'At a community event',
            'active-ageing-centre': 'At an active ageing centre',
            'health-screening': 'At a health screening',
            'gp-or-polyclinic': 'At a GP clinic or polyclinic',
            'sport-exercise-medicine': 'At a Sport and Exercise Medicine centre',
            'gym-or-fitness': 'At a gym or fitness centre',
            other: 'Somewhere else',
            unsure: 'I am not sure',
        },
    },

    ms: {
        title: 'Ukuran kekuatan',
        intro: 'Jika seseorang telah mengukur kekuatan anda baru-baru ini, anda boleh tambah di sini. Jika tidak, anda boleh langkau bahagian ini dan keputusan anda tidak akan berubah.',
        optional: 'Bahagian ini adalah pilihan.',

        doNotSelfTest: 'Sila jangan cuba mana-mana ujian ini sendiri sekarang. Ujian ini diukur dengan ada orang di sisi untuk membantu.',
        noComparison: 'Kami telah simpan nombor anda supaya anda boleh tunjukkan kepada doktor anda. Kami tiada julat terbitan yang meliputi umur anda, jadi kami tidak akan meneka.',
        notADiagnosis: 'Nombor ini menerangkan kekuatan anda hari ini. Ia bukan diagnosis, dan ia tidak mengubah keputusan anda di atas.',

        reportHeading: 'Ukuran kekuatan anda',
        reportIntro: 'Apa yang anda masukkan, dan di mana setiap nombor berada berbanding julat terbitan bagi umur anda.',
        measuredAt: 'Diukur di',
        comparedAgainst: 'Dibandingkan dengan',
        populations: {
            international: 'populasi rujukan antarabangsa',
            swiss: 'populasi rujukan Switzerland',
            'united-states': 'populasi rujukan Amerika Syarikat',
        },

        gripPrompt: 'Adakah sesiapa pernah mengukur kekuatan genggaman anda dengan alat pengukur genggaman? Jika ya, masukkan nombor itu dalam kilogram.',
        gripUnit: 'kilogram (kg)',
        gripLabel: 'Kekuatan genggaman',
        stsPrompt: {
            'sts-60s': 'Adakah sesiapa pernah mengira anda bangun dari kerusi selama satu minit? Jika ya, masukkan berapa kali anda bangun dalam satu minit itu.',
            'sts-30s': 'Adakah sesiapa pernah mengira anda bangun dari kerusi selama tiga puluh saat? Jika ya, masukkan berapa kali anda bangun dalam tiga puluh saat itu.',
        },
        stsUnit: 'kali',
        stsLabel: {
            'sts-60s': 'Bangun dari kerusi, satu minit',
            'sts-30s': 'Bangun dari kerusi, tiga puluh saat',
        },
        stsUnsure: 'Saya tidak pasti berapa lama masa yang dikira',
        settingPrompt: 'Di mana ukuran ini diambil?',
        skip: 'Saya belum pernah membuat ukuran ini',
        whereToGetMeasured: 'Tempat-tempat ini mengukurnya',

        bands: {
            below: 'Di bawah julat biasa bagi umur anda',
            usual: 'Dalam julat biasa bagi umur anda',
            above: 'Melebihi julat biasa bagi umur anda',
            'below-typical': 'Di bawah julat biasa bagi umur anda',
            typical: 'Dalam julat biasa bagi umur anda',
            'above-typical': 'Melebihi julat biasa bagi umur anda',
            'below-average': 'Di bawah julat biasa bagi umur anda',
            'at-or-above-average': 'Pada atau melebihi julat biasa bagi umur anda',
        },
        advice: {
            below: 'Kekuatan boleh dibina pada mana-mana umur. Dua sesi latihan kekuatan seminggu adalah nasihat biasa, dan perkhidmatan di bawah boleh tunjukkan cara bermula dengan selamat.',
            usual: 'Mengekalkannya di tahap ini lebih penting daripada menambahnya. Dua sesi latihan kekuatan seminggu yang mengekalkannya stabil.',
            above: 'Ini kedudukan yang baik untuk dikekalkan. Dua sesi latihan kekuatan seminggu yang mengekalkannya di situ.',
        },

        reasons: {
            missing: 'Anda belum memasukkan sebarang nombor.',
            'out-of-range': 'Nombor itu nampak di luar apa yang ujian ini boleh rekodkan. Sila semak dan masukkan semula.',
            'age-unknown': 'Kami perlukan umur anda sebelum kami boleh bandingkan nombor ini.',
            'no-reference-for-age': 'Kami telah simpan nombor anda supaya anda boleh tunjukkan kepada doktor anda. Kami tiada julat terbitan yang meliputi umur anda, jadi kami tidak akan meneka.',
            'no-reference-for-sex': 'Julat terbitan adalah berasingan bagi lelaki dan wanita. Tanpa mengetahui yang mana satu perlu digunakan, kami tidak akan meneka.',
            'protocol-unknown': 'Kami telah simpan nombor anda, tetapi kami tidak tahu ujian mana ia datang, jadi kami tidak akan membandingkannya.',
            'protocol-age-mismatch': 'Kami telah simpan nombor anda. Ia nampak datang daripada versi ujian yang berbeza daripada versi yang kami bandingkan pada umur anda, jadi perbandingan boleh memberitahu anda sesuatu yang salah. Sila tunjukkan kepada sesiapa yang mengukur anda.',
            'reference-unavailable': 'Kami telah simpan nombor anda, tetapi julat terbitan bagi ujian ini belum dimuatkan, jadi kami tidak akan membandingkannya.',
            'protocol-not-known-by-resident': 'Kami telah simpan nombor anda. Kerana kami tidak tahu sama ada jam randik berjalan selama tiga puluh saat atau satu minit, kami tidak akan membandingkannya. Kedua-duanya sangat berbeza.',
        },
        implausible: 'Jumlah itu luar biasa tinggi bagi ujian ini. Sila semak nombor itu sebelum anda bergantung padanya.',

        settings: {
            'community-event': 'Di acara komuniti',
            'active-ageing-centre': 'Di pusat penjagaan warga emas aktif',
            'health-screening': 'Di pemeriksaan kesihatan',
            'gp-or-polyclinic': 'Di klinik GP atau poliklinik',
            'sport-exercise-medicine': 'Di pusat Perubatan Sukan dan Senaman',
            'gym-or-fitness': 'Di gim atau pusat kecergasan',
            other: 'Di tempat lain',
            unsure: 'Saya tidak pasti',
        },
    },

    zh: {
        title: '力量测量',
        intro: '如果最近有人为您测量过力量，您可以在这里填写。如果没有，可以跳过这一部分，您的结果不会改变。',
        optional: '这一部分是选填的。',

        doNotSelfTest: '请不要现在自己尝试这两项测试。这些测试要在有人在旁协助的情况下才进行测量。',
        noComparison: '我们保存了您的数字，方便您给医生看。我们没有涵盖您年龄的已发表范围，所以我们不会去猜测。',
        notADiagnosis: '这些数字描述的是您今天的力量。它们不是诊断，也没有改变您上面的结果。',

        reportHeading: '您的力量测量结果',
        reportIntro: '您填写的数字，以及每个数字在您这个年龄的已发表范围中的位置。',
        measuredAt: '测量地点',
        comparedAgainst: '对照范围',
        populations: {
            international: '国际参照人群',
            swiss: '瑞士参照人群',
            'united-states': '美国参照人群',
        },

        gripPrompt: '有人用握力器为您测量过握力吗？如果有，请输入以公斤为单位的数字。',
        gripUnit: '公斤 (kg)',
        gripLabel: '握力',
        stsPrompt: {
            'sts-60s': '有人为您计时，看您一分钟内能从椅子上站起来多少次吗？如果有，请输入您在那一分钟内站起来的次数。',
            'sts-30s': '有人为您计时，看您三十秒内能从椅子上站起来多少次吗？如果有，请输入您在那三十秒内站起来的次数。',
        },
        stsUnit: '次',
        stsLabel: {
            'sts-60s': '从椅子上站起来，一分钟',
            'sts-30s': '从椅子上站起来，三十秒',
        },
        stsUnsure: '我不确定计时了多久',
        settingPrompt: '这是在哪里测量的？',
        skip: '我没有做过这些测量',
        whereToGetMeasured: '这些地方可以测量',

        bands: {
            below: '低于您这个年龄的常见范围',
            usual: '在您这个年龄的常见范围内',
            above: '高于您这个年龄的常见范围',
            'below-typical': '低于您这个年龄的常见范围',
            typical: '在您这个年龄的常见范围内',
            'above-typical': '高于您这个年龄的常见范围',
            'below-average': '低于您这个年龄的常见范围',
            'at-or-above-average': '达到或高于您这个年龄的常见范围',
        },
        advice: {
            below: '任何年龄都可以增强力量。一般的建议是每周做两次力量训练，下面的服务可以告诉您如何安全地开始。',
            usual: '保持现在的水平比增加更重要。每周两次力量训练就能让它保持稳定。',
            above: '这是一个值得保持的好状态。每周两次力量训练就能维持在这个水平。',
        },

        reasons: {
            missing: '您还没有输入数字。',
            'out-of-range': '这个数字看起来超出了这项测试能记录的范围。请检查后重新输入。',
            'age-unknown': '我们需要知道您的年龄，才能比较这个数字。',
            'no-reference-for-age': '我们保存了您的数字，方便您给医生看。我们没有涵盖您年龄的已发表范围，所以我们不会去猜测。',
            'no-reference-for-sex': '已发表的范围对男性和女性是分开的。在不知道该用哪一个的情况下，我们不会去猜测。',
            'protocol-unknown': '我们保存了您的数字，但我们不知道它来自哪一项测试，所以我们不会进行比较。',
            'protocol-age-mismatch': '我们保存了您的数字。它看起来来自与我们在您这个年龄所比较的版本不同的测试版本，因此比较可能会给您错误的信息。请把它拿给为您测量的人看。',
            'reference-unavailable': '我们保存了您的数字，但这项测试的已发表范围尚未载入，所以我们不会进行比较。',
            'protocol-not-known-by-resident': '我们保存了您的数字。因为我们不知道秒表是计时三十秒还是一分钟，所以我们不会进行比较。两者差别很大。',
        },
        implausible: '这个次数对这项测试来说异常高。在依据它之前，请先核对这个数字。',

        settings: {
            'community-event': '在社区活动上',
            'active-ageing-centre': '在乐龄活动中心',
            'health-screening': '在健康检查时',
            'gp-or-polyclinic': '在家庭诊所或综合诊疗所',
            'sport-exercise-medicine': '在运动与运动医学中心',
            'gym-or-fitness': '在健身房或健身中心',
            other: '在其他地方',
            unsure: '我不确定',
        },
    },

    ta: {
        title: 'வலிமை அளவீடுகள்',
        intro: 'சமீபத்தில் யாராவது உங்கள் வலிமையை அளந்திருந்தால், அதை இங்கே சேர்க்கலாம். இல்லையென்றால், இந்தப் பகுதியைத் தவிர்க்கலாம், உங்கள் முடிவு மாறாது.',
        optional: 'இந்தப் பகுதி விருப்பத்தேர்வு.',

        doNotSelfTest: 'இந்த இரண்டு சோதனைகளையும் இப்போது நீங்களே தனியாக முயற்சிக்க வேண்டாம். உதவிக்கு ஒருவர் உடன் இருக்கும்போது மட்டுமே இவை அளக்கப்படுகின்றன.',
        noComparison: 'உங்கள் மருத்துவரிடம் காட்டுவதற்காக உங்கள் எண்ணை நாங்கள் வைத்துள்ளோம். உங்கள் வயதை உள்ளடக்கிய வெளியிடப்பட்ட வரம்பு எங்களிடம் இல்லை, எனவே நாங்கள் ஊகிக்கப் போவதில்லை.',
        notADiagnosis: 'இந்த எண்கள் இன்றைய உங்கள் வலிமையை விவரிக்கின்றன. இவை நோய் கண்டறிதல் அல்ல, மேலே உள்ள உங்கள் முடிவை இவை மாற்றவும் இல்லை.',

        reportHeading: 'உங்கள் வலிமை அளவீடுகள்',
        reportIntro: 'நீங்கள் பதிவு செய்தவை, மற்றும் உங்கள் வயதுக்கான வெளியிடப்பட்ட வரம்புகளுடன் ஒப்பிடும்போது ஒவ்வொரு எண்ணும் எங்கு இருக்கிறது என்பது.',
        measuredAt: 'அளக்கப்பட்ட இடம்',
        comparedAgainst: 'ஒப்பிடப்பட்ட வரம்பு',
        populations: {
            international: 'சர்வதேச ஒப்பீட்டு மக்கள்தொகை',
            swiss: 'சுவிட்சர்லாந்து ஒப்பீட்டு மக்கள்தொகை',
            'united-states': 'அமெரிக்க ஒப்பீட்டு மக்கள்தொகை',
        },

        gripPrompt: 'கைப்பிடி வலிமை அளவியைக் கொண்டு யாராவது உங்கள் கைப்பிடி வலிமையை அளந்துள்ளார்களா? ஆம் எனில், கிலோகிராமில் அந்த எண்ணைப் பதிவு செய்யுங்கள்.',
        gripUnit: 'கிலோகிராம் (kg)',
        gripLabel: 'கைப்பிடி வலிமை',
        stsPrompt: {
            'sts-60s': 'ஒரு நிமிடத்தில் நாற்காலியிலிருந்து நீங்கள் எத்தனை முறை எழுந்து நிற்கிறீர்கள் என்று யாராவது நேரம் பார்த்து அளந்துள்ளார்களா? ஆம் எனில், அந்த ஒரு நிமிடத்தில் நீங்கள் எத்தனை முறை எழுந்தீர்கள் என்று பதிவு செய்யுங்கள்.',
            'sts-30s': 'முப்பது வினாடிகளில் நாற்காலியிலிருந்து நீங்கள் எத்தனை முறை எழுந்து நிற்கிறீர்கள் என்று யாராவது நேரம் பார்த்து அளந்துள்ளார்களா? ஆம் எனில், அந்த முப்பது வினாடிகளில் நீங்கள் எத்தனை முறை எழுந்தீர்கள் என்று பதிவு செய்யுங்கள்.',
        },
        stsUnit: 'முறை',
        stsLabel: {
            'sts-60s': 'நாற்காலியிலிருந்து எழுந்து நிற்றல், ஒரு நிமிடம்',
            'sts-30s': 'நாற்காலியிலிருந்து எழுந்து நிற்றல், முப்பது வினாடிகள்',
        },
        stsUnsure: 'எவ்வளவு நேரம் அளக்கப்பட்டது என்று எனக்குத் தெரியவில்லை',
        settingPrompt: 'இது எங்கே அளக்கப்பட்டது?',
        skip: 'இந்த அளவீடுகளை நான் எடுத்ததில்லை',
        whereToGetMeasured: 'இந்த இடங்களில் இதை அளக்கிறார்கள்',

        bands: {
            below: 'உங்கள் வயதுக்கான வழக்கமான வரம்பை விடக் குறைவு',
            usual: 'உங்கள் வயதுக்கான வழக்கமான வரம்பிற்குள்',
            above: 'உங்கள் வயதுக்கான வழக்கமான வரம்பை விட அதிகம்',
            'below-typical': 'உங்கள் வயதுக்கான வழக்கமான வரம்பை விடக் குறைவு',
            typical: 'உங்கள் வயதுக்கான வழக்கமான வரம்பிற்குள்',
            'above-typical': 'உங்கள் வயதுக்கான வழக்கமான வரம்பை விட அதிகம்',
            'below-average': 'உங்கள் வயதுக்கான வழக்கமான வரம்பை விடக் குறைவு',
            'at-or-above-average': 'உங்கள் வயதுக்கான வழக்கமான வரம்பிலோ அதற்கு மேலோ',
        },
        advice: {
            below: 'எந்த வயதிலும் வலிமையை வளர்க்க முடியும். வாரத்திற்கு இரண்டு வலிமைப் பயிற்சிகள் என்பதே வழக்கமான அறிவுரை, கீழே உள்ள சேவைகள் பாதுகாப்பாக எப்படித் தொடங்குவது என்று காட்டும்.',
            usual: 'இதை இப்போதுள்ள நிலையில் வைத்திருப்பது கூட்டுவதை விட முக்கியம். வாரத்திற்கு இரண்டு வலிமைப் பயிற்சிகளே அதை நிலையாக வைத்திருக்கும்.',
            above: 'இது தக்கவைக்க வேண்டிய நல்ல நிலை. வாரத்திற்கு இரண்டு வலிமைப் பயிற்சிகளே அதை அங்கேயே வைத்திருக்கும்.',
        },

        reasons: {
            missing: 'நீங்கள் இன்னும் எந்த எண்ணையும் பதிவு செய்யவில்லை.',
            'out-of-range': 'இந்தச் சோதனை பதிவு செய்யக்கூடிய அளவுக்கு வெளியே இந்த எண் இருப்பதாகத் தெரிகிறது. சரிபார்த்து மீண்டும் பதிவு செய்யுங்கள்.',
            'age-unknown': 'இந்த எண்ணை ஒப்பிடுவதற்கு முன் உங்கள் வயது எங்களுக்குத் தேவை.',
            'no-reference-for-age': 'உங்கள் மருத்துவரிடம் காட்டுவதற்காக உங்கள் எண்ணை நாங்கள் வைத்துள்ளோம். உங்கள் வயதை உள்ளடக்கிய வெளியிடப்பட்ட வரம்பு எங்களிடம் இல்லை, எனவே நாங்கள் ஊகிக்கப் போவதில்லை.',
            'no-reference-for-sex': 'வெளியிடப்பட்ட வரம்புகள் ஆண்களுக்கும் பெண்களுக்கும் தனித்தனியானவை. எதைப் பயன்படுத்த வேண்டும் என்று தெரியாமல் நாங்கள் ஊகிக்கப் போவதில்லை.',
            'protocol-unknown': 'உங்கள் எண்ணை நாங்கள் வைத்துள்ளோம், ஆனால் அது எந்தச் சோதனையிலிருந்து வந்தது என்று தெரியாததால் நாங்கள் அதை ஒப்பிடப் போவதில்லை.',
            'protocol-age-mismatch': 'உங்கள் எண்ணை நாங்கள் வைத்துள்ளோம். உங்கள் வயதில் நாங்கள் ஒப்பிடும் வடிவத்திலிருந்து வேறுபட்ட ஒரு சோதனை வடிவத்திலிருந்து இது வந்ததாகத் தெரிகிறது, எனவே ஒப்பிடுவது உங்களுக்குத் தவறான தகவலைத் தரக்கூடும். உங்களை அளந்தவரிடம் இதைக் காட்டுங்கள்.',
            'reference-unavailable': 'உங்கள் எண்ணை நாங்கள் வைத்துள்ளோம், ஆனால் இந்தச் சோதனைக்கான வெளியிடப்பட்ட வரம்பு இன்னும் ஏற்றப்படவில்லை, எனவே நாங்கள் அதை ஒப்பிடப் போவதில்லை.',
            'protocol-not-known-by-resident': 'உங்கள் எண்ணை நாங்கள் வைத்துள்ளோம். நிறுத்தக் கடிகாரம் முப்பது வினாடிகள் ஓடியதா அல்லது ஒரு நிமிடம் ஓடியதா என்று தெரியாததால் நாங்கள் அதை ஒப்பிடப் போவதில்லை. இரண்டும் மிகவும் வேறுபட்டவை.',
        },
        implausible: 'இந்தச் சோதனைக்கு இந்த எண்ணிக்கை வழக்கத்திற்கு மாறாக அதிகம். இதை நம்பும் முன் எண்ணைச் சரிபாருங்கள்.',

        settings: {
            'community-event': 'சமூக நிகழ்ச்சியில்',
            'active-ageing-centre': 'செயல்மிகு முதியோர் மையத்தில்',
            'health-screening': 'சுகாதாரப் பரிசோதனையில்',
            'gp-or-polyclinic': 'GP கிளினிக் அல்லது பாலிகிளினிக்கில்',
            'sport-exercise-medicine': 'விளையாட்டு மற்றும் உடற்பயிற்சி மருத்துவ மையத்தில்',
            'gym-or-fitness': 'உடற்பயிற்சிக் கூடம் அல்லது தகுதி மையத்தில்',
            other: 'வேறு இடத்தில்',
            unsure: 'எனக்குத் தெரியவில்லை',
        },
    },
};

/** Falls back to English rather than returning `undefined` for an unknown language. */
export const measuresCopyFor = (lang) => MEASURES_COPY[lang] || MEASURES_COPY.en;

/** The three strings `copyReview.js` gates, named here so the two cannot drift. */
export const SAFETY_CRITICAL_KEYS = Object.freeze(['doNotSelfTest', 'noComparison', 'notADiagnosis']);
