# Phase 03 — خطة التنفيذ

## الترتيب والقرارات

1. تطبيق convention groupTime = sourceTime + offset كما في data-model؛ sync ليس مساويًا لـtimeline position.
2. manual alignment بالسحب/nudge/marker أولًا؛ waveform correlation اقتراح بعد تأكيد صحة المزامنة اليدوية.
3. مصادر غير متزامنة تعامل sequential clips؛ لا تخمين أنها recording واحد.
4. افصل transform/opacity عن source timing؛ الـlayout presets مجرد commands وليست timeline ثانية.
5. اختبر audio mixing على stream metadata والـsample rates؛ لا تحمل PCM المشروع كاملًا في browser.
6. أي tracking تلقائي لمنطقة شاشة مؤجل؛ zoom box يحدده المستخدم حاليًا.

## المخاطر

القص المرتبط قد يكسر صوتًا أو cue إذا لم يكن ذريًا. اختلاف طول التسجيلات لا يسمح بتمديد المحتوى تلقائيًا.

## العقود المشتركة

تلتزم المرحلة بـ[نموذج المشروع](../../docs/04-data-model.md) و[المعمارية](../../docs/03-architecture.md). أي تغيير لهما يُحدّث قبل إضافة الحالة الجديدة في الواجهة. لكل قدرة: command + save/undo + preview + export حيث تنطبق.

## التحقق

نفّذ سيناريوهات [spec](spec.md)، واستخدم fixture IDs من [Quality](../../docs/06-quality.md). سجّل actual results في docs/evidence/phase-03.md عند التنفيذ. فشل القبول لا يتحول إلى task منجزة لأن build نجح.

## الخروج

حالات التسجيل التي أكدها المستخدم كلها تمر؛ timeline UI والحفظ والتصدير لا تملك مصادر حقيقة مختلفة.
