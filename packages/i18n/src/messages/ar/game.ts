import { isolate } from "../../bidi";
import { plural } from "../../plural";
import type { game as source } from "../en/game";

export const game = {
  action: {
    joinGame: "انضم إلى المباراة",
    editGame: "تعديل المباراة",
    cancelGame: "إلغاء المباراة",
    leaveGame: "مغادرة المباراة",
    leaveWaitlist: "مغادرة قائمة الانتظار",
    registerTeam: "تسجيل الفريق",
    cancelMatch: "إلغاء المباراة",
    completeMatch: "إنهاء المباراة",
    markAsNotPlayed: "تعليمها كأنها لم تُلعب",
    reportWrongScore: "الإبلاغ عن نتيجة خاطئة",
    kick: "إخراج",
    closeRegistration: "إغلاق التسجيل",
    reopenRegistration: "إعادة فتح التسجيل",
  },
  consequence: {
    cannotBeUndone: "لا يمكن التراجع عن هذا.",
    leaveGame: "يصبح مكانك شاغرًا لغيرك.",
    leaveGameOrganizer: "أنت المنظّم. تبقى منظّم المباراة بعد أن تترك مكانك.",
    closeRegistration: "لن يتمكن أحد من الانضمام بعد الآن.",
    leaveWaitlist: "ستفقد مكانك في قائمة الانتظار.",
    markAsNotPlayed: "لن تُسجَّل أي نتيجة ولن يتغير مستوى أحد.",
    reportWrongScore: "سيُطلب من اللاعبين مراجعة النتيجة مرة أخرى.",
    reportWrongScoreLocked:
      "وجود مباراة مصنّفة لاحقة يعني أنه لا يمكن تصحيح هذا هنا. تواصل مع الدعم لإصلاحه.",
    completeMatch: "تصبح النتيجة نهائية ويتحدّث تصنيف كل لاعب بناءً عليها.",
    cancelNobodyJoined: "لم ينضم أحد بعد.",
    cancelRemovesFromCalendar: (n: number) =>
      `تُحذف من تقويم كل المسجّلين (${n}).`,
  },
  setLabel: (n: number) => `الشوط ${n}`,
  setShortLabel: (n: number) => `ش${n}`,
  toast: {
    joined: "انضممت إلى المباراة",
    joinedWaitlist: "انضممت إلى قائمة الانتظار",
    teamRegistered: "تم تسجيل الفريق",
    teamJoinedWaitlist: "انضم الفريق إلى قائمة الانتظار",
    seatChanged: "تم تغيير المكان",
    halfTeamsMerged: "تم دمج أنصاف الفرق",
    poolsDrawn: "تمت قرعة المجموعات",
    poolDrawPosted: "نُشرت قرعة المجموعات",
    poolDrawUndone: "أُلغيت قرعة المجموعات",
    knockoutDrawn: "تمت قرعة خروج المغلوب",
    knockoutDrawPosted: "نُشرت القرعة",
    knockoutDrawUndone: "أُلغيت القرعة",
    left: "غادرت المباراة",
    leftWaitlist: "غادرت قائمة الانتظار",
    registrationClosed: "أُغلق التسجيل",
    registrationReopened: "أُعيد فتح التسجيل",
    gameCancelled: "أُلغيت المباراة",
    matchCancelled: "أُلغيت المباراة",
  },
  kickedToast: (name: string) => `تم إخراج ${name}`,
  cta: {
    joining: "جارٍ الانضمام…",
    browseOpenGames: "تصفّح المباريات المفتوحة",
    joinWaitlist: "انضم إلى قائمة الانتظار",
    join: "انضم",
    youreIn: "أنت في التشكيلة",
    inviteAPlayer: "ادعُ لاعبًا",
    addTheScore: "أضف النتيجة",
    countsOnceOthersConfirm: "تُحتسب بعد تأكيد الآخرين",
    addResult: "إضافة النتيجة",
    levelUpdated: "تم تحديث المستوى",
    shareResult: "مشاركة النتيجة",
    waitlistLine: (place: number, ordinal: string) =>
      `أنت في المرتبة ${place} في قائمة الانتظار`,
    vacantSeatLineLive: (n: number) =>
      plural("ar", n, {
        one: "بدأت المباراة وينقص لاعب واحد",
        two: "بدأت المباراة وينقص لاعبان",
        few: "بدأت المباراة وينقص {n} لاعبين",
        many: "بدأت المباراة وينقص {n} لاعبًا",
        other: "بدأت المباراة وينقص {n} لاعب",
      }),
    vacantSeatLine: (n: number) =>
      plural("ar", n, {
        one: "ينقص لاعب واحد",
        two: "ينقص لاعبان",
        few: "ينقص {n} لاعبين",
        many: "ينقص {n} لاعبًا",
        other: "ينقص {n} لاعب",
      }),
    levelUpdatedLine: (band: string, level: string) =>
      `${band} · ${level} بعد هذه المباراة`,
  },
  joinSheet: {
    playWith: (name: string) => `ستلعب مع ${name}`,
    partnerSpotOpen: "مكان شريكك ما زال شاغرًا — يمكن لأي شخص أخذه",
    everySpotTaken: "كل الأماكن في هذه المباراة محجوزة",
    oneSpotOpen: "بقي مكان واحد شاغر. اضغط عليه لتأخذه",
    spotsOpen: (open: number, total: number) =>
      `الأماكن الشاغرة: ${open} من ${total}. اضغط على أحدها لتأخذه`,
    howToJoin: "كيف تريد الانضمام؟",
    howToJoinDescription:
      "مكانان في الجهة نفسها شاغران، فيمكنك أخذ واحد بمفردك أو إحضار شخص والتسجيل كفريق.",
    gameIsFull: "المباراة ممتلئة",
    pickYourSpot: "اختر مكانك",
    joinAlone: {
      title: "انضم بمفردك",
      description: "مكان واحد. يأخذ شخص آخر المكان الثاني.",
      note: "تنضم فورًا",
      accessibleName: "انضم بمفردك. مكان واحد. يأخذ شخص آخر المكان الثاني.",
    },
    joinWithPartner: {
      title: "انضم مع شريك",
      description: "كلا المكانين. تلعبان كفريق.",
      note: "يُحجز المكانان الآن",
      accessibleName:
        "انضم مع شريك. كلا المكانين. تلعبان كفريق. يُحجز المكانان الآن؛ شريكك ينضم فورًا.",
    },
    partnerPicker: {
      title: "اختر شريكًا",
      description: "تسجّل المكانين معًا. شريكك ينضم فورًا.",
      footnote: "لا يُحجز أي مكان حتى تسجّل الفريق.",
    },
    partnerReview: {
      title: "تسجيل الفريق",
      yourTeam: "فريقك",
      keepSides: "إبقاء الجهات",
      swapSides: "تبديل الجهات",
      register: "سجّلنا كفريق",
      footnote: "يُحجز المكانان فورًا. شريكك مشارك الآن.",
    },
    continueWith: (name: string) => `تابع مع ${name}`,
  },
  partner: {
    joinUnavailableToast: "لم تعد هذه المباراة مفتوحة للانضمام مع شريك",
    vacantSideRaceMessage:
      "أُخذت تلك الجهة أثناء تسجيلك. انضم بمفردك، أو اختر شريكًا آخر إن كانت هناك جهة ما زالت شاغرة بالكامل.",
    alreadyInGame: "مشارك في هذه المباراة بالفعل",
    onTheWaitlist: "في قائمة الانتظار",
    outsideLevelRange: "خارج نطاق مستوى هذه المباراة",
    playsLeft: "يلعب يسارًا",
    playsRight: "يلعب يمينًا",
    playsEitherSide: "يلعب في أي جهة",
    gamesTogether: (n: number) =>
      plural("ar", n, {
        one: "مباراة واحدة معًا",
        two: "مباراتان معًا",
        few: "{n} مباريات معًا",
        many: "{n} مباراة معًا",
        other: "{n} مباراة معًا",
      }),
    metaWithHistory: (head: string, together: string) => `${head}. ${together}`,
    ineligibleButton: (name: string, meta: string) => `${name}. ${meta}`,
    select: (name: string) => `اختر ${name}`,
    seatsOpen: (n: number) =>
      plural("ar", n, {
        one: "مكان واحد شاغر",
        two: "مكانان شاغران",
        few: "{n} أماكن شاغرة",
        many: "{n} مكانًا شاغرًا",
        other: "{n} مكان شاغر",
      }),
    whenLine: (day: string, time: string, meridiem: string | null) =>
      `${day}، ${time}${meridiem ? ` ${meridiem}` : ""}`,
    reviewLineWhenVenue: (when: string, venue: string) =>
      `${when} في ${venue}. مكانان، واحد لكل منكما.`,
    reviewLineWhen: (when: string) => `${when}. مكانان، واحد لكل منكما.`,
    reviewLineVenue: (venue: string) => `مكانان في ${venue}، واحد لكل منكما.`,
    reviewLine: "مكانان، واحد لكل منكما.",
    leftSeat: "المكان الأيسر",
    rightSeat: "المكان الأيمن",
    levelAndSeat: (band: string, seat: string) => `${band}، ${seat}`,
    organizer: "المنظّم",
    pricePerPlayer: "السعر لكل لاعب",
    priceEach: (price: string) => `${price} لكل لاعب`,
    countsForRating: "يُحتسب في التصنيف",
    yesAsAPair: "نعم، كثنائي",
    levelFit: (range: string) => `${range}، كلاكما ضمن النطاق`,
  },
  chrome: {
    pickup: "مباراة حرة",
    group: "مجموعة",
    yourePlaying: "أنت تلعب",
    youreOnTheWaitlist: "أنت في قائمة الانتظار",
    paidAtTheVenue: "يُدفع في النادي",
    players: (n: number) =>
      plural("ar", n, {
        one: "لاعب واحد",
        two: "لاعبان",
        few: "{n} لاعبين",
        many: "{n} لاعبًا",
        other: "{n} لاعب",
      }),
    playersOf: (n: number, cap: number) =>
      plural("ar", cap, {
        one: `${n} من لاعب واحد`,
        two: `${n} من لاعبَين`,
        few: `${n} من {n} لاعبين`,
        many: `${n} من {n} لاعبًا`,
        other: `${n} من {n} لاعب`,
      }),
    dateDuration: (date: string, minutes: number) =>
      `${date} · ${minutes} دقيقة`,
  },
  occupancy: {
    spotsLeft: (n: number) =>
      plural("ar", n, {
        one: "بقي مكان واحد",
        two: "بقي مكانان",
        few: "بقيت {n} أماكن",
        many: "بقي {n} مكانًا",
        other: "بقي {n} مكان",
      }),
    full: "ممتلئة",
    spotsOpen: (n: number) =>
      plural("ar", n, {
        one: "مكان واحد شاغر",
        two: "مكانان شاغران",
        few: "{n} أماكن شاغرة",
        many: "{n} مكانًا شاغرًا",
        other: "{n} مكان شاغر",
      }),
  },
  hero: {
    ratedMatch: "مباراة مصنّفة",
    duration: "المدة",
    wonBy: "الفوز بـ",
    noScore: "لا نتيجة",
    nobodyAddedOne: "لم يضفها أحد بعد",
    price: "السعر",
    seatsBooked: "الأماكن محجوزة",
    dateLine: (date: string, time: string, trailer: string | null) =>
      `${date}، ${time}${trailer ? ` ${trailer}` : ""}`,
    durationShort: (minutes: number) => `${minutes} د`,
  },
  organizer: {
    userFallback: "مستخدم",
  },
  players: {
    left: "يسار",
    right: "يمين",
    moveTo: (side: string, position: string) => `انتقل إلى ${side} ${position}`,
    joinSeat: (side: string, position: string) =>
      `انضم إلى ${side} ${position}`,
    joinSeatWith: (side: string, position: string, partner: string) =>
      `انضم إلى ${side} ${position} مع ${partner}`,
    cancelledNote: "أُلغيت هذه المباراة. يبقى الجالسون مدرجين.",
    leftSeat: "المكان الأيسر",
    rightSeat: "المكان الأيمن",
    seatWithLevel: (seat: string, band: string) =>
      `${seat} — المستوى ${isolate(band)}`,
    openLeftSeat: "مكان أيسر شاغر",
    openRightSeat: "مكان أيمن شاغر",
    inviteToLeftSeat: (side: string) => `دعوة إلى ${side}، يسار`,
    inviteToRightSeat: (side: string) => `دعوة إلى ${side}، يمين`,
  },
  results: {
    matchCancelled: "أُلغيت المباراة",
    matchDraw: "تعادل في المباراة",
    teamWon: (team: string) => `فاز ${team}`,
    matchCompleted: "اكتملت المباراة",
    needsAScore: "تحتاج إلى نتيجة",
  },
  score: {
    incompleteMessage: "أدخل الجيمات المكسوبة لكلا الفريقين",
    organizerConfirmNote: "بصفتك المنظّم، تأكيدك يجعل النتيجة نهائية.",
    open: "مفتوح",
    pairNames: (left: string, right: string) =>
      `${isolate(left)} و${isolate(right)}`,
    wonSet: (label: string, games: number) =>
      `${label}: ${games} جيم، فاز بهذا الشوط`,
    lostSet: (label: string, games: number) =>
      `${label}: ${games} جيم، خسر هذا الشوط`,
    entered: (label: string, games: number) => `${label}: ${games}`,
    notEntered: (label: string) => `${label}: لم تُدخل بعد`,
    confirmedByOrganizer: "أكّدها المنظّم. لا حاجة إلى شيء آخر.",
    confirmedByAllOn: (date: string) =>
      `أكّدها اللاعبون الأربعة في ${date}. لا حاجة إلى شيء آخر.`,
    confirmedByAll: "أكّدها اللاعبون الأربعة. لا حاجة إلى شيء آخر.",
    noScoreYet:
      "لا نتيجة بعد. يمكن لأي لاعب شارك إضافتها. يؤكدها الثلاثة الآخرون قبل أن تُحتسب في مستواك.",
    scoringOpens:
      "يُفتح تسجيل النتيجة عند امتلاء الملعب. املأ المكان الأخير وستتمكن من إدخال النتيجة بعد المباراة.",
    player: "لاعب",
    youSuffix: (name: string) => `${name} (أنت)`,
    confirmed: "تم التأكيد",
    waiting: "في الانتظار",
    organizerWaiting: (team: string) => `في انتظار تأكيد المنظّم عن ${team}.`,
  },
  kick: {
    fallbackName: "هذا اللاعب",
    spotConfirm: "يمكن أن يُفتح مكانه لشخص آخر.",
    afterDrawConfirm: "تُلغى مباريات فريقه التي لم تُلعب.",
    waitlistConfirm: "يفقد مكانه في قائمة الانتظار.",
    title: (name: string) => `إخراج ${name}؟`,
    waitlistTitle: (name: string) => `إخراج ${name} من قائمة الانتظار؟`,
  },
  rating: {
    unratedGameLine: "هذه المباراة لا تغيّر مستوى أحد.",
    unratedGroupLine:
      "المباريات في هذه المجموعة غير مصنّفة. لا تغيّر مستوى أحد.",
    stillProvisional: (band: string, remaining: number) =>
      `ما زلت ${band}. ${plural("ar", remaining, {
        one: "نحو مباراة مصنّفة واحدة أخرى ويتأكد مستواك.",
        two: "نحو مباراتين مصنّفتين أخريين ويتأكد مستواك.",
        few: "نحو {n} مباريات مصنّفة أخرى ويتأكد مستواك.",
        many: "نحو {n} مباراة مصنّفة أخرى ويتأكد مستواك.",
        other: "نحو {n} مباراة مصنّفة أخرى ويتأكد مستواك.",
      })}`,
    stillConfirmed: (band: string) =>
      `ما زلت ${band}. مستواك مؤكد — يتحرك مع كل مباراة مصنّفة تلعبها.`,
    increasedBy: (magnitude: string) => `ارتفع المستوى بمقدار ${magnitude}`,
    decreasedBy: (magnitude: string) => `انخفض المستوى بمقدار ${magnitude}`,
    unchanged: "المستوى دون تغيير",
  },
  card: {
    registered: "تم التسجيل",
    register: "تسجيل",
    view: "عرض",
    details: "التفاصيل",
  },
  share: {
    ratedMatch: "مباراة مصنّفة",
    friendlyMatch: "مباراة ودية",
    padelTypeLine: "ودية · بادل",
    footballTypeLine: (sideSize: string | null) =>
      sideSize ? `ودية · كرة القدم · ${sideSize}` : "ودية · كرة القدم",
    setLabel: (n: number) => `الشوط ${n}`,
    draw: "تعادل",
    stickerWin: (winners: string, won: number, lost: number) =>
      `${winners} يفوزون ${won}–${lost}`,
    when: (day: string, time: string) => `${day}، ${time}`,
    padelResult: "🎾 نتيجة بادل",
    drew: (first: string, second: string) => `🤝 تعادل ${first} و${second}`,
    beat: (winners: string, losers: string, won: number, lost: number) =>
      `🏆 ${winners} تغلّبوا على ${losers} ${won}–${lost}`,
    footballResult: "⚽ نتيجة كرة القدم",
  },
  hubEmpty: {
    noGamesYet: "لا مباريات بعد",
    noHistoryYet: "لا سجل مباريات بعد",
    historyCopy: "تظهر هنا المباريات المكتملة التي شاركت فيها.",
    played: "لُعبت",
    won: "فوز",
    lost: "خسارة",
    line: "تظهر هنا المباريات التي تنشئها أو تنضم إليها.",
    sportLine: (sport: string) =>
      `تظهر هنا مباريات ${sport} التي تنشئها أو تنضم إليها.`,
  },
  court: {
    joinSubline: "اختر جهتك بعد ذلك",
    addPlayerHint: "اضغط على مكان شاغر لإضافة لاعب فيه.",
    open: "شاغر",
    full: "الملعب ممتلئ",
    spotsOpen: (n: number) =>
      plural("ar", n, {
        zero: "لا أماكن شاغرة",
        one: "مكان واحد شاغر",
        two: "مكانان شاغران",
        few: "{n} أماكن شاغرة",
        many: "{n} مكانًا شاغرًا",
        other: "{n} مكان شاغر",
      }),
    left: "يسار",
    right: "يمين",
    seatNameYou: (name: string) => `${name} (أنت)`,
    seatMeta: (position: string, band: string) =>
      `${position}، ${isolate(band)}`,
    figurePlayers: "اللاعبون",
    figureDuration: "المدة",
    figurePerPlayer: "للاعب الواحد",
    figurePrice: "السعر",
    figurePriceNotSet: "غير محدد",
    scoreLockedFull: "أدخل النتيجة بعد المباراة.",
    scoreLockedOpen: "يُفتح عندما يمتلئ الملعب. أدخل النتيجة بعد المباراة.",
    pair: (left: string, right: string) => `${left} و${right}`,
    sets: (n: number) =>
      plural("ar", n, {
        one: "شوط واحد",
        two: "شوطان",
        few: "{n} أشواط",
        many: "{n} شوطًا",
        other: "{n} شوط",
      }),
    bestOfSets: (n: number) =>
      plural("ar", n, {
        one: "الأفضل من شوط واحد",
        two: "الأفضل من شوطين",
        few: "الأفضل من {n} أشواط",
        many: "الأفضل من {n} شوطًا",
        other: "الأفضل من {n} شوط",
      }),
    decider: (set: number, score: string) =>
      `الشوط ${set} فقط إذا كانت النتيجة ${score}.`,
    levelAt: (tally: string) => `تعادل ${tally}`,
    yourTeam: "فريقك",
    leads: (team: string, tally: string) => `${team} متقدم ${tally}`,
    trails: (team: string, tally: string) => `${team} متأخر ${tally}`,
  },
  history: {
    openSeats: "أماكن شاغرة",
    nameSeparator: "، ",
    namesMore: (named: string, rest: number) =>
      `${named} ${isolate(`+${rest}`)}`,
    place: (venue: string, name: string) => `${venue} · ${name}`,
    meta: (day: string, place: string) => `${day}، ${place}`,
    withUnrated: (base: string, unrated: string) => `${base} · ${unrated}`,
    noScore: "لا توجد نتيجة بعد",
    setsTally: (won: number, lost: number) => `${won}–${lost} في الأشواط`,
    yourTeamWon: "فريقك، فاز",
    yourTeam: "فريقك",
    lost: "خسر",
    won: "فاز",
    drew: "تعادل",
  },
  resultMark: {
    won: "فوز",
    lost: "خسارة",
    draw: "تعادل",
    notPlayed: "لم تُلعب",
  },
  played: {
    word: { won: "فوز", lost: "خسارة", draw: "تعادل" },
    tag: { won: "فوز", lost: "خسارة", draw: "تعادل" },
    padel: "بادل",
    seatCode: { left: "يسار", right: "يمين" },
    playedOn: (date: string) => `لُعبت، ${date}`,
    played: "لُعبت",
    minutes: (n: number) => `${n} دقيقة`,
    friendlyNoRating: "ودية، لا تُحتسب في التصنيف",
    countsForRating: "تُحتسب في التصنيف",
    ratingMovesUp: (band: string) =>
      `تُحتسب في التصنيف، ${isolate(band)} يرتفع`,
    ratingMovesDown: (band: string) =>
      `تُحتسب في التصنيف، ${isolate(band)} ينخفض`,
    ratingHolds: (band: string) => `تُحتسب في التصنيف، ${isolate(band)} يثبت`,
    open: "مفتوح",
    pair: (first: string, second: string) =>
      `${isolate(first)} و${isolate(second)}`,
    winInSets: (winners: string, won: number, lost: number) =>
      `${winners} يفوزون ${won}–${lost} في الأشواط`,
    drawLevel: "تعادل، الجهتان متساويتان",
    noResult: "لا نتيجة",
    playedWith: (name: string) => `لعبت مع ${isolate(name)}`,
    playedAlone: "لعبت بمفردك",
    yourPair: "ثنائيك",
    opponents: "الخصوم",
    group: "المجموعة",
    confirmed: "التأكيد",
    byTheOrganizer: "من المنظّم",
    byBothPairs: "من كلا الثنائيين",
    format: "الصيغة",
    sets: (n: number) =>
      plural("ar", n, {
        one: "شوط واحد",
        two: "شوطان",
        few: "{n} أشواط",
        many: "{n} شوطًا",
        other: "{n} شوط",
      }),
    countsForRatingLabel: "يُحتسب في التصنيف",
    goals: (n: number) =>
      plural("ar", n, {
        one: "هدف واحد",
        two: "هدفان",
        few: "{n} أهداف",
        many: "{n} هدفًا",
        other: "{n} هدف",
      }),
    winBy: (winner: string, margin: number) =>
      `${winner} يفوزون بفارق ${margin}`,
    avg: (level: string) => `متوسط ${level}`,
    playedCodeFor: (code: string, team: string) =>
      `لعبت بمركز ${code} مع ${team}`,
    playedFor: (team: string) => `لعبت مع ${team}`,
    score: "النتيجة",
    enteredBy: (name: string) => `أدخلها ${isolate(name)}`,
    byBothSides: "من كلا الجانبين",
    teams: "الفرق",
    bibs: "الصدريات",
    bibsLine: (first: string, second: string) =>
      `${first} و${second}، يحضرها المنظّم`,
  },
  window: {
    name: (weekday: string, start: string, finish: string) =>
      `${weekday}، ${start} – ${finish}`,
    fallbackTitle: "مباراة",
  },
} satisfies typeof source;
