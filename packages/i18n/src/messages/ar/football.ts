import { plural } from "../../plural";
import type { football as source } from "../en/football";

export const football = {
  status: {
    cancelled: "أُلغيت",
    played: "لُعبت",
    playedScoreMissing: "لُعبت، النتيجة ناقصة",
    teamsSet: "الفرق جاهزة",
    teamsSetOn: (weekday: string) => `الفرق جاهزة، ${weekday}`,
    upcoming: "قادمة",
    upcomingOn: (weekday: string) => `قادمة، ${weekday}`,
  },
  lineup: {
    positions: {
      def: "مدافع",
      mid: "وسط",
      fwd: "مهاجم",
    },
    keeperSeatsTaken: "مقعدا الحارسين محجوزان",
    keeperSeatsOpen: (left: number, total: number) =>
      `${left} من ${total} مقاعد الحراس شاغرة`,
    keepersIn: (n: number) => `${n} حراس مشاركون`,
    oneKeeperOneMoreNeeded: "حارس واحد، مطلوب حارس آخر",
    noKeeperYet: "لا حارس بعد",
    positionCountsLine: (def: number, mid: number, fwd: number, gk: number) =>
      `المشاركون حتى الآن: ${def} DEF، ${mid} MID، ${fwd} FWD، ${gk} GK.`,
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
      `لدى ${team} ${extra} لاعبين زيادة. انقل واحدًا إلى الجهة الأخرى قبل النشر.`,
    draw: "تعادل.",
    winBy: (team: string, margin: number) => `${team} يفوز بفارق ${margin}.`,
    scorersExceed: (team: string, score: number) =>
      `مجموع أهداف مسجّلي ${team} يتجاوز ${score}.`,
  },
  board: {
    outfieldLine: (inCount: number, seats: number) =>
      `${inCount} من ${seats} مشاركون`,
    keeperNoteClaimed: (perGame: number, name: string) =>
      `حارس واحد لكل فريق، أي ${perGame} لكل لعبة. ${name} أخذ الأول.`,
    keeperNoteUnclaimed: (perGame: number) =>
      `حارس واحد لكل فريق، أي ${perGame} لكل لعبة. لم يأخذ أحد مقعدًا بعد.`,
    keeperSeatsBothTaken: "كلاهما محجوز",
    keeperSeatsLeft: (n: number) =>
      plural("ar", n, {
        one: "تبقّى مقعد واحد",
        two: "تبقّى مقعدان",
        few: "تبقّت {n} مقاعد",
        many: "تبقّى {n} مقعدًا",
        other: "تبقّى {n} مقعد",
      }),
    seatKeeper: "حارس",
    seatPlayerPrefers: (code: string) => `لاعب، يفضّل ${code}`,
    joinAsKeeper: "انضم كحارس",
    joinAsPosition: (code: string) => `انضم كـ${code}`,
    joinWithPrice: (lead: string, price: string) => `${lead}، ${price}`,
    seatsOpen: (n: number) =>
      plural("ar", n, {
        zero: "لا مقاعد شاغرة",
        one: "مقعد واحد شاغر",
        two: "مقعدان شاغران",
        few: "{n} مقاعد شاغرة",
        many: "{n} مقعدًا شاغرًا",
        other: "{n} مقعد شاغر",
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
      `سُمّي ${named1} من ${score1} أهداف ${team1} و${named2} من ${score2} أهداف ${team2}.`,
    bothSidesConfirmed: "أكّد الفريقان.",
    confirmedByOrganizer: "أكّده المنظّم.",
    waitingOrganizerFor: (team: string) => `تأكيد المنظّم عن ${team}`,
    waitingPlayerFrom: (team: string) => `تأكيد لاعب واحد من ${team}`,
    waitingFor: (who: string) => `بانتظار ${who}.`,
    waitingForBoth: (first: string, second: string) =>
      `بانتظار ${first} و${second}.`,
    waitingOrganizerBoth: "بانتظار تأكيد المنظّم عن الفريقين.",
    waitingEachSide: "بانتظار تأكيد لاعب واحد من كل فريق.",
    youPlayInAs: (team: string, code: string) => `تلعب في ${team} كـ${code}.`,
    youPlayIn: (team: string) => `تلعب في ${team}.`,
  },
  details: {
    priceLabel: "السعر",
    durationLabel: "المدة",
    minutesShort: (n: number) => `${n} د`,
    waitlistedTitle: "أنت في قائمة الانتظار",
    registeredTitle: "أنت مشارك",
    joinTitle: "انضم إلى هذه اللعبة",
    fullTitle: "هذه اللعبة مكتملة",
    joinWaitlistAction: "انضم إلى قائمة الانتظار",
    fallbackTitle: "لعبة",
  },
  hub: {
    sections: {
      result: {
        title: "بحاجة إلى تأكيدك",
        meta: "النتيجة مُدخلة أو ناقصة",
      },
      open: { title: "مقاعد شاغرة", meta: "الفرق غير جاهزة" },
      teams: { title: "الفرق جاهزة", meta: "اطّلع على فريقك" },
      full: { title: "مكتملة", meta: "قائمة الانتظار مفتوحة" },
    },
  },
  selfPlacement: {
    beginner: {
      label: "مبتدئ",
      description: "ما زلت تتعلم. تلعب بين حين وآخر.",
    },
    casual: {
      label: "هاوٍ",
      description: "ألعاب عفوية، تحافظ على مركزك. 1–2× في الأسبوع.",
    },
    competitive: {
      label: "تنافسي",
      description: "تلعب بطولات محلية وتصمد المباراة كاملة. 2–3× في الأسبوع.",
    },
    pro: {
      label: "محترف",
      description:
        "خلفية نادٍ أو أكاديمية، تتحكم في اللعبة. عدة مرات في الأسبوع.",
    },
  },
  sizeLine: (sideSize: string, players: number) =>
    `${sideSize} · ${players} لاعبًا`,
} satisfies typeof source;
