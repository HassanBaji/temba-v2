import type { home as source } from "../en/home";
import { plural } from "../../plural";

export const home = {
  comingUp: {
    tournamentFallback: "بطولة",
    gameFallback: "لعبة",
    versus: (opponent: string) => `ضد ${opponent}`,
    allSeatsFilled: "جميع المقاعد ممتلئة",
    openSeats: (n: number) =>
      plural("ar", n, {
        one: "مقعد شاغر",
        two: "مقعدان شاغران",
        few: "{n} مقاعد شاغرة",
        many: "{n} مقعدًا شاغرًا",
        other: "{n} مقعد شاغر",
      }),
  },
  level: {
    window: (n: number) =>
      plural("ar", n, {
        one: "آخر مباراة",
        two: "آخر مباراتين",
        few: "آخر {n} مباريات",
        many: "آخر {n} مباراة",
        other: "آخر {n} مباراة",
      }),
    provisionalLead: "المستوى مبدئي.",
    provisionalRest: (remaining: number) =>
      plural("ar", remaining, {
        one: " التظليل يعني غير مؤكد — العب نحو لعبة مصنّفة واحدة أخرى ويتأكد مستواك.",
        two: " التظليل يعني غير مؤكد — العب نحو لعبتين مصنّفتين أخريين ويتأكد مستواك.",
        few: " التظليل يعني غير مؤكد — العب نحو {n} ألعاب مصنّفة أخرى ويتأكد مستواك.",
        many: " التظليل يعني غير مؤكد — العب نحو {n} لعبة مصنّفة أخرى ويتأكد مستواك.",
        other:
          " التظليل يعني غير مؤكد — العب نحو {n} لعبة مصنّفة أخرى ويتأكد مستواك.",
      }),
    confirmedLead: "المستوى مؤكد.",
    confirmedRest: " يتحرك مستواك الآن مع كل لعبة مصنّفة تلعبها.",
    progressTo: (percent: number, next: string) =>
      `${percent}% من الطريق إلى ${next}`,
  },
  levelChange: {
    up: "ارتفاع",
    down: "انخفاض",
    none: "بلا تغيير",
  },
  nextGame: {
    addResults: "أضف النتائج",
    invitePlayer: "ادعُ لاعبًا",
    viewGame: "عرض اللعبة",
    playingNow: "تُلعب الآن",
  },
  noGames: {
    createGroup: "إنشاء مجموعة",
    create: "إنشاء",
    createGroupFirst: "أنشئ مجموعة أولًا، ثم يمكنك إنشاء لعبة.",
    browse: "تصفّح الألعاب المتاحة.",
  },
  recentForm: {
    noStreak: "لا سلسلة",
    winStreak: (n: number) =>
      plural("ar", n, {
        one: "تبني سلسلة فوز",
        two: "في سلسلة فوز من لعبتين",
        few: "في سلسلة فوز من {n} ألعاب",
        many: "في سلسلة فوز من {n} لعبة",
        other: "في سلسلة فوز من {n} لعبة",
      }),
    loseStreak: (n: number) =>
      plural("ar", n, {
        one: "خسارة مؤلمة",
        two: "في سلسلة خسارة من لعبتين",
        few: "في سلسلة خسارة من {n} ألعاب",
        many: "في سلسلة خسارة من {n} لعبة",
        other: "في سلسلة خسارة من {n} لعبة",
      }),
    slotsLeft: (n: number) =>
      plural("ar", n, {
        one: "بقي مكان واحد لملئه",
        two: "بقي مكانان لملئهما",
        few: "بقيت {n} أماكن لملئها",
        many: "بقي {n} مكانًا لملئه",
        other: "بقي {n} مكان لملئه",
      }),
    winRateAfterThree: "نسبة الفوز بعد 3 ألعاب",
    winRate: "نسبة الفوز",
  },
  seats: {
    full: "ممتلئ",
    spotsOpen: (n: number) =>
      plural("ar", n, {
        one: "مكان واحد شاغر",
        two: "مكانان شاغران",
        few: "{n} أماكن شاغرة",
        many: "{n} مكانًا شاغرًا",
        other: "{n} مكان شاغر",
      }),
  },
  standing: {
    groupFallback: "مجموعة",
    ofCount: (n: number) => `من ${n}`,
  },
  stateLine: {
    invitesWaiting: (n: number) =>
      plural("ar", n, {
        one: "دعوة واحدة بانتظارك",
        two: "دعوتان بانتظارك",
        few: "{n} دعوات بانتظارك",
        many: "{n} دعوة بانتظارك",
        other: "{n} دعوة بانتظارك",
      }),
    gamesBooked: (n: number) =>
      plural("ar", n, {
        one: "لعبة واحدة محجوزة",
        two: "لعبتان محجوزتان",
        few: "{n} ألعاب محجوزة",
        many: "{n} لعبة محجوزة",
        other: "{n} لعبة محجوزة",
      }),
  },
} satisfies typeof source;
