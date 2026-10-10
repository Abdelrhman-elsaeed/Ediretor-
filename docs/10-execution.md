# طريقة العمل على الخطة

## تنظيم الملفات

لكل phase ثلاثة ملفات:
- spec.md: سلوك المستخدم والنطاق وسيناريوهات القبول.
- plan.md: التنفيذ والعقود والتبعيات والمخاطر.
- tasks.md: أعمال مرتبة مرتبطة بالقبول، غير مؤشرة قبل التنفيذ.

هذا تنظيم مستلهم من [Spec Kit](https://github.github.com/spec-kit/) وليس ادعاء تشغيل الأداة أو توليد ملفاتها آليًا.

## تنفيذ مرحلة

1. اقرأ AGENTS.md وREADME وconstitution و[Engineering rules](12-engineering-rules.md)، ثم spec/plan/tasks للمرحلة. مهارة المشروع متاحة في [.agents/skills/ediretor-typescript-architect/SKILL.md](../.agents/skills/ediretor-typescript-architect/SKILL.md).
2. راجع prerequisite gates وسجل القرارات. وضح افتراضًا إن احتجت، واطلب فقط المعلومة التي تمنع عملًا فعليًا.
3. نفّذ أصغر رحلة كاملة قابلة للتجربة. لا تنفذ UI مستقلة عن الحفظ والتصدير وتعلن الميزة جاهزة.
4. اختبر invariants ومخاطر المرحلة من Interface العامة وملفات media فعلية عند لزومها.
5. سجّل evidence في docs/evidence/phase-XX.md عند تنفيذ الاختبارات؛ لا تنشئ نتائج افتراضية.
6. حدّث task checkboxes بنتائج مثبتة، ودوّن known limitations.
7. حدّث decisions/model إذا تغير النطاق أو عقد الوقت أو الحفظ، ثم أصلح الملفات التي تعتمد عليه.
8. عند نجاح exit gate يمكن الانتقال للمرحلة التالية ضمن التفويض المتاح. لا حاجة لموافقة جديدة لكل تعديل روتيني.

الطلب الحالي يخص التحليل والخطة؛ لا يبدأ تنفيذ التطبيق بمجرد إنشاء هذه الملفات.

## قالب evidence

~~~text
Phase / date / build:
Environment and dependency versions:
Fixture IDs:
Commands executed:
Expected versus actual:
Measurements and output artifacts:
Known limitations:
Gate decision and reason:
~~~

## prompt جاهز لبدء التنفيذ لاحقًا

~~~text
نفّذ Phase 00 من specs/000-feasibility.
اقرأ README.md و.specify/memory/constitution.md وdocs/07-decisions.md.
طبّق AGENTS.md وdocs/12-engineering-rules.md، واستعن بمهارة ediretor-typescript-architect.
تحقق من المصادر والكود الموجود؛ لا تعتبر ادعاءات الخطة نتائج قياس.
نفّذ المهام المتاحة وسجل benchmark والقرار والدليل.
لا تبدأ Phase 01 قبل حسم renderer وقيود الاختبار الأساسية.
~~~

## تقدير العمل

لا تواريخ أو وعود بعدد أيام قبل Phase 00. نقدر كل مرحلة بعد معرفة sample media والجهاز، ونراجع التقدير بعد أول slice. Phase 06 و07 و09 أعلى عدم يقين؛ رندر الفيديو الطويل وتشغيل الجمهور يحتاجان قياسًا فعليًا.
