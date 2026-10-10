# Phase 06 — مشاهد مخصصة بالـAI قابلة للتعديل

الحالة: مخطط، لم ينفذ.

## النتيجة

طلب رسم غير موجود كقالب ينتج مشهدًا جديدًا من عناصر محددة، يمكن تعديل نصوصه وتوقيته وحفظه وتصديره.

## التبعيات والمتطلبات

Phase 05 وScene/Template contracts من 04.

التغطية: FR-10 وD05 وADR-05.

## داخل النطاق

- SceneSpec بإصدار، primitives وحركة deterministic وحدود complexity.
- مسار generate → validate → render sample frames → review → save artifact → insert scene.
- Inspector لخصائص المشهد، cues، وإعادة توليد محددة تحترم تعديلات المستخدم.
- حفظ generation inputs/version/artifact hash؛ cached render لنفس المشهد.
- تفسير unsupported requests بدل إنشاء بنية غير قابلة للتصدير.

## خارج النطاق

لا JavaScript اعتباطي داخل التطبيق. sandbox code generation قرار منفصل فقط إذا أثبتت الحالات الضرورة.

## سيناريوهات القبول

- **P06-A1**: طلب diagram تدفق بثلاث خطوات يخرج SceneSpec صالحة؛ يمكن تعديل أسماء الخطوات وألوانها من Inspector.
- **P06-A2**: المشهد نفسه عند نفس frame يعطي نفس النتيجة بعد إعادة الفتح وفي export؛ لا Date.now أو randomness غير مثبتة.
- **P06-A3**: نص عربي طويل/مختلط لا يخرج صامتًا من الحدود؛ الفشل واضح أو التخطيط يصلح ضمن القيود.
- **P06-A4**: مشهد يتجاوز حد العناصر/مدة الحركة أو يشير إلى URL/asset غير مسموحة يرفض قبل التشغيل دون تغيير revision.
- **P06-A5**: إعادة توليد جزء لا تغير locked props أو scenes أخرى؛ Undo يعيد artifact السابقة.
- **P06-A6**: نفس inputHash يرجع cache صحيحة؛ تعديل font/template/asset version يبطل cache المناسبة.

## بوابة الخروج

مشهد مخصص حقيقي قابل للتحرير والحفظ والتصدير، دون السماح بتنفيذ كود غير معزول.

انظر [خطة التنفيذ](plan.md) و[المهام](tasks.md) و[معايير الجودة](../../docs/06-quality.md).
