# Phase 01 — المهام

الحالة: جميع المهام غير منفذة. الترتيب مقصود؛ لا توجد نتائج اختبارات بعد.

- [ ] P01-T01: إنشاء runnable skeleton وhealth checks وإعداد local profile والمهاجرات الأولى. القبول: P01-A1.
- [ ] P01-T02: تنفيذ document schema وasset refs وinteger time وcommand validation. القبول: P01-A1/A2.
- [ ] P01-T03: تنفيذ Editing Kernel وتكييف منطق الفترات القديم واختبارات invariants/Undo. القبول: P01-A2.
- [ ] P01-T04: تنفيذ import/probe/proxy وملكية الأصول ومسار إدخال لا يحمل الملف كله في RAM. القبول: P01-A1/A5.
- [ ] P01-T05: تنفيذ Session/autosave/history persistence وoptimistic concurrency والتعافي. القبول: P01-A3.
- [ ] P01-T06: توصيل preview/export للـsnapshot وإضافة durable jobs وcancel/lease fencing. القبول: P01-A4/A5.
- [ ] P01-T07: تنفيذ رحلة كاملة مع restart وworker kill وتسجيل الأدلة. القبول: P01-A1–A5.

## Definition of done

جميع سيناريوهات [spec](spec.md) مثبتة بأدلة، وعقود البيانات محدثة، والأخطاء المعروفة مسجلة. لا تُعلّم المهمة الأخيرة قبل مراجعة مخرجات التحقق الفعلية.
