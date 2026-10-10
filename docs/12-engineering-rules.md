# قواعد هندسة Ediretor — TypeScript ومحرر الفيديو

نسخة 1 — 2026-10-10. هذه القواعد هي تكييف مهارة المستخدم dotnet-layered-api-architect لطبيعة المشروع الحالي. تغطي قرارات الكود والتنظيم؛ لا تثبت اختيار ORM/renderer ولا تبدأ مرحلة تنفيذ.

الأصل والتغييرات موثقان في [خريطة القواعد](13-dotnet-rule-mapping.md). المتطلبات المرجعية: [Architecture](03-architecture.md)، [Data model](04-data-model.md)، [Quality](06-quality.md).

## E01 — المسؤوليات واتجاه الاعتماد

نحتفظ بفصل Controller → Service → Repository، مع فصل قواعد المونتاج النقية عن orchestration:

~~~text
HTTP / WebSocket / Queue adapter
                 |
         Application use case
           /            \
   Editing Kernel    Repository / Storage / Provider ports
                              |
                   Infrastructure implementations

React view → Project Session → Editing Kernel / API client
Preview / Export → shared Composition contract
~~~

- Controller/route handler/queue consumer: parsing، session identity، استدعاء use case، وتحويل النتيجة إلى protocol. لا SQL أو قواعد قص أو تنفيذ FFmpeg.
- Application: ملكية المشروع وسياسات الاستخدام، المعاملة، orchestration، وتنسيق domain مع I/O.
- Domain/Editing Kernel: الفترات والقص والربط والـanchors والتحقق من invariants؛ pure ولا يعرف React أو Nest أو ORM أو filesystem.
- Repository: SQL/projections/constraints/storage mechanics. قرار جواز الحذف أو القص في Application/Domain؛ تنفيذ bulk delete/update المحدد داخل Repository.
- Outbound clients: مزود transcription/AI/storage خارج منطق الأعمال.
- Infrastructure implementations تعتمد على ports؛ لا يستورد domain implementations ليُنشئها.
- لا تستدعِ repository لدومين آخر لتجاوز قواعده. استدعِ use case/Interface الدومين المسؤول أو orchestrator صريح يستخدم ports مأذونة في transaction واحدة. لا cycles أو إصلاحها بنقل الأعمال إلى Controller.
- Read-only queries أيضًا تمر Application query use case، دون إجبارها على تحميل aggregate كامل.

## E02 — Modules والتنظيم وSOLID

- Module تجمع مسؤولية مفهومة خلف Interface صغيرة؛ التقسيم حسب ما يتغير وليس عدد ملفات شكلي.
- استخدم functions للمنطق النقي، وclasses عند وجود lifecycle أو state/injected dependencies واضحة. لا تحوّل كل function إلى Service class.
- Interface عند seam تحتاج عزل I/O أو runtime/provider substitution أو contract واضح للاختبار؛ لا IRepository<T> مفروضة لكل جدول.
- composition قبل inheritance. لا BaseModel تُجبر كل value object أو snapshot على حقول حذف وتواريخ.
- أسماء domain مفردة وحقول camelCase، وPascalCase للأنواع وReact components. booleans واضحة مثل isLocked/hasAudio؛ أسماء ملفات متسقة مع الحزمة.
- داخل ProjectService استخدم load أو save بدل تكرار Project في كل method. standalone function يمكن أن تحمل اسم المجال لتوضيحها.
- options object عند تعدد المعاني/المعاملات الاختيارية؛ ليست قاعدة رقمية تجبر كل أربعة parameters على class.
- مكان افتراضي عند الحاجة: packages/domain وcontracts وcomposition؛ apps/api/features/<feature> لـtransport/application؛ infrastructure للـadapters؛ apps/web/features وapps/worker.
- هذه خريطة placement وليست أمرًا بإنشاء كل المجلدات الآن. Phase 00 تحتاج harness ووحداته فقط.

## E03 — TypeScript والعقود والإعداد

- strict type checking؛ public Interfaces typed صراحةً. unknown للمدخل الخارجي ثم runtime validation؛ لا as/assertion أو any لتجاوز تحقق.
- Request/Response DTOs مستقلة عن ORM rows؛ لا entities أو navigation objects داخل DTO.
- readonly objects/arrays تعبر intent؛ لا نفترض أنها تمنع mutation في runtime أو توفر deep immutability. احمِ snapshots بآلية التنفيذ والاختبارات.
- create وpatch وdomain command أنواع ذات معنى مستقل. يمكن مشاركة schema إذا semantics والعقد متطابقان؛ لا نسخ DTO لكل endpoint لمجرد العدد.
- في patch: absent يعني لا تغيير، وnull يعني clear فقط لحقل يقبله العقد؛ whitelist لحقول التعديل، ورفض unknown fields في أوامر التحرير.
- typed config تتحقق عند startup. secrets server-only؛ thresholds قرب Module المالك بإعداد discoverable، لا giant Constants bag.
- DI عبر constructors/functions؛ framework wiring في composition root. لا mutable static mapper/service locator.
- إن استُخدم Nest: لا تضع owner/currentRevision/transaction متغيرًا على singleton؛ مرر request/job context صراحةً. اختر lifetime بحسب المورد بدل نسخ AddScoped لكل شيء.
- لا تُدخل mapping library لمجرد تقليد AutoMapper؛ pure mappers أو SQL projections واضحة.
- عقد HTTP منفصل عن application result؛ pure domain لا يرجع status codes.

## E04 — الموديل والعلاقات والتاريخ

- استنتج العلاقات من spec والكود المؤكد؛ الغموض المؤثر في cardinality/ownership يحتاج حسمًا قبل schema نهائية. تابِع الأعمال المستقلة ودوّن الافتراض.
- explicit IDs وforeign keys للكيانات المخزنة؛ stable opaque IDs للمشروع/asset/clip/revision/command. صيغة ID تُثبت في phase المعنية؛ لا int شرطًا عامًا.
- علاقة تحمل حالة/توقيت/دور تصبح entity/value object صريحة: clip occurrence يحمل timing؛ SyncGroup member يحمل offset؛ هذه خصائص علاقة لا الأصل.
- pure association قد تستعمل composite key؛ entity لها identity مستقلة قد تستعمل surrogate key مع unique constraints المناسبة. لا أفضلية أداء مطلقة بلا قياس.
- العلاقات الذاتية تُنمذج بمراجع/روابط، لا inheritance على أنها is-a؛ امنع cycles حين يمنعها المجال، وميّز أدوار foreign keys.
- قيم point-in-time داخل revision ثابتة: kit/template/font/asset hashes. لا إعادة بناء الماضي من أحدث إعداد.
- بيانات كل مستخدم/طلب لا تُخزّن في حقل مشترك قابل للاستبدال أو ذاكرة مؤقتة بدل durable state.
- database constraints تكمل validation: FK وunique وcheck وconditional updates. لا rely على check-then-write وحده أمام race.

## E05 — Repository والاستعلامات

- repository methods تعبر query/command المطلوب، وتعيد Promise لبيانات materialized أو typed result؛ لا ORM query builder يتسرب للـApplication أو serializer.
- filtering/sorting/pagination/projection داخل DB. اختر الأعمدة المطلوبة؛ query تحمل كل حقول snapshot مطلوبة ليست ممنوعة لمجرد أنها كاملة.
- تجنب N+1 باستعلامات batch/joins وaggregate SQL. البيانات الطويلة bounded paging/streaming، لا تحميل كل الجداول/الكلمات/الفيديو في RAM.
- existence-only: exists query؛ لو تحتاج owner/version/status/invariants اجلبها مرة واحدة بدل exists ثم fetch لنفس الغرض.
- تحقق من كل ID في المجموعة، بما فيها owner/deletion policy؛ قارن requested unique IDs بالمطابقات، لا تكتف بوجود عنصر صحيح واحد.
- empty list = []، not-found مفردة قيمة صريحة؛ uniqueness المهمة بconstraint لا الاعتماد على أول صف صادف وجوده.
- patch updates تكتب حقولًا مسموحة فقط مع owner + expected revision/version في predicate. لا mass assignment من جسم الطلب.
- bulk changes scoped ومقاسة بـaffected row count عند الحاجة؛ إدخال parent/children في transaction واحدة دون افتراض ORM auto-cascade.
- transactions تبدأ عند use case؛ callbacks/UnitOfWork تمرر نفس transaction connection لكل repository مشارك. لا commit مستقل في كل repository.
- لا I/O شبكة أو render طويل داخل DB transaction.
- inspect query plans وquery count للبطء الفعلي. لا تعتمد على ترتيب شروط WHERE المكتوبة أو عدد JOINs وحده لتقرير الأداء.
- لا نفرض tracking settings لمنظومة لا تستخدم change tracker؛ lifecycle والـfreshness يحددهما adapter.
- ORM/SQL library تختار بعد فحص الموجود؛ لا تغيير أدوات البيانات كجزء جانبي من نقل function وقت.

## E06 — الأخطاء والـAPI

لـJSON API العادية: response envelope متسقة، مفاتيح ثابتة، ورسالة قابلة للترجمة. success/failure لا يملكان حقولًا متناقضة.

~~~typescript
type ApiResponse<T> =
  | { isSuccess: true; data: T; requestId: string }
  | {
      isSuccess: false;
      error: { code: string; message: string; details?: unknown };
      requestId: string;
    };
~~~

هذه صيغة مستهدفة للعقود الجديدة؛ لا تغير contract موجودة مع عملاء فعليين دون migration. يستبدل unknown في details بـschemas خاصة بكود الخطأ قبل كشف بيانات للعميل.

- UI تتفرع على code ثابت مثل EDIT_REVISION_CONFLICT، وليس نص الرسالة. unknown future code له fallback آمن.
- HTTP status صادق: 400 invalid syntax/shape، 401 absent identity، 403 denied أو 404 حسب سياسة إخفاء الموارد، 404 missing، 409 revision conflict، 422 domain validation، 202 job accepted، 500 unexpected.
- 204/download/stream/SSE لها protocol contracts مناسبة، ولا تُلفّ media bytes في JSON.
- controller يستخرج identity موثوقة من session/job capability، لا ownerId من payload. Application يتحقق authorization لجميع أبواب الدخول.
- singular feature commands/routes واضحة؛ POST لإنشاء/action، PATCH للتعديل الجزئي، DELETE للسياسة المعلنة. GET دون effects.
- إنشاء parent مع children المطلوبة عملية واحدة؛ فصل endpoint للطفل إذا كان يمكن تعديله مستقلًا.
- يمكن مشاركة endpoint بين شاشتين لهما نفس semantics. افصل query DTO عند اختلاف الاستخدام/الأحجام بدل تضخيم response عامة.
- أعد revision/job/resource identifiers والحالة اللازمة للخطوة التالية؛ لا bool أو echo للطلب دون نتيجة فعلية.
- runtime shape validation عند transport؛ business validation في application/domain؛ DB constraints عند persistence. طبقات متكاملة وليست تكرارًا بلا وظيفة.

## E07 — الحذف والمهاجرات

- lifecycle لكل نوع: مشروع قد يُؤرشف، revision ثابتة لها retention، derivative قابلة لإعادة البناء، temp file تُحذف بعد انتهاء استخدامها.
- إذا وُجد deletedAt/status في كيان، تطبق policy في القراءة والتحقق من references أيضًا، مع ownership. restore queries مسماة ومأذونة.
- سياسة cascade صريحة لكل علاقة. يمكن DB cascade للروابط التابعة التي لا تملك عمرًا مستقلًا؛ لا cascade عامة تمس originals/snapshots/jobs.
- حذف file يتطلب التحقق من scope والمراجع وactive jobs؛ لا orphan cleanup قد يمس asset مشتركة أو مستخدمة في export.
- migrations محفوظة ومراجعة وإصداراتها لا يعاد كتابتها بعد تطبيقها على بيانات محتفظ بها، ولو المطور واحد.
- generated SQL أو handwritten SQL كلاهما يخضع للمراجعة واختبار upgrade/backup/restore؛ لا migration تلقائية مدمرة مع startup.
- legacy schema baseline تُفحص على snapshot معزولة؛ لا حذف migration history أو التحايل على snapshot للتوافق الظاهري.
- اختيار أداة migration لا يغير مسؤولية حماية البيانات أو خطة الفشل والـrollback.

## E08 — async والموارد والتشغيل

- pure calculation تبقى sync إن كانت قصيرة. DB/network/filesystem calls async ويُراقب فشلها.
- Promise/async لا يحوّلان الحساب الثقيل إلى parallelism. نقل media/CPU work إلى worker process/native tools وفق خطة المشروع.
- bounded concurrency/backpressure بدل Promise.all على آلاف jobs أو clips. قِس RAM/temp disk قبل زيادة التوازي.
- connections/processes/streams تتحرر في finally أو lifecycle واضحة. مرر cancellation/deadline حتى underlying operations.
- HTTP acceptance ليست تنفيذًا في background داخل request بلا دوام؛ durable jobs + retries محدودة + idempotency.
- lease/fencing يمنع worker قديمًا من اعتماد نتيجة بعد انتقال المهمة؛ publish بعد validation فقط.
- لا .NET-specific ConfigureAwait أو task-thread conventions؛ اختَر runtime constructs الحالية.
- لا افتراض تسريع GPU قبل إثبات المسار الذي يستخدمه.

## E09 — الحالة المشتركة للمحرر

- Editing Kernel واحدة لأوامر UI والـAI. ProjectDocument تشمل كل ما يؤثر على النتيجة أو مراجع ثابتة له.
- React يحتفظ UI selection/playhead/drag state؛ لا independent persistent motion/broll/caption state خارج revision.
- Project Session تنظم load/dispatch/flush/undo/redo؛ browser يمكنه optimistic preview، وserver يعيد التحقق عند commit.
- baseRevision + commandId + atomic batch؛ duplicate payload يعيد نفس outcome، وpayload مختلف لنفس ID مرفوض.
- source/sequence/scene time منفصلة؛ integer microseconds وrational fps، وdecimal strings في JSON.
- clip occurrence ID جزء من word anchor؛ حذف anchor له سياسة واضحة؛ لا إعادة توقيت المصدر لتسهيل الواجهة.
- locks وsync groups وlinked ripple تنفذ في domain، لا كل component بطريقته.
- export snapshot مثبتة بكل asset/template/font/runtime version المطلوبة؛ لا قراءة latest state بعد enqueue.
- preview/export يشتركان في semantics؛ اختبارات media فعلية تثبت parity.
- optimistic updates لا تعني saved؛ save failure حالة مرئية مع recoverable pending commands.

## E10 — Performance والإعداد العام

- logs مفيدة من البداية: request/job/revision IDs وduration؛ redact keys وتجنب طباعة transcripts/payloads الحساسة افتراضيًا.
- metrics للأداء والتكلفة دون خلط metadata المنقحة بالميديا الخاصة.
- cache فقط عند كلفة مثبتة؛ keys تشمل owner scope/content/version/profile؛ invalidation محددة. immutable content-addressed scenes تختلف عن SQL cache.
- Redis/broker/stored procedure/NoSQL ليست متطلبات layering. SQL join معقد ليس وحده مبررًا لإضافة procedure أو قاعدة أخرى.
- query plan والتكاليف الفعلية تحدد optimization؛ لا ادعاء أن كل ORM query تفتقد plan reuse.
- بيانات JSON مرنة داخل persistence الحالية ممكنة دون إضافة NoSQL تلقائيًا.
- لا treat-all-users-authorized في هذه الخطة: local identity محصورة بprofile محلي؛ كل resource لها ownership من أول phase يستخدم persistence.
- account/login UI وhosted quotas تتبع phases؛ أساس ملكية البيانات لا ينتظر النشر العام.

## E11 — نقل الكود والعمل المرحلي

- اقرأ implementation كاملة للملف الذي ستعدله، وInterface/callers/tests المعنية. افحص dependencies قبل النقل.
- صنّف reuse/adapt/reimplement/defer، واحتفظ باختبارات السلوك المفيدة؛ النجاح القديم ليس دليل نجاح البيئة الجديدة.
- لا copy للـmonorepo أو shared god component أو .git/.env/media/private data.
- لا runtime dependency على legacy absolute paths؛ المشروع الجديد يعمل مستقلًا.
- architecture layering تبنى داخل vertical slice للمرحلة؛ لا «كل repositories أولًا، ثم كل services، ثم كل UI».
- Phase 00: harness ومكتبات يحتاجها فقط؛ DB/Nest/queue/AI لا تُبنى لمجرد أنها في roadmap.
- اقرأ git status/diff قبل commits واحترم التفويض؛ لا commit لكل layer لمجرد أن المصدر يقول ذلك.
- إعادة تنظيم لازمة للمهمة مسموحة مع حفظ السلوك؛ عيوب غير مرتبطة تُسجّل ولا توسع النطاق تلقائيًا.
- لا تغيّر SLO فاشلة كي تنجح الورقة. سجّل measured result/assumption/limitation منفصلة.

## E12 — مراجعة النتيجة

قبل إكمال القدرة راجع، بحسب النطاق:
- dependency imports: لا DB داخل transport/UI ولا infrastructure داخل domain.
- query ownership/validation لجميع المراجع، وrace handling والمعاملات.
- DTO/runtime validation/patch fields/error codes/statuses.
- حفظ/Undo/preview/export للقدرات التي تغير التحرير.
- الموارد/cancel/retry والاختبارات الفعلية للفشل.
- evidence والمهام والـADR والآثار على contracts.
- تقرير ما بُني وما نُقل وما اختُبر وما أُجّل والافتراضات التي بقيت مفتوحة.

الاختبارات على السلوك والـInterfaces، لا assertions على عدد الملفات/أسماء classes. لا تضف tests شكلية لكل تعديل نصي.

## مراجع تحقق تقنية

هذه المراجع تدعم فروق runtime، أما توزيع المسؤوليات والسياسات أعلاه فهي قرارات المشروع:
- [TypeScript types and assertions](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html): type assertion ليست runtime validation.
- [Node event loop](https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop): العمل الطويل قد يحجب event loop؛ async وحدها لا تكفي.
- [Nest injection scopes](https://docs.nestjs.com/fundamentals/injection-scopes): lifetimes تُختار حسب الحاجة؛ ليست نسخة تلقائية من scoped services في .NET.
- [PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html): primary/foreign/unique constraints، ومنها المفاتيح المركبة وسياسات referential actions.
