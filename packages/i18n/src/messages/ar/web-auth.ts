import { plural } from "../../plural";
import type { webAuth as source } from "../en/web-auth";

export const webAuth = {
  screen: {
    stepOf: (step: number, total: number) => `الخطوة ${step} من ${total}`,
  },
  welcome: {
    headline: "ابحث عن لعبة،\nاملأ الملعب،\nسجّل النتيجة.",
    tagline:
      "ألعاب بادل وكرة قدم مفتوحة قربك، ومجموعاتك المعتادة، ومستوى يتبع نتائجك.",
    sportsLabel: "الرياضات",
    continueWithPhone: "المتابعة بالهاتف",
  },
  termsNote: {
    consent: (age: number) =>
      `بمتابعتك تؤكد أن عمرك ${age} عامًا أو أكثر وتوافق على {terms} و{privacy}.`,
    termsLink: "الشروط",
    privacyLink: "سياسة الخصوصية",
    smsRates: "قد تُطبَّق رسوم الرسائل النصية المعتادة.",
  },
  oauth: {
    or: "أو",
    continueWithGoogle: "المتابعة عبر Google",
  },
  sso: {
    finishingSignIn: "جارٍ إكمال تسجيل الدخول…",
    signingIn: "جارٍ تسجيل الدخول",
    creatingAccount: "جارٍ إنشاء الحساب",
  },
  phoneField: {
    countryCode: (country: string, code: string) =>
      `رمز الاتصال الدولي، حاليًا ${country} +${code}`,
  },
  password: {
    show: "إظهار كلمة المرور",
    hide: "إخفاء كلمة المرور",
    strength: (label: string) => `قوة كلمة المرور: ${label}`,
    placeholder: (min: number) => `${min} أحرف على الأقل`,
  },
  resend: {
    newCodeSent: "أُرسل رمز جديد",
  },
  verify: {
    sentTo: (destination: string) => `أُرسل إلى ${destination}.`,
    verify: "تحقق",
    verifying: "جارٍ التحقق…",
    helper: "يُفعَّل الزر عند إدخال ستة أرقام",
  },
  phoneAuth: {
    noPasswordUseGoogle:
      "لا توجد كلمة مرور لهذا الحساب. سجّل الدخول عبر Google بدلًا من ذلك.",
    preview: "معاينة",
    yourName: "اسمك",
    forNumber: (phone: string) => `للرقم ${phone}.`,
    passwordLabel: "كلمة المرور",
    enterPassword: "أدخل كلمة المرور",
    signingIn: "جارٍ تسجيل الدخول…",
    forgotPassword: "نسيت كلمة المرور؟",
    changeNumber: "تغيير الرقم",
    toResetPassword: "لإعادة تعيين كلمة المرور.",
    codesExpire: {
      number:
        "تنتهي صلاحية الرموز بعد وقت قصير. المحاولات الخاطئة الكثيرة تقفل هذا الرقم.",
      email:
        "تنتهي صلاحية الرموز بعد وقت قصير. المحاولات الخاطئة الكثيرة تقفل هذا البريد.",
      account:
        "تنتهي صلاحية الرموز بعد وقت قصير. المحاولات الخاطئة الكثيرة تقفل هذا الحساب.",
    },
    forNumberSignsOutOthers: (phone: string) =>
      `للرقم ${phone}. سيُسجَّل الخروج من الأجهزة الأخرى.`,
    newPasswordLabel: "كلمة المرور الجديدة",
    saveAndSignIn: "حفظ وتسجيل الدخول",
    firstName: "الاسم الأول",
    lastName: "اسم العائلة",
    addLaterFromProfile:
      "يمكنك إضافة الصورة والبريد والرياضات والمستوى لاحقًا من الملف الشخصي.",
    newPasswordDescription: "لتسجيل الدخول من هاتف جديد.",
    creatingAccount: "جارٍ إنشاء الحساب…",
    createAccount: "إنشاء حساب",
    changeLaterFromSettings: "يمكنك تغييرها لاحقًا من الإعدادات.",
    phoneDescription:
      "الأرقام المعروفة تسجّل الدخول بكلمة مرور. وإن كان الرقم جديدًا علينا، نرسل لك رمزًا من ستة أرقام وننشئ حسابك.",
    invitedToGroup: "مدعو إلى مجموعة؟",
    openInviteLink: "افتح رابط دعوتك.",
    mobileNumber: "رقم الجوال",
    checking: "جارٍ التحقق…",
  },
  signUpContinue: {
    almostThere: "أوشكت على الانتهاء",
    finishOrStart: "أكمل إنشاء حسابك، أو ابدأ من البداية.",
    startFrom: "ابدأ من {phone} أو تابع عبر Google.",
    yourPhoneNumber: "رقم هاتفك",
    yourEmail: "بريدك الإلكتروني",
    yourNumber: "رقمك",
    enterTheCode: "أدخل الرمز",
    changeEmail: "تغيير البريد",
    detailsNeeded: "ما زالت بعض التفاصيل مطلوبة لإكمال حسابك.",
    email: "البريد الإلكتروني",
    continuing: "جارٍ المتابعة…",
  },
  secondFactor: {
    checkYourPhone: "تحقق من هاتفك",
    startFromSignIn: "ابدأ من تسجيل الدخول للمتابعة.",
    differentAccount: "تسجيل الدخول بحساب آخر",
  },
  onboarding: {
    eyebrow: {
      sports: (step: number, total: number) =>
        `الملف الشخصي / الرياضات ${step} من ${total}`,
      name: "الملف الشخصي / الاسم",
      photo: "الملف الشخصي / الصورة",
      email: "الملف الشخصي / البريد",
    },
    levelAlreadySet: {
      padel: "مستواك في البادل محدد مسبقًا، فهذه الخطوة تحفظ الباقي فقط.",
      football:
        "مستواك في كرة القدم محدد مسبقًا، فهذه الخطوة تحفظ الباقي فقط.",
    },
    saveSports: "حفظ الرياضات",
    sports: {
      metaTitle: "اختر رياضاتك",
      title: "ماذا تلعب؟",
      description:
        "اختر واحدة أو كلتيهما. لكل رياضة مستواها وقائمة ألعابها الخاصة.",
      separateNote: "المجموعات والحجوزات منفصلة لكل رياضة.",
    },
    padel: {
      title: "أين تضع نفسك؟",
      description: "نقطة بداية فقط. المباريات المصنّفة تؤكدها.",
      levelLabel: "مستوى البادل",
      preferredSide: "الجهة المفضّلة",
      preferenceHint: "تفضيل، لا وعد",
      pickALevel: "اختر مستوى",
    },
    football: {
      title: "كيف تصطف؟",
      description:
        "يستخدمها المنظّمون لموازنة الفرق. يمكنك تغييرها في كل لعبة.",
      usuallyJoinAs: "تنضم عادةً بصفة",
      roleLabel: "دور كرة القدم",
      keeperSeatsNote: "مقاعد الحراس محدودة باثنين في كل لعبة، واحد لكل جانب.",
      preferredPosition: "المركز المفضّل",
      positionLabel: "مركز كرة القدم المفضّل",
      yourLevel: "مستواك",
      levelLabel: "مستوى كرة القدم",
      selfPlacedNote:
        "تقدير ذاتي حاليًا. يوازن الفرق حتى تُصنَّف نتائج كرة القدم.",
    },
    name: {
      saveName: "حفظ الاسم",
    },
    photo: {
      title: "أضف صورة",
      description:
        "صورة واضحة لوجهك تساعد المنظّمين على التعرّف عليك في الملعب. تظهر لأعضاء المجموعة وللاعبين في ألعابك.",
      chosenAlt: "الصورة التي اخترتها",
      currentAlt: "صورة ملفك الشخصي الحالية",
      placeholder: "صورة الملف الشخصي",
      untilThenShownAs: "حتى ذلك الحين تظهر باسم {initials}.",
      chooseDifferent: "اختر صورة أخرى",
      choose: "اختر صورة",
      saving: "جارٍ حفظ الصورة…",
      save: "حفظ الصورة",
    },
    email: {
      benefits: {
        receipts: {
          lead: "الإيصالات.",
          rest: "كل حجز ودفعة مقعد، في بريدك.",
        },
        recovery: {
          lead: "الاستعادة.",
          rest: "سجّل الدخول بالبريد إن تغيّر رقمك.",
        },
        private: {
          lead: "خاص.",
          rest: "لا يظهر للأعضاء الآخرين أبدًا.",
        },
      },
      enterYourEmail: "أدخل بريدك الإلكتروني",
      checkYourInbox: "تحقق من بريدك الوارد",
      unverifiedNote: "حتى يتم التحقق، يُحفظ البريد دون استخدام.",
      verifyEmail: "التحقق من البريد",
      spamHelper: "تحقق من البريد المزعج إن لم يصل شيء خلال دقيقة.",
      title: "أضف بريدك الإلكتروني",
      description:
        "لإيصالات الحجز، وطريقة للعودة إلى حسابك إن غيّرت رقمك. نرسل رمزًا من ستة أرقام لتأكيده.",
      emailLabel: "البريد الإلكتروني",
      sendingCode: "جارٍ إرسال الرمز…",
      sendCode: "إرسال الرمز",
    },
    checklist: {
      skip: "تخطّ",
      profile: "الملف الشخصي",
      tasksLabel: "مهام الملف الشخصي",
      completeProfile: "إكمال الملف الشخصي",
      laterShowGames: "لاحقًا، أرني الألعاب",
      nameLabel: "الاسم",
      mobileNumberLabel: "رقم الجوال",
      countDone: (count: string) => `${count} مكتمل`,
      title: "أكمل ملفك الشخصي",
      doneAtSignUp: "تم عند إنشاء الحساب",
      tasks: "المهام",
    },
    gate: {
      loadFailed: "تعذّر تحميل الإعداد",
      stalledTitle: "يستغرق الإعداد وقتًا أطول من المعتاد",
      stalledMessage:
        "ما زال حسابك على Temba قيد الإنشاء. حاول مرة أخرى، أو سجّل الخروج وعُد لاحقًا.",
      signingOut: "جارٍ تسجيل الخروج…",
      settingUp: "جارٍ إعداد حسابك",
      creatingNote:
        "ما زال حسابك على Temba قيد الإنشاء. يستغرق هذا لحظات بعد إنشاء الحساب، وتُفتح الصفحة تلقائيًا.",
    },
    notNow: "ليس الآن",
  },
  home: {
    upNext: "التالي",
    nothingThisWeek: "لا شيء هذا الأسبوع",
    thisWeekCount: (n: number) => `${n} هذا الأسبوع`,
    onNow: "جارية الآن",
    inMinutes: (minutes: number) => `بعد ${minutes} د`,
    inHours: (hours: number) => `بعد ${hours} س`,
    inHoursMinutes: (hours: number, minutes: number) =>
      `بعد ${hours} س ${minutes} د`,
    rosterOf: (registered: number, allowed: number) =>
      `${registered} من ${allowed}`,
    rosterPlayers: (registered: number, allowed: number) =>
      `${registered} من ${allowed} لاعبًا`,
    kind: {
      game: "لعبة",
      tournament: "بطولة",
    },
    toTime: (time: string) => `حتى ${time}`,
    nextUpSpoken: (title: string, day: string, time: string) =>
      `التالي، ${title}، ${day} ${time}`,
    nextUpSpokenAt: (title: string, day: string, time: string, place: string) =>
      `التالي، ${title}، ${day} ${time}، ${place}`,
    details: "التفاصيل",
    allGames: "كل الألعاب",
    empty: {
      thisWeek: "هذا الأسبوع",
      free: "فارغ",
      headline: "أسبوعك\nمفتوح.",
      description: "انضم إلى لعبة مفتوحة، أو ابدأ واحدة مع مجموعتك.",
      findAGame: "ابحث عن لعبة",
    },
    noLevel: {
      padel: "العب لعبة بادل مصنّفة ليظهر مستواك في البادل.",
      football: "العب لعبة كرة قدم مصنّفة ليظهر مستواك في كرة القدم.",
    },
    levelBandSpoken: "فئة المستوى",
    groupsCount: (n: number) =>
      plural("ar", n, {
        one: "مجموعة واحدة",
        two: "مجموعتان",
        few: "{n} مجموعات",
        many: "{n} مجموعة",
        other: "{n} مجموعة",
      }),
    standing: "الترتيب",
    recentForm: {
      title: "الأداء الأخير",
      lastTen: "آخر 10 مباريات",
      record: "السجل",
      played: "لُعبت",
      won: "فوز",
      lost: "خسارة",
      slot: {
        notPlayed: "لم تُلعب",
        won: "فوز",
        lost: "خسارة",
        drawn: "تعادل",
      },
    },
    couldNotLoad: (title: string) => `تعذّر تحميل ${title}`,
    declare: {
      levelSaved: "تم حفظ المستوى",
      title: "حدّد مستواك",
      description: {
        padel:
          "ضع نفسك على سلّم البادل. يمكنك فعل ذلك مرة واحدة، قبل أول مباراة مصنّفة.",
        football:
          "ضع نفسك على سلّم كرة القدم. يمكنك فعل ذلك مرة واحدة، قبل أول مباراة مصنّفة.",
      },
      button: "تحديد المستوى",
    },
    checklist: {
      shortName: {
        name: "الاسم",
        photo: "الصورة",
        email: "البريد",
        sports: "الرياضات",
      },
      label: "قائمة الملف الشخصي",
      profile: "الملف الشخصي",
      show: "إظهار",
      title: "أكمل ملفك الشخصي",
      skipForNow: "تخطّ الآن",
    },
  },
  invites: {
    previewFailed: "تعذّر تحميل هذه الدعوة",
    checkConnection: "تحقق من اتصالك وحاول مرة أخرى.",
    invitations: "الدعوات",
    invitationsFailed: "تعذّر تحميل الدعوات",
    invitedBy: (name: string) => `دعوة من ${name}`,
    acceptInviteTo: (title: string) => `قبول الدعوة إلى ${title}`,
    accepting: "جارٍ القبول…",
    signInToJoin: (name: string) =>
      `سجّل الدخول أو أنشئ حسابًا للانضمام إلى ${name}.`,
    couldNotJoin: "تعذّر الانضمام",
    joining: (name: string) => `جارٍ الانضمام إلى ${name}…`,
    joiningShort: "جارٍ الانضمام…",
    request: {
      approve: (name: string) => `الموافقة على طلب ${name}`,
      reject: (name: string) => `رفض طلب ${name}`,
      approving: "جارٍ الموافقة…",
      approveLabel: "موافقة",
      rejecting: "جارٍ الرفض…",
      rejectLabel: "رفض",
      rejectConfirm: (name: string) => `أترفض طلب ${name}؟`,
      canAskAgain: "يمكنه الطلب مرة أخرى لاحقًا.",
    },
    lookup: {
      searchUsers: "ابحث عن مستخدمين",
      searching: "جارٍ البحث…",
      noMatch: "لا يوجد مستخدمون مطابقون.",
    },
    requestSent: "أُرسل الطلب",
    football: {
      pickRole: "اختر لاعبًا أو حارسًا، والمركز الذي تفضّله.",
      chooseHowYouPlay: "اختر كيف تلعب",
      teamsSet: "محددة",
      teamsByOrganizer: "يحددها المنظّم",
    },
    seatsOpen: (n: number) =>
      plural("ar", n, {
        one: "مقعد واحد متاح.",
        two: "مقعدان متاحان.",
        few: "{n} مقاعد متاحة.",
        many: "{n} مقعدًا متاحًا.",
        other: "{n} مقعد متاح.",
      }),
    door: {
      cancelInviteFor: (name: string) => `إلغاء دعوة ${name}`,
      invite: (name: string) => `دعوة ${name}`,
      searchPlaceholder: "الاسم أو رقم الهاتف",
      searchLabel: "البحث عن لاعبين",
      phoneNumber: "رقم الهاتف",
      copyLink: "نسخ الرابط",
      shareLink: "مشاركة الرابط",
      messages: "الرسائل",
      userFallback: "مستخدم",
      description: "ادعُ لاعبين للانضمام.",
    },
  },
  you: {
    recentFormFailed: "تعذّر تحميل الأداء الأخير",
    declareDialog: {
      description: {
        padel:
          "ضع نفسك على سلّم البادل مرة واحدة. اختر فئة مستوى، أو «لا أعرف» إن لم تكن متأكدًا.",
        football:
          "ضع نفسك على سلّم كرة القدم مرة واحدة. اختر كيف تلعب؛ يوازن الفرق حتى تُصنَّف نتائج كرة القدم.",
      },
      howYouPlay: "كيف تلعب",
      levelBand: "فئة المستوى",
      saveLevel: "حفظ المستوى",
    },
    allTime: {
      matches: "مباراة",
      percentWon: (percent: number) => `${percent}% فوز`,
      longestStreak: "أطول سلسلة",
      failed: "تعذّر تحميل الإحصاءات الكاملة",
    },
    identity: {
      editPhoto: "تعديل صورة الملف الشخصي",
      addPhoto: "إضافة صورة للملف الشخصي",
    },
    level: {
      bandLevelSpoken: (band: string, level: string) =>
        `${band}، المستوى ${level}`,
      lastMatch: "آخر مباراة",
      failed: "تعذّر تحميل المستوى",
    },
  },
  settings: {
    preferredPosition: {
      title: "الجهة المفضّلة",
      description: "جهتك الافتراضية عند اختيار مقعد في لعبة",
    },
    signingOut: "جارٍ تسجيل الخروج…",
  },
  legal: {
    englishGoverns: "النص الإنجليزي هو المعتمد.",
    termsTitle: "الشروط والأحكام",
    lastUpdated: (date: string) => `آخر تحديث ${date}`,
    termsDescription: "ما توافق عليه عند إنشاء حساب أو استخدام Temba.",
    privacyTitle: "سياسة الخصوصية",
    privacyFinalising: "نعمل على إكمال هذه الصفحة. عُد قريبًا.",
  },
  errors: {
    pageFailedTitle: "تعذّر تحميل هذه الصفحة",
    pageFailedMessage: "حاول مرة أخرى، أو عُد إلى الصفحة السابقة.",
    globalMessage: "تعذّر تحميل Temba. حاول مرة أخرى بعد قليل.",
    globalTitle: "حدث خطأ ما · Temba",
  },
  notFound: {
    description: "هذه الصفحة غير موجودة أو لم تعد متاحة.",
    goToTemba: "الانتقال إلى Temba",
  },
} satisfies typeof source;
