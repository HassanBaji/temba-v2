import { isolate } from "../../bidi";
import { plural } from "../../plural";
import type { liveBoard as source } from "../en/live-board";
import { tournamentRounds } from "./tournament-rounds";

const { ordinal } = tournamentRounds.shareCard;

type BoardKind = "social" | "padel_match" | "football";

const eventName = (kind: BoardKind) =>
  kind === "social" ? "السوشيال" : "المباراة";

const points = (count: number) =>
  plural("ar", count, {
    zero: "0 نقاط",
    one: "نقطة واحدة",
    two: "نقطتان",
    few: "{n} نقاط",
    many: "{n} نقطة",
    other: "{n} نقطة",
  });

const seconds = (count: number) =>
  plural("ar", count, {
    one: "ثانية واحدة",
    two: "ثانيتان",
    few: "{n} ثوانٍ",
    many: "{n} ثانية",
    other: "{n} ثانية",
  });

const record = (won: number, drawn: number, lost: number) =>
  `فاز ${won}، تعادل ${drawn}، خسر ${lost}`;

const signed = (value: number) =>
  isolate(value > 0 ? `+${value}` : value < 0 ? `−${Math.abs(value)}` : "0");

export const liveBoard = {
  joiner: " و",
  list: (parts: readonly string[]) => parts.join("، "),
  signed,
  menu: {
    showOnTv: "اعرض على التلفزيون",
    showOnTvHint: "لوحة مباشرة للحاضرين",
  },
  screens: {
    on_court: "في الملعب",
    table: "الترتيب",
    next_up: "التالي",
    scoreboard: "لوحة النتيجة",
  },
  settings: {
    rotate: "تبديل الشاشات",
    rotateHint: (count: number) =>
      `في الملعب، الترتيب، التالي. ${seconds(count)} لكل شاشة`,
    rotateOffHint: "الإيقاف يثبّت اللوحة على شاشة واحدة",
    qr: "رمز QR للمتابعة",
    qrHint: (kind: BoardKind) =>
      `يفتح به الحاضرون ${eventName(kind)} على الهاتف`,
    colorScheme: "نظام الألوان",
    colorSchemeHint: "الداكن يناسب أغلب الشاشات",
    dark: "داكن",
    light: "فاتح",
  },
  sheet: {
    title: "اعرض على التلفزيون",
    lead: (kind: BoardKind): string =>
      kind === "social"
        ? "لوحة مباشرة للحاضرين: النتائج فور حفظها، والترتيب، ومن يلعب بعد ذلك."
        : "لوحة مباشرة للحاضرين: النتيجة فور حفظها، مع الفريقين.",
    codeLead: (address: string) =>
      `في متصفّح التلفزيون افتح ${isolate(address)} وأدخل`,
    copyLink: "انسخ رابط اللوحة",
    linkCopied: "نُسخ رابط اللوحة",
    openHere: "افتح اللوحة على هذا الجهاز",
    footnote: (kind: BoardKind) =>
      `يعمل الرمز حتى توقف اللوحة، ولست ساعات بعد أن ينتهي ${eventName(kind)}. من يحمله يشاهد فقط.`,
    startFailed: "تعذّر تشغيل اللوحة. حاول مرة أخرى.",
    retry: "حاول مرة أخرى",
  },
  card: {
    title: "على التلفزيون الآن",
    waitingTitle: "اللوحة المباشرة تعمل",
    waiting: (code: string) =>
      `لم يتصل أي تلفزيون بعد. الرمز ${isolate(code)}.`,
    showing: (tv: string, screen: string, rotating: boolean) =>
      `${tv}. يعرض ${screen}، ${rotating ? "مع التبديل" : "مثبّتة"}.`,
    showingOne: (tv: string) => `${tv}. يعرض لوحة النتيجة.`,
    showingWaiting: (tv: string) => `${tv}. بانتظار نشر الجولة الأولى.`,
    showingFinal: (tv: string) => `${tv}. يعرض الفائزين والترتيب النهائي.`,
    tvCount: (count: number) =>
      plural("ar", count, {
        one: "تلفزيون واحد",
        two: "تلفزيونان",
        few: "{n} تلفزيونات",
        many: "{n} تلفزيونًا",
        other: "{n} تلفزيون",
      }),
    control: "تحكّم",
  },
  control: {
    chip: "المنظّم",
    title: "اللوحة المباشرة",
    lead: "ما تغيّره هنا يظهر على التلفزيون خلال ثوانٍ.",
    onTvs: (count: number) =>
      plural("ar", count, {
        zero: "ليست على أي تلفزيون بعد",
        one: "على تلفزيون واحد",
        two: "على تلفزيونين",
        few: "على {n} تلفزيونات",
        many: "على {n} تلفزيونًا",
        other: "على {n} تلفزيون",
      }),
    now: "على التلفزيون الآن",
    thenIn: (screen: string, count: number) => `ثم ${screen}، بعد ${count} ث`,
    held: "مثبّتة على هذه الشاشة",
    oneScreen: "شاشة واحدة، بلا تبديل",
    waitingNow: "بانتظار الجولات",
    waitingLine: "يبدأ التبديل حين تُنشر جولة",
    finalNow: "الترتيب النهائي",
    finalLine: "توقفت على الفائزين والترتيب النهائي",
    nextNotPosted: "تظهر حين تُنشر الجولة التالية",
    screensTitle: "الشاشات",
    screensHint: "اضغط واحدة لعرضها",
    screenHints: {
      on_court: "النتائج المباشرة، الترتيب، الجولة التالية",
      table: "الجدول كاملًا، والملاعب في الجانب",
      next_up: "من يلعب ضد من، وفي أي ملعب",
    },
    onNow: "معروضة الآن",
    show: "اعرض",
    showScreen: (screen: string) => `اعرض ${screen} على التلفزيون`,
    rotationTitle: "التبديل",
    rotationOn: "يعمل",
    rotationHeld: "مثبّتة",
    changeEvery: "بدّل كل",
    perScreen: "لكل شاشة",
    seconds: (count: number) => `${count} ث`,
    secondsLabel: seconds,
    messageTitle: "رسالة للحاضرين",
    messageOff: "غير معروضة",
    messageOn: "على اللوحة الآن",
    messageLabel: "الرسالة",
    messagePlaceholder: "الجولة 5 تبدأ بعد دقيقتين. تأكّد من ملعبك.",
    messageEmpty: "اكتب سطرًا واحدًا للحاضرين.",
    messageEdit: "عدّل",
    messageSave: "حفظ",
    messageShow: "اعرضها على اللوحة",
    messageTakeDown: "أزلها",
    displayTitle: "العرض",
    tvsTitle: "التلفزيونات",
    tvsConnected: (count: number) =>
      plural("ar", count, {
        zero: "لا شيء متصل",
        one: "واحد متصل",
        two: "اثنان متصلان",
        few: "{n} متصلة",
        many: "{n} متصلًا",
        other: "{n} متصل",
      }),
    tvSince: (time: string) => `متصل منذ ${isolate(time)}`,
    disconnect: "افصل",
    disconnectTv: (name: string) => `افصل ${name}`,
    addTv: "أضف تلفزيونًا آخر",
    addFirstTv: "وصّل تلفزيونًا",
    addLine: (address: string, code: string) =>
      `${isolate(address)}، الرمز ${isolate(code)}`,
    stop: "أوقف اللوحة",
    stopNote: "تُغلق على كل التلفزيونات. المباراة نفسها لا تتأثر.",
    stopTitle: "إيقاف اللوحة؟",
    stopBody:
      "تُغلق على كل التلفزيونات ويتوقف الرمز عن العمل. المباراة لا تتأثر.",
    stopKeep: "أبقِها تعمل",
    stopped: "أُوقفت اللوحة",
    offTitle: "اللوحة لا تعمل",
    offLead: "«اعرض على التلفزيون» يشغّلها ويعطيك رمزًا للتلفزيون.",
    unavailable: "هذه المباراة ليس لها لوحة مباشرة.",
  },
  tv: {
    title: "اللوحة المباشرة",
    lead: "أدخل الرمز المكوّن من ستة أرقام من هاتف المنظّم.",
    codeLabel: "رمز اللوحة",
    nameLabel: "سمِّ هذا التلفزيون (اختياري)",
    namePlaceholder: "تلفزيون النادي",
    open: "افتح اللوحة",
    opening: "جارٍ فتح اللوحة",
    invalid: "أدخل أرقام الرمز الستة.",
    notFound: "لا توجد لوحة تعمل بهذا الرمز. راجعه مع المنظّم.",
    failed: "تعذّر فتح اللوحة. حاول مرة أخرى.",
    defaultName: (number: number) => `تلفزيون ${number}`,
    ended: {
      stopped: "أُوقفت اللوحة",
      disconnected: "فُصل هذا التلفزيون",
      closed: "أُغلقت اللوحة",
    },
    endedLead: "أدخل رمزًا لفتح لوحة أخرى.",
    offline: "جارٍ إعادة الاتصال",
  },
  board: {
    live: "مباشر",
    final: "النهائي",
    soon: "قريبًا",
    court: (number: number) => `ملعب ${number}`,
    round: (round: number) => `الجولة ${round}`,
    clockLeft: "باقٍ في الجولة",
    clockStarts: (round: number) => `حتى الجولة ${round}`,
    matchTime: "وقت المباراة",
    minutesPlayed: "دقيقة لُعبت",
    onCourtNow: "في الملعب الآن",
    roundStarted: (round: number, time: string) =>
      `الجولة ${round}، بدأت ${isolate(time)}`,
    roundStarts: (round: number, time: string) =>
      `الجولة ${round}، تبدأ ${isolate(time)}`,
    state: {
      scheduled: (time: string) => `تبدأ ${isolate(time)}`,
      scheduledNoTime: "التالية",
      on_court: "لا نتيجة بعد",
      awaiting_confirmation: "تُلعب الآن",
      confirmed: "نهائية",
      not_finished: "لم تكتمل",
      cancelled: "أُلغيت",
    },
    standings: "الترتيب",
    standingsOf: (group: string) => `الترتيب، ${group}`,
    afterRound: (round: number, total: number): string =>
      round === 0 ? "لم تُلعب أي جولة بعد" : `بعد الجولة ${round} من ${total}`,
    afterRoundShort: (round: number): string =>
      round === 0 ? "لم تُلعب أي جولة بعد" : `بعد الجولة ${round}`,
    pointsRule: (win: number, draw: number, loss: number) =>
      `الفوز ${win}، التعادل ${draw}، الخسارة ${loss}`,
    gamesRule: "الترتيب بالأشواط المكسوبة",
    afterWithRule: (after: string, rule: string) => `${after}. ${rule}`,
    columns: {
      rank: "#",
      team: "الفريق",
      player: "اللاعب",
      played: "ل",
      won: "ف",
      drawn: "ت",
      lost: "خ",
      games: "الأشواط",
      difference: "+/−",
      points: "نقاط",
      gamesWon: "كسب",
      rounds: "الجولات",
    },
    next: (time: string | null): string =>
      time ? `التالي، ${isolate(time)}` : "التالي",
    then: (time: string | null): string =>
      time ? `ثم، ${isolate(time)}` : "ثم",
    notPosted: "لم تُنشر بعد",
    lastRound: "الجولة الأخيرة",
    lastRoundLine: "لا جولة بعد هذه",
    nextUp: (round: number) => `التالي، الجولة ${round}`,
    nextUpMeta: (time: string | null, minutes: number): string =>
      time ? `تبدأ ${isolate(time)}، ${minutes} دقيقة` : `${minutes} دقيقة`,
    against: "ضد",
    placePoints: (place: number, count: number) =>
      `${ordinal(place)}، ${points(count)}`,
    placeGames: (place: number, count: number) =>
      `${ordinal(place)}، ${plural("ar", count, {
        zero: "لا أشواط",
        one: "شوط واحد",
        two: "شوطان",
        few: "{n} أشواط",
        many: "{n} شوطًا",
        other: "{n} شوط",
      })}`,
    followOn: "تابع على",
    followPhone: "هاتفك",
    resultsIn: "النتائج",
    resultsTemba: "في Temba",
    fromOrganizer: "من المنظّم",
    finalTitle: (name: string) => `${name}، النهائي`,
    finished: (time: string) => `انتهى ${isolate(time)}`,
    winners: "الفائزون",
    winner: "الفائز",
    firstOf: (count: number) => `الأول من ${count}`,
    winnerSummary: (
      count: number,
      won: number,
      drawn: number,
      lost: number,
      difference: number,
    ) =>
      `${points(count)}. ${record(won, drawn, lost)}، ${signed(difference)} أشواط`,
    placeSummary: (count: number, won: number, drawn: number, lost: number) =>
      `${points(count)}. ${record(won, drawn, lost)}`,
    winnerGamesSummary: (
      gamesWon: number,
      won: number,
      drawn: number,
      lost: number,
    ) =>
      `${plural("ar", gamesWon, {
        zero: "لم يكسب أي شوط",
        one: "كسب شوطًا واحدًا",
        two: "كسب شوطين",
        few: "كسب {n} أشواط",
        many: "كسب {n} شوطًا",
        other: "كسب {n} شوط",
      })}. ${record(won, drawn, lost)}`,
    finalStandings: "الترتيب النهائي",
    roundsGames: (rounds: number, games: number) =>
      `${plural("ar", rounds, {
        one: "جولة واحدة",
        two: "جولتان",
        few: "{n} جولات",
        many: "{n} جولة",
        other: "{n} جولة",
      })}، ${plural("ar", games, {
        zero: "لا مباريات",
        one: "مباراة واحدة",
        two: "مباراتان",
        few: "{n} مباريات",
        many: "{n} مباراة",
        other: "{n} مباراة",
      })}`,
    waitingRounds: "لم تُنشر الجولات بعد",
    waitingTeams: "لم تُنشر الفرق بعد",
    waitingStart: "لم تبدأ بعد",
    startsAt: (day: string, time: string) => `تبدأ ${day}، ${isolate(time)}`,
    sets: "الأشواط",
    set: (number: number) => `الشوط ${number}`,
    setInPlay: (number: number) => `الشوط ${number}، يُلعب الآن`,
    setInPlayStatus: (number: number) => `الشوط ${number} يُلعب الآن`,
    noSets: "لم يُحفظ أي شوط بعد",
    setsSaved: (count: number) =>
      plural("ar", count, {
        one: "شوط واحد",
        two: "شوطان",
        few: "{n} أشواط",
        many: "{n} شوطًا",
        other: "{n} شوط",
      }),
    facts: {
      court: "الملعب",
      pitch: "الملعب",
      started: "بدأت",
      starts: "تبدأ",
      venue: "المكان",
      group: "المجموعة",
      kickOff: "ضربة البداية",
      game: "المباراة",
      mvp: "الأفضل",
    },
    noCourt: "غير محدّد",
    levelValue: {
      temba: "تُحتسب لمستوى Temba",
      group: "تُحتسب لمستوى المجموعة",
      unrated: "غير مصنّفة",
    },
    kickedOff: (time: string) => `بدأت ${isolate(time)}`,
    kicksOff: (time: string) => `تبدأ ${isolate(time)}`,
    kickOffValue: (time: string, minutes: number) =>
      `${isolate(time)}، ${minutes} دقيقة`,
    gameValue: (sideSize: string, squad: number) =>
      `${sideSize}، ${squad} في كل فريق`,
    mvpAfter: "بعد المباراة",
    roles: {
      gk: "حارس",
      def: "دفاع",
      mid: "وسط",
      fwd: "هجوم",
    },
    scorerGoals: (goals: number) => String(goals),
  },
  errors: {
    notFound: "لا توجد لوحة مباشرة تعمل لهذه المباراة.",
    unavailable: "هذه المباراة ليس لها لوحة مباشرة.",
    closed: "انتهت هذه المباراة، فلا يمكن عرض لوحتها.",
    codesExhausted: "تعذّر إنشاء رمز للوحة. حاول مرة أخرى.",
    messageTooLong: (max: number) => `اجعل الرسالة ${max} حرفًا أو أقل.`,
    rotateSeconds: "اختر 5 أو 10 أو 20 ثانية.",
    noScreens: "لهذه اللوحة شاشة واحدة.",
    tvNotFound: "هذا التلفزيون لم يعد متصلًا.",
  },
} satisfies typeof source;
