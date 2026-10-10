# دليل Phase 00 — 2026-10-10

## النتيجة الحالية

**No-go لبدء Phase 01 حاليًا.** أصبحت contracts، harness، الاختبارات، والتجربة القابلة لإعادة التشغيل موجودة. لكن Q05/Q06 لم تكتمل بعد، وQ10 لم يُقَس، ونتيجة B لم تمر validation parity بعد. لذلك لا يوجد دليل يبرر إعلان renderer إنتاجي أو دعم 60 دقيقة/4 ساعات/4K.

## البيئة

المواصفات التفصيلية في [environment.json](environment.json): Windows 10 Pro 10.0.19045، Intel i7-4910MQ (4 cores/8 logical)، RAM مرئية 15.9GiB، Intel HD Graphics 4600، قرص HGST HDD 500GB وLITEON mSATA 256GB. المساحة الحرة وقت الفحص كانت نحو 15.3GiB على D. Node v24.16.0، npm 11.13.0، FFmpeg/FFprobe N-122319-gf6a95c7eb7-20251231. Remotion/React 4.0.518/19.1.0. الجهاز لا يملك GPU encoder مثبتًا تم تفعيله هنا؛ التجربة تستخدم software libx264، وChromium swangle/disable GPU.

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

آخر A قصير تحقق من: decode كامل، 360 frames، Arabic/English frame parity في 12 نقطة (MAE/PSNR pass بعد تصحيح direction)، audio marker offsets = 0ms في البداية/الوسط/النهاية. `validate.ts` يقفل نفسه على short fixtures عمدًا؛ التقرير الكامل في `artifacts/real-A-cold-2026-10-10T14-50-17-338Z/`.

بقي اختلاف تقني: FFmpeg يكتب بعد mux `duration=12.000312` و`avg_frame_rate=1152000/38401` رغم 360 frame وCFR samples؛ `setts` مع track timescale حسّن timestamps إلى 12.000000 في تجربة مستقلة لكنه لم يُعَد تشغيل validation النهائية بعد آخر تعديل. لذلك نسجل parity كـ**مرشح قوي، لا gate مكتمل**.

## A مقابل B

B أسرع في العينة القصيرة (~1.7× باردًا، ~6.6× دافئًا) وذاكرته أقل (~25% باردًا، ~60% دافئًا)، لكنه يستهلك scratch أكبر في cold (~5×) ويضيف segments/concat وalpha scene artifacts. B فشل parity في late graphic boundary رغم نجاح metadata/timing/audio؛ هذا يمنع اعتماده. هذه نتيجة engineering signal فقط: لا تصلح لاختيار نهائي قبل Q05/Q06 وإصلاح/إعادة تحقق B. A أبسط دلاليًا لأن Player/export يشتركان composition؛ B يحتاج parity لكل حدود clip/layout/scene والصوت.

لم نبدأ Q05/Q06 كاملين داخل هذه الجولة لأنهما workload حقيقيان قد يستغرقان ساعات على هذا الجهاز. هذا **تأجيل بقياس معلن**، وليس تصغيرًا صامتًا. أوامر التشغيل الأصلية محفوظة في [harness README](../../experiments/render-feasibility/README.md). `benchmark.ps1` يمرر الأحمال كاملة، والمهلة تُسجل فشلًا censored. لا توجد نتيجة مكتملة Q05/Q06/Q10 حتى الآن.

## القرار والقيود

لا أثبت renderer production. أحتفظ بـA كمسار أولي للمقارنة semantics وB كمسار أداء تجريبي مرشح، وأوصي بإكمال Q05/Q06 على جهاز بمساحة مؤقتة أكبر قبل ADR-04 النهائي. دعم 4K، VFR، drift، source roles، transcription، history الكامل، recovery/lease، database/jobs، templates الكبيرة، وexport publishing مؤجلة لمراحلها.

الدليل يحقق وجود harness وعقد قابلين للتشغيل، لكنه لا يحقق exit gate. لا تُعلّم Phase 00 أو Phase 01 tasks مكتملة بناءً على build أو فيديو قصير فقط.
