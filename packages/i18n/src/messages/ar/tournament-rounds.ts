import { plural } from "../../plural";
import type { tournamentRounds as source } from "../en/tournament-rounds";

const games = (count: number) =>
  plural("ar", count, {
    zero: "لا مباريات",
    one: "مباراة واحدة",
    two: "مباراتان",
    few: "{n} مباريات",
    many: "{n} مباراة",
    other: "{n} مباراة",
  });
const rounds = (count: number) =>
  plural("ar", count, {
    one: "جولة واحدة",
    two: "جولتان",
    few: "{n} جولات",
    many: "{n} جولة",
    other: "{n} جولة",
  });
const teams = (count: number) =>
  plural("ar", count, {
    zero: "لا فرق",
    one: "فريق واحد",
    two: "فريقان",
    few: "{n} فرق",
    many: "{n} فريقًا",
    other: "{n} فريق",
  });
const points = (count: number) =>
  plural("ar", count, {
    zero: "0 نقاط",
    one: "نقطة واحدة",
    two: "نقطتان",
    few: "{n} نقاط",
    many: "{n} نقطة",
    other: "{n} نقطة",
  });

export const tournamentRounds = {
  tabs: {
    label: "أقسام البطولة",
    teams: "الفرق",
    rounds: "الجولات",
    standings: "الترتيب",
    bracket: "خروج المغلوب",
  },
  organizerChip: "المنظّم",
  lead: {
    teams: "كل فرق القرعة، حسب المجموعة.",
    roundsEmpty: (roundCount: number, gamesPerRound: number) =>
      `يلعب الجميع ${rounds(roundCount)} في كل منها ${games(gamesPerRound)}.`,
    roundsDrafted: (count: number) =>
      `${rounds(count)} في المسودة. بدّل أي مواجهة وتبقى البقية صحيحة. لم يُنشر شيء بعد.`,
    roundsOrganizer:
      "يمكنك إدخال أي نتيجة أو تصحيحها، وصنع الجولة التالية متى شئت.",
    roundsPlayer:
      "يُدخل أحد الفريقين النتيجة ويؤكّدها الآخر. يستطيع المنظّمون إدخال أي نتيجة أو تصحيحها.",
    points: "النقاط: الفوز 3، التعادل 1.",
  },
  progress: {
    roundOf: (round: number, total: number) => `الجولة ${round} من ${total}`,
    onCourt: "في الملعب",
    played: (count: number) => `لُعبت ${count}`,
    notStarted: "لم تُنشر أي جولة بعد",
    stripLabel: (played: number, total: number) =>
      `لُعبت ${played} من ${total} جولات`,
  },
  ways: {
    prompt: "كيف تريد أن تصنع الجولات؟",
    generateAllTitle: (count: number) =>
      count === 1 ? "اصنع الجولة" : `اصنع كل الجولات (${count})`,
    generateAllBody:
      "دوري كامل دفعة واحدة. بدّل أي مواجهة أو ملعب أو وقت قبل النشر.",
    generateAllNext: "مسودات أولًا، لم يُنشر شيء بعد",
    oneAtATimeTitle: "جولة بجولة",
    oneAtATimeBody:
      "الجولة 1 الآن، والجولة 2 حين تصل النتائج. مناسب حين تنسحب فرق أو تتأخر.",
    oneAtATimeNext: "الجولة 1 كمسودة، لم يُنشر شيء بعد",
    byHandTitle: "رتّبها بنفسك",
    byHandBody:
      "جولة 1 فارغة. اضغط فريقين لتصنع مباراة، ويتذكّر Temba من لعب مع من.",
    byHandNext: "جولة 1 فارغة، لم يُنشر شيء بعد",
    courts: "الملاعب",
    courtsValue: (count: number) =>
      count === 1 ? "ملعب واحد" : `من 1 إلى ${count}، كلها معًا`,
    slot: "الفترة",
    slotValue: (minutes: number, time: string) =>
      `${minutes} دقيقة، من ${time}`,
    points: "النقاط",
    pointsValue: "الفوز 3، التعادل 1، الخسارة 0",
    afterGroup: (poolCount: number): string =>
      poolCount === 1 ? "بعد المجموعة" : "بعد المجموعات",
    footer:
      "أيًا كان اختيارك، يمكن تعديل كل جولة حتى تبدأ مبارياتها، ويمكنك تغيير الطريقة لاحقًا. لا يرى اللاعبون الجولة إلا بعد نشرها.",
    continue: "متابعة",
    continuing: "جارٍ العمل…",
  },
  round: {
    code: (round: number) => `ج${round}`,
    title: (round: number) => `الجولة ${round}`,
    games,
    draft: "مسودة",
    posted: "منشورة",
    onCourt: "في الملعب",
    played: "لُعبت",
    scoresIn: (scored: number, total: number) => `وصلت ${scored} من ${total}`,
    expand: (round: number) => `اعرض الجولة ${round}`,
    collapse: (round: number) => `أخفِ الجولة ${round}`,
    roundRobin: (count: number) => `دوري، ${rounds(count)}`,
    regenerate: "أعد الصنع",
    regenerating: "جارٍ إعادة الصنع…",
    swap: "بدّل",
    swapFor: (team: string) => `بدّل منافس ${team}`,
    enterScore: "أدخل النتيجة",
    enterScoreFor: (team1: string, team2: string) =>
      `أدخل نتيجة ${team1} ضد ${team2}`,
    edit: "عدّل",
    editFor: (team1: string, team2: string) =>
      `غيّر نتيجة ${team1} ضد ${team2}`,
    confirm: "أكّد",
    waiting: "بانتظار التأكيد",
    notFinished: "لم تكتمل",
    notPlayed: "لم تُلعب",
    notYet: "لم تبدأ بعد",
    vs: "ضد",
    postFirst: (round: number) => `انشر الجولة ${round} وأبقِ البقية مسودات`,
    postOne: (round: number) => `انشر الجولة ${round}`,
    postAll: (count: number) =>
      count === 1 ? "انشر الجولة" : `انشر كل الجولات (${count})`,
    posting: "جارٍ النشر…",
    postFooter:
      "نشر الجولة يصنع مبارياتها. تبقى المسودات قابلة للتعديل ولا يراها اللاعبون.",
    complete: (round: number, total: number) =>
      `اكتملت الجولة ${round}، وصلت ${total} من ${total} نتائج`,
    completeLine: "تحدّث الترتيب.",
  },
  notMade: {
    title: (round: number) => `الجولة ${round}، لم تُصنع بعد`,
    meta: (time: string) => `${time}. الأفضل صنعها بعد اكتمال الجولة السابقة`,
    generate: (round: number) => `اصنع الجولة ${round}`,
    generating: "جارٍ الصنع…",
    pairMyself: "سأرتّبها بنفسي",
    generateRest: "اصنع الباقي",
    note: "تتجنّب الجولات المصنوعة التكرار، ومن الجولة 3 تجمع الفرق المتقاربة في النقاط ليبقى اليوم متقاربًا.",
    later: (from: number, to: number) =>
      from === to
        ? `تظهر الجولة ${from} هنا بعد أن ينشرها المنظّم.`
        : `تظهر الجولات من ${from} إلى ${to} هنا بعد أن ينشرها المنظّم.`,
    laterShort: (from: number, to: number) =>
      from === to
        ? `الجولة ${from}، لاحقًا`
        : `الجولات ${from} إلى ${to}، لاحقًا`,
  },
  repeats: {
    line: (round: number, pair: string) =>
      `يلتقي ${pair} مجددًا في الجولة ${round}`,
  },
  swap: {
    title: (round: number, court: string) => `الجولة ${round}، ${court}`,
    lead: (team: string, opponent: string) =>
      `اختر منافسًا جديدًا لـ ${team}. يأخذ ${opponent} مكان الفريق الذي تختاره.`,
    chooseBelow: "اختر بالأسفل",
    teamsInRound: (round: number) => `فرق الجولة ${round}`,
    consequence: (court: string, displaced: string, opponent: string) =>
      `${court}، يلعب ${displaced} ضد ${opponent}`,
    note: "تُعاد مواجهات الجولات اللاحقة كي لا يلتقي أحد مرتين. إن تعذّر ذلك سترى الجولة المكرّرة قبل التأكيد.",
    repeats: "يترك هذا التبديل تكرارًا:",
    confirm: "بدّلهما",
    swapping: "جارٍ التبديل…",
  },
  pair: {
    title: (round: number) => `الجولة ${round}`,
    lead: "اضغط فريقين لتصنع مباراة. تذهب الفرق إلى أول ملعب متاح.",
    gamesIn: (round: number) => `مباريات الجولة ${round}`,
    made: (made: number, total: number) => `صُنعت ${made} من ${total}`,
    pickBelow: "اختر بالأسفل",
    removeGame: (team1: string, team2: string) => `فكّ ${team1} ضد ${team2}`,
    freeTeams: "فرق متاحة",
    left: (count: number, court: string | null) =>
      court ? `بقي ${count}، اضغط واحدًا لـ ${court}` : `بقي ${count}`,
    points,
    notPlayed: "لم يلعبا معًا",
    playedIn: (round: number) => `لعبا في الجولة ${round}`,
    otherPool: "مجموعة أخرى",
    note: "الفرق التي لعبت معًا رمادية وليست مخفية. تظهر النقاط لتُبقي المباريات متقاربة أو تمزجها.",
    post: (round: number, left: number) =>
      left > 0
        ? `انشر الجولة ${round}، بقيت ${games(left)}`
        : `انشر الجولة ${round}`,
    fillRest: "أكمل الباقي",
    filling: "جارٍ الإكمال…",
  },
  score: {
    title: (round: number, court: string) => `الجولة ${round}، ${court}`,
    lead: (minutes: number, opponents: string) =>
      `الأشواط المكسوبة في ${minutes} دقيقة. يؤكّد ${opponents} بضغطة؛ وإن لم يفعلوا خلال 10 دقائق تُعتمد.`,
    leadOrganizer: (minutes: number) =>
      `الأشواط المكسوبة في ${minutes} دقيقة. بصفتك المنظّم، نتيجتك نهائية.`,
    games: "أشواط",
    you: "(أنت)",
    fewer: (team: string) => `شوط أقل لـ ${team}`,
    more: (team: string) => `شوط أكثر لـ ${team}`,
    gamesFor: (team: string, count: number) => `${team}: ${count}`,
    youWin: "تفوز، 3 نقاط",
    youLose: "تخسر هذه، 0 نقاط",
    draw: "تعادل، نقطة لكل فريق",
    teamWins: (team: string) => `يفوز ${team}، 3 نقاط`,
    otherGetsNothing: (team: string) =>
      `يحصل ${team} على 0. التعادل نقطة لكل فريق.`,
    drawLine: "يحصل كل فريق على نقطة.",
    countsForRating: "تُحتسب في التصنيف",
    didntFinish: "لم تكتمل",
    marking: "جارٍ التسجيل…",
    save: (score: string) => `احفظ ${score}`,
    saving: "جارٍ الحفظ…",
  },
  confirm: {
    title: (name: string, score: string) => `أدخل ${name} النتيجة ${score}`,
    lead: (round: number, court: string, name: string, time: string) =>
      `الجولة ${round}، ${court}. أكّدها، أو صحّحها ليؤكّدها ${name} بدلًا منك. تُعتمد وحدها عند ${time}.`,
    confirm: (score: string) => `أكّد ${score}`,
    confirming: "جارٍ التأكيد…",
    correct: "صحّحها",
    cantAgree: "لم تتفقا؟ يستطيع أي منكما سؤال المنظّم، وهو يحدد أي نتيجة.",
  },
  standings: {
    team: "الفريق",
    played: "لعب",
    won: "فاز",
    drawn: "تعادل",
    lost: "خسر",
    points: "نقاط",
    playedLong: "لعب",
    wonLong: "فاز",
    drawnLong: "تعادل",
    lostLong: "خسر",
    pointsLong: "النقاط",
    throughLine: "يتأهل إلى خروج المغلوب",
    winner: "بطل المجموعة",
    ties: "عند التساوي: المواجهة المباشرة، ثم الفوز ناقص الخسارة، ثم فارق الأشواط.",
    drawOrder: "لم يُلعب شيء بعد، فهذا ترتيب القرعة. يترتّب بعد أول النتائج.",
  },
  yourRounds: {
    title: "جولاتك",
    meta: (played: number, total: number) => `لُعبت ${played} من ${total}`,
    won: (round: number) => `الجولة ${round}، فوز`,
    lost: (round: number) => `الجولة ${round}، خسارة`,
    drawn: (round: number) => `الجولة ${round}، تعادل`,
    onCourt: (round: number, court: string) =>
      `الجولة ${round}، في الملعب الآن، ${court}`,
    waiting: (round: number) => `الجولة ${round}، بانتظار التأكيد`,
    notFinished: (round: number) => `الجولة ${round}، لم تكتمل`,
    at: (round: number, time: string) => `الجولة ${round}، ${time}`,
    later: (from: number, to: number) =>
      from === to
        ? `الجولة ${from} بعد أن ينشرها المنظّم`
        : `الجولات من ${from} إلى ${to} بعد أن ينشرها المنظّم`,
  },
  teams: {
    pool: (label: string, count: number) => `${label}، ${teams(count)}`,
  },
  draw: {
    lead: (teamCount: number, poolCount: number, roundCount: number) =>
      `${teams(teamCount)}، ${poolCount === 1 ? "مجموعة واحدة" : `${poolCount} مجموعات`}، ${rounds(roundCount)}. قرعة عشوائية، لا تصنيف لأحد.`,
    post: "انشر القرعة ثم اصنع الجولات",
    footer: "النشر يغلق المقاعد. الجولات تأتي بعدها، على طريقتك.",
  },
  undo: {
    action: "تراجع عن القرعة",
    locked: "تراجع عن القرعة (ليس بعد وصول نتيجة)",
  },
  loadFailed: "تعذّر تحميل الجولات",
} satisfies typeof source;
