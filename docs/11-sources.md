# المصادر والأدلة

آخر تحقق: 2026-10-10. الروابط المحلية تخص جهاز المستخدم. النصوص والصور مصادر مشاهدة/قراءة؛ لا نملك source code لـReelify.

## ملفات المستخدم

- [المحادثة والطلب الأصلي](<C:/Users/abdelrhman/.codex/attachments/de086183-a7ac-47ad-88c8-32ac2fae7877/Pasted text.txt>).
- [اللايف الجديد: Shipping Reelify](<C:/Users/abdelrhman/Downloads/Building an AI Startup 03 - Shipping Reelify بالعربي [Arabic (auto-generated)] [DownloadYoutubeSubtitles.com].txt>).
- [تفريغ اللايف الأول](<C:/Users/abdelrhman/Desktop/New folder (2)/Live Coding About the application.txt>).
- [مجلد الصور](<C:/Users/abdelrhman/Desktop/New folder (2)>).
- [Kit: تفاصيل المنتج والحركة](<C:/Users/abdelrhman/Desktop/New folder (2)/(7) بنبني Reel Editor بالـ AI 00-06-48.png>).
- [Inspector وcues](<C:/Users/abdelrhman/Desktop/New folder (2)/بنبني Reel Editor بالـ AI 00-12-27.png>).
- [JSON للمشهد](<C:/Users/abdelrhman/Desktop/New folder (2)/بنبني Reel Editor بالـ AI 00-13-15.png>).

النص الجديد بلا timestamps للفيديو؛ الأسطر/عبارات البحث في research هي محددات داخل الملف، وليست توقيت مشاهدة.

## الكود القديم

- [نطاق المنتج السابق](<D:/Vibe Coding/vibe editor/textcut/transcript-video-editor-speckit/000-product-roadmap/spec.md>).
- [EditState والأنواع](<D:/Vibe Coding/vibe editor/textcut/textcut/packages/domain/src/editing/transcript-types.ts>).
- [أوامر التحرير](<D:/Vibe Coding/vibe editor/textcut/textcut/packages/domain/src/editing/edit-commands.ts>).
- [تحويل الزمن](<D:/Vibe Coding/vibe editor/textcut/textcut/packages/domain/src/editing/time-mapping.ts>).
- [تجميع مدخلات التصدير](<D:/Vibe Coding/vibe editor/textcut/textcut/apps/api/src/modules/exports/export.service.ts>).
- [رندر مجال الموشن](<D:/Vibe Coding/vibe editor/textcut/textcut/apps/worker/src/export/motion/motion-remotion-renderer.ts>).
- [تنسيق job التصدير](<D:/Vibe Coding/vibe editor/textcut/textcut/apps/worker/src/export/export-job-orchestrator.ts>).
- [واجهة المحرر الكبيرة](<D:/Vibe Coding/vibe editor/textcut/textcut/apps/web/src/features/editor/transcript-editor.tsx>).

## التوثيق الرسمي المستخدم

| المرجع | الحقيقة التي يدعمها |
|---|---|
| [Remotion Player](https://www.remotion.dev/docs/player) | تضمين composition داخل React وتعديل المعلمات |
| [Remotion Renderer](https://www.remotion.dev/docs/renderer) | وظائف تصدير server-side؛ توحيد إصدارات حزم Remotion |
| [FFmpeg filters](https://www.ffmpeg.org/ffmpeg-filters.html) | وجود trim/atrim/overlay/concat؛ اختيارنا لمعمارية التركيب استنتاج هندسي |
| [Deepgram prerecorded](https://developers.deepgram.com/docs/pre-recorded-audio) | words مع start/end/confidence؛ لا يثبت جودة العربية في عيناتنا |
| [Cloudflare Containers](https://developers.cloudflare.com/containers/) | تشغيل runtimes/برامج تحتاج filesystem وموارد؛ لا دليل أنه الاختيار الأرخص لنا |
| [Spec Kit](https://github.github.com/spec-kit/) | workflow قائم على Markdown من specification إلى planning/tasks والتنفيذ والتحقق |

لا تتضمن الخطة مقارنة أسعار حديثة أو حكمًا نهائيًا على تراخيص تجارية. نراجع المتطلبات المناسبة للمكتبات والمزود المختار عند gate الاعتماد، ولا ننقل تقديرات اللايف إلى ميزانية المشروع.
