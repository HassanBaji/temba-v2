import { isolate } from "../../bidi";
import { plural } from "../../plural";
import type { tournamentAmericano as source } from "../en/tournament-americano";
import { tournamentRounds } from "./tournament-rounds";

const placeWord = tournamentRounds.shareCard.ordinal;

const players = (n: number) =>
  plural("ar", n, {
    zero: "لا لاعبين",
    one: "لاعب واحد",
    two: "لاعبان",
    few: "{n} لاعبين",
    many: "{n} لاعبًا",
    other: "{n} لاعب",
  });
const rounds = (n: number) =>
  plural("ar", n, {
    zero: "لا جولات",
    one: "جولة واحدة",
    two: "جولتان",
    few: "{n} جولات",
    many: "{n} جولة",
    other: "{n} جولة",
  });
const games = (n: number) =>
  plural("ar", n, {
    zero: "لا أشواط",
    one: "شوط واحد",
    two: "شوطان",
    few: "{n} أشواط",
    many: "{n} شوطًا",
    other: "{n} شوط",
  });
const matches = (n: number) =>
  plural("ar", n, {
    zero: "لا مباريات",
    one: "مباراة واحدة",
    two: "مباراتان",
    few: "{n} مباريات",
    many: "{n} مباراة",
    other: "{n} مباراة",
  });
const courts = (n: number) =>
  plural("ar", n, {
    zero: "لا ملاعب",
    one: "ملعب واحد",
    two: "ملعبان",
    few: "{n} ملاعب",
    many: "{n} ملعبًا",
    other: "{n} ملعب",
  });
const partners = (n: number) =>
  plural("ar", n, {
    zero: "لا شركاء",
    one: "شريك واحد",
    two: "شريكان",
    few: "{n} شركاء",
    many: "{n} شريكًا",
    other: "{n} شريك",
  });
const wins = (n: number) =>
  plural("ar", n, {
    zero: "لا فوز",
    one: "فوز واحد",
    two: "فوزان",
    few: "{n} انتصارات",
    many: "{n} انتصارًا",
    other: "{n} انتصار",
  });
const draws = (n: number) =>
  plural("ar", n, {
    zero: "لا تعادل",
    one: "تعادل واحد",
    two: "تعادلان",
    few: "{n} تعادلات",
    many: "{n} تعادلًا",
    other: "{n} تعادل",
  });
const losses = (n: number) =>
  plural("ar", n, {
    zero: "لا خسارة",
    one: "خسارة واحدة",
    two: "خسارتان",
    few: "{n} خسارات",
    many: "{n} خسارة",
    other: "{n} خسارة",
  });

function record(won: number, drawn: number, lost: number) {
  return [wins(won), drawn > 0 ? draws(drawn) : null, losses(lost)]
    .filter(Boolean)
    .join("، ");
}

export const tournamentAmericano = {
  chip: "أمريكانو",
  shape: {
    title: "أمريكانو",
    description: "سجّل وحدك، وشريك جديد في كل جولة",
  },
  create: {
    players: "اللاعبون",
    playersUnit: (n: number) =>
      plural("ar", n, {
        zero: "لاعبين",
        one: "لاعب",
        two: "لاعبان",
        few: "لاعبين",
        many: "لاعبًا",
        other: "لاعب",
      }),
    fewerPlayers: "لاعبون أقل",
    morePlayers: "لاعبون أكثر",
    playersHelp: (courtCount: number) =>
      `فرادى، كل أربعة معًا. ${courts(courtCount)}، ولا أحد ينتظر.`,
    rounds: "الجولات",
    roundsUnit: (n: number) =>
      plural("ar", n, {
        zero: "جولات",
        one: "جولة",
        two: "جولتان",
        few: "جولات",
        many: "جولة",
        other: "جولة",
      }),
    fewerRounds: "جولات أقل",
    moreRounds: "جولات أكثر",
    roundsHelp: (roundCount: number, max: number) =>
      `${partners(roundCount)} لكل لاعب. ${max} تعني أن يلعب الجميع مع الجميع.`,
    headerPlayers: (n: number) =>
      plural("ar", n, {
        zero: "لاعبين",
        one: "لاعب",
        two: "لاعبان",
        few: "لاعبين",
        many: "لاعبًا",
        other: "لاعب",
      }),
    headerGames: matches,
    summaryTitle: (gameCount: number, start: string, finish: string) =>
      `${matches(gameCount)}، من ${isolate(start)} إلى ${isolate(finish)}`,
    summaryCopy: (
      roundCount: number,
      courtCount: number,
      matchMinutes: number,
    ) =>
      `${rounds(roundCount)}، ${matches(courtCount)} في كل جولة على ${courts(courtCount)}، ${matchMinutes} دقيقة للمباراة، متتالية. جدول واحد للاعبين في النهاية، بترتيب الأشواط المكسوبة.`,
    noCourts:
      "سجّل ملعبًا واحدًا على الأقل في الخطوة 2: تُوزَّع الجولات على الملاعب.",
    waitsForCourts: (recorded: number, needed: number) =>
      `سُجّل ${courts(recorded)} لـ${matches(needed)} في الجولة، لذا تنتظر بعض المباريات ملعبًا متاحًا.`,
    finishTooLate:
      "تتجاوز الجولات آخر وقت انتهاء في اليوم. اختر بداية أبكر أو جولات أقل أو مباريات أقصر.",
    reviewFormat: (roundCount: number) => `أمريكانو، ${rounds(roundCount)}`,
    reviewPlayers: (n: number) => `${players(n)}، فرادى`,
    pricePerPlayer: (price: string) =>
      `يدفع كل لاعب ${isolate(price)} د.ب عن نفسه، فلا أحد يدخل كفريق.`,
    levelCopy: "الأمريكانو لا يغيّر مستوى أحد، فلا بأس باختلاف المستويات.",
    rating: "التقييم",
    ratingValue: "ودّي، بلا تغيير",
  },
  hero: {
    players: "لاعبون، فرادى",
    rounds: (matchMinutes: number) => `جولات من ${matchMinutes} دقيقة`,
    perPlayer: (currency: string) => `${currency} لكل لاعب`,
    entry: "الدخول",
    seats: (taken: number, total: number) => `${taken} من ${total} مقعدًا`,
    seatsFull: "اكتملت، جاهزة للجولات",
    seatsOpen: "تُعدّ الجولات عندما تكتمل",
    courtsLine: (courtCount: number) =>
      courtCount === 1 ? "الملعب 1" : `الملاعب من 1 إلى ${courtCount}`,
  },
  drawEntry: {
    allIn: (n: number) => `اكتمل الـ${n}. أعدّ الجولات`,
    someIn: (n: number, total: number) => `${n} من ${total}. أعدّ الجولات`,
    copy: "شريك جديد في كل جولة.",
    open: "أعدّ الجولات",
    waitingTitle: "الجولات",
    waitingCopy: (total: number) =>
      `تُعدّ عندما تمتلئ المقاعد الـ${total}. يتغيّر شريكك في كل جولة، لذا تسجّل نفسك فقط.`,
  },
  players: {
    title: "اللاعبون",
    count: (taken: number, total: number) => `${taken} من ${total}`,
    openSeat: "مقعد متاح",
    footOrganizer:
      "سجّل الجميع فرادى. لا فرق تُكوَّن: يتغيّر الشركاء في كل جولة.",
    footPlayer:
      "لا فريق ولا جهة تختارها. خذ مقعدًا ويعطيك تمبا شريكًا لكل جولة.",
  },
  waitlist: {
    title: "قائمة الانتظار",
    count: (n: number) =>
      plural("ar", n, {
        zero: "لا أحد ينتظر",
        one: "واحد ينتظر",
        two: "اثنان ينتظران",
        few: "{n} ينتظرون",
        many: "{n} ينتظرون",
        other: "{n} ينتظرون",
      }),
    foot: "عندما يتوفر مقعد، يأخذه اللاعب التالي في الدور.",
  },
  schedule: {
    title: "الجدول",
    meta: "الشركاء بعد القرعة",
    roundShort: (n: number) => `ج${n}`,
    copy: (roundCount: number, matchMinutes: number, courtCount: number) =>
      `${rounds(roundCount)} من مباريات ${matchMinutes} دقيقة، ${courts(courtCount)} في وقت واحد، وشريك جديد في كل جولة. يفوز باليوم صاحب أكثر الأشواط المكسوبة.`,
  },
  join: {
    seatsLeft: (n: number) =>
      n <= 0
        ? "لم يتبقَّ مقعد"
        : plural("ar", n, {
            one: "تبقّى مقعد واحد",
            two: "تبقّى مقعدان",
            few: "تبقّت {n} مقاعد",
            many: "تبقّى {n} مقعدًا",
            other: "تبقّى {n} مقعد",
          }),
    copy: "سجّل وحدك.",
    copyWithPrice: (price: string) =>
      `سجّل وحدك. ${isolate(price)} د.ب لكل لاعب`,
    takeSeat: "خذ مقعدًا",
    taking: "جارٍ أخذ المقعد…",
    joinWaitlist: "انضم إلى قائمة الانتظار",
    leave: "اترك المقعد",
  },
  details: {
    organizer: "المنظّم",
    group: "المجموعة",
    format: "النظام",
    formatValue: (roundCount: number) => `أمريكانو، ${rounds(roundCount)}`,
    scores: "النتائج",
    scoresValue: "يُدخلها أحد الزوجين ويؤكدها الآخر",
    rating: "تُحتسب في التقييم",
    ratingValue: "لا، إنها ودّية",
  },
  draw: {
    title: "الجولات",
    lead: (playerCount: number, roundCount: number, gameCount: number) =>
      `${players(playerCount)}، ${rounds(roundCount)}، ${matches(gameCount)}. يحصل كل لاعب على ${partners(roundCount)}، كلهم مختلفون. هذه الجولة 1: اضغط على لاعبين لتبديلهما.`,
    round: (n: number) => `الجولة ${n}`,
    of: (total: number) => `من ${total}`,
    when: (time: string, courtsLine: string) =>
      `${isolate(time)}، ${courtsLine}`,
    court: (n: number) => `الملعب ${n}`,
    vs: "ضد",
    make: (roundCount: number) =>
      roundCount === 1 ? "أعدّ الجولة" : `أعدّ الجولات الـ${roundCount}`,
    making: "جارٍ إعداد الجولات…",
    shuffle: "اخلط من جديد",
    foot: "إعداد الجولات يغلق المقاعد. ويبقى بإمكانك تبديل اللاعبين في أي جولة لم تبدأ.",
    notInFours: (n: number) =>
      `مسجّل ${players(n)}. تحتاج الجولات لاعبين بمضاعفات الأربعة، فأزل لاعبًا أو انتظر المزيد.`,
    belowMinimum: (min: number) =>
      `يلزم ${players(min)} على الأقل لإعداد الجولات.`,
    fewerRounds: (roundCount: number, planned: number) =>
      `بهذا العدد من اللاعبين، ${rounds(roundCount)} تعني أن يلعب الجميع مع الجميع، فتحصل على ${roundCount} من ${planned} مخطط لها.`,
    posted: "أُعدّت الجولات. يرى كل لاعب شركاءه.",
    selected: (name: string) => `${name}، مختار للتبديل`,
  },
  tabs: {
    label: "أقسام الأمريكانو",
    players: "اللاعبون",
    rounds: "الجولات",
    standings: "الترتيب",
  },
  lead: {
    players: "سجّل الجميع فرادى. يتغيّر الشركاء في كل جولة.",
    rounds:
      "يُدخل أحد الزوجين النتيجة ويؤكدها الآخر. يمكن للمنظّمين إدخال أي مباراة أو تصحيحها.",
    roundsOrganizer: (roundCount: number) =>
      `أُعدّت ${rounds(roundCount)}. يحصل كل لاعب على ${partners(roundCount)}، كلهم مختلفون. يمكنك إدخال أي نتيجة أو تصحيحها، وتبديل اللاعبين في جولة لم تبدأ.`,
    standings:
      "جدول واحد للاعبين بترتيب الأشواط المكسوبة. كل شوط يكسبه زوجك يُحتسب لكليكما.",
  },
  progress: {
    roundOnCourt: (n: number, total: number) => `الجولة ${n} من ${total}`,
    onCourt: "في الملعب",
    played: (n: number) =>
      plural("ar", n, {
        zero: "لم تُلعب أي جولة",
        one: "لُعبت جولة واحدة",
        two: "لُعبت جولتان",
        few: "لُعبت {n} جولات",
        many: "لُعبت {n} جولة",
        other: "لُعبت {n} جولة",
      }),
    allPlayed: "لُعبت كلها",
  },
  yourGame: {
    onCourt: (n: number, total: number) =>
      `الجولة ${n} من ${total}، في الملعب الآن`,
    next: (n: number, total: number) => `الجولة ${n} من ${total}، التالية`,
    you: (partner: string) => `أنت و${partner}`,
    against: "ضد",
  },
  round: {
    title: (n: number) => `الجولة ${n}`,
    short: (n: number) => `ج${n}`,
    onCourt: (time: string, scored: number, total: number) =>
      `${isolate(time)}، في الملعب. ${scored} من ${total} أُدخلت`,
    played: (time: string) => `${isolate(time)}، لُعبت`,
    next: (time: string) => `${isolate(time)}، التالية`,
    later: (time: string, gameCount: number) =>
      `${isolate(time)}، ${matches(gameCount)}`,
    enterScore: "أدخل النتيجة",
    fixScore: "صحّح النتيجة",
    confirm: "أكّد",
    toConfirm: "بانتظار التأكيد",
    onCourtNow: "في الملعب",
    notFinished: "لم تكتمل",
    swap: "بدّل لاعبين",
    swapDone: "تم",
    swapHint: (n: number) =>
      `الجولة ${n}: اضغط على لاعبين لتبديلهما. لا يحصل أحد على الشريك نفسه مرتين.`,
    swapped: "بُدّل اللاعبان.",
    swapFoot:
      "للتبديل، افتح جولة واضغط على لاعبين. يحفظ تمبا القاعدة: لا يحصل أحد على الشريك نفسه مرتين.",
  },
  score: {
    gamesEach: (pair: string, gamesWon: number) =>
      `${games(gamesWon)} لكلٍّ من ${pair}`,
    otherGets: (pair: string, gamesWon: number) =>
      `ينال ${pair} ${games(gamesWon)} لكل منهما. الأشواط المكسوبة هي ما يرتّبك، فزت أم خسرت.`,
  },
  table: {
    place: "#",
    player: "اللاعب",
    played: "ل",
    difference: "+/−",
    gamesWon: "أش",
    you: "(أنت)",
    live: "أش هي الأشواط المكسوبة، و+/− هي المكسوبة ناقص المفقودة. عند التعادل: فارق الأشواط، ثم المباريات المكسوبة.",
    final: "نهائي. بترتيب الأشواط المكسوبة، ثم فارق الأشواط.",
    empty: "لا نتائج بعد. يمتلئ الجدول كلما تأكدت المباريات.",
  },
  yourRounds: {
    title: "جولاتك",
    meta: (gameCount: number) =>
      `${matches(gameCount)}، ${partners(gameCount)}`,
    finishedTitle: "مبارياتك",
    finishedMeta: (gamesFor: number, gamesAgainst: number) =>
      `${games(gamesFor)} لك، ${gamesAgainst} عليك`,
    with: (name: string) => `مع ${name}`,
    versus: (names: string) => `ضد ${names}`,
    won: (n: number) => `الجولة ${n}، فوز`,
    drawn: (n: number) => `الجولة ${n}، تعادل`,
    lost: (n: number) => `الجولة ${n}، خسارة`,
    onCourt: (n: number, court: string) => `الجولة ${n}، في الملعب، ${court}`,
    upcoming: (n: number) => `الجولة ${n}`,
    when: (time: string, court: string) => `${isolate(time)}، ${court}`,
  },
  finished: {
    eyebrow: (date: string) => `انتهت، ${date}`,
    sub: (
      venue: string | null,
      playerCount: number,
      roundCount: number,
      group: string | null,
    ) =>
      [venue, `${players(playerCount)}، ${rounds(roundCount)}`, group]
        .filter(Boolean)
        .join(". "),
    wonTheDay: "فاز باليوم",
    winnerLine: (gamesWon: number, won: number, drawn: number, lost: number) =>
      `${games(gamesWon)} مكسوبة. ${record(won, drawn, lost)}`,
    you: "أنت",
    yourPlace: (place: number, gamesWon: number) =>
      `${tournamentRounds.finished.place(place)}، ${games(gamesWon)} مكسوبة`,
    yourRecord: (won: number, drawn: number, lost: number, behind: number) =>
      behind > 0
        ? `${record(won, drawn, lost)}. متأخر بـ${games(behind)}`
        : record(won, drawn, lost),
    share: "شارك يومك",
  },
  played: {
    finished: (place: number, of: number) =>
      `أنهى ${placeWord(place)} من ${of}`,
    toCome: "النتائج قريبًا",
    sub: (
      venue: string | null,
      playerCount: number,
      roundCount: number,
      matchMinutes: number,
    ) =>
      [
        venue,
        `${players(playerCount)}، ${rounds(roundCount)} من ${matchMinutes} دقيقة`,
      ]
        .filter(Boolean)
        .join(". "),
    you: "أنت",
    youLine: (gamesWon: number, partnerCount: number) =>
      `${games(gamesWon)} مكسوبة، ${partners(partnerCount)}`,
    wonBy: (name: string, gamesWon: number) =>
      `فاز ${name}، ${games(gamesWon)}`,
    standings: "الترتيب",
  },
  share: {
    ofPlayers: (n: number) => `من ${players(n)}`,
    record: (gamesWon: number, won: number, drawn: number, lost: number) =>
      `${games(gamesWon)} مكسوبة. ${record(won, drawn, lost)}`,
    gamesWon: (n: number) => `${n} أش`,
  },
  mobile: {
    webOnly: "إعداد الجولات وتبديل اللاعبين وإدخال النتائج على الويب حاليًا.",
  },
  undo: {
    action: "تراجع عن الجولات",
    locked: "تراجع عن الجولات (ليس بعد وصول نتيجة)",
    confirmTitle: "التراجع عن الجولات؟",
    confirmCopy:
      "تُحذف كل الجولات ويمكنك إعدادها من جديد. تبقى المقاعد مغلقة حتى تعيد فتحها.",
    confirmLabel: "تراجع عن الجولات",
    done: "أُلغيت الجولات",
  },
  errors: {
    players: (min: number, max: number) =>
      `للأمريكانو من ${min} إلى ${max} لاعبًا، بمضاعفات الأربعة.`,
    rounds: (max: number) => `اختر من 1 إلى ${max} جولة.`,
    notAmericano: "هذا السوشيال ليس أمريكانو.",
    cancelled: "هذا السوشيال ملغى.",
    roundsMade: "أُعدّت الجولات بالفعل.",
    notInFours: (n: number) =>
      `مسجّل ${players(n)}. تحتاج الجولات لاعبين بمضاعفات الأربعة.`,
    belowMinimum: (min: number) =>
      `يلزم ${players(min)} على الأقل لإعداد الجولات.`,
    wrongPlayers: "تغيّر اللاعبون أثناء إعداد الجولات. افتح الصفحة من جديد.",
    noRounds: "لم تُعدّ الجولات بعد.",
    undoAfterScore: "لا يمكن التراجع عن الجولات بعد وصول نتيجة.",
    roundNotFound: "هذه الجولة ليست في هذا السوشيال.",
    roundStarted: "لهذه الجولة نتيجة. بدّل اللاعبين في جولة لم تبدأ.",
    samePlayer: "اختر لاعبين مختلفين للتبديل.",
    playerNotInRound: "يجب أن يلعب اللاعبان كلاهما في تلك الجولة.",
    repeatsPartner: (first: string, second: string) =>
      `هذا التبديل يجمع ${first} و${second} مرة ثانية. لا يحصل أحد على الشريك نفسه مرتين.`,
    kickAfterRounds:
      "أُعدّت الجولات، فكل لاعب موجود في كل جولة. بدّل اللاعبين في جولة بدلًا من ذلك.",
    useMakeRounds: "يُعدّ الأمريكانو جولاته من اللاعبين. استخدم أعدّ الجولات.",
    recordCourts:
      "سجّل ملعبًا واحدًا على الأقل في هذا السوشيال قبل إعداد الجولات.",
    courtsRequired:
      "سجّل ملعبًا واحدًا على الأقل: تُوزَّع الجولات على الملاعب.",
    windowTooShort: (finish: string) =>
      `تحتاج الجولات حتى ${isolate(finish)}. أخّر وقت الانتهاء أو سجّل ملاعب أكثر أو العب جولات أقل.`,
    roundsOverrun:
      "تتجاوز الجولات نهاية هذا السوشيال. سجّل ملاعب أكثر أو أخّر وقت الانتهاء.",
  },
} satisfies typeof source;
