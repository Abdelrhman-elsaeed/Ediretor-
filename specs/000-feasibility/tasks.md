# Phase 00 — المهام

الحالة: تنفيذ جزئي بأدلة؛ A/B القصير ناجحان بعد التصحيحات، وPhase 00 تبقى NO-GO. راجع [متابعة 11 أكتوبر](../../docs/evidence/phase-00-followup-2026-10-11.md).

تحديث 2026-10-11: أُوقفت جولة benchmarking بطلب المستخدم وأُجلت مهام qualification غير المكتملة أدناه. تبقى checkboxes غير المكتملة كما هي؛ لا تمنع تنفيذ Phase 01 ولا تُحوّل إلى نجاح.

- [x] P00-T01: تحديد fixtures وبيئة القياس وSLO المرشحة؛ استكمال معلومات الجهاز والمدد المتاحة. القبول: P00-A5. (environment.json وfixtures.json؛ Q05/Q06 synthetic ومعلنة الحدود.)
- [x] P00-T02: تشغيل اختبارات الوقت/الفترات/الأوامر القديمة وتحليل ما يُنقل وتكلفة تعديل النموذج. القبول: P00-A4. (232/1 old-suite، و105/105 V2؛ راجع legacy-reuse-audit.)
- [x] P00-T03: بناء harness رأسي لـpreview/export بمصدر وصوت وقص وoverlay عربي. القبول: P00-A1. (A/B scripts، snapshot schema، Player/Remotion، output validation؛ short parity evidence مسجل.)
- [ ] P00-T04: تنفيذ benchmark A على Q05/Q06 و4K كعينة تقييم وتسجيل metrics. القبول: P00-A2. (A cold/warm شُغلت؛ Q05/Q06 timeout مع metrics، وQ10 موثقة في متابعة القياس؛ gate طويل المدة غير مكتمل.)
- [ ] P00-T05: اختبار B عند الحاجة ثم تثبيت renderer والـstack/runtime/queue؛ توثيق tradeoffs. القبول: P00-A3. (B القصير اجتاز parity بعد إصلاح cache؛ benchmarks موثقة، والقرار النهائي مؤجل.)
- [x] P00-T06: تسجيل evidence وقرار go/no-go، وتحديث quality/architecture/decisions حسب النتيجة. القبول: P00-A1–A5. (No-go معلن؛ لا نعلن خروج المرحلة.)

## Definition of done

جميع سيناريوهات [spec](spec.md) مثبتة بأدلة، وعقود البيانات محدثة، والأخطاء المعروفة مسجلة. لا تُعلّم المهمة الأخيرة قبل مراجعة مخرجات التحقق الفعلية.
