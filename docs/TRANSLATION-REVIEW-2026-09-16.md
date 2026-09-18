# Translation review pack · 2026-09-16

**What this is.** Every non-English string added or changed on the `community` branch on
2026-09-16, with the English it was translated from and a back-translation to check
against. Written for a reviewer who reads Malay, Chinese or Tamil, and laid out so that
they can work row by row. Model rounds closed on 2026-09-16 at the owner's decision:
this pack is for a person.

**What it is not.** A model reading a machine translation is evidence, not a review. The
five safety-critical strings already live under the owner's waivers are in
`TRANSLATION-BRIEF.md` Group 5 and are not repeated here. One string in this pack IS
safety-critical: `governance.disclaimer` in §A7, registered and unwaived, so the build
is red until it is reviewed or waived (`CD29`). Nothing else here gates the build.

**Where it ships.** Sections A1 to A6 and B shipped in v2.15.0 and §A8 in v2.15.2;
`main` is v2.16.2 as of 2026-09-18. §A7 is on `community` and not yet released.

**Revision 2.** The first revision of this pack showed the wrong English and the wrong
translations for `chat.wellbeing.chip4` and `chip5` (a generator indexed the first two
wellbeing chips instead of the last two). ChatGPT caught it. The source was always
correct; the pack was not. The rows below are regenerated from the live modules.

**Rules the portal holds every string to**, in every language:

- No em dashes. A comma, a full stop or a colon instead. A test fails otherwise.
- The word "clinical" does not appear anywhere a resident reads.
- Plain, spoken register. Most readers are over 60 and reading on a phone.
- A question **asks**. It does not open with "Thank you", "Great", "Noted" or the
  equivalent, because the sentence immediately before it is already an
  acknowledgement, and a test fails otherwise.
- No question but the final one says "last one", and none says "one more".
- Chips are short. A chip that wraps to three lines on a 390px phone is too long.

## ⚠️ Read before changing anything: strings that carry a matcher

The chat stores the **words the resident tapped**, in their language. Some of those
words are then read by code. If a reviewer improves the wording and loses the marked
word, the flag stops firing silently, in that language only, and nothing reports it.
This has already happened twice (`CP26`, `CP43`).

| String | Must keep | Why |
|---|---|---|
| `income.chip3` (the "not enough" chip) | `ms` **tidak mencukupi** · `zh` **不足** · `ta` **போதாது** | matched to set financial-strain |
| `income.chip1`, `income.chip2` | must **not** contain the words above | or the resident who said they were fine gets flagged |
| `aware.chip2`, `referred.chip2` (the "no" chips) | `ms` **tidak** · `zh` **没有** · `ta` **இல்லை** | decides whether the experience question is asked |
| `aware.chip1`, `referred.chip1` (the "yes" chips) | must **not** contain those words | |
| `chat.wellbeing.chip4` (caregiving) | `ms` **penjagaan** · `zh` **照顾** · `ta` **பராமரிப்பு** | routes to caregiver support |
| `chat.housing.chip1` | must contain **HDB** and **1-2** | the housing risk proxy |
| `chat.pavs_days.chip1` (the zero chip) | exactly `0 hari` · `0 天` · `0 நாட்கள்` | selects the zero-days question |

Everything else is prose and can be reworded freely.

---

## Section A · the six new questions · 21 strings × 3 languages

Asked by the conventional form since it shipped, now asked by AURA too. English is the
form's own wording. Where the form already had a translation it is reused, so most of
these have been on the form for months; the acknowledgements and the two "yes/no"
chip pairs are new.

### A1 · Making ends meet · `income_adequacy` · ⚠️ feeds the financial-strain flag

**`income.prompt`** · EN: *Do you feel you have adequate income to meet your monthly expenses?*

| | Translation | Back-translation |
|---|---|---|
| `ms` | Adakah anda rasa pendapatan anda mencukupi untuk perbelanjaan bulanan? | Do you feel your income is sufficient for monthly expenses? |
| `zh` | 您觉得您的收入足以应付每月开销吗？ | Do you feel your income is enough to cover monthly expenses? |
| `ta` | உங்கள் மாதச் செலவுகளைச் சமாளிக்க உங்கள் வருமானம் போதுமானது என நினைக்கிறீர்களா? | Do you think your income is enough to manage your monthly expenses? |

**`income.chip1`** · EN: *More than adequate* · ⚠️ must **not** contain the marker word

| | Translation | Back-translation |
|---|---|---|
| `ms` | Lebih daripada mencukupi | More than sufficient |
| `zh` | 绰绰有余 | More than enough (idiom: ample) |
| `ta` | மிகவும் போதுமானது | Very sufficient |

**`income.chip2`** · EN: *Adequate, just enough* · ⚠️ must **not** contain the marker word

| | Translation | Back-translation |
|---|---|---|
| `ms` | Mencukupi, cukup-cukup sahaja | Sufficient, just barely enough |
| `zh` | 足够，刚刚好 | Enough, just right |
| `ta` | போதுமானது, சரியாக இருக்கிறது | Sufficient, it is just right |

**`income.chip3`** · EN: *Not adequate* · ⚠️ **must keep the marker word**, see table above

| | Translation | Back-translation |
|---|---|---|
| `ms` | Tidak mencukupi | Not sufficient |
| `zh` | 不足 | Insufficient |
| `ta` | போதாது | Not enough |

**`income.ack`** · EN: *Thank you for telling me.*

| | Translation | Back-translation |
|---|---|---|
| `ms` | Terima kasih kerana memberitahu saya. | Thank you for telling me. |
| `zh` | 谢谢您告诉我。 | Thank you for telling me. |
| `ta` | சொன்னதற்கு நன்றி. | Thanks for telling me. |

### A2 · Local services · `services_aware`

**`aware.prompt`** · EN: *Have you heard about the health and wellness services available in your neighbourhood? (e.g. Active Health Labs, Start2Move, Active Ageing Centres)*

| | Translation | Back-translation |
|---|---|---|
| `ms` | Pernahkah anda mendengar tentang perkhidmatan kesihatan dan kesejahteraan di kejiranan anda? (cth. Active Health Lab, Start2Move, Pusat Penuaan Aktif) | Have you ever heard about the health and wellness services in your neighbourhood? (e.g. ...) |
| `zh` | 您听说过您社区里的健康与保健服务吗？（例如 Active Health Lab、Start2Move、活跃乐龄中心） | Have you heard of the health and wellness services in your community? (e.g. ...) |
| `ta` | உங்கள் அக்கம்பக்கத்தில் உள்ள சுகாதார மற்றும் நல்வாழ்வு சேவைகளைப் பற்றி கேள்விப்பட்டிருக்கிறீர்களா? (எ.கா. Active Health Lab, Start2Move, Active Ageing மையங்கள்) | Have you heard about the health and wellbeing services in your neighbourhood? (e.g. ...) |

**`aware.chip1`** · EN: *Yes, I have heard of them*

| | Translation | Back-translation |
|---|---|---|
| `ms` | Ya, saya pernah dengar | Yes, I have heard |
| `zh` | 听说过 | Have heard of them |
| `ta` | ஆம், கேள்விப்பட்டிருக்கிறேன் | Yes, I have heard |

**`aware.chip2`** · EN: *No, this is new to me* · ⚠️ must keep the "no" marker

| | Translation | Back-translation |
|---|---|---|
| `ms` | Tidak, ini baharu bagi saya | No, this is new to me |
| `zh` | 没有，我没听说过 | No, I have not heard of them |
| `ta` | இல்லை, இது எனக்குப் புதியது | No, this is new to me |

**`aware.ack`** · EN: *Noted.*

| | Translation | Back-translation |
|---|---|---|
| `ms` | Baik. | Alright. |
| `zh` | 好的。 | Okay. |
| `ta` | சரி. | Okay. |

### A3 · Referral history · `ever_referred`

**`referred.prompt`** · EN: *Has a doctor or another health professional ever referred you to a community health programme or an Active Health Lab?*

| | Translation | Back-translation |
|---|---|---|
| `ms` | Pernahkah doktor atau profesional kesihatan lain merujuk anda ke program kesihatan komuniti atau Active Health Lab? | Has a doctor or other health professional ever referred you to a community health programme or Active Health Lab? |
| `zh` | 医生或其他医疗专业人员曾经转介您到社区健康计划或 Active Health Lab 吗？ | Has a doctor or other medical professional ever referred you to a community health programme or Active Health Lab? |
| `ta` | மருத்துவர் அல்லது வேறு சுகாதார நிபுணர் உங்களை சமூக சுகாதாரத் திட்டத்திற்கோ Active Health Lab-க்கோ பரிந்துரைத்ததுண்டா? | Has a doctor or another health specialist ever recommended you to a community health scheme or Active Health Lab? |

**`referred.chip1`** · EN: *Yes, I was referred*

| | Translation | Back-translation |
|---|---|---|
| `ms` | Ya, saya pernah dirujuk | Yes, I have been referred |
| `zh` | 有，我被转介过 | Yes, I was referred |
| `ta` | ஆம், பரிந்துரைக்கப்பட்டேன் | Yes, I was recommended |

**`referred.chip2`** · EN: *No, never* · ⚠️ must keep the "no" marker

| | Translation | Back-translation |
|---|---|---|
| `ms` | Tidak, tidak pernah | No, never |
| `zh` | 没有，从来没有 | No, never |
| `ta` | இல்லை, ஒருபோதும் இல்லை | No, never at all |

**`referred.ack`** · EN: *Got it.*

| | Translation | Back-translation |
|---|---|---|
| `ms` | Baik. | Alright. |
| `zh` | 明白了。 | Understood. |
| `ta` | புரிந்தது. | Understood. |

### A4 · Your experience · `service_rating` · not asked of somebody who answered no to both A2 and A3

**`rating.prompt`** · EN: *If you have used community health services, how was your experience compared to a hospital?*

| | Translation | Back-translation |
|---|---|---|
| `ms` | Jika anda pernah menggunakan perkhidmatan kesihatan komuniti, bagaimana pengalaman anda berbanding di hospital? | If you have used community health services, how was your experience compared with at a hospital? |
| `zh` | 如果您使用过社区健康服务，与医院相比，您的体验如何？ | If you have used community health services, compared with a hospital, how was your experience? |
| `ta` | சமூக சுகாதார சேவைகளைப் பயன்படுத்தியிருந்தால், மருத்துவமனையுடன் ஒப்பிடும்போது உங்கள் அனுபவம் எப்படி இருந்தது? | If you have used community health services, compared with a hospital, how was your experience? |

**`rating.chip1`** · EN: *Better than hospital*

| | Translation | Back-translation |
|---|---|---|
| `ms` | Lebih baik daripada hospital | Better than a hospital |
| `zh` | 比医院好 | Better than a hospital |
| `ta` | மருத்துவமனையை விட சிறந்தது | Better than a hospital |

**`rating.chip2`** · EN: *About the same*

| | Translation | Back-translation |
|---|---|---|
| `ms` | Lebih kurang sama | About the same |
| `zh` | 差不多 | About the same |
| `ta` | சுமார் அதே | About the same |

**`rating.chip3`** · EN: *Needs improvement*

| | Translation | Back-translation |
|---|---|---|
| `ms` | Perlu diperbaiki | Needs improvement |
| `zh` | 需要改进 | Needs improvement |
| `ta` | மேம்பாடு தேவை | Needs improvement |

**`rating.chip4`** · EN: *Not applicable, have not used community services*

| | Translation | Back-translation |
|---|---|---|
| `ms` | Tidak berkenaan, belum guna perkhidmatan komuniti | Not applicable, have not used community services |
| `zh` | 不适用，未使用过社区服务 | Not applicable, have not used community services |
| `ta` | பொருந்தாது, சமூக சேவைகளை பயன்படுத்தவில்லை | Not applicable, did not use community services |

**`rating.ack`** · EN: *Thank you, that is useful to know.*

| | Translation | Back-translation |
|---|---|---|
| `ms` | Terima kasih, itu berguna untuk kami. | Thank you, that is useful for us. |
| `zh` | 谢谢，这对我们很有用。 | Thank you, this is useful to us. |
| `ta` | நன்றி, இது எங்களுக்கு பயனுள்ளது. | Thank you, this is useful to us. |

### A5 · Comfort with care · `care_comfort`

**`comfort.prompt`** · EN: *How comfortable and safe do you feel receiving health care in the community? 1 is not at all comfortable and 5 is very comfortable.*

| | Translation | Back-translation |
|---|---|---|
| `ms` | Sejauh mana anda berasa selesa dan selamat menerima penjagaan kesihatan dalam komuniti? 1 bermaksud tidak selesa langsung dan 5 bermaksud sangat selesa. | How comfortable and safe do you feel receiving health care in the community? 1 means not comfortable at all and 5 means very comfortable. |
| `zh` | 您在社区接受医疗照护时，觉得舒适和安心吗？1 表示完全不舒适，5 表示非常舒适。 | When receiving medical care in the community, do you feel comfortable and at ease? 1 means not comfortable at all, 5 means very comfortable. |
| `ta` | சமூகத்தில் சுகாதாரப் பராமரிப்பு பெறும்போது நீங்கள் எந்த அளவுக்கு வசதியாகவும் பாதுகாப்பாகவும் உணர்கிறீர்கள்? 1 என்றால் முற்றிலும் வசதியாக இல்லை, 5 என்றால் மிகவும் வசதியாக உள்ளது. | When receiving health care in the community, to what extent do you feel comfortable and safe? 1 means not comfortable at all, 5 means very comfortable. |

**`comfort.chip1`** · EN: *1, not at all comfortable*

| | Translation | Back-translation |
|---|---|---|
| `ms` | 1, tidak selesa langsung | 1, not comfortable at all |
| `zh` | 1，完全不舒适 | 1, not comfortable at all |
| `ta` | 1, முற்றிலும் வசதியாக இல்லை | 1, not comfortable at all |

**`comfort.chip5`** · EN: *5, very comfortable* · chips 2, 3 and 4 are bare digits in every language

| | Translation | Back-translation |
|---|---|---|
| `ms` | 5, sangat selesa | 5, very comfortable |
| `zh` | 5，非常舒适 | 5, very comfortable |
| `ta` | 5, மிகவும் வசதியானது | 5, very comfortable |

**`comfort.ack`** · EN: *Understood.*

| | Translation | Back-translation |
|---|---|---|
| `ms` | Difahami. | Understood. |
| `zh` | 了解。 | Understood. |
| `ta` | புரிந்தது. | Understood. |

### A6 · One thing to change · `one_change` · free text, one chip

**`change.prompt`** · EN: *If you could change one thing about health care in your neighbourhood, what would it be?*

| | Translation | Back-translation |
|---|---|---|
| `ms` | Jika anda boleh mengubah satu perkara tentang penjagaan kesihatan di kejiranan anda, apakah itu? | If you could change one thing about health care in your neighbourhood, what would it be? |
| `zh` | 如果您能改变社区医疗的一件事，那会是什么？ | If you could change one thing about community medical care, what would it be? |
| `ta` | உங்கள் அக்கம்பக்கத்தில் சுகாதார சேவையில் ஒரு விஷயத்தை மாற்ற முடிந்தால், அது என்னவாக இருக்கும்? | If one thing could be changed in health services in your neighbourhood, what would it be? |

**`change.chip1`** · EN: *Nothing comes to mind*

| | Translation | Back-translation |
|---|---|---|
| `ms` | Tiada yang terlintas | Nothing comes to mind |
| `zh` | 暂时想不到 | Cannot think of anything for now |
| `ta` | எதுவும் நினைவுக்கு வரவில்லை | Nothing comes to memory |

### A7 · Page 3 of the report, and the on-screen disclaimer · 2026-09-17

The governance page was English in every language. ⚠️ **`governance.disclaimer` is safety-critical and registered**: the build is red until a person reviews it or the owner waives it. Instrument names and acronyms stay in English on purpose.

**`governance.disclaimerHeading`** · EN: *Important medical disclaimer*

| | Translation | Back-translation |
|---|---|---|
| `ms` | Penafian perubatan penting |  |
| `zh` | 重要医疗免责声明 |  |
| `ta` | முக்கிய மருத்துவப் பொறுப்புத் துறப்பு |  |

**`governance.disclaimer`** · EN: *This NEXUS AURA report is an initial community health navigation tool and does not constitute medical advice, diagnosis, or a treatment plan. The physical activity recommendations are generated for educational and community navigation purposes only. Always consult a qualified healthcare professional or your Healthier SG GP before making significant changes to your lifestyle, diet, or exercise routine. If you are experiencing chest pain, dizziness, or any acute symptoms, please seek immediate medical attention.* · ⚠️ SAFETY-CRITICAL. The instruction to seek immediate medical attention must survive, as an instruction

| | Translation | Back-translation |
|---|---|---|
| `ms` | Laporan NEXUS AURA ini ialah alat navigasi kesihatan komuniti peringkat awal dan bukan nasihat perubatan, diagnosis, atau rancangan rawatan. Cadangan aktiviti fizikal dihasilkan untuk tujuan pendidikan dan navigasi komuniti sahaja. Sentiasa rujuk profesional kesihatan yang bertauliah atau doktor keluarga Healthier SG anda sebelum membuat perubahan besar kepada gaya hidup, pemakanan, atau rutin senaman anda. Jika anda mengalami sakit dada, pening, atau sebarang gejala mendadak, sila dapatkan rawatan perubatan segera. |  |
| `zh` | 本 NEXUS AURA 报告是一份初步的社区健康导航工具， 不构成医疗建议、诊断或治疗方案。其中的体力活动建议仅用于教育和社区导航目的。在对生活方式、饮食或运动习惯做出重大改变前，请务必咨询合格的医疗专业人员或您的 Healthier SG 家庭医生。如果您出现胸痛、头晕或任何急性症状，请立即就医。 |  |
| `ta` | இந்த NEXUS AURA அறிக்கை ஒரு தொடக்கநிலைச் சமூக சுகாதார வழிகாட்டிக் கருவி ஆகும்; இது மருத்துவ ஆலோசனை, நோயறிதல் அல்லது சிகிச்சைத் திட்டம் அல்ல. உடல் செயல்பாட்டுப் பரிந்துரைகள் கல்வி மற்றும் சமூக வழிகாட்டல் நோக்கங்களுக்காக மட்டுமே உருவாக்கப்படுகின்றன. உங்கள் வாழ்க்கை முறை, உணவு அல்லது உடற்பயிற்சி வழக்கத்தில் பெரிய மாற்றங்களைச் செய்யும் முன், தகுதியான சுகாதார நிபுணரை அல்லது உங்கள் Healthier SG குடும்ப மருத்துவரை எப்போதும் அணுகுங்கள். நெஞ்சு வலி, தலைச்சுற்றல் அல்லது திடீர் அறிகுறிகள் ஏதேனும் இருந்தால், உடனடியாக மருத்துவ உதவி பெறுங்கள். |  |

**`governance.evidenceHeading`** · EN: *Academic and evidence grounding*

| | Translation | Back-translation |
|---|---|---|
| `ms` | Asas akademik dan bukti |  |
| `zh` | 学术与证据依据 |  |
| `ta` | கல்வி மற்றும் சான்று அடிப்படை |  |

**`governance.evidence.1.label`** · EN: *Physical activity*

| | Translation | Back-translation |
|---|---|---|
| `ms` | Aktiviti fizikal |  |
| `zh` | 体力活动 |  |
| `ta` | உடல் செயல்பாடு |  |

**`governance.evidence.1.text`** · EN: *ACSM Physical Activity Vital Sign (PAVS), administered as published: 2 questions (days per week, minutes per session).*

| | Translation | Back-translation |
|---|---|---|
| `ms` | ACSM Physical Activity Vital Sign (PAVS), ditadbir seperti yang diterbitkan: 2 soalan (hari seminggu, minit setiap sesi). |  |
| `zh` | ACSM Physical Activity Vital Sign (PAVS)，按已发表的方式施测：2 个问题（每周天数、每次分钟数）。 |  |
| `ta` | ACSM Physical Activity Vital Sign (PAVS), வெளியிடப்பட்டபடி நிர்வகிக்கப்படுகிறது: 2 கேள்விகள் (வாரத்திற்கு நாட்கள், ஒரு அமர்வுக்கு நிமிடங்கள்). |  |

**`governance.evidence.2.label`** · EN: *National targets*

| | Translation | Back-translation |
|---|---|---|
| `ms` | Sasaran kebangsaan |  |
| `zh` | 全国目标 |  |
| `ta` | தேசிய இலக்குகள் |  |

**`governance.evidence.2.text`** · EN: *Sport Singapore Physical Activity Guidelines (SPAG): 150 to 300 mins/week moderate-intensity aerobic activity. A reference target, not an instrument.*

| | Translation | Back-translation |
|---|---|---|
| `ms` | Garis Panduan Aktiviti Fizikal Sport Singapore (SPAG): 150 hingga 300 minit seminggu aktiviti aerobik tahap sederhana. Sasaran rujukan, bukan instrumen. |  |
| `zh` | 新加坡体育理事会体力活动指南 (SPAG)：每周 150 至 300 分钟中等强度有氧活动。这是参考目标，不是测评工具。 |  |
| `ta` | Sport Singapore உடல் செயல்பாட்டு வழிகாட்டுதல்கள் (SPAG): வாரத்திற்கு 150 முதல் 300 நிமிடங்கள் மிதமான தீவிர ஏரோபிக் செயல்பாடு. ஒரு குறிப்பு இலக்கு, அளவீட்டுக் கருவி அல்ல. |  |

**`governance.evidence.3.label`** · EN: *Psychological wellbeing*

| | Translation | Back-translation |
|---|---|---|
| `ms` | Kesejahteraan psikologi |  |
| `zh` | 心理健康 |  |
| `ta` | உளவியல் நல்வாழ்வு |  |

**`governance.evidence.3.text`** · EN: *Single-item screen adapted from BPS-RS II Domain P22 (PHQ-2 aligned, 2-week timeframe). One item, not the two-item PHQ-2, and not separately validated in this form.*

| | Translation | Back-translation |
|---|---|---|
| `ms` | Saringan satu item diadaptasi daripada BPS-RS II Domain P22 (selari dengan PHQ-2, tempoh 2 minggu). Satu item, bukan PHQ-2 dua item, dan tidak disahkan secara berasingan dalam bentuk ini. |  |
| `zh` | 改编自 BPS-RS II 领域 P22 的单项筛查（与 PHQ-2 对应，时间范围 2 周）。仅一项，并非两项的 PHQ-2，且未以此形式单独验证。 |  |
| `ta` | BPS-RS II Domain P22 இலிருந்து தழுவிய ஒற்றை உருப்படித் திரையிடல் (PHQ-2 உடன் இணைந்தது, 2 வார காலம்). ஒரு உருப்படி மட்டுமே, இரண்டு உருப்படி PHQ-2 அல்ல, மேலும் இந்த வடிவத்தில் தனியாகச் சரிபார்க்கப்படவில்லை. |  |

**`governance.evidence.4.label`** · EN: *Social isolation*

| | Translation | Back-translation |
|---|---|---|
| `ms` | Pengasingan sosial |  |
| `zh` | 社会孤立 |  |
| `ta` | சமூகத் தனிமை |  |

**`governance.evidence.4.text`** · EN: *Single-item screen adapted from the Lubben Social Network Scale (LSNS-6). One item, not the six-item scale; LSNS-6’s published reliability does not transfer to it.*

| | Translation | Back-translation |
|---|---|---|
| `ms` | Saringan satu item diadaptasi daripada Lubben Social Network Scale (LSNS-6). Satu item, bukan skala enam item; kebolehpercayaan LSNS-6 yang diterbitkan tidak terpakai kepadanya. |  |
| `zh` | 改编自 Lubben Social Network Scale (LSNS-6) 的单项筛查。仅一项，并非六项量表；LSNS-6 已发表的信度不适用于此。 |  |
| `ta` | Lubben Social Network Scale (LSNS-6) இலிருந்து தழுவிய ஒற்றை உருப்படித் திரையிடல். ஒரு உருப்படி மட்டுமே, ஆறு உருப்படி அளவுகோல் அல்ல; LSNS-6 இன் வெளியிடப்பட்ட நம்பகத்தன்மை இதற்குப் பொருந்தாது. |  |

**`governance.evidence.5.label`** · EN: *Food insecurity*

| | Translation | Back-translation |
|---|---|---|
| `ms` | Ketidakcukupan makanan |  |
| `zh` | 食物保障 |  |
| `ta` | உணவுப் பற்றாக்குறை |  |

**`governance.evidence.5.text`** · EN: *Single-item screen adapted from the Lien Centre for Social Innovation Food Insufficiency Screen (2 items).*

| | Translation | Back-translation |
|---|---|---|
| `ms` | Saringan satu item diadaptasi daripada Lien Centre for Social Innovation Food Insufficiency Screen (2 item). |  |
| `zh` | 改编自 Lien Centre for Social Innovation 食物不足筛查（2 项）的单项筛查。 |  |
| `ta` | Lien Centre for Social Innovation உணவுப் பற்றாக்குறைத் திரையிடலிலிருந்து (2 உருப்படிகள்) தழுவிய ஒற்றை உருப்படித் திரையிடல். |  |

**`governance.evidence.6.label`** · EN: *Financial adequacy*

| | Translation | Back-translation |
|---|---|---|
| `ms` | Kecukupan kewangan |  |
| `zh` | 收入充足 |  |
| `ta` | வருமானப் போதுமை |  |

**`governance.evidence.6.text`** · EN: *Both pathways: 3-level screen adapted from the Duke-NUS Perceived Income Adequacy Scale, read alongside reported access barriers. Asked in the chat since 16 September 2026; before that the chat inferred it from barriers alone.*

| | Translation | Back-translation |
|---|---|---|
| `ms` | Kedua-dua laluan: saringan 3 tahap diadaptasi daripada Duke-NUS Perceived Income Adequacy Scale, dibaca bersama halangan akses yang dilaporkan. Ditanya dalam sembang sejak 16 September 2026; sebelum itu sembang menganggarkannya daripada halangan sahaja. |  |
| `zh` | 两种途径均采用：改编自 Duke-NUS Perceived Income Adequacy Scale 的三级筛查，并结合所报告的使用障碍。自 2026 年 9 月 16 日起在聊天中询问；此前聊天仅根据障碍推断。 |  |
| `ta` | இரு வழிகளிலும்: Duke-NUS Perceived Income Adequacy Scale இலிருந்து தழுவிய 3-நிலைத் திரையிடல், தெரிவிக்கப்பட்ட அணுகல் தடைகளுடன் சேர்த்து வாசிக்கப்படுகிறது. 2026 செப்டம்பர் 16 முதல் அரட்டையில் கேட்கப்படுகிறது; அதற்கு முன் அரட்டை தடைகளிலிருந்து மட்டுமே ஊகித்தது. |  |

**`governance.evidence.7.label`** · EN: *Housing risk*

| | Translation | Back-translation |
|---|---|---|
| `ms` | Risiko perumahan |  |
| `zh` | 住房风险 |  |
| `ta` | வீட்டு ஆபத்து |  |

**`governance.evidence.7.text`** · EN: *Self-reported HDB flat type, used as a social-risk proxy. Flat type is asked; tenure (rented or owned) is not.*

| | Translation | Back-translation |
|---|---|---|
| `ms` | Jenis flat HDB yang dilaporkan sendiri, digunakan sebagai proksi risiko sosial. Jenis flat ditanya; status milikan (sewa atau milik) tidak. |  |
| `zh` | 自报的组屋类型，用作社会风险的代理指标。询问的是房型，不询问租住或自有。 |  |
| `ta` | சுயமாகத் தெரிவிக்கப்பட்ட HDB வீட்டு வகை, சமூக ஆபத்துக்கான மாற்றுக் குறியீடாகப் பயன்படுத்தப்படுகிறது. வீட்டு வகை கேட்கப்படுகிறது; வாடகை அல்லது சொந்தம் என்பது கேட்கப்படுவதில்லை. |  |

**`governance.privacyHeading`** · EN: *Data governance and privacy*

| | Translation | Back-translation |
|---|---|---|
| `ms` | Tadbir urus data dan privasi |  |
| `zh` | 数据治理与隐私 |  |
| `ta` | தரவு ஆளுமை மற்றும் தனியுரிமை |  |

**`governance.privacyBody`** · EN: *All data collected through the NEXUS AURA system is de-identified at the point of capture. Postal sector data is used solely for geographic resource mapping and is not linked to any identifiable personal information. This assessment does not collect, store, or transmit NRIC, name, contact, or financial account information. Aggregated, anonymised data may be used to improve community health programming across Singapore.*

| | Translation | Back-translation |
|---|---|---|
| `ms` | Semua data yang dikumpul melalui sistem NEXUS AURA dinyahkenal pasti pada titik pengumpulan. Data sektor pos digunakan semata-mata untuk pemetaan sumber geografi dan tidak dikaitkan dengan sebarang maklumat peribadi yang boleh dikenal pasti. Penilaian ini tidak mengumpul, menyimpan, atau menghantar NRIC, nama, maklumat hubungan, atau maklumat akaun kewangan. Data agregat tanpa nama boleh digunakan untuk menambah baik program kesihatan komuniti di seluruh Singapura. |  |
| `zh` | 通过 NEXUS AURA 系统收集的所有数据在采集时即已去识别化。邮区数据仅用于地理资源定位，不与任何可识别的个人信息关联。本评估不收集、存储或传输身份证号码、姓名、联系方式或金融账户信息。汇总后的匿名数据可能用于改善新加坡各地的社区健康项目。 |  |
| `ta` | NEXUS AURA அமைப்பின் மூலம் சேகரிக்கப்படும் அனைத்துத் தரவும் சேகரிக்கும் இடத்திலேயே அடையாளம் நீக்கப்படுகிறது. அஞ்சல் துறைத் தரவு புவியியல் வளங்களை வரைபடமாக்க மட்டுமே பயன்படுத்தப்படுகிறது, எந்த அடையாளம் காணக்கூடிய தனிப்பட்ட தகவலுடனும் இணைக்கப்படுவதில்லை. இந்த மதிப்பீடு NRIC, பெயர், தொடர்பு அல்லது நிதிக் கணக்குத் தகவல்களைச் சேகரிக்கவோ, சேமிக்கவோ, அனுப்பவோ இல்லை. தொகுக்கப்பட்ட, பெயரற்ற தரவு சிங்கப்பூர் முழுவதும் சமூக சுகாதாரத் திட்டங்களை மேம்படுத்தப் பயன்படுத்தப்படலாம். |  |

**`governance.hsgTitle`** · EN: *Your Healthier SG Health Plan*

| | Translation | Back-translation |
|---|---|---|
| `ms` | Rancangan Kesihatan Healthier SG Anda |  |
| `zh` | 您的 Healthier SG 健康计划 |  |
| `ta` | உங்கள் Healthier SG சுகாதாரத் திட்டம் |  |

**`governance.hsgIntro`** · EN: *This assessment aligns with the Healthier SG framework. Enrol with a Healthier SG GP to receive a fully subsidised annual Health Plan consultation, personalised screening schedule, and community programme referrals.*

| | Translation | Back-translation |
|---|---|---|
| `ms` | Penilaian ini selaras dengan rangka kerja Healthier SG. Daftar dengan doktor keluarga Healthier SG untuk mendapat konsultasi Rancangan Kesihatan tahunan yang disubsidi sepenuhnya, jadual saringan peribadi, dan rujukan ke program komuniti. |  |
| `zh` | 本评估与 Healthier SG 框架一致。向 Healthier SG 家庭医生登记，即可获得全额补贴的年度健康计划咨询、个人化的筛查安排以及社区项目转介。 |  |
| `ta` | இந்த மதிப்பீடு Healthier SG கட்டமைப்புடன் ஒத்துப்போகிறது. முழுமையாக மானியம் பெற்ற ஆண்டுச் சுகாதாரத் திட்ட ஆலோசனை, தனிப்பயன் திரையிடல் அட்டவணை மற்றும் சமூகத் திட்டப் பரிந்துரைகளைப் பெற Healthier SG குடும்ப மருத்துவரிடம் பதிவு செய்யுங்கள். |  |

**`governance.hsgLinks.healthhub`** · EN: *Access your Health Plan and book screenings*

| | Translation | Back-translation |
|---|---|---|
| `ms` | Akses Rancangan Kesihatan anda dan tempah saringan |  |
| `zh` | 查看您的健康计划并预约筛查 |  |
| `ta` | உங்கள் சுகாதாரத் திட்டத்தை அணுகி, திரையிடல்களை முன்பதிவு செய்யுங்கள் |  |

**`governance.hsgLinks.activehealth`** · EN: *Find your nearest Active Health Lab*

| | Translation | Back-translation |
|---|---|---|
| `ms` | Cari Active Health Lab terdekat |  |
| `zh` | 查找最近的 Active Health Lab |  |
| `ta` | அருகிலுள்ள Active Health Lab ஐக் கண்டறியுங்கள் |  |

**`governance.hsgLinks.aic`** · EN: *Locate Active Ageing Centres for residents 60+*

| | Translation | Back-translation |
|---|---|---|
| `ms` | Cari Pusat Penuaan Aktif untuk warga 60+ |  |
| `zh` | 查找 60 岁以上居民的活跃乐龄中心 |  |
| `ta` | 60+ வயதினருக்கான Active Ageing மையங்களைக் கண்டறியுங்கள் |  |

**`governance.hsgLinks.pa`** · EN: *Search Healthier SG interest groups near you*

| | Translation | Back-translation |
|---|---|---|
| `ms` | Cari kumpulan minat Healthier SG berdekatan |  |
| `zh` | 查找附近的 Healthier SG 兴趣小组 |  |
| `ta` | அருகிலுள்ள Healthier SG ஆர்வக் குழுக்களைத் தேடுங்கள் |  |

### A8 · The 25 step labels above each chat question (`CP28`)

Topic names, not instructions. Emoji is added by the code.

| id | `en` | `ms` | `zh` | `ta` |
|---|---|---|---|---|
| `badge.pavs_days` | Physical Activity · Q1 of 2 | Aktiviti Fizikal · 1 dari 2 | 体力活动 · 第 1 题，共 2 题 | உடல் செயல்பாடு · 1 / 2 |
| `badge.pavs_mins` | Physical Activity · Q2 of 2 | Aktiviti Fizikal · 2 dari 2 | 体力活动 · 第 2 题，共 2 题 | உடல் செயல்பாடு · 2 / 2 |
| `badge.strength` | Strength Training | Latihan Kekuatan | 力量训练 | வலிமைப் பயிற்சி |
| `badge.demographics` | About You | Tentang Anda | 关于您 | உங்களைப் பற்றி |
| `badge.age_years` | Your Age | Umur Anda | 您的年龄 | உங்கள் வயது |
| `badge.medical` | Health & Safety Check | Semakan Kesihatan & Keselamatan | 健康与安全检查 | உடல்நலம் & பாதுகாப்பு |
| `badge.barriers` | Cost & Access | Kos & Akses | 费用与途径 | செலவு & அணுகல் |
| `badge.social` | Social Support | Sokongan Sosial | 社会支持 | சமூக ஆதரவு |
| `badge.food_insecurity` | Food Security | Keselamatan Makanan | 食物保障 | உணவுப் பாதுகாப்பு |
| `badge.income_adequacy` | Making Ends Meet | Mencukupi Perbelanjaan | 收支情况 | செலவுகளைச் சமாளித்தல் |
| `badge.wellbeing` | Mood & Wellbeing | Mood & Kesejahteraan | 情绪与身心健康 | மனநிலை & நல்வாழ்வு |
| `badge.falls` | Falls & Function (60+) | Jatuh & Keupayaan (60+) | 跌倒与活动能力 (60+) | விழுதல் & செயல்பாடு (60+) |
| `badge.ethnicity` | Cultural Background | Latar Belakang Budaya | 文化背景 | கலாச்சாரப் பின்னணி |
| `badge.housing_type` | Housing Environment | Persekitaran Perumahan | 居住环境 | வீட்டுச் சூழல் |
| `badge.postal_code` | Resource Mapping | Pemetaan Sumber | 资源定位 | வள வரைபடம் |
| `badge.healthier_sg` | Healthier SG | Healthier SG | Healthier SG | Healthier SG |
| `badge.grip_kg` | Grip Strength | Kekuatan Genggaman | 握力 | பிடி வலிமை |
| `badge.sit_to_stand` | Standing Up From a Chair | Bangun Dari Kerusi | 从椅子上站起 | நாற்காலியிலிருந்து எழுதல் |
| `badge.measure_setting` | Where It Was Measured | Di Mana Ia Diukur | 测量地点 | எங்கு அளக்கப்பட்டது |
| `badge.services_aware` | Local Services | Perkhidmatan Tempatan | 本地服务 | உள்ளூர் சேவைகள் |
| `badge.ever_referred` | Referral History | Sejarah Rujukan | 转介记录 | பரிந்துரை வரலாறு |
| `badge.service_rating` | Your Experience | Pengalaman Anda | 您的体验 | உங்கள் அனுபவம் |
| `badge.care_comfort` | Comfort With Care | Keselesaan Dengan Penjagaan | 照护舒适度 | பராமரிப்பில் வசதி |
| `badge.one_change` | One Thing To Change | Satu Perkara Untuk Diubah | 想改变的一件事 | மாற்ற வேண்டிய ஒன்று |
| `badge.previous_id` | NEXUS Record Linkage | Pautan Rekod NEXUS | NEXUS 记录关联 | NEXUS பதிவு இணைப்பு |

---

## Section B · existing strings that changed today

### B1 · New wording, meaning changed · review these

**`chat.pavs_mins_zero`** is the question asked after a resident answers "0 days". It did
not exist in Malay, Chinese or Tamil: those three asked "on those active days, how many
minutes do you usually exercise" to somebody who had just said zero.

**`chat.pavs_mins_zero`** · EN: *If you were to start being active, roughly how long do you think you could manage each session?*

| | Translation | Back-translation |
|---|---|---|
| `ms` | Jika anda mula aktif secara fizikal, lebih kurang berapa lama anda rasa anda mampu melakukannya setiap kali? | If you start being physically active, roughly how long do you feel you could manage each time? |
| `zh` | 如果您开始运动，您觉得每次大概可以坚持多久？ | If you start exercising, how long do you think you could keep going each time? |
| `ta` | நீங்கள் உடல் ரீதியாகச் சுறுசுறுப்பாக இருக்கத் தொடங்கினால், ஒவ்வொரு முறையும் தோராயமாக எவ்வளவு நேரம் சுறுசுறுப்பாக இருக்க முடியும் என நினைக்கிறீர்கள்? | If you start being physically active, roughly how much time do you think you could stay active each time? |

The two wellbeing chips were reworded in every language to lose the dash. The **caregiving** one must keep its marker word. These are chips four and five of the wellbeing question.

**`chat.wellbeing.chip4`** · EN: *Overwhelmed by caregiving* · ⚠️ must keep penjagaan / 照顾 / பராமரிப்பு

| | Translation | Back-translation |
|---|---|---|
| `ms` | Terbeban dengan tanggungjawab penjagaan | Burdened with caregiving responsibility |
| `zh` | 因照顾而感到不知所措 | Feeling overwhelmed because of caregiving |
| `ta` | பராமரிப்பால் அதிக சுமை | Heavy burden because of caregiving |

**`chat.wellbeing.chip5`** · EN: *Overwhelmed by financial pressure*

| | Translation | Back-translation |
|---|---|---|
| `ms` | Terbeban dengan tekanan kewangan | Burdened with financial pressure |
| `zh` | 因经济压力而感到不知所措 | Feeling overwhelmed because of financial pressure |
| `ta` | நிதி அழுத்தத்தால் அதிக சுமை | Heavy burden because of financial pressure |

The age question and its retry no longer suggest a number. The demographics question and Healthier SG question lost an opening word that duplicated the acknowledgement before them, and Healthier SG lost "last one", which it has not been since v2.13.0. Food security lost "one more question", which it is not.

**`chat.age_years`** · EN: *And how old are you? Please type your age in years.*

| | Translation | Back-translation |
|---|---|---|
| `ms` | Dan berapakah umur anda? Sila taip umur anda dalam tahun. | And what is your age? Please type your age in years. |
| `zh` | 请问您今年多大年纪？请输入您的年龄（岁）。 | May I ask how old you are this year? Please enter your age (years). |
| `ta` | உங்கள் வயது என்ன? உங்கள் வயதை ஆண்டுகளில் தட்டச்சு செய்யுங்கள். | What is your age? Please type your age in years. |

**`chat.ageRetry`** · EN: *Sorry, I could not read that as an age. Please type the number of years only.*

| | Translation | Back-translation |
|---|---|---|
| `ms` | Maaf, saya tidak dapat membaca itu sebagai umur. Sila taip bilangan tahun sahaja. | Sorry, I could not read that as an age. Please type the number of years only. |
| `zh` | 抱歉，我无法将它识别为年龄。请只输入岁数。 | Sorry, I could not recognise that as an age. Please enter the age in years only. |
| `ta` | மன்னிக்கவும், அதை வயதாக என்னால் படிக்க முடியவில்லை. ஆண்டுகளின் எண்ணிக்கையை மட்டும் தட்டச்சு செய்யுங்கள். | Sorry, I could not read that as an age. Type only the number of years. |

**`chat.demographics`** · EN: *Now two quick things about you, because the advice changes with both. First, are you male or female?*

| | Translation | Back-translation |
|---|---|---|
| `ms` | Sekarang dua perkara ringkas tentang anda, kerana nasihat berubah mengikut kedua-duanya. Pertama, adakah anda lelaki atau perempuan? | Now two brief things about you, because the advice changes according to both. First, are you male or female? |
| `zh` | 现在问两个关于您的简单问题，因为建议会随这两项而不同。首先，您是男性还是女性？ | Now two simple questions about you, because the advice differs with these two. First, are you male or female? |
| `ta` | இப்போது உங்களைப் பற்றி இரண்டு சிறிய கேள்விகள், ஏனெனில் இவ்விரண்டையும் பொறுத்து அறிவுரை மாறும். முதலில், நீங்கள் ஆணா அல்லது பெண்ணா? | Now two small questions about you, because the advice changes depending on both. First, are you male or female? |

**`chat.healthier_sg`** · EN: *Are you enrolled with a Healthier SG GP? It changes which programmes you can be referred to.*

| | Translation | Back-translation |
|---|---|---|
| `ms` | Adakah anda berdaftar dengan doktor keluarga Healthier SG? Ini mempengaruhi program yang boleh anda dirujuk untuk sertai. | Are you registered with a Healthier SG family doctor? This affects which programmes you can be referred to join. |
| `zh` | 您是否已向 Healthier SG 家庭医生登记？这会影响您可以被转介到哪些计划。 | Have you registered with a Healthier SG family doctor? This affects which programmes you can be referred to. |
| `ta` | நீங்கள் Healthier SG குடும்ப மருத்தவரிடம் பதிவு செய்துள்ளீர்களா? இதைப் பொறுத்து, உங்களை எந்தெந்தத் திட்டங்களுக்குப் பரிந்துரைக்கலாம் என்பது மாறும். | Have you registered with a Healthier SG family doctor? Depending on this, which schemes you can be recommended to will change. |

**`chat.food_insecurity`** · EN: *In the past 12 months, were there times when you were hungry but did not eat because you could not afford enough food?*

| | Translation | Back-translation |
|---|---|---|
| `ms` | Dalam 12 bulan yang lalu, pernahkah anda lapar tetapi tidak makan kerana tidak mampu membeli makanan yang cukup? | In the past 12 months, have you been hungry but not eaten because you could not afford enough food? |
| `zh` | 在过去 12 个月里，您是否因为买不起足够的食物而挨过饿？ | In the past 12 months, have you gone hungry because you could not afford enough food? |
| `ta` | கடந்த 12 மாதங்களில் உணவு வாங்க வசதியில்லாததால் பசியுடன் இருந்தும் சாப்பிடாத நேரங்கள் இருந்தனவா? | In the past 12 months, were there times you stayed hungry without eating because there was no means to buy food? |

### B2 · Punctuation only · review optional

These lost an em dash and nothing else. Meaning is unchanged from the machine
translation that was already live.

| id | `ms` | `zh` | `ta` |
|---|---|---|---|

| `chat.medical` | Adakah anda mempunyai sebarang penyakit kronik seperti darah tinggi, pradiabetes, atau penyakit jantung? Adakah anda pernah rasa sakit dada atau pening ketika aktif? | 您是否有任何慢性病，例如高血压、糖尿病前期或心脏病？运动时是否曾感到胸痛或头晕？ | உங்களுக்கு உயர் இரத்த அழுத்தம், நீரிழிவு முன்நிலை, அல்லது இதய நோய் போன்ற நாட்பட்ட நோய்கள் உள்ளதா? செயலில் இருக்கும்போது நெஞ்சு வலி அல்லது தலைச்சுற்றல் ஏற்படுகிறதா? |
| `chat.barriers` | Apakah cabaran utama anda untuk menggunakan perkhidmatan kesihatan komuniti? | 什么是您使用社区健康服务的主要障碍？ | சமூக சுகாதார சேவைகளை அணுகுவதில் உங்களின் முக்கிய தடை என்ன? |
| `chat.social` | Lebih kurang berapa ramai orang, keluarga atau rakan, yang boleh anda hubungi jika memerlukan bantuan? Adakah anda mempunyai seseorang untuk bercerita? | 大概有多少家人或朋友可以在您需要时提供帮助？您是否有可以倾心交谈的人？ | தோராயமாக எத்தனை குடும்பத்தினர் அல்லது நண்பர்கள் உங்களுக்கு உதவ முடியும்? நெருங்கி பேச யாரேனும் இருக்கிறார்களா? |
| `chat.wellbeing` | Dalam dua minggu lalu, bagaimana perasaan anda secara keseluruhan? Adakah anda berasa tertekan, murung, atau terbeban? | 在过去两周里，您的整体感觉如何？是否感到压力大、情绪低落或不知所措？ | கடந்த இரண்டு வாரங்களில் நீங்கள் எப்படி உணர்ந்தீர்கள்? மன அழுத்தம், மனச்சோர்வு, அல்லது அதிக சுமையாக உணர்ந்தீர்களா? |
| `chat.falls` | Dua soalan ringkas tentang keseimbangan. Dalam 12 bulan yang lalu, pernahkah anda jatuh, termasuk tergelincir atau tersandung sehingga jatuh ke tanah atau lantai? | 关于平衡的两个简短问题。在过去 12 个月里，您跌倒过吗？包括滑倒或绊倒而摔在地上的情况。 | சமநிலை குறித்த இரண்டு சிறிய கேள்விகள். கடந்த 12 மாதங்களில் நீங்கள் விழுந்ததுண்டா? வழுக்கியோ இடறியோ தரையில் விழுந்தது உட்பட. |
| `chat.previous_id` | Soalan terakhir. Adakah anda mempunyai ID Penilaian NEXUS yang sebelumnya? Jika ya, tampal di bawah. Jika tidak, pilih Tiada. | 最后一个问题。您是否有之前的 NEXUS 评估 ID？如有，请粘贴在下方；如没有，请选择"没有"。 | கடைசி கேள்வி. உங்களிடம் ஏற்கனவே NEXUS மதிப்பீட்டு ID உள்ளதா? இருந்தால் கீழே ஒட்டவும்; இல்லையெனில் "இல்லை" என்பதைத் தேர்ந்தெடுக்கவும். |
| `chat.reflection.food_insecurity` (yes) | Terima kasih kerana berkongsi. Ini akan diambil kira dalam rancangan anda. | 谢谢您告诉我这些，我们会将这点纳入您的健康计划中。 | பகிர்ந்ததற்கு நன்றி. இதை உங்கள் திட்டத்தில் கருத்தில் கொள்வோம். |
| `chat.reflection.previous_id` (no) | Baik, rekod baharu akan dimulakan. | 没问题，今天将为您建立新记录。 | பரவாயில்லை, புதிய பதிவை தொடங்குவோம். |

The result page's five summary lines (English reference first). The two activity lines were extended on 2026-09-16 to carry what the English says:

| id | `en` | `ms` | `zh` | `ta` |
|---|---|---|---|---|
| `result.sdohFinText` | Cost flagged as a barrier, so we have prioritised free and fully subsidised options below. | Kos dikenal pasti sebagai halangan. Pilihan percuma dan bersubsidi diutamakan di bawah. | 费用被标记为障碍，免费和全额补贴选项已优先列出。 | செலவு தடையாக கண்டறியப்பட்டது, இலவச மற்றும் மானிய விருப்பங்கள் முன்னுரிமை அளிக்கப்பட்டுள்ளன. |
| `result.sdohSocText` | Social connection flagged, so community group and befriending resources have been included. | Hubungan sosial dikenal pasti. Sumber kumpulan komuniti dan rakan disertakan. | 社会联系被标记，已包含社区团体和交友资源。 | சமூக தொடர்பு கண்டறியப்பட்டது, சமூக குழு மற்றும் நட்பு வளங்கள் சேர்க்கப்பட்டுள்ளன. |
| `result.sdohPsychoText` | Mental wellbeing flagged, so emotional wellness and counselling resources have been added. | Kesejahteraan mental dikenal pasti. Sumber sokongan emosi dan kaunseling ditambah. | 心理健康被标记，已添加情感支持和心理辅导资源。 | மன நலன் கண்டறியப்பட்டது, உணர்ச்சி ஆதரவு வளங்கள் சேர்க்கப்பட்டுள்ளன. |
| `result.pavsBelowDesc` | Below 150 mins/week. The Singapore Physical Activity Guidelines recommend at least 150 mins of moderate activity per week. | Di bawah 150 minit seminggu. Garis Panduan Aktiviti Fizikal Singapura mengesyorkan sekurang-kurangnya 150 minit aktiviti berintensiti sederhana seminggu. | 低于 150 分钟/周，新加坡体力活动指南建议每周至少进行 150 分钟的中等强度活动。 | வாரத்திற்கு 150 நிமிடங்களுக்கும் குறைவு. சிங்கப்பூர் உடல் செயல்பாட்டு வழிகாட்டுதல்கள் வாரத்திற்கு குறைந்தது 150 நிமிடங்கள் மிதமான தீவிர உடல் செயல்பாட்டைப் பரிந்துரைக்கின்றன. |
| `result.pavsActiveDesc` | Excellent. You exceed the national recommendation of 300 mins/week. Focus on maintaining quality and adding variety. | Cemerlang. Anda melebihi cadangan kebangsaan sebanyak 300 minit seminggu. Kekalkan aktiviti yang berkualiti dan tambah kepelbagaian. | 很好，您的活动量超过了每周 300 分钟的全国建议。请保持活动质量，并增加活动种类。 | சிறப்பு. வாரத்திற்கு 300 நிமிடங்கள் என்ற தேசியப் பரிந்துரையை நீங்கள் தாண்டியுள்ளீர்கள். செயல்பாடுகளின் தரத்தைப் பேணுவதிலும் பல்வேறு வகைகளைச் சேர்ப்பதிலும் கவனம் செலுத்துங்கள். |

The conventional form: the wellbeing chips (same marker rule as `chat.wellbeing.chip4`), the "not applicable" rating option, and the housing options that now match the chat.

| id | `en` | `ms` | `zh` | `ta` |
|---|---|---|---|---|
| `form.Overwhelmed by caregiving` | Overwhelmed by caregiving | Terbeban dengan tanggungjawab penjagaan | 因照顾而感到不知所措 | பராமரிப்பால் அதிக சுமை |
| `form.Overwhelmed by financial pressure` | Overwhelmed by financial pressure | Terbeban dengan tekanan kewangan | 因经济压力而感到不知所措 | நிதி அழுத்தத்தால் அதிக சுமை |
| `form.HDB 1-2 Room` | HDB 1 to 2 Room (rental) | HDB 1–2 Bilik (sewa) | 组屋 1–2 房（租赁） | HDB 1–2 அறைகள் (வாடகை) |
| `form.HDB 3 Room` | HDB 3 Room | HDB 3 Bilik | 组屋 3 房 | HDB 3 அறை |
| `form.HDB 4 Room` | HDB 4 Room | HDB 4 Bilik | 组屋 4 房 | HDB 4 அறை |
| `form.HDB 5 Room / Exec` | HDB 5 Room / Executive | HDB 5 Bilik / Eksekutif | 组屋 5 房 / 执行组屋 | HDB 5 அறை / எக்ஸிகியூட்டிவ் |
| `form.Condo / Private` | Condo / Private apartment | Kondo / Pangsapuri | 私人公寓 | காண்டோ / தனியார் அபார்ட்மெண்ட் |
| `form.Landed` | Landed property | Rumah Landed | 有地住宅 | நிலம் உள்ள வீடு |
| `form.rating.notApplicable` | Not applicable, have not used community services | Tidak berkenaan, belum guna perkhidmatan komuniti | 不适用，未使用过社区服务 | பொருந்தாது, சமூக சேவைகளை பயன்படுத்தவில்லை |

---

## Model review round 1 · 2026-09-16 · what was applied and what was not

Two models were run over this material by the owner. Recorded here the way
`copyReview.js` records its cross-checks: as evidence, not review, and with the
disagreements kept.

**ChatGPT, over revision 1 of this pack.** Its headline finding was the pack's own
error (the wellbeing rows, above), not a translation fault. Of its wording
suggestions, **applied**: `aware.chip2` zh (没有，我没听说过); the three `aware.ack`
lines, which read as database status rather than speech; `rating.prompt` in all three
languages, which had narrowed "community health services" to "community services";
`rating.chip4` ms, which did not say what had not been used; `comfort.prompt` zh and ta
and `comfort.chip1` ta, where an endpoint said "not at all" of nothing;
`chat.pavs_mins_zero` ms and ta, which had narrowed "being active" to exercise;
`result.pavsBelowDesc` ms and ta and `result.pavsActiveDesc` in all three, which had
dropped "moderate activity" and the whole "maintain quality and add variety" sentence
that the English carries. Every marker word was confirmed present after the edits by
the tests that read them.

**Gemini, over `CD13-translation-review.xlsx`.** That workbook is not this pack, and
its "as shipped" column is the text from before 2026-09-13. Every one of its six
findings had already been adjudicated on that date and is recorded in
`copyReview.js` `CROSS_CHECKS`: "Tiada jatuh" was changed to "Tidak pernah jatuh"
then; "GP" was deliberately replaced with "doktor keluarga" as an unexplained
abbreviation, so standardising back to "GP" reverses a considered decision; the
Malay and Chinese avoidance chips and "Beban" were declined as one model's fluency
preference against another's, with no error identified; and the Tamil slip line was
reversed to the respectful human form (`விழுந்துள்ளார் … தவிர்க்கிறார்`), which is
neither the shipped form Gemini quotes nor the verbal noun it proposes. **Nothing
applied.** The workbook should be retired or regenerated before it is used again.

## How to return this

Three columns, keep the **id**. Where a string carries a marker word (the table at
the top), say explicitly that the marker is still present.

## What the reviewer is checking for

The instruction below was written for a model round. The rounds are closed; the
criteria are unchanged and are what a native reader is asked to apply.

> You are reviewing machine translations for a Singapore community health screening
> read mostly by people over 60 on a phone. For each row below, compare the Malay,
> Chinese (Simplified) and Tamil against the English and the back-translation.
> Report only rows where the translation changes the meaning, uses a register a
> stranger would not use to an older person, or would be misread. Do not rewrite
> rows that are merely stylistic. Never use an em dash in a suggestion. Use British
> spelling. Where a row is marked "must keep", confirm the marked word is present in
> your suggestion and say so. Return a table with columns: id, language, problem,
> suggested wording, marker present (yes / no / not applicable).

Sections A and B1 are the ones to read; B2 is punctuation only.
