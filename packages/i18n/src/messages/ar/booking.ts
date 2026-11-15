import { isolate } from "../../bidi";
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
    `لم يعد بالإمكان إلغاء هذا الحجز في التطبيق. اتصل بالنادي على ${isolate(venuePhone)}`,
  cancelWindowClosedContact:
    "لم يعد بالإمكان إلغاء هذا الحجز في التطبيق. تواصل مع النادي",
  customerLimit: {
    liveHolds: (count: number) =>
      plural("ar", count, {
        one: "لديك حجز بانتظار الدفع في هذا النادي. أكمل الدفع أو انتظر انتهاء مهلته",
        two: "لديك حجزان بانتظار الدفع في هذا النادي. أكمل الدفع أو انتظر انتهاء مهلة أحدهما",
        few: "لديك {n} حجوزات بانتظار الدفع في هذا النادي. أكمل الدفع أو انتظر انتهاء مهلة أحدها",
        many: "لديك {n} حجزًا بانتظار الدفع في هذا النادي. أكمل الدفع أو انتظر انتهاء مهلة أحدها",
        other:
          "لديك {n} حجز بانتظار الدفع في هذا النادي. أكمل الدفع أو انتظر انتهاء مهلة أحدها",
      }),
    unpaidAtVenue: (count: number) =>
      plural("ar", count, {
        one: "لديك حجز قادم لم يُدفع بعد في هذا النادي. ألغِه لتحجز غيره",
        two: "لديك حجزان قادمان لم يُدفعا بعد في هذا النادي. ألغِ أحدهما لتحجز غيره",
        few: "لديك {n} حجوزات قادمة لم تُدفع بعد في هذا النادي. ألغِ أحدها لتحجز غيره",
        many: "لديك {n} حجزًا قادمًا لم يُدفع بعد في هذا النادي. ألغِ أحدها لتحجز غيره",
        other:
          "لديك {n} حجز قادم لم يُدفع بعد في هذا النادي. ألغِ أحدها لتحجز غيره",
      }),
  },
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
  errors: {
    notFound: "الحجز غير موجود",
    venueArchived: "هذا النادي مؤرشف",
    notAccepting: "لا يقبل هذا النادي حجوزات",
    noCourts: "لا ملاعب للحجز في هذا النادي",
    alreadyChanged: "تغيّر هذا الحجز بالفعل",
    choosePaymentMethod: "اختر طريقة الدفع",
    paymentNotFound: "الدفعة غير موجودة",
    refundPaidOnly: "لا تُسترد إلا دفعة مدفوعة",
    refundTooMuch: "هذا أكثر مما يمكن استرداده",
    onlineNotSettled: "لا تُسدَّد يدويًا دفعة تمت عبر الإنترنت",
    noPendingPayment: "لا توجد دفعة معلّقة لتسديدها",
    viewForbidden: "لا يمكنك عرض هذا الحجز",
    holderCancels: "صاحب الحجز وحده يستطيع إلغاءه",
    cannotCancel: "لم يعد بالإمكان إلغاء هذا الحجز",
    endedMarkNoShow: "انتهى هذا الحجز. سجّل عدم الحضور بدلًا من ذلك",
    paidAtVenue: "يُدفع هذا الحجز في النادي",
    holderConfirms: "صاحب الحجز وحده يستطيع تأكيد هذه الدفعة",
    noPaymentToConfirm: "لا توجد دفعة لتأكيدها في هذا الحجز",
    courtNotAtVenue: "هذا الملعب لا يتبع هذا النادي",
    onlineOnly: "يقبل هذا النادي الدفع عبر الإنترنت فقط",
    payMethodUnavailable: "طريقة الدفع هذه غير متاحة",
    noPricingRule: "لا توجد قاعدة تسعير لهذا الوقت. اكتب سعرًا",
    holderCreatesGame: "صاحب الحجز وحده يستطيع إنشاء مباراة لهذا الحجز",
    confirmedHasGame: "لا تُنشأ مباراة إلا لحجز مؤكد",
    ended: "انتهى هذا الحجز بالفعل",
    hasGame: "لهذا الحجز مباراة بالفعل",
    footballGroup: "اختر مجموعة كرة قدم لهذا الملعب",
    padelGroup: "اختر مجموعة بادل لهذا الملعب",
    invalidDay: "يوم غير صالح",
    endBeforeStart: "يوم الانتهاء قبل يوم البدء",
    rangeTooLong: (max: number) =>
      plural("ar", max, {
        zero: "اختر {n} يوم كحد أقصى",
        one: "اختر يومًا واحدًا كحد أقصى",
        two: "اختر يومين كحد أقصى",
        few: "اختر {n} أيام كحد أقصى",
        many: "اختر {n} يومًا كحد أقصى",
        other: "اختر {n} يوم كحد أقصى",
      }),
    holderSeesPayment: "صاحب الحجز وحده يستطيع رؤية دفعته",
    nothingPaid: "لم يُدفع شيء في هذا الحجز",
    refundAtMost: (fils: number) =>
      plural("ar", fils, {
        zero: "لم يبقَ ما يمكن استرداده",
        one: "يمكن استرداد فلس واحد كحد أقصى",
        two: "يمكن استرداد فلسين كحد أقصى",
        few: "يمكن استرداد {n} فلوس كحد أقصى",
        many: "يمكن استرداد {n} فلسًا كحد أقصى",
        other: "يمكن استرداد {n} فلس كحد أقصى",
      }),
    holderRetries: "صاحب الحجز وحده يستطيع إعادة محاولة الدفع",
    notAwaitingPayment: "لم يعد هذا الحجز بانتظار الدفع",
    lastPaymentNotFailed: "لم تفشل آخر دفعة",
    notAwaitingSettlement: "لا ينتظر هذا الحجز التسديد",
    noShowAfterStart: "يُسجَّل عدم الحضور بعد بدء الحجز",
    noShowConfirmedOnly: "لا يُسجَّل عدم الحضور إلا لحجز مؤكد",
    editConfirmedOnly: "لا يُعدَّل إلا حجز مؤكد لم ينتهِ",
    gamePlanned: "على هذا الحجز مباراة مخطط لها. ألغِ المباراة أولًا",
    priceSettled: (price: string) =>
      `سُدّدت الدفعة، لذا يبقى السعر ${price}. اكتبه سعرًا لنقل هذا الحجز`,
    priceLocked: "سُدّدت الدفعة، لذا لا يمكن تغيير السعر",
    outsideWindow: "هذا اليوم خارج فترة الحجز",
  },
} satisfies typeof source;
