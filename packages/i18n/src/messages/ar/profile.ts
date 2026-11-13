import type { profile as source } from "../en/profile";
import { isolate } from "../../bidi";
import { plural } from "../../plural";

export const profile = {
  wins: (n: number) =>
    plural("ar", n, {
      one: "فوز واحد",
      two: "فوزان",
      few: "{n} انتصارات",
      many: "{n} فوزًا",
      other: "{n} فوز",
    }),
  preferredPosition: {
    left: "يسار",
    right: "يمين",
    either: "أي جهة",
    line: {
      left: "يلعب على اليسار",
      right: "يلعب على اليمين",
      either: "يلعب على أي جهة",
    },
    note: {
      unset: "غير محدد. عند التسجيل مع شريك، نضعك على اليسار تلقائيًا.",
      left: "عند التسجيل مع شريك، نضعك على اليسار تلقائيًا.",
      right: "عند التسجيل مع شريك، نضعك على اليمين تلقائيًا.",
      either: "أي جهة. تفضيل شريكك هو ما يحدد.",
    },
  },
  player: {
    refusedTitle: "هذا الملف الشخصي غير متاح",
    refusedDescription: "يمكنك رؤية من تشاركهم مجموعة أو مباراة.",
    headerSubtitle: (sport: string, venue: string) =>
      `${sport}، يلعب في ${venue}`,
    overall: "الإجمالي",
    allTime: "الإجمالي",
    matches: "المباريات",
    won: "الفوز",
    winRate: "نسبة الفوز",
    setsWon: "الأشواط المكسوبة",
    goals: "الأهداف",
    winsInARow: (n: number) =>
      plural("ar", n, {
        one: "فوز واحد على التوالي",
        two: "فوزان على التوالي",
        few: "{n} انتصارات على التوالي",
        many: "{n} فوزًا على التوالي",
        other: "{n} فوز على التوالي",
      }),
    noCurrentStreak: "لا سلسلة حالية",
    noPreferenceSet: "لم يُحدد تفضيل",
    playedLeft: (percent: number) =>
      `لعب على اليسار في ${percent}% من المباريات`,
    playedRight: (percent: number) =>
      `لعب على اليمين في ${percent}% من المباريات`,
    playedBoth: (left: number, right: number) =>
      `يسار ${left}%، يمين ${right}% من المباريات`,
  },
  football: {
    startingLevel: "المستوى الابتدائي",
    startingLevelNote: "تحرّكه المباريات التي تُحتسب لمستوى Temba",
    keeper: "حارس",
    outfield: "لاعب ميدان",
    goalsScored: (n: number) =>
      plural("ar", n, {
        one: "هدف واحد",
        two: "هدفان",
        few: "{n} أهداف",
        many: "{n} هدفًا",
        other: "{n} هدف",
      }),
    scored: (goals: string) => `سجّل ${goals}`,
  },
  level: {
    movement: {
      up: "تقدّم بعد آخر مباراة",
      down: "تراجع بعد آخر مباراة",
      held: "ثابت بعد آخر مباراة",
    },
    footballStartingCaption:
      "المستوى الابتدائي. تحرّكه المباريات التي تُحتسب لمستوى Temba",
    confirmProgress: (count: number, total: number) =>
      plural("ar", total, {
        one: `${count} من مباراة واحدة لتأكيد مستواك`,
        two: `${count} من مباراتين لتأكيد مستواك`,
        few: `${count} من {n} مباريات لتأكيد مستواك`,
        many: `${count} من {n} مباراة لتأكيد مستواك`,
        other: `${count} من {n} مباراة لتأكيد مستواك`,
      }),
    topBand: "أعلى فئة مستوى",
    progressTo: (percent: number, next: string) =>
      `${percent}% نحو ${isolate(next)}`,
  },
  levelCard: {
    noLevelYet: "لا مستوى بعد",
    confirmedRated: (n: number) =>
      plural("ar", n, {
        one: "مؤكد، مباراة مصنّفة واحدة",
        two: "مؤكد، مباراتان مصنّفتان",
        few: "مؤكد، {n} مباريات مصنّفة",
        many: "مؤكد، {n} مباراة مصنّفة",
        other: "مؤكد، {n} مباراة مصنّفة",
      }),
    distanceProgress: (
      distance: string,
      next: string,
      percent: number,
      band: string,
    ) => `${distance} إلى ${next} · ${percent}% عبر ${band}`,
    spokenProvisional: (band: string, level: string, caption: string) =>
      `المستوى ${band} ${level}، مبدئي. ${caption}`,
    spokenLevel: (band: string, level: string, details: string) =>
      `المستوى ${band} ${level}. ${details}`,
  },
  matches: {
    friendlyGame: "مباراة ودية",
    friendlyTournament: "بطولة ودية",
    americano: "أمريكانو",
    tournamentRound: (name: string, round: string) => `${name}، ${round}`,
    tournamentRoundNumber: (name: string, round: number) =>
      `${name}، الجولة ${round}`,
    lastTenTrend: (delta: string) => `آخر 10: ${delta}`,
    outcome: {
      won: "فاز",
      lost: "خسر",
      draw: "تعادل",
    },
    outcomeAgainst: (outcome: string, opponents: string) =>
      `${outcome} ضد ${opponents}`,
    outcomeScore: (outcome: string, score: string) => `${outcome} ${score}`,
    versus: (opponents: string) => `ضد ${opponents}`,
    namesWithAnd: (names: string[]) => names.join(" و"),
    namesWithAmpersand: (names: string[]) => names.join(" و"),
    withPartnerAt: (partners: string, venue: string) =>
      `مع ${partners}، ${venue}`,
    dateComma: (date: string, rest: string) => `${date}، ${rest}`,
    spokenParts: (parts: string[]) => parts.join("، "),
    ratingUnchanged: "التصنيف دون تغيير",
    ratingUp: (amount: string) => `التصنيف ارتفع ${amount}`,
    ratingDown: (amount: string) => `التصنيف انخفض ${amount}`,
  },
  lastTen: {
    noGamesYet: "لا مباريات بعد.",
    record: (won: number, lost: number) => `${won} فوز، ${lost} خسارة`,
    recordWithDrawn: (won: number, lost: number, drawn: number) =>
      `${won} فوز، ${lost} خسارة، ${drawn} تعادل`,
    latest: "الأحدث",
    seeAllGames: (n: number) =>
      plural("ar", n, {
        one: "عرض المباراة الوحيدة",
        two: "عرض المباراتين",
        few: "عرض المباريات الـ{n} كلها",
        many: "عرض المباريات الـ{n} كلها",
        other: "عرض المباريات الـ{n} كلها",
      }),
    filterEmpty: "لا مباريات هنا.",
    chipAll: (n: number) => `الكل ${n}`,
    chipWon: (n: number) => `فوز ${n}`,
    chipLost: (n: number) => `خسارة ${n}`,
  },
  matchSheet: {
    openGame: "فتح المباراة",
    playerLevel: (name: string, level: string) => `${name}، المستوى ${level}`,
    playerProvisional: (name: string) => `${name}، المستوى ما زال مبدئيًا`,
    ratingOf: (name: string) => `تصنيف ${name}`,
    ratingSpoken: (
      label: string,
      before: string,
      after: string,
      delta: string,
    ) => `${label}، من ${before} إلى ${after}، ${delta}`,
  },
  playerPage: {
    subtitlePositionVenue: (position: string, venue: string) =>
      `${position}، يلعب في ${venue}`,
    subtitleVenue: (venue: string) => `يلعب في ${venue}`,
    subtitleSportPosition: (sport: string, position: string) =>
      `${sport}، ${position}`,
    subtitleSportPositionVenue: (
      sport: string,
      position: string,
      venue: string,
    ) => `${sport}، ${position}. يلعب في ${venue}`,
    subtitleSportVenue: (sport: string, venue: string) =>
      `${sport}. يلعب في ${venue}`,
    games: (n: number) =>
      plural("ar", n, {
        zero: "لا مباريات",
        one: "مباراة واحدة",
        two: "مباراتان",
        few: "{n} مباريات",
        many: "{n} مباراة",
        other: "{n} مباراة",
      }),
    level: "المستوى",
    sportLevel: (sport: string) => `مستوى ${sport}`,
    confirmed: "مؤكّد",
    provisional: "مؤقت",
    startingLevel: "مستوى البداية",
    setAtSignUp: "حُدّد عند التسجيل",
    ratedMatches: (n: number) =>
      plural("ar", n, {
        zero: "لا مباريات مصنّفة",
        one: "مباراة مصنّفة واحدة",
        two: "مباراتان مصنّفتان",
        few: "{n} مباريات مصنّفة",
        many: "{n} مباراة مصنّفة",
        other: "{n} مباراة مصنّفة",
      }),
    toNext: (distance: string, band: string) =>
      `${isolate(distance)} إلى ${isolate(band)}`,
    ofTheWay: (percent: number) => `${percent}% من الطريق`,
    trendSince: (delta: string, month: string) => `${delta} منذ ${month}`,
    notMovingYet: "لا يتغيّر بالمباريات بعد",
    noLevelYet: "لا مستوى بعد",
    gamesSoFar: (n: number) =>
      plural("ar", n, {
        zero: "لا مباريات حتى الآن",
        one: "مباراة واحدة حتى الآن",
        two: "مباراتان حتى الآن",
        few: "{n} مباريات حتى الآن",
        many: "{n} مباراة حتى الآن",
        other: "{n} مباراة حتى الآن",
      }),
    noGamesYet: "لا مباريات بعد",
    since: (date: string) => `منذ ${date}`,
    earlyNote: (n: number) =>
      `تظهر السلاسل ونسبة الفوز والزملاء بعد ${n} مباريات.`,
    earlyNotePadel: (n: number) =>
      `تظهر السلاسل ونسبة الفوز والشركاء بعد ${n} مباريات.`,
    currentStreak: "السلسلة الحالية",
    bestStreak: "أفضل سلسلة",
    winsUnit: (n: number) =>
      plural("ar", n, {
        zero: "انتصارات",
        one: "انتصار",
        two: "انتصاران",
        few: "انتصارات",
        many: "انتصارًا",
        other: "انتصار",
      }),
    streakSpoken: (label: string, n: number, unit: string) =>
      `${label}، ${n} ${unit}`,
    preferredPosition: "المركز المفضّل",
    preferredSide: "الجهة المفضّلة",
    won: "الفوز",
    wonDrawnLost: "فوز، تعادل، خسارة",
    goal: "هدف",
    goalsPerGame: "هدف لكل مباراة",
    afterGames: (n: number) => `بعد ${n} مباريات`,
    youAnd: (name: string) => `أنت و${name}`,
    allTime: "منذ البداية",
    asTeammates: "كزملاء",
    asPartners: "كشريكين",
    against: "في المواجهة",
    againstEachOther: "ضد بعضكما",
    inGames: (n: number) =>
      plural("ar", n, {
        zero: "في لا مباريات",
        one: "في مباراة واحدة",
        two: "في مباراتين",
        few: "في {n} مباريات",
        many: "في {n} مباراة",
        other: "في {n} مباراة",
      }),
    toYou: "لصالحك",
    toThem: (name: string) => `لصالح ${name}`,
    allSquare: "متعادلان",
    noGamesTogether: "لا مباريات معًا بعد.",
    bothIn: (group: string) => `كلاكما في ${group}`,
    bothInTwo: (first: string, second: string) =>
      `كلاكما في ${first} و${second}`,
    bothInMore: (first: string, more: number) =>
      plural("ar", more, {
        one: `كلاكما في ${first} ومجموعة أخرى`,
        two: `كلاكما في ${first} ومجموعتين أخريين`,
        few: `كلاكما في ${first} و{n} مجموعات أخرى`,
        many: `كلاكما في ${first} و{n} مجموعة أخرى`,
        other: `كلاكما في ${first} و{n} مجموعة أخرى`,
      }),
    teammates: "زملاء الفريق",
    partners: "الشركاء",
    mostPlayed: "الأكثر لعبًا",
    lastTen: "آخر 10 مباريات",
    gamesTitle: "المباريات",
    played: (n: number) =>
      plural("ar", n, {
        zero: "لا مباريات",
        one: "مباراة واحدة",
        two: "مباراتان",
        few: "{n} مباريات",
        many: "{n} مباراة",
        other: "{n} مباراة",
      }),
    recordSpoken: (title: string, record: string) => `${title}، ${record}`,
    dateWithPartner: (date: string, partners: string) =>
      `${date}، مع ${partners}`,
  },
  allTime: {
    playingSince: (year: number) => `يلعب البادل منذ ${year}`,
    since: (year: number) => `منذ ${year}`,
    goals: "الأهداف",
    sets: "الأشواط",
    mostPlayedTeammate: "الزميل الأكثر لعبًا معه",
    mostPlayedPartner: "الشريك الأكثر لعبًا معه",
    record: (won: number, lost: number) => `${won} فوز، ${lost} خسارة`,
  },
  checklist: {
    tasks: {
      name: {
        title: "أضف اسمك",
        description: "يظهر للمنظّمين ولمن تلعب معهم.",
        time: "30 ثانية",
      },
      photo: {
        title: "أضف صورة للملف الشخصي",
        description: "ليتعرّف عليك المنظّمون في الملعب.",
        time: "دقيقة واحدة",
      },
      email: {
        title: "أضف بريدك الإلكتروني وتحقق منه",
        description: "للإيصالات، وطريقة للعودة إن غيّرت رقمك.",
        time: "دقيقة واحدة",
      },
      sports: {
        title: "اختر رياضاتك ومستواك",
        description: "يفتح لك المباريات المناسبة والتصنيف.",
        time: "دقيقتان",
      },
    },
    countOf: (done: number, total: number) => `${done} من ${total}`,
    allDone:
      "اكتمل كل شيء. يرى المنظّمون ملفًا كاملًا وتُطابَق مبارياتك مع مستواك.",
    shortTasks: (n: number) =>
      plural("ar", n, {
        one: "مهمة قصيرة واحدة بأي ترتيب. كل واحدة تفتح لك شيئًا.",
        two: "مهمتان قصيرتان بأي ترتيب. كل واحدة تفتح لك شيئًا.",
        few: "{n} مهام قصيرة بأي ترتيب. كل واحدة تفتح لك شيئًا.",
        many: "{n} مهمة قصيرة بأي ترتيب. كل واحدة تفتح لك شيئًا.",
        other: "{n} مهمة قصيرة بأي ترتيب. كل واحدة تفتح لك شيئًا.",
      }),
    tasksLeft: (n: number) =>
      plural("ar", n, {
        one: "بقيت مهمة واحدة. بأي ترتيب، كل واحدة تُحفظ وحدها.",
        two: "بقيت مهمتان. بأي ترتيب، كل واحدة تُحفظ وحدها.",
        few: "بقيت {n} مهام. بأي ترتيب، كل واحدة تُحفظ وحدها.",
        many: "بقيت {n} مهمة. بأي ترتيب، كل واحدة تُحفظ وحدها.",
        other: "بقيت {n} مهمة. بأي ترتيب، كل واحدة تُحفظ وحدها.",
      }),
    findGames: "ابحث عن مباريات",
    continueToGames: "تابع إلى المباريات",
    moreTasks: (n: number) =>
      plural("ar", n, {
        one: "مهمة أخرى",
        two: "مهمتان أخريان",
        few: "{n} مهام أخرى",
        many: "{n} مهمة أخرى",
        other: "{n} مهمة أخرى",
      }),
    allTasks: "كل المهام",
    youAreIn: (firstName: string) => `لقد انضممت يا ${firstName}.`,
    youAreInPlain: "لقد انضممت.",
  },
  chrome: {
    settingsPending: (n: number) =>
      plural("ar", n, {
        one: "الإعدادات، دعوة واحدة معلّقة",
        two: "الإعدادات، دعوتان معلّقتان",
        few: "الإعدادات، {n} دعوات معلّقة",
        many: "الإعدادات، {n} دعوة معلّقة",
        other: "الإعدادات، {n} دعوة معلّقة",
      }),
  },
  errors: {
    userNotFound: "المستخدم غير موجود",
    playerNotFound: "اللاعب غير موجود",
    enterYourName: "أدخل اسمك",
    enterTheirName: "أدخل اسمه",
    choosePosition: "اختر مركزك المفضّل أولًا",
    declareLevel: "حدّد مستواك أولًا",
    chooseFootballLineup: "اختر أولًا كيف تصطف في كرة القدم",
    declareFootballLevel: "حدّد مستواك في كرة القدم أولًا",
    renameNotAllowed:
      "لا يعدّل اسمه إلا منظّم أو من يوافق على الأعضاء في المجموعة التي أُضيف إليها",
    onlyUnclaimedRenamable: "لا يُعدَّل إلا اسم اللاعب الذي ليس على Temba بعد",
    unknownCountry: "اختر رمز دولة مدعومًا",
    malformedPhone: "أدخل رقم الهاتف كاملًا",
  },
} satisfies typeof source;
