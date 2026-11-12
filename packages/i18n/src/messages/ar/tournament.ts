import { isolate } from "../../bidi";
import { plural } from "../../plural";
import type { tournament as source } from "../en/tournament";

function teamsWord(n: number) {
  return plural("ar", n, {
    zero: "لا فرق",
    one: "فريق واحد",
    two: "فريقان",
    few: "{n} فرق",
    many: "{n} فريقًا",
    other: "{n} فريق",
  });
}

function byesWord(n: number) {
  return plural("ar", n, {
    one: "إعفاء واحد",
    two: "إعفاءان",
    few: "{n} إعفاءات",
    many: "{n} إعفاءً",
    other: "{n} إعفاء",
  });
}

function roundsWord(n: number) {
  return plural("ar", n, {
    one: "جولة واحدة",
    two: "جولتان",
    few: "{n} جولات",
    many: "{n} جولة",
    other: "{n} جولة",
  });
}

function matchesWord(n: number) {
  return plural("ar", n, {
    one: "مباراة واحدة",
    two: "مباراتين",
    few: "{n} مباريات",
    many: "{n} مباراة",
    other: "{n} مباراة",
  });
}

export const tournament = {
  gameTeam: "فريق",
  position: {
    left: "يسار",
    right: "يمين",
    leftLower: "اليسار",
    rightLower: "اليمين",
  },
  listSeparator: "، ",
  listAnd: (first: string, second: string) =>
    `${isolate(first)} و${isolate(second)}`,
  knockout: {
    final: "النهائي",
    semiFinals: "نصف النهائي",
    quarterFinals: "ربع النهائي",
    roundOf: (teamsLeft: number) => `دور الـ${teamsLeft}`,
    semiFinal: "نصف النهائي",
    quarterFinal: "ربع النهائي",
    startFinal: "النهائي",
    startSemis: "نصف النهائي",
    startQuarters: "ربع النهائي",
    startRoundOf: (teamsLeft: number) => `دور الـ${teamsLeft}`,
    label: {
      final: "النهائي",
      semi: (position: number) => `نصف النهائي ${position}`,
      quarter: (position: number) => `ربع النهائي ${position}`,
      round: (teamsLeft: number, position: number) =>
        `دور الـ${teamsLeft} – ${position}`,
    },
    short: {
      final: "النهائي",
      semi: (position: number) => `نصف ${position}`,
      quarter: (position: number) => `ربع ${position}`,
      round: (teamsLeft: number, position: number) =>
        `د${teamsLeft} – ${position}`,
    },
    winnerOf: (label: string) => `الفائز في ${label}`,
    byeCount: (n: number) => byesWord(n),
    onward: (roundName: string) => `من ${roundName} فصاعدًا`,
    onwardWithByes: (roundName: string, byeCount: number) =>
      `من ${roundName} فصاعدًا. ${byesWord(byeCount)}`,
    throughFromEachGroup: "المتأهلون من كل مجموعة",
    qualifierUnit: (n: number) =>
      plural("ar", n, {
        one: "فريق",
        two: "فريقان",
        few: "فرق",
        many: "فريقًا",
        other: "فريق",
      }),
    intoKnockout: (teamCount: number) =>
      `${teamsWord(teamCount)} إلى خروج المغلوب.`,
    intoKnockoutWithByes: (teamCount: number, byeCount: number) =>
      `${teamsWord(teamCount)} إلى خروج المغلوب، ${byesWord(byeCount)}.`,
    topTeam: "الفريق الأول",
    topTwo: "أول فريقين",
    topThree: "أول ثلاثة فرق",
    topFour: "أول أربعة فرق",
    topN: (n: number) =>
      plural("ar", n, {
        one: "أول فريق",
        two: "أول فريقين",
        few: "أول {n} فرق",
        many: "أول {n} فريقًا",
        other: "أول {n} فريق",
      }),
    inEachGroup: (who: string) => `${who} من كل مجموعة`,
    stageFinal: "النهائي",
    stageSemis: "نصف النهائي ثم النهائي",
    stageQuarters: "من ربع النهائي فصاعدًا",
    stageRoundOf: (teamsLeft: number) => `من دور الـ${teamsLeft} فصاعدًا`,
    reviewValue: (who: string, stage: string) => `${who}، ${stage}`,
    reviewValueWithByes: (who: string, stage: string, byeCount: number) =>
      `${who}، ${stage}. ${byesWord(byeCount)}`,
  },
  knockoutView: {
    bye: "إعفاء",
    decidingSet: "أضف شوطًا فاصلًا",
    wonTag: "فاز",
    walkover: "انسحاب",
    champion: "البطل",
    nowAt: (roundName: string) => `الآن في ${roundName}`,
    chooseThrough:
      "اختر الفريق الذي يتأهل. تُعرض المباراة كانسحاب ولا يتغير أي تصنيف.",
    teamGoesThrough: (team: string) =>
      `يتأهل ${team}. تُعرض المباراة كانسحاب ولا يتغير أي تصنيف.`,
    nobodyThrough: "لا يتأهل أحد. لا يمكن التراجع عن هذا.",
    championLine: (name: string) => `البطل: ${name}`,
    toBeDecided: "لم يُحدَّد بعد",
    heading: "خروج المغلوب",
    notThrough: "لم يتأهل فريقك. انتهت البطولة بالنسبة لفريقك.",
  },
  poolDraw: {
    poolLabel: (letter: string) => `المجموعة ${letter}`,
    notHappened: "لم تُجرَ قرعة المجموعات بعد.",
    opponentsUnknown: "خصومك غير معروفين بعد.",
    random: "قرعة المجموعات عشوائية. لا تصنيف لأحد.",
    drawPools: "أجرِ قرعة المجموعات",
    drawAgain: "أعد القرعة",
    post: "انشر قرعة المجموعات",
    undo: "تراجع عن قرعة المجموعات",
    undoConfirmTitle: "التراجع عن قرعة المجموعات؟",
    undoConfirmCopy: "تغادر الفرق مجموعاتها وتُحذف كل مباريات المجموعات.",
    undoConfirmLabel: "تراجع عن القرعة",
    drawerTitle: "القرعة",
    entryTitle: "قرعة المجموعات",
    entryDraftedTitle: "المجموعات جاهزة كمسودة",
    entryAction: "افتح القرعة",
    emptyDraft: "أجرِ قرعة المجموعات لترى أي الفرق تقع في أي مجموعة.",
    postFooter: "النشر ينشئ كل مباريات المجموعات ويغلق الأماكن.",
    knockoutRandom: "القرعة عشوائية. لا تصنيف لأحد.",
    drawKnockout: "أجرِ قرعة خروج المغلوب",
    postKnockout: "انشر القرعة",
    knockoutEntryTitle: "قرعة خروج المغلوب",
    knockoutEntryDraftedTitle: "خروج المغلوب جاهز كمسودة",
    knockoutEmptyDraft:
      "أجرِ قرعة خروج المغلوب لترى من يلعب ضد من في الدور الأول.",
    postKnockoutFooter: "النشر ينشئ كل مباريات خروج المغلوب ويغلق الأماكن.",
    undoKnockout: "تراجع عن القرعة",
    undoKnockoutConfirmTitle: "التراجع عن القرعة؟",
    undoKnockoutConfirmCopy: "تُحذف كل مباريات خروج المغلوب وتُمسح القرعة.",
    entryStateLine: (completeTeams: number, teamCount: number) =>
      plural("ar", teamCount, {
        one: `${completeTeams} من فريق واحد مكتمل.`,
        two: `${completeTeams} من فريقين مكتملين.`,
        few: `${completeTeams} من {n} فرق مكتملة.`,
        many: `${completeTeams} من {n} فريقًا مكتملًا.`,
        other: `${completeTeams} من {n} فريق مكتمل.`,
      }),
    drawerLead: (teamCount: number) =>
      `${teamsWord(teamCount)}. قرعة المجموعات عشوائية. لا تصنيف لأحد.`,
    knockoutDrawerLead: (completeTeams: number) =>
      plural("ar", completeTeams, {
        one: "فريق واحد مكتمل يدخل القرعة. القرعة عشوائية. لا تصنيف لأحد.",
        two: "فريقان مكتملان يدخلان القرعة. القرعة عشوائية. لا تصنيف لأحد.",
        few: "{n} فرق مكتملة تدخل القرعة. القرعة عشوائية. لا تصنيف لأحد.",
        many: "{n} فريقًا مكتملًا تدخل القرعة. القرعة عشوائية. لا تصنيف لأحد.",
        other: "{n} فريق مكتمل تدخل القرعة. القرعة عشوائية. لا تصنيف لأحد.",
      }),
  },
  poolTable: {
    heading: "جدول المجموعة",
    winner: "متصدر المجموعة",
    finished: "انتهت هذه البطولة.",
    yourRounds: "جولاتك",
    results: "نتائج المجموعة",
  },
  rounds: {
    poolRoundLabel: (roundNumber: number, roundCount: number) =>
      `ج${roundNumber} من ${roundCount}`,
    roundsPlayed: (played: number, roundCount: number) =>
      `لُعبت الجولة ${played} من ${roundCount}`,
  },
  sizing: {
    oneDayOverrun:
      "هذا يتجاوز وقت الانتهاء. أضف ملعبًا أو قلّل الجولات أو استقبل فرقًا أقل.",
    createHeadingLead: "بطولة جديدة،",
    createHeadingTrail: "عدة جولات",
    createHeading: "بطولة جديدة، عدة جولات",
    createSubline: "مثل إعداد مباراة ودية، لكنها تمتد لبضع جولات.",
    createFooter:
      "تظهر في المباريات مثل أي مباراة أخرى. تُجري القرعة عندما تمتلئ الأماكن.",
    unevenPools: "المجموعات غير متساوية. بعض الفرق تلعب مباراة إضافية.",
    poolMatchesRow: "مباريات المجموعات",
    matchesPerTeamRow: "المباريات لكل فريق",
    eachMatchRow: "كل مباراة",
    courtsRow: "الملاعب",
    oneDayCallout: "اليوم",
    createPrimaryAction: "أنشئ البطولة",
    howLongItRuns: "مدة البطولة",
    oneDay: "يوم واحد",
    fewWeeks: "بضعة أسابيع",
    whoCanTakeASeat: "من يمكنه أخذ مكان",
    thisGroupOnly: "هذه المجموعة فقط",
    anyoneWithTheLink: "أي شخص لديه الرابط",
    howPeopleJoin: "كيف ينضم اللاعبون",
    aloneOrWithPartner: "وحدك أو مع شريك",
    withPartnerOnly: "مع شريك فقط",
    lastMatchFinish: (clock: string) => `ستنتهي آخر مباراة في ${clock}.`,
    poolSizeClause: (count: number, size: number) =>
      plural("ar", count, {
        one: `مجموعة واحدة من ${size}`,
        two: `مجموعتان من ${size}`,
        few: `{n} مجموعات من ${size}`,
        many: `{n} مجموعة من ${size}`,
        other: `{n} مجموعة من ${size}`,
      }),
    eachTeamPlays: (matches: number) => `يلعب كل فريق ${matchesWord(matches)}`,
    eachTeamPlaysRange: (min: number, max: number) =>
      `يلعب كل فريق من ${min} إلى ${matchesWord(max)}`,
    unevenMatchesPerTeam: (max: number, min: number) =>
      `الفرق في المجموعة الأكبر تلعب ${matchesWord(max)}؛ والفرق في المجموعة الأصغر تلعب ${matchesWord(min)}`,
    playersInPairs: (players: number) =>
      plural("ar", players, {
        one: "لاعب واحد في أزواج. مكانان لكل فريق.",
        two: "لاعبان في أزواج. مكانان لكل فريق.",
        few: "{n} لاعبين في أزواج. مكانان لكل فريق.",
        many: "{n} لاعبًا في أزواج. مكانان لكل فريق.",
        other: "{n} لاعب في أزواج. مكانان لكل فريق.",
      }),
    courtCount: (n: number) =>
      plural("ar", n, {
        zero: "لا ملاعب",
        one: "ملعب واحد",
        two: "ملعبان",
        few: "{n} ملاعب",
        many: "{n} ملعبًا",
        other: "{n} ملعب",
      }),
    roundMeets: {
      once: "يلتقي الجميع مرة واحدة",
      partial: "لا يلتقي الجميع",
      twice: "يلتقي الجميع مرتين",
      somePartialSecond: "بعضهم يلتقي مرتين",
    },
    roundsLabel: "الجولات",
    suggestedTag: "مقترح",
    useSuggested: (suggested: number) => `استخدم المقترح (${suggested})`,
    roundCount: (n: number) => roundsWord(n),
    roundCountSuggested: (n: number) => `${roundsWord(n)} · مقترح`,
  },
  home: {
    eyebrowPrefix: "بطولة ودية",
    eyebrowKnockout: "بطولة ودية، خروج المغلوب",
    eyebrowRounds: (n: number) => `بطولة ودية، ${roundsWord(n)}`,
    yourTeam: "فريقك",
    leftSeat: "المكان الأيسر",
    rightSeat: "المكان الأيمن",
    leftSeatOpen: "المكان الأيسر شاغر",
    rightSeatOpen: "المكان الأيمن شاغر",
    openPositionSr: "جهة شاغرة",
    youAreIn: "أنت مشارك.",
    drawRandomClause: "وهي عشوائية.",
    drawWhenFull: "تُجرى القرعة عندما تمتلئ الفرق",
    drawsPoolsWhenFull: "يُجري قرعة المجموعات عندما تمتلئ الفرق",
    drawsKnockoutWhenFull: "يُجري قرعة خروج المغلوب عندما تمتلئ الفرق",
    closingLine:
      "كل جولة مباراة عادية. تُدخل النتائج بالطريقة المعتادة ويؤكدها الفريق الآخر.",
    organizerRow: "المنظّم",
    groupRow: "المجموعة",
    priceRow: "السعر",
    countsForRating: "تُحتسب في التصنيف",
    groupRatingOnly: "تصنيف المجموعة فقط",
    youOweRow: "عليك دفع",
    youOweAfterEachMatch: "بعد كل مباراة",
    inviteAction: "دعوة",
    inviteFromGroup: "دعوة من مجموعة",
    pricePerMatch: "لكل مباراة",
    teamsHeading: "الفرق",
    takeSeat: "خذ مكانًا",
    yourTeamTag: "فريقك",
    seatsHeading: "الأماكن",
    leaveTheSeat: "غادر المكان",
    yourRoundsPredrawCaption: "الخصوم بعد القرعة",
    notDrawn: "لم تُجرَ القرعة",
    standingsHeading: "الترتيب",
    endsCopy: "لكل مجموعة متصدر. لا يوجد بطل عام.",
    knockoutOnlyLead: "اخسر مرة واحدة وينتهي يومك.",
    groupsThenKnockoutLead: "الأفضل في كل مجموعة يتابعون إلى خروج المغلوب.",
    poolsSegment: "المجموعات",
    openTeamRow: "شاغر",
    fullCount: (full: number) => `${full} مكتمل`,
    withPositionOpen: (open: number) =>
      plural("ar", open, {
        one: "واحد بجهة شاغرة",
        two: "اثنان بجهة شاغرة",
        few: "{n} بجهة شاغرة",
        many: "{n} بجهة شاغرة",
        other: "{n} بجهة شاغرة",
      }),
    fullAndOpen: (full: number, open: number) =>
      plural("ar", open, {
        one: `${full} مكتمل، وواحد بجهة شاغرة`,
        two: `${full} مكتمل، واثنان بجهة شاغرة`,
        few: `${full} مكتمل، و{n} بجهة شاغرة`,
        many: `${full} مكتمل، و{n} بجهة شاغرة`,
        other: `${full} مكتمل، و{n} بجهة شاغرة`,
      }),
    moreFullTeams: (count: number) =>
      plural("ar", count, {
        one: "فريق مكتمل آخر",
        two: "فريقان مكتملان آخران",
        few: "{n} فرق مكتملة أخرى",
        many: "{n} فريقًا مكتملًا آخر",
        other: "{n} فريق مكتمل آخر",
      }),
    seatsTaken: (taken: number, total: number) => `${taken} من ${total}`,
    seatsTakenSr: (taken: number, total: number) =>
      plural("ar", total, {
        one: `حُجز ${taken} من مكان واحد`,
        two: `حُجز ${taken} من مكانين`,
        few: `حُجز ${taken} من {n} أماكن`,
        many: `حُجز ${taken} من {n} مكانًا`,
        other: `حُجز ${taken} من {n} مكان`,
      }),
    sizeLine: (teamCount: number, poolClause: string) =>
      `${teamsWord(teamCount)}، ${poolClause}`,
    sizeLineThen: (teamCount: number, poolClause: string, start: string) =>
      `${teamsWord(teamCount)}، ${poolClause}، ثم ${start}`,
    knockoutSizeLine: (teamCount: number, roundName: string) =>
      `${teamsWord(teamCount)}، خروج المغلوب من ${roundName}`,
    youAreInDrawRandom: "أنت مشارك. القرعة عشوائية.",
    youAreInGroupDrawRandom: "أنت مشارك. قرعة المجموعات عشوائية.",
    youAreInDrawWhenFull: (teamCount: number) =>
      `أنت مشارك. تُجرى القرعة عندما تمتلئ ${teamsWord(teamCount)}، وهي عشوائية.`,
    unseatedStatus: (
      seatsLeft: number,
      organizerFirstName: string | null,
      knockoutOnly: boolean,
    ) => {
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
        ? `يُجري ${organizerFirstName} قرعة ${knockoutOnly ? "خروج المغلوب" : "المجموعات"} عندما تمتلئ الفرق`
        : "تُجرى القرعة عندما تمتلئ الفرق";
      return `${seats} ${drawer}، وهي عشوائية.`;
    },
    startsAt: (day: string, venue: string) => `تبدأ ${day}، ${venue}`,
    starts: (day: string) => `تبدأ ${day}`,
    matchesPlayed: (n: number) =>
      plural("ar", n, {
        zero: "لم تُلعب أي مباراة",
        one: "لُعبت مباراة واحدة",
        two: "لُعبت مباراتان",
        few: "لُعبت {n} مباريات",
        many: "لُعبت {n} مباراة",
        other: "لُعبت {n} مباراة",
      }),
    roundResults: "نتائج الجولة",
    roundNResults: (roundNumber: number) => `نتائج الجولة ${roundNumber}`,
  },
  join: {
    takeASeatTitle: "خذ مكانًا",
    sitWithSomeone: "اجلس مع أحدهم",
    startATeam: "ابدأ فريقًا وحدك",
    startATeamSubline: "يأخذ أحدهم الجهة الأخرى، أو يضعك المنظّم مع شريك",
    yourSeat: "مكانك",
    taken: "محجوز",
    roundsRow: "الجولات",
    drawRow: "القرعة",
    drawRandom: "عشوائية",
    pricePerPlayer: "لكل لاعب",
    pricePerPlayerValue: (price: string) => `${price} لكل لاعب`,
    introSuffix: "مثل الانضمام إلى مباراة، لكنك تختار من تلعب معه.",
    headerWithLead: (lead: string) =>
      `${lead}. مثل الانضمام إلى مباراة، لكنك تختار من تلعب معه.`,
    nameRoundsFrom: (name: string, rounds: string, day: string) =>
      `${name}، ${rounds} من ${day}`,
    nameRounds: (name: string, rounds: string) => `${name}، ${rounds}`,
    roundsFrom: (rounds: string, day: string) => `${rounds} من ${day}`,
    leaveSeatUntilPoolDraw: "يمكنك مغادرة المكان حتى قرعة المجموعات.",
    leaveSeatUntilKnockoutDraw: "يمكنك مغادرة المكان حتى القرعة.",
    leaveSpotConfirm: "قد يُتاح مكانك لشخص آخر.",
    partnerUnseatedConfirm: "يُزال شريكك من مكانه أيضًا.",
    partnerVacantSideRace:
      "حُجز هذا الفريق أثناء تسجيلك. اختر شريكًا آخر إن كان هناك فريق لا يزال شاغرًا بالكامل.",
    partnerInviteLanding: "هذه البطولة مع شريك فقط. تابع لاختيار شريك.",
    pickAPartner: "اختر شريكًا",
    sitWithCount: (halfOpen: number) =>
      plural("ar", halfOpen, {
        one: "فريق واحد بجهة شاغرة",
        two: "فريقان بجهة شاغرة",
        few: "{n} فرق بجهة شاغرة",
        many: "{n} فريقًا بجهة شاغرة",
        other: "{n} فريق بجهة شاغرة",
      }),
    playsLeft: "يلعب يسارًا",
    playsRight: "يلعب يمينًا",
    takeTheLeftSeat: "خذ المكان الأيسر",
    takeTheRightSeat: "خذ المكان الأيمن",
    seatExplanationOccupied: (
      occupant: string,
      occupiedSeat: string,
      freeSeat: string,
      roundCount: number | null,
    ) =>
      roundCount == null
        ? `${occupant} في جهة ${occupiedSeat}، فتأخذ أنت جهة ${freeSeat}.`
        : `${occupant} في جهة ${occupiedSeat}، فتأخذ أنت جهة ${freeSeat} طوال ${roundsWord(roundCount)}.`,
    seatExplanationOpen: (roundCount: number | null) =>
      roundCount == null
        ? "الجهتان شاغرتان. تختار اليسار أو اليمين."
        : `الجهتان شاغرتان. تختار اليسار أو اليمين طوال ${roundsWord(roundCount)}.`,
  },
  halfTeams: {
    organizerEyebrow: "المنظّم",
    mergeCompletesField: "دمجهما يكمل الفرق.",
    takesEffect: "يسري فورًا. يمكن لأي منهما المغادرة حتى قرعة المجموعات.",
    takesEffectKnockout: "يسري فورًا. يمكن لأي منهما المغادرة حتى القرعة.",
    bannerTitle: "فريقان لكل منهما جهة شاغرة",
    bannerAction: "رتّب الأماكن",
    drawerTitle: "نصفا فريق",
    previewLabel: "فريق واحد بدلًا من اثنين",
    primaryAction: "ضعهما في فريق واحد",
    dismissAction: "اترك الجهتين شاغرتين",
    swap: "بدّل",
    mergeSeats: "ادمج الأماكن",
    manyTitle: "فرق لكل منها جهة شاغرة",
    samePosition: "سيلعب المستخدمان في الجهة نفسها",
    openPositionSr: "جهة شاغرة",
    teamEyebrow: (index: string) => `الفريق ${index}`,
    occupantSubline: (seat: string, level: string) =>
      `${seat}، ${isolate(level)}`,
    leftOpen: "اليسار شاغر",
    rightOpen: "اليمين شاغر",
    openLeft: "اليسار شاغر",
    openRight: "اليمين شاغر",
    putTogether: (first: string, second: string) =>
      `ضع ${first} و${second} معًا.`,
    putTogetherFull: (first: string, second: string, teamCount: number) =>
      `ضع ${first} و${second} معًا فتكتمل الفرق الـ${teamCount}.`,
    putTogetherCompletes: (first: string, second: string) =>
      `ضع ${first} و${second} معًا. دمجهما يكمل الفرق.`,
    drawerLead: (first: string, second: string) =>
      `أخذ كل من ${first} و${second} مكانًا وحده. ضعهما معًا في فريق واحد.`,
    drawerLeadFull: (first: string, second: string, teamCount: number) =>
      `أخذ كل من ${first} و${second} مكانًا وحده. ضعهما معًا فتكتمل الفرق الـ${teamCount}.`,
    drawerLeadCompletes: (first: string, second: string) =>
      `أخذ كل من ${first} و${second} مكانًا وحده. دمجهما يكمل الفرق.`,
    swapHint: (name: string, seat: string) =>
      `يحتفظ ${name} بمكان ${seat} بدلًا من ذلك`,
    manyHalfTeams: (halfTeamCount: number) =>
      plural("ar", halfTeamCount, {
        one: "فريق واحد له جهة شاغرة.",
        two: "فريقان لكل منهما جهة شاغرة.",
        few: "{n} فرق لكل منها جهة شاغرة.",
        many: "{n} فريقًا لكل منها جهة شاغرة.",
        other: "{n} فريق لكل منها جهة شاغرة.",
      }),
  },
  card: {
    bandLabel: "بطولة ودية",
    matchBandLabel: "بطولتك",
    noTeamsYet: "لا فرق بعد",
    knockoutBandMeta: "خروج المغلوب",
    fromDay: (day: string) => `من ${day}`,
    dayRange: (start: string, end: string) => `من ${start} إلى ${end}`,
    dayWithHours: (day: string, start: string, end: string) =>
      `${day}، ${start} – ${end}`,
    roundsThenKnockout: (rounds: string) => `${rounds}، ثم خروج المغلوب`,
    openCount: (openTeams: number) =>
      plural("ar", openTeams, {
        zero: "لا أماكن شاغرة",
        one: "مكان واحد شاغر",
        two: "مكانان شاغران",
        few: "{n} أماكن شاغرة",
        many: "{n} مكانًا شاغرًا",
        other: "{n} مكان شاغر",
      }),
    full: "مكتمل",
    teamsKnockout: (teamCount: number) =>
      `${teamsWord(teamCount)}، خروج المغلوب`,
    teamsGroups: (teamCount: number, groupCount: number) =>
      `${teamsWord(teamCount)}، ${plural("ar", groupCount, { one: "مجموعة واحدة", two: "مجموعتان", few: "{n} مجموعات", many: "{n} مجموعة", other: "{n} مجموعة" })}`,
    teamsGroupsThen: (teamCount: number, groupCount: number, start: string) =>
      `${teamsWord(teamCount)}، ${plural("ar", groupCount, { one: "مجموعة واحدة", two: "مجموعتان", few: "{n} مجموعات", many: "{n} مجموعة", other: "{n} مجموعة" })}، ثم ${start}`,
    teamsIn: (registered: number, allowed: number) =>
      plural("ar", allowed, {
        one: `${registered} من فريق واحد مشارك`,
        two: `${registered} من فريقين مشاركين`,
        few: `${registered} من {n} فرق مشاركة`,
        many: `${registered} من {n} فريقًا مشاركًا`,
        other: `${registered} من {n} فريق مشارك`,
      }),
    teamsCount: (n: number) => teamsWord(n),
    joinAction: "انضم إلى البطولة",
    joinWaitlistAction: "انضم إلى قائمة الانتظار",
    invitePartnerAction: "ادعُ شريكًا",
    viewAction: "اعرض البطولة",
    openSeat: "مكان شاغر",
    pair: (first: string, second: string) => `${first} و${second}`,
    roundN: (roundNumber: number) => `الجولة ${roundNumber}`,
    groupLower: (label: string) => `المجموعة ${label}`,
    group: (label: string) => `المجموعة ${label}`,
    roundGroup: (roundNumber: number, label: string) =>
      `الجولة ${roundNumber}، المجموعة ${label}`,
    ordinalInGroup: (ordinal: string, label: string) =>
      `${ordinal} في المجموعة ${label}`,
    groupTeams: (label: string, teamCount: number) =>
      `المجموعة ${label}، ${teamsWord(teamCount)}`,
    roundShort: (roundNumber: number) => `ج${roundNumber}`,
    roundCancelled: (round: string) => `أُلغيت ${round}`,
    drewRound: (round: string) => `تعادل في ${round}`,
    wonRound: (round: string) => `فوز في ${round}`,
    wonRoundScore: (round: string, score: string) =>
      `فوز في ${round}، ${score}`,
    lostRound: (round: string) => `خسارة في ${round}`,
    lostRoundScore: (round: string, score: string) =>
      `خسارة في ${round}، ${score}`,
    standingDrew: (round: string) => `تعادل في ${round}`,
    standingWon: (round: string) => `فوز في ${round}`,
    standingWonScore: (round: string, score: string) =>
      `فوز في ${round} ${score}`,
    standingLost: (round: string) => `خسارة في ${round}`,
    standingLostScore: (round: string, score: string) =>
      `خسارة في ${round} ${score}`,
    headline: (roundNumber: number, day: string) =>
      `الجولة ${roundNumber}، ${day}`,
    knockoutHeadline: (roundName: string, day: string) =>
      `${roundName}، ${day}`,
    winnerIsChampion: "الفائز هو البطل",
    winnerPlays: (roundName: string) => `الفائز يلعب ${roundName}`,
    thenKnockout: "ثم خروج المغلوب",
    lastRound: "الجولة الأخيرة",
    thenMoreRounds: (left: number) =>
      plural("ar", left, {
        one: "ثم جولة أخرى",
        two: "ثم جولتان أخريان",
        few: "ثم {n} جولات أخرى",
        many: "ثم {n} جولة أخرى",
        other: "ثم {n} جولة أخرى",
      }),
    playingNow: "تُلعب الآن",
    addResults: "أضف النتائج",
    viewKnockout: "اعرض خروج المغلوب",
    viewGroup: "اعرض المجموعة",
  },
  gamesCard: {
    roundOfCount: (roundNumber: number, roundCount: number) =>
      `الجولة ${roundNumber} من ${roundCount}`,
    allRoundsPlayed: "لُعبت كل الجولات",
    dayLine: (relativeDay: string, day: string) => `${relativeDay}، ${day}`,
    untilClock: (clock: string) => `حتى ${clock}`,
    courtsCount: (n: number) =>
      plural("ar", n, {
        one: "ملعب واحد",
        two: "ملعبان",
        few: "{n} ملاعب",
        many: "{n} ملعبًا",
        other: "{n} ملعب",
      }),
    groupPlace: (label: string, place: string, size: number) =>
      `المجموعة ${label}، ${place} من ${size}`,
    groupPlaceSoFar: (label: string, place: string, size: number) =>
      `المجموعة ${label}، ${place} من ${size} حتى الآن`,
    yourRounds: "جولاتك",
    roundsTonight: (n: number) => `${roundsWord(n)} الليلة`,
    roundsCount: (n: number) => roundsWord(n),
    playedWon: (played: number, won: number) =>
      `لُعبت ${played}، فزت في ${won}`,
    next: "التالية",
    onCourt: "في الملعب",
    noScore: "بلا نتيجة",
    cancelled: "أُلغيت",
    withCourt: (line: string, court: string) => `${line}، ${isolate(court)}`,
    firstUp: (opponent: string) => `أولًا: ${opponent}`,
    nextUp: (opponent: string) => `التالية: ${opponent}`,
    playing: (opponent: string) => `تلعب ضد ${opponent}`,
    firstUpBody: (rounds: number) =>
      `${roundsWord(rounds)}، بطاقة واحدة لليلة كلها. تُدخل النتائج من هنا.`,
    roundsToGo: (n: number) => `باقٍ ${roundsWord(n)}.`,
    playingBody: "أدخل النتيجة عندما تنتهي.",
    playingBodyThenNext: (opponent: string) =>
      `أدخل النتيجة عندما تنتهي. التالية ضد ${opponent}.`,
    playingBodyThenNextOnCourt: (opponent: string, court: string) =>
      `أدخل النتيجة عندما تنتهي. التالية ضد ${opponent}، في ${isolate(court)}.`,
    details: "التفاصيل",
    viewTournament: "اعرض البطولة",
    tournament: "البطولة",
    enterScore: "أدخل النتيجة",
    place: (n: number) => `المركز ${n}`,
    ofTeams: (size: number) => `من ${teamsWord(size)}`,
    ofTeamsInGroup: (size: number, label: string) =>
      `من ${size} في المجموعة ${label}`,
    soFar: "حتى الآن",
    withPartner: (name: string) => `مع ${name}`,
    record: (won: number, drawn: number, lost: number) =>
      drawn > 0
        ? `فوز ${won}، تعادل ${drawn}، خسارة ${lost}.`
        : `فوز ${won}، خسارة ${lost}.`,
    wonIt: (pair: string) => `فاز بها ${pair}`,
    noScoreYet: (n: number) =>
      plural("ar", n, {
        one: "جولة واحدة بلا نتيجة بعد",
        two: "جولتان بلا نتيجة بعد",
        few: "{n} جولات بلا نتيجة بعد",
        many: "{n} جولة بلا نتيجة بعد",
        other: "{n} جولة بلا نتيجة بعد",
      }),
    roundHasNoScore: (round: string) => `${round} بلا نتيجة`,
    roundsHaveNoScore: (n: number) => `${roundsWord(n)} بلا نتيجة`,
    addScore: "أضف النتيجة",
    cellWon: (score: string) => (score ? `فوز ${score}` : "فوز"),
    cellLost: (score: string) => (score ? `خسارة ${score}` : "خسارة"),
    cellDrew: (score: string) => (score ? `تعادل ${score}` : "تعادل"),
    cellLabel: (round: string, state: string, opponent: string) =>
      opponent ? `${round}، ${state}، ضد ${opponent}` : `${round}، ${state}`,
    later: "لاحقًا",
  },
  details: {
    fallbackName: "بطولة",
    minutes: (n: number) => `${n} دقيقة`,
    pricePerMatchValue: (price: string) => `${price} لكل مباراة`,
    youOweValue: (amount: string) => `${amount}، بعد كل مباراة`,
    notPlayed: "لم تُلعب",
    open: "مفتوحة",
    round: "الجولة",
    roundN: (roundNumber: number) => `الجولة ${roundNumber}`,
    roundDay: (round: string, day: string) => `${round}، ${day}`,
    takeSeatOn: (seat: string, team: string) => `خذ مكان ${seat} في ${team}`,
    openSeatOn: (seat: string, team: string) => `مكان ${seat} شاغر في ${team}`,
  },
  errors: {
    roundsPoolOnly: "تُنشأ الجولات في بطولة المجموعات",
    cancelled: "هذه البطولة ملغاة",
    postDrawFirst: "انشر القرعة قبل إنشاء الجولات",
    roundsRange: (count: number) => `جولات هذه البطولة من 1 إلى ${count}`,
    roundPosted: (round: number) => `نُشرت الجولة ${round}`,
    roundNotMade: (round: number) => `لم تُنشأ الجولة ${round} بعد`,
    postRoundFirst: (round: number) => `انشر الجولة ${round} أولًا`,
    roundNotComplete: (round: number) => `الجولة ${round} غير مكتملة`,
    roundRecordCourts: "سجّل الملاعب قبل نشر جولة",
    roundAlreadyPosted: "نُشرت هذه الجولة بالفعل",
    pickPairedTeam: "اختر فريقًا يلعب ضد فريق آخر في هذه الجولة",
    samePool: "اجمع فريقين من المجموعة نفسها",
    poolSitsOut: "هذه المجموعة لا تلعب في هذه الجولة",
    teamOncePerRound: "يلعب الفريق مرة واحدة في الجولة",
    teamNotInTournament: "هذا الفريق ليس في هذه البطولة",
    scoredMatchKeepsTeams: "المباراة التي لها نتيجة تحتفظ بفريقيها",
    knockoutSidesFromDraw: "جهتا مباراة خروج المغلوب تحددهما القرعة",
    knockoutByHand: "مباريات خروج المغلوب تحددها القرعة",
    editMatchesFriendly: "تعديل المباريات متاح في البطولة الودية",
    addMatchCancelled: "لا يمكن إضافة مباراة إلى بطولة ملغاة",
    addMatchesFriendly: "إضافة المباريات متاحة في البطولة الودية",
    poolMatchNotAwarded:
      "تُلغى مباراة المجموعة ولا تُمنح لأحد، فلا يتأهل أي فريق",
    knockoutMatchCompleted: "اكتملت مباراة خروج المغلوب هذه بالفعل",
    oneDayWindow: "يجب أن يكون وقت الانتهاء خلال 24 ساعة من البدء",
    qualifiersShape:
      "عدد المتأهلين من كل مجموعة يخص صيغة «مجموعات، ثم خروج المغلوب» فقط",
    drawCancelled: "لا يمكن إجراء قرعة المجموعات في بطولة ملغاة",
    drawFriendly: "قرعة المجموعات متاحة في البطولة الودية",
    drawHalfTeams: (names: string) =>
      `لا يمكن إجراء قرعة المجموعات مع وجود أنصاف فرق: ${names}`,
    drawBelowMinimum: "تحتاج قرعة المجموعات إلى 4 فرق مكتملة على الأقل",
    teamNumber: (side: number) => `الفريق ${side}`,
    scoreGamesBetween: (min: number, max: number) =>
      `يجب أن يكون عدد الجيمات بين ${min} و${max}`,
    scoreOnTournamentMatch: "أدخل نتيجة البطولة في مباراة من البطولة",
    scoreTeamsOrOrganizer: "لا يدخل هذه النتيجة إلا الفريقان أو المنظّم",
    scoreConfirmed: "هذه النتيجة مؤكدة؛ اطلب من المنظّم تغييرها",
    scoreNeedsTwoPlayers: "يحتاج كل فريق إلى لاعبَين قبل تسجيل النتيجة",
    knockoutNeedsWinner: "تحتاج مباراة خروج المغلوب إلى فائز",
    notFinishedTournamentOnly: "لا تُعلَّم كغير منتهية إلا مباريات البطولة",
    teamsOrOrganizer: "هذا للفريقين أو للمنظّم فقط",
    notFinishedInPlay: "لا تُعلَّم كغير منتهية إلا مباراة ما زالت قيد اللعب",
    mergeCancelled: "لا يمكن دمج أنصاف الفرق في بطولة ملغاة",
    mergeFriendly: "دمج أنصاف الفرق متاح في البطولة الودية",
    mergeIndividual: "دمج أنصاف الفرق متاح في البطولة الودية الفردية",
    pickTwoHalfTeams: "اختر نصفي فريق مختلفين",
    notHalfTeams: "يجب أن يكون الفريقان نصفي فريق",
    postDrawCancelled: "لا يمكن نشر قرعة المجموعات في بطولة ملغاة",
    postDrawFriendly: "نشر قرعة المجموعات متاح في البطولة الودية",
    postDrawWindow: "حدّد موعد البطولة قبل نشر قرعة المجموعات",
    postHalfTeams: (names: string) =>
      `لا يمكن نشر قرعة المجموعات مع وجود أنصاف فرق: ${names}`,
    postBelowMinimum: "يحتاج نشر قرعة المجموعات إلى 4 فرق مكتملة على الأقل",
    postRecordCourts: "سجّل الملاعب قبل نشر قرعة المجموعات",
    drawNoMatches: "لم تُنتج قرعة المجموعات أي مباراة",
    drawKnockoutFirst: "أجرِ قرعة خروج المغلوب قبل النشر",
    drawGroupsFirst: "أجرِ قرعة المجموعات قبل النشر",
    groupsDrawn: "أُجريت قرعة المجموعات",
    undoCancelled: {
      draw: "لا يمكن التراجع عن القرعة في بطولة ملغاة",
      groupDraw: "لا يمكن التراجع عن قرعة المجموعات في بطولة ملغاة",
    },
    undoFriendly: "التراجع عن قرعة المجموعات متاح في البطولة الودية",
    notPosted: {
      draw: "لم تُنشر القرعة",
      groupDraw: "لم تُنشر قرعة المجموعات",
    },
    undoAfterSet: "لا يمكن التراجع عن قرعة المجموعات بعد لعب شوط",
    undoKnockoutAfterSet: "لا يمكن التراجع عن القرعة بعد لعب شوط",
    roundCountFriendly: "تغيير عدد الجولات متاح في البطولة الودية",
    knockoutEmptySide:
      "في مباراة خروج المغلوب هذه جهة فارغة. تُفتح الأشواط حين يكتمل الفريقان.",
    knockoutTakeBackRefused:
      "بدأت المباراة التي تُبنى على هذه النتيجة، لذا لم يعد بالإمكان عكسها",
    poolCorrectionRefused:
      "بدأت مباراة خروج المغلوب، لذا لم يعد بالإمكان عكس نتيجة المجموعة هذه",
    walkoverTeamRequired: "اختر الفريق المتأهل",
    walkoverTeamNotOnMatch: "هذا الفريق ليس في هذه المباراة",
    partnerRequired: "لا تسمح هذه البطولة بالتسجيل منفردًا",
  },
} satisfies typeof source;
