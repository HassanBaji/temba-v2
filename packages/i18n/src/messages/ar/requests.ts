import type { requests as source } from "../en/requests";
import { isolate } from "../../bidi";
import { plural } from "../../plural";

export const requests = {
  title: "الطلبات",
  notificationsTitle: "الإشعارات",
  newCount: (n: number) =>
    plural("ar", n, {
      one: "إشعار جديد",
      two: "إشعاران جديدان",
      few: "{n} إشعارات جديدة",
      many: "{n} إشعارًا جديدًا",
      other: "{n} إشعار جديد",
    }),
  allTitle: "كل الطلبات",
  all: "الكل",
  games: "المباريات",
  groups: "المجموعات",
  waiting: (n: number) =>
    plural("ar", n, {
      one: "طلب واحد بالانتظار",
      two: "طلبان بالانتظار",
      few: "{n} طلبات بالانتظار",
      many: "{n} طلبًا بالانتظار",
      other: "{n} طلب بالانتظار",
    }),
  allAnswered: "تمّ الرد على الكل",
  nothingWaiting: "لا شيء بالانتظار",
  nothingWaitingNote: "تظهر الطلبات الجديدة هنا.",
  approve: "موافقة",
  decline: "رفض",
  undo: "تراجع",
  approveName: (name: string) => `الموافقة على ${name}`,
  declineName: (name: string) => `رفض ${name}`,
  undoName: (name: string) => `التراجع عن الرد على ${name}`,
  approveBoth: "الموافقة على الاثنين",
  approveAll: (n: number) =>
    plural("ar", n, {
      one: "الموافقة على الطلب",
      two: "الموافقة على الطلبين",
      few: "الموافقة على الـ{n} طلبات",
      many: "الموافقة على الـ{n} طلبًا",
      other: "الموافقة على الـ{n} طلب",
    }),
  moreRequests: (n: number) =>
    plural("ar", n, {
      one: "طلب آخر",
      two: "طلبان آخران",
      few: "{n} طلبات أخرى",
      many: "{n} طلبًا آخر",
      other: "{n} طلب آخر",
    }),
  next: {
    two: (first: string, second: string) => `التالي: ${first} و${second}`,
    one: (name: string) => `التالي: ${name}`,
    many: (first: string, second: string, more: number) =>
      plural("ar", more, {
        one: `التالي: ${first}، ${second} وواحد آخر`,
        two: `التالي: ${first}، ${second} واثنان آخران`,
        few: `التالي: ${first}، ${second} و{n} آخرين`,
        many: `التالي: ${first}، ${second} و{n} آخرين`,
        other: `التالي: ${first}، ${second} و{n} آخرين`,
      }),
  },
  notificationsNote:
    "الأكثر إلحاحًا أولًا: الأماكن المحجوزة قبل طلبات المجموعات. يمكن لأي منظّم أو مشرف في تلك المجموعة أن يردّ.",
  gamesNote: "يتحرّر المكان المحجوز عند انتهاء الحجز أو عند الرفض.",
  gameNote: (group: string) =>
    `يمكن لأي منظّم في ${group} أن يقرّر. يتحرّر المكان المحجوز عند انتهاء الحجز أو عند الرفض.`,
  gameNoteNoGroup: "يتحرّر المكان المحجوز عند انتهاء الحجز أو عند الرفض.",
  groupNote: "يمكن لأي مشرف في المجموعة أن يقرّر.",
  userFallback: "لاعب",
  groupFallback: "المجموعة",
  sportNoun: { padel: "بادل", football: "كرة قدم" },
  want: {
    seat: (day: string, clock: string, sport: string) =>
      `مكان في ${sport} ${day} ${isolate(clock)}`,
    seatNoTime: (sport: string) => `مكان في مباراة ${sport}`,
    group: (group: string) => `الانضمام إلى ${group}`,
  },
  gameHeading: (day: string, clock: string, sport: string) =>
    `${sport} ${day} ${isolate(clock)}`,
  gameFill: (inCount: number, capacity: number) =>
    `${inCount} من ${capacity} مسجّلون`,
  gameFillHeld: (inCount: number, capacity: number, held: number) =>
    plural("ar", held, {
      one: `${inCount} من ${capacity} مسجّلون، مكان محجوز`,
      two: `${inCount} من ${capacity} مسجّلون، مكانان محجوزان`,
      few: `${inCount} من ${capacity} مسجّلون، {n} أماكن محجوزة`,
      many: `${inCount} من ${capacity} مسجّلون، {n} مكانًا محجوزًا`,
      other: `${inCount} من ${capacity} مسجّلون، {n} مكان محجوز`,
    }),
  context: {
    member: (group: string) => `عضو في ${group}.`,
    under: (level: string, range: string) =>
      `المستوى ${isolate(level)} أقل من نطاق هذه المباراة ${isolate(range)}.`,
    above: (level: string, range: string) =>
      `المستوى ${isolate(level)} أعلى من نطاق هذه المباراة ${isolate(range)}.`,
    inside: (level: string, range: string) =>
      `المستوى ${isolate(level)} صار داخل نطاق هذه المباراة ${isolate(range)}.`,
    noLevel: (range: string) =>
      `لا مستوى بعد. نطاق هذه المباراة ${isolate(range)}.`,
    outsideNoRange: "طلب اللعب خارج مستوى هذه المباراة.",
    notInGroupYourLink: (group: string) =>
      `ليس في ${group} بعد، جاء عبر رابطك.`,
    notInGroupLinkFrom: (group: string, name: string) =>
      `ليس في ${group} بعد، جاء عبر رابط ${name}.`,
    notInGroupLink: (group: string) =>
      `ليس في ${group} بعد، جاء عبر رابط المباراة.`,
    addsToGroup: "الموافقة تضيفه إلى المجموعة أيضًا.",
    yourLink: "جاء عبر رابطك.",
    invitedBy: (name: string) => `بدعوة من ${name}.`,
    inviteLink: "جاء عبر رابط دعوة.",
    groupPage: "طلب من صفحة المجموعة.",
    gamesWithMembers: (n: number) =>
      plural("ar", n, {
        one: "لعب مباراة واحدة مع أعضائك.",
        two: "لعب مباراتين مع أعضائك.",
        few: "لعب {n} مباريات مع أعضائك.",
        many: "لعب {n} مباراة مع أعضائك.",
        other: "لعب {n} مباراة مع أعضائك.",
      }),
    noGamesWithMembers: "لا مباريات مع أعضائك بعد.",
    note: (note: string) => `«${note}»`,
  },
  time: {
    seatHeld: "المكان محجوز",
    starts: "تبدأ",
    asked: "طلب",
    minutesLeft: (n: number) => `باقي ${n} د`,
    hoursLeft: (n: number) => `باقي ${n} س`,
    daysLeft: (n: number) => `باقي ${n} ي`,
    inMinutes: (n: number) => `بعد ${n} د`,
    inHours: (n: number) => `بعد ${n} س`,
    inDays: (n: number) => `بعد ${n} ي`,
    justNow: "الآن",
    minutesAgo: (n: number) => `قبل ${n} د`,
    hoursAgo: (n: number) => `قبل ${n} س`,
    daysAgo: (n: number) => `قبل ${n} ي`,
  },
  done: {
    inGame: (weekday: string) => `في مباراة ${weekday}`,
    inGameAndGroup: (weekday: string) => `في مباراة ${weekday} وفي المجموعة`,
    onWaitlist: (weekday: string) => `على قائمة انتظار مباراة ${weekday}`,
    onWaitlistAndGroup: (weekday: string) =>
      `على قائمة انتظار مباراة ${weekday} وفي المجموعة`,
    inTheGame: "في المباراة",
    inGroup: (group: string) => `صار في ${group}`,
    declinedSeatFreed: "رُفض، وتحرّر المكان",
    declined: "رُفض",
  },
  failed: (name: string) =>
    `تعذّر الرد على طلب ${name}. ربما تمّ الرد عليه بالفعل.`,
} satisfies typeof source;
