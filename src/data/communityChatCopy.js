/**
 * ==============================================================================
 * COMMUNITY CHAT COPY — every word AURA says, in four languages
 * ==============================================================================
 *
 * Extracted from `AuraChat.jsx` for the same reason `communityDomains.js` was: the
 * component reaches `src/firebase.js` through `telemetry`, and that module calls
 * `getMessaging(app)` at import time, which throws outside a real browser. So none
 * of this copy could be imported, inspected or tested on its own, and the checks
 * that most needed writing could not be written at all.
 *
 * `prompts`, `reflections` and `quickReplies` are positional arrays HERE, and
 * `COPY_ORDER` at the foot of this file is what binds each position to a question
 * name. That binding used to be implicit — whatever order `DOMAIN_CONFIG` happened
 * to have — which is how `CP26` happened: inserting a step in the middle silently
 * reassigned every prompt after it, in four languages at once.
 *
 * ⚠️ THE TWO ORDERS ARE NOW SEPARATE AND MUST NOT BE CONFUSED.
 *
 *      `COPY_ORDER`     the order the arrays below were AUTHORED in.
 *      `DOMAIN_CONFIG`  the order questions are ASKED in.
 *
 *    Reordering the flow means editing `DOMAIN_CONFIG` alone and touching nothing
 *    here. Adding a question means appending to BOTH — a new entry at the end of
 *    each array and its name at the end of `COPY_ORDER` — or inserting at the same
 *    index in every array and in `COPY_ORDER` together, which is what `age_years`
 *    did at index 13. `communityChatCopy.test.js` asserts the two describe the same
 *    set of questions, so a step added to one and not the other fails the build.
 */

import { FALLS_CHIPS, HSG_CHIPS } from './screeningChips';

export const DICTIONARY = {
  en: {
    back: 'Back',
    typing: 'AURA is typing\u2026',
    inputPlaceholder: 'Type your answer or choose below\u2026',
    hintText: 'Select an option or type freely:',
    sessionLabel: 'Session',
    domainLabel: 'Screening Domain',
    ctaTitle: 'Your Personalised Health Plan',
    ctaPrimary: 'Your Next Step',
    ctaHealthierSG: 'Your Healthier SG Connection',
    ctaResources: 'Additional Resources',
    error: 'A connection error occurred while saving your profile. Please try again.',
    progressLabel: (step, total) => `Step ${step + 1} of ${total}`,
    // 13 prompts — indices match DOMAIN_CONFIG
    prompts: [
      /* 0  pavs_days       */ 'Hi, I\'m AURA 👋 I\'m here to connect you with the right community health resources. Let\'s start with physical activity. On a typical week, how many days do you do moderate or vigorous exercise? (e.g. brisk walking, cycling, swimming, gym)',
      /* 1  pavs_mins       */ (data) => data.pavs_days === '0 days'
        ? 'No problem at all — most people start exactly where you are, and that is why these programmes exist. If you were to start being active, roughly how long do you think you could manage each session?'
        : 'Great — and on those active days, roughly how many minutes do you usually exercise each time?',
      /* 2  strength        */ 'Do you do any muscle-strengthening activities? (e.g. weights, resistance bands, bodyweight exercises like push-ups or squats)',
      /* 3  medical         */ 'Do you have any ongoing health conditions — such as high blood pressure, prediabetes, or heart disease? And do you ever feel chest pain or dizziness when you are physically active?',
      /* 4  barriers        */ 'What is the main thing that makes it difficult to access health or fitness services in your community? Be honest — there are no wrong answers.',
      /* 5  social          */ 'Roughly how many people — family or friends — could you call on for support if you needed help? And would you say you have people you can talk to openly?',
      /* 6  food_insecurity */ 'One more quick question — in the past 12 months, were there times when you were hungry but did not eat because you could not afford enough food?',
      /* 7  wellbeing       */ 'Over the past two weeks, how have you been feeling overall? Have you felt stressed, low in mood, or overwhelmed — for example, due to work, caregiving, or financial pressure?',
      /* 8  demographics    */ 'Thank you. Now two quick things about you, because the advice changes with both. First, are you male or female?',
      /* 9  ethnicity       */ 'What is your ethnic group? This helps us understand the diverse communities we serve.',
      /* 10 housing_type    */ 'What type of housing do you live in? (e.g. HDB 3-Room, Condo)',
      /* 11 postal_code     */ 'What are the first two digits of your postal code? This lets me map the nearest resources to you.',
      /* 12 previous_id     */ 'Do you have a previous NEXUS Assessment ID? If yes, paste it below so I can link your records. If not, just select No.',
      /* 13 age_years      */ 'And how old are you? Please type your age in years, for example 67.',
      /* 14 falls           */ 'Two quick questions about steadiness. In the past 12 months, have you had a fall — including a slip or trip where you ended up on the ground?',
      /* 15 healthier_sg    */ 'Last one — are you enrolled with a Healthier SG GP? It changes which programmes you can be referred to.',
    ],

    reflections: [
      /* 0 */ (input) => {
        const n = parseInt((input.match(/\d+/) || ['0'])[0], 10);
        return n === 0
          ? 'Starting from zero is completely valid — many people are in the same position, and that is exactly why these programmes exist.'
          : n <= 2
          ? 'Two days or fewer is a common starting point. Small, consistent steps make a real difference.'
          : 'A solid base to build on. ';
      },
      /* 1 */ (input) => {
        const n = parseInt((input.match(/\d+/) || ['0'])[0], 10);
        return n < 20
          ? 'Short sessions still count — and they can grow over time. '
          : n >= 45
          ? 'Strong session duration. '
          : 'A healthy session length. ';
      },
      /* 2 */ () => 'Strength training is just as important as aerobic activity for long-term health. ',
      /* 3 */ () => 'Thank you for sharing that — I will use this to make sure your recommendations are safe and appropriate. ',
      /* 4 */ () => 'That is a very real barrier. Naming it helps us find the right workaround. ',
      /* 5 */ () => 'Social connection is one of the most powerful protective factors for long-term health. ',
      /* 6 */ (input) => input.toLowerCase().includes('yes') ? 'Thank you for trusting me with that \u2014 food security is something we will factor directly into your plan. ' : 'Good to know. ',
      /* 7 */ () => 'Your mental wellbeing matters as much as your physical health. ',
      /* 8 */ () => 'Noted. ',
      /* 9 */ () => 'Thank you for sharing. ',
      /* 10 */() => 'Got it. This helps us suggest nearby community spaces. ',
      /* 11 */() => 'Mapping your nearest resources now. ',
      /* 12 */(input) =>
        /(no|none|don'?t)/i.test(input)
          ? 'No problem — I will start a fresh record for you today. '
          : 'I will link your previous records to track your progress over time. ',
      /* 13 age_years */ () => 'Thank you. ',
    ],

    quickReplies: [
      /* 0 pavs_days       */ ['0 days', '1–2 days', '3–4 days', '5–7 days'],
      /* 1 pavs_mins       */ ['Less than 20 mins', '20–30 mins', '30–45 mins', '45–60 mins', '60+ mins'],
      /* 2 strength        */ ['No strength training', '1 day a week', '2 days a week', '3+ days a week'],
      /* 3 medical         */ ['No conditions or symptoms', 'High blood pressure', 'Prediabetes or diabetes', 'Heart condition', 'Dizziness or chest pain when active'],
      /* 4 barriers        */ ['Lack of time', 'Too expensive', 'Too far away', 'I prefer hospitals over community', 'Unsure what is available', 'No barriers for me'],
      /* 5 social          */ ['I have several people I can rely on', 'I have one or two close people', 'I mostly manage on my own', 'I feel quite isolated'],
      /* 6 food_insecurity */ ['Yes, this has happened', 'No, I have always had enough'],
      /*
        ⚠️ CAREGIVER STRAIN AND FINANCIAL STRAIN ARE TWO DIFFERENT REFERRALS, and
        they used to share one chip: "Overwhelmed — caregiving or financial
        pressure". A Regional Health System reviewer put it plainly — the unpaid
        family carer who has not yet identified as one is the highest-value entry
        point in social prescribing, and merging the two made that person
        invisible to the tool.

        Both halves are split from each language's OWN existing wording, on the
        connector already in the sentence ("or" / "atau" / "或" / "அல்லது"). No new
        clinical copy was translated — see `CD10`.
      */
      /* 7 wellbeing       */ ['Feeling good overall', 'Some stress but managing', 'Feeling quite stressed or low', 'Overwhelmed — caregiving', 'Overwhelmed — financial pressure'],
      /* 8 demographics    */ ['Male', 'Female'],
      /* 9 ethnicity       */ ['Chinese', 'Malay', 'Indian', 'Eurasian', 'Others', 'Prefer not to say'],
      /* 10 housing_type   */ ['HDB 1-2 Room', 'HDB 3 Room', 'HDB 4 Room', 'HDB 5 Room / Exec', 'Condo / Private', 'Landed'],
      /* 11 postal_code    */ 
      /*
        ⚠️ NO EXAMPLE DIGITS IN THESE CHIPS, AND THAT IS THE WHOLE POINT.
        This row used to read 'North (e.g. 73, 75)', 'East (e.g. 46, 52)' and so on.
        `parseClinicalData` took the first two digits it found in the answer — which
        for a TAPPED CHIP is the label — so every respondent who tapped North was
        recorded as sector 73, East as 46, West as 60. The geographic data collected
        'for population-level resource planning' was four constants, and it also chose
        which health cluster's services the person was shown.
        The question already asks for the digits. Only the 'type my own' chip remains,
        in each language's existing wording; anything unreadable is now `null`, not a
        place. See `src/utils/singapore/postalSectors.js`.
      */
      ['Other / Type my own'],
      /* 12 previous_id    */ ['No previous ID'],
      /* 13 age_years     */ null,
      /* 14 falls           */ FALLS_CHIPS.en,
      /* 15 healthier_sg    */ HSG_CHIPS.en,
    ],
  },

  ms: {
    back: 'Kembali',
    typing: 'AURA sedang menaip\u2026',
    inputPlaceholder: 'Taip jawapan anda atau pilih di bawah\u2026',
    hintText: 'Pilih pilihan atau taip sendiri:',
    sessionLabel: 'Sesi',
    domainLabel: 'Domain Saringan',
    ctaTitle: 'Pelan Kesihatan Peribadi Anda',
    ctaPrimary: 'Langkah Seterusnya',
    ctaHealthierSG: 'Sambungan Healthier SG Anda',
    ctaResources: 'Sumber Tambahan',
    error: 'Ralat sambungan berlaku. Sila cuba lagi.',
    progressLabel: (step, total) => `Langkah ${step + 1} daripada ${total}`,
    prompts: [
      'Hai, saya AURA 👋 Pada minggu biasa, berapa hari anda melakukan senaman sederhana atau kuat? (cth. berjalan pantas, berbasikal, berenang)',
      'Berapa minit biasanya anda bersenam pada setiap sesi aktif tersebut?',
      'Adakah anda melakukan aktiviti menguatkan otot? (cth. angkat berat, band rintangan, senaman berat badan)',
      'Adakah anda mempunyai sebarang penyakit kronik seperti darah tinggi, pradiabetes, atau penyakit jantung? Adakah anda pernah rasa sakit dada atau pening ketika aktif?',
      'Apakah cabaran utama anda untuk menggunakan perkhidmatan kesihatan komuniti?',
      'Lebih kurang berapa ramai orang — keluarga atau rakan — yang boleh anda hubungi jika memerlukan bantuan? Adakah anda mempunyai seseorang untuk bercerita?',
      'Satu soalan lagi — dalam 12 bulan yang lalu, pernahkah anda lapar tetapi tidak makan kerana tidak mampu membeli makanan yang cukup?',
      'Dalam dua minggu lalu, bagaimana perasaan anda secara keseluruhan? Adakah anda berasa tertekan, murung, atau terbeban?',
      'Terima kasih. Sekarang dua perkara ringkas tentang anda, kerana nasihat berubah mengikut kedua-duanya. Pertama, adakah anda lelaki atau perempuan?',
      'Apakah kumpulan etnik anda? Ini membantu kami memahami komuniti pelbagai yang kami layani.',
      'Apakah jenis perumahan yang anda diami? (cth. HDB 3-Bilik, Kondo)',
      'Apakah dua digit pertama poskod anda supaya saya boleh mencari sumber berdekatan?',
      'Soalan terakhir — adakah anda mempunyai ID Penilaian NEXUS yang sebelumnya? Jika ya, tampal di bawah. Jika tidak, pilih Tiada.',
      /* 13 age_years      */ 'Dan berapakah umur anda? Sila taip umur anda dalam tahun, contohnya 67.',
      /* 14 falls          */ 'Dua soalan ringkas tentang keseimbangan. Dalam 12 bulan yang lalu, pernahkah anda jatuh — termasuk tergelincir atau tersandung sehingga anda terjatuh ke lantai?',
      /* 15 healthier_sg   */ 'Yang terakhir — adakah anda berdaftar dengan doktor Healthier SG? Ia menentukan program mana yang boleh dirujuk kepada anda.',
    ],
    reflections: [
      (input) => { const n = parseInt((input.match(/\d+/) || ['0'])[0], 10); return n === 0 ? 'Memulakan dari sifar adalah normal. ' : 'Permulaan yang baik. '; },
      () => 'Tempoh sesi anda direkodkan. ',
      () => 'Latihan kekuatan sama pentingnya dengan senaman aerobik. ',
      () => 'Terima kasih kerana berkongsi. Saya akan pastikan cadangan anda selamat. ',
      () => 'Itu satu cabaran yang nyata. ',
      () => 'Sokongan sosial adalah faktor perlindungan yang penting. ',
      (input) => /(ya|yes)/i.test(input) ? 'Terima kasih kerana berkongsi — ini akan diambil kira dalam pelan anda. ' : 'Baik, direkodkan. ',
      () => 'Kesejahteraan mental anda sama pentingnya dengan kesihatan fizikal. ',
      () => 'Direkodkan. ',
      () => 'Terima kasih kerana berkongsi. ',
      () => 'Baik, ini membantu kami mencari ruang komuniti berdekatan. ',
      () => 'Memetakan sumber berdekatan sekarang. ',
      (input) => /(tidak|tiada|no)/i.test(input) ? 'Baik, rekod baharu akan dimulakan. ' : 'Saya akan menghubungkan rekod lama anda. ',
      /* 13 age_years */ () => 'Terima kasih. ',
    ],
    quickReplies: [
      ['0 hari', '1–2 hari', '3–4 hari', '5–7 hari'],
      ['Kurang 20 minit', '20–30 minit', '30–45 minit', '45–60 minit', '60+ minit'],
      ['Tiada latihan kekuatan', '1 hari seminggu', '2 hari seminggu', '3+ hari seminggu'],
      ['Tiada penyakit atau simptom', 'Darah tinggi', 'Pradiabetes atau diabetes', 'Penyakit jantung', 'Pening atau sakit dada semasa aktif'],
      ['Kekurangan masa', 'Terlalu mahal', 'Terlalu jauh', 'Lebih suka hospital', 'Tidak pasti apa yang ada', 'Tiada halangan'],
      ['Ada beberapa orang yang boleh saya hubungi', 'Ada satu atau dua orang rapat', 'Saya mostly uruskan sendiri', 'Saya rasa agak keseorangan'],
      ['Ya, ini pernah berlaku', 'Tidak, saya sentiasa ada makanan yang cukup'],
      ['Perasaan baik secara keseluruhannya', 'Ada sedikit tekanan tapi boleh kawal', 'Rasa sangat tertekan atau sedih', 'Terbeban — tanggungjawab penjagaan', 'Terbeban — tekanan kewangan'],
      ['Lelaki', 'Perempuan'],
      ['Cina', 'Melayu', 'India', 'Eurasian', 'Lain-lain', 'Tidak mahu beritahu'],
      ['HDB 1-2 Bilik', 'HDB 3 Bilik', 'HDB 4 Bilik', 'HDB 5 Bilik / Eksekutif', 'Kondo / Pangsapuri', 'Landed'],
      
      /*
        ⚠️ NO EXAMPLE DIGITS IN THESE CHIPS, AND THAT IS THE WHOLE POINT.
        This row used to read 'North (e.g. 73, 75)', 'East (e.g. 46, 52)' and so on.
        `parseClinicalData` took the first two digits it found in the answer — which
        for a TAPPED CHIP is the label — so every respondent who tapped North was
        recorded as sector 73, East as 46, West as 60. The geographic data collected
        'for population-level resource planning' was four constants, and it also chose
        which health cluster's services the person was shown.
        The question already asks for the digits. Only the 'type my own' chip remains,
        in each language's existing wording; anything unreadable is now `null`, not a
        place. See `src/utils/singapore/postalSectors.js`.
      */
      ['Lain-lain / Taip sendiri'],
      ['Tiada ID'],
      /*
        ⚠️ APPENDED AT INDEX 13 AND 14 TO MATCH `DOMAIN_CONFIG`, never inserted.
           `prompts`, `quickReplies` and `reflections` are parallel arrays across
           four dictionaries; `chatSteps.js` reads a step by ABSOLUTE index, and a
           renumber to close a gap is how a question goes missing in one language.

        ⚠️ THE CHIP TEXT IS PARSER INPUT, NOT ONLY READER TEXT. `parseFallsAnswer`
           and `parseHealthierSg` match tokens in `clinicalFlags.js`, and every
           token below is registered there. `clinicalFlags.i18n.test.js` asserts
           chip-for-chip parity with English — a chip changed here without its
           token fails that test rather than silently mis-flagging somebody.
      */
      /* 13 age_years     */ null,
      /* 14 falls          */ FALLS_CHIPS.ms,
      /* 15 healthier_sg   */ HSG_CHIPS.ms,
    ],
  },

  zh: {
    back: '返回',
    typing: 'AURA 正在输入\u2026',
    inputPlaceholder: '请输入您的回答或选择以下选项\u2026',
    hintText: '请选择或自由输入：',
    sessionLabel: '会话',
    domainLabel: '筛查领域',
    ctaTitle: '您的个性化健康计划',
    ctaPrimary: '您的下一步行动',
    ctaHealthierSG: '您与 Healthier SG 的联系',
    ctaResources: '其他资源',
    error: '保存时发生连接错误，请重试。',
    progressLabel: (step, total) => `第 ${step + 1} 步，共 ${total} 步`,
    prompts: [
      '你好，我是 AURA 👋 在典型的一周里，您通常有几天进行中等或剧烈强度的运动？（例如快走、骑车、游泳）',
      '在这些运动的日子里，您每次通常运动多少分钟？',
      '您有进行任何肌肉力量训练吗？（例如举重、弹力带、俯卧撑或深蹲）',
      '您是否有任何慢性病，例如高血压、糖尿病前期或心脏病？运动时是否曾感到胸痛或头晕？',
      '什么是您使用社区健康服务的主要障碍？',
      '大概有多少家人或朋友可以在您需要时提供帮助？您是否有可以倾心交谈的人？',
      '还有一个问题——在过去12个月里，您是否因为买不起足够的食物而挨过饿？',
      '在过去两周里，您的整体感觉如何？是否感到压力大、情绪低落或不知所措？',
      '谢谢。现在问两个关于您的简单问题，因为建议会随这两项而不同。首先，您是男性还是女性？',
      '您的种族是什么？这有助于我们更好地了解我们服务的多元社区。',
      '您居住的房屋类型是什么？（例如：HDB 3房式，公寓等）',
      '您的邮政编码前两位数是什么？这样我可以为您找到附近的资源。',
      '最后一个问题 — 您是否有之前的 NEXUS 评估 ID？如有，请粘贴在下方；如没有，请选择"没有"。',
      /* 13 age_years      */ '请问您今年多大年纪？请输入您的年龄（岁），例如 67。',
      /* 14 falls          */ '关于平衡的两个简短问题。在过去 12 个月里，您跌倒过吗？包括滑倒或绊倒而摔在地上的情况。',
      /* 15 healthier_sg   */ '最后一个问题 — 您是否已向 Healthier SG 家庭医生登记？这会影响您可以被转介到哪些计划。',
    ],
    reflections: [
      (input) => { const n = parseInt((input.match(/\d+/) || ['0'])[0], 10); return n === 0 ? '从零开始完全正常。' : '这是一个很好的起点。'; },
      () => '运动时长已记录。',
      () => '力量训练和有氧运动同样重要。',
      () => '感谢您的分享，我会确保建议对您安全适合。',
      () => '这是一个很现实的障碍。',
      () => '社会连接是保护长期健康的重要因素。',
      (input) => /是|yes/i.test(input) ? '谢谢您告诉我这些，我们会将这点纳入您的健康计划中。' : '好的，已记录。',
      () => '您的心理健康与身体健康同样重要。',
      () => '已记录，谢谢。',
      () => '谢谢您的分享。',
      () => '明白了，这有助于我们为您推荐附近的社区空间。',
      () => '正在为您定位附近的资源。',
      (input) => /(没|无|不|no)/i.test(input) ? '没问题，今天将为您建立新记录。' : '很好，我将链接您的历史记录。',
      /* 13 age_years */ () => '谢谢。',
    ],
    quickReplies: [
      ['0 天', '1–2 天', '3–4 天', '5–7 天'],
      ['少于 20 分钟', '20–30 分钟', '30–45 分钟', '45–60 分钟', '60 分钟以上'],
      ['没有力量训练', '每周 1 天', '每周 2 天', '每周 3 天以上'],
      ['没有疾病或症状', '高血压', '糖尿病前期或糖尿病', '心脏病', '运动时头晕或胸痛'],
      ['没时间', '太贵了', '太远了', '更喜欢去医院', '不确定有哪些资源', '没有障碍'],
      ['有几个可以依靠的人', '有一两个亲近的人', '大多数情况自己处理', '感到相当孤立'],
      ['是的', '没有，我一直都有足够的食物'],
      ['整体感觉不错', '有些压力但能应对', '感到很压抑或情绪低落', '感到不知所措 — 照顾', '感到不知所措 — 经济压力'],
      ['男', '女'],
      ['华人', '马来人', '印度人', '欧亚裔', '其他', '不愿透露'],
      ['HDB 1-2 房式', 'HDB 3 房式', 'HDB 4 房式', 'HDB 5 房式 / 执行组屋', '私人公寓', '有地住宅'],
      
      /*
        ⚠️ NO EXAMPLE DIGITS IN THESE CHIPS, AND THAT IS THE WHOLE POINT.
        This row used to read 'North (e.g. 73, 75)', 'East (e.g. 46, 52)' and so on.
        `parseClinicalData` took the first two digits it found in the answer — which
        for a TAPPED CHIP is the label — so every respondent who tapped North was
        recorded as sector 73, East as 46, West as 60. The geographic data collected
        'for population-level resource planning' was four constants, and it also chose
        which health cluster's services the person was shown.
        The question already asks for the digits. Only the 'type my own' chip remains,
        in each language's existing wording; anything unreadable is now `null`, not a
        place. See `src/utils/singapore/postalSectors.js`.
      */
      ['其他 / 手动输入'],
      ['没有之前的 ID'],
      /*
        ⚠️ APPENDED AT INDEX 13 AND 14 TO MATCH `DOMAIN_CONFIG`, never inserted.
           `prompts`, `quickReplies` and `reflections` are parallel arrays across
           four dictionaries; `chatSteps.js` reads a step by ABSOLUTE index, and a
           renumber to close a gap is how a question goes missing in one language.

        ⚠️ THE CHIP TEXT IS PARSER INPUT, NOT ONLY READER TEXT. `parseFallsAnswer`
           and `parseHealthierSg` match tokens in `clinicalFlags.js`, and every
           token below is registered there. `clinicalFlags.i18n.test.js` asserts
           chip-for-chip parity with English — a chip changed here without its
           token fails that test rather than silently mis-flagging somebody.
      */
      /* 13 age_years     */ null,
      /* 14 falls          */ FALLS_CHIPS.zh,
      /* 15 healthier_sg   */ HSG_CHIPS.zh,
    ],
  },

  ta: {
    back: 'பின்செல்',
    typing: 'AURA தட்டச்சு செய்கிறார்\u2026',
    inputPlaceholder: 'உங்கள் பதிலை உள்ளிடவும் அல்லது கீழே தேர்வு செய்யவும்\u2026',
    hintText: 'ஒரு விருப்பத்தைத் தேர்ந்தெடுக்கவும் அல்லது சுயமாக தட்டச்சு செய்யவும்:',
    sessionLabel: 'அமர்வு',
    domainLabel: 'திரையிடல் களம்',
    ctaTitle: 'உங்கள் தனிப்பட்ட சுகாதார திட்டம்',
    ctaPrimary: 'உங்கள் அடுத்த படி',
    ctaHealthierSG: 'Healthier SG இணைப்பு',
    ctaResources: 'கூடுதல் வளங்கள்',
    error: 'சேமிக்கும் போது இணைப்பு பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.',
    progressLabel: (step, total) => `படி ${step + 1} / ${total}`,
    prompts: [
      'வணக்கம், நான் AURA 👋 வழக்கமான வாரத்தில், நீங்கள் எத்தனை நாட்கள் மிதமான அல்லது தீவிரமான உடற்பயிற்சி செய்கிறீர்கள்? (எ.கா. வேகமாக நடைபயிற்சி, சைக்கிள், நீச்சல்)',
      'அந்த தீவிர நாட்களில் நீங்கள் வழக்கமாக எவ்வளவு நேரம் உடற்பயிற்சி செய்கிறீர்கள்?',
      'நீங்கள் தசை வலிமைப் பயிற்சிகளை செய்கிறீர்களா? (எ.கா. எடை தூக்குதல், ரெசிஸ்டன்ஸ் பேண்ட், புஷ்-அப்ஸ்)',
      'உங்களுக்கு உயர் இரத்த அழுத்தம், நீரிழிவு முன்நிலை, அல்லது இதய நோய் போன்ற நாட்பட்ட நோய்கள் உள்ளதா? செயலில் இருக்கும்போது நெஞ்சு வலி அல்லது தலைச்சுற்றல் ஏற்படுகிறதா?',
      'சமூக சுகாதார சேவைகளை அணுகுவதில் உங்களின் முக்கிய தடை என்ன?',
      'தோராயமாக எத்தனை குடும்பத்தினர் அல்லது நண்பர்கள் உங்களுக்கு உதவ முடியும்? நெருங்கி பேச யாரேனும் இருக்கிறார்களா?',
      'கடந்த 12 மாதங்களில் உணவு வாங்க வசதியில்லாததால் பசியுடன் இருந்தும் சாப்பிடாத நேரங்கள் இருந்தனவா?',
      'கடந்த இரண்டு வாரங்களில் நீங்கள் எப்படி உணர்ந்தீர்கள்? மன அழுத்தம், மனச்சோர்வு, அல்லது அதிக சுமையாக உணர்ந்தீர்களா?',
      'நன்றி. இப்போது உங்களைப் பற்றி இரண்டு சிறிய கேள்விகள், ஏனெனில் இவ்விரண்டையும் பொறுத்து அறிவுரை மாறும். முதலில், நீங்கள் ஆணா அல்லது பெண்ணா?',
      'உங்கள் இனம் என்ன? இது நாங்கள் சேவை செய்யும் பல்வேறு சமூகங்களை புரிந்துகொள்ள உதவுகிறது.',
      'நீங்கள் எந்த வகையான வீட்டில் வசிக்கிறீர்கள்? (எ.கா. HDB 3-அறை, காண்டோ)',
      'உங்கள் தபால் குறியீட்டின் முதல் இரண்டு இலக்கங்கள் என்ன?',
      'கடைசி கேள்வி — உங்களிடம் ஏற்கனவே NEXUS மதிப்பீட்டு ID உள்ளதா? இருந்தால் கீழே ஒட்டவும்; இல்லையெனில் "இல்லை" என்பதைத் தேர்ந்தெடுக்கவும்.',
      /* 13 age_years      */ 'உங்கள் வயது என்ன? உங்கள் வயதை ஆண்டுகளில் தட்டச்சு செய்யுங்கள், எடுத்துக்காட்டாக 67.',
      /* 14 falls          */ 'சமநிலை குறித்த இரண்டு சிறிய கேள்விகள். கடந்த 12 மாதங்களில் நீங்கள் விழுந்ததுண்டா — வழுக்கியோ இடறியோ தரையில் விழுந்தது உட்பட?',
      /* 15 healthier_sg   */ 'கடைசியாக — நீங்கள் Healthier SG மருத்துவரிடம் பதிவு செய்துள்ளீர்களா? இது உங்களை எந்தத் திட்டங்களுக்குப் பரிந்துரைக்க முடியும் என்பதை மாற்றும்.',
    ],
    reflections: [
      (input) => { const n = parseInt((input.match(/\d+/) || ['0'])[0], 10); return n === 0 ? 'சூன்யத்திலிருந்து தொடங்குவது முற்றிலும் சாதாரணமானது. ' : 'இது ஒரு சிறந்த தொடக்கம். '; },
      () => 'சேஷன் நேரம் பதிவு செய்யப்பட்டது. ',
      () => 'வலிமைப் பயிற்சி ஏரோபிக் பயிற்சியைப் போலவே முக்கியமானது. ',
      () => 'பகிர்ந்ததற்கு நன்றி. பரிந்துரைகள் உங்களுக்கு பாதுகாப்பானவை என்பதை உறுதிப்படுத்துவேன். ',
      () => 'இது மிகவும் உண்மையான சவால். ',
      () => 'சமூக இணைப்பு ஆரோக்கியத்திற்கான முக்கியமான பாதுகாப்பு காரணி. ',
      (input) => /(ஆம்|yes)/i.test(input) ? 'பகிர்ந்ததற்கு நன்றி — இதை உங்கள் திட்டத்தில் கருத்தில் கொள்வோம். ' : 'புரிந்தது. ',
      () => 'உங்கள் மனநல நலன் உடல் ஆரோக்கியம் போலவே முக்கியமானது. ',
      () => 'பதிவு செய்யப்பட்டது. ',
      () => 'பகிர்ந்ததற்கு நன்றி. ',
      () => 'புரிந்தது, அருகிலுள்ள சமூக இடங்களை பரிந்துரைக்க இது உதவுகிறது. ',
      () => 'அருகிலுள்ள வளங்களை இப்போது வரைபடமாக்குகிறேன். ',
      (input) => /(இல்லை|no)/i.test(input) ? 'பரவாயில்லை, புதிய பதிவை தொடங்குவோம். ' : 'முந்தைய பதிவுகளை இணைக்கிறேன். ',
      /* 13 age_years */ () => 'நன்றி. ',
    ],
    quickReplies: [
      ['0 நாட்கள்', '1–2 நாட்கள்', '3–4 நாட்கள்', '5–7 நாட்கள்'],
      ['20 நிமிடங்களுக்கும் குறைவு', '20–30 நிமிடங்கள்', '30–45 நிமிடங்கள்', '45–60 நிமிடங்கள்', '60+ நிமிடங்கள்'],
      ['தசை பயிற்சி இல்லை', 'வாரத்தில் 1 நாள்', 'வாரத்தில் 2 நாட்கள்', 'வாரத்தில் 3+ நாட்கள்'],
      ['நோய் அல்லது அறிகுறிகள் இல்லை', 'உயர் இரத்த அழுத்தம்', 'நீரிழிவு முன்நிலை அல்லது நீரிழிவு', 'இதய நோய்', 'செயலில் இருக்கும்போது தலைச்சுற்றல் அல்லது நெஞ்சு வலி'],
      ['நேரமின்மை', 'மிகவும் விலை அதிகம்', 'மிகவும் தூரம்', 'மருத்துவமனைகளை விரும்புகிறேன்', 'என்ன கிடைக்கும் என்று தெரியாது', 'தடைகள் இல்லை'],
      ['பல நம்பகமான நபர்கள் உள்ளனர்', 'ஒன்று அல்லது இரண்டு நெருங்கிய நபர்கள்', 'பெரும்பாலும் சுயமாக சமாளிக்கிறேன்', 'மிகவும் தனிமையாக உணர்கிறேன்'],
      ['ஆம், இது நடந்துள்ளது', 'இல்லை, என்னிடம் எப்போதும் போதுமான உணவு இருந்தது'],
      ['ஒட்டுமொத்தமாக நல்லாக உணர்கிறேன்', 'சில மன அழுத்தம் ஆனால் சமாளிக்கிறேன்', 'மிகவும் மன அழுத்தம் அல்லது மனச்சோர்வு', 'அதிக சுமை — பராமரிப்பு', 'அதிக சுமை — நிதி அழுத்தம்'],
      ['ஆண்', 'பெண்'],
      ['சீனர்', 'மலாய்', 'இந்தியர்', 'யுரேஷியன்', 'மற்றவை', 'கூற விரும்பவில்லை'],
      ['HDB 1-2 அறை', 'HDB 3 அறை', 'HDB 4 அறை', 'HDB 5 அறை / எக்ஸிகியூட்டிவ்', 'காண்டோ / தனியார் அபார்ட்மெண்ட்', 'நிலம் உள்ள வீடு'],
      
      /*
        ⚠️ NO EXAMPLE DIGITS IN THESE CHIPS, AND THAT IS THE WHOLE POINT.
        This row used to read 'North (e.g. 73, 75)', 'East (e.g. 46, 52)' and so on.
        `parseClinicalData` took the first two digits it found in the answer — which
        for a TAPPED CHIP is the label — so every respondent who tapped North was
        recorded as sector 73, East as 46, West as 60. The geographic data collected
        'for population-level resource planning' was four constants, and it also chose
        which health cluster's services the person was shown.
        The question already asks for the digits. Only the 'type my own' chip remains,
        in each language's existing wording; anything unreadable is now `null`, not a
        place. See `src/utils/singapore/postalSectors.js`.
      */
      ['மற்றவை / தட்டச்சு செய்கிறேன்'],
      ['முந்தைய ID இல்லை'],
      /*
        ⚠️ APPENDED AT INDEX 13 AND 14 TO MATCH `DOMAIN_CONFIG`, never inserted.
           `prompts`, `quickReplies` and `reflections` are parallel arrays across
           four dictionaries; `chatSteps.js` reads a step by ABSOLUTE index, and a
           renumber to close a gap is how a question goes missing in one language.

        ⚠️ THE CHIP TEXT IS PARSER INPUT, NOT ONLY READER TEXT. `parseFallsAnswer`
           and `parseHealthierSg` match tokens in `clinicalFlags.js`, and every
           token below is registered there. `clinicalFlags.i18n.test.js` asserts
           chip-for-chip parity with English — a chip changed here without its
           token fails that test rather than silently mis-flagging somebody.
      */
      /* 13 age_years     */ null,
      /* 14 falls          */ FALLS_CHIPS.ta,
      /* 15 healthier_sg   */ HSG_CHIPS.ta,
    ],
  },
};

/**
 * ==============================================================================
 * THE BINDING BETWEEN POSITION AND QUESTION
 * ==============================================================================
 *
 * The three arrays below are written in this order. That is the ONLY thing that
 * binds a prompt to the question it belongs to, and until now the binding was
 * implicit: it lived in whatever order `DOMAIN_CONFIG` happened to have, so
 * reordering the flow silently reassigned every prompt after the moved step, in
 * four languages at once. `DOMAIN_CONFIG` carries an "APPENDED, NOT INSERTED"
 * warning for exactly that reason.
 *
 * Writing it down here breaks that coupling. `DOMAIN_CONFIG` may now be reordered
 * freely, because it describes the order questions are ASKED in, while this
 * describes the order the answers were AUTHORED in. `communityChatCopy.test.js`
 * asserts the two cover the same set of questions, so a step added to one and not
 * the other fails the build rather than shipping a misaligned prompt.
 *
 * ⚠️ CHANGING THIS LIST REASSIGNS COPY. It is not a preference. Only ever edit it
 *    in the same commit that moves the corresponding entries inside the arrays.
 */
export const COPY_ORDER = Object.freeze([
    'pavs_days', 'pavs_mins', 'strength', 'medical', 'barriers', 'social',
    'food_insecurity', 'wellbeing', 'demographics', 'ethnicity', 'housing_type',
    'postal_code', 'previous_id', 'age_years', 'falls', 'healthier_sg',
]);

/**
 * A question's copy, addressed by NAME. `undefined` where a language has no entry,
 * which is a real state: `reflections` stops before the two appended steps, and
 * `isStepAvailable` treats a missing prompt as a step to skip.
 */
const byKey = (list) => {
    const out = {};
    COPY_ORDER.forEach((key, i) => { out[key] = list[i]; });
    return out;
};

/** `copyFor(lang).prompts.demographics` rather than `prompts[8]`. */
export const copyFor = (lang) => {
    const dict = DICTIONARY[lang] || DICTIONARY.en;
    return {
        ...dict,
        prompts: byKey(dict.prompts),
        reflections: byKey(dict.reflections),
        quickReplies: byKey(dict.quickReplies),
    };
};
