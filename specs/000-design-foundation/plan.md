# Phase 00D — خطة التنفيذ

**Active update — 2026-10-11:** execute the visual brief directly in React/CSS as part of Phase 01. Figma file/prototype/export steps below are cancelled historical steps, not pending work or blockers. Real screenshots and workflow validation are recorded in Phase 01 evidence.

التقدم الحالي: [screen map وcomponent inventory وannotations المقترحة](../../docs/design/phase-00d-handoff.md) جاهزة كمسودة نصية للمراجعة؛ لا توجد Figma file أو token export مثبتة بعد. التمييز بين عقود الإنتاج المقترحة وsource الحالية ومتطلبات المراحل اللاحقة إلزامي في handoff.

1. أنشئ Figma file واحدة بصفحات: Foundations، Components، Flows، Editor، States، Handoff.
2. ثبّت variables semantic لا قيمًا مبعثرة: surface، content، border، accent، success، warning، danger، focus، overlay.
3. صمم desktop editor أولًا، ثم قواعد responsive للـtablet ونافذة صغيرة؛ لا تبنِ mobile product مستقلًا.
4. اجعل RTL هو الاتجاه الافتراضي للنصوص العربية، وLTR للمصطلحات/code/time حيث يلزم، مع bidi examples حقيقية.
5. اربط كل screen بمراجع ProjectDocument أو application query/command في annotations؛ لا تضع SQL أو renderer details داخل التصميم.
6. استعمل sample IDs مثل projectId/revisionId/clipId وstates حقيقية من Phase 01، مع بيانات تجريبية واضحة.
7. اختبر prototype مع حالات نجاح وفشل، وراجع contrast/focus/reduced-motion وoverflow العربي قبل handoff.
8. سلّم component inventory وtoken export وscreen map وopen questions إلى Phase 01.

## المخاطر

قد يتحول Figma إلى mockup جميل بلا model قابل للتنفيذ، أو يعيد إنتاج فصل motion/B-roll/captions القديم. الحل هو annotations مرتبطة بالعقود، ورفض أي state لا يملك مصدر حقيقة واضحًا.

## التبعيات

تستخدم Phase 00D مفردات `docs/02-product-spec.md` و`docs/04-data-model.md` ونتائج Phase 00 وتعمل بالتوازي معها؛ لا تنتظر نجاح بوابة renderer أو حسم كل أدوات backend. نتائج renderer قد تضيف states أو قيودًا في preview/export ويجب عكسها في handoff قبل تنفيذ Phase 01.
