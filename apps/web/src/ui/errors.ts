import {AppError} from '../../../../packages/contracts/src/project';
const messages: Record<string,string> = {
  CONNECTION_LOST:'تعذر الاتصال بالخدمة المحلية. تحقق من تشغيل التطبيق ثم أعد المحاولة.',
  PREVIEW_UNAVAILABLE:'تعذر تشغيل المعاينة. أعد تحميلها وتحقق من ملف المصدر.',
  REVISION_CONFLICT:'حُفظ إصدار أحدث في نافذة أخرى. احتفظ بنسخة الاسترداد ثم افتح الإصدار المحفوظ.',
  RECOVERY_STORAGE_ERROR:'تعذر قراءة أو كتابة نسخة الاسترداد في المتصفح. احتفظ بنسخة احتياطية قبل إغلاق الصفحة.',
  STORAGE_ERROR:'تعذر الحفظ على القرص. تحقق من المساحة المتاحة وصلاحية مجلد البيانات ثم أعد المحاولة.',
  SAVE_FAILED:'لم تُحفظ التغييرات. أعد المحاولة قبل إغلاق المشروع.',
  MISSING_MEDIA:'ملف المصدر مفقود. أعد الملف إلى مجلد البيانات المحلي ثم أعد المحاولة.',
  ASSET_HASH_MISMATCH:'تغير ملف المصدر بعد استيراده. استعد النسخة الأصلية قبل التصدير.',
  UNSUPPORTED_MEDIA:'تعذر قراءة الفيديو. اختر ملف فيديو صالحًا يمكن لـ FFmpeg قراءته.',
  MEDIA_PROCESSING_FAILED:'فشلت معالجة الفيديو. تحقق من المصدر ومساحة القرص ثم أعد المحاولة.',
  SOURCE_RESOLUTION_LIMIT:'دقة المصدر أعلى من الحد المتاح حاليًا (3840 × 2160).',
  UNSUPPORTED_FRAME_RATE:'معدل الإطارات غير متاح. الحد الحالي للمصدر 120 إطارًا/ثانية.',
  IMPORT_SIZE_LIMIT:'حجم الملف يتجاوز الحد الحالي: 2 GB.',
  MEDIA_TOOLS_UNAVAILABLE:'أدوات FFmpeg وffprobe غير متاحة. ثبّتها في PATH ثم أعد تشغيل الخدمة.',
  EXPORT_LIMIT:'التصدير الحالي يدعم حتى 10 دقائق و200 مقطع بدقة 1080p و30 إطارًا/ثانية. الفيديو الطويل و4K قيد التقييم.',
  EXPORT_VALIDATION_FAILED:'لم يجتز الملف فحص التصدير. لم يُنشر ملف جزئي؛ أعد المحاولة.',
  PROXY_VALIDATION_FAILED:'لم تجتز نسخة المعاينة فحص المدة. أعد المحاولة أو اختر مصدرًا آخر.',
  EMPTY_SEQUENCE:'أضف فيديو إلى الخط الزمني قبل التصدير.',
  CANCELLED:'أُلغيت العملية. يمكنك المحاولة مجددًا.',
  INVALID_RANGE:'حدد نطاقًا داخل مدة المشروع، بنهاية أكبر من البداية.',
  INVALID_SPLIT:'ضع مؤشر التشغيل داخل المقطع بعيدًا عن بدايته ونهايته.',
  INVALID_TIMING:'يجب أن يبقى نطاق القص داخل مدة المصدر.',
  CLIP_NOT_FOUND:'حدد مقطعًا من الخط الزمني أولًا.',
  CLIP_TOO_SHORT:'يوجد مقطع أقصر من إطار. عدّل نطاق القص قبل التصدير.',
  PROJECT_NOT_FOUND:'المشروع غير موجود. ارجع إلى المكتبة وافتح مشروعًا آخر.',
  RETRY_LIMIT:'توقفت المهمة بعد ثلاث محاولات استرداد. أعد المحاولة بعد فحص الخدمة.',
  INTERRUPTED:'انقطعت المعالجة أو تجاوزت مهلة 30 دقيقة. أعد المحاولة.',
};
export function errorText(error: unknown): string {
  const code = error instanceof AppError ? error.code : typeof error === 'string' ? error : 'REQUEST_FAILED';
  return messages[code] ?? 'تعذر إكمال العملية. أعد المحاولة أو احتفظ بنسخة الاسترداد.';
}
export const stages: Record<string,string> = {queued:'في انتظار المعالجة',starting:'بدء المعالجة',probing:'قراءة معلومات الفيديو',hashing:'التحقق من المصدر',proxy:'تجهيز نسخة المعاينة',validating:'فحص الملف',completed:'اكتملت العملية',cancelled:'أُلغيت العملية',failed:'فشلت العملية','verifying-assets':'التحقق من ملفات المصدر',encoding:'ترميز الفيديو',muxing:'تجميع الملف'};
