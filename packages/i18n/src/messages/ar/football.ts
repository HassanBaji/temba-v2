import { plural } from "../../plural";
import type { football as source } from "../en/football";

export const football = {
  status: {
    cancelled: "أُلغيت",
    played: "لُعبت",
    playedScoreMissing: "انتهت، أدخل النتيجة",
    teamsSet: "الفرق جاهزة",
    teamsSetOn: (weekday: string) => `الفرق جاهزة، ${weekday}`,
    upcoming: "قادمة",
    upcomingOn: (weekday: string) => `قادمة، ${weekday}`,
  },
  positionCode: {
    gk: "حارس",
    def: "دفاع",
    mid: "وسط",
    fwd: "هجوم",
  },
  lineup: {
    positions: {
      def: "مدافع",
      mid: "وسط",
      fwd: "مهاجم",
    },
    keeperSeatsTaken: "مكانا الحارسين محجوزان",
    keeperSeatsOpen: (left: number, total: number) =>
      `أماكن الحراس الشاغرة: ${left} من ${total}`,
    keepersIn: (n: number) =>
      plural("ar", n, {
        zero: "لا حراس مشاركون",
        one: "حارس واحد مشارك",
        two: "حارسان مشاركان",
        few: "{n} حراس مشاركون",
        many: "{n} حارسًا مشاركًا",
        other: "{n} حارس مشارك",
      }),
    oneKeeperOneMoreNeeded: "حارس واحد، مطلوب حارس آخر",
    noKeeperYet: "لا حارس بعد",
    positionCountsLine: (def: number, mid: number, fwd: number, gk: number) =>
      `المشاركون حتى الآن: ${def} دفاع، ${mid} وسط، ${fwd} هجوم، ${gk} حارس.`,
    bibs: {
      black: "أسود",
      white: "أبيض",
      red: "أحمر",
      navy: "أزرق داكن",
      sky: "أزرق فاتح",
      green: "أخضر",
      yellow: "أصفر",
      orange: "برتقالي",
      purple: "بنفسجي",
      pink: "وردي",
      grey: "رمادي",
    },
    teamsMethod: {
      manual: "من اختيار المنظّم",
      level: "متوازنة حسب المستوى",
    },
    nobodyInYet: "لا أحد مشارك بعد.",
    stillToPlace: (n: number) => `${n} لم يُوزَّعوا بعد.`,
    bothTeamsNeedPlayers: "كلا الفريقين يحتاج إلى لاعبين.",
    sideHasExtra: (team: string, extra: number) =>
      plural("ar", extra, {
        one: `لدى ${team} لاعب واحد زيادة. انقل واحدًا إلى الجهة الأخرى قبل النشر.`,
        two: `لدى ${team} لاعبان زيادة. انقل واحدًا إلى الجهة الأخرى قبل النشر.`,
        few: `لدى ${team} {n} لاعبين زيادة. انقل واحدًا إلى الجهة الأخرى قبل النشر.`,
        many: `لدى ${team} {n} لاعبًا زيادة. انقل واحدًا إلى الجهة الأخرى قبل النشر.`,
        other: `لدى ${team} {n} لاعب زيادة. انقل واحدًا إلى الجهة الأخرى قبل النشر.`,
      }),
    draw: "تعادل.",
    winBy: (team: string, margin: number) => `${team} يفوز بفارق ${margin}.`,
    scorersExceed: (team: string, score: number) =>
      `مجموع أهداف مسجّلي ${team} يتجاوز ${score}.`,
  },
  board: {
    outfieldLine: (inCount: number, seats: number) =>
      plural("ar", seats, {
        one: `${inCount} من لاعب واحد`,
        two: `${inCount} من لاعبَين`,
        few: `${inCount} من {n} لاعبين`,
        many: `${inCount} من {n} لاعبًا`,
        other: `${inCount} من {n} لاعب`,
      }),
    keeperNoteClaimed: (perGame: number, name: string) =>
      `حارس واحد لكل فريق، أي ${perGame} لكل مباراة. ${name} أخذ الأول.`,
    keeperNoteUnclaimed: (perGame: number) =>
      `حارس واحد لكل فريق، أي ${perGame} لكل مباراة. لم يأخذ أحد مكانًا بعد.`,
    keeperSeatsBothTaken: "كلاهما محجوز",
    keeperSeatsLeft: (n: number) =>
      plural("ar", n, {
        one: "تبقّى مكان واحد",
        two: "تبقّى مكانان",
        few: "تبقّت {n} أماكن",
        many: "تبقّى {n} مكانًا",
        other: "تبقّى {n} مكان",
      }),
    seatKeeper: "حارس",
    seatPlayerPrefers: (code: string) => `لاعب، يفضّل ${code}`,
    joinAsKeeper: "انضم كحارس",
    joinAsPosition: (code: string) => `انضم بمركز ${code}`,
    joinWithPrice: (lead: string, price: string) => `${lead}، ${price}`,
    seatsOpen: (n: number) =>
      plural("ar", n, {
        zero: "لا أماكن شاغرة",
        one: "مكان واحد شاغر",
        two: "مكانان شاغران",
        few: "{n} أماكن شاغرة",
        many: "{n} مكانًا شاغرًا",
        other: "{n} مكان شاغر",
      }),
    everyonePlaced: (
      team1: string,
      average1: string,
      team2: string,
      average2: string,
    ) =>
      `وُزّع الجميع. متوسط ${team1} ${average1}، ومتوسط ${team2} ${average2}.`,
    keeperCount: (n: number) =>
      plural("ar", n, {
        zero: "لا حراس",
        one: "حارس واحد",
        two: "حارسان",
        few: "{n} حراس",
        many: "{n} حارسًا",
        other: "{n} حارس",
      }),
    goalsNote:
      "تُحتسب الأهداف في الأداء الأخير للاعب، لا في التصنيف. تجاوز إن لم يتابع أحد العدّ.",
    goalsNamed: (
      named1: number,
      score1: number,
      team1: string,
      named2: number,
      score2: number,
      team2: string,
    ) =>
      `سُمّي ${named1} من أهداف ${team1} الـ${score1} و${named2} من أهداف ${team2} الـ${score2}.`,
    bothSidesConfirmed: "أكّد الفريقان.",
    confirmedByOrganizer: "أكّده المنظّم.",
    waitingOrganizerFor: (team: string) => `تأكيد المنظّم عن ${team}`,
    waitingPlayerFrom: (team: string) => `تأكيد لاعب واحد من ${team}`,
    waitingFor: (who: string) => `بانتظار ${who}.`,
    waitingForBoth: (first: string, second: string) =>
      `بانتظار ${first} و${second}.`,
    waitingOrganizerBoth: "بانتظار تأكيد المنظّم عن الفريقين.",
    waitingEachSide: "بانتظار تأكيد لاعب واحد من كل فريق.",
    youPlayInAs: (team: string, code: string) =>
      `تلعب في ${team} بمركز ${code}.`,
    youPlayIn: (team: string) => `تلعب في ${team}.`,
  },
  details: {
    priceLabel: "السعر",
    durationLabel: "المدة",
    minutesShort: (n: number) => `${n} د`,
    waitlistedTitle: "أنت في قائمة الانتظار",
    registeredTitle: "أنت في التشكيلة",
    joinTitle: "انضم إلى هذه المباراة",
    fullTitle: "هذه المباراة مكتملة",
    joinWaitlistAction: "انضم إلى قائمة الانتظار",
    fallbackTitle: "مباراة",
  },
  hub: {
    sections: {
      result: {
        title: "بحاجة إلى تأكيدك",
        meta: "النتيجة مُدخلة أو ناقصة",
      },
      open: { title: "أماكن شاغرة", meta: "الفرق غير جاهزة" },
      teams: { title: "الفرق جاهزة", meta: "اطّلع على فريقك" },
      full: { title: "مكتملة", meta: "قائمة الانتظار مفتوحة" },
    },
    card: {
      waitingForPlayers: "بانتظار اللاعبين",
      playersOf: (taken: number, seats: number) =>
        plural("ar", seats, {
          one: `${taken} من لاعب واحد`,
          two: `${taken} من لاعبَين`,
          few: `${taken} من {n} لاعبين`,
          many: `${taken} من {n} لاعبًا`,
          other: `${taken} من {n} لاعب`,
        }),
      openSpots: (n: number) =>
        plural("ar", n, {
          one: "، مكان واحد شاغر",
          two: "، مكانان شاغران",
          few: "، {n} أماكن شاغرة",
          many: "، {n} مكانًا شاغرًا",
          other: "، {n} مكان شاغر",
        }),
    },
  },
  selfPlacement: {
    beginner: {
      label: "مبتدئ",
      description: "ما زلت تتعلم. تلعب بين حين وآخر.",
    },
    casual: {
      label: "هاوٍ",
      description: "مباريات عفوية، تحافظ على مركزك. 1–2× في الأسبوع.",
    },
    competitive: {
      label: "تنافسي",
      description: "تلعب بطولات محلية وتصمد المباراة كاملة. 2–3× في الأسبوع.",
    },
    pro: {
      label: "محترف",
      description:
        "خلفية نادٍ أو أكاديمية، تتحكم في المباراة. عدة مرات في الأسبوع.",
    },
  },
  sizeLine: (sideSize: string, players: number) =>
    `${sideSize}، حتى ${plural("ar", players, {
      one: "لاعب واحد",
      two: "لاعبَين",
      few: "{n} لاعبين",
      many: "{n} لاعبًا",
      other: "{n} لاعب",
    })}`,
} satisfies typeof source;
