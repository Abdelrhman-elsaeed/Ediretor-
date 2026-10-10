# Phase 00 — خطة التنفيذ

## الترتيب والقرارات

1. أنشئ harness داخل experiments/render-feasibility عند تنفيذ المرحلة؛ لا تنسخ monorepo كاملًا.
2. استخدم clip IDs وتوقيت integer وsnapshot صغيرة حتى الاختبار يختبر نفس semantics المقصودة.
3. قِس sparse scenes (أول/آخر المشروع) وكثافة captions؛ اجعل comparison على encoder/profile ودقة متساوية.
4. استعن بالأصول المحلية والـtools الموجودة؛ أي عينات طويلة مولدة توسم synthetic ثم تحقق بعينة حقيقية قبل release.
5. راجع تشغيل native محليًا مقابل container قبل إلزام المستخدم بتثبيت runtime؛ سجل الخيار وسببه.

## المخاطر

قد يكون bottleneck decode/encode لا React. GPU متاح لا يعني أن المسار يستخدمه. جودة العربية وتطابق preview/export شرطان قبل اختيار الأسرع.

## العقود المشتركة

تلتزم المرحلة بـ[نموذج المشروع](../../docs/04-data-model.md) و[المعمارية](../../docs/03-architecture.md). أي تغيير لهما يُحدّث قبل إضافة الحالة الجديدة في الواجهة. لكل قدرة: command + save/undo + preview + export حيث تنطبق.

## التحقق

نفّذ سيناريوهات [spec](spec.md)، واستخدم fixture IDs من [Quality](../../docs/06-quality.md). سجّل actual results في docs/evidence/phase-00.md عند التنفيذ. فشل القبول لا يتحول إلى task منجزة لأن build نجح.

## الخروج

لا تبدأ 01 مع renderer غير محسوم أو timing/parity فاشلين. يجوز تعديل الأهداف بدليل واضح مع إبقاء حدود الدعم صريحة.
