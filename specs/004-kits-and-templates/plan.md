# Phase 04 — خطة التنفيذ

## الترتيب والقرارات

1. ابدأ tokens semantic لا قيم ألوان متناثرة. bind theme snapshot إلى scene props مع override صريح.
2. لكل template schema/version/capabilities وقواعد overflow ومحددات assets.
3. TemplateRegistry يتشارك تعريفه composition/Inspector وDirector مستقبلًا؛ لا وصف capability غير موجودة.
4. اربط cue بـword+clip occurrence وليس timestamp float ثابت.
5. سجل metadata لحقوق استخدام asset/font ومصدره عند الاستيراد؛ المنتج لا يفترض أن كل ميديا متاحة للنشر.

## المخاطر

تحديث template في مكانه يغيّر مشاريع سابقة. theme/global state يمكن أن يسرّب هوية مشروع لآخر.

## العقود المشتركة

تلتزم المرحلة بـ[نموذج المشروع](../../docs/04-data-model.md) و[المعمارية](../../docs/03-architecture.md). أي تغيير لهما يُحدّث قبل إضافة الحالة الجديدة في الواجهة. لكل قدرة: command + save/undo + preview + export حيث تنطبق.

## التحقق

نفّذ سيناريوهات [spec](spec.md)، واستخدم fixture IDs من [Quality](../../docs/06-quality.md). سجّل actual results في docs/evidence/phase-04.md عند التنفيذ. فشل القبول لا يتحول إلى task منجزة لأن build نجح.

## الخروج

يمكن بناء فيديو شرح جميل يدويًا بقوالب موثوقة قبل أن نطلب من الـAI اختيارها.
