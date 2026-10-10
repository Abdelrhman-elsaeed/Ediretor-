# Phase 09 — الاستضافة والإصدار العام

الحالة: مخطط، لم ينفذ.

## النتيجة

نفس المحرر يعمل لمستخدمين متعددين بعزل وتكاليف وحدود تشغيل موثقة، بعد تحقق staging.

## التبعيات والمتطلبات

Phase 08، وحسم O08 وشكل النشر والميزانية؛ تعاد صياغة هذه المرحلة إذا اختير توزيع desktop فقط.

التغطية: FR-14، D04 للمنتج العام.

## داخل النطاق

- هوية حقيقية وownership enforcement لكل asset/revision/job/proposal/export، وحماية download URLs.
- resumable uploads وتخزين خاص وretention/delete/export data وسياسة quotas.
- workers معزولون وqueue fairness وbackpressure وspend limits.
- observability للـlatency/cost/failure، backups وrestore وdeploy rollback.
- تقييم استضافة container/VM وstorage وتجربة مستخدمين محدودة؛ billing مرحلة مشروطة بالنموذج التجاري.

## خارج النطاق

لا تعاون لحظي أو نشر اجتماعي أو enterprise administration ضمن هذا الإصدار. اكتمال الكود لا يساوي إذن نشر live أو شراء خدمات.

## سيناريوهات القبول

- **P09-A1**: Q12 تفشل كل محاولات الوصول العابر للمستخدمين بما فيها job events والـthumbnails وexport URLs؛ لا dev identity في hosted build.
- **P09-A2**: رفع طويل يُستأنف بعد انقطاع، وchecksum يتحقق؛ مستخدم واحد لا يجوع بقية queue.
- **P09-A3**: تحميل متزامن بملفات تمثل limits المنتج يسجل capacity وqueue delay وcost؛ تجاوز quota يرفض قبل عمل مكلف.
- **P09-A4**: restore على staging يعيد مشاريع وأصولًا وروابط منطقية، وحذف مشروع يراعي active jobs وretention دون حذف مشترك غير مقصود.
- **P09-A5**: فشل worker/release rollback لا يفقد تعديلات معترفًا بحفظها، والـalerts/runbooks قابلة للتنفيذ.
- **P09-A6**: تقرير release يحدد حدود الدعم والمزود والميزانية والتراخيص المعنية وسياسة البيانات وknown issues؛ سيناريوهات المنتج الكاملة تمر على staging.

## بوابة الخروج

staging تتحقق منها معايير الإصدار العام، وتُحدد حدود وتكلفة ومسؤولية تشغيل واضحة قبل إطلاق live.

انظر [خطة التنفيذ](plan.md) و[المهام](tasks.md) و[معايير الجودة](../../docs/06-quality.md).
