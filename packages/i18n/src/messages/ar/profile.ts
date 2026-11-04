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
    startingLevelNote: "مباريات كرة القدم لا تحرّكه بعد",
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
      "المستوى الابتدائي. مباريات كرة القدم لا تحرّكه بعد",
    confirmProgress: (count: number, total: number) =>
      plural("ar", total, {
        one: `${count} من مباراة مصنّفة واحدة لتأكيد مستواك`,
        two: `${count} من مباراتين مصنّفتين لتأكيد مستواك`,
        few: `${count} من {n} مباريات مصنّفة لتأكيد مستواك`,
        many: `${count} من {n} مباراة مصنّفة لتأكيد مستواك`,
        other: `${count} من {n} مباراة مصنّفة لتأكيد مستواك`,
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
} satisfies typeof source;
