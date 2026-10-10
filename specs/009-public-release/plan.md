# Phase 09 — خطة التنفيذ

## الترتيب والقرارات

1. قيّم provider على actual render job duration/resources/egress/storage وتكلفة AI، لا مقارنة ديمو reels.
2. نفس domain والعقود؛ غيّر storage/job/identity adapters المطلوبة فقط. native rendering ضمن بيئة تسمح به، لا طلب edge عادي طويل.
3. روابط موقعة قصيرة العمر وprivate buckets؛ يتحقق worker من owner/job capability ولا يثق في path من العميل.
4. طبّق limits على bytes/minutes/concurrency/AI budget، مع ledger idempotent إن استُخدمت credits.
5. أضف dashboards وتقارير failure بالـjob/revision IDs دون طباعة transcript/keys.
6. جهز staging نتيجة قابلة للمراجعة وخطة rollback قبل خطوة النشر الفعلي حسب تفويض المستخدم وقتها.

## المخاطر

تكلفة دقيقة فيديو طويل ليست كلفة reel. readiness تشمل أمن الميديا واستعادة البيانات، لا successful deployment وحده.

## العقود المشتركة

تلتزم المرحلة بـ[نموذج المشروع](../../docs/04-data-model.md) و[المعمارية](../../docs/03-architecture.md). أي تغيير لهما يُحدّث قبل إضافة الحالة الجديدة في الواجهة. لكل قدرة: command + save/undo + preview + export حيث تنطبق.

## التحقق

نفّذ سيناريوهات [spec](spec.md)، واستخدم fixture IDs من [Quality](../../docs/06-quality.md). سجّل actual results في docs/evidence/phase-09.md عند التنفيذ. فشل القبول لا يتحول إلى task منجزة لأن build نجح.

## الخروج

staging تتحقق منها معايير الإصدار العام، وتُحدد حدود وتكلفة ومسؤولية تشغيل واضحة قبل إطلاق live.
