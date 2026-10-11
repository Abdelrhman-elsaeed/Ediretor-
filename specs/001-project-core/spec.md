# Phase 01 — أول محرر محفوظ يصدر فيديو

الحالة: تنفيذ محلي جارٍ — 2026-10-11. المسار الفعلي في [runtime-contract.md](runtime-contract.md)، والدليل في [phase-01.md](../../docs/evidence/phase-01.md). لا تعني قابلية تشغيل الواجهة qualification للإصدار أو اكتمال كل quality fixtures.

## النتيجة

استيراد فيديو، قصه يدويًا، حفظه وإعادة فتحه والتراجع ثم تصدير نسخة محددة.

## التبعيات والمتطلبات

قرار المستخدم 2026-10-11: أوقف benchmarking وأجّل renderer qualification وألغى Figma. لا تمنع هذه المتطلبات تنفيذ الواجهة. اختيار المسار المحلي المسجل في ADR-08 يستخدم React/Vite وNode 24 وSQLite وnative cuts worker؛ الجرافيك والأحمال الطويلة و4K غير معتمدة.

التغطية: FR-01/02/11/12/14 (أساس الملكية)، ADR-03.

## داخل النطاق

- ProjectDocument متعددة المسارات من البداية؛ UI تبدأ بفيديو وصوت مرتبطين دون كل الأدوات.
- أصل محفوظ بالـhash، probe وproxy أولية، canvas وfps وتوقيت.
- Editing Kernel: Insert/Split/Trim/RippleDelete، command batches، undo/redo وrevision conflict.
- Project Session، autosave pending state، وAPI/DB transactions وowner checks.
- Job durable للتصدير مع status/cancel/retry/validation؛ snapshot لا تتغير مع تعديل المشروع.

## خارج النطاق

لا transcription أو توليد جرافيك أو أدوات timeline شاملة. لا fake export أو حفظ في ذاكرة السيرفر فقط.

## سيناريوهات القبول

- **P01-A1**: استورد ملفًا ثم قص منتصفه واحفظ وأعد تشغيل التطبيق: نفس العناصر والمدة والتوقيت؛ الأصل لم يتغير.
- **P01-A2**: Undo/Redo يغطي القص والإضافة؛ batch غير صالح لا يطبق أي جزء، وتكرار commandId لا يكرر التغيير.
- **P01-A3**: عميلان على نفس baseRevision: الثاني يتلقى conflict واضحًا؛ حالة pending قابلة للاسترجاع بعد فشل الحفظ.
- **P01-A4**: export لـrevision R يستمر بنفس المحتوى بعد إنشاء R+1؛ الناتج يجتاز probe وmarker checks.
- **P01-A5**: job تعاد بعد worker kill دون نتيجتين منشورتين؛ cancel يمنع نشر ملف جزئي، وasset لا يخص المشروع يُرفض.

## بوابة الخروج

النسخة الرأسية تحفظ وتعيد الفتح وتصدر media فعلية وتتعافى من الفشل؛ لا ينتقل الدين المتعلق بالحفظ إلى مرحلة captions.

انظر [خطة التنفيذ](plan.md) و[المهام](tasks.md) و[معايير الجودة](../../docs/06-quality.md).
