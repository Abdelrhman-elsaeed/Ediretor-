# Vibe Editing V2 — خطة البناء

تاريخ المراجعة: 2026-10-11. الحالة: تطبيق Phase 01 المحلي منفذ في React/TypeScript مع الحفظ على القرص وworker مستقل للميديا. أوقف المستخدم جولة Phase 00 benchmarking وأجّل renderer qualification وألغى Figma؛ أدلة الجودة السابقة محفوظة وغير مكتملة، ولا تمنع تنفيذ الواجهة. لا تُعد هذه النسخة إصدارًا مؤهلًا للإنتاج العام أو دعمًا مثبتًا للفيديو الطويل و4K.

## Run the actual application

Requires Node 24+, npm, and native `ffmpeg` / `ffprobe` in PATH. From this workspace in PowerShell:

```powershell
npm.cmd ci
npm.cmd run dev
# Open http://127.0.0.1:4317
```

`dev` starts the React app, loopback API and separate media worker. Projects, immutable revisions, jobs, original media, and proxies live in `.local/ediretor`; keep that folder to preserve your projects. Browser pending edits survive reload when browser storage is available. The library starts empty and only shows projects you create.

For the built frontend, run the API and worker in two terminals:

```powershell
npm.cmd run build
npm.cmd start
# Open http://127.0.0.1:4318
```

```powershell
npm.cmd run worker
```

Verification:

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e
```

The browser workflow uses the existing short `real.mp4` fixture, starts isolated API/worker processes on port 4320, and saves screenshots/media/reports under `artifacts/phase-01-*`. If fixtures or Playwright Chromium are missing, run `npm.cmd run fixtures` and `npx.cmd playwright install chromium` first. This does not restart the deferred long-video benchmark matrix.

Supported: Arabic RTL project library, create/video import, real processing status/cancellation/retry, preview, sequential cuts, trim/ripple delete, persisted undo/redo, save/reopen, conflict recovery backup, both themes, keyboard controls and narrower layouts. Export is currently bounded to 10 minutes / 200 clips / 1080p30 H.264/AAC; no 4K export, graphics, transcript, templates, simultaneous source sync or AI in this slice. Details and evidence: [runtime contract](specs/001-project-core/runtime-contract.md), [Phase 01 evidence](docs/evidence/phase-01.md).

محرر للفيديوهات الطويلة الخاصة بالشرح بالكاميرا وتسجيل الشاشة. يدعم العمل اليدوي، والمسودة التلقائية، والتعديل بالمحادثة داخل المشروع نفسه. يبدأ على جهاز المستخدم ويصل إلى إصدار عام عبر مرحلة تجهيز ونشر مستقلة.

## ابدأ من هنا

1. [المفيد من اللايفين ومراجعة المشروع القديم](docs/01-research.md).
2. [المنتج ورحلة الاستخدام](docs/02-product-spec.md).
3. [خريطة المراحل](docs/09-roadmap.md).
4. [القرارات والافتراضات المفتوحة](docs/07-decisions.md).
5. [طريقة تنفيذ مرحلة واحدة](docs/10-execution.md).
6. [قواعد الهندسة المكيّفة من مهارة .NET](docs/12-engineering-rules.md)، مع [خريطة ما تغير ولماذا](docs/13-dotnet-rule-mapping.md).

## ما اتأكد من المستخدم

- المحتوى: شرح بالكاميرا وتسجيل شاشة؛ فيديو واحد، أو مصادر منفصلة، أو ملف مدمج مسبقًا.
- مسودة تلقائية واستخدام يدوي مع AI؛ الطريقتان متاحتان.
- جرافيك: قوالب قابلة للتعديل + مشاهد مخصصة بالـAI بضوابط.
- استخدام محلي أولًا، مع أساس قابل للتشغيل العام؛ لا نعامل النسخة المحلية كعرض مؤقت.
- خطة كاملة مقسمة مراحل، مع الاستفادة من الكود القديم والصور واللايف الجديد.

المدة والجودة ومواصفات الجهاز وميزانية الخدمات لم تُحسم. الأرقام في خطة الجودة أهداف اختبار مقترحة، وليست وعود أداء أو إجابات من المستخدم.

## الاتجاه المقترح

Timeline متعدد المسارات داخل ProjectDocument واحد بإصدارات محفوظة. تعديل الواجهة وأمر الـAI يمران من Editing Kernel واحد. المعاينة والتصدير يستهلكان نسخة محددة من المشروع والميديا والقوالب.

نبدأ V2 في هذا المجلد مع نقل انتقائي للأجزاء المفيدة. الترشيح التقني: React + TypeScript، وbackend بـNode.js/TypeScript، وworker مستقل للمعالجة. نختبر Remotion وFFmpeg مبكرًا قبل تثبيت مسار الإخراج. .NET بديل صالح للـbackend إذا رجّحت متطلبات الفريق استخدامه.

## محتويات الحزمة

| الملف | دوره |
|---|---|
| [Constitution](.specify/memory/constitution.md) | مبادئ تمنع تكرار مشاكل النسخة القديمة |
| [Architecture](docs/03-architecture.md) | توزيع المسؤوليات والتشغيل المحلي والعام |
| [Data model](docs/04-data-model.md) | الوقت، المسارات، الربط، الحفظ والأوامر |
| [AI and kits](docs/05-ai-and-kits.md) | حرية الـAI، قوالب السياق والهوية والمشاهد |
| [Quality](docs/06-quality.md) | الاختبارات وأهداف القياس وبوابات الإصدار |
| [Migration](docs/08-migration.md) | ما يُنقل وما يُعاد تصميمه |
| [Phases](docs/09-roadmap.md) | المراحل 00–09 ومسار التصميم 00D، لكل منها spec وplan وtasks |
| [Phase 00 harness](experiments/render-feasibility/README.md) | تشغيل تجربة المعاينة والرندر والتحقق |
| [Phase 00 evidence](docs/evidence/phase-00.md) | القياسات الفعلية وحدودها وقرار البوابة |
| [Design handoff reference](docs/design/phase-00d-handoff.md) | خريطة الشاشات والعقود والـbrief؛ Figma أُلغي لصالح التنفيذ الفعلي |
| [Sources](docs/11-sources.md) | الأدلة المحلية والتوثيق الرسمي |
| [Project instructions](AGENTS.md) | تعليمات العمل داخل الريبو |
| [Architecture skill](.agents/skills/ediretor-typescript-architect/SKILL.md) | مهارة TypeScript خاصة بالمشروع، ونسختها هنا هي المرجع المحفوظ مع الكود |

الترتيب مستلهم من Spec Kit: وصف السلوك، ثم خطة التنفيذ، ثم المهام، ثم التنفيذ والتحقق. لم تُثبت أدوات Spec Kit أو تُنشأ slash commands. الملفات قابلة للاستخدام مباشرةً، ويمكن دمجها في الأداة لاحقًا.

تابع حالة المهام والأدلة في ملفات المرحلة؛ وجود harness لا يعني اجتياز بوابة Phase 00. قرار المستخدم الحالي أوقف benchmarking وألغى Figma وسمح بتنفيذ الواجهة مباشرة من brief التصميم؛ لا تُنسخ واجهة TextCut القديمة. حدود الجودة غير المثبتة تبقى مؤجلة ومعلنة.
