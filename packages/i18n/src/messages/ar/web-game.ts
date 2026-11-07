import { isolate } from "../../bidi";
import { plural } from "../../plural";
import type { webGame as source } from "../en/web-game";

export const webGame = {
  addPlayer: {
    playsAs: "الدور",
    preferredPosition: "المركز المفضّل",
    side: "الجهة",
    position: "الموضع",
    adding: "جارٍ الإضافة…",
    phone: "رقم الهاتف",
    lookingUp: "جارٍ البحث…",
    startingLevel: "المستوى الابتدائي",
  },
  hero: {
    timeUnset: "الوقت غير محدد",
    youAnd: (name: string) => `أنت و${isolate(name)}`,
  },
  fallbackTitle: "مباراة",
  directions: "الاتجاهات",
  directionsTo: (venue: string) => `الاتجاهات إلى ${venue}`,
  overflow: {
    gameActions: "إجراءات المباراة",
  },
  joinSheet: {
    seatName: (side: string, position: string) => `${side} ${position}`,
    seatTakenBy: (seat: string, name: string) => `${seat}، يشغله ${name}`,
    takeSeat: (seat: string) => `خذ ${seat}`,
    versus: "ضد",
    teams: "الفرق",
    allTeams: "كل الفرق",
    joinSeatButton: (side: string, position: string) =>
      `انضم إلى ${side}، المكان ${position}`,
    registeredToast: "تم التسجيل",
    seatJoinFailed: "تعذّر أخذ هذا المكان. حاول مجددًا.",
  },
  partnerPicker: {
    playedWithBefore: "لعبت معهم من قبل",
    loadingSuggestions: "جارٍ تحميل اقتراحات الشركاء",
    suggestionsError: "تعذّر تحميل الاقتراحات",
    searchPlaceholder: "ابحث عن مستخدمين",
    fromYourGroups: "من مجموعاتك",
  },
  partnerReview: {
    stepTwoOfTwo: "الخطوة 2 من 2",
    seatSides: "جهات الأماكن",
  },
  registering: "جارٍ التسجيل…",
  seatBlocks: {
    actionsFor: (name: string) => `إجراءات لـ ${name}`,
    open: "شاغر",
    vacant: "شاغر",
  },
  booked: "محجوز",
  detailTiles: {
    date: "التاريخ",
    time: "الوقت",
    levelRange: "نطاق المستوى",
  },
  loadingGame: "جارٍ تحميل المباراة",
  header: {
    onGroup: "في مجموعة",
    pickupGame: "مباراة مفتوحة",
    public: "عامة",
  },
  levelRange: {
    requestApproved: "تمت الموافقة على الطلب",
    requestRejected: "تم رفض الطلب",
    requesting: "جارٍ الطلب…",
    sectionTitle: "طلبات نطاق المستوى",
    sectionDescription:
      "الموافقة تمنح إعفاءً دون إجلاسهم. الرفض يتيح لهم الطلب مجددًا.",
    noPending: "لا طلبات معلّقة لنطاق المستوى.",
  },
  occupancy: {
    teamsToGo: (n: number) =>
      plural("ar", n, {
        one: "بقي فريق واحد",
        two: "بقي فريقان",
        few: "بقي {n} فرق",
        many: "بقي {n} فريقًا",
        other: "بقي {n} فريق",
      }),
    teams: "الفرق",
    onWaitlist: (n: number) =>
      plural("ar", n, {
        one: "1 في قائمة الانتظار",
        two: "2 في قائمة الانتظار",
        few: "{n} في قائمة الانتظار",
        many: "{n} في قائمة الانتظار",
        other: "{n} في قائمة الانتظار",
      }),
  },
  overview: {
    rounds: "الجولات",
    roundUnit: (n: number) =>
      plural("ar", n, {
        one: "جولة",
        two: "جولتان",
        few: "جولات",
        many: "جولة",
        other: "جولة",
      }),
  },
  lineup: {
    title: "التشكيلة",
    seatLabel: (name: string, subline: string) => `${name}، ${subline}`,
    renameFor: (action: string, name: string) => `${action}: ${name}`,
    kickName: (name: string) => `أخرِج ${name}`,
  },
  players: {
    pickVacantPosition: "اختر موضعًا شاغرًا لتجلس فيه.",
    notSeatedYet: "لم يجلس بعد",
    nobodyRegistered: "لم يسجّل أحد بعد",
    waitlist: "قائمة الانتظار",
    waitlistEmpty: "قائمة الانتظار فارغة",
    waitlistEntry: (place: number, name: string) => `${place}. ${name}`,
    joinTheWaitlist: "انضم إلى قائمة الانتظار",
    gameFullPromote: "المباراة ممتلئة. تنتقل إلى أول موضع يصبح شاغرًا.",
    pickCompleteTeam: "اختر فريقًا مكتملًا",
    registerATeam: "سجّل فريقًا",
    needCompleteTeam:
      "تحتاج إلى فريق مكتمل يُسمح لكلا الشريكين فيه باللعب في هذه المباراة.",
    team: "الفريق",
    selectATeam: "اختر فريقًا",
    teamOption: (name: string, members: string) => `${name} (${members})`,
    noVacantSidePickSeat: "لا توجد جهة شاغرة بالكامل؛ اختر مكانًا",
    pickVacantSideAndPosition: "اختر جهة شاغرة وموضعك",
    joinWaitlistWithPartner: "انضم إلى قائمة الانتظار مع شريك",
    registerWithPartner: "سجّل مع شريك",
    waitlistWithPartnerCopy:
      "المباراة ممتلئة. تنضمان معًا إلى قائمة الانتظار وينتقل كلٌّ منكما على حدة.",
    noVacantSideCopy:
      "لا توجد جهة شاغرة بالكامل. اختر موضعًا شاغرًا بدلًا من ذلك.",
    takeVacantSideCopy:
      "خذ جهة شاغرة بالكامل. اختر اليسار أو اليمين، ويأخذ شريكك الموضع الآخر.",
    vacantSide: "جهة شاغرة",
    yourPosition: "موضعك",
    partner: "الشريك",
  },
  ratingImpact: {
    title: "أثر التصنيف",
    change: "التغيير",
    newLevel: "المستوى الجديد",
  },
  seatGrid: {
    moving: "جارٍ النقل…",
    moveHere: "انتقل إلى هنا",
  },
  venueCard: {
    venue: "النادي",
    cityCountry: (city: string, country: string) => `${city}، ${country}`,
    softArchived: "مؤرشف",
  },
  venueSelect: {
    placeholder: "اختر ناديًا",
    noLiveVenues: "لا توجد أندية متاحة.",
    noMatch: "لا توجد أندية مطابقة.",
  },
  window: {
    pickATime: "اختر وقتًا",
    day: "اليوم",
    pickADate: "اختر تاريخًا",
    startTime: "وقت البدء",
    finishTime: "وقت الانتهاء",
    descriptionWithFinish:
      "اليوم ووقت البدء ووقت الانتهاء مطلوبة. اختر اليوم أو يومًا لاحقًا. الأوقات بفواصل 30 دقيقة ويمكن أن تمتد اللعبة إلى ما بعد منتصف الليل، ولليوم تظهر الأوقات القادمة فقط.",
    descriptionStartOnly:
      "اليوم ووقت البدء مطلوبان. اختر اليوم أو يومًا لاحقًا. الأوقات بفواصل 30 دقيقة، ولليوم تظهر الأوقات القادمة فقط.",
  },
  hubEmpty: {
    nextGame: "المباراة التالية",
    notScheduled: "غير مجدولة",
    createGame: "أنشئ مباراة",
    findAGroup: "ابحث عن مجموعة",
    recentForm: "الأداء الأخير",
    noResultsYet: "لا نتائج بعد",
  },
  history: {
    linkLabel: (outcome: string, score: string, meta: string) =>
      `${outcome}، ${score}، ${meta}`,
  },
  played: {
    notOnATeam: "خارج الفرق",
    scoreLabel: (
      aName: string,
      aScore: number,
      bName: string,
      bScore: number,
    ) => `${aName} ${aScore}، ${bName} ${bScore}`,
    confirmed: "مؤكَّدة",
    pairRowLabel: (line: string, word: string, sets: string) =>
      `${line}، ${word}. الأشواط ${sets}`,
    viewProfile: "عرض الملف الشخصي",
  },
  roundCount: {
    fewer: "جولات أقل",
    more: "جولات أكثر",
  },
  edit: {
    stepLabel: {
      name: "الاسم",
      window: "الموعد",
      caps: "اللاعبون",
      price: "السعر",
      level: "نطاق المستوى",
      rounds: "الجولات",
      season: "الموسم",
      mvp: "نجم المباراة",
    },
    stepFailed: (step: string, message: string) => `${step}: ${message}`,
    movedToWaitlist: (n: number) =>
      plural("ar", n, {
        one: "انتقل لاعب واحد إلى قائمة الانتظار",
        two: "انتقل لاعبان إلى قائمة الانتظار",
        few: "انتقل {n} لاعبين إلى قائمة الانتظار",
        many: "انتقل {n} لاعبًا إلى قائمة الانتظار",
        other: "انتقل {n} لاعب إلى قائمة الانتظار",
      }),
    thisGroup: "هذه المجموعة",
    pickDayFirst: "اختر يومًا أولًا.",
    playersAndPrice: "اللاعبون والسعر",
    fewerPlayers: "لاعبون أقل",
    morePlayers: "لاعبون أكثر",
    aside: "حجم الفريق",
    smallerSide: "فريق أصغر",
    biggerSide: "فريق أكبر",
    pricePerPlayer: "السعر لكل لاعب",
    priceHint: "تسري تغييرات السعر على من ينضم من الآن فصاعدًا.",
    minimumLevel: "الحد الأدنى للمستوى",
    maximumLevel: "الحد الأقصى للمستوى",
  },
  results: {
    clockRange: (start: string, end: string) => `${start} – ${end}`,
    match: "مباراة",
    leads: (team: string) => `${team} متقدّم`,
    noResultYet: "لا نتيجة بعد",
    noMatchResults: "لا نتائج مباريات",
    americanoNoMatches: "بطولات الأمريكانو لا تتضمن مباريات.",
    noSetsYet: "لا أشواط بعد.",
    teams: "الفرق",
    scoreSets: "سجّل نتائج الأشواط",
    slotGames: (slot: string) => `مباريات ${slot}`,
    scoringOpens: "يبدأ إدخال النتيجة عند اكتمال الفريقين.",
    court: "الملعب",
    noCourt: "بلا ملعب",
    courtOption: (venue: string, court: string) => `${venue}: ${court}`,
    slotEmpty: (slot: string) => `${slot} فارغ`,
  },
  score: {
    title: "النتيجة",
    confirmations: "التأكيدات",
    confirmScore: "أكّد النتيجة",
    confirmResult: "أكّد الحصيلة",
    boxLabel: (side: string, set: string) => `${side}، ${set}`,
    saveScore: "احفظ النتيجة",
  },
  summary: {
    joinPosition: (position: string) => `انضم (${position})`,
    untitledGame: "مباراة بلا اسم",
    linkLabel: (title: string, day: string, time: string, meridiem: string) =>
      `${title}، ${day} ${time} ${meridiem}`,
    occupancyPlayers: (occupancy: string) => `${occupancy} لاعب`,
    perPlayer: "لكل لاعب",
  },
} satisfies typeof source;
