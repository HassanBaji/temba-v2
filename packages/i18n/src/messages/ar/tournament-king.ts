import { isolate } from "../../bidi";
import { plural } from "../../plural";
import type { tournamentKing as source } from "../en/tournament-king";
import { tournamentRounds } from "./tournament-rounds";

const placeWord = tournamentRounds.shareCard.ordinal;

const teams = (n: number) =>
  plural("ar", n, {
    zero: "لا فرق",
    one: "فريق واحد",
    two: "فريقان",
    few: "{n} فرق",
    many: "{n} فريقًا",
    other: "{n} فريق",
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
const players = (n: number) =>
  plural("ar", n, {
    zero: "لا لاعبين",
    one: "لاعب واحد",
    two: "لاعبان",
    few: "{n} لاعبين",
    many: "{n} لاعبًا",
    other: "{n} لاعب",
  });

export const tournamentKing = {
  shape: {
    title: "ملك الملعب",
    description: "الفائز يصعد ملعبًا والخاسر ينزل",
  },
  create: {
    courts: "الملاعب",
    courtsMax: (max: number) => `الحد الأقصى ${max}`,
    courtsUnit: (n: number) =>
      plural("ar", n, {
        zero: "ملاعب",
        one: "ملعب",
        two: "ملعبان",
        few: "ملاعب",
        many: "ملعبًا",
        other: "ملعب",
      }),
    fewerCourts: "ملاعب أقل",
    moreCourts: "ملاعب أكثر",
    courtsHelp: (courtCount: number, teamCount: number) =>
      `يبدأ فريقان على كل ملعب، فـ${courts(courtCount)} تعني ${teams(teamCount)}. الفائز يصعد ملعبًا والخاسر ينزل، والملعب 1 هو ملعب الملك. هذا يحل محل عدد الفرق من الخطوة 2.`,
    courtsLabel: courts,
    playTime: "مدة اللعب",
    setPlayTime: "تحديد",
    hoursMinutes: (hours: number, minutes: number) =>
      minutes === 0 ? `${hours} س` : `${hours} س ${minutes} د`,
    summaryTitle: (teamCount: number, start: string, finish: string) =>
      `${teams(teamCount)}، من ${isolate(start)} إلى ${isolate(finish)}`,
    summaryCopy: (courtCount: number, duration: string) =>
      `${courts(courtCount)} لمدة ${isolate(duration)}. يسحب تمبا أي فريق يبدأ على أي ملعب. وعند النهاية ترتّب الفرق: الأول والثاني والثالث وهكذا. لا جولات تُعدّ ولا نتائج تُدخل.`,
    reviewFormat: (courtCount: number) => `ملك الملعب، ${courts(courtCount)}`,
    reviewRating: "التقييم",
    reviewRatingValue: "ودية، بلا تغيير",
  },
  court: {
    name: (court: number) => `الملعب ${court}`,
    kings: "ملعب الملك",
    bottom: "الملعب الأخير",
    yours: "ملعبك",
  },
  howItRuns: {
    title: "كيف تسير",
    meta: "ملك الملعب",
    up: "اربح واصعد ملعبًا",
    down: "اخسر وانزل",
    copy: "يبدأ فريقان على كل ملعب. من يحتفظ بالملعب 1 في النهاية هو ملك الملعب. لا جولات تُعدّ ولا نتائج تُدخل: تنشر الترتيب النهائي عند الانتهاء.",
  },
  hero: {
    perPlayer: (currency: string) => `${currency} لكل لاعب`,
    entry: "الدخول",
    statusSeated: "أنت مشارك. تُسحب ملاعب البداية عندما تمتلئ كل المقاعد.",
    statusUnseated: (seatsLeft: number, organizerFirstName: string | null) => {
      const seats =
        seatsLeft <= 0
          ? "لم يتبقَّ أي مكان."
          : plural("ar", seatsLeft, {
              one: "تبقّى مكان واحد.",
              two: "تبقّى مكانان.",
              few: "تبقّت {n} أماكن.",
              many: "تبقّى {n} مكانًا.",
              other: "تبقّى {n} مكان.",
            });
      const drawer = organizerFirstName
        ? `يسحب ${organizerFirstName} ملاعب البداية عندما تمتلئ الفرق`
        : "تُسحب ملاعب البداية عندما تمتلئ الفرق";
      return `${seats} ${drawer}.`;
    },
    teams: "فرق، فريقان لكل ملعب",
    courts: "ملاعب، الملعب 1 للملك",
    courtsLine: (courtCount: number) =>
      courtCount === 1 ? "الملعب 1" : `الملاعب من 1 إلى ${courtCount}`,
  },
  drawEntry: {
    allIn: (playerCount: number) =>
      `اكتمل ${players(playerCount)}. اسحب الملاعب`,
    someIn: (complete: number, total: number) =>
      `اكتمل ${complete} من ${teams(total)}. اسحب الملاعب`,
    copy: "أي فريق يبدأ على أي ملعب. إنها القرعة الوحيدة.",
    open: "افتح القرعة",
  },
  draw: {
    title: "ملاعب البداية",
    close: "إغلاق",
    note: (teamCount: number, courtCount: number) =>
      `${teams(teamCount)} على ${courts(courtCount)}، بالقرعة. اضغط على فريقين لتبديلهما.`,
    swapWith: (names: string) =>
      `اضغط الآن على الفريق الذي يتبادل مع ${names}.`,
    postedNote: "نُشرت. يرى كل لاعب الملعب الذي يبدأ عليه.",
    swapTag: "بدّل مع",
    swapLabel: (names: string) => `بدّل ${names}`,
    post: "انشر ملاعب البداية",
    posting: "جارٍ النشر…",
    again: "اسحب من جديد",
    footer: "النشر يغلق المقاعد ويخبر كل لاعب بملعبه.",
    posted: "نُشرت",
    postedCopy: (playerCount: number) =>
      `يرى ${players(playerCount)} أين يبدؤون`,
    change: "تغيير",
    changeLocked: "نُشر الترتيب النهائي، لذا ثبتت ملاعب البداية.",
  },
  tabs: {
    label: "أقسام البطولة",
    teams: "الفرق",
    courts: "الملاعب",
    finalOrder: "الترتيب النهائي",
  },
  lead: {
    teams: "كل فرق القرعة، فريقان لكل ملعب.",
    courts:
      "الفائز يصعد ملعبًا والخاسر ينزل. من يحتفظ بالملعب 1 في النهاية هو ملك الملعب.",
    finalOrderEmpty: "الترتيب النهائي فارغ حتى ينشره المنظّم.",
    finalOrderOrganizer:
      "انتهت. اضغط على الفرق بترتيب إنهائها: أول ضغطة هي الأول، والتالية الثاني، وهكذا.",
    finalOrderNotYet: "عند النهاية، اضغط على الفرق بترتيب إنهائها وانشره هنا.",
    finalOrderPosted: "نهائي. حدده المنظّم عند الانتهاء.",
  },
  yourCourt: {
    startOn: (team: string) => `${team} تبدآن على`,
    against: "ضد",
    winUp: "اربح لتصعد إلى",
    winStay: "اربح لتبقى على",
    loseDown: "اخسر لتنزل إلى",
    loseStay: "اخسر لتبقى على",
  },
  startingCourts: {
    changeCourts: "غيّر ملاعب البداية",
    title: "ملاعب البداية",
    meta: "الجولة الأولى فقط",
    footer:
      "بعد الجولة الأولى تتنقل الفرق بين الملاعب في يوم اللعب. يُنشر الترتيب النهائي في قسم الترتيب النهائي عند الانتهاء.",
  },
  finalOrder: {
    title: "الترتيب النهائي",
    placed: (placed: number, total: number) => `رُتّب ${placed} من ${total}`,
    nobody: "لم يُرتّب أحد بعد. اضغط على الفائزين أدناه.",
    king: "ملك الملعب",
    moveUp: (team: string) => `قدّم ${team}`,
    takeOut: (team: string) => `أخرج ${team}`,
    place: (team: string) => `رتّب ${team}`,
    stillToPlace: "بانتظار الترتيب",
    nextTap: (place: number) => `الضغطة التالية: ${placeWord(place)}`,
    unplaced: (n: number) =>
      plural("ar", n, {
        zero: "لا فرق بلا ترتيب.",
        one: "يظهر فريق واحد للاعبين بلا ترتيب.",
        two: "يظهر فريقان للاعبين بلا ترتيب.",
        few: "تظهر {n} فرق للاعبين بلا ترتيب.",
        many: "يظهر {n} فريقًا للاعبين بلا ترتيب.",
        other: "يظهر {n} فريق للاعبين بلا ترتيب.",
      }),
    clear: "مسح",
    post: "انشر الترتيب النهائي",
    posting: "جارٍ النشر…",
    placeTop: (min: number) => `رتّب أول ${min} للنشر`,
    posted: "نُشر الترتيب النهائي",
    postedCanChange: "يراه كل لاعب. يمكن تغييره خلال 24 ساعة",
    postedFinal: "يراه كل لاعب.",
    change: "تغيير",
    notPlaced: "بلا ترتيب",
    numberHeader: "#",
    teamHeader: "الفريق",
    note: "نهائي. حدده المنظّم عند الانتهاء.",
    listLabel: "الترتيب النهائي",
  },
  finished: {
    dateLine: (day: string) => `انتهت، ${day}`,
    summary: (venue: string | null, teamCount: number, courtCount: number) => {
      const size = `${teams(teamCount)}، ${courts(courtCount)}، ملك الملعب`;
      return venue ? `${venue}. ${size}` : size;
    },
    podiumLabel: "ملك الملعب وترتيبك",
    kingSmall: "ملك الملعب",
    heldCourtOne: "احتفظ بالملعب 1 في النهاية",
    placeOf: (place: number, teamCount: number) =>
      `${placeWord(place)} من ${teamCount}`,
    notPlaced: "بلا ترتيب",
    startedOn: (court: number) => `بدأ على الملعب ${court}`,
    you: (partner: string | null) => (partner ? `أنت و${partner}` : "أنت"),
  },
  card: {
    teamsCourts: (teamCount: number, courtCount: number) =>
      `${teams(teamCount)} على ${courts(courtCount)}`,
    finishedPlace: (place: number, teamCount: number) =>
      `أنهى ${placeWord(place)} من ${teamCount}`,
    notPlaced: (teamCount: number) => `بلا ترتيب من ${teamCount}`,
    toCome: "الترتيب النهائي قريبًا",
    kingOfTheCourt: "ملك الملعب:",
    finalOrder: "الترتيب النهائي",
    startedOn: (court: number) => `بدأ على الملعب ${court}`,
  },
  details: {
    scores: "النتائج",
    scoresNone: "لا شيء، المنظّم ينشر الترتيب",
    scoresPosted: "لا شيء، نشر المنظّم الترتيب",
    rating: "تُحتسب في التقييم",
    ratingNo: "لا، لا شيء يُسجَّل",
    ratingFinished: "لم تُحتسب، لم يُسجَّل شيء",
  },
  errors: {
    oddTeams: "يبدأ فريقان على كل ملعب، لذا يجب أن يكتمل عدد زوجي من الفرق.",
    courts: (min: number, max: number) =>
      `يحتاج ملك الملعب من ${min} إلى ${max} ملاعب.`,
    notKing: "هذه البطولة ليست ملك الملعب.",
    useStartingCourts: "اسحب ملاعب البداية بدلًا من ذلك.",
    cancelled: "هذه البطولة ملغاة.",
    halfTeams: (names: string) =>
      `فرق اللعب هذه ينقصها شريك: ${names}. ادمجها أو أزلها أولًا.`,
    belowMinimum: (min: number) =>
      `يجب أن يكتمل ${teams(min)} على الأقل لسحب الملاعب.`,
    wrongTeams: "ضع كل فريق مكتمل على ملعب مرة واحدة بالضبط.",
    finalOrderPosted: "نُشر الترتيب النهائي، لذا ثبتت ملاعب البداية.",
    notDrawn: "انشر ملاعب البداية أولًا.",
    notStarted: "انشر الترتيب النهائي بعد أن تبدأ البطولة.",
    placeTop: (min: number) => `رتّب أول ${min} فرق على الأقل.`,
    unknownTeams: "رتّب فرق هذه البطولة فقط، كل فريق مرة واحدة.",
    changeClosed: "لا يمكن تغيير الترتيب النهائي إلا خلال 24 ساعة.",
  },
} satisfies typeof source;
