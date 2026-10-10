# خريطة تكييف مهارة .NET

المصدر: مهارة المستخدم dotnet-layered-api-architect/SKILL.md، قُرئت كاملة في 2026-10-10. لم تُعدّل النسخة الأصلية.

SHA-256 للمصدر وقت التكييف: DE7A4345C8951B96723F8A7CC007A2FF4AD09FBB2612C290716A2EFB755EA8E5.

المقصد: الاحتفاظ بكل مجموعات القواعد المفيدة وشرح التعديلات، بدل نقل وصفات EF/C# أو تعميمات أداء إلى runtime مختلف. المرجع التشغيلي هو [Engineering rules](12-engineering-rules.md)، وهذا الملف يشرح الأصل والسبب.

الحالات: احتفاظ = نفس المقصد؛ تكييف = طريقة مختلفة؛ استبدال = الوصفة الأصلية لا تناسب هذا المشروع؛ مؤجل = مرتبط بمرحلة/حاجة حقيقية.

| قسم الأصل / القاعدة | المعالجة هنا | المرجع والسبب |
|---|---|---|
| المقدمة: التزام الطبقات مع pragmatism | احتفاظ | E01/E02؛ المسؤولية واضحة دون infrastructure افتراضية |
| المقدمة: لا توسع صامت، احفظ السلوك | احتفاظ | E11/E12؛ scope/evidence/deferrals |
| المقدمة: لا تخمين العلاقات | تكييف | E04؛ حسم الغموض المؤثر، وتوثيق assumptions ومتابعة المستقل |
| المقدمة: قراءة الملفات وcommit كل خطوة | تكييف | E11؛ قراءة implementation وcallers؛ Git بحسب تفويض المهمة |
| §1 Controller → Service → Repository | احتفاظ وتوسيع | E01؛ إضافة pure Editing Kernel وworker/provider adapters |
| §1 Service لا يتجاوز دومين آخر | احتفاظ | E01؛ public use cases/ports مأذونة، لا تجاوز invariants |
| §1 Repository بلا business rules | احتفاظ | E01/E05؛ cascade policy في Application والتنفيذ في Repository |
| §1 HTTP/WebSocket/gRPC/queue/outbound | احتفاظ | E01؛ adapters منفصلة وuse cases مشتركة |
| §1 مجلدات Models/Services/Repositories | تكييف | E02؛ feature modules/packages حين تحتاجها المرحلة |
| §2 ترتيب بناء كل طبقة على حدة | استبدال | E11؛ vertical slices مكتملة دون خلط المسؤوليات |
| §3 naming / scoped method names | احتفاظ وتكييف | E02؛ idiomatic TS وأسماء واضحة |
| §3 BaseModel لكل entity | استبدال | E02/E04؛ تركيب حقول مشتركة حسب الحاجة، لا inheritance شاملة |
| §3 int IDs أفضل دائمًا | استبدال | E04؛ stable IDs للمشروع، واختيار التخزين بالقياس |
| §3 ICollection وexplicit FK | تكييف | E03/E04؛ readonly inputs وFKs صريحة للبيانات المخزنة |
| §3 NoTracking default | تكييف | E05؛ لا فرض tracker على ORM مختلف |
| §3 DbContext/config/DI | تكييف | E03؛ typed config وcomposition root وscope مناسب |
| §3 منع cascade عالميًا | استبدال | E07؛ lifecycle/relationship policy صريحة |
| §3 Code First | احتفاظ بالمقصد | E07؛ schemas ومهاجرات versioned؛ baseline متحقق للقديم |
| §3 centralized constants | تكييف | E03؛ discoverable config عند Module المالكة |
| §4 علاقة بها بيانات = bridge entity | احتفاظ | E04؛ offsets/clip instances/roles أمثلة من المنتج |
| §4 كل bridge لها PK منفردة | تكييف | E04؛ identity مستقلة عند الحاجة، وunique/composite constraints مسموحة |
| §4 self relationships ليست inheritance | احتفاظ | E04؛ أسماء أدوار ومراجع ومنع cycles حيث يلزم |
| §4 ملكية الحقل: entity أم relationship | احتفاظ | E04؛ توقيت ظهور asset على clip occurrence |
| §4 per-user mutable fact مستقل | احتفاظ | E04/E09؛ owner/version keys لا state مشتركة |
| §4 point-in-time history | احتفاظ وتقوية | E04/E09؛ immutable revisions/export snapshots |
| §4 soft delete بنسبة عامة | استبدال | E07؛ archive/retention/hard-delete للـtemp حسب النوع |
| §4 exclude deleted في queries/existence | احتفاظ مشروط | E05/E07؛ يطبق حين توجد deletion policy |
| §4/8 migrations يدوي SQL فقط بالإنتاج | استبدال | E07؛ generated أو handwritten بعد review/upgrade/restore checks |
| §4 حذف migration history لمطور منفرد | استبدال | E07؛ لا إعادة كتابة تاريخ مطبق على بيانات محتفظ بها |
| §4 حيل snapshot desync | استبدال | E07؛ inspect/baseline على snapshot معزولة وإصلاح موثق |
| §5 Generic IRepository إلزامي | استبدال | E02/E05؛ task-specific ports دون CRUD للجداول بلا حاجة |
| §5 repository يرجع IQueryable | استبدال | E05؛ query composition داخل adapter، لا builder عبر الطبقات |
| §5 pure query builder بلا async / I/O async | احتفاظ بالمقصد | E08؛ sync pure، async I/O، لا async كغطاء للحساب الثقيل |
| §5 IQueryable/IEnumerable خطر materialization | تكييف | E05؛ filter/sort/page/project في DB قبل hydration |
| §5 Select over Include / never SELECT * | تكييف | E05؛ selected fields المطلوبة، snapshot كاملة عند الحاجة |
| §5 parent+children insert/SaveChanges | تكييف | E05؛ atomic transaction، لا افتراض auto tracking |
| §5 UpdateInclude/PATCH | احتفاظ بالمقصد | E03/E05؛ whitelist fields + explicit null/absent + expected version |
| §5 bulk updates | احتفاظ | E05؛ scoped filters/affected rows |
| §5 Any / empty lists / First/Single/Find | تكييف | E05؛ exists إذا يكفي، لا fetch مزدوج، constraints وfreshness صريحة |
| §5 extensions تحمل cascade business logic | حسم تعارض داخلي | E01؛ سياسة الحذف في Application، repository تنفذ SQL؛ يتفق مع قاعدة الأصل أن Repository بلا business rules |
| §5 transactions / resources | احتفاظ | E05/E08؛ shared transaction + finally/cancel |
| §5 N+1 / GroupBy / DB filtering | احتفاظ | E05؛ bounded batches، SQL aggregates، query count |
| §5 ترتيب WHERE حول clustered column | استبدال | E05؛ execution plan يحدد الأداء |
| §5 ConfigureAwait/thread pool | استبدال | E08؛ Node event loop وnative/worker CPU execution |
| §5 predicate builder عند عدد فلاتر معين | تكييف | E05؛ typed composable filters داخل repository، لا threshold شكلي |
| §6 Service caller-independent | احتفاظ | E01/E03؛ explicit actor context، لا framework request في domain |
| §6 إصلاح cycle داخل Controller | استبدال | E01؛ استخراج orchestrator/use case، transport يبقى رفيعًا |
| §6 DTO/ViewModel/Entity | احتفاظ بالمقصد | E03؛ عقود منفصلة عن DB، لا مرحلتا mapping متطابقتان إجباريًا |
| §6 user ID يأتي من session | احتفاظ وتقوية | E06؛ adapter يحدد الهوية، Application يفحصها لكل transport |
| §6 AutoMapper/static helper | استبدال | E03/E05؛ pure mappers/projections، لا mutable global |
| §6 ResponseViewModel/ErrorCode | احتفاظ وتكييف | E06؛ discriminated union وstable codes وحالات HTTP صحيحة |
| §6 DTO لكل endpoint وعدد معاملات ثابت | تكييف | E02/E03؛ فصل semantics المختلفة ومشاركة المتطابق بوعي |
| §6 create != update / readonly records | احتفاظ وتكييف | E03؛ readonly types وpatch semantics وruntime validation |
| §6 تحقق كل ID وdeleted | احتفاظ وتقوية | E05؛ batch validation+owner+constraints ضد races |
| §6 specific actions لا Update god-method | احتفاظ | E05/E09؛ typed commands وinvariants |
| §7 routing / statuses / no raw entities | احتفاظ | E06؛ JSON API contract وexceptions للـmedia/streams |
| §7 endpoint لكل feature لا لكل screen | تكييف | E06؛ query semantics تحدد الفصل، لا عدد الشاشات وحده |
| §7 parent/children operation واحدة | احتفاظ | E05/E06؛ atomic payload/use case |
| §7 no echo / no nonpersisted business state | احتفاظ | E04/E06/E09؛ نتيجة محفوظة ومعرفات مفيدة |
| §8 logs وسرية البيانات | احتفاظ | E10؛ correlation/redaction من البداية |
| §8 cache / Redis / broker invalidation | مؤجل وتكييف | E10؛ تكلفة مثبتة وسياسة invalidation؛ لا broker لمجرد cache |
| §8 stored procedures/plan reuse claims | تكييف | E10؛ profile/explain؛ لا افتراض أن كل ORM query تتجاهل plan cache |
| §8 polyglot persistence | مؤجل | E10؛ الحاجة تسبق store جديدة |
| §8 Auth مؤجل ومعاملة الجميع كمصرح لهم | استبدال | E10؛ ownership/local guards أساس، account UI بالمرحلة |
| §8 concurrency/parallelism/conflict resolution | تكييف | E08/E09؛ workers/limits وoptimistic concurrency واقعية |
| §9 performance summary | مغطى بالقواعد السابقة | E05/E08/E10؛ لا وصفات إضافية متناقضة |
| §10 where does this go | احتفاظ | E01–E03/E06؛ domain/application/transport/infra placement |
| §11 scope and no premature infrastructure | احتفاظ | E02/E10/E11؛ phase-driven |
| §12 final review | احتفاظ وتكييف | E12؛ imports/contracts/behavior/media evidence |
| §13 report built/assumed/deferred/untouched | احتفاظ | E12؛ تقرير صريح بلا ادعاء نجاح غير مقاس |

## قواعد إضافية يفرضها محرر الفيديو

E09 يضيف المصدر/sequence/scene time، clip occurrences، snapshots، history موحدة، وتطابق preview/export. E08 يضيف durable jobs وcancellation/lease fencing. هذه مشتقة من متطلبات V2 وليست نسبتها إلى مهارة .NET الأصلية.

## أمثلة تحقق ذهني للتكييف

| طلب فعلي | السلوك المتوقع |
|---|---|
| تنفيذ Phase 00 ونقل interval engine | port صغير واختبارات وحزمة harness؛ لا إنشاء auth/DB CRUD لكل كيان |
| endpoint لتغيير عنوان المشروع | transport → application → scoped/versioned update؛ لا ORM في controller |
| طلب إضافة scene بإشارة asset غير مملوكة | رفض قبل commit؛ لا قبول الطلب لأن ID موجود في أي مشروع |
| export أثناء تعديل kit | snapshot مثبتة؛ لا الاعتماد على kit الحالية |
| حذف proxy قديمة | فحص references/jobs ثم حذف derivative وفق policy؛ لا soft delete أبدي لكل temp file |
| إصلاح دورة اعتماد بين serviceين | استخراج use case/orchestrator؛ لا نقل business logic إلى route handler |

هذه أمثلة مراجعة تصميم، وليست اختبارات تطبيق منفذة.
