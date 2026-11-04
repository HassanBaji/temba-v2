import type { home as source } from "../en/home";
import { isolate } from "../../bidi";
import { plural } from "../../plural";

export const home = {
  comingUp: {
    tournamentFallback: "بطولة",
    gameFallback: "مباراة",
    versus: (opponent: string) => `ضد ${opponent}`,
    allSeatsFilled: "جميع الأماكن ممتلئة",
    openSeats: (n: number) =>
      plural("ar", n, {
        one: "مكان شاغر",
        two: "مكانان شاغران",
        few: "{n} أماكن شاغرة",
        many: "{n} مكانًا شاغرًا",
        other: "{n} مكان شاغر",
      }),
    friendly: "ودية",
    parts: (parts: string[]) => parts.join("، "),
    until: (clock: string) => `حتى ${clock}`,
    untilFor: (clock: string, minutes: number) =>
      plural("ar", minutes, {
        one: `حتى ${clock}، دقيقة واحدة`,
        two: `حتى ${clock}، دقيقتان`,
        few: `حتى ${clock}، {n} دقائق`,
        many: `حتى ${clock}، {n} دقيقة`,
        other: `حتى ${clock}، {n} دقيقة`,
      }),
  },
  level: {
    heading: {
      padel: "مستواك في البادل",
      football: "مستواك في كرة القدم",
    },
    numberLabel: "التقييم",
    window: (n: number) =>
      plural("ar", n, {
        one: "في آخر مباراة",
        two: "في آخر مباراتين",
        few: "في آخر {n} مباريات",
        many: "في آخر {n} مباراة",
        other: "في آخر {n} مباراة",
      }),
    provisionalLead: "مستواك مبدئي.",
    provisionalRest: (remaining: number) =>
      plural("ar", remaining, {
        one: " العب مباراة مصنّفة واحدة أخرى لتأكيده.",
        two: " العب مباراتين مصنّفتين أخريين لتأكيده.",
        few: " العب {n} مباريات مصنّفة أخرى لتأكيده.",
        many: " العب {n} مباراة مصنّفة أخرى لتأكيده.",
        other: " العب {n} مباراة مصنّفة أخرى لتأكيده.",
      }),
    confirmedLead: "مستواك مؤكد.",
    confirmedRest: " يتحرك مستواك الآن مع كل مباراة مصنّفة تلعبها.",
    progressTo: (percent: number, next: string) =>
      `${percent}% نحو ${isolate(next)}`,
  },
  levelChange: {
    up: "ارتفاع",
    down: "انخفاض",
    none: "بلا تغيير",
  },
  nextGame: {
    addResults: "أضف النتائج",
    invitePlayer: "ادعُ لاعبًا",
    viewGame: "عرض المباراة",
    playingNow: "جارية الآن",
  },
  noGames: {
    createGroup: "إنشاء مجموعة",
    create: "إنشاء",
    createGroupFirst: "أنشئ مجموعة أولًا، ثم يمكنك إنشاء مباراة.",
    browse: "تصفّح المباريات المتاحة.",
  },
  recentForm: {
    noStreak: "لا سلسلة",
    winStreak: (n: number) =>
      plural("ar", n, {
        one: "تبني سلسلة فوز",
        two: "في سلسلة فوز من مباراتين",
        few: "في سلسلة فوز من {n} مباريات",
        many: "في سلسلة فوز من {n} مباراة",
        other: "في سلسلة فوز من {n} مباراة",
      }),
    loseStreak: (n: number) =>
      plural("ar", n, {
        one: "خسارة مؤلمة",
        two: "في سلسلة خسارة من مباراتين",
        few: "في سلسلة خسارة من {n} مباريات",
        many: "في سلسلة خسارة من {n} مباراة",
        other: "في سلسلة خسارة من {n} مباراة",
      }),
    slotsLeft: (n: number) =>
      plural("ar", n, {
        one: "بقي مكان واحد لملئه",
        two: "بقي مكانان لملئهما",
        few: "بقيت {n} أماكن لملئها",
        many: "بقي {n} مكانًا لملئه",
        other: "بقي {n} مكان لملئه",
      }),
    winRateAfter: (n: number) =>
      plural("ar", n, {
        one: "تظهر نسبة الفوز بعد مباراة واحدة",
        two: "تظهر نسبة الفوز بعد مباراتين",
        few: "تظهر نسبة الفوز بعد {n} مباريات",
        many: "تظهر نسبة الفوز بعد {n} مباراة",
        other: "تظهر نسبة الفوز بعد {n} مباراة",
      }),
    winRate: "نسبة الفوز",
    outcomeLetter: { won: "ف", lost: "خ", draw: "ت" },
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
    unranked: "—",
    noCountedGames: "لا مباريات محتسبة بعد",
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
        one: "مباراة واحدة محجوزة",
        two: "مباراتان محجوزتان",
        few: "{n} مباريات محجوزة",
        many: "{n} مباراة محجوزة",
        other: "{n} مباراة محجوزة",
      }),
  },
} satisfies typeof source;
