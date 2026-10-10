# المصدر والترخيص

- وحدات `packages/domain/src/time/micros*` و`interval/*` و`editing/time-mapping*` من TextCut، للمستخدم Abdelrhman-elsaeed، عند commit `ec24c2321f791de800742d1150cc632dda1af16c`، مع بقاء تعليقات المصدر واختبارات السلوك. أضيف تحقق safe integer ورفض الوقت السالب قبل التقريب في V2.
- تحويل الإطارات مستلهم من `packages/motion-renderer/src/compiler/motion-compiler.ts`؛ V2 تستخدم ceiling عند تمثيل بداية إطار بالميكروثانية كي لا يرجع التحويل للإطار السابق عند 29.97fps.
- لم يوجد ملف LICENSE مستقل ضمن نتائج البحث في مصدر TextCut. النقل محلي بتفويض مالك المشروع؛ لا ننسب ترخيصًا مفتوحًا غير موجود ولا نعيد نشر المصدر الآن.
- الفيديو الحقيقي: [MDN flower.mp4](https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4)، [ترخيص MDN CC0](https://github.com/mdn/interactive-examples/blob/main/LICENSE). النسخة المستخدمة وتجزئتها مسجلتان في manifest. الصوت وعلامات المزامنة إضافات اصطناعية صريحة، وليست صوت الفيديو الأصلي أو عينة شرح عربي.
- خط Noto Sans Arabic من [Google Fonts](https://github.com/google/fonts/tree/main/ofl/notosansarabic)، SIL OFL 1.1. نسخة الترخيص في `licenses/font-license.txt`، والخط يثبت بالـSHA-256 في snapshot.
- الصورة SVG والعينات الاصطناعية مولدة بكود التجربة؛ لا تعتمد على خدمة صور.
- Remotion 4.0.518 يخضع لـ[Remotion License](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md). تقييم الملاءمة مشمول بشروط التقييم؛ لا تفترض الوثيقة مجانية أي حجم شركة أو نشر عام. يعاد التحقق عند Phase 09. React وVite وأدوات الاختبار تحت تراخيصها المرفقة في الحزم.
