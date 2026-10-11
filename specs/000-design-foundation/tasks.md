# Phase 00D — المهام

**Active update — 2026-10-11:** the Figma task list below is cancelled/superseded by the user's production frontend request. Checkboxes remain unchecked to preserve the fact that no Figma artifact was delivered. Frontend design/implementation/accessibility evidence belongs to [Phase 01](../001-project-core/tasks.md); do not treat these historical checkboxes as remaining prerequisites.

مسودة handoff التعاقدية موجودة في [docs/design/phase-00d-handoff.md](../../docs/design/phase-00d-handoff.md). لا تُعد هذه المسودة دليلًا على وجود Figma prototype أو مراجعة بصرية؛ تبقى المهام أدناه غير مكتملة حتى يُسلَّم artifact Figma قابل للمراجعة.

- [ ] P00D-T01: إنشاء Figma file وpage map وقرار visual direction.
- [ ] P00D-T02: تثبيت semantic color/type/spacing/radius/elevation/icon tokens وRTL/LTR rules.
- [ ] P00D-T03: بناء component library مع states وfocus/keyboard/reduced-motion variants.
- [ ] P00D-T04: تصميم dashboard، onboarding/import، processing، project library، وasset states.
- [ ] P00D-T05: تصميم editor shell: preview، timeline، transcript، tracks، inspector، revision/save status.
- [ ] P00D-T06: تصميم export/job status، cancel/retry/failure، settings، وresponsive layouts.
- [ ] P00D-T07: بناء prototype import → editor → save → export مع حالات conflict وunsaved.
- [ ] P00D-T08: إجراء accessibility/content review للعربية المختلطة بالإنجليزية وتسجيل الملاحظات.
- [ ] P00D-T09: تسليم handoff: screen map، token list، component inventory، annotations، وopen questions إلى Phase 01.

## Definition of done

كل سيناريوهات القبول مثبتة داخل Figma prototype وhandoff؛ لا توجد شاشة أساسية بلا loading/empty/error state، ولا state تحرير دائم بلا مرجع ProjectDocument أو command/query.
