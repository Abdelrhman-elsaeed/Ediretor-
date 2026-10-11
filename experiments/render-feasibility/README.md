# تجربة جدوى الرندر — Phase 00

تجربة مستقلة في الريبو الجديد: media حقيقية/اصطناعية → snapshot ثابتة → React Player → A أو B → تحقق الميديا. ليست محرر Phase 01. نتيجة البوابة والقياسات الفعلية في [دليل المرحلة](../../docs/evidence/phase-00.md).

تحديث 2026-10-11: أوقف المستخدم جولة benchmarking وأجّل renderer qualification. تُحفظ التجربة والأدلة؛ لا تستأنف الأحمال الطويلة تلقائيًا. التطبيق الفعلي في apps/web وapps/api وapps/worker، ويُشغل بـ `npm.cmd run dev` حسب README الرئيسي. Figma مُلغى؛ quality gate السابقة لم تُحوّل إلى نجاح.

## التشغيل على Windows

تحتاج Node.js 22+، npm، وFFmpeg/ffprobe على PATH مع libx264. التشغيل المرجعي Node 24.16.0 على Windows 10. لا DB أو Redis أو Docker أو API keys.

```powershell
npm ci
npm run fixtures
npm run typecheck
npm test
npm run preview
```

افتح `http://127.0.0.1:3100`، واختر real أو markers أو Q05/Q06/Q10. `npm run studio` يشغّل Remotion Studio على 3101 إن احتجت timeline/seek. التحميل الأول يجلب عينة CC0 وخط Noto بإصدارات/تجزئات مثبتة، وRemotion يجلب متصفحه عند أول render. بعد التجهيز تعمل التجربة محليًا.

من terminal أخرى، والمعاينة ما زالت تعمل:

```powershell
npm run render -- real A cold 600
npm run render -- real A warm 600
npm run render -- real B cold 600
npm run render -- real B warm 600
npm run validate -- artifacts/<run-id>
```

آخر وسيط مهلة التنفيذ **بالثواني**. `render` يكتب `rendered_unvalidated` فقط؛ نجاحه ليس نجاح quality gate. `validate` يفحص الملف الناتج ويفشل عند اختلاف المعايير. يكتب التقرير JSON القابل للتتبع داخل docs/evidence، بينما الميديا واللقطات والـlogs والـmetrics التفصيلية داخل artifacts المستبعد من Git. لا نشر ولا commits تلقائية.

## الأحمال والقياس

```powershell
powershell -NoProfile -File experiments/render-feasibility/scripts/benchmark.ps1 -DeadlineSeconds 120
powershell -NoProfile -File experiments/render-feasibility/scripts/benchmark.ps1 -Candidates B -DeadlineSeconds 120
# Re-run only the short 4K output evaluation with time to complete:
powershell -NoProfile -File experiments/render-feasibility/scripts/benchmark.ps1 -Candidates A -Fixtures Q10 -DeadlineSeconds 600
# مثال تشغيل كامل لاحقًا مع ميزانية زمنية صريحة لكل run:
npm run render -- Q05 A cold 14400
npm run render -- Q06 B cold 43200
```

كل محاولة تستقبل snapshot كاملة: Q05 = 108000 إطار/60 دقيقة، 500 قصّة و100 موضع جرافيك؛ Q06 = 432000 إطار/4 ساعات ومشهدان مدة كل منهما ثانيتان مع فراغ طويل. لا يتم تصغير المدة عند المهلة. نتيجة `deadline_exceeded` عينة قياس مبتورة وفشل إكمال، و`completedRtf=null`؛ لا يجوز تحويل تقدم أول دقيقتين إلى نجاح ساعة/أربع ساعات. زمن `elapsedOverRequestedDuration` ليس RTF مكتملًا.

Q10 عينة **خرج** 3840×2160 لمدة 12 ثانية بمصدر اصطناعي 1080p مرفوع الدقة؛ لا تثبت فك ترميز مصدر 4K ولا النص العربي الكثيف في Q10 الكامل. عينة real تصوير زهرة فعلية مكررة، وصوتها علامات مولدة؛ ليست Q01 شرحًا عربيًا. Q07/VFR وdrift والسلوك مع تعدد المصادر مؤجلة وغير مدعومة بهذه التجربة.

الإعدادات المشتركة: 30/1fps، H264/libx264، CRF18، veryfast، yuv420p، AAC 192k/48k/stereo. A يستخدم FFmpeg المرفق بـRemotion للفيديو وFFmpeg النظام لترميز PCM إلى AAC مرة واحدة؛ B يستخدم FFmpeg النظام للميديا. لا ادعاء تطابق encoder builds/bytes. GPU غير مفعل؛ swangle للرسم وsoftware decode/encode. عدد صفحات Remotion المتوازية 2؛ ترميز أجزاء B يستخدم خيطين.

القياس Windows process tree working set كل نحو ثانيتين؛ ليس allocated/private memory ولا إجمالي الجهاز، وقد يفوّت spikes أقصر. scratch includes intermediates/output داخل run، والـshared cache يُقاس منفصلًا. لا نقيس page cache في نظام التشغيل. cold يعيد بناء bundle ورندر الجرافيك الخاص بالمحاولة؛ warm يعيد استخدامها. آخر نسخة كود تستخدم buildHash للمصادر وlockfile.

حدود حماية التجربة: 8GiB working set، 6GiB scratch، توقف إن نزلت المساحة الحرة تحت 2GiB، وdeadline صريحة. تتوقف شجرة **المحاولة نفسها** فقط. تبقى الملفات الجزئية والأدلة للمراجعة؛ لا تعتبر output ناجحًا إلا بعد validate. لا يوجد durable queue أو recovery إنتاجي في هذه المرحلة.

## العقود وما جرى تكييفه

- domain مستقل عن React/I/O. bigint للميكروثانية؛ strings في JSON؛ fps rational. قص occurrence يحفظ الأصل ويولد IDs ثابتة مشتقة من command.
- snapshot تشمل جميع clips/layouts/graphics وhashes المصدر والصورة والخط، schema/template/renderer versions. إعادة التصدير تفحص hashes.
- A composition مشتركة بين Player والرندر. الصوت يخرج PCM ثم AAC مرة واحدة لتجنب تأخير AAC المقاس. تصحيح clock على grid عند mux يمنع تقريب timestamps إلى millisecond من تلويث CFR.
- B يقسم عند حدود clip/layout/graphic، يرندر فقط المشاهد النشطة مع alpha ويعيد استعمال المشهد المتطابق؛ لا ProRes بطول فراغ الأربع ساعات. يصدّر المقاطع ثم يجمعها؛ كلفة تشغيل FFmpeg لكل segment وملفات PCM الوسيطة جزء من التجربة، وليست pipeline إنتاجية محسنة.
- strict runtime validation وحدود المصدر وIDs وحظر unknown fields. full project persistence/history/transactions/transcription/templates deferred لمراحلها.

## معنى التحقق

Graphics cache v2 resolves a separate composition with `graphicsOnly: true` before rendering. Changing `renderMedia.inputProps` alone does not change the resolved `composition.props`. Older cache keys are deliberately not reused. Before publishing a newly rendered cache entry, `graphics-alpha.ts` decodes every frame and checks that the template's unpainted corner is fully transparent and the frame count matches. A reproducible regression command is `node --import tsx experiments/render-feasibility/scripts/validate-graphics.ts <cache.mov> 60`; it rejects the historical opaque scene and accepts the corrected scene. Full preview/export validation remains necessary: the corner check alone does not establish visual parity.

B's reusable graphics cache is evaluated only with non-overlapping graphics in these fixtures. Overlap is not safely represented by its current per-item cache key and first-active-graphic selection, despite the schema accepting it. Do not use this harness as proof of overlapping-layer support. Results and failed 4K parity checks are recorded in [the follow-up](../../docs/evidence/phase-00-followup-2026-10-11.md).

`validate` مخصص للعينة القصيرة ذات marker source: فحص streams/count/duration، decode كامل، PTS لكل إطار، مقارنة 12 لقطة Player بالملف مع سماح إطار عرض واحد مسجل في `matchedFrame`، وارتباط envelope الصوت قرب البداية والوسط والنهاية بحد 40ms. PSNR>28dB وMAE<5/255 thresholds اختبارية للضغط؛ المراجعة البصرية العربية تبقى مستقلة. لا تشغله على Q05/Q06 باعتباره تحققًا طويلًا streaming؛ جمع PTS/audio في الذاكرة هنا محدود بالعينة القصيرة.

راجع [تدقيق القديم](../../docs/legacy-reuse-audit.md) و[المصدر والترخيص](ATTRIBUTION.md). لم تنقل التجربة المكوّن الكبير أو pipeline القديم أو خدماته.
