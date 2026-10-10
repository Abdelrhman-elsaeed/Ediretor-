# الانتقال من TextCut

## النطاق

القديم مرجع ومرشح لإعادة الاستخدام؛ لا نعدّل ملفاته أثناء التخطيط. بدء V2 لا يعني رمي كل ما سبق.

OLD = D:/Vibe Coding/vibe editor/textcut/textcut.

| المصدر بالنسبة لـOLD | القرار المقترح | شرط النقل |
|---|---|---|
| packages/domain/src/time وinterval | نقل/تكييف | تثبيت integer time وproperty tests |
| packages/domain/src/editing/edit-commands.ts | تكييف | فصل selection إلى commands للـtimeline؛ نفس معنى التصحيح والقص |
| packages/domain/src/editing/time-mapping.ts | تعميم | يدعم clip occurrences والمصادر المتعددة بدل مصدر واحد |
| packages/domain/src/editing/edit-history.ts | تكييف | history تضم المشاهد والصوت والـlayout أيضًا |
| apps/worker/src/transcription/deepgram-provider.ts وdeepgram-normalizer.ts | نقل بعد تحقق | contract موحد للكلمات والأخطاء والتوقيت |
| apps/worker/src/media/media-derivative-generator.ts | تكييف | hash/proxy mapping ودعم streams مختلفة وفشل القرص |
| packages/motion-renderer إن احتفظنا بواجهته | مراجعة قالب بقالب | جودة عربية، props موثقة، إصدار ثابت، parity |
| apps/worker/src/export/export-job-orchestrator.ts | نقل مفاهيم لا الملف كاملًا | jobs/recovery/validation تناسب renderer المختار |
| apps/web/src/features/editor/transcript-editor.tsx | إعادة تركيب | لا نسخ Module تجمع 1935 سطرًا من المسؤوليات |
| EditState القديم وجداول motion/broll المنفصلة | تمثيل جديد | snapshot واحدة وatomic history |
| سكربتات التشغيل القديمة | إعادة تقييم | حاجة فعلية لكل service، لا تشغيل Redis/MLT بلا سبب |

وجود tests بالقديم لا يعني أنها نجحت الآن. Phase 00 تسجل ما شغّلته فعلًا، ثم اختبارات المطابقة عند نقل كل جزء.

## استيراد المشاريع القديمة إن طُلب

1. افتح export/read-only snapshot من DB/files القديمة بإصدارها؛ لا تقرأ جداول متحركة أثناء النقل.
2. asset واحد يصبح clip أساس. cuts تتحول إلى segments مع حفظ الأصل.
3. captions والتصحيحات تُربط بالكلمات؛ B-roll/motion تُقرأ ضمن نفس snapshot.
4. أي template غير مدعوم يبقى placeholder واضحًا أو pre-render artifact بموافقة المستخدم؛ لا يسقط صامتًا.
5. ينتج conversion report ونسخة جديدة مستقلة. القديم يبقى صالحًا.
6. قارن مدة ومحتوى أول/وسط/آخر الفيديو والأصول الناقصة؛ importer يعاد تشغيله idempotently.

هذا المسار مشروط بالحاجة O07؛ ليس شرطًا أن نبني migration لكل النسخ القديمة قبل أول editor صالح.

## منع تكرار الانحراف

كل ميزة جديدة تضيف نفسها إلى document + command + history + preview + export + tests في نفس الشريحة. إذا احتاجت حالة مؤقتة في UI نحدد بوضوح أنها selection/progress فقط وليست حقيقة تحرير جديدة.
