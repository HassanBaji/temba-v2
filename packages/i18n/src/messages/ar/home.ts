import type { home as source } from "../en/home";
import { isolate } from "../../bidi";
import { plural } from "../../plural";

export const home = {
  comingUp: {
    tournamentFallback: "بطولة",
    gameFallback: "مباراة",
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
  upNextCard: {
    spoken: (title: string, day: string, time: string, place: string) =>
      `التالي، ${title}، ${day} ${time}، ${place}`,
    ended: "انتهت",
    oneOfThisWeek: (n: number) => `1 من ${n} هذا الأسبوع`,
    nothingThisWeek: "لا شيء هذا الأسبوع",
    today: "اليوم",
    sportWithGroup: (sport: string, group: string) => `${sport} ${group}`,
    to: (clock: string) => `حتى ${clock}`,
    whoIn: (filled: number, total: number) => `${filled} من ${total} حاضرون`,
    allIn: (total: number) =>
      total === 4 ? "الأربعة حاضرون" : `الجميع حاضرون (${total})`,
    scope: (parts: string[]) => parts.join("، "),
    teams: (n: number) =>
      plural("ar", n, {
        one: "فريق واحد",
        two: "فريقان",
        few: "{n} فرق",
        many: "{n} فريقًا",
        other: "{n} فريق",
      }),
    teamsAreMade: "تم تقسيم الفريقين",
    leftSide: "الجهة اليسرى",
    rightSide: "الجهة اليمنى",
    open: "شاغر",
    vs: "ضد",
    andMore: (n: number) => `و${n} آخرون`,
    playersSpoken: (names: string[]) => names.join("، "),
    teamSpoken: (team: string, names: string[]) =>
      `${team}: ${names.join("، ")}`,
    openSeatSpoken: (side: string) => `مقعد شاغر، ${side}`,
    seatSpoken: (name: string, side: string) => `${name}، ${side}`,
    positions: {
      keeperCount: (n: number, max: number) => `${n} من ${max}`,
      keeper: "حارس",
      defenders: (n: number) =>
        plural("ar", n, {
          one: "مدافع",
          two: "مدافعان",
          few: "مدافعين",
          many: "مدافعًا",
          other: "مدافع",
        }),
      mid: "وسط",
      forwards: (n: number) =>
        plural("ar", n, {
          one: "مهاجم",
          two: "مهاجمان",
          few: "مهاجمين",
          many: "مهاجمًا",
          other: "مهاجم",
        }),
    },
    step: {
      seatsLeft: (n: number) =>
        plural("ar", n, {
          one: "بقي مقعد واحد",
          two: "بقي مقعدان",
          few: "بقيت {n} مقاعد",
          many: "بقي {n} مقعدًا",
          other: "بقي {n} مقعد",
        }),
      seatLeftOnSide: (name: string) => `بقي مقعد واحد، في جهة ${name}`,
      inviteBody: "ادعُ أحدًا ليكمل العدد، أو شارك المباراة مع مجموعتك.",
      poolShort: (n: number) =>
        plural("ar", n, {
          one: "أنت مسجّل. لاعب واحد إضافي وتُقام المباراة",
          two: "أنت مسجّل. لاعبان إضافيان وتُقام المباراة",
          few: "أنت مسجّل. {n} لاعبين إضافيين وتُقام المباراة",
          many: "أنت مسجّل. {n} لاعبًا إضافيًا وتُقام المباراة",
          other: "أنت مسجّل. {n} لاعب إضافي وتُقام المباراة",
        }),
      poolShortBody: "يُقسَّم الفريقان عند اكتمال العدد.",
      poolFullOrganizer: "اكتمل العدد. حان وقت تقسيم الفريقين",
      poolFullOrganizerBody:
        "وازِن بينهما حسب المستوى والمركز، أو اخترهما بنفسك.",
      poolFull: "اكتمل العدد. التقسيم هو الخطوة التالية",
      poolFullBody: "يقسّم المنظّم الفريقين قبل انطلاق المباراة.",
      inTeam: (team: string) => `أنت في فريق ${team}`,
      inTeamAt: (team: string, where: string) =>
        `أنت في فريق ${team}، ${where}`,
      where: {
        keeper: "في حراسة المرمى",
        def: "في الدفاع",
        mid: "في الوسط",
        fwd: "في الهجوم",
      },
      shirtDark: "البس قميصًا داكنًا. التشكيلة في صفحة المباراة.",
      shirtLight: "البس قميصًا فاتحًا. التشكيلة في صفحة المباراة.",
      lineupsOnGame: "التشكيلة في صفحة المباراة.",
      beThereBy: (clock: string) => `كن هناك قبل ${clock}`,
      beThereByBody: (place: string) => `الجميع حاضرون. ${place}.`,
      playingNow: "المباراة جارية",
      playingNowBody: "أضف النتيجة بعد آخر نقطة.",
      howDidItGo: "كيف كانت المباراة؟",
      howDidItGoBody:
        "يُدخل أحد الطرفين النتيجة ويؤكدها الآخر. يتغيّر المستوى بعد التأكيد.",
      drawOut: "صدرت القرعة",
      drawOutBody: "جولاتك وملاعبك في صفحة المباراة.",
      drawPending: "بانتظار القرعة",
      drawPendingBody: "تُنشر الجولات بعد اكتمال الفرق.",
      payCourt: "أكمِل دفع الملعب",
      payCourtBody: "يبقى الحجز محفوظًا حتى يُدفع.",
      makeGame: "حوّله إلى مباراة",
      makeGameBody: "أضف لاعبين ليتمكنوا من الانضمام وتسجيل النتيجة.",
      gameSet: "مباراتك جاهزة",
      gameSetBody: "اللاعبون والنتيجة في صفحة المباراة.",
      courtBooked: "ملعبك محجوز",
      courtBookedBody: "شاركه مع من ستلعب معهم.",
    },
    action: {
      details: "التفاصيل",
      directions: "الاتجاهات",
      seeLineups: "اعرض التشكيلة",
      makeTeams: "قسّم الفريقين",
      addScore: "أضف النتيجة",
      seeRounds: "اعرض جولاتك",
    },
    allGames: "كل المباريات",
    openWeekBody: (n: number) =>
      plural("ar", n, {
        one: "مباراة واحدة في مجموعاتك فيها مكان. احجز مقعدًا، أو ابدأ مباراتك.",
        two: "مباراتان في مجموعاتك فيهما مكان. احجز مقعدًا، أو ابدأ مباراتك.",
        few: "{n} مباريات في مجموعاتك فيها مكان. احجز مقعدًا، أو ابدأ مباراتك.",
        many: "{n} مباراة في مجموعاتك فيها مكان. احجز مقعدًا، أو ابدأ مباراتك.",
        other:
          "{n} مباراة في مجموعاتك فيها مكان. احجز مقعدًا، أو ابدأ مباراتك.",
      }),
    openRowDetail: (place: string, seats: string) => `${place}، ${seats}`,
    join: "انضم",
    joinSpoken: (title: string) => `انضم إلى ${title}`,
  },
  sportSwitch: {
    spoken: (sport: string, band: string) => `${sport}، ${isolate(band)}`,
  },
  levelSection: {
    title: {
      padel: "مستوى البادل",
      football: "مستوى كرة القدم",
    },
    confirmed: "مؤكَّد",
    provisional: "مبدئي",
    level: "المستوى",
    lastN: (n: number) => `آخر ${n}`,
    nextBand: "الفئة التالية",
    nextBandValue: (percent: number) => `، قطعت ${percent}% من الطريق`,
    topBand: "أعلى فئة",
    confirmsIn: (n: number) =>
      plural("ar", n, {
        one: "مباراة مصنّفة واحدة ويتأكد مستواك.",
        two: "مباراتان مصنّفتان ويتأكد مستواك.",
        few: "{n} مباريات مصنّفة ويتأكد مستواك.",
        many: "{n} مباراة مصنّفة ويتأكد مستواك.",
        other: "{n} مباراة مصنّفة ويتأكد مستواك.",
      }),
    gaugeSpoken: (band: string, percent: number, next: string) =>
      `الفئة ${isolate(band)}، قطعت ${percent}% من الطريق إلى ${isolate(next)}`,
  },
  trend: {
    title: "الاتجاه",
    lastMatches: (n: number) =>
      plural("ar", n, {
        one: "آخر مباراة",
        two: "آخر مباراتين",
        few: "آخر {n} مباريات",
        many: "آخر {n} مباراة",
        other: "آخر {n} مباراة",
      }),
    from: (from: string) => `من ${isolate(from)} إلى `,
    matchesAgo: (n: number) =>
      plural("ar", n, {
        one: "قبل مباراة",
        two: "قبل مباراتين",
        few: "قبل {n} مباريات",
        many: "قبل {n} مباراة",
        other: "قبل {n} مباراة",
      }),
    changesAgo: (n: number) =>
      plural("ar", n, {
        one: "قبل تغيير واحد",
        two: "قبل تغييرين",
        few: "قبل {n} تغييرات",
        many: "قبل {n} تغييرًا",
        other: "قبل {n} تغيير",
      }),
    latest: "الأحدث",
    legend: {
      won: "الممتلئ فوز",
      drawn: "النصفي تعادل",
      lost: "المفرغ خسارة",
      set: "الرمادي تحديد",
    },
    legendSeparator: "، ",
    spoken: (from: string, to: string, window: string) =>
      `انتقل المستوى من ${isolate(from)} إلى ${isolate(to)}، ${window}`,
  },
  lastTen: {
    title: "آخر 10",
    oldestFirst: "الأقدم أولًا",
    won: "فوز",
    drawn: "تعادل",
    lost: "خسارة",
    percentWon: (percent: number) => `${percent}%`,
    percentWonLabel: "فوز",
    spoken: (won: number, drawn: number, lost: number) =>
      `${won} فوز، ${drawn} تعادل، ${lost} خسارة`,
  },
  stats: {
    title: "الإحصاءات",
    ratedMatches: (n: number) =>
      plural("ar", n, {
        one: "مباراة مصنّفة واحدة",
        two: "مباراتان مصنّفتان",
        few: "{n} مباريات مصنّفة",
        many: "{n} مباراة مصنّفة",
        other: "{n} مباراة مصنّفة",
      }),
    matches: (n: number) =>
      plural("ar", n, {
        one: "مباراة واحدة",
        two: "مباراتان",
        few: "{n} مباريات",
        many: "{n} مباراة",
        other: "{n} مباراة",
      }),
    winRate: "نسبة الفوز",
    played: (n: number) => `${n} لُعبت`,
    winRateAfter: (n: number) => `بعد ${n} مباريات`,
    winsInARow: "انتصارات متتالية",
    bestIs: (n: number) => `الأفضل ${n}`,
    bestRun: "أفضل سلسلة",
    winsIn: (month: string) => `انتصارات، في ${month}`,
    wins: "انتصارات",
    goals: "الأهداف",
    perGame: (value: string) => `${value} في المباراة`,
    cleanSheets: "شباك نظيفة",
    ofMatches: (n: number) =>
      plural("ar", n, {
        one: "من مباراة واحدة",
        two: "من مباراتين",
        few: "من {n} مباريات",
        many: "من {n} مباراة",
        other: "من {n} مباراة",
      }),
    unbeaten: "دون خسارة",
    tileSpoken: (label: string, value: string, caption: string) =>
      `${label} ${value}، ${caption}`,
  },
  standingSection: {
    groupsOf: (shown: number, total: number) => `${shown} من ${total} مجموعات`,
    countedGames: (n: number) =>
      plural("ar", n, {
        one: "مباراة محتسبة واحدة",
        two: "مباراتان محتسبتان",
        few: "{n} مباريات محتسبة",
        many: "{n} مباراة محتسبة",
        other: "{n} مباراة محتسبة",
      }),
    moreGroups: (n: number) =>
      plural("ar", n, {
        one: "مجموعة أخرى بلا مباريات محتسبة بعد",
        two: "مجموعتان أخريان بلا مباريات محتسبة بعد",
        few: "{n} مجموعات أخرى بلا مباريات محتسبة بعد",
        many: "{n} مجموعة أخرى بلا مباريات محتسبة بعد",
        other: "{n} مجموعة أخرى بلا مباريات محتسبة بعد",
      }),
    of: (n: number) => `من ${n}`,
  },
  latest: {
    newMarkFrom: (name: string) => `علامة جديدة من ${name}`,
    newMark: "علامة جديدة",
    line: (kind: string, game: string) => `${kind}، في ${game}`,
  },
} satisfies typeof source;
