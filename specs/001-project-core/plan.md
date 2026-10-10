# Phase 01 — خطة التنفيذ

## الترتيب والقرارات

1. أنشئ apps/web وapps/api وapps/worker وpackages/domain/contracts/composition حسب stack المختارة؛ كل package له وظيفة لا مجلد فارغ مكرر.
2. ضع side effects في Project Session/Media/Jobs؛ domain pure مستقل عن React/DB/FFmpeg.
3. أساس DB: projects/assets/revisions/commands/jobs/outbox مع unique idempotency keys؛ migrations منذ أول نسخة.
4. تخزين ملفات محلي خلف asset IDs؛ استيراد بالمقاطع/streaming دون قراءة الأصل كله إلى RAM.
5. استخدم نفس compile(snapshot) للـpreview/export؛ snapshots تشمل الخطوط والأصول حتى لو كانت قليلة.
6. ابدأ local identity ثابتة بإعداد محلي فقط؛ guard صريح يمنع تشغيلها في hosted profile.

## المخاطر

دقة تعديل النموذج لا تكفي دون file IO وDB failure behavior. history arrays لا تبقى unlimited في الواجهة؛ حفظ history يحتاج paging/compaction محددين.

## العقود المشتركة

تلتزم المرحلة بـ[نموذج المشروع](../../docs/04-data-model.md) و[المعمارية](../../docs/03-architecture.md). أي تغيير لهما يُحدّث قبل إضافة الحالة الجديدة في الواجهة. لكل قدرة: command + save/undo + preview + export حيث تنطبق.

## التحقق

نفّذ سيناريوهات [spec](spec.md)، واستخدم fixture IDs من [Quality](../../docs/06-quality.md). سجّل actual results في docs/evidence/phase-01.md عند التنفيذ. فشل القبول لا يتحول إلى task منجزة لأن build نجح.

## الخروج

النسخة الرأسية تحفظ وتعيد الفتح وتصدر media فعلية وتتعافى من الفشل؛ لا ينتقل الدين المتعلق بالحفظ إلى مرحلة captions.
