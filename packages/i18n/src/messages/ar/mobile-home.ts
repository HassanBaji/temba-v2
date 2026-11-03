import type { mobileHome as source } from "../en/mobile-home";
import { plural } from "../../plural";

export const mobileHome = {
  join: {
    labelValue: (label: string, value: string) => `${label} ${value}`,
    parts: (parts: string[]) => parts.join("، "),
    nameWithDetail: (name: string, detail: string) => `${name}، ${detail}`,
  },
  block: {
    couldNotLoad: (title: string) => `تعذّر تحميل ${title}`,
  },
  placeholder: {
    comingSoon: "قريبًا.",
  },
  authScreen: {
    stepOf: (step: number, total: number) => `الخطوة ${step} من ${total}`,
  },
  welcome: {
    headline: "ابحث عن لعبة، املأ الملعب، واحتفظ بالنتيجة.",
    body: "ألعاب بادل وكرة قدم مفتوحة قربك، ومجموعاتك المعتادة، ومستوى يتبع نتائجك.",
    tonightLabel: "الليلة، كرباباد 9:00 م",
    oneOpen: "1 شاغر",
    continueWithPhone: "المتابعة بالهاتف",
  },
  oauth: {
    or: "أو",
    continueWithGoogle: "المتابعة عبر Google",
  },
  terms: {
    title: "الشروط والأحكام",
    lastUpdated: (date: string) => `آخر تحديث ${date}`,
    description: "ما توافق عليه عند إنشاء حساب أو استخدام Temba.",
    agreeAndContinue: "أوافق وأتابع",
    englishGoverns:
      "هذه الشروط متاحة بالإنجليزية فقط، والنص الإنجليزي هو المعتمد.",
  },
  termsMicrocopy: {
    before: (age: number) => `بمتابعتك تؤكد أن عمرك ${age} أو أكثر وتوافق على `,
    termsLink: "الشروط",
    after: " وسياسة الخصوصية.",
  },
  fields: {
    firstName: "الاسم الأول",
    lastName: "اسم العائلة",
    email: "البريد الإلكتروني",
    mobileNumber: "رقم الهاتف",
    password: "كلمة المرور",
    newPassword: "كلمة المرور الجديدة",
    createPassword: "أنشئ كلمة مرور",
    enterYourPassword: "أدخل كلمة المرور",
    atLeastEightCharacters: "8 أحرف على الأقل",
  },
  passwordField: {
    show: "إظهار كلمة المرور",
    hide: "إخفاء كلمة المرور",
    strengthHint: "8 أحرف على الأقل. أضف رقمًا أو رمزًا لتكون قوية.",
  },
  phoneField: {
    countryCode: (country: string) => `رمز الدولة، ${country}`,
    countryCodeTitle: "رمز الدولة",
  },
  code: {
    enterTheCode: "أدخل الرمز",
    sentTo: (destination: string) => `أُرسل إلى ${destination}.`,
    codeLabel: "رمز من ستة أرقام",
    verify: "تحقق",
    unlocksAtSixDigits: "يُفعَّل الزر عند ستة أرقام",
    newCodeSent: "أُرسل رمز جديد",
    changeEmail: "تغيير البريد الإلكتروني",
    changeNumber: "تغيير الرقم",
    yourEmail: "بريدك الإلكتروني",
    yourNumber: "رقمك",
    expiryEmail:
      "تنتهي صلاحية الرموز بعد وقت قصير. المحاولات الخاطئة الكثيرة تقفل هذا البريد.",
    expiryNumber:
      "تنتهي صلاحية الرموز بعد وقت قصير. المحاولات الخاطئة الكثيرة تقفل هذا الرقم.",
    expiryAccount:
      "تنتهي صلاحية الرموز بعد وقت قصير. المحاولات الخاطئة الكثيرة تقفل هذا الحساب.",
  },
  signIn: {
    whatsYourNumber: "ما رقمك؟",
    numberDescription:
      "الأرقام المعروفة تسجّل الدخول بكلمة مرور. وإن كان الرقم جديدًا علينا، نرسل رمزًا من ستة أرقام وننشئ حسابك.",
    invitedToGroup: "مدعو إلى مجموعة؟ افتح رابط الدعوة.",
    smsRates: "قد تُطبَّق رسوم الرسائل النصية المعتادة.",
    noPassword:
      "هذا الحساب بلا كلمة مرور. سجّل الدخول عبر Google بدلًا من ذلك.",
    enterYourPassword: "أدخل كلمة المرور",
    forPhone: (phone: string) => `للرقم ${phone}.`,
    forgotPassword: "نسيت كلمة المرور؟",
    toResetPassword: "لإعادة تعيين كلمة المرور.",
    pickNewPassword: "اختر كلمة مرور جديدة",
    forPhoneOtherDevices: (phone: string) =>
      `للرقم ${phone}. سيُسجَّل الخروج من الأجهزة الأخرى.`,
    saveAndSignIn: "حفظ وتسجيل الدخول",
    yourName: "اسمك",
    nameFooter:
      "يمكن إضافة الصورة والبريد الإلكتروني والرياضات والمستوى لاحقًا من الملف الشخصي.",
    preview: "معاينة",
    pickPassword: "اختر كلمة مرور",
    pickPasswordDescription: "لتسجيل الدخول على هاتف جديد.",
    createAccount: "إنشاء حساب",
    changeLaterFromSettings: "يمكنك تغييرها لاحقًا من الإعدادات.",
  },
  nameForm: {
    title: "بماذا نناديك؟",
  },
  continue: {
    almostThere: "أوشكت على الانتهاء",
    startOver: "أكمل إنشاء حسابك، أو ابدأ من البداية.",
    fewDetails: "ما زالت بعض التفاصيل مطلوبة لإكمال حسابك.",
  },
  factorTwo: {
    checkYourPhone: "تحقق من هاتفك",
    startFromSignIn: "ابدأ من تسجيل الدخول للمتابعة.",
    differentAccount: "تسجيل الدخول بحساب آخر",
  },
  gate: {
    setupCouldNotLoad: "تعذّر تحميل الإعداد",
    takingLongerTitle: "الإعداد يستغرق وقتًا أطول من المعتاد",
    takingLongerBody:
      "ما زال حسابك في Temba قيد الإنشاء. حاول مرة أخرى، أو سجّل الخروج وعد لاحقًا.",
    settingUpTitle: "جارٍ إعداد حسابك",
    settingUpBody:
      "ما زال حسابك في Temba قيد الإنشاء. لا يستغرق هذا سوى لحظة بعد إنشاء الحساب.",
  },
  questionnaire: {
    saveSports: "حفظ الرياضات",
    levelAlreadySet: {
      padel: "مستواك في البادل محدد مسبقًا، لذا تحفظ هذه الخطوة البقية فقط.",
      football:
        "مستواك في كرة القدم محدد مسبقًا، لذا تحفظ هذه الخطوة البقية فقط.",
    },
    preferenceHint: "تفضيل، لا وعد",
    sports: {
      title: "ماذا تلعب؟",
      description:
        "اختر واحدة أو كلتيهما. لكل رياضة مستواها الخاص وقائمة ألعابها الخاصة.",
      note: "تبقى المجموعات والحجوزات منفصلة لكل رياضة.",
    },
    padel: {
      title: "أين تضع نفسك؟",
      description: "نقطة بداية فقط. المباريات المصنّفة تؤكدها.",
      pickLevel: "اختر مستوى",
      levelLabel: "مستوى البادل",
      preferredSide: "الجهة المفضّلة",
    },
    football: {
      title: "كيف تصطف؟",
      description:
        "يستخدم المنظّمون هذا لموازنة الفرق. يمكنك تغييره في كل لعبة.",
      usuallyJoinAs: "تنضم عادةً بصفة",
      roleLabel: "دور كرة القدم",
      keeperSeats: "مقاعد الحارس محدودة باثنين في كل لعبة، واحد لكل جانب.",
      preferredPosition: "المركز المفضّل",
      positionLabel: "مركز كرة القدم المفضّل",
      yourLevel: "مستواك",
      selfPlaced: "تقدير ذاتي حاليًا. يوازن الفرق حتى تُصنَّف نتائج كرة القدم.",
    },
  },
  header: {
    invitesWaiting: (n: number) =>
      plural("ar", n, {
        one: "الدعوات، واحدة بانتظارك",
        two: "الدعوات، اثنتان بانتظارك",
        few: "الدعوات، {n} بانتظارك",
        many: "الدعوات، {n} بانتظارك",
        other: "الدعوات، {n} بانتظارك",
      }),
  },
  upNext: {
    title: "التالي",
    nothingThisWeek: "لا شيء هذا الأسبوع",
    thisWeek: (n: number) => `${n} هذا الأسبوع`,
    kind: {
      booking: "حجز",
      tournament: "بطولة",
      game: "لعبة",
    },
    withEmphasis: (emphasis: string) => `، ${emphasis}`,
    minutes: (n: number) => `${n} د`,
    rosterCount: (registered: number, allowed: number) =>
      `${registered} من ${allowed}`,
    rosterSpoken: (registered: number, allowed: number) =>
      `${registered} من ${allowed} لاعبًا`,
    bookingDetail: (court: string, minutes: number) => `${court}، ${minutes} د`,
    bookingHeroSpoken: (
      day: string,
      time: string,
      court: string,
      venue: string,
    ) => `التالي، حجز، ${day} ${time}، ${court}، ${venue}`,
    heroSpoken: (title: string, day: string, time: string) =>
      `التالي، ${title}، ${day} ${time}`,
    gameHeroSpoken: (title: string, day: string, time: string, place: string) =>
      `التالي، ${title}، ${day} ${time}، ${place}`,
    invite: "دعوة",
    details: "التفاصيل",
    allBookingsAndGames: "كل الحجوزات والألعاب",
    book: {
      padel: "احجز بادل",
      football: "احجز كرة قدم",
    },
    thisWeekTag: "هذا الأسبوع",
    free: "فارغ",
    weekOpen: "أسبوعك\nمفتوح.",
    emptyBody:
      "احجز ملعبًا، أو انضم إلى لعبة مفتوحة، أو ابدأ واحدة مع مجموعتك.",
    findAGame: "ابحث عن لعبة",
  },
  venues: {
    none: "لا أندية بعد",
    nearby: (n: number) =>
      plural("ar", n, {
        one: "نادٍ واحد قريب",
        two: "ناديان قريبان",
        few: "{n} أندية قريبة",
        many: "{n} ناديًا قريبًا",
        other: "{n} نادٍ قريب",
      }),
  },
  standing: {
    title: "الترتيب",
    groupCount: (n: number) =>
      plural("ar", n, {
        one: "مجموعة واحدة",
        two: "مجموعتان",
        few: "{n} مجموعات",
        many: "{n} مجموعة",
        other: "{n} مجموعة",
      }),
    rowSpoken: (group: string, rank: string, ofCount: string) =>
      `${group}، ${rank} ${ofCount}`,
  },
  level: {
    noLevel: {
      padel: "العب لعبة بادل مصنّفة ويظهر مستواك في البادل.",
      football: "العب لعبة كرة قدم مصنّفة ويظهر مستواك في كرة القدم.",
    },
    bandSpoken: (band: string) => `فئة المستوى ${band}`,
    bandLevelSpoken: (band: string, level: string) =>
      `فئة المستوى ${band}، المستوى ${level}`,
    changeSpoken: (spoken: string, amount: string, window: string) =>
      `${spoken} ${amount}، ${window}`,
    movement: {
      up: "ارتفع منذ آخر مباراة",
      down: "انخفض منذ آخر مباراة",
      held: "ثابت منذ آخر مباراة",
    },
  },
  recentForm: {
    title: "الأداء الأخير",
    lastTen: "آخر 10 مباريات",
    recordSpoken: (record: string) => `السجل ${record}`,
    played: "لُعبت",
    lost: "خسارة",
  },
  allTime: {
    matches: "مباراة",
    matchesSpoken: (n: number) =>
      plural("ar", n, {
        zero: "لا مباريات",
        one: "مباراة واحدة",
        two: "مباراتان",
        few: "{n} مباريات",
        many: "{n} مباراة",
        other: "{n} مباراة",
      }),
    percentWon: (percent: number) => `${percent}% فوز`,
    longestStreak: "أطول سلسلة",
  },
  profileHeader: {
    addPhoto: "إضافة صورة الملف الشخصي",
    editPhoto: "تعديل صورة الملف الشخصي",
  },
  photo: {
    cameraDenied:
      "اسمح بالوصول إلى الكاميرا في الإعدادات لالتقاط صورة، أو اختر واحدة من مكتبتك.",
    unreadable: "تعذّرت قراءة هذه الصورة. جرّب صورة أخرى.",
  },
  settings: {
    preferredPosition: "الجهة المفضّلة",
    preferredPositionHint: "جهتك الافتراضية عند اختيار مقعد في لعبة",
    rowSpoken: (title: string, subtitle: string) => `${title}. ${subtitle}`,
    rowSpokenCount: (title: string, count: number, subtitle: string) =>
      `${title}، ${count}. ${subtitle}`,
    completeProfileHint: "الصورة والبريد الإلكتروني والرياضات والمستوى",
    myBookings: "حجوزاتي",
    myBookingsHint: "حجوزات الملاعب القادمة والسابقة",
    invitesHint: "دعوات مباشرة موجّهة إليك",
    termsHint: "ما توافق عليه باستخدام Temba",
  },
  checklist: {
    title: "أكمل ملفك الشخصي",
    taskSpoken: (title: string, description: string) =>
      `${title}. ${description}`,
    chipSpoken: (done: number, total: number) =>
      `الملف الشخصي ${done} من ${total}. عرض القائمة`,
    progressSpoken: (done: number, total: number) =>
      `الملف الشخصي ${done} من ${total} مكتملة`,
    moreSpoken: (more: string) => `${more}. فتح القائمة`,
    skipForNow: "تخطٍّ الآن",
  },
  tasks: {
    short: {
      name: "الاسم",
      photo: "الصورة",
      email: "البريد",
      sports: "الرياضات",
    },
    shortList: (names: string[]) => names.join("، "),
    chipLabel: (done: number, total: number) =>
      `الملف الشخصي ${done} من ${total} · عرض`,
    sportsMeta: (step: number, total: number) =>
      `الملف الشخصي / الرياضات ${step} من ${total}`,
    skip: "تخطٍّ",
    completeProfile: "إكمال الملف الشخصي",
    laterShowGames: "لاحقًا، أرني الألعاب",
    youAreInBody:
      "حسابك يعمل كما هو. الملف الأكمل يمنحك ألعابًا مطابقة لمستواك، وتصنيفًا، وإيصالات بالبريد الإلكتروني.",
    countDone: (count: string) => `${count} مكتملة`,
    doneAtSignUp: "أُنجز عند إنشاء الحساب",
    heading: "المهام",
    notNow: "ليس الآن",
  },
  emailTask: {
    meta: "الملف الشخصي / البريد",
    title: "أضف بريدك الإلكتروني",
    description:
      "لإيصالات الحجز، وطريقة للعودة إلى حسابك إن غيّرت رقمك. نرسل رمزًا من ستة أرقام لتأكيده.",
    sendCode: "إرسال الرمز",
    enterEmail: "أدخل بريدك الإلكتروني",
    checkInbox: "تحقق من بريدك الوارد",
    inboxFooter:
      "حتى يُتحقق منه، يُحفظ البريد دون استخدام. تحقق من البريد المزعج إن لم يصل شيء خلال دقيقة.",
    benefits: {
      receipts: {
        lead: "الإيصالات.",
        text: "كل حجز ودفعة مقعد، في بريدك الوارد.",
      },
      recovery: {
        lead: "الاستعادة.",
        text: "سجّل الدخول بالبريد الإلكتروني إن تغيّر رقمك.",
      },
      private: {
        lead: "خاص.",
        text: "لا يُعرض لأعضاء آخرين أبدًا.",
      },
    },
  },
  nameTask: {
    meta: "الملف الشخصي / الاسم",
    save: "حفظ الاسم",
  },
  photoTask: {
    meta: "الملف الشخصي / الصورة",
    title: "أضف صورة",
    description:
      "صورة واضحة للوجه تساعد المنظّمين على التعرّف عليك في الملعب. تُعرض لأعضاء المجموعة ولمن في ألعابك.",
    save: "حفظ الصورة",
    newPhotoSpoken: "صورة ملفك الشخصي الجديدة",
    noPhotoSpoken: "لا صورة بعد",
    placeholder: "صورة الملف الشخصي",
    untilThen: (initials: string) => `حتى ذلك الحين تظهر باسم ${initials}`,
    takePhoto: "التقط صورة",
    chooseFromLibrary: "اختر من المكتبة",
  },
} satisfies typeof source;
