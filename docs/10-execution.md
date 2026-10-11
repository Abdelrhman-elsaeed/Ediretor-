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

قرار المستخدم 2026-10-11 ألغى Figma وأوقف جولة benchmarking وأجّل renderer qualification. يستخدم تنفيذ Phase 01 brief التصميم وخريطة العقود مباشرة، مع evidence من التطبيق والمتصفح والميديا الفعلية. لا تُنقل واجهة legacy مباشرة إلى React الجديدة ولا تُحوّل quality gates غير المكتملة إلى نجاح.

الحالة الحالية: تنفيذ الواجهة والحفظ والخدمات والـworker في Phase 01. [harness](../experiments/render-feasibility/README.md) وأدلة 00 محفوظة. المطلوب الحالي يجيز تنفيذ frontend الفعلية؛ سجّل النتائج في [phase-01.md](evidence/phase-01.md) دون إعادة benchmarking الطويل أو الكتابة فوق الأدلة السابقة.

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

## prompt لاستكمال المرحلة الحالية

~~~text
استكمل تنفيذ وتحقق Phase 01 من specs/001-project-core.
اقرأ README.md و.specify/memory/constitution.md وdocs/07-decisions.md.
طبّق AGENTS.md وdocs/12-engineering-rules.md، واستعن بمهارة ediretor-typescript-architect.
تحقق من المصادر والكود الموجود؛ لا تعتبر ادعاءات الخطة نتائج قياس.
راجع حالة Git والأدلة الموجودة، ثم نفّذ رحلة import/edit/save/reopen/export وسجل نتائج الاختبارات والمتصفح والميديا.
استخدم brief التصميم فقط؛ Figma مُلغى.
لا تستأنف benchmarking الطويل إلا إذا احتاجه عيب محدد؛ qualification مؤجلة وليست ناجحة.
~~~

## تقدير العمل

لا تواريخ أو وعود بعدد أيام قبل Phase 00. نقدر كل مرحلة بعد معرفة sample media والجهاز، ونراجع التقدير بعد أول slice. Phase 06 و07 و09 أعلى عدم يقين؛ رندر الفيديو الطويل وتشغيل الجمهور يحتاجان قياسًا فعليًا.
