# Phase 00D — Design Foundation وواجهة V2

**Active update — 2026-10-11:** Figma is cancelled by the user. The original scope below is retained as historical design work, not a prerequisite. The warm editorial tokens/product brief now guide the actual Phase 01 React implementation. Arabic RTL, an explicit LTR timeline, both themes, focus, reduced motion, and responsive browser review are validated against the application. No Figma task is claimed as completed.

الحالة: تحضير handoff جارٍ بالتوازي مع Phase 00؛ [المسودة التعاقدية](../../docs/design/phase-00d-handoff.md) موجودة، لكن artifact Figma ومراجعتها غير متاحين بعد. لا ينتظر هذا المسار نجاح بوابة renderer ولا يعلن اكتمالها.

## النتيجة

نظام تصميم وprototype كامل للمنصة في Figma يحدد تجربة المستخدم واتجاه واجهة V2 الجديدة، مع handoff يمكن تنفيذه في React/TypeScript دون نسخ واجهة TextCut القديمة.

## داخل النطاق

- هوية بصرية وأدوار ألوان semantic بعيدة عن palette SaaS الأزرق/البنفسجي المعتادة.
- Typography عربية أولًا مع mixed Arabic/English وRTL/LTR وcode/time formatting.
- Design tokens، spacing، radius، elevation، icons، focus/keyboard states، responsive rules.
- Dashboard/project library، onboarding/import، processing state، editor shell، timeline، preview، transcript، inspector، media tracks، export، job status، settings.
- حالات empty/loading/unsaved/conflict/failed/cancelled/missing asset/missing audio/unsupported media.
- Prototype flows من import إلى preview ثم save/export، مع annotations للعقود وقرارات state.
- Accessibility review: contrast، focus، target size، keyboard order، reduced motion، readable Arabic.

## خارج النطاق

لا production React implementation، ولا backend/database، ولا renderer decision، ولا نقل `transcript-editor.tsx` أو أي UI god component من القديم.

## سيناريوهات القبول

- **P00D-A1:** يستطيع شخص جديد فهم المنتج والتنقل من project library إلى import ثم editor ثم export دون screens ناقصة.
- **P00D-A2:** كل persistent editing state ظاهر في التصميم يمكن ربطه بـProjectDocument/revision/command؛ UI-only state معلّمة صراحة.
- **P00D-A3:** النص العربي المختلط بالإنجليزية، الكود، الأرقام، والتوقيتات تظهر باتجاه صحيح وبخطوط مثبتة.
- **P00D-A4:** prototype يعرض حالات الحفظ، unsaved، conflict، processing، cancel، failure، missing asset/audio، وretry.
- **P00D-A5:** Figma variables/components/styles وhandoff annotations كافية لبدء Phase 01 دون تخمينات أساسية في الألوان أو spacing أو responsive behavior.

## بوابة الخروج

لا تبدأ بناء frontend الإنتاجي قبل اعتماد artifact Figma أو تسجيل القيود المتبقية. اعتماد التصميم لا يعني اعتماد business behavior؛ العقود والاختبارات في Phase 01 تظل إلزامية.
