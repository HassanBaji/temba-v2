import { isolate } from "../../bidi";
import type { consoleHours as source } from "../en/console-hours";
import { plural } from "../../plural";

export const consoleHours = {
  pageTitle: "ساعات العمل والإغلاقات",
  pageDescription:
    "تحدد ساعات العمل ما يمكن للاعبين حجزه. الإغلاقات توقف الملاعب دون المساس بساعات العمل.",
  weekly: {
    title: "ساعات العمل الأسبوعية",
    closed: "مغلق",
    addWindow: "إضافة فترة",
    none: "—",
    opens: (day: string, n: number) => `${day}، الفترة ${n}، الفتح`,
    closes: (day: string, n: number) => `${day}، الفترة ${n}، الإغلاق`,
    remove: (day: string, n: number, range: string) =>
      `إزالة فترة ${day} رقم ${n} (${range})`,
    copyLabel: (day: string) => `نسخ ${day} إلى كل الأيام`,
    copy: "نسخ إلى كل الأيام",
    footer: "تُطبّق التغييرات على الحجوزات الجديدة فقط.",
    save: "حفظ ساعات العمل",
    savedToast: "تم حفظ ساعات العمل",
    openHours: (hours: string) => `${hours} س`,
    closeAfterOpen: "يجب أن يكون وقت الإغلاق بعد وقت الفتح",
    offGrid: (n: number) => `يجب أن تقع الأوقات على فواصل ${n} دقيقة`,
    overlap: "يجب ألا تتداخل فترات العمل في اليوم نفسه",
  },
  closures: {
    title: "الإغلاقات",
    add: "إضافة إغلاق",
    adding: "جارٍ الإضافة…",
    addedToast: "تمت إضافة الإغلاق",
    removedToast: "تمت إزالة الإغلاق",
    chooseTimes: "اختر موعد بدء الإغلاق وانتهائه",
    none: "لا إغلاقات في الأيام الـ90 القادمة.",
    active: "نشط",
    scheduled: "مجدول",
    actions: (closure: string) => `إجراءات ${isolate(closure)}`,
    remove: "إزالة الإغلاق",
    conflicts: (count: number) =>
      plural("ar", count, {
        one: "يقع حجز واحد ضمن هذا الإغلاق",
        two: "يقع حجزان ضمن هذا الإغلاق",
        few: "تقع {n} حجوزات ضمن هذا الإغلاق",
        many: "يقع {n} حجزًا ضمن هذا الإغلاق",
        other: "يقع {n} حجز ضمن هذا الإغلاق",
      }),
    conflictsHelp: "تبقى مؤكدة حتى تلغيها من صفحة الحجوزات.",
    bookingRef: (ref: string) => `الحجز ${isolate(ref)}`,
    dismiss: "إخفاء",
    newClosure: "إغلاق جديد",
    appliesTo: "ينطبق الإغلاق على",
    reason: "السبب",
    from: "من",
    to: "إلى",
    timezoneNote:
      "الأوقات بتوقيت البحرين. تُعرض الحجوزات الحالية ضمن الفترة بعد إضافة الإغلاق؛ وتبقى مؤكدة حتى تلغيها من صفحة الحجوزات.",
    removeTitle: "إزالة هذا الإغلاق؟",
    removeDescription: (closure: string, when: string) =>
      `${closure}، ${when}. يصبح هذا الوقت متاحًا للحجز مجددًا.`,
    withReason: (scope: string, reason: string) =>
      `${isolate(scope)}، ${reason}`,
    today: "اليوم",
    tomorrow: "غدًا",
    allDay: "طوال اليوم",
    dayAndDate: (weekday: string, day: number) => `${weekday} ${day}`,
    window: (days: string, times: string) => `${days}، ${times}`,
    dayRange: (from: string, to: string) => `من ${from} إلى ${to}`,
  },
} satisfies typeof source;
