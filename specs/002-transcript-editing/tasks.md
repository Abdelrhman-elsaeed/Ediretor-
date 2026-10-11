# Phase 02 — المهام

الحالة: T01–T05 منفذة ومتحققة ضمن المسار المحلي القصير. T06 وبوابة المرحلة ما زالتا مفتوحتين للمراجعة البشرية لعينة Q01 التقنية الأطول. الأدلة وحدودها في [Phase 02](../../docs/evidence/phase-02.md)؛ إكمال التنفيذ لا يعني إثبات دقة التعرف لكل لهجة أو qualification للفيديو الطويل.

- [x] P02-T01: نقل/تكييف Deepgram normalization وتنفيذ contract اختبارات provider والفشل. القبول: P02-A1/A5. الدليل: live nova-3/ar-EG، 107 كلمات، silent audio صفر كلمات، واختبارات retry/cancel/provenance؛ دقة Q01 الكاملة متبقية تحت T06.
- [x] P02-T02: تنفيذ حفظ transcript immutable وdisplay corrections مع إصدارات ومراجع. القبول: P02-A2. الدليل: migration 002/upgrade/concurrent startup، hash ثابت، correction/save/reload/history/conflict tests.
- [x] P02-T03: إضافة النص virtualized والبحث وربط selection بـclip occurrence وseek. القبول: P02-A6. الدليل: Chromium RTL/themes ونص stress صريح 60k مع 12 صفًا mounted؛ لا claim لرندر Q05 الطويل.
- [x] P02-T04: تنفيذ حذف/استعادة بالنص وpadding policy عبر Kernel. القبول: P02-A2/A3. الدليل: حذف فعلي وUndo/Redo يعيدان intervals؛ اختبارات حدود/تكرار/overlap ورفض القص الملتبس. الاستعادة هي Undo المشتركة؛ naturalness الأوسع تحت T06.
- [x] P02-T05: تنفيذ captions renderer وSRT/VTT وضبط RTL/fonts وoverflow. القبول: P02-A1/A4. الدليل: 348-frame native export، full decode، خط/runtime مثبتان، Arabic/mixed raster parity وقياسات الإطار السابق/بداية cues وoverflow tests.
- [ ] P02-T06: اختبار الطويل والصامت وoverlap chunks وexport بعد تعديل النص؛ توثيق الأدلة. القبول: P02-A1–A6.

T06 المنفذ: silent/no-speech حقيقيان، failure/loading/cancel، chunk offsets/dedup، stress 60k، transcript → correction → cut → history → save/reload → captions/video export، وتوثيق الأدلة. المتبقي: Q01 بطول 2–5 دقائق وكلام عربي/إنجليزي تقني مع مراجعة بشرية لدقة الكلمات/التوقيت وطبيعية حدود القص. لا تُعلّم البوابة كاملة من العينة المصرية 47s أو من build ناجح؛ process-death على كلام multi-chunk حقيقي وmaximal-density resource qualification غير مثبتين.

## Definition of done

جميع سيناريوهات [spec](spec.md) مثبتة بأدلة، وعقود البيانات محدثة، والأخطاء المعروفة مسجلة. لا تُعلّم المهمة الأخيرة قبل مراجعة مخرجات التحقق الفعلية.
