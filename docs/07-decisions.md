# سجل القرارات والأسئلة

## D10 / ADR-08 — Active implementation direction, 2026-10-11

**Confirmed user decision:** stop the current Phase 00 benchmark round; defer unresolved renderer qualification; cancel Figma. Neither the unfinished quality gate nor a design artifact blocks frontend implementation. Existing measurements remain historical evidence, with Q05/Q06 incomplete and Q10 parity failed. No gate is relabeled as passed.

**Implementation choice within the authorized Phase 01 slice:** React/TypeScript + existing Vite tooling; Node 24 local HTTP adapter; SQLite WAL behind repository ports; native FFmpeg in a separate bounded worker process. SQLite replaces the proposed local PostgreSQL setup for this slice, avoiding an external database install while providing atomic revisions, command receipts, ownership checks, and durable jobs. PostgreSQL remains a possible hosted adapter rather than a second implementation now. `node:sqlite` is available in the inspected Node 24.16.0 environment; Node 24+ is the recorded local runtime requirement.

The browser and worker share a validated composition plan for sequential 1× clips and linked source audio. Export pins the document, asset hashes, `native-cuts-v1` renderer version and `mp4-1080p-30` profile. This cuts-only path does not qualify either Phase 00 graphics candidate. Current export admission is at most 10 minutes / 200 clips / 1080p / 30 fps; these conservative guardrails are not measured long-video support claims. Sources may be silent; missing media and hash changes fail explicitly. Import admits up to 2 GiB, 4 hours, 3840×2160 and 120 fps; broader media/long workloads remain unqualified.

The Arabic shell uses RTL; the timeline axis, numeric timecodes, and source identifiers use LTR. Time advances rightward and Left/Right seek backward/forward in both themes. Video pixels never mirror. Future transcript, simultaneous sources/sync, templates, graphics, and AI stay in their recorded phases. The visual brief is implemented directly in CSS/React, using Noto Sans Arabic with its retained OFL license. Copper/focus/success tokens are adjusted for contrast.

This section supersedes the old active Figma and renderer prerequisites in ADR-02/04/D09 below. Their rationale and observations are preserved as history. See [Phase 01 runtime contracts](../specs/001-project-core/runtime-contract.md) and the [Phase 01 evidence](evidence/phase-01.md).

التاريخ: 2026-10-10. الكلمات: مؤكد = قاله المستخدم؛ مقترح = قرار هندسي قابل للمراجعة؛ بوابة = يحتاج دليل قبل تثبيته.

## قرارات المنتج

| ID | الحالة | القرار |
|---|---|---|
| D01 | مؤكد | فيديو شرح طويل بالكاميرا وتسجيل الشاشة |
| D02 | مؤكد | المصادر قد تكون ملفًا واحدًا، أو منفصلة، أو مدمجة مسبقًا |
| D03 | مؤكد | البدء يدويًا أو بمسودة تلقائية، مع استخدام AI لاحقًا |
| D04 | مؤكد | استخدام محلي أولًا مع قابلية نشر منتج عام |
| D05 | مؤكد | قوالب قابلة للتعديل + مشاهد مخصصة بالـAI بضوابط |
| D06 | مقترح | قص محافظ؛ الاختصار الجوهري وإعادة الترتيب مقترحات للمراجعة |
| D07 | مقترح | No Kit محايد وBrandKit/EditStyle/VideoBrief منفصلة |
| D08 | مقترح | الصوت الأساسي يختاره المستخدم؛ لا مزج مزدوج تلقائي لنفس الكلام |

## ADR-01: V2 انتقائية

الحالة: مؤكد من المستخدم بخصوص البناء في مشروع جديد مع نقل انتقائي؛ تفاصيل ما يُنقل تحتاج التحقق. المشكلة: spec القديم ضيقة مقارنة بالنطاق الجديد؛ تاريخ التحرير لا يشمل كل الحالة بنفس النموذج.
القرار: V2 في المجلد الحالي، ووجهة الريبو https://github.com/Abdelrhman-elsaeed/Ediretor-، مع نقل domain/media logic المختبرة. توسيع القديم في مكانه لم يعد مسار التنفيذ المختار.
السبب: المصدر وEditState يحتاجان تغييرًا عميقًا؛ نقل الواجهة كاملة قد ينقل coupling نفسه.
الكلفة: adapter/importer إن احتجنا مشاريع قديمة، وفترة وجود النظامين.
Phase 00 تقيس صلاحية الوحدات للنقل واختيار renderer؛ لا تعيد العمل إلى مجلد القديم تلقائيًا.

## ADR-02: stack

الحالة: مقترح. React + TypeScript للواجهة؛ Node.js/TypeScript backend/worker، مع الاستفادة من NestJS الموجود.
البدائل: React + .NET، أو Angular + .NET.
السبب: reuse الكود والعقود وRemotion يقلل زمن الانتقال؛ نوع المشروع لا يفرض framework بعينه.
الكلفة: اعتماد على runtime JavaScript للـscene tools.
متى نختار .NET: خبرة/تشغيل/فريق يرجحونه بصورة عملية. لا يوجد قرار من المستخدم باعتماد .NET أو رفضه.
القرار النهائي في Phase 00. اختيار .NET يستلزم تعديل plan والعقود التشغيلية قبل التنفيذ؛ لا ننشئ backend ثانيًا جانبيًا.

## ADR-03: حالة موحدة وأوامر مشتركة

الحالة: مقترح أساسي. كل تغيير يمر Editing Kernel وrevision واحدة.
البديل المرفوض: حفظ مستقل للموشن والـB-roll دون snapshot شاملة.
المكسب: Undo وسلامة export/concurrency. الكلفة: schema migrations وtransaction design.

## ADR-04: renderer

الحالة: بوابة Phase 00؛ لم تُحسم. تحديث 2026-10-11: A اجتاز إعادة تحقق CFR/container للعينة القصيرة (30/1، 360 frame، 12.000000s). B كان يخزن فيديو كاملًا داخل cache الجرافيك بسبب اختلاف `inputProps` و`composition.props`؛ بعد اختيار composition للجرافيك ورفع cache version نجح في 12/12 نقاط parity والصوت والتوقيت. B cold الجديد: 31.872s/12s، peak tree WS 1.47GiB وrun disk 19.31MiB. أرقام B القديمة تخص cache معيبًا ولا تُستخدم لاختيار الإنتاج. Q05/Q06 شُغلت بمهلة 120s كعينات censored ولم تكتمل؛ نتائج Q10 وحدودها في [متابعة الدليل](evidence/phase-00-followup-2026-10-11.md).
نثبت اختيارًا واحدًا بنتيجة Q05/Q06 وparity؛ لا ندّعي أن المشاركة في React تضمن أداء ساعات.
قرار Phase 00 الحالي: لا-go؛ لا نعتمد أي renderer للإصدار قبل قياس Q05/Q06 كاملًا والتحقق من مخرجاتها. نستخدم A كمرجع دلالي، ونبقي B مرشحًا مشروطًا بدليل الأداء. تجاوز فشل parity القصير لا يثبت دعم الفيديو الطويل أو يختار queue/runtime إنتاجية. قبل اعتماده للإصدار نراجع شروط توزيع dependencies الحالية في Phase 00/09 دون افتراض أنها مجانية لكل استخدام.

## ADR-05: مشاهد مخصصة

الحالة: آلية مقترحة لتنفيذ D05. SceneSpec محدودة مع primitives وproperties، وقوالب غنية.
لا نشغّل كودًا حرًا افتراضيًا. الحاجة لذلك لاحقًا تعيد فتح القرار مع sandbox وقياسات تكلفة.

## ADR-06: التشغيل المحلي والعام

الحالة: مقترح. تطبيق ويب محلي وخدمات محلية، ثم نفس domain في hosted profile.
البديل: desktop shell أولًا. يُعاد تقييمه إذا صار التثبيت/الوصول للملفات عائقًا؛ لا نبني browser وdesktop منتجين مستقلين.
Cloudflare/VM/object storage providers لم تُحسم.

## ADR-07: تكييف مهارة التصميم الشخصية

الحالة: طلب المستخدم تطبيق قواعد مهارة dotnet-layered-api-architect بما يناسب لغة وطبيعة المشروع الحالي. نحتفظ بانضباط الطبقات والـDTO والتحقق والمعاملات والتاريخ والأداء، ونستبدل وصفات EF/C# بقواعد TypeScript/Node ومحرر الفيديو.
المرجع التشغيلي: [Engineering rules](12-engineering-rules.md). التغطية وسبب كل تعديل: [خريطة القواعد](13-dotnet-rule-mapping.md).
مهارة المشروع: [.agents/skills/ediretor-typescript-architect/SKILL.md](../.agents/skills/ediretor-typescript-architect/SKILL.md)، مع نسخة مستخدم محلية للتسهيل. النسخة داخل الريبو هي المرجع الذي يُحدّث أولًا؛ مزامنة نسخة المستخدم تتم عند تحديث المهارة.
لا يغير هذا الطلب مرحلة التنفيذ الحالية، ولا يثبت ORM أو renderer أو يحول المشروع إلى .NET. مهارة .NET الأصلية تبقى دون تعديل.

## D09: Design Foundation وواجهة V2

الحالة: مؤكد من المستخدم كمسار عمل جديد، والتنفيذ في Phase 00D.

القرار: نبني design system وeditor flows وواجهة المنصة الجديدة في Figma، ثم ننفذها في React/TypeScript. لا ننسخ واجهة TextCut الكبيرة؛ نستخدمها للبحث في السلوك والمشكلات فقط. Figma artifact لا يملك ProjectDocument ولا يثبت preview/export parity.

السبب: الواجهة القديمة تجمع مسؤوليات كثيرة ولا تمثل snapshot الموحدة ومسارات الكاميرا/الشاشة والجرافيك كما يحتاج V2. تصميم الواجهة قبل Phase 01 يقلل قرارات UI العشوائية، مع إبقاء العقود domain/application هي المرجع الوظيفي.

الأثر: يضاف Phase 00D قبل 01، وتشمل design tokens، RTL/LTR، editor shell، timeline، preview، inspector، import/export، حالات الفشل، accessibility، وhandoff قابل للتنفيذ. أي screen لا يربط state أو command أو query بعقد واضح يبقى prototype لا معيار قبول.

## افتراضات مفتوحة

| ID | السؤال | افتراض التخطيط المؤقت | متى يجب حسمه |
|---|---|---|---|
| O01 | متوسط وأقصى مدة التسجيل؟ | 60 دقيقة للاختبار، 4 ساعات stress من القديم | Phase 00 قبل إعلان limits |
| O02 | دقة ومعدل التسجيل والتصدير؟ | 1080p أولًا، 4K تقييم | Phase 00 |
| O03 | CPU/GPU/RAM والقرص المتاح؟ | لا نفترض مواصفات؛ SLO في الجودة مبدئية | بداية benchmark |
| O04 | هل التسجيلات المنفصلة متزامنة أم أجزاء مستقلة أحيانًا؟ | ندعم placement مستقل؛ sync group فقط بتأكيد علاقتها | قبل Phase 03 UX |
| O05 | ميزانية transcription وAI الشهرية؟ وهل offline AI مطلوب؟ | خدمات سحابية اختيارية؛ لا وعد offline AI | قبل Phase 05 تفعيل استدعاءات فعلية |
| O06 | حدود حذف الإعادات واختصار المعنى؟ | conservative ومراجعة تغيير المعنى | قبل تثبيت Auto Draft في 05 |
| O07 | هل توجد مشاريع قديمة يجب نقلها؟ | نقل كود انتقائي؛ importer مشروع قديم اختياري | Phase 00 |
| O08 | شكل النشر للجمهور: SaaS أم برنامج يثبتونه؟ | SaaS profile مقترح، المحلي browser+services | قبل Phase 09 |
| O09 | لغات الواجهة والاسم والهوية الشخصية؟ | عربية أساسية مع مصطلحات تقنية إنجليزية وtheme محايدة | قبل Phase 04/08 |

لا تمنع الأسئلة المفتوحة إعداد هذه الخطة. مرحلة تعتمد على إجابة لا تفترض أنها جاءت لمجرد مرور وقت؛ يمكن متابعة أعمالها المستقلة فقط.
