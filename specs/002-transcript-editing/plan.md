# Phase 02 — خطة التنفيذ

## الترتيب والقرارات

1. اجعل Transcript source-aligned؛ projected words تبنى من clip occurrences، لا من تعديل timestamps الأصلية.
2. احتفظ provider/model/options/version في transcription record. قيّم العينة المصرية المختلطة قبل تثبيت المزود.
3. أضف boundary policy واضحة للقص: padding، حروف قصيرة، ونهاية الملف؛ راجع بصريًا/سمعيًا.
4. التنفيذ المحلي وفق ADR-09: نفس Canvas draw function والخط المثبت في المعاينة وChromium rasterization، ثم sparse PNG stream وFFmpeg overlay في مسار export الحالي. parity قصيرة مثبتة في دليل المرحلة؛ لا qualification جديدة لـRemotion أو benchmark طويل.
5. الـglossary الحالية project-level؛ ربط Kit يأتي في 04 دون نقل ملكية transcript إلى kit.

## المخاطر

SRT ليس مصدر word timings كافيًا بذاته. transcript قد يخطئ في الصمت والتهتهة. تقسيم الكلام يحتاج overlap ومطابقة عند الحدود.

## العقود المشتركة

تلتزم المرحلة بـ[نموذج المشروع](../../docs/04-data-model.md) و[المعمارية](../../docs/03-architecture.md). أي تغيير لهما يُحدّث قبل إضافة الحالة الجديدة في الواجهة. لكل قدرة: command + save/undo + preview + export حيث تنطبق.

## التحقق

نفّذ سيناريوهات [spec](spec.md)، واستخدم fixture IDs من [Quality](../../docs/06-quality.md). سجّل actual results في docs/evidence/phase-02.md عند التنفيذ. فشل القبول لا يتحول إلى task منجزة لأن build نجح.

## الخروج

المسار المنفذ وعقوده في [runtime-contract.md](runtime-contract.md)، والنتائج وحدود العينة في [الدليل](../../docs/evidence/phase-02.md). تظل مراجعة Q01 الأطول وبوابة المرحلة مفتوحتين كما يوضح tasks.md.

تحرير نص حقيقي يصل إلى فيديو وكابشن صحيحين محفوظين؛ لا إرسال توقيت كلمة خاطئ إلى الجرافيك لاحقًا.
