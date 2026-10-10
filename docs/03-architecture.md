# Architecture — المقترح التقني

الحالة: مقترح؛ قرار renderer وبوابة الأداء يُحسمان في Phase 00.

قواعد التنفيذ المفصلة في [Engineering rules](12-engineering-rules.md)، المكيّفة من مهارة المستخدم الخاصة بـ.NET. Transport → Application → Persistence، مع Editing Kernel نقية، هو توزيع المسؤوليات المعتمد للعمل؛ لا يفرض إنشاء جميع الطبقات في Phase 00. تفاصيل framework/ORM/renderer تظل خاضعة للقياس والقرارات المسجلة.

## اختيار التقنيات

| الجزء | الترشيح | السبب والبديل |
|---|---|---|
| الواجهة | React + TypeScript | القديم يستخدمهما؛ Remotion Player يندمج داخل React |
| غلاف الويب | إبقاء Next.js مبدئيًا | الاستفادة من الموجود؛ المعالجة الثقيلة خارج route handlers |
| backend | Node.js/TypeScript، مع NestJS الموجود | يقلل إعادة الكتابة ويشارك عقود domain؛ .NET بديل إذا احتياجات الفريق ترجحه |
| التنفيذ الثقيل | worker مستقل، native media tools | يمكن تشغيله محليًا أو في container/VM |
| التخزين | PostgreSQL للـmetadata + ملفات محلية أولًا؛ object storage لاحقًا | لا نحفظ video bytes داخل ProjectDocument أو قاعدة البيانات |
| jobs | durable job records في PostgreSQL؛ ناقل queue يُحسم في 00 | جرّب مسار Postgres jobs أولًا؛ لا تضف Redis إلا بدليل حاجة أو مكسب إعادة استخدام |
| transcription | Deepgram أول Adapter للمقارنة | نحافظ على تكامل موجود ونقيس العربية؛ local engine لاحقًا إذا احتاجه المستخدم |
| المشاهد | Remotion مرشح، مع scene schema مستقلة | نفس وصف المشهد في المعاينة والإخراج |
| media processing | FFmpeg/ffprobe مرشحان | probe، derivatives، audio، encoding؛ مسار composition يخضع للتجربة |

ترشيح React مبني على ملاءمة التكامل، وليس أن Angular عاجز عن المونتاج. تغيير frontend framework لن يوحّد الحفظ أو يحل الوقت. استخدام .NET لا يفرض Angular. لا نضيف backend بلغتين دون سبب واضح.

يدعم Remotion [Player داخل React](https://www.remotion.dev/docs/player) و[renderer على الخادم](https://www.remotion.dev/docs/renderer). هذه القدرات لا تثبت سرعة مشروع طويل عندنا؛ benchmark إلزامي.

## Modules وواجهاتها

| Module | Interface الرئيسية المقترحة | Implementation التي يخفيها |
|---|---|---|
| Editing Kernel | apply(document, commandBatch) → result أو conflict/errors | validation، linking، ripple، time mapping، invertibility |
| Project Session | load / dispatch / flush / undo / redo | autosave، pending changes، revisions والتعارض |
| Media Pipeline | ingest(asset) / getStatus(job) / cancel(job) | probe، proxy، thumbnails، waveform، checksums |
| Transcript | transcribe(assetRef) / projectWords(document) | provider normalization، الكلمات والتوقيت والتكرار |
| Composition | compile(snapshot) → RenderPlan | ترتيب المسارات، source maps، captions، scene evaluation |
| Render Jobs | enqueue(snapshot, profile) / status / cancel | التنفيذ، leases، cache، progress، نشر الناتج |
| AI Director | propose(context, intent) → EditProposal | اختيار السياق، التخطيط، tool validation، budget |
| Scene Runtime | validate(scene) / evaluate(scene, frame) | قوالب وعناصر ومظهر وقيود التنفيذ |

Interface هنا تشمل شكل الطلب، الأخطاء، الإصدارات، والتوقيت؛ ليست مجرد أسماء functions. seams للتخزين ومزود التفريغ وتنفيذ jobs لها بدائل فعلية محلي/hosted أو موجود/مقترح. لا ننشئ Interface لكل class بلا سبب.

## رحلة البيانات

~~~mermaid
flowchart LR
  UI["Editor / Transcript / Inspector"] --> Commands["Editing Kernel"]
  AI["AI Director: proposal"] --> Commands
  Commands --> Session["Revision commit"]
  Session --> Doc["Immutable ProjectDocument"]
  Doc --> Compile["Composition compiler"]
  Compile --> Preview["Preview using proxies"]
  Compile --> Render["Render worker using originals"]
  Assets["Versioned assets / fonts / templates"] --> Compile
  Render --> Verify["Verify then publish artifact"]
~~~

المعاينة والتصدير يشتركان في semantics وRenderPlan. لو اختلفت وسيلة تشغيل الفيديو بينهما، يلزم parity tests على الإطارات والصوت؛ تشابه JSON وحده لا يكفي.

## نتيجة Phase 00 الحالية

توجد الآن تجربة مستقلة في [experiments/render-feasibility](../experiments/render-feasibility/README.md). على جهاز Phase 00، عينة real مدتها 12 ثانية قاست A بنحو 8.88× real-time باردًا وB بنحو 5.08× باردًا و1.45× دافئًا، مع فرق ذاكرة ومساحة مؤقتة. B فشل parity عند حد graphic متأخر، وQ05/Q06/Q10 الكاملة لم تُقَس. لا يثبت هذا اختيار renderer أو دعم الفيديو الطويل؛ تبقى ADR-04 بوابة no-go حتى تكتمل القياسات وإصلاح late-boundary.

## قرار التصدير في Phase 00

قارن مرشحين على نفس الاختبارات:

- A: composition واحدة بـRemotion للمعاينة والإخراج، وFFmpeg للتحضير/الترميز حسب الحاجة. الأسهل في توحيد المشاهد.
- B: FFmpeg للوسائط والصوت، مع Remotion لمشاهد الجرافيك المطلوبة فقط وcache. قد يقلل العمل للفيديو الطويل قليل الجرافيك، لكنه يضيف عبء parity.

ابدأ بالأبسط. لا تجمع المسارين في الإنتاج تلقائيًا. إن فشل A في حد الذاكرة/الزمن اختبر B، واختر مسارًا واحدًا موثقًا قبل Phase 01. MLT ليس اختيار V2 افتراضيًا؛ يمكن الاحتفاظ به فقط إذا أظهرت المقارنة تفوقًا يبرر تعقيده. لا يوجد benchmark منفذ ضمن هذه الحزمة.

## تشغيل محلي وعام

محليًا: browser → localhost API → PostgreSQL + local asset store → local worker. التحرير والحفظ والتصدير بعد تجهيز المصادر لا يعتمدون على AI. الاستدعاءات السحابية للتفريغ/AI تحتاج إنترنت؛ «محلي» ليس وعدًا بـoffline AI.

للجمهور: نفس domain والعقود؛ هوية حقيقية، object storage وروابط قصيرة العمر، workers معزولون، ومراقبة quotas. لا نعرّض جهاز المستخدم بخادم/tunnel كخطة production.

Cloudflare احتمال للاستضافة؛ [Containers](https://developers.cloudflare.com/containers/) تدعم runtimes وموارد مختلفة عن Worker JavaScript وحده. اختيارها أو VM/مزود آخر يتبع اختبار duration/disk/memory/cost، لا أسعار وردت في اللايف.

## قواعد التشغيل

- DB transaction تسجل التغيير والمهمة/outbox معًا. dispatcher يمكن أن يعيد المحاولة دون فقد job.
- delivery قد تتكرر؛ idempotency وlease fencing يمنعان نتيجة worker قديم من الكتابة بعد إعادة الإسناد.
- cancel يوقف العملية الفرعية وينظف الملفات الجزئية؛ لا يضع الحالة succeeded.
- progress لا يصل 100% قبل validation والنشر. عرض failed مع إجراء retry واضح.
- worker لا يتلقى مسارًا حرًا أو shell command من الـAI؛ يتلقى asset IDs ومقادير متحققة.
- ownership موجود في كل query منذ الأساس، حتى لو المستخدم المحلي واحد.
