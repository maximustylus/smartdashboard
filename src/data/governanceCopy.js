/**
 * ==============================================================================
 * PAGE 3 OF THE REPORT, IN THE LANGUAGE THE RESIDENT CHOSE
 * ==============================================================================
 *
 * The governance page (the medical disclaimer, the evidence table, the privacy
 * notice and the Healthier SG block) was English in every language until
 * 2026-09-17. A Malay resident's report was two pages of Malay and one of
 * English, and the English page was the one that says what the document is not.
 *
 * ⚠️ `disclaimer` IS SAFETY-CRITICAL AND IS REGISTERED IN `copyReview.js`. It
 *    tells a resident with chest pain to seek immediate medical attention. Its
 *    ms/zh/ta text is machine translated and unread by a native speaker, so the
 *    build is red until a person reviews it or the owner signs a waiver, the
 *    same way `hrCaution` was handled. Everything else on this page is
 *    descriptive and is tracked under `CD13` like the rest of the copy.
 *
 * ⚠️ THE EVIDENCE TABLE NAMES INSTRUMENTS. Instrument names, scale names and
 *    acronyms (PAVS, SPAG, PHQ-2, LSNS-6, Duke-NUS) are left in English in every
 *    language on purpose: they are proper nouns a research office searches for,
 *    and a translated acronym is a different acronym.
 */

export const GOVERNANCE_COPY = Object.freeze({
    en: Object.freeze({
        disclaimerHeading: 'Important medical disclaimer',
        disclaimerLead: 'This NEXUS AURA report is an initial community health navigation tool and',
        disclaimerBold: 'does not constitute medical advice, diagnosis, or a treatment plan',
        disclaimerRest: '. The physical activity recommendations are generated for educational and community navigation purposes only. Always consult a qualified healthcare professional or your Healthier SG GP before making significant changes to your lifestyle, diet, or exercise routine. If you are experiencing chest pain, dizziness, or any acute symptoms, please seek immediate medical attention.',
        evidenceHeading: 'Academic and evidence grounding',
        evidence: Object.freeze([
            ['Physical activity', 'ACSM Physical Activity Vital Sign (PAVS), administered as published: 2 questions (days per week, minutes per session).'],
            ['National targets', 'Sport Singapore Physical Activity Guidelines (SPAG): 150 to 300 mins/week moderate-intensity aerobic activity. A reference target, not an instrument.'],
            ['Psychological wellbeing', 'Single-item screen adapted from BPS-RS II Domain P22 (PHQ-2 aligned, 2-week timeframe). One item, not the two-item PHQ-2, and not separately validated in this form.'],
            ['Social isolation', 'Single-item screen adapted from the Lubben Social Network Scale (LSNS-6). One item, not the six-item scale; LSNS-6’s published reliability does not transfer to it.'],
            ['Food insecurity', 'Single-item screen adapted from the Lien Centre for Social Innovation Food Insufficiency Screen (2 items).'],
            ['Financial adequacy', 'Both pathways: 3-level screen adapted from the Duke-NUS Perceived Income Adequacy Scale, read alongside reported access barriers.'],
            ['Housing risk', 'Self-reported HDB flat type, used as a social-risk proxy. Flat type is asked; tenure (rented or owned) is not.'],
        ]),
        privacyHeading: 'Data governance and privacy',
        privacyBody: 'All data collected through the NEXUS AURA system is de-identified at the point of capture. Postal sector data is used solely for geographic resource mapping and is not linked to any identifiable personal information. This assessment does not collect, store, or transmit NRIC, name, contact, or financial account information. Aggregated, anonymised data may be used to improve community health programming across Singapore.',
        hsgTitle: 'Your Healthier SG Health Plan',
        hsgLead: 'This assessment aligns with the',
        hsgBrand: 'MOH Healthier SG',
        hsgRest: ' framework. Enrol with a Healthier SG GP to receive a fully subsidised annual Health Plan consultation, personalised screening schedule, and community programme referrals.',
        hsgLinks: Object.freeze({
            healthiersg: 'Healthier SG',
            healthhub: 'Access your Health Plan and book screenings',
            activehealth: 'Find your nearest Active Health Lab',
            aic: 'Locate Active Ageing Centres for residents 60+',
            pa: 'Search Healthier SG interest groups near you',
        }),
    }),

    ms: Object.freeze({
        disclaimerHeading: 'Penafian perubatan penting',
        disclaimerLead: 'Laporan NEXUS AURA ini ialah alat navigasi kesihatan komuniti peringkat awal dan',
        disclaimerBold: 'bukan nasihat perubatan, diagnosis, atau rancangan rawatan',
        disclaimerRest: '. Cadangan aktiviti fizikal dihasilkan untuk tujuan pendidikan dan navigasi komuniti sahaja. Sentiasa rujuk profesional kesihatan yang bertauliah atau doktor keluarga Healthier SG anda sebelum membuat perubahan besar kepada gaya hidup, pemakanan, atau rutin senaman anda. Jika anda mengalami sakit dada, pening, atau sebarang gejala mendadak, sila dapatkan rawatan perubatan segera.',
        evidenceHeading: 'Asas akademik dan bukti',
        evidence: Object.freeze([
            ['Aktiviti fizikal', 'ACSM Physical Activity Vital Sign (PAVS), ditadbir seperti yang diterbitkan: 2 soalan (hari seminggu, minit setiap sesi).'],
            ['Sasaran kebangsaan', 'Garis Panduan Aktiviti Fizikal Sport Singapore (SPAG): 150 hingga 300 minit seminggu aktiviti aerobik tahap sederhana. Sasaran rujukan, bukan instrumen.'],
            ['Kesejahteraan psikologi', 'Saringan satu item diadaptasi daripada BPS-RS II Domain P22 (selari dengan PHQ-2, tempoh 2 minggu). Satu item, bukan PHQ-2 dua item, dan tidak disahkan secara berasingan dalam bentuk ini.'],
            ['Pengasingan sosial', 'Saringan satu item diadaptasi daripada Lubben Social Network Scale (LSNS-6). Satu item, bukan skala enam item; kebolehpercayaan LSNS-6 yang diterbitkan tidak terpakai kepadanya.'],
            ['Ketidakcukupan makanan', 'Saringan satu item diadaptasi daripada Lien Centre for Social Innovation Food Insufficiency Screen (2 item).'],
            ['Kecukupan kewangan', 'Kedua-dua laluan: saringan 3 tahap diadaptasi daripada Duke-NUS Perceived Income Adequacy Scale, dibaca bersama halangan akses yang dilaporkan.'],
            ['Risiko perumahan', 'Jenis flat HDB yang dilaporkan sendiri, digunakan sebagai proksi risiko sosial. Jenis flat ditanya; status milikan (sewa atau milik) tidak.'],
        ]),
        privacyHeading: 'Tadbir urus data dan privasi',
        privacyBody: 'Semua data yang dikumpul melalui sistem NEXUS AURA dinyahkenal pasti pada titik pengumpulan. Data sektor pos digunakan semata-mata untuk pemetaan sumber geografi dan tidak dikaitkan dengan sebarang maklumat peribadi yang boleh dikenal pasti. Penilaian ini tidak mengumpul, menyimpan, atau menghantar NRIC, nama, maklumat hubungan, atau maklumat akaun kewangan. Data agregat tanpa nama boleh digunakan untuk menambah baik program kesihatan komuniti di seluruh Singapura.',
        hsgTitle: 'Rancangan Kesihatan Healthier SG Anda',
        hsgLead: 'Penilaian ini selaras dengan rangka kerja',
        hsgBrand: 'MOH Healthier SG',
        hsgRest: '. Daftar dengan doktor keluarga Healthier SG untuk mendapat konsultasi Rancangan Kesihatan tahunan yang disubsidi sepenuhnya, jadual saringan peribadi, dan rujukan ke program komuniti.',
        hsgLinks: Object.freeze({
            healthiersg: 'Healthier SG',
            healthhub: 'Akses Rancangan Kesihatan anda dan tempah saringan',
            activehealth: 'Cari Active Health Lab terdekat',
            aic: 'Cari Pusat Penuaan Aktif untuk warga 60+',
            pa: 'Cari kumpulan minat Healthier SG berdekatan',
        }),
    }),

    zh: Object.freeze({
        disclaimerHeading: '重要医疗免责声明',
        disclaimerLead: '本 NEXUS AURA 报告是一份初步的社区健康导航工具，',
        disclaimerBold: '不构成医疗建议、诊断或治疗方案',
        disclaimerRest: '。其中的体力活动建议仅用于教育和社区导航目的。在对生活方式、饮食或运动习惯做出重大改变前，请务必咨询合格的医疗专业人员或您的 Healthier SG 家庭医生。如果您出现胸痛、头晕或任何急性症状，请立即就医。',
        evidenceHeading: '学术与证据依据',
        evidence: Object.freeze([
            ['体力活动', 'ACSM Physical Activity Vital Sign (PAVS)，按已发表的方式施测：2 个问题（每周天数、每次分钟数）。'],
            ['全国目标', '新加坡体育理事会体力活动指南 (SPAG)：每周 150 至 300 分钟中等强度有氧活动。这是参考目标，不是测评工具。'],
            ['心理健康', '改编自 BPS-RS II 领域 P22 的单项筛查（与 PHQ-2 对应，时间范围 2 周）。仅一项，并非两项的 PHQ-2，且未以此形式单独验证。'],
            ['社会孤立', '改编自 Lubben Social Network Scale (LSNS-6) 的单项筛查。仅一项，并非六项量表；LSNS-6 已发表的信度不适用于此。'],
            ['食物保障', '改编自 Lien Centre for Social Innovation 食物不足筛查（2 项）的单项筛查。'],
            ['收入充足', '两种途径均采用：改编自 Duke-NUS Perceived Income Adequacy Scale 的三级筛查，并结合所报告的使用障碍。'],
            ['住房风险', '自报的组屋类型，用作社会风险的代理指标。询问的是房型，不询问租住或自有。'],
        ]),
        privacyHeading: '数据治理与隐私',
        privacyBody: '通过 NEXUS AURA 系统收集的所有数据在采集时即已去识别化。邮区数据仅用于地理资源定位，不与任何可识别的个人信息关联。本评估不收集、存储或传输身份证号码、姓名、联系方式或金融账户信息。汇总后的匿名数据可能用于改善新加坡各地的社区健康项目。',
        hsgTitle: '您的 Healthier SG 健康计划',
        hsgLead: '本评估与',
        hsgBrand: '卫生部 Healthier SG',
        hsgRest: '框架一致。向 Healthier SG 家庭医生登记，即可获得全额补贴的年度健康计划咨询、个人化的筛查安排以及社区项目转介。',
        hsgLinks: Object.freeze({
            healthiersg: 'Healthier SG',
            healthhub: '查看您的健康计划并预约筛查',
            activehealth: '查找最近的 Active Health Lab',
            aic: '查找 60 岁以上居民的活跃乐龄中心',
            pa: '查找附近的 Healthier SG 兴趣小组',
        }),
    }),

    ta: Object.freeze({
        disclaimerHeading: 'முக்கிய மருத்துவப் பொறுப்புத் துறப்பு',
        disclaimerLead: 'இந்த NEXUS AURA அறிக்கை ஒரு தொடக்கநிலைச் சமூக சுகாதார வழிகாட்டிக் கருவி ஆகும்; இது',
        disclaimerBold: 'மருத்துவ ஆலோசனை, நோயறிதல் அல்லது சிகிச்சைத் திட்டம் அல்ல',
        disclaimerRest: '. உடல் செயல்பாட்டுப் பரிந்துரைகள் கல்வி மற்றும் சமூக வழிகாட்டல் நோக்கங்களுக்காக மட்டுமே உருவாக்கப்படுகின்றன. உங்கள் வாழ்க்கை முறை, உணவு அல்லது உடற்பயிற்சி வழக்கத்தில் பெரிய மாற்றங்களைச் செய்யும் முன், தகுதியான சுகாதார நிபுணரை அல்லது உங்கள் Healthier SG குடும்ப மருத்துவரை எப்போதும் அணுகுங்கள். நெஞ்சு வலி, தலைச்சுற்றல் அல்லது திடீர் அறிகுறிகள் ஏதேனும் இருந்தால், உடனடியாக மருத்துவ உதவி பெறுங்கள்.',
        evidenceHeading: 'கல்வி மற்றும் சான்று அடிப்படை',
        evidence: Object.freeze([
            ['உடல் செயல்பாடு', 'ACSM Physical Activity Vital Sign (PAVS), வெளியிடப்பட்டபடி நிர்வகிக்கப்படுகிறது: 2 கேள்விகள் (வாரத்திற்கு நாட்கள், ஒரு அமர்வுக்கு நிமிடங்கள்).'],
            ['தேசிய இலக்குகள்', 'Sport Singapore உடல் செயல்பாட்டு வழிகாட்டுதல்கள் (SPAG): வாரத்திற்கு 150 முதல் 300 நிமிடங்கள் மிதமான தீவிர ஏரோபிக் செயல்பாடு. ஒரு குறிப்பு இலக்கு, அளவீட்டுக் கருவி அல்ல.'],
            ['உளவியல் நல்வாழ்வு', 'BPS-RS II Domain P22 இலிருந்து தழுவிய ஒற்றை உருப்படித் திரையிடல் (PHQ-2 உடன் இணைந்தது, 2 வார காலம்). ஒரு உருப்படி மட்டுமே, இரண்டு உருப்படி PHQ-2 அல்ல, மேலும் இந்த வடிவத்தில் தனியாகச் சரிபார்க்கப்படவில்லை.'],
            ['சமூகத் தனிமை', 'Lubben Social Network Scale (LSNS-6) இலிருந்து தழுவிய ஒற்றை உருப்படித் திரையிடல். ஒரு உருப்படி மட்டுமே, ஆறு உருப்படி அளவுகோல் அல்ல; LSNS-6 இன் வெளியிடப்பட்ட நம்பகத்தன்மை இதற்குப் பொருந்தாது.'],
            ['உணவுப் பற்றாக்குறை', 'Lien Centre for Social Innovation உணவுப் பற்றாக்குறைத் திரையிடலிலிருந்து (2 உருப்படிகள்) தழுவிய ஒற்றை உருப்படித் திரையிடல்.'],
            ['வருமானப் போதுமை', 'இரு வழிகளிலும்: Duke-NUS Perceived Income Adequacy Scale இலிருந்து தழுவிய 3-நிலைத் திரையிடல், தெரிவிக்கப்பட்ட அணுகல் தடைகளுடன் சேர்த்து வாசிக்கப்படுகிறது.'],
            ['வீட்டு ஆபத்து', 'சுயமாகத் தெரிவிக்கப்பட்ட HDB வீட்டு வகை, சமூக ஆபத்துக்கான மாற்றுக் குறியீடாகப் பயன்படுத்தப்படுகிறது. வீட்டு வகை கேட்கப்படுகிறது; வாடகை அல்லது சொந்தம் என்பது கேட்கப்படுவதில்லை.'],
        ]),
        privacyHeading: 'தரவு ஆளுமை மற்றும் தனியுரிமை',
        privacyBody: 'NEXUS AURA அமைப்பின் மூலம் சேகரிக்கப்படும் அனைத்துத் தரவும் சேகரிக்கும் இடத்திலேயே அடையாளம் நீக்கப்படுகிறது. அஞ்சல் துறைத் தரவு புவியியல் வளங்களை வரைபடமாக்க மட்டுமே பயன்படுத்தப்படுகிறது, எந்த அடையாளம் காணக்கூடிய தனிப்பட்ட தகவலுடனும் இணைக்கப்படுவதில்லை. இந்த மதிப்பீடு NRIC, பெயர், தொடர்பு அல்லது நிதிக் கணக்குத் தகவல்களைச் சேகரிக்கவோ, சேமிக்கவோ, அனுப்பவோ இல்லை. தொகுக்கப்பட்ட, பெயரற்ற தரவு சிங்கப்பூர் முழுவதும் சமூக சுகாதாரத் திட்டங்களை மேம்படுத்தப் பயன்படுத்தப்படலாம்.',
        hsgTitle: 'உங்கள் Healthier SG சுகாதாரத் திட்டம்',
        hsgLead: 'இந்த மதிப்பீடு',
        hsgBrand: 'MOH Healthier SG',
        hsgRest: ' கட்டமைப்புடன் ஒத்துப்போகிறது. முழுமையாக மானியம் பெற்ற ஆண்டுச் சுகாதாரத் திட்ட ஆலோசனை, தனிப்பயன் திரையிடல் அட்டவணை மற்றும் சமூகத் திட்டப் பரிந்துரைகளைப் பெற Healthier SG குடும்ப மருத்துவரிடம் பதிவு செய்யுங்கள்.',
        hsgLinks: Object.freeze({
            healthiersg: 'Healthier SG',
            healthhub: 'உங்கள் சுகாதாரத் திட்டத்தை அணுகி, திரையிடல்களை முன்பதிவு செய்யுங்கள்',
            activehealth: 'அருகிலுள்ள Active Health Lab ஐக் கண்டறியுங்கள்',
            aic: '60+ வயதினருக்கான Active Ageing மையங்களைக் கண்டறியுங்கள்',
            pa: 'அருகிலுள்ள Healthier SG ஆர்வக் குழுக்களைத் தேடுங்கள்',
        }),
    }),
});

export default GOVERNANCE_COPY;
