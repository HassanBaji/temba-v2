import { isolate } from "../../bidi";
import { plural } from "../../plural";
import type { createGame as source } from "../en/create-game";

export const createGame = {
  court: {
    count: (n: number) =>
      plural("ar", n, {
        one: "ملعب واحد",
        two: "ملعبان",
        few: "{n} ملاعب",
        many: "{n} ملعبًا",
        other: "{n} ملعب",
      }),
    pitchCount: (n: number) =>
      plural("ar", n, {
        one: "ملعب واحد",
        two: "ملعبان",
        few: "{n} ملاعب",
        many: "{n} ملعبًا",
        other: "{n} ملعب",
      }),
    venueCount: (n: number) =>
      plural("ar", n, {
        one: "ملعب واحد",
        two: "ملعبان",
        few: "{n} ملاعب",
        many: "{n} ملعبًا",
        other: "{n} ملعب",
      }),
  },
  typeCards: {
    countsNote: "ودية، لكنها تُحتسب في مستواك.",
    friendlyGame: {
      title: "مباراة ودية",
      description: "مباراة واحدة، ويساعدك Temba في ملء الأماكن الشاغرة.",
      rating: "تُحتسب في مستواك",
    },
    friendlyTournament: {
      title: "بطولة ودية",
      description: "عدة فرق تتنافس في يوم واحد.",
      rating: "تُحتسب في مستواك",
    },
  },
  steps: {
    where: "المكان",
    when: "الوقت",
    levelAndPrice: "المستوى والسعر",
    whereAndSize: "المكان والحجم",
    formatAndDay: "النظام واليوم",
    entryAndReview: "الاشتراك والمراجعة",
    sizeAndPrice: "الحجم والسعر",
  },
  openSeats: "4 أماكن شاغرة",
  tournamentFormat: "النظام",
  knockout: "خروج المغلوب",
  knockoutOnly: "خروج المغلوب فقط",
  groupsThenKnockout: "مجموعات، ثم خروج المغلوب",
  shapes: {
    groupsOnly: {
      title: "مجموعات فقط",
      description: "يلعب الجميع العدد نفسه من المباريات",
    },
    knockoutOnly: {
      title: "خروج المغلوب فقط",
      description: "اخسر مرة واحدة وينتهي يومك",
    },
    groupsThenKnockout: {
      title: "مجموعات، ثم خروج المغلوب",
      description: "الأفضل في كل مجموعة يواصلون",
    },
  },
  unevenGroups: "المجموعات غير متساوية. بعض الفرق تلعب مباراة إضافية.",
  matchMinutes: "يجب أن تكون مدة المباراة من 10 إلى 120 دقيقة، بخطوات من 5",
  validation: {
    pickGroup: "اختر مجموعة",
    pickVenue: "اختر ناديًا",
    pickDay: "اختر يومًا",
    pickStartTime: "اختر وقت البداية",
    pickFinishTime: "اختر وقت النهاية",
    finishAfterStart: "يجب أن يكون وقت النهاية عند وقت البداية أو بعده",
    nameTournament: "سمِّ البطولة",
    pickSideSize: "اختر حجم الفريق",
    playersAllowedBetween: (min: number, max: number) =>
      `يجب أن يكون عدد اللاعبين المسموح به بين ${min} و${max}`,
    pickGroupsCount: "اختر عدد المجموعات",
  },
  venue: {
    courtsOptional: "الملاعب اختيارية.",
    pitchOptional: "الملعب اختياري.",
    courtOptional: "الملعب اختياري.",
    skipCourts: "تخطَّ الملاعب.",
    skipPitch: "تخطَّ الملعب.",
    skipCourt: "تخطَّ الملعب.",
    lockedArchived: (skip: string) =>
      `النادي المرتبط بهذه المجموعة مؤرشف. ما زال بإمكانك إنشاء هذه المباراة هنا. ${skip}`,
    lockedLinked: (optional: string) =>
      `النادي هو النادي المرتبط بهذه المجموعة ولا يمكن تغييره. ${optional}`,
    pick: (optional: string) => `اختر ناديًا. ${optional}`,
    cardMeta: (courts: string, city: string) => `${courts} · ${city}`,
  },
  price: {
    currency: "د.ب",
    fieldDescription:
      "اتركه فارغًا إن لم يُحدَّد بعد. الدفع بينكم مباشرة، وTemba لا يحصّل أي مبالغ.",
    negative: "لا يمكن أن يكون السعر للاعب سالبًا",
    tooManyDecimals: "استخدم حتى ثلاث خانات عشرية",
    invalid: "أدخل مبلغًا صحيحًا",
    tooLarge: "السعر للاعب كبير جدًا",
    free: "مجانًا",
    amount: (major: string) => `${major} د.ب`,
    perPlayer: (amount: string) => `${amount} / لاعب`,
    teamOfTwo: (amount: string) => `${amount} لفريق من لاعبَين`,
  },
  mvp: {
    title: "نجم المباراة",
    decidedAfterGame: "يُحدَّد بعد المباراة",
    marks: "الأوسمة",
    lockedNote: "النتيجة مؤكَّدة، لذا لا يمكن تغيير طريقة اختيار نجم المباراة.",
  },
  tournament: {
    defaultName: (day: string) => `بطولة ودية · ${day}`,
    defaultNameNoDay: "بطولة ودية",
    groups: (n: number) =>
      plural("ar", n, {
        one: "مجموعة واحدة",
        two: "مجموعتان",
        few: "{n} مجموعات",
        many: "{n} مجموعة",
        other: "{n} مجموعة",
      }),
    groupsThenKnockout: (groups: string) => `${groups}، ثم خروج المغلوب`,
    knockoutMatches: (n: number) =>
      plural("ar", n, {
        one: "مباراة خروج مغلوب واحدة",
        two: "مباراتا خروج مغلوب",
        few: "{n} مباريات خروج مغلوب",
        many: "{n} مباراة خروج مغلوب",
        other: "{n} مباراة خروج مغلوب",
      }),
    groupMatches: (n: number) =>
      plural("ar", n, {
        one: "مباراة مجموعات واحدة",
        two: "مباراتا مجموعات",
        few: "{n} مباريات مجموعات",
        many: "{n} مباراة مجموعات",
        other: "{n} مباراة مجموعات",
      }),
    scheduleLine: (matches: string, clock: string) =>
      `${matches}، تنتهي آخر مباراة في ${clock}`,
    scheduleLineBoth: (pool: string, knockout: string, clock: string) =>
      `${pool} و${knockout}، تنتهي آخر مباراة في ${clock}`,
  },
  format: {
    friendlyGame: "مباراة ودية",
    americano: "أمريكانو",
    friendlyTournament: "بطولة ودية",
  },
  side: {
    letter: (n: number): string | undefined =>
      [..."أبجد", "هـ", ..."وزحطيكلمنسعفصقرشتثخذضظغ"][n - 1],
    team: (label: string) => `الفريق ${label}`,
    gameTeam: "فريق المباراة",
  },
  share: {
    open: "شاغر",
    team: (n: number) => `👕 الفريق ${n}`,
    left: (name: string) => `- يسار: ${name}`,
    right: (name: string) => `- يمين: ${name}`,
    join: "🔗 انضم:",
    players: "👕 اللاعبون",
    keepers: "🧤 حراس المرمى",
    level: (range: string) => `📊 المستوى: ${range}`,
    waitlist: "⏳ قائمة الانتظار",
  },
  openGraph: {
    genericTitle: "Temba - مستقبل الرياضات التنافسية",
    genericDescription: "Temba - مستقبل الرياضة التنافسية",
    dayTimeSitting: (day: string, timeWindow: string, occupied: number) =>
      `${day}، ${timeWindow}، ${occupied}/4 جالسون`,
    dayTime: (day: string, timeWindow: string) => `${day}، ${timeWindow}`,
    withLevelRange: (description: string, range: string) =>
      `${description}، ${range}`,
    atVenue: (venue: string, details: string) =>
      `${isolate(venue)} · ${details}`,
  },
  image: {
    help: "اختياري. JPEG أو PNG أو WebP، بحد أقصى 2 ميغابايت.",
    groupCreatedWithoutImage: "أُنشئت المجموعة بدون صورة",
    imageType: "يجب أن تكون الصورة بصيغة JPEG أو PNG أو WebP",
    imageTooLarge: "يجب ألا يتجاوز حجم الصورة 2 ميغابايت",
    logoType: "يجب أن يكون الشعار بصيغة JPEG أو PNG أو WebP",
    logoTooLarge: "يجب ألا يتجاوز حجم الشعار 2 ميغابايت",
  },
  rosterNoSeats: "هذه المباراة بلا أماكن؛ سجّل باسمك",
  sideSize: (n: number) => `${n} ضد ${n}`,
  edit: {
    title: "تعديل المباراة",
    saveChanges: "حفظ التغييرات",
    changes: "التغييرات",
    noChanges: "لا شيء بعد",
    changesSaved: "تم حفظ التغييرات",
    nameHint:
      "يظهر على المباراة وفي أعلى الدعوة. الفراغ يعني استخدام اليوم والوقت.",
    whenHint:
      "اليوم أو لاحقًا، بخطوات من 30 دقيقة. لليوم تُعرض الأوقات القادمة فقط.",
    playersAndPriceHint:
      "خفض عدد اللاعبين دون عدد المنضمين ينقل آخر المنضمين إلى قائمة الانتظار ويُبلغهم. يستعيدون مكانهم إن غادر أحد. تغييرات السعر تسري على من ينضم من الآن.",
    everyoneKeepsSpot: "كل من انضم يحتفظ بمكانه.",
    venueLocked: (place: string) => `${place}. لا يمكن تغيير النادي.`,
    venueLockedNoPlace: "لا يمكن تغيير النادي.",
    place: {
      title: "المكان",
      venue: "النادي",
      venueHint: "تغيير النادي يلغي اختيار الملعب. اختر ملعبًا هناك.",
      clubVenue: "مجموعة النادي هذه تلعب في ناديها.",
    },
    court: {
      title: "الملعب",
      none: "بلا ملعب",
      loading: "جارٍ تحميل الملاعب…",
      hint: "ملاعب هذا النادي فقط.",
    },
    pitch: {
      title: "الملعب",
      none: "بلا ملعب",
      loading: "جارٍ تحميل الملاعب…",
      hint: "ملاعب هذا النادي فقط.",
    },
    windowIncomplete: "اختر يومًا ووقت بداية ووقت نهاية",
    change: {
      name: "الاسم",
      dayMoved: "تغيّر اليوم",
      timeChanged: "تغيّر الوقت",
      venue: "تغيّر النادي",
      court: "تغيّر الملعب",
      pitch: "تغيّر الملعب",
      players: "اللاعبون",
      aside: "حجم الفريق",
      price: "السعر",
      levelRange: "نطاق المستوى",
      rounds: "الجولات",
      seasonUnlinked: "أُلغي ربط الموسم",
      seasonLinked: "رُبط الموسم",
      seasonChanged: "تغيّر الموسم",
      mvp: "نجم المباراة",
    },
    listSeparator: "، ",
    seasonNeedsFix: "الموسم يحتاج إلى تصحيح.",
    withSeasonFix: (sentence: string) => `${sentence}. الموسم يحتاج إلى تصحيح.`,
    joined: (n: number) =>
      plural("ar", n, {
        one: "منضم واحد",
        two: "منضمان",
        few: "{n} منضمين",
        many: "{n} منضمًا",
        other: "{n} منضم",
      }),
    footballNote: (side: string, onPitch: number) =>
      `${side}، ${onPitch} في الملعب`,
    footballNoteWithSubs: (side: string, onPitch: number, subs: number) =>
      plural("ar", subs, {
        one: `${side}، ${onPitch} في الملعب، احتياط واحد`,
        two: `${side}، ${onPitch} في الملعب، لاعبا احتياط`,
        few: `${side}، ${onPitch} في الملعب، {n} لاعبين احتياط`,
        many: `${side}، ${onPitch} في الملعب، {n} لاعبًا احتياطًا`,
        other: `${side}، ${onPitch} في الملعب، {n} لاعب احتياط`,
      }),
    capWait: (moving: number, joined: number) =>
      `${moving} من المنضمين الـ${joined} ينتقلون إلى قائمة الانتظار، آخر المنضمين أولًا.`,
  },
  season: {
    none: "بلا موسم",
    friendly: "ودية",
    noneNote: "لن تُحتسب النتيجة في أي ترتيب.",
    linkRowTitle: "ربط بموسم",
    sectionFriendlyNote:
      "بدون موسم تكون المباراة ودية. تظل تحدّث المستويات، لكن ليس الترتيب.",
    pickerLockNote:
      "لا تُحتسب في الترتيب إلا النتيجة النهائية المؤكدة. يمكنك إلغاء الربط حتى تأكيد النتيجة.",
    countsLine: "تُحتسب في الترتيب",
    needsFixTag: "يحتاج إلى تصحيح",
    lockedNote: "النتيجة مؤكدة، لذا لا يمكن تغيير الموسم.",
    keepFriendly: "إبقاؤها ودية",
    unlink: "إلغاء ربط الموسم",
    change: "تغيير",
    badge: {
      upcoming: "قادم",
      active: "نشط",
      closed: "مغلق",
    },
    closedAndLocked: "مغلق ومقفل.",
    fallsInside: (day: string) => `${day} يقع ضمن هذه الفترة.`,
    startsAfter: "يبدأ بعد يوم المباراة.",
    endedBefore: "انتهى قبل يوم المباراة.",
    rowNote: (groupName: string, openCount: number, day: string) =>
      openCount === 0
        ? `لا يوجد موسم مفتوح لدى ${groupName} في ${day}.`
        : plural("ar", openCount, {
            one: `لدى ${groupName} موسم واحد مفتوح في ${day}.`,
            two: `لدى ${groupName} موسمان مفتوحان في ${day}.`,
            few: `لدى ${groupName} {n} مواسم مفتوحة في ${day}.`,
            many: `لدى ${groupName} {n} موسمًا مفتوحًا في ${day}.`,
            other: `لدى ${groupName} {n} موسم مفتوح في ${day}.`,
          }),
    pickerSubtitle: (groupName: string, day: string) =>
      `${groupName}. يوم المباراة، ${day}، يحدد المواسم المناسبة.`,
    link: (name: string) => `ربط ${name}`,
    linkedNote: (name: string) =>
      `يرى اللاعبون «${name}» على المباراة وفي الدعوة. ألغِ الربط في أي وقت قبل تأكيد النتيجة.`,
    starts: (edge: string) => `يبدأ ${edge}`,
    ends: (edge: string) => `ينتهي ${edge}`,
    outsideCovered: (day: string, linked: string, replacement: string) =>
      `${day} خارج ${linked}. ${replacement} يغطي ذلك اليوم.`,
    outsideNone: (day: string, linked: string) =>
      `${day} خارج ${linked}. لا يغطي أي موسم ذلك اليوم.`,
    keepForward: (edge: string, linked: string) =>
      `أو قدّم اليوم إلى ${edge} أو بعده لإبقاء ${linked}.`,
    keepBack: (edge: string, linked: string) =>
      `أو أرجع اليوم إلى ${edge} أو قبله لإبقاء ${linked}.`,
    moveTo: (name: string) => `الانتقال إلى ${name}`,
    notInGroup: "اختر موسمًا من مجموعة هذه المباراة",
    closed: "ذلك الموسم مغلق",
    scoreConfirmed: "النتيجة مؤكدة، لذا لا يمكن تغيير الموسم",
    noGroup: "مباراة المجموعة وحدها يمكن ربطها بموسم",
    outsideDay: (day: string, name: string) => `${day} خارج ${name}`,
  },
} satisfies typeof source;
