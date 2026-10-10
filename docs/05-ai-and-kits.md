# الـAI والهوية والمشاهد

## فصل السياق

| الحزمة | البيانات | عمرها |
|---|---|---|
| BrandKit | ألوان semantic، خطوط عربية/لاتينية، شعار، glossary، أصول موصوفة | قابلة لإعادة الاستخدام بين فيديوهات القناة |
| EditStyle | إيقاع القص، كثافة الجرافيك، أسلوب captions، الحركة والموسيقى | presets متنوعة لنفس القناة |
| VideoBrief | موضوع الدرس، الجمهور، نقاط الشرح، المصطلحات والأصول الخاصة | فيديو واحد |
| TemplateDefinition | props schema، capabilities، cues، renderer version | مكتبة مشاهد بإصدارات |
| SceneInstance | قيم props والتوقيت والمراجع | داخل revision المشروع |

ترتيب override المقترح: defaults ← kit/style snapshots ← brief overrides ← scene overrides. locks والقيود البنيوية تتقدم على أي توجيه توليدي. نعزل السياق بالـprojectId؛ No Kit يعني سياقًا محايدًا دون بقايا مشروع آخر.

## مكتبة أولى صغيرة ومفيدة

عنوان فصل، lower third، تعريف مصطلح، مقارنة قبل/بعد، مقارنة عمودين، خطوات مرقمة، diagram علاقات بسيط، screenshot callout، code highlight، zoom/focus rectangle. B-roll والصوت عناصر timeline قابلة للدمج معها.

كل قالب يحتاج:
- schema للخصائص وحدود الطول وعدد العناصر.
- preview وexport من نفس تعريف الحركة.
- دعم عربي/إنجليزي واتجاه مستقل لكل نص.
- safe areas وoverflow behavior؛ لا قص صامت للكلمات.
- cues مسماة يمكن ربطها بكلمات أو local time.
- version ثابتة؛ تغيير implementation لا يبدل المشاريع القديمة.

قائمة القوالب بداية مقترحة، ليست وعدًا بإنتاج مكتبة ضخمة قبل اختبار أول قالب كامل.

## prompts ابتدائية من تصميمنا

هذه نصوص تأسيسية مستوحاة من تنظيم الصور؛ ليست الـsystem prompts الخاصة بصاحب اللايف.

### Channel context

~~~text
القناة تشرح: {{topics}}
الجمهور ومستواه: {{audience}}
اللغة: عربية مصرية، مع إبقاء المصطلح التقني الإنجليزي عند الحاجة.
القاموس المعتمد: {{glossary}}
الأصول المسموح استخدامها: {{asset_catalog}}
لا تخترع ميزات أو نتائج أو أرقامًا. اربط الرسوم بالمعلومة المسجلة أو الـbrief.
~~~

### Visual direction

~~~text
الهدف توضيح فكرة واحدة في اللحظة المناسبة.
استخدم أدوار ألوان الـtheme، لا ألوانًا عشوائية لكل مشهد.
حافظ على وضوح النص والكود في الشاشة، ولا تغطِّ المنطقة محل الشرح.
حركة الدخول تحدث مرة واحدة؛ لا loop إلا إذا كان المعنى يحتاج استمرارًا.
اختصر النص الظاهر دون تغيير المعنى. قدّم cue مرتبطًا بكلمة عند وجودها.
~~~

### Editing Director

~~~text
لديك ProjectContext بإصدار محدد، ونطاق اختيار، وكتالوج أوامر وقوالب.
أخرج EditProposal مطابقًا للـschema فقط: baseRevisionId, scope,
summary, evidenceRefs, commandBatch, reviewFlags.
لا تستخدم عنصرًا خارج asset catalog، ولا تعدّل عناصر locked.
لا تعِد ترتيب الشرح أو تختصر معناه ضمن التنظيف التلقائي دون reviewFlag.
لا تستنتج وجود جزء مرئي في الشاشة من النص وحده.
~~~

## مساران للاستخدام

Manual + AI: المستخدم يحدد مقطعًا/عناصر ثم يطلب تغييرًا. يحدد Director النطاق، ويعيد proposal قابلة للمعاينة. التغيير الواضح ضمن selection يمكن تطبيقه مع Undo؛ التعديلات الواسعة تحتاج عرض الفرق.

Automatic draft: تحليل المصادر → تأكيد alignment → transcription → تنظيم فصول → اقتراح تنظيف → اختيار مواضع جرافيك → draft revision. تعرض summary وما قص وما أضيف وأسبابها. يمكن قبول كل جزء أو تعديله.

تحديد النطاق تلقائيًا لا يمنح الـAI حق إعادة بناء المشروع كاملًا كل مرة. Locked/manual-approved العناصر تُحترم، وre-edit from scratch إجراء منفصل.

## سياق الفيديو الطويل

- index للكلمات والفصول وملخص للمشروع؛ لا إرسال الفيديو كله لكل طلب.
- retrieval للمقطع المحدد مع سياق قبله وبعده والـkit اللازمة.
- إعادة تحميل timestamps الأصلية عند إخراج أمر؛ ملخص الفصل ليس دليل توقيت.
- scene understanding عند الحاجة فقط: frames مختارة + references. zoom منطقة شاشة يتطلب box من المستخدم أو detector مؤكد بالمراجعة.
- chunking يتتبع global offsets وoverlap وإزالة الكلمات المكررة.
- ميزانية tokens/cost ومدة وقابلية cancel لكل طلب، مع caching بالـcontext hash.
- تخزين model ID وprompt version وscope/baseRevision للمتابعة؛ النتيجة المعتمدة تُحفظ ولا يُعاد توليدها للتصدير.

## المشاهد المخصصة

الاختيار المؤكد: قوالب + مشاهد مخصصة بضوابط. الترشيح الأول: SceneSpec تصف primitives وحركة قابلة للفحص، وليس JavaScript اعتباطيًا.

SceneSpec تدعم text، shapes، images، groups، arrows، paths ضمن حدود، وkeyframes/easing مع asset IDs. نفس Inspector يعدل النصوص والألوان والـpositions. إذا احتاجت قدرة جديدة، نضيف primitive/capability مع اختبار؛ لا نخفي unsupported feature في كود حر.

إذا أثبتت Phase 06 أن SceneSpec لا تكفي، افتح ADR منفصلة لتوليد كود داخل sandbox حقيقية: process/container isolated، لا network أو secrets أو host mounts، حد CPU/memory/time، dependencies مسموحة فقط. iframe أو فحص النص وحده لا يكفي. هذه إضافة مشروطة، وليست جزءًا مفروضًا من الاختيار الحالي.

## التحقق قبل التطبيق

1. schema ثم references والملكية والنطاق والحدود العددية.
2. توافر templates/fonts/assets وإصداراتها.
3. فحص overlaps والقص والمعنى والـlocks.
4. dry-run ولقطات من أول/وسط/نهاية المشهد؛ لا نكتفي بنجاح parsing.
5. proposal invalid لا تغيّر المشروع. repair محدود مقترح: محاولة واحدة، ثم تفسير الفشل.
6. transcript/kit/assets لا تستطيع توسيع صلاحيات الأدوات؛ تعامل معها كبيانات غير موثوقة.
7. لا autoplay loop توليد بلا سقف. cancellation يمنع تطبيق الاستجابة المتأخرة.

مقياس جودة الـAI: نجاح المهمة، الحفاظ على المعنى، صحة التوقيت والمراجع، وقابلية تعديل الناتج؛ ليس «المشهد شكله مبهر» فقط.
