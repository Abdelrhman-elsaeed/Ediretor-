# Phase 06 — خطة التنفيذ

## الترتيب والقرارات

1. ابدأ primitives كافية للـdiagrams التعليمية: text/shape/arrow/image/group وkeyframes؛ لا تبن لغة برمجة عامة.
2. قواعد الإدخال تقيد path complexity وعدد العناصر ومدة المشهد وحجم الصور؛ أهداف أولية 50 عنصرًا و30 ثانية قابلة للتقييم.
3. التقييم frame-based، مع seed إن وُجدت عشوائية؛ asset references تُحل عبر catalog فقط.
4. خزن artifact قبل إسناد scene؛ فشل الحفظ لا يترك scene تشير إلى artifact غير موجودة.
5. استخدم visual review للعينات الأولى والـgolden fixtures للعربية؛ نجاح JSON لا يثبت جودة الرسم.

## المخاطر

زيادة expressive power بلا bounds تعيد بطء النظام وصعوبة التحقق. القيد الجيد يبقي properties قابلة للتعديل للمستخدم.

## العقود المشتركة

تلتزم المرحلة بـ[نموذج المشروع](../../docs/04-data-model.md) و[المعمارية](../../docs/03-architecture.md). أي تغيير لهما يُحدّث قبل إضافة الحالة الجديدة في الواجهة. لكل قدرة: command + save/undo + preview + export حيث تنطبق.

## التحقق

نفّذ سيناريوهات [spec](spec.md)، واستخدم fixture IDs من [Quality](../../docs/06-quality.md). سجّل actual results في docs/evidence/phase-06.md عند التنفيذ. فشل القبول لا يتحول إلى task منجزة لأن build نجح.

## الخروج

مشهد مخصص حقيقي قابل للتحرير والحفظ والتصدير، دون السماح بتنفيذ كود غير معزول.
