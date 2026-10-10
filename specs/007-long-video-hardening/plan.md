# Phase 07 — خطة التنفيذ

## الترتيب والقرارات

1. ابدأ profiling ثم أصلح bottleneck المقاس؛ لا تعالج كل شيء بإضافة services.
2. ضع limits للذاكرة والتزامن حسب class المهمة؛ واجهة التعديل لها أولوية تجربة المستخدم أثناء export.
3. render cache تعتمد revision-derived scene content وfonts/assets/renderer/profile، لا position فقط.
4. chunking بعد تجربة فعلية؛ استخدم overlap handles للانتقالات ثم قص deterministic عند التجميع، واختبر sample accuracy.
5. أضف job manifest وchecksums وحالة checkpoint؛ ما لا يمكن استئنافه يُعاد من آخر خطوة مكتملة موثوقة.
6. تعامل مع sparse motion دون intermediate ضخم عبر الفراغات إذا اختير hybrid؛ المسار الشامل يبقى خاضعًا لنفس budget.

## المخاطر

تسريع بالـparallelism قد يضاعف temp disk والذاكرة. بعض codecs والحواف لا تسمح concat مباشرًا دون normalization.

## العقود المشتركة

تلتزم المرحلة بـ[نموذج المشروع](../../docs/04-data-model.md) و[المعمارية](../../docs/03-architecture.md). أي تغيير لهما يُحدّث قبل إضافة الحالة الجديدة في الواجهة. لكل قدرة: command + save/undo + preview + export حيث تنطبق.

## التحقق

نفّذ سيناريوهات [spec](spec.md)، واستخدم fixture IDs من [Quality](../../docs/06-quality.md). سجّل actual results في docs/evidence/phase-07.md عند التنفيذ. فشل القبول لا يتحول إلى task منجزة لأن build نجح.

## الخروج

حدود الدعم وقياسات الأداء صادقة وقابلة لإعادة التجربة؛ المشاكل الكبيرة لا تؤجل إلى installer.
