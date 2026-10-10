# تدقيق إعادة استخدام TextCut — Phase 00

تاريخ الفحص: 2026-10-10. المرجع المقروء: `D:/Vibe Coding/vibe editor/textcut/textcut`، commit الريبو الأب `ec24c2321f791de800742d1150cc632dda1af16c`. لم تُنقل مجلدات Git أو secrets أو DB أو uploads أو dependencies أو build artifacts. لا توجد imports تشغيلية إلى القديم.

## النتائج

| المرشح والمسار بالنسبة للجذر القديم | القرار والوجهة | dependencies / callers | الدليل والحدود |
|---|---|---|---|
| `packages/domain/src/time/micros.ts` | إعادة استخدام بتغيير محدود → `packages/domain/src/time` | bigint فقط؛ تستخدمه interval/editing/player | 9 اختبارات قديمة نجحت. اكتشف الفحص قبول milliseconds غير آمنة وnegative sub-microsecond بعد trunc؛ أضيف رفضهما واختبارات V2. Micros موضع غير سالب، وليس sync offset موقّعًا. |
| `packages/domain/src/interval/{time-interval,interval-algebra}.ts` | إعادة استخدام → `packages/domain/src/interval` | micros؛ callers: commands/mapping/export | 15 + 44 اختبارًا ناجحًا، بينها property tests. normalizeCuts الافتراضي 50ms باقٍ للتوافق في الوحدة المنقولة؛ أمر V2 يمرر صفرًا صراحة حتى لا يبتلع فجوة المستخدم. canonical input شرط keepRanges. |
| `packages/domain/src/editing/time-mapping.ts` | إعادة استخدام محدودة داخل cutClip | interval/micros؛ player/transcript/caption | 32 اختبارًا ناجحًا. single-source mapping ليس عقد المشروع الجديد؛ يغلفه clip occurrence مع sourceIn/sequenceStart وID. نهاية timeline clamp ليست موضعًا داخل half-open clip. |
| `packages/domain/src/editing/edit-commands.ts` | تكييف المعنى، إعادة تنفيذ `cutClip` الصغير؛ أوامر الكلمات مؤجلة 02 | transcript-index، boundary-policy، EditState | 63 اختبارًا ناجحًا. فصل التصحيح عن التوقيت والحذف غير المدمر مفيدان؛ selection/provenance مرتبطان بكلمات ومصدر واحد فلا ينقلان كاملين إلى 00. |
| `packages/domain/src/editing/edit-history.ts` | تكييف مؤجل 01/02 | EditState؛ transcript-editor/session | 19 اختبارًا ناجحًا؛ bounded snapshots وbranch بعد Undo وsavedState منفصل. التعليق يسميه command-based لكن المخزن state snapshots؛ غير موحد مع motion/B-roll. لا full history في 00. |
| `apps/worker/src/media/ffprobe-parser.ts` و`ffprobe-inspector.ts` | تكييف المفهوم، probe محدود جديد في `scripts/io.ts` | zod، database metadata، native runner | 3 اختبارات parser نجحت. القديم يرفض غياب audio (`MEDIA_NO_AUDIO`)؛ لا يصلح كما هو للموديل الجديد. V2 يفحص streams بلا فرض وجود صوت في probe؛ fixture الحالية لها صوت. rotation/multi-stream/VFR ingestion الكامل مؤجل 01/03. |
| `apps/worker/src/media/media-derivative-generator.ts` | تكييف profiles فقط، خدمة كاملة مؤجلة 01 | repository/storage/hash/native runner/validator | قراءة فعلية: proxy H264، audio Opus، poster؛ map الصوت إلزامي، reuse يفحص الحجم بدل checksum. لا يوجد اختبار مستقل للملف في المجموعة المشغلة؛ لا ندعي إثبات recovery أو disk-full. V2 يحضر fixture محلية مثبّتة hashes دون repositories. |
| `apps/worker/src/transcription/deepgram-{normalizer,provider}.ts` | تكييف مؤجل 02 | database UUID/types، contracts، logger، fetch/HMAC | 12 + 5 اختبارات نجحت؛ mocks لا تقيس خدمة Deepgram أو دقة العربية. normalizer يصلح timestamps ويقبل overlap كبيرًا بعد تعليق guard؛ provider يحمل `any` في streaming boundary. لا calls مدفوعة أو secrets أو port في 00. |
| `packages/motion-renderer/src/compiler/motion-compiler.ts` | تكييف تحويل rational frames فقط | renderer contracts؛ preview/export | 5 اختبارات قديمة نجحت؛ floor frame→us لا يضمن roundtrip عند 29.97. اختبارات V2 المولدة تثبت ceiling المناسب. compiler الكامل مؤجل 04. |
| `packages/motion-renderer/src/templates/editorial-modern/typography.ts` والقوالب | مؤجل 04، مشهد feasibility جديد صغير | tokens/template props/font assets | 3 اختبارات typography نجحت؛ estimateLines ليس إثبات shaping أو overflow. لم ننقل مكتبة القوالب دون فحص بصري لكل قالب. |
| `apps/worker/src/export/motion/motion-remotion-renderer.ts` | إعادة تنفيذ orchestration المحدودة | Remotion، motion-renderer، logger | اختبار واحد mock نجح. القراءة أكدت min(start)→max(end) في overlay واحدة؛ تُرندر الفجوات. B في التجربة يرندر نطاق المشهد فقط مع cache يعتمد المحتوى. |
| `apps/worker/src/export/{export-job-orchestrator,output-validation-service,export-worker}.ts` | مفاهيم validation-before-publish/cancel فقط؛ دوام jobs مؤجل 01 | MLT + Remotion + caption pipeline + database + storage + queue | export-pipeline: 21 نجح وواحد فشل Chrome startup timeout 25s. output validator يسمح 5% من المدة؛ استبدل بتحقق frames/duration/PTS/audio/parity. لا نقل MLT أو pipeline كامل. لا اختبار worker-kill أو lease recovery فعلي في هذا التشغيل. |
| `apps/api/src/modules/exports/export.service.ts` | إعادة تنفيذ snapshot contract في 00، service مؤجل 01 | repos مستقلة للـmotion/B-roll/edit revision | القراءة تؤكد جمع موشن وB-roll من repositories مستقلة؛ revision القص وحدها لا تمثل كل المدخلات. التجربة تثبت clips/layout/graphics/assets/font/runtime في JSON واحدة. |
| `apps/web/src/features/editor/transcript-editor.tsx` | رفض نقل المكوّن | UI/session/provider/edit/motion/B-roll | callers تؤكد اتساع المسؤولية. Preview هنا Player فقط؛ لا shell تحرير ولا competing persistent state. |

## الاختبارات التي شغلت بالفعل

من الجذر القديم، مع تعطيل cache وعدم تعديل source:

```powershell
node node_modules/vitest/vitest.mjs run --config vitest.config.ts --cache false --maxWorkers 2 packages/domain/src/time packages/domain/src/interval packages/domain/src/editing/edit-commands.test.ts packages/domain/src/editing/edit-history.test.ts packages/domain/src/editing/time-mapping.test.ts apps/worker/src/media/ffprobe-parser.test.ts apps/worker/src/transcription/deepgram-normalizer.test.ts apps/worker/src/transcription/deepgram-provider.test.ts packages/motion-renderer/src/compiler/motion-compiler.test.ts packages/motion-renderer/src/templates/editorial-modern/typography.test.ts apps/worker/src/export/motion/motion-remotion-renderer.test.ts apps/worker/src/export/export-pipeline.test.ts
```

Vitest 3.2.7: **232 نجح / 1 فشل، 13 ملفًا، 141.70s**. الفشل: `worker startup failure > reports unhealthy and logs a clear MLT error when MLT initialization fails`؛ `Timed out after 25000 ms while trying to connect to the browser`. فشل بيئي مرصود، لا نجاح مفترض ولا تعديل للقديم لإخفائه.

V2 يشغّل الاختبارات المنقولة مع اختبارات boundaries/rational fps/occurrence/contract إضافية. النتائج النهائية في [دليل المرحلة](evidence/phase-00.md). المصدر والترخيص في [Attribution](../experiments/render-feasibility/ATTRIBUTION.md).

فحص `scripts/worker-kill-recovery.mjs` أظهر أنه يختبر **ingestion عند proxy.encoding** ويقتل container worker عبر WSL/Docker؛ لا يثبت تعافي export. لم يشغّل هنا لأن القديم مرجع read-only ولأن قتل خدماته خارج التجربة غير لازم. لا يوجد دليل فعلي على lease/fencing/export recovery من هذه الجولة؛ يظل تصميم وتنفيذ ذلك في Phase 01.
