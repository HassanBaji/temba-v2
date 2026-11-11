import { isolate } from "../../bidi";
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
    headline: "ابحث عن مباراة، أكمِل العدد، وسجّل النتيجة.",
    body: "مباريات بادل وكرة قدم مفتوحة بالقرب منك، مع مجموعاتك المعتادة، ومستوى يتطوّر مع كل نتيجة.",
    tonightLabel: "الليلة، كرباباد 9:00 م",
    oneOpen: "1 شاغر",
    continueWithPhone: "المتابعة برقم الجوال",
  },
  oauth: {
    or: "أو",
    continueWithGoogle: "المتابعة باستخدام Google",
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
    before: (age: number) =>
      `بالمتابعة، فإنك تؤكد أن عمرك ${age} عامًا فأكثر، وتوافق على `,
    termsLink: "الشروط والأحكام",
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
    sentTo: (destination: string) => `أُرسل إلى ${isolate(destination)}.`,
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
    forPhone: (phone: string) => `للرقم ${isolate(phone)}.`,
    forgotPassword: "نسيت كلمة المرور؟",
    toResetPassword: "لإعادة تعيين كلمة المرور.",
    pickNewPassword: "اختر كلمة مرور جديدة",
    forPhoneOtherDevices: (phone: string) =>
      `للرقم ${isolate(phone)}. سيُسجَّل الخروج من الأجهزة الأخرى.`,
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
        "اختر واحدة أو كلتيهما. لكل رياضة مستواها الخاص وقائمة مبارياتها الخاصة.",
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
        "يستخدم المنظّمون هذا لموازنة الفرق. يمكنك تغييره في كل مباراة.",
      usuallyJoinAs: "تنضم عادةً بصفة",
      roleLabel: "دور كرة القدم",
      keeperSeats: "أماكن الحارس محدودة باثنين في كل مباراة، واحد لكل جانب.",
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
    title: "مبارياتك القادمة",
    kind: {
      booking: "حجز",
    },
    bookingDetail: (court: string, minutes: number) => `${court}، ${minutes} د`,
    bookingHeroSpoken: (
      day: string,
      time: string,
      court: string,
      venue: string,
    ) => `التالي، حجز، ${day} ${time}، ${court}، ${venue}`,
    gameHeroSpoken: (title: string, day: string, time: string, place: string) =>
      `التالي، ${title}، ${day} ${time}، ${place}`,
    invite: "دعوة",
    details: "التفاصيل",
    weekOpen: "أسبوعك\nمفتوح.",
    emptyBody:
      "احجز ملعبًا، أو انضم إلى مباراة مفتوحة، أو ابدأ واحدة مع مجموعتك.",
    findAGame: "ابحث عن مباراة",
  },
  standing: {
    title: "ترتيبك",
    rowSpoken: (group: string, rank: string, ofCount: string) =>
      `${group}، ${rank} ${ofCount}`,
  },
  level: {
    noLevel: {
      padel: "العب مباراة بادل مصنّفة ويظهر مستواك في البادل.",
      football: "العب مباراة كرة قدم مصنّفة ويظهر مستواك في كرة القدم.",
    },
    bandSpoken: (band: string) => `الفئة ${band}`,
    bandLevelSpoken: (band: string, level: string) =>
      `الفئة ${band}، التقييم ${level}`,
    changeSpoken: (spoken: string, amount: string, window: string) =>
      `${spoken} ${amount}، ${window}`,
  },
  allTime: {
    matches: (n: number) =>
      plural("ar", n, {
        zero: "مباراة",
        one: "مباراة",
        two: "مباراتان",
        few: "مباريات",
        many: "مباراة",
        other: "مباراة",
      }),
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
    preferredPositionHint: "جهتك الافتراضية عند اختيار مكانك في مباراة",
    rowSpoken: (title: string, subtitle: string) => `${title}. ${subtitle}`,
    rowSpokenCount: (title: string, count: number, subtitle: string) =>
      `${title}، ${count}. ${subtitle}`,
    completeProfileHint: "الصورة والبريد الإلكتروني والرياضات والمستوى",
    myBookings: "حجوزاتي",
    myBookingsHint: "حجوزات الملاعب القادمة والسابقة",
    invitesHint: "دعوات المباريات والمجموعات الموجّهة إليك",
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
    laterShowGames: "لاحقًا، أرني المباريات",
    youAreInBody:
      "حسابك يعمل كما هو. الملف الأكمل يمنحك مبارياتٍ مطابقة لمستواك، وتصنيفًا، وإيصالات بالبريد الإلكتروني.",
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
      "صورة واضحة للوجه تساعد المنظّمين على التعرّف عليك في الملعب. تُعرض لأعضاء المجموعة ولمن في مبارياتك.",
    save: "حفظ الصورة",
    newPhotoSpoken: "صورة ملفك الشخصي الجديدة",
    noPhotoSpoken: "لا صورة بعد",
    placeholder: "صورة الملف الشخصي",
    untilThen: (initials: string) => `حتى ذلك الحين تظهر باسم ${initials}`,
    takePhoto: "التقط صورة",
    chooseFromLibrary: "اختر من المكتبة",
  },
  card: {
    ended: "انتهت",
    oneOfThisWeek: (n: number) => `1 من ${n} هذا الأسبوع`,
    nothingThisWeek: "لا شيء هذا الأسبوع",
    today: "اليوم",
    sportWithGroup: (sport: string, group: string) => `${sport} ${group}`,
    to: (clock: string) => `حتى ${clock}`,
    whoIn: (filled: number, total: number) => `${filled} من ${total} حاضرون`,
    allIn: (total: number) =>
      total === 4 ? "الأربعة حاضرون" : `الجميع حاضرون (${total})`,
    scope: (parts: string[]) => parts.join("، "),
    teams: (n: number) =>
      plural("ar", n, {
        one: "فريق واحد",
        two: "فريقان",
        few: "{n} فرق",
        many: "{n} فريقًا",
        other: "{n} فريق",
      }),
    teamsAreMade: "تم تقسيم الفريقين",
    leftSide: "الجهة اليسرى",
    rightSide: "الجهة اليمنى",
    open: "شاغر",
    vs: "ضد",
    andMore: (n: number) => `و${n} آخرون`,
    playersSpoken: (names: string[]) => names.join("، "),
    teamSpoken: (team: string, names: string[]) =>
      `${team}: ${names.join("، ")}`,
    openSeatSpoken: (side: string) => `مقعد شاغر، ${side}`,
    seatSpoken: (name: string, side: string) => `${name}، ${side}`,
    positions: {
      keeperCount: (n: number, max: number) => `${n} من ${max}`,
      keeper: "حارس",
      defenders: (n: number) =>
        plural("ar", n, {
          one: "مدافع",
          two: "مدافعان",
          few: "مدافعين",
          many: "مدافعًا",
          other: "مدافع",
        }),
      mid: "وسط",
      forwards: (n: number) =>
        plural("ar", n, {
          one: "مهاجم",
          two: "مهاجمان",
          few: "مهاجمين",
          many: "مهاجمًا",
          other: "مهاجم",
        }),
    },
    step: {
      seatsLeft: (n: number) =>
        plural("ar", n, {
          one: "بقي مقعد واحد",
          two: "بقي مقعدان",
          few: "بقيت {n} مقاعد",
          many: "بقي {n} مقعدًا",
          other: "بقي {n} مقعد",
        }),
      seatLeftOnSide: (name: string) => `بقي مقعد واحد، في جهة ${name}`,
      inviteBody: "ادعُ أحدًا ليكمل العدد، أو شارك المباراة مع مجموعتك.",
      poolShort: (n: number) =>
        plural("ar", n, {
          one: "أنت مسجّل. لاعب واحد إضافي وتُقام المباراة",
          two: "أنت مسجّل. لاعبان إضافيان وتُقام المباراة",
          few: "أنت مسجّل. {n} لاعبين إضافيين وتُقام المباراة",
          many: "أنت مسجّل. {n} لاعبًا إضافيًا وتُقام المباراة",
          other: "أنت مسجّل. {n} لاعب إضافي وتُقام المباراة",
        }),
      poolShortBody: "يُقسَّم الفريقان عند اكتمال العدد.",
      poolFullOrganizer: "اكتمل العدد. حان وقت تقسيم الفريقين",
      poolFullOrganizerBody:
        "وازِن بينهما حسب المستوى والمركز، أو اخترهما بنفسك.",
      poolFull: "اكتمل العدد. التقسيم هو الخطوة التالية",
      poolFullBody: "يقسّم المنظّم الفريقين قبل انطلاق المباراة.",
      inTeam: (team: string) => `أنت في فريق ${team}`,
      inTeamAt: (team: string, where: string) =>
        `أنت في فريق ${team}، ${where}`,
      where: {
        keeper: "في حراسة المرمى",
        def: "في الدفاع",
        mid: "في الوسط",
        fwd: "في الهجوم",
      },
      shirtDark: "البس قميصًا داكنًا. التشكيلة في صفحة المباراة.",
      shirtLight: "البس قميصًا فاتحًا. التشكيلة في صفحة المباراة.",
      lineupsOnGame: "التشكيلة في صفحة المباراة.",
      beThereBy: (clock: string) => `كن هناك قبل ${clock}`,
      beThereByBody: (place: string) => `الجميع حاضرون. ${place}.`,
      playingNow: "المباراة جارية",
      playingNowBody: "أضف النتيجة بعد آخر نقطة.",
      howDidItGo: "كيف كانت المباراة؟",
      howDidItGoBody:
        "يُدخل أحد الطرفين النتيجة ويؤكدها الآخر. يتغيّر المستوى بعد التأكيد.",
      drawOut: "صدرت القرعة",
      drawOutBody: "جولاتك وملاعبك في صفحة المباراة.",
      drawPending: "بانتظار القرعة",
      drawPendingBody: "تُنشر الجولات بعد اكتمال الفرق.",
      payCourt: "أكمِل دفع الملعب",
      payCourtBody: "يبقى الحجز محفوظًا حتى يُدفع.",
      makeGame: "حوّله إلى مباراة",
      makeGameBody: "أضف لاعبين ليتمكنوا من الانضمام وتسجيل النتيجة.",
      gameSet: "مباراتك جاهزة",
      gameSetBody: "اللاعبون والنتيجة في صفحة المباراة.",
      courtBooked: "ملعبك محجوز",
      courtBookedBody: "شاركه مع من ستلعب معهم.",
    },
    action: {
      directions: "الاتجاهات",
      seeLineups: "اعرض التشكيلة",
      makeTeams: "قسّم الفريقين",
      addScore: "أضف النتيجة",
      seeRounds: "اعرض جولاتك",
    },
    allGames: "كل المباريات",
    openWeekBody: (n: number) =>
      plural("ar", n, {
        one: "مباراة واحدة في مجموعاتك فيها مكان. احجز مقعدًا، أو ابدأ مباراتك.",
        two: "مباراتان في مجموعاتك فيهما مكان. احجز مقعدًا، أو ابدأ مباراتك.",
        few: "{n} مباريات في مجموعاتك فيها مكان. احجز مقعدًا، أو ابدأ مباراتك.",
        many: "{n} مباراة في مجموعاتك فيها مكان. احجز مقعدًا، أو ابدأ مباراتك.",
        other:
          "{n} مباراة في مجموعاتك فيها مكان. احجز مقعدًا، أو ابدأ مباراتك.",
      }),
    openRowDetail: (place: string, seats: string) => `${place}، ${seats}`,
    join: "انضم",
    joinSpoken: (title: string) => `انضم إلى ${title}`,
  },
  sportSwitch: {
    spoken: (sport: string, band: string) => `${sport}، ${isolate(band)}`,
  },
  levelSection: {
    title: {
      padel: "مستوى البادل",
      football: "مستوى كرة القدم",
    },
    confirmed: "مؤكَّد",
    provisional: "مبدئي",
    level: "المستوى",
    lastN: (n: number) => `آخر ${n}`,
    nextBand: "الفئة التالية",
    nextBandValue: (percent: number) => `، قطعت ${percent}% من الطريق`,
    topBand: "أعلى فئة",
    confirmsIn: (n: number) =>
      plural("ar", n, {
        one: "مباراة مصنّفة واحدة ويتأكد مستواك.",
        two: "مباراتان مصنّفتان ويتأكد مستواك.",
        few: "{n} مباريات مصنّفة ويتأكد مستواك.",
        many: "{n} مباراة مصنّفة ويتأكد مستواك.",
        other: "{n} مباراة مصنّفة ويتأكد مستواك.",
      }),
    gaugeSpoken: (band: string, percent: number, next: string) =>
      `الفئة ${isolate(band)}، قطعت ${percent}% من الطريق إلى ${isolate(next)}`,
  },
  lastTen: {
    title: "آخر 10",
    oldestFirst: "الأقدم أولًا",
    won: "فوز",
    drawn: "تعادل",
    lost: "خسارة",
    percentWon: (percent: number) => `${percent}%`,
    percentWonLabel: "فوز",
    spoken: (won: number, drawn: number, lost: number) =>
      `${won} فوز، ${drawn} تعادل، ${lost} خسارة`,
  },
  stats: {
    title: "الإحصاءات",
    ratedMatches: (n: number) =>
      plural("ar", n, {
        one: "مباراة مصنّفة واحدة",
        two: "مباراتان مصنّفتان",
        few: "{n} مباريات مصنّفة",
        many: "{n} مباراة مصنّفة",
        other: "{n} مباراة مصنّفة",
      }),
    matches: (n: number) =>
      plural("ar", n, {
        one: "مباراة واحدة",
        two: "مباراتان",
        few: "{n} مباريات",
        many: "{n} مباراة",
        other: "{n} مباراة",
      }),
    winRate: "نسبة الفوز",
    played: (n: number) => `${n} لُعبت`,
    winRateAfter: (n: number) => `بعد ${n} مباريات`,
    winsInARow: "انتصارات متتالية",
    bestIs: (n: number) => `الأفضل ${n}`,
    bestRun: "أفضل سلسلة",
    winsIn: (month: string) => `انتصارات، في ${month}`,
    wins: "انتصارات",
    goals: "الأهداف",
    perGame: (value: string) => `${value} في المباراة`,
    cleanSheets: "شباك نظيفة",
    ofMatches: (n: number) =>
      plural("ar", n, {
        one: "من مباراة واحدة",
        two: "من مباراتين",
        few: "من {n} مباريات",
        many: "من {n} مباراة",
        other: "من {n} مباراة",
      }),
    unbeaten: "دون خسارة",
    tileSpoken: (label: string, value: string, caption: string) =>
      `${label} ${value}، ${caption}`,
  },
  standingSection: {
    groupsOf: (shown: number, total: number) => `${shown} من ${total} مجموعات`,
    countedGames: (n: number) =>
      plural("ar", n, {
        one: "مباراة محتسبة واحدة",
        two: "مباراتان محتسبتان",
        few: "{n} مباريات محتسبة",
        many: "{n} مباراة محتسبة",
        other: "{n} مباراة محتسبة",
      }),
    moreGroups: (n: number) =>
      plural("ar", n, {
        one: "مجموعة أخرى بلا مباريات محتسبة بعد",
        two: "مجموعتان أخريان بلا مباريات محتسبة بعد",
        few: "{n} مجموعات أخرى بلا مباريات محتسبة بعد",
        many: "{n} مجموعة أخرى بلا مباريات محتسبة بعد",
        other: "{n} مجموعة أخرى بلا مباريات محتسبة بعد",
      }),
    of: (n: number) => `من ${n}`,
  },
  latest: {
    newMarkFrom: (name: string) => `علامة جديدة من ${name}`,
    newMark: "علامة جديدة",
    line: (kind: string, game: string) => `${kind}، في ${game}`,
  },
} satisfies typeof source;
