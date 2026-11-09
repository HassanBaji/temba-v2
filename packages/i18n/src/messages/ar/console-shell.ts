import type { consoleShell as source } from "../en/console-shell";
import { plural } from "../../plural";

export const consoleShell = {
  metaTitle: "لوحة النادي · Temba",
  metaTitleTemplate: (page: string) => `${page} · لوحة النادي · Temba`,
  metaDescription: "أدِر ناديك على Temba: الجدول والحجوزات والملاعب والأسعار.",
  login: {
    intro: "لوحة النادي. سجّل الدخول بحساب Temba الذي تلعب به.",
  },
  nav: {
    label: "أقسام النادي",
    schedule: "الجدول",
    bookings: "الحجوزات",
    courts: "الملاعب والأسعار",
    hours: "ساعات العمل والإغلاقات",
    customers: "العملاء",
    staff: "الطاقم والأدوار",
    reports: "التقارير",
    payouts: "المدفوعات المستحقة",
    photos: "الصور",
    groups: "المجموعات",
    details: "تفاصيل النادي",
  },
  venueSwitcher: {
    label: "تبديل النادي",
    yourVenues: "نواديك",
    courtCount: (count: number) =>
      plural("ar", count, {
        zero: "لا ملاعب",
        one: "ملعب واحد",
        two: "ملعبان",
        few: "{n} ملاعب",
        many: "{n} ملعبًا",
        other: "{n} ملعب",
      }),
    courtsAndCity: (courts: string, city: string) => `${courts}، ${city}`,
  },
  account: {
    label: "الحساب",
    fallbackName: "أنت",
    operator: "مشغّل",
    manager: "مدير",
    backToTemba: "العودة إلى Temba",
    signOut: "تسجيل الخروج",
    language: "اللغة",
  },
  noVenues: {
    title: "لا نوادٍ لتديرها",
    description:
      "يمكن لمشغّل أن يجعلك مدير نادٍ. حتى ذلك الحين لا يوجد ما تديره هنا.",
    backToTemba: "العودة إلى Temba",
  },
  venueLoadError: "تعذّر تحميل النادي",
  venuesLoadError: "تعذّر تحميل النوادي",
  notFound: {
    title: "غير موجود",
    description: "هذا النادي أو هذه الصفحة غير موجودة، أو أنك لا تديرها.",
    yourVenues: "نواديك",
  },
  errors: {
    title: "حدث خطأ ما",
    generic: "حدث خطأ ما. حاول مرة أخرى.",
    tryAgain: "حاول مرة أخرى",
    titleWithStop: (title: string) => `${title}.`,
  },
  confirm: {
    pending: (label: string) => `${label}…`,
  },
  moreActions: "إجراءات أخرى",
  close: "إغلاق",
  payouts: {
    title: "المدفوعات المستحقة",
    description:
      "تُسوّى المدفوعات داخل التطبيق عبر Tap. حجوزات المكتب والهاتف ليست ضمن هذه الأرقام.",
    emptyTitle: "لا مدفوعات مستحقة بعد",
    emptyDescription:
      "تظهر المدفوعات المستحقة بعد ربط تقارير التسوية من مزوّد الدفع؛ وتُسوّى المدفوعات داخل التطبيق عبر Tap.",
  },
  reports: {
    title: "التقارير",
    description:
      "الإشغال والإيرادات، مع أثر Temba منفصلًا: كم ساعة جاءت من المباريات المفتوحة ومباريات المجموعات.",
    emptyTitle: "لا تقارير بعد",
    emptyDescription: "تصل التقارير مع مهمة تقارير النادي (TEM-369).",
  },
  clock: {
    am: "ص",
    pm: "م",
    range: (start: string, end: string) => `من ${start} إلى ${end}`,
    nextDay: (clock: string) => `${clock} (اليوم التالي)`,
  },
  weekdaysShort: [
    "الأحد",
    "الإثنين",
    "الثلاثاء",
    "الأربعاء",
    "الخميس",
    "الجمعة",
    "السبت",
  ],
  weekdaysLong: [
    "الأحد",
    "الإثنين",
    "الثلاثاء",
    "الأربعاء",
    "الخميس",
    "الجمعة",
    "السبت",
  ],
} satisfies typeof source;
