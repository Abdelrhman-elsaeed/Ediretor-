# Phase 07 — تحمل الفيديو الطويل والتعافي

الحالة: مخطط، لم ينفذ.

## النتيجة

تعمل المنظومة المكتملة على حدود فيديو موثقة، مع أداء مقاس وتعافٍ من الفشل وتكاليف محسوبة.

## التبعيات والمتطلبات

Phase 06؛ benchmark الأولي مطلوب منذ 00 ولا ينتظر هذه المرحلة.

التغطية: FR-11/12، أهداف Q05–Q11.

## داخل النطاق

- قياس كل مرحلة: ingestion/transcription/AI/preview/render/upload، لا رقم إجمالي غامض.
- virtualization وفهرسة وتمرير data وتحديد concurrency حسب الموارد.
- cache للمشاهد والـderivatives، وrender chunks عند إثبات الحاجة مع handles للانتقالات.
- resume/retry ودورة حياة ملفات temp وdisk budget؛ cancellation عبر كل العمليات.
- validation للفيديو الطويل: frame boundaries، audio sync، captions والـtransitions عند حدود chunks.

## خارج النطاق

لا إضافة features أو renderer بديل بالتوازي بلا ADR؛ لا اعتبار encode أسرع على حساب اختلاف النتيجة.

## سيناريوهات القبول

- **P07-A1**: Q05 تحقق أهداف الجودة المحددة بعد Phase 00 على الجهاز المرجعي، مع p95/peak RAM/temp disk/RTF منشورة.
- **P07-A2**: Q06 يكتمل ضمن الحدود المعلنة أو يرفض مبكرًا بحد واضح؛ لا وعد أربع ساعات دون نجاح.
- **P07-A3**: تغيير مشهد واحد لا يعيد transcription أو كل cached scenes؛ cache invalidation صحيحة عبر الإصدارات.
- **P07-A4**: worker kill وانقطاع storage/DB ثم restart لا يفقد acknowledged edits ولا ينشر ملفًا جزئيًا.
- **P07-A5**: chunk joins إن استُخدمت لا تعيد frames أو تضيع audio samples، وتُقاس transitions/captions حول الحد.
- **P07-A6**: قرص ممتلئ/cancel/job timeout تظهر أخطاء قابلة للإصلاح، ويتم cleanup scoped بدون حذف أصل أو ملف job أخرى.

## بوابة الخروج

حدود الدعم وقياسات الأداء صادقة وقابلة لإعادة التجربة؛ المشاكل الكبيرة لا تؤجل إلى installer.

انظر [خطة التنفيذ](plan.md) و[المهام](tasks.md) و[معايير الجودة](../../docs/06-quality.md).
