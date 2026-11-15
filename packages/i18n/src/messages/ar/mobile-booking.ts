import { plural } from "../../plural";
import type { mobileBooking as source } from "../en/mobile-booking";

export const mobileBooking = {
  title: "الحجوزات",
  myBookings: "حجوزاتي",
  upcoming: "القادمة",
  past: "السابقة",
  pastBookings: "الحجوزات السابقة",
  cancellation: "الإلغاء",
  status: "الحالة",
  venue: "النادي",
  finishPayment: "أكمل الدفع",
  openGame: "افتح المباراة",
  payAtVenueShort: "الدفع في النادي",
  payAtTheVenue: "الدفع في النادي",
  todayInSentence: "اليوم",
  unavailable: "غير متاح",
  bookTitle: { court: "احجز ملعبًا", pitch: "احجز ملعبًا" },
  courtStep: { court: "الملعب", pitch: "اختر ملعبًا" },
  courtNoun: { court: "الملعب", pitch: "الملعب" },
  coach: {
    court: "اختر وقت البدء لترى الملاعب المتاحة.",
    pitch: "اختر وقت البدء لترى الملاعب المتاحة.",
  },
  gameBlurb: {
    football: "حوّل الحجز إلى مباراة ويتولى Temba التشكيلة والدعوات.",
    padel: "حوّل الحجز إلى مباراة ويتولى Temba الأماكن والدعوات والنتيجة.",
  },
  timeGroup: { am: "صباحًا", pm: "مساءً", afterMidnight: "بعد منتصف الليل" },
  shareMessage: (court: string, venue: string, start: string, end: string) =>
    `${court} في ${venue}، من ${start} إلى ${end}`,
  todayDate: (date: string) => `اليوم، ${date}`,
  tomorrowDate: (date: string) => `غدًا، ${date}`,
  whenLine: (day: string, minutes: number) => `${day} / ${minutes} د`,
  slotLine: (day: string, start: string, end: string, minutes: number) =>
    `${day} / من ${start} إلى ${end} / ${minutes} د`,
  placeLine: (day: string, venue: string, court: string) =>
    `${day} / ${venue} / ${court}`,
  untilClock: (clock: string) => `إلى ${clock}`,
  bookedHeadline: {
    tonight: (court: string) => `${court} لك الليلة.`,
    today: (court: string) => `${court} لك اليوم.`,
    tomorrow: (court: string) => `${court} لك غدًا.`,
    onDay: (court: string, weekday: string) => `${court} لك يوم ${weekday}.`,
  },
  payButton: {
    reserveAtVenue: (price: string) => `احجز وادفع ${price} في النادي`,
    pay: (price: string) => `ادفع ${price}`,
  },
  paymentMethods: {
    card: { title: "بطاقة", detail: "Visa أو Mastercard أو Amex" },
    benefitDetail: "بطاقة خصم بحرينية ورقم سري",
    benefitpayDetail: "سيتم توجيهك إلى تطبيق BenefitPay لإتمام الدفع",
    applePayDetail: "يبقى داخل التطبيق",
    atVenue: {
      title: "الدفع في النادي",
      detail: "سدّد عند الاستقبال حين تصل",
    },
  },
  clockOnDay: (clock: string, day: string) => `${clock} ${day}`,
  freeCancellationUntil: (deadline: string) => `إلغاء مجاني حتى ${deadline}.`,
  cancelConsequence: {
    notPaid: "لم تدفع ثمن هذا الحجز، فلا شيء لاسترداده.",
    tooLate: "فات أوان الاسترداد. لن تستعيد أي مبلغ.",
    refunded: (amount: string, percent: number) =>
      `سيُستردّ لك ${amount} (${percent}%).`,
  },
  sort: { label: "ترتيب", aToZ: "أبجديًا", cheapest: "الأرخص" },
  midnight: "منتصف الليل",
  am: "ص",
  pm: "م",
  wallClock: (hour: string, suffix: string) => `${hour} ${suffix}`,
  closed: "مغلق",
  hoursWindow: (open: string, close: string) => `من ${open} إلى ${close}`,
  hoursSeparator: "، ",
  listSeparator: "، ",
  closedToday: "مغلق اليوم",
  openTo: (clock: string) => `مفتوح حتى ${clock}`,
  venuesEmpty: {
    noMatch: {
      title: "لا يوجد نادٍ مطابق",
      description: "جرّب منطقة أخرى أو اسم نادٍ آخر.",
    },
    noPitches: {
      title: "لا ملاعب للحجز بعد",
      description: "تظهر الأندية ذات الملاعب هنا حين تفتح الحجوزات.",
    },
    noVenues: {
      title: "لا أندية للحجز بعد",
      description: "تظهر الأندية هنا حين تفتح الحجوزات على Temba.",
    },
  },
  pageHints: {
    card: "أدخل بيانات بطاقتك في صفحة الدفع، ثم عُد إلى هنا.",
    benefit: "أدخل بطاقة BENEFIT والرقم السري في صفحة الدفع، ثم عُد إلى هنا.",
    benefitpay: "وافق في تطبيق BenefitPay أو امسح رمز QR، ثم عُد إلى هنا.",
    applePay: "أكّد عبر Apple Pay في صفحة الدفع، ثم عُد إلى هنا.",
    generic: "أكمل الدفع في صفحة الدفع، ثم عُد إلى هنا.",
  },
  paymentPageName: "صفحة الدفع",
  payment: {
    slow: {
      title: "ما زلنا ننتظر.",
      body: (name: string) =>
        `لم يؤكد ${name} الدفع بعد. قد يستغرق هذا دقيقة. أبقِ هذه الشاشة مفتوحة، فهي تتحدّث فور وصوله.`,
      status: "يستغرق أطول من المعتاد",
      hint: "إن أظهرت صفحة الدفع نجاح العملية ولم يتحدّث هذا بعد، تحقّق من الحالة. التحقّق لا يخصم منك مرتين أبدًا.",
    },
    preparing: {
      title: "نجهّز صفحة الدفع.",
      body: "ملعبك محجوز لك ريثما نجهّز الدفع.",
      status: "جارٍ التجهيز",
    },
    open: {
      title: "أكمل الدفع في متصفحك.",
      body: (hint: string) => `${hint} تتحدّث هذه الشاشة تلقائيًا.`,
      statusFor: (name: string) => `بانتظار ${name}`,
      status: "بانتظار الدفع",
      hint: "أغلقت المتصفح عن طريق الخطأ؟ افتحه مجددًا أدناه.",
    },
    checking: {
      title: "نتحقّق من دفعتك.",
      body: "يستغرق هذا بضع ثوانٍ. أبقِ هذه الشاشة مفتوحة.",
      status: "جارٍ التأكيد",
    },
    failed: {
      title: "لم تتم عملية الدفع.",
      bodyFor: (name: string) =>
        `لم يُخصم أي مبلغ من ${name}. حاول مجددًا، أو ادفع بطريقة أخرى.`,
      body: "لم يُخصم أي مبلغ. حاول مجددًا، أو ادفع بطريقة أخرى.",
    },
    expired: {
      title: "انتهت مدة الحجز المؤقت.",
      body: "أُفرج عن الملعب ليتمكن الآخرون من حجزه. اختر وقتًا من جديد.",
    },
  },
  rowTitle: (clock: string, venue: string) => `${clock}، ${venue}`,
  courtMinutes: (court: string, minutes: number) => `${court}، ${minutes} د`,
  badgePlayed: "لُعب",
  tabWithCount: (label: string, count: string) => `${label}، ${count}`,
  partialCount: (n: number) => `${n}+`,
  bookingsEmpty: {
    upcoming: {
      title: "لا حجوزات قادمة",
      description: "احجز ملعبًا وسيظهر هنا.",
    },
    past: {
      title: "لا حجوزات سابقة",
      description: "تظهر هنا الحجوزات التي لعبتها أو ألغيتها.",
    },
  },
  startsIn: {
    onNow: "جارٍ الآن",
    minutes: (n: number) => `بعد ${n} د`,
    hours: (n: number) => `بعد ${n} س`,
    hoursMinutes: (hours: number, minutes: number) =>
      `بعد ${hours} س ${minutes} د`,
  },
  count: {
    venues: (n: number) =>
      plural("ar", n, {
        zero: "لا أندية",
        one: "نادٍ واحد",
        two: "ناديان",
        few: "{n} أندية",
        many: "{n} ناديًا",
        other: "{n} نادٍ",
      }),
    venuesOrMore: (n: number) =>
      plural("ar", n, {
        one: "أكثر من نادٍ واحد",
        two: "أكثر من ناديين",
        few: "أكثر من {n} أندية",
        many: "أكثر من {n} ناديًا",
        other: "أكثر من {n} نادٍ",
      }),
    bookings: (n: number) =>
      plural("ar", n, {
        zero: "لا حجوزات",
        one: "حجز واحد",
        two: "حجزان",
        few: "{n} حجوزات",
        many: "{n} حجزًا",
        other: "{n} حجز",
      }),
    bookingsOrMore: (n: number) =>
      plural("ar", n, {
        one: "أكثر من حجز واحد",
        two: "أكثر من حجزين",
        few: "أكثر من {n} حجوزات",
        many: "أكثر من {n} حجزًا",
        other: "أكثر من {n} حجز",
      }),
  },
  venues: {
    searchPlaceholder: "المنطقة أو النادي",
    searchLabel: "ابحث عن منطقة أو نادٍ",
    sortLabel: "ترتيب الأندية",
    loading: "جارٍ تحميل الأندية",
    loadError: "تعذّر تحميل الأندية",
    upcomingLoadError: "تعذّر تحميل الحجوزات القادمة",
    loadingUpcoming: "جارٍ تحميل الحجوزات القادمة",
    cardLabel: (name: string, city: string, price: string, open: string) =>
      `${name}، ${city}، من ${price} للساعة، ${open}`,
    partner: "نادٍ شريك",
    partnerCardLabel: (card: string) => `${card}، نادٍ شريك`,
    fromPrefix: "من",
    perHour: "/س",
  },
  venueScreen: {
    notTakingBookings: "هذا النادي لا يستقبل الحجوزات",
    loadError: "تعذّر تحميل النادي",
    day: "التاريخ",
    duration: "المدة",
    startTime: "وقت البدء",
    timesLoadError: "تعذّر تحميل الأوقات",
    nothingOnDay: {
      title: "لا شيء للحجز في هذا اليوم",
      description: "النادي مغلق أو مضت كل الأوقات. اختر يومًا أو مدة أخرى.",
    },
    dayTileLabel: (weekday: string, day: number) => `${weekday} ${day}`,
    timeUnavailable: (clock: string) => `${clock}، غير متاح`,
    struckTimesNote: (minutes: number) =>
      `الأوقات المشطوبة لا يوجد فيها ملعب متاح لمدة ${minutes} د.`,
    freeAt: (count: string, clock: string) => `${count} متاح عند ${clock}`,
    fullyBookedNote: {
      court: (minutes: number) =>
        `الملاعب المحجوزة بالكامل ليس فيها وقت متاح لمدة ${minutes} د في هذا اليوم.`,
      pitch: (minutes: number) =>
        `الملاعب المحجوزة بالكامل ليس فيها وقت متاح لمدة ${minutes} د في هذا اليوم.`,
    },
    goodToKnow: "معلومات مفيدة",
    venueDetails: "تفاصيل النادي",
    fullyBooked: "محجوز بالكامل",
    taken: "محجوز",
    noTimePicked: "لم يُختر وقت",
    pickStartTime: "اختر وقت البدء",
    footerSlot: (clock: string, minutes: number) => `${clock}، ${minutes} د`,
    footerSlotCourt: (clock: string, minutes: number, court: string) =>
      `${clock}، ${minutes} د، ${court}`,
  },
  checkout: {
    invalidTime: {
      title: "هذا الوقت غير صالح",
      description: "اختر وقتًا من جديد.",
    },
    loadError: "تعذّر تحميل صفحة إتمام الحجز",
    splitNote: "تقاسم التكلفة مع اللاعبين بعد الحجز.",
    bookingFee: "رسوم الحجز",
    total: "الإجمالي",
    notFree: {
      court: "الملعب غير متاح في هذا الوقت",
      pitch: "الملعب غير متاح في هذا الوقت",
    },
    justTaken: (court: string) => `تم حجز ${court} للتو`,
    notFound: {
      court: "لم يُعثر على هذا الملعب",
      pitch: "لم يُعثر على هذا الملعب",
    },
    notFreeAnyMore: {
      court: (minutes: number) =>
        `لم يعد متاحًا لمدة ${minutes} د في هذا الوقت. اختر ملعبًا أو وقتًا آخر.`,
      pitch: (minutes: number) =>
        `لم يعد متاحًا لمدة ${minutes} د في هذا الوقت. اختر ملعبًا أو وقتًا آخر.`,
    },
    pickAgain: "اختر مجددًا",
    payWith: "الدفع عبر",
    secureCheckout: "دفع آمن",
  },
  paymentScreen: {
    released: { court: "أُفرج عن الملعب", pitch: "أُفرج عن الملعب" },
    loadError: "تعذّر تحميل الدفع",
    checkError: "تعذّر التحقق من الدفع",
    releaseSlot: "ألغِ وأفرج عن الفترة",
    openAgain: (name: string) => `افتح ${name} مجددًا`,
    openPageAgain: "افتح صفحة الدفع مجددًا",
    checkStatusNow: "تحقّق من الحالة الآن",
    paidCheckStatus: "دفعت، تحقّق من الحالة",
    tryNameAgain: (name: string) => `جرّب ${name} مجددًا`,
    payAnotherWay: "ادفع بطريقة أخرى",
    pickATime: "اختر وقتًا",
    release: {
      title: {
        court: "الإفراج عن هذا الملعب؟",
        pitch: "الإفراج عن هذا الملعب؟",
      },
      description: {
        court: "يُلغى حجزك ويعود الملعب متاحًا للآخرين.",
        pitch: "يُلغى حجزك ويعود الملعب متاحًا للآخرين.",
      },
      confirm: { court: "أفرج عن الملعب", pitch: "أفرج عن الملعب" },
      keepPaying: "تابع الدفع",
    },
    slotHeldFor: (countdown: string) => `الفترة محجوزة لك لمدة ${countdown}`,
    slotHeld: (countdown: string) => `محجوزة ${countdown}`,
    payingWith: "الدفع عبر",
    tried: "جُرّب",
    paymentPage: "صفحة الدفع",
    amount: "المبلغ",
    stillToPay: "المتبقي للدفع",
    anotherWay: {
      subtitle: (price: string, countdown: string) =>
        `${price}. تبقى فترتك محجوزة لمدة ${countdown}.`,
      justFailed: "فشل للتو",
      securePages: "كل طريقة دفع تفتح صفحة دفع آمنة خاصة بها.",
      payWith: (price: string, name: string) => `ادفع ${price} عبر ${name}`,
      pay: "ادفع",
    },
  },
  booked: {
    createGame: "أنشئ مباراة لهذا الحجز",
    notNow: "ليس الآن",
    doLater: "يمكنك فعل ذلك لاحقًا من حجزك.",
    viewBooking: "عرض الحجز",
    ref: (ref: string) => `تم الحجز، المرجع ${ref}`,
    toClockAt: (clock: string, venue: string) => `إلى ${clock}، ${venue}`,
    pricePaid: (price: string) => `${price} مدفوعة.`,
    priceToPayAtVenue: (price: string) => `${price} تُدفع في النادي.`,
    findUnderBook: "تجد هذا الحجز في أي وقت تحت «حجز».",
    whoIsPlaying: "من يلعب؟",
  },
  detail: {
    cancelledToast: "أُلغي الحجز",
    loadError: "تعذّر تحميل الحجز",
    callVenue: "اتصل بالنادي",
    cancelBooking: "إلغاء الحجز",
    payment: "الدفع",
    refundDue: "المبلغ المستردّ",
    cancelSheet: {
      title: "إلغاء هذا الحجز؟",
      released: {
        court: "يُفرج عن الملعب للآخرين.",
        pitch: "يُفرج عن الملعب للآخرين.",
      },
    },
    game: "المباراة",
    yourGame: "مباراتك",
    gameCancelled:
      "أُلغيت مباراتك. الملعب ما زال لك، فيمكنك إعداد مباراة جديدة.",
    holdRanOut: "انتهت مدة الحجز المؤقت",
    heldFor: {
      court: (countdown: string) => `الملعب محجوز لك لمدة ${countdown}.`,
      pitch: (countdown: string) => `الملعب محجوز لك لمدة ${countdown}.`,
    },
    releasedUnpaid: {
      court: "أُفرج عن الملعب لأن الدفع لم يكتمل.",
      pitch: "أُفرج عن الملعب لأن الدفع لم يكتمل.",
    },
    venueCancelled: "ألغى النادي هذا الحجز.",
    youCancelled: "ألغيت هذا الحجز.",
    noShow: "مسجّل كغياب",
    expired: "انتهت صلاحية هذا الحجز",
    expiredDescription: "لم يكتمل الدفع في الوقت المحدد.",
  },
  list: {
    loadError: "تعذّر تحميل الحجوزات",
    loading: "جارٍ تحميل الحجوزات",
    bookACourt: "احجز ملعبًا",
    moreLoadError: "تعذّر تحميل المزيد من الحجوزات",
    loadMore: "تحميل المزيد",
  },
  cards: {
    nextBookingLabel: (
      day: string,
      clock: string,
      court: string,
      venue: string,
      badge: string,
    ) => `الحجز التالي، ${day} ${clock}، ${court}، ${venue}، ${badge}`,
    directionsTo: (venue: string) => `الاتجاهات إلى ${venue}`,
    invite: "دعوة",
    makeItAGame: "اجعلها مباراة",
    rowLabel: (
      weekday: string,
      day: string,
      title: string,
      detail: string,
      badge: string,
    ) => `${weekday} ${day}، ${title}، ${detail}، ${badge}`,
  },
  openingHours: "ساعات العمل",
  weekdayShort: (weekday: number) =>
    ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"][
      weekday
    ] ?? "",
} satisfies typeof source;
