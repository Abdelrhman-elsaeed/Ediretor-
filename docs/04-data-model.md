# نموذج المشروع والوقت والأوامر

الحالة الحالية — 2026-10-11: schemaVersion 1 والأوامر والحفظ والـhistory للمسار المحلي منفذة في packages/contracts وpackages/domain. [عقد التشغيل](../specs/001-project-core/runtime-contract.md) يحدد الجزء المتاح وحدوده؛ نموذج المستقبل أدناه محفوظ، ولا يعني تنفيذ transcript أو sync أو scenes. الاسم الحالي لبداية المقطع في المشروع هو sequenceStartUs.

## قاموس البيانات

Phase 02 implementation adds readable document schema 2 (`transcriptRefs`, `displayCorrections`, `captionStyle`) and preserves schema 1 revisions/history/receipts. Immutable words live in separate transcript records, referenced by ID/source/hash; raw responses remain separate. Correction scope is source word; delete scope includes clip occurrence. Provider normalization repairs retain their reported timestamp and review flag. Detailed implemented fields and migration policy: [runtime contract](../specs/002-transcript-editing/runtime-contract.md).

| الكيان | معناه |
|---|---|
| Project | هوية المشروع ومالكه ومؤشر revision الحالية |
| ProjectDocument | snapshot شاملة للتحرير؛ schemaVersion وrevisionId |
| Asset | الأصل أو مشتق منه؛ ID/hash/version وstream metadata، لا URL دائمة |
| Sequence | ترتيب العرض النهائي، canvas وfps rational ومسارات |
| Track | نوع العناصر وترتيب compositing، mute/hidden/locked |
| Clip | ظهور محدد من asset داخل sequence، بتوقيت مصدر وتوقيت عرض |
| Transcript | كلمات immutable في توقيت asset + تصحيحات عرض منفصلة |
| SyncGroup | تسجيلات لنفس الحدث بعلاقة زمنية معلومة واختيار صوت رئيسي |
| EditLinkGroup | عناصر تُقص وتتحرك معًا؛ يختلف عن مصدر مزامنتها |
| SceneInstance | نسخة template/scene مع props وcues وتوقيت |
| Anchor | ربط عنصر بكلمة داخل clip occurrence أو بزمن sequence صريح |
| EditProposal | تغييرات مقترحة مبنية على baseRevision ومراجع أدلتها |
| ExportSnapshot | revision + asset/template/font hashes + profile + renderer version |

يمكن أن يتكرر نفس asset ونفس الكلام داخل sequence؛ لذلك wordId منفرد لا يحدد موقعه النهائي.

## محتوى ProjectDocument

- schemaVersion، projectId، revisionId، parentRevisionId.
- sequence: canvas، fps numerator/denominator، tracks، clips، transitions.
- assetRefs: إصدارات metadata والمصادر والمشتقات اللازمة.
- transcriptRefs وdisplayCorrections.
- syncGroups وeditLinkGroups.
- sceneInstances: templateVersion أو sceneArtifactHash، props، anchors.
- kitSnapshot وstyleSnapshot وbriefSnapshot؛ تحديث kit الأصلية لا يغيّر مشروعًا محفوظًا.
- لا تدخل محادثة كاملة أو job progress أو bytes ميديا في document. هي سجلات مرتبطة، ولا تقرر شكل الإخراج وحدها.

الحفظ الذري يشمل كل ما يغيّر النتيجة. تنظيم التخزين في جداول متعددة مسموح بشرط snapshot/transaction consistent؛ المطلوب ليس إجبار كل النظام على جدول واحد.

## الوقت

- زمن المصدر: integer microseconds مع stream timebase/PTS metadata. BigInt داخليًا، decimal strings في JSON.
- زمن sequence: integer microseconds. fps قيمة كسرية مثل 30000/1001.
- زمن المشهد: time relative to scene start؛ التقييم المرئي بـframe deterministically.
- جميع الفترات half-open: [start, end).
- frameIndex = floor(sequenceUs × fpsNum / (1,000,000 × fpsDen)) باستخدام integer arithmetic. أوقات الرسم تؤخذ من رقم الإطار؛ لا accumulation متكرر لكسور الثواني.
- قص متزامن لا يغيّر زمن المصدر المخزن؛ ينتج clips/segments جديدة مع المراجع.
- VFR: proxy له خريطة إلى أوقات المصدر الأصلية؛ تحويله إلى CFR لا يسمح بافتراض frame-to-frame تطابق المصدر.

عند سرعة 1x: sourceUs = sourceInUs + (sequenceUs − timelineStartUs). النموذج يحتفظ بـrate numerator/denominator، لكن دعم السرعات غير 1x مؤجل حتى تضاف اختبارات audio والتوقيت؛ لا نقبل قيمة غير مدعومة بصمت.

## مثال متزامن

الكاميرا سجلت من بداية الحدث، الشاشة بدأت متأخرة ثانيتين. convention: groupTime = sourceTime + offset.
- camera offset = 0، screen offset = 2s.
- الحدث عند groupTime=12s يقابل camera source=12s وscreen source=10s.
- قص group interval [12s,15s) يقص الكاميرا [12s,15s) والشاشة [10s,13s)، ثم ripple للجزء اللاحق معًا.
- مصدر لا يغطي الفترة يعرض gap وفق سياسة المشروع، لا يتمدد أو يتجمد تلقائيًا دون إعلان.

المزامنة المبدئية linear offset. نكشف drift عبر نقاط قرب البداية والنهاية؛ إذا ظهر، نحتاج explicit rate mapping/resampling مع تحقق، أو نضع المصدر needs_alignment ونطلب تصحيحًا، ولا نزعم أن offset ثابت كافٍ.

## Anchors وسلوك القص

Anchor كلمة = transcriptVersion + wordId + clipId/occurrenceId + offsetUs.
Anchor مطلق = sequenceUs + ripplePolicy ثابتة.
Anchor نسبي = clipId + localTimeUs.

| الحدث | السلوك |
|---|---|
| حذف anchor word | العنصر needs_review أو يُحذف وفق policy معلنة؛ لا نقله لكلمة عشوائية |
| قص جزء من clip | تحديث anchors الباقية ونطاقات العرض ذريًا |
| تكرار clip | occurrence IDs جديدة؛ anchors للنسخة الجديدة منفصلة |
| ripple قبل عنصر مثبت بالمصدر | يتبع محتواه |
| ripple قبل عنصر بزمن ثابت | يبقى حسب ripplePolicy المختارة |
| مسار locked داخل نطاق القص المرتبط | نرفض العملية ونوضح السبب، أو نحتاج تغيير الربط صراحةً |
| overlap بصري | ترتيب tracks ثم z-order محلي ثابت؛ النوع لا يحدد الأولوية وحده |

## الأوامر المقترحة

ImportAssetRef، InsertClip، SplitClip، TrimClip، MoveClip، RippleDeleteRange، SetSyncOffset، LinkClips، SetPrimaryAudio، SetLayout، SetGain، SetCaptionStyle، CorrectWordText، AddScene، UpdateSceneProps، BindCue، RemoveItem.

CommandEnvelope يحتوي commandId وbaseRevisionId وactor وscope وpayload. CommandBatch قائمة ذرية. الـAI لا يرسل SQL أو patch حرًا على document؛ يرسل هذه الأوامر.

## الحفظ والتراجع والتعارض

1. تحقق صلاحية/ملكية references وbaseRevision.
2. طبق batch على نسخة مؤقتة؛ تحقق invariants ونطاق capabilities.
3. احفظ revision وhistory وidempotency record داخل transaction واحدة.
4. رد revisionId وdiff وwarnings؛ حدّث UI بعد الإقرار.
5. إعادة commandId بنفس payload ترجع نفس النتيجة؛ بنفس ID وpayload مختلف تُرفض.
6. Undo/Redo عبر history موحد لكل التعديلات، مع history cursor محفوظ وbranch عند تعديل بعد Undo. استرجاع snapshot ينشئ revision جديدة؛ لا يمسح audit.
7. استجابة AI مبنية على revision قديمة تتحول stale؛ re-plan أو مراجعة صريحة. لا last-write-wins صامت.
8. أخطاء الحفظ تبقى unsaved وتُحفظ pending commands محليًا للاسترداد مع baseRevision؛ إغلاق التطبيق لا يخفي حالة عدم الحفظ.

## التصدير

تلتقط مهمة التصدير ExportSnapshot قبل enqueue، وتتحقق من وجود جميع الأصول/الخطوط. URL التحميل تُحل وقت التنفيذ، لكن المحتوى يُطابق hash. أي اختلاف يُفشل المهمة برسالة واضحة.

نفس revision مع نفس runtime/assets/profile تعطي نفس semantics والإطارات المطلوبة؛ لا نعد بتطابق bytes للملف المضغوط عبر مختلف الأجهزة.
