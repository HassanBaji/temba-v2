import { plural } from "../../plural";
import type { aloneTeams as source } from "../en/alone-teams";

const players = (n: number) =>
  plural("ar", n, {
    zero: "لا لاعبين",
    one: "لاعب واحد",
    two: "لاعبان",
    few: "{n} لاعبين",
    many: "{n} لاعبًا",
    other: "{n} لاعب",
  });
const teams = (n: number) =>
  plural("ar", n, {
    zero: "لا فرق",
    one: "فريق واحد",
    two: "فريقان",
    few: "{n} فرق",
    many: "{n} فريقًا",
    other: "{n} فريق",
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

export const aloneTeams: typeof source = {
  create: {
    choice: "وحدك فقط، وأنت تكوّن الفرق",
    choiceHint: "يسجّل الجميع وحدهم. وأنت تكوّن الفرق",
    sizeHint: (teamCount: number) =>
      `${teams(teamCount)} من لاعبَين، ${players(teamCount * 2)}. يسجّل اللاعبون واحدًا تلو الآخر، ثم تجمعهم في ثنائيات وتنشر الفرق.`,
    review: "وحدك فقط، وأنت تكوّن الفرق",
    feeNote:
      "يدفع كل لاعب حصته، لأن لا أحد يدخل كفريق. الصفر يعني مجانًا. تمبا لا تحصّل المدفوعات.",
  },
  hero: {
    teamsLater: "فرق، تُكوَّن لاحقًا",
    seatsWaiting: "تُكوَّن الفرق عند الاكتمال",
    seatsReady: "مكتمل، جاهز للفرق",
    seatsPosted: "مكتمل، جاهز للقرعة",
    tag: "فردي",
  },
  card: {
    playersIn: (registered: number, cap: number) =>
      plural("ar", cap, {
        one: `${registered} من لاعب واحد مشارك`,
        two: `${registered} من لاعبَين مشاركَين`,
        few: `${registered} من {n} لاعبين مشاركين`,
        many: `${registered} من {n} لاعبًا مشاركًا`,
        other: `${registered} من {n} لاعب مشارك`,
      }),
    noPlayersYet: "لا لاعبين بعد",
  },
  players: {
    title: "اللاعبون",
    count: (n: number, cap: number) => `${n} من ${cap}`,
    openSeat: "مكان شاغر",
    you: "أنت",
    note: "قائمة واحدة باللاعبين. لا فريق تختاره ولا أحد تُحضره: المنظّم يجمع الجميع في ثنائيات في النهاية.",
    organizerNote:
      "سجّل الجميع وحدهم. تكوين الفرق هو الخطوة التالية، ولا تُفتح القرعة إلا بعد نشرها.",
    waitingTitle: "بانتظار شريك",
    waitingNote:
      "ليس في فريق بعد. يأخذ مكانًا حين يُفتح واحد، أو ينقله المنظّم من تعديل الفرق.",
  },
  waiting: {
    title: "الفرق",
    body: (cap: number) =>
      `يكوّنها المنظّم بعد أن تُحجز الأماكن الـ${cap} كلها. تسجّل وحدك ويُختار لك شريك. ثم تأتي القرعة.`,
    scheduleAfter: "بعد الفرق والقرعة",
  },
  organizerCard: {
    allIn: (n: number) => `اكتمل الـ${n}. كوّن الفرق`,
    someIn: (n: number, cap: number) => `${n} من ${cap} سجّلوا. كوّن الفرق`,
    body: "اجمعهم حسب المستوى أو يدويًا، ثم انشر.",
    action: "تكوين الفرق",
    needMore: (min: number, n: number) =>
      `يُفتح تكوين الفرق عند ${players(min)}. سجّل ${n} حتى الآن.`,
  },
  join: {
    title: "احجز مكانًا",
    body: "تسجّل وحدك. حين تكتمل الأماكن يجمع المنظّم الجميع في ثنائيات وينشر الفرق.",
    side: "الجهة",
    optional: "اختياري",
    left: "يسار",
    right: "يمين",
    either: "أي جهة",
    sideHint:
      "يرى المنظّم هذا عند تكوين الثنائيات، ليجمع لاعب يسار مع لاعب يمين.",
    partner: "شريكك",
    partnerValue: "يختاره المنظّم",
    submit: "احجز مكانًا",
    submitWithSide: (side: string) => `احجز مكانًا، ${side}`,
    footer: "سجّل وحدك",
    seatsLeft: (n: number) =>
      plural("ar", n, {
        zero: "لا أماكن متبقية",
        one: "مكان واحد متبقٍ",
        two: "مكانان متبقيان",
        few: "{n} أماكن متبقية",
        many: "{n} مكانًا متبقيًا",
        other: "{n} مكان متبقٍ",
      }),
  },
  make: {
    eyebrow: "المنظّم",
    title: "تكوين الفرق",
    intro: (n: number) =>
      `${players(n)} سجّلوا وحدهم. اجمعهم في ثنائيات ثم انشر. القرعة بعد ذلك.`,
    balance: "توازن حسب المستوى",
    shuffle: "خلط",
    balancedNote: (spread: string) =>
      `متوازنة حسب المستوى: الفرق متقاربة بفارق ${spread}.`,
    sidesNote: "في كل ثنائي لاعب يسار ولاعب يمين.",
    shuffledNote: "خُلطت عشوائيًا. اختر التوازن حسب المستوى للعودة.",
    editedNote: "عُدّلت يدويًا. اختر التوازن حسب المستوى للبدء من جديد.",
    columnNumber: "#",
    columnLeft: "يسار",
    columnRight: "يمين",
    columnAverage: "المعدل",
    legend:
      "يظهر لكل لاعب مستواه والجهة التي طلبها. المعدل هو مستوى الثنائي، و«٢ ي» أو «٢ م» تعني أن الاثنين طلبا الجهة نفسها.",
    sideShortLeft: "ي",
    sideShortRight: "م",
    sameSide: (side: string) => `٢ ${side}`,
    swapHint: "اضغط على لاعبَين لتبديلهما.",
    swapSelected: (name: string) => `اخترت ${name}. اضغط على لاعب آخر للتبديل.`,
    unplaced: (name: string) =>
      `سجّل ${name} أخيرًا وينتظر في القائمة لاعبًا آخر.`,
    noLevel: "–",
    post: "انشر الفرق",
    postAgain: "انشر الفرق مجددًا",
    postNote: (n: number) =>
      `النشر يُخبر الـ${n} جميعًا بشركائهم. ثم تُفتح القرعة.`,
    postAgainNote: "النشر مجددًا يستبدل الفرق ويُخبر الجميع بشركائهم.",
    posted: "نُشرت الفرق",
    close: "إغلاق",
    tooFew: (min: number) => `تكوين الفرق يحتاج ${players(min)} مسجّلين.`,
  },
  posted: {
    organizerTitle: "نُشرت الفرق. اسحب قرعة المجموعة",
    organizerTitleKnockout: "نُشرت الفرق. اسحب قرعة الأدوار الإقصائية",
    organizerTitleKing: "نُشرت الفرق. اسحب ملاعب البداية",
    organizerBody: "عشوائية، بلا تصنيف. ثم كوّن الجولات بطريقتك.",
    openDraw: "افتح القرعة",
    share: "شارك الفرق",
    makeAgain: "كوّن الفرق مجددًا",
    teamsTitle: "الفرق",
    teamsMadeByYou: (n: number, total: number) =>
      `${n} من ${total}، كوّنتها أنت`,
    teamsComplete: (n: number, total: number) => `${n} من ${total} مكتملة`,
    playerTitle: (partner: string) => `أنت مع ${partner}`,
    playerBody: (viewerSide: "left" | "right", partner: string) =>
      viewerSide === "left"
        ? `كوّن المنظّم الفرق. أنت على اليسار و${partner} على اليمين. القرعة هي التالية.`
        : `كوّن المنظّم الفرق. أنت على اليمين و${partner} على اليسار. القرعة هي التالية.`,
    playerBodyNoSide: "كوّن المنظّم الفرق. القرعة هي التالية.",
    playerWaitingTitle: "بانتظار شريك",
    playerWaitingBody:
      "نشر المنظّم الفرق والعدد فردي. تأخذ مكانًا حين يُفتح واحد.",
    pairName: (left: string, right: string) => `${left} و${right}`,
    yourTeam: "فريقك",
    full: "مكتمل",
    andMore: (n: number) =>
      plural("ar", n, {
        zero: "ولا شيء آخر",
        one: "وفريق آخر، مكتمل",
        two: "وفريقان آخران، مكتملان",
        few: "و{n} فرق أخرى، كلها مكتملة",
        many: "و{n} فريقًا آخر، كلها مكتملة",
        other: "و{n} فريق آخر، كلها مكتملة",
      }),
    listNote: (n: number) => `كوّنها المنظّم من ${players(n)} سجّلوا وحدهم.`,
    lockNote:
      "لاعب اليسار أولًا في كل ثنائي. يمكن تعديل الفرق حتى نشر القرعة، ثم تُقفل كأي سوشيال.",
  },
  share: {
    title: "شارك الفرق",
    done: "تم",
    story: "قصة",
    square: "مربع",
    text: "نص",
    brand: "TEMBA",
    eyebrow: "الفرق / بادل / سوشيال",
    theTeams: "الفرق",
    meta: (
      group: string | null,
      teamCount: number,
      roundCount: number | null,
    ) =>
      [group, teams(teamCount), roundCount ? rounds(roundCount) : null]
        .filter(Boolean)
        .join(" / "),
    storySize: "1080 × 1920 / قصة",
    squareSize: "1080 × 1080 / مربع",
    showLevels: "أظهر المستويات",
    showLevelsHint: "يضيف معدل كل ثنائي. عند الإيقاف، الأسماء فقط",
    storyNote: (n: number) =>
      `${teams(n)} في صورة واحدة، لقصة أو حالة. لا أحد مميّز.`,
    squareNote: "لمحادثة المجموعة. لا أحد مميّز.",
    textNote:
      "قائمة مرقّمة تلصقها في محادثة المجموعة، حيث يعلن أغلب المنظّمين الفرق.",
    shareImage: "شارك الصورة",
    save: "حفظ",
    copyLink: "انسخ الرابط",
    message: "رسالة",
    copyText: "انسخ النص",
    copied: "نُسخ",
    shareFailed: "تعذّرت المشاركة. جرّب الحفظ بدلًا من ذلك.",
    textTitle: (game: string) => `${game}: الفرق`,
    textLine: (n: number, left: string, right: string) =>
      `${n}. ${left} و${right}`,
    textLineLevel: (n: number, left: string, right: string, level: string) =>
      `${n}. ${left} و${right} (${level})`,
    imageAlt: (game: string) => `فرق ${game}`,
  },
  detail: {
    signUp: "التسجيل",
    signUpValue: "فردي، والمنظّم يكوّن الفرق",
  },
  errors: {
    americano: "في الأمريكانو يسجّل الجميع وحدهم أصلًا.",
    partnerOnly: "اختر وحدك فقط أو مع شريك فقط، لا الاثنين.",
    notAloneOnly: "المنظّم لا يكوّن الفرق في هذا السوشيال.",
    sideOnlyAloneOnly:
      "لا يُطلب اختيار الجهة إلا في سوشيال يكوّن فيه المنظّم الفرق.",
    sideOnlySignUpAlone:
      "لا يُطلب اختيار الجهة إلا في سوشيال يسجّل فيه الجميع وحدهم.",
    partnerRegistration:
      "يسجّل الجميع وحدهم في هذا السوشيال. المنظّم يكوّن الفرق.",
    teamsFirst: "انشر الفرق قبل القرعة.",
    drawPosted: "نُشرت القرعة. استخدم تعديل الفرق بدلًا من ذلك.",
    tooFewPairs: (min: number) => `كوّن ${teams(min)} على الأقل.`,
    tooManyPairs: (max: number) => `يتسع هذا السوشيال لـ${teams(max)}.`,
    playerTwice: "لاعب موجود في فريقين.",
    notOnGame: "أحد اللاعبين في هذه الفرق غير مسجّل.",
    leftOut: "يحتاج كل لاعب إلى فريق، إلا لاعبًا واحدًا حين يكون العدد فرديًا.",
    cancelled: "أُلغي هذا السوشيال.",
  },
};
