# Phase 01 — المهام

الحالة — 2026-10-11: المسار المحلي المحدد في [runtime-contract.md](runtime-contract.md) منفذ ومتحقق بالأدلة في [phase-01.md](../../docs/evidence/phase-01.md). العلامات أدناه تخص هذا المسار المقيد؛ لا تعني اكتمال renderer qualification أو release hardening. SQLite بديل PostgreSQL المحلي حسب ADR-08، وFigma مُلغى.

- [x] P01-T01: إنشاء runnable skeleton وhealth checks وإعداد local profile والمهاجرات الأولى. القبول: P01-A1. (Vite/Node/worker؛ SQLite migration، restart browser evidence.)
- [x] P01-T02: تنفيذ document schema وasset refs وinteger time وcommand validation. القبول: P01-A1/A2. (schema v1، strict validation، runtime/kernel tests.)
- [x] P01-T03: تنفيذ Editing Kernel وتكييف منطق الفترات القديم واختبارات invariants/Undo. القبول: P01-A2. (reuse cutClip/interval/time؛ atomic batch/branch/Undo/Redo tests.)
- [x] P01-T04: تنفيذ import/probe/proxy وملكية الأصول ومسار إدخال لا يحمل الملف كله في RAM. القبول: P01-A1/A5. (streamed upload؛ real/silent/corrupt inputs؛ owner isolation.)
- [x] P01-T05: تنفيذ Session/autosave/history persistence وoptimistic concurrency والتعافي. القبول: P01-A3. (SQLite + browser pending؛ failed save/reload/retry and two-client 409 evidence.)
- [x] P01-T06: توصيل preview/export للـsnapshot وإضافة durable jobs وcancel/lease fencing. القبول: P01-A4/A5. (native-cuts-v1 limited profile؛ shared compiler؛ actual decoded export/markers، cancellation and fencing tests.)
- [x] P01-T07: تنفيذ رحلة كاملة مع restart وworker kill وتسجيل الأدلة. القبول: P01-A1–A5. (successful workflow-2026-10-11.json؛ worker attempt 2 after kill؛ screenshots and limitations recorded.)

## Explicit follow-up work, not hidden completion

- [ ] Reference-aware crash orphan/upload staging retention and cleanup.
- [ ] Database backup/restore and full-disk fault injection; local packaging remains Phase 08.
- [ ] Recovery JSON import/merge and in-app source relinking.
- [ ] Broad codec/VFR/color/rotation qualification and full accessibility audit.
- [ ] Renderer/long-video/4K qualification remains deferred in Phase 00/07; no failed quality gate passed.

## Definition of done

جميع سيناريوهات [spec](spec.md) مثبتة بأدلة، وعقود البيانات محدثة، والأخطاء المعروفة مسجلة. لا تُعلّم المهمة الأخيرة قبل مراجعة مخرجات التحقق الفعلية.
