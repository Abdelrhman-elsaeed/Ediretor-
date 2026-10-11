# دليل Phase 00 — 2026-10-10

## النتيجة الحالية

**تحديث اتجاه العمل — 2026-10-11:** أوقف المستخدم جولة benchmarking وأجّل renderer qualification، وسمح بتنفيذ Phase 01 دون انتظارها. نتيجة الجودة تبقى NO-GO/غير مكتملة؛ لم تُحوّل إلى نجاح. نجح التحقق القصير لـA وB بعد إصلاح cache الجرافيك، لكن Q05/Q06 لم تكتمل وQ10 parity فشلت. التفاصيل في [متابعة 11 أكتوبر](phase-00-followup-2026-10-11.md). لا نعلن دعم 60 دقيقة/4 ساعات/مصادر 4K. الجداول القديمة أدناه تاريخية وتحفظ أدلة الفشل السابقة.

## البيئة

المواصفات التفصيلية في [environment.json](environment.json): Windows 10 Pro 10.0.19045، Intel i7-4910MQ (4 cores/8 logical)، RAM مرئية 15.9GiB، Intel HD Graphics 4600، قرص HGST HDD 500GB وLITEON mSATA 256GB. ملف البيئة يسجل 53,875,548,160 bytes حرة (50.18GiB) على D؛ رقم 15.3GiB المذكور سابقًا في النص كان غير مطابق للـJSON. Node v24.16.0، npm 11.13.0، FFmpeg/FFprobe N-122319-gf6a95c7eb7-20251231. Remotion/React 4.0.518/19.1.0. الجهاز لا يملك GPU encoder مثبتًا تم تفعيله هنا؛ التجربة تستخدم software libx264، وChromium swangle/disable GPU.

## fixtures والعقد

[fixtures.json](fixtures.json) و`experiments/render-feasibility/generated/snapshots.json` يسجلان IDs وhashes. `real` مبني من MDN CC0 flower.mp4 مكررًا إلى 16s مع صوت pulse اصطناعي وعلامة frame؛ `markers` اصطناعي كامل؛ Q05 = 60min/108000 frames/500 cuts/100 graphics؛ Q06 = 4h/432000 frames/مشهدان sparse؛ Q10 = 12s 3840×2160 synthetic output evaluation. لا ندعي أن real يثبت Arabic speech أو أن Q10 يثبت 4K source decode. الخط/font licenses داخل [ATTRIBUTION](../../experiments/render-feasibility/ATTRIBUTION.md).

## الأوامر والاختبارات

```powershell
npm ci
npm run fixtures
npm run typecheck
npm test
```

النتيجة: **105 tests / 6 files passed** في V2. الوحدات المنقولة واختباراتها الأصلية شغلت في القديم على Vitest 3.2.7: **232 passed / 1 failed**؛ الفشل الوحيد Chrome startup timeout في export worker test، مسجل في [legacy audit](../legacy-reuse-audit.md). لا توجد runtime imports للقديم.

## الرندر القصير

الإعداد المشترك: 1920×1080، 30/1، H264/libx264 CRF18 veryfast yuv420p، AAC 192k/48k/stereo، software. كل run يكتب تقريره وmetrics إلى `artifacts/<run-id>`، ونسخة report إلى docs/evidence.

| Run | المدة | wall | RTF مكتمل | peak tree WS | peak run disk | النتيجة |
|---|---:|---:|---:|---:|---:|---|
| A cold قبل clock fix | 12s | 185.1s | 15.42 | 2.58GB | 23.5MB | artifact تاريخي؛ audio +43ms، parity فاشل |
| B cold قبل clock fix | 12s | 61.2s | 5.10 | 1.94GB | 95.7MB | artifact تاريخي؛ يحتاج validation بعد mux |
| A cold بعد PCM/clock/RTL fixes | 12s | 106.5s | 8.88 | 2.59GB | 18.7MB | frames/audio pass في validation؛ container avg frame-rate/duration يحتاج ضبطًا إضافيًا |
| A warm بعد نفس الإصلاحات | 12s | 114.2s | 9.52 | 2.33GB | 21.5MB | rendered؛ لم يمر validation |
| B cold مع graphics cache | 12s | 60.9s | 5.08 | 1.94GB | 92.5MB | metadata/timing/audio pass؛ late graphic boundary فشل parity (MAE 26.37) |
| B warm مع graphics cache | 12s | 17.4s | 1.45 | 0.92GB | 9.7MB | rendered؛ لم يمر validation |

أُعيد تشغيل `npm.cmd run validate -- artifacts/real-A-cold-2026-10-10T14-50-17-338Z` بعد clock filter وtrack timescale الحاليين. النتيجة: **metadataPass=true، durationError=0، avg frame-rate=30/1، 360/360 frames، timingMaxError≈0.33µs، full decode، parity 12/12، audio offsets 0ms، pass=true**. `validate.ts` يقفل نفسه على short fixtures عمدًا؛ التقرير القابل للتتبع في `docs/evidence/real-A-cold-2026-10-10T14-50-17-338Z-validation.json`.

هذا يحسم CFR/container للعينة القصيرة A فقط. لا يثبت Q05/Q06 أو 4K مكتملة، ولا يثبت قرار renderer الإنتاجي.

## A مقابل B

المقارنة التاريخية أعلاه أظهرت B أسرع لكنها استخدمت cache معيبًا، لذلك لا تُستخدم نسبها لاختيار renderer. بعد إصلاح cache نجح B القصير في parity وmetadata/audio؛ القياسات الجديدة مسجلة في متابعة 11 أكتوبر. A أبسط دلاليًا لأن Player/export يشتركان composition؛ B يحتاج parity لكل حدود clip/layout/scene والصوت، وإكمال Q05/Q06 يبقى مطلوبًا لاختيار نهائي.

### تشخيص B — 2026-10-11

فشل frame 329 في العينة القديمة بـMAE=26.37 وPSNR=14.83. فرضية seek الأولى لم تثبت: المحاولتان `real-B-cold-2026-10-11T04-12-54-438Z` و`real-B-warm-2026-10-11T04-16-08-373Z` بقيتا فاشلتين، والثانية أضافت فشلًا في نقاط أخرى. أُعيدت تغييرات seek/frame count إلى الأصل وحُفظت تقارير التجربتين.

السبب المثبت بفحص cache: ملف ProRes «الجرافيك» كان يحتوي الفيديو كاملًا مع alpha معتمة؛ `renderMedia.inputProps` لا يغير `composition.props` المحسوبة من `selectComposition`. إعادة استعمال أول مشهد جرافيك كانت تغطي تخطيط inset المتأخر بفيديو full-frame أقدم. الإصلاح يختار composition مستقلة بـ`graphicsOnly:true`، ويستخدم cache version 2 لمنع إعادة استعمال الملفات القديمة، ويتحقق من شفافية الركن غير المرسوم في كل إطار قبل نشر cache. تفاصيل API تؤكدها [وثائق Remotion](https://www.remotion.dev/docs/4-0-migration).

التحقق بعد الإصلاح: `real-B-cold-2026-10-11T04-21-54-888Z` نجح في 12/12 نقاط دون frame tolerance، وفي metadata/full decode/audio. Frame 329: MAE=1.964 وPSNR=38.480؛ wall=31.872s، RTF=2.656، peak tree WS=1,578,127,360 bytes، peak run disk=20,245,620 bytes. هذا نجاح عينة قصيرة فقط.

في الجولة الأصلية 2026-10-10 لم تُشغّل Q05/Q06/Q10. في المتابعة شُغلت snapshots الكاملة بمهل صريحة؛ `deadline_exceeded` لا تعني اكتمال workload. أوامر التشغيل والنتائج الجديدة في متابعة 11 أكتوبر و[harness README](../../experiments/render-feasibility/README.md).

## قياس workloads في 2026-10-11

شُغّل الأمر الموجود في الـharness كما هو:

```powershell
powershell -NoProfile -File experiments/render-feasibility/scripts/benchmark.ps1 -DeadlineSeconds 120
```

اكتملت محاولات A الباردة والدافئة لـQ05 وQ06 وQ10 من حيث تسجيل التقرير، لكن جميعها censored عند مهلة 120 ثانية؛ لم يُحوَّل أي منها إلى RTF مكتمل. أُوقف التسلسل بعد بدء Q05/B البارد لأن B لديه فشل parity موثق في العينة القصيرة، ولأن تشغيل workloads الطويلة لذلك المرشح لا يضيف دليل قبول قبل إصلاح parity.

| Run | output | wall | rendered frames at deadline | peak tree WS | peak run disk | result |
|---|---:|---:|---:|---:|---:|---|
| Q05 A cold | 60 min | 120.39s | 233 / 108000 | 2.09 GiB | 45.7 MiB | deadline_exceeded |
| Q05 A warm | 60 min | 120.46s | 410 / 108000 | 2.08 GiB | 62.2 MiB | deadline_exceeded |
| Q06 A cold | 4 h | 120.80s | 303 / 432000 | 2.66 GiB | 108.3 MiB | deadline_exceeded |
| Q06 A warm | 4 h | 120.61s | 371 / 432000 | 2.63 GiB | 58.4 MiB | deadline_exceeded |
| Q10 A cold | 12 s / 3840×2160 | 120.55s | 181 / 360 | 2.07 GiB | 55.3 MiB | deadline_exceeded |
| Q10 A warm | 12 s / 3840×2160 | 120.33s | 251 / 360 | 1.90 GiB | 66.7 MiB | deadline_exceeded |

التقارير الكاملة القابلة للتتبع هي `docs/evidence/Q05-A-cold-2026-10-11T03-52-10-949Z.json`، `Q05-A-warm-2026-10-11T03-54-12-046Z.json`، `Q06-A-cold-2026-10-11T03-56-14-074Z.json`، `Q06-A-warm-2026-10-11T03-58-16-090Z.json`، `Q10-A-cold-2026-10-11T04-00-18-307Z.json`، و`Q10-A-warm-2026-10-11T04-02-19-447Z.json`. هذه النتائج تثبت سلوك الحماية والذاكرة المقاسة خلال أول دقيقتين فقط؛ لا تثبت دعم الساعة أو الأربع ساعات أو اكتمال 4K.

## القرار والقيود

لا أثبت renderer production. أحتفظ بـA كمسار أولي للمقارنة semantics وB كمسار أداء تجريبي مرشح، وأوصي بإكمال Q05/Q06 على جهاز بمساحة مؤقتة أكبر قبل ADR-04 النهائي. دعم 4K، VFR، drift، source roles، transcription، history الكامل، recovery/lease، database/jobs، templates الكبيرة، وexport publishing مؤجلة لمراحلها.

الدليل يحقق وجود harness وعقد قابلين للتشغيل، لكنه لا يحقق exit gate. لا تُعلّم Phase 00 أو Phase 01 tasks مكتملة بناءً على build أو فيديو قصير فقط.
