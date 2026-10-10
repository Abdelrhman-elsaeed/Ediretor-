# Phase 08 — خطة التنفيذ

## الترتيب والقرارات

1. اختيار native runtime أو container مثبت في 00؛ ادعم طريق تثبيت واحدًا جيدًا أولًا.
2. افصل app install عن user data؛ لا تمسح data عند uninstall/cleanup روتيني دون اختيار المستخدم.
3. احتفظ backup قبل migration وcompatibility table للإصدارات؛ binary rollback وحده لا يرجع schema.
4. localhost bind افتراضي وsession token وorigin validation؛ لا API عامة على 0.0.0.0 بلا إعداد مقصود.
5. دليل المستخدم يشرح local compute مقابل cloud calls وحدود الفيديو المعتمدة.

## المخاطر

نجاح dev environment لا يثبت سهولة التثبيت. اختلاف PATH/codecs/fonts قد يغير الناتج أو يمنع تشغيله.

## العقود المشتركة

تلتزم المرحلة بـ[نموذج المشروع](../../docs/04-data-model.md) و[المعمارية](../../docs/03-architecture.md). أي تغيير لهما يُحدّث قبل إضافة الحالة الجديدة في الواجهة. لكل قدرة: command + save/undo + preview + export حيث تنطبق.

## التحقق

نفّذ سيناريوهات [spec](spec.md)، واستخدم fixture IDs من [Quality](../../docs/06-quality.md). سجّل actual results في docs/evidence/phase-08.md عند التنفيذ. فشل القبول لا يتحول إلى task منجزة لأن build نجح.

## الخروج

إصدار محلي قابل للاستخدام المستمر، مع استعادة مجرّبة؛ لا نسمّيه جاهزًا للجمهور على الإنترنت بعد.
