# Phase 05 — خطة التنفيذ

## الترتيب والقرارات

1. ضع tool catalog على Editing Kernel/TemplateRegistry؛ صحة النوع لا تكفي دون source bounds/ownership checks.
2. افصل retrieval/planning عن apply؛ طبّق batch بعد validation واحد لا كتابة قاعدة البيانات من أدوات النموذج.
3. جزّئ Auto Draft إلى مهام قابلة للاسترجاع؛ لا تعيد transcription إذا فشل اختيار الرسوم.
4. proposal تحتفظ evidenceRefs وbaseRevisionId وpolicyVersion لتفسير ما تغير.
5. نفّذ مجموعة تقييم بمقاطع عربية/إنجليزية وطلبات محددة ومتعارضة؛ اختر model على النجاح والكلفة المقاسة لا الاسم.

## المخاطر

قد تبدو الاقتراحات مقنعة وهي غير مرتبطة بالتوقيت أو الميديا. لا نستخدم model-based score وحدها لقبول القص أو جودة العرض.

## العقود المشتركة

تلتزم المرحلة بـ[نموذج المشروع](../../docs/04-data-model.md) و[المعمارية](../../docs/03-architecture.md). أي تغيير لهما يُحدّث قبل إضافة الحالة الجديدة في الواجهة. لكل قدرة: command + save/undo + preview + export حيث تنطبق.

## التحقق

نفّذ سيناريوهات [spec](spec.md)، واستخدم fixture IDs من [Quality](../../docs/06-quality.md). سجّل actual results في docs/evidence/phase-05.md عند التنفيذ. فشل القبول لا يتحول إلى task منجزة لأن build نجح.

## الخروج

يعمل الوضعان على نفس history/export، ويحافظ الـAI على حدود الصلاحيات والنطاق والنسخ.
