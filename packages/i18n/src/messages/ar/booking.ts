import type { booking as source } from "../en/booking";
import { plural } from "../../plural";

export const booking = {
  status: {
    pendingPayment: "بانتظار الدفع",
    confirmed: "مؤكَّد",
    cancelled: "ملغى",
    noShow: "لم يحضر",
    expired: "انتهت صلاحيته",
  },
  paymentStatus: {
    pending: "قيد الانتظار",
    paid: "مدفوع",
    failed: "فشل",
    refunded: "مستردّ",
    partiallyRefunded: "مستردّ جزئيًا",
    waived: "معفى",
  },
  slotRefusal: {
    badDuration: "هذه المدة غير متاحة في هذا النادي",
    offGrid: "وقت البدء هذا ليس ضمن شبكة الحجز في هذا النادي",
    tooSoon: "هذا الوقت قريب جدًا للحجز",
    tooFar: "هذا اليوم بعيد جدًا للحجز",
    ended: "هذا الوقت قد مضى",
    outsideHours: "النادي غير مفتوح في هذا الوقت",
    closure: "هذا الوقت غير متاح",
    noPrice: "لا يمكن حجز هذا الوقت",
    taken: "تم حجز هذه الفترة للتو",
  },
  cancelWindowClosedCall: (venuePhone: string) =>
    `لم يعد بالإمكان إلغاء هذا الحجز في التطبيق. اتصل بالنادي على ${venuePhone}`,
  cancelWindowClosedContact:
    "لم يعد بالإمكان إلغاء هذا الحجز في التطبيق. تواصل مع النادي",
  refund: {
    full: "استرداد كامل",
    none: "لا استرداد",
    percent: (percent: number) => `استرداد ${percent}%`,
  },
  nextRefundStep: (current: string, when: string, next: string) =>
    `${current} حتى ${when}، ثم ${next}`,
  bookedCourtLine: (court: string, start: string, end: string) =>
    `${court}، من ${start} إلى ${end}`,
  policy: {
    freeAnyTime: "إلغاء مجاني في أي وقت",
    refundOnCancellation: (refund: string) => `${refund} عند الإلغاء`,
    refundUntilHoursBefore: (refund: string, hours: number) =>
      plural("ar", hours, {
        one: `${refund} حتى ساعة واحدة قبل الموعد`,
        two: `${refund} حتى ساعتين قبل الموعد`,
        few: `${refund} حتى {n} ساعات قبل الموعد`,
        many: `${refund} حتى {n} ساعة قبل الموعد`,
        other: `${refund} حتى {n} ساعة قبل الموعد`,
      }),
    refundAfterThat: (refund: string) => `${refund} بعد ذلك`,
    cancelInAppUntil: (duration: string) =>
      `يمكنك الإلغاء في التطبيق حتى ${duration} قبل البداية`,
    hours: (n: number) =>
      plural("ar", n, {
        one: "ساعة واحدة",
        two: "ساعتين",
        few: "{n} ساعات",
        many: "{n} ساعة",
        other: "{n} ساعة",
      }),
    minutes: (n: number) =>
      plural("ar", n, {
        one: "دقيقة واحدة",
        two: "دقيقتين",
        few: "{n} دقائق",
        many: "{n} دقيقة",
        other: "{n} دقيقة",
      }),
  },
} satisfies typeof source;
