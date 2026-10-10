# الجودة والأداء وبوابات القبول

هذه خطة تحقق، وليست نتائج اختبارات منفذة. نتائج Phase 00 القصيرة وحدودها في [docs/evidence/phase-00.md](evidence/phase-00.md)؛ Q05/Q06/Q10 لم تكتمل، لذلك لا تتحول أهداف RTF/الذاكرة إلى حدود دعم.

## عينات القبول

| ID | العينة | الخطر الذي تكشفه |
|---|---|---|
| Q01 | 2–5 دقائق شرح عربي مع كلمات إنجليزية | transcript وتصحيح الكتابة وRTL |
| Q02 | كاميرا وشاشة منفصلتان وبدء متأخر للشاشة | offsets والقص المرتبط والصوت المكرر |
| Q03 | فيديو كاميرا/شاشة مدمج مسبقًا | عدم الادعاء بفصل مصادر غير موجودة |
| Q04 | شاشة صامتة + صوت/كاميرا منفصلان؛ ثم فيديو صامت وحده | source roles ومسار بلا transcription |
| Q05 | 60 دقيقة 1080p، 500 قصّة، 100 موضع جرافيك | طول المشروع وكلفة الفهرسة والرندر |
| Q06 | 4 ساعات 1080p، مشهد أول وآخر وفجوات كبيرة | عدم بناء intermediate جرافيك بطول الفراغات بلا قياس |
| Q07 | VFR و29.97fps وصوت 44.1/48kHz؛ offset سلبي وانحراف تدريجي | تقريب الوقت وdrift |
| Q08 | ملف تالف، قرص ممتلئ، asset مفقود، cancel وworker kill | recovery ووضوح الأخطاء |
| Q09 | مشروعان بهويتين مختلفتين ثم No Kit | تسرب سياق الـAI أو cache |
| Q10 | 4K ومشهد عربي كثيف | قرار دعم 4K؛ تظل عينة تقييم حتى نجاحها |
| Q11 | AI response قديمة أثناء تعديل يدوي | stale revisions والذرية |
| Q12 | مشروع مستخدم A وطلبات مستخدم B | ownership بما فيها jobs وملفات النتائج |

توثق كل fixture مصدرها وحق استخدامها وhash وخصائصها. يُفضّل تسجيل عينات المستخدم أو مواد مصطنعة معروفة التوقيت. لا يعتمد الإصدار على فيديو واحد.

## القياسات المقترحة

- commit أمر تحرير محلي في Q05: p95 أقل من 100ms، باستثناء العمل async وI/O.
- seek في proxy جاهزة: p95 أقل من 500ms على الجهاز المرجعي، بعد فصل cold cache عن warm.
- preview 1080p proxy بمعدل 30fps: dropped frames أقل من 1% في تشغيل خمس دقائق على profile المرجعي.
- memory: سقف ابتدائي 2GB للواجهة و8GB للـworker في Q05، يُعدل إن كان الجهاز أقل؛ كل تجربة تسجل peak RAM وtemp disk.
- source/sequence mapping: لا تراكم خطأ حسابي؛ حدود العرض ضمن إطار واحد في مقارنة preview/export.
- A/V sync: خطأ لا يزيد عن 40ms في marker fixtures قرب البداية والوسط والنهاية.
- captions: نسبة 95% من الكلمات المعلّمة يدويًا ضمن 150ms كتقييم مبدئي للمزود؛ التصحيح اليدوي متاح.
- renderer اختيار أولي: استهداف real-time factor لا يزيد عن 2 في Q05 على الجهاز المرجعي، بعد تحديد codec/profile. RTF = زمن التصدير / مدة الناتج.
- Q06: لا crash أو نمو ذاكرة غير محدود؛ إن تعذر دعمه تُوثق limits واضحة ولا تُعلن الأربع ساعات مدعومة.
- لا نغيّر هدف فاشل لمجرد جعل التقرير ناجحًا؛ أي تغيير للـSLO يسجل سببه وأثره في decisions.

بدون مواصفات الجهاز لا تعتبر هذه SLO تعاقدية. Phase 00 تسجل CPU/GPU/RAM/disk/OS وإصدارات الأدوات والـcodec ومعدل الدقة ومجموعة المشاهد.

## أنواع التحقق

Domain: property tests للفترات، random cuts، trim/split/duplicate/ripple، inverse commands، anchor projection، half-open boundaries. الاختبارات تعبر Interface الـEditing Kernel.

Integration: DB transaction rollback، autosave conflict، schema migration، outbox dispatch، duplicate delivery، lease expiry، asset hashes، retry وcancel.

Media: render ملفات فعلية مع ffprobe وفحص frames/audio markers. اختبارات mocks لا تثبت صحة الإخراج.

Visual: لقطات مرجعية للقوالب والعربية والنص المختلط، baseline للمعاينة والتصدير. المقارنة تراعي الضغط وanti-aliasing، لكن لا تتسامح مع نص مفقود أو توقيت خاطئ أو موضع متغير.

E2E: import → edit → save → restart → undo/redo → export، في الوضع اليدوي والتلقائي؛ ومع فقد الشبكة عن مزود AI.

Hosted: cross-tenant access، signed URLs، queue fairness، rate/quota limits، backup restore، deploy rollback.

## سياسة الفشل

- الملف التالف يظهر unsupported/corrupt بدل تعليق progress.
- عدم وجود صوت ليس تلفًا؛ نستورد visual asset ونوقف transcription لهذا الأصل فقط.
- missing font/asset: لا نستبدله صامتًا وقت التصدير؛ يظهر سبب قابل للإصلاح.
- worker kill: lease timeout ثم retry؛ لا نتائج مكررة ولا overwrite لنتيجة مختلفة.
- cancel: حالة نهائية واضحة، لا نشر ناتج جزئي، ويمكن للمستخدم إنشاء job جديدة.
- AI timeout/rate limit: المشروع محفوظ، وretry لا يعيد عمليات طُبقت بالفعل.
- autosave failure: unsaved ظاهرة وpending state للاسترجاع.
- تحديث schema: نسخة احتياطية، migration بإصدار، ورفض future version غير المدعوم.

## دليل اكتمال المرحلة

ملف evidence يحتوي:
- build/commit ID إن وجد ووقت التشغيل وبيئة الأدوات.
- fixture IDs والأوامر التي شُغلت.
- expected/actual، القياسات والملفات الناتجة.
- known limitations وقرار go/no-go.
- لا توضع علامات إنجاز بمجرد كتابة الكود.

إصدار عام لا يخرج قبل نجاح Phase 09. إصدار محلي موثوق يحتاج Phase 08، حتى لو أمكن تجربة المنتج تدريجيًا قبلها.


