import { plural } from "../../plural";
import type { venue as source } from "../en/venue";

export const venue = {
  errors: {
    notFound: "النادي غير موجود",
    courtNotFound: "الملعب غير موجود",
    photoNotFound: "الصورة غير موجودة",
    managerOnly: "لا يدير هذا النادي إلا مديروه",
    alreadyManager: "هذا المستخدم يدير هذا النادي بالفعل",
    closureEndAfterStart: "يجب أن ينتهي الإغلاق بعد بدايته",
    cancelBookingsFirst: "ألغِ حجوزاته أولًا",
    courtHasHistory: "لهذا الملعب سجل حجوزات ولا يمكن حذفه",
    duplicateCourt: "يوجد ملعب بهذا الاسم في هذا النادي بالفعل",
    duplicateVenue: "يوجد نادٍ بهذا الاسم والمدينة والدولة بالفعل",
    photoLimit: (max: number) =>
      plural("ar", max, {
        zero: "لا يمكن إضافة صور للنادي",
        one: "للنادي صورة واحدة كحد أقصى",
        two: "للنادي صورتان كحد أقصى",
        few: "للنادي {n} صور كحد أقصى",
        many: "للنادي {n} صورة كحد أقصى",
        other: "للنادي {n} صورة كحد أقصى",
      }),
    alreadyArchived: "النادي مؤرشف بالفعل",
    notArchived: "النادي غير مؤرشف",
    logoEmpty: "ملف الشعار فارغ",
    photoEmpty: "ملف الصورة فارغ",
    photoTooLarge: "يجب ألا يتجاوز حجم الصورة 2 ميغابايت",
    hoursWholeMinutes: "يجب أن تكون ساعات العمل بدقائق كاملة من منتصف الليل",
    hoursLatestClose: "لا يمكن أن يتجاوز وقت الإغلاق 06:00 من اليوم التالي",
    onGrid: (slotMinutes: number) =>
      `يجب أن تقع الأوقات على فواصل ${slotMinutes} دقيقة`,
    weekdayRange: "يجب أن يكون اليوم بين 0 (الأحد) و6 (السبت)",
    pricingWeekday: "اختر يومًا واحدًا على الأقل، بين 0 (الأحد) و6",
    pricingWholeMinutes:
      "يجب أن تكون أوقات التسعير بدقائق كاملة من منتصف الليل",
    pricingEndAfterStart: "يجب أن تنتهي قاعدة التسعير بعد بدايتها",
    pricingLatestEnd: "لا يمكن أن تمتد قاعدة التسعير بعد 06:00 من اليوم التالي",
    rateNegative: "لا يمكن أن يكون سعر الساعة سالبًا",
    rateTooLarge: "سعر الساعة كبير جدًا",
    pricingOverlap: "يجب ألا تتداخل قواعد تسعير الملاعب نفسها في اليوم والوقت",
    pricingRuleLimit: (max: number) =>
      plural("ar", max, {
        zero: "لا يمكن إضافة قواعد تسعير للنادي",
        one: "للنادي قاعدة تسعير واحدة كحد أقصى",
        two: "للنادي قاعدتا تسعير كحد أقصى",
        few: "للنادي {n} قواعد تسعير كحد أقصى",
        many: "للنادي {n} قاعدة تسعير كحد أقصى",
        other: "للنادي {n} قاعدة تسعير كحد أقصى",
      }),
    labelTooLong: (max: number) =>
      plural("ar", max, {
        zero: "لا يمكن كتابة تسمية",
        one: "التسمية حرف واحد كحد أقصى",
        two: "التسمية حرفان كحد أقصى",
        few: "التسمية {n} أحرف كحد أقصى",
        many: "التسمية {n} حرفًا كحد أقصى",
        other: "التسمية {n} حرف كحد أقصى",
      }),
    pricingCourtNotAtVenue: "تذكر قاعدة تسعير ملعبًا ليس في هذا النادي",
    slotLength: "يجب أن تكون مدة الفترة 30 أو 60 دقيقة",
    horizonRange: "يجب أن تكون فترة الحجز المسبق بين 1 و90 يومًا",
    leadTimeRange: "يجب أن تكون أقل مهلة للحجز بين 0 و1440 دقيقة",
    durationRequired: "قدّم مدة واحدة على الأقل",
    durationRange: (min: number, max: number) =>
      `يجب أن تكون المدد بين ${min} و${max} دقيقة`,
    durationMultiple: (slotMinutes: number) =>
      `يجب أن تكون المدد من مضاعفات ${slotMinutes} دقيقة`,
    hoursOffGrid: (slotMinutes: number) =>
      `ساعات العمل ليست على فواصل ${slotMinutes} دقيقة. عدّلها أولًا.`,
    pricingOffGrid: (slotMinutes: number) =>
      `قواعد التسعير ليست على فواصل ${slotMinutes} دقيقة. عدّلها أولًا.`,
    archivedNoBookings: "لا يقبل النادي المؤرشف حجوزات",
    archivedNoPartner: "لا يمكن أن يكون النادي المؤرشف ناديًا شريكًا",
    addCourtFirst: "أضف ملعبًا قبل قبول الحجوزات",
    invalidCancellationPolicy: "سياسة الإلغاء غير صالحة",
  },
} satisfies typeof source;
