import { isolate } from "../../bidi";
import { plural } from "../../plural";
import type { challenge as source } from "../en/challenge";

export const challenge = {
  segments: {
    label: "أقسام التحديات",
    open: "مفتوحة",
    mine: "تحدياتي",
    teams: "الفرق",
    withCount: (segment: string, n: number) => `${segment}، ${n}`,
  },
  tab: {
    vs: "ضد",
    filterAll: "الكل",
    openFootnote:
      "المقاعد المظلّلة هي المنافس الذي لم يُعثر عليه بعد. القبول يقترح وقتًا وملعبًا، والفريق الناشر يؤكّد.",
    openFor: (n: number) =>
      plural("ar", n, {
        one: "مفتوح ليوم واحد",
        two: "مفتوح ليومين",
        few: "مفتوح لمدة {n} أيام",
        many: "مفتوح لمدة {n} يومًا",
        other: "مفتوح لمدة {n} يوم",
      }),
    days: {
      weekdays: "أيام الأسبوع",
      weekends: "عطلة نهاية الأسبوع",
      line: (days: string, timings: string) => `${days} ${timings}`,
      timings: {
        morning: "صباحًا",
        afternoon: "بعد الظهر",
        evening: "مساءً",
      },
    },
    sports: {
      padel: "بادل",
      football: "كرة قدم",
    },
    mine: {
      waiting: "بانتظارك",
      expiresIn: (hours: number) => `ينتهي العرض خلال ${hours} س`,
      expiresWithinHour: "ينتهي العرض خلال ساعة",
      accepted: (team: string) => `${isolate(team)} قبل تحديك`,
      teamSport: (team: string, sport: string) => `${isolate(team)}، ${sport}`,
      proposed: "المقترح",
      venue: "الملعب",
      postedTitle: "منشورة",
      postedHint: "بانتظار فريق",
      pendingTitle: "مقترحة",
      pendingHint: "بانتظارهم",
      acceptedTitle: "مقبولة",
      acceptedHint: "صارت مباريات",
      postedLine: (when: string, venues: string, wants: string) =>
        `${when}، ${venues}. ${wants}`,
      proposalCount: (n: number) =>
        plural("ar", n, {
          zero: "لا عروض",
          one: "عرض واحد",
          two: "عرضان",
          few: "{n} عروض",
          many: "{n} عرضًا",
          other: "{n} عرض",
        }),
      versus: (team: string, opponent: string) =>
        `${isolate(team)} ضد ${isolate(opponent)}`,
      gameLine: (when: string, venue: string) => `${when}، ${isolate(venue)}`,
      viewGame: "عرض المباراة",
      viewGameA11y: (title: string) => `عرض المباراة، ${title}`,
      played: (day: string) => `لُعبت ${day}`,
      playedWith: (day: string, result: string) => `لُعبت ${day}، ${result}`,
      won: (score: string) => `فوز ${score}`,
      lost: (score: string) => `خسارة ${score}`,
      drew: (score: string) => `تعادل ${score}`,
    },
    teams: {
      record: "السجل",
      you: "أنت",
      pair: (first: string, second: string) =>
        `${isolate(first)} و${isolate(second)}`,
      rivals: (n: number) =>
        plural("ar", n, {
          one: "خصم واحد",
          two: "خصمان",
          few: "{n} خصوم",
          many: "{n} خصمًا",
          other: "{n} خصم",
        }),
      invitedYou: (name: string) => `دعاك ${isolate(name)}`,
      seatsOpen: (n: number) =>
        plural("ar", n, {
          one: "مقعد واحد شاغر",
          two: "مقعدان شاغران",
          few: "{n} مقاعد شاغرة",
          many: "{n} مقعدًا شاغرًا",
          other: "{n} مقعد شاغر",
        }),
      invitedLine: (invited: string, seats: string) => `${invited}، ${seats}`,
      pending: (n: number) =>
        plural("ar", n, {
          one: "دعوة واحدة معلّقة",
          two: "دعوتان معلّقتان",
          few: "{n} دعوات معلّقة",
          many: "{n} دعوة معلّقة",
          other: "{n} دعوة معلّقة",
        }),
      footnote:
        "الفرق لك، لا للمجموعة. يمكن أن يكون للمجموعة فريق، لكن الفريق يحتفظ بسجله وخصومه.",
      emptyTitle: "ليس لديك فريق بعد",
      emptyCopy:
        "الفريق ينشر التحديات ويقبلها، ويحتفظ بسجل، ويجمع الخصوم. فرق البادل لاعبان؛ وفرق كرة القدم من خمسة إلى سبعة.",
      untilThen: "حتى ذلك الحين",
      browse:
        "يمكنك تصفّح التحديات المفتوحة. قبول أحدها يطلب منك إنشاء فريق أولًا.",
      invites: "تظهر هنا الدعوات من فرق اللاعبين الآخرين.",
    },
  },
  open: {
    emptyTitle: "لا تحديات مفتوحة بعد",
    emptyCopy:
      "تنشر الفرق تحديًا هنا عندما تبحث عن منافس: المستوى المطلوب، وأين ومتى تحب أن تلعب.",
    untilThen: "حتى ذلك الحين، جهّز فريقك.",
    filteredEmptyTitle: "لا تحديات مطابقة",
    filteredEmptyCopy: "جرّب رياضة أو مستوى أو منطقة أو يومًا آخر.",
    errorTitle: "تعذّر تحميل التحديات",
  },
  mine: {
    emptyTitle: "لا شيء بانتظارك",
    emptyCopy:
      "تظهر هنا تحديات فرقك، والعروض التي ترسلها، ومباريات التحدي الخاصة بك.",
    untilThen: "حتى ذلك الحين، أنشئ فريقًا أو أكمل قائمة فريقك.",
    postedTitle: "تحدياتك",
    waitingTitle: "بانتظارك",
    pendingTitle: "عروضك",
    acceptedTitle: "مقبولة، صارت مباريات",
    playedTitle: "لُعبت",
    proposedFor: (team: string) => `عرض مقدَّم إلى ${isolate(team)}`,
    acceptedLine: (team: string, opponent: string) =>
      `${isolate(team)} ضد ${isolate(opponent)}`,
    open: (title: string) => `افتح ${isolate(title)}`,
    nameYourSquad: "سمِّ تشكيلتك",
    cancelled: "أُلغيت المباراة",
    setScore: (us: number, them: number) => `${us}–${them}`,
    scoreSeparator: "، ",
  },
  goToTeams: "اعرض فرقك",
  marker: "تحدٍّ",
  teams: {
    invitedTitle: "دعوات إلى",
    invitedBy: (name: string) => `بدعوة من ${isolate(name)}`,
    join: "انضمام",
    joinA11y: (team: string) => `انضم إلى ${isolate(team)}`,
    createTeam: "إنشاء فريق",
    emptyTitle: "لا فريق بعد",
    emptyCopy: "الفرق لك، لا للمجموعة. أنشئ فريقًا لتنشر التحديات وتحتفظ بسجل.",
    createFirst: "أنشئ فريقًا",
    createFromGroup: (group: string) => `أنشئ من ${isolate(group)}`,
    lineSeparator: ". ",
    record: "ف–خ",
    recordWithDraws: "ف–ت–خ",
  },
  weekdays: {
    mon: "الإثنين",
    tue: "الثلاثاء",
    wed: "الأربعاء",
    thu: "الخميس",
    fri: "الجمعة",
    sat: "السبت",
    sun: "الأحد",
  },
  weekdayNames: {
    mon: "الإثنين",
    tue: "الثلاثاء",
    wed: "الأربعاء",
    thu: "الخميس",
    fri: "الجمعة",
    sat: "السبت",
    sun: "الأحد",
  },
  timings: {
    morning: "الصباح",
    afternoon: "بعد الظهر",
    evening: "المساء",
  },
  timingHints: {
    morning: "قبل الظهر",
    afternoon: "من الظهر حتى 6 مساءً",
    evening: "بعد 6 مساءً",
  },
  when: {
    anyDay: "أي يوم",
    anyTime: "أي وقت",
    weekdays: "أيام الأسبوع",
    weekends: "عطلة نهاية الأسبوع",
    listSeparator: "، ",
    line: (days: string, timings: string) => `${days} · ${timings}`,
    slots: (list: string) => `أو ${list}`,
  },
  card: {
    partSeparator: "، ",
    avg: (level: string) => `بمعدل ${isolate(level)}`,
    sportLine: (parts: string, wants: string) => `${parts}. ${wants}`,
    wants: (min: string, max: string) =>
      `يريد من ${isolate(min)} إلى ${isolate(max)}`,
    wantsOnly: (band: string) => `يريد ${isolate(band)}`,
    wantsAndUp: (band: string) => `يريد ${isolate(band)} فما فوق`,
    wantsAndUnder: (band: string) => `يريد ${isolate(band)} فما دون`,
    anyLevel: "مفتوح لأي مستوى",
    anyVenue: "أي ملعب",
    proposals: (n: number) =>
      n === 0
        ? "لا عروض بعد"
        : plural("ar", n, {
            one: "عرض واحد",
            two: "عرضان",
            few: "{n} عروض",
            many: "{n} عرضًا",
            other: "{n} عرض",
          }),
    daysLeft: (n: number) =>
      n === 0
        ? "اليوم الأخير"
        : plural("ar", n, {
            one: "يبقى يوم واحد",
            two: "يبقى يومان",
            few: "تبقى {n} أيام",
            many: "يبقى {n} يومًا",
            other: "يبقى {n} يوم",
          }),
    proposalsLine: (proposals: string, days: string) => `${proposals}، ${days}`,
    opponentSeats: "مطلوب منافس",
    open: (team: string) => `افتح تحدي ${isolate(team)}`,
    nudged: (team: string) =>
      `مباراة إعادة، أُرسلت مباشرة إلى ${isolate(team)}. وهي على اللوحة المفتوحة أيضًا.`,
  },
  ineligible: {
    noTeam: {
      padel: "تحتاج إلى فريق بادل لتقدّم عرضًا",
      football: "تحتاج إلى فريق كرة قدم لتقدّم عرضًا",
    },
    rosterShort: (side: string) => `قائمة فريقك لا تكفي لمباراة ${side}`,
    padelIncomplete: "فريق البادل يحتاج إلى اللاعبَين",
    levelOutside: "مستوى فريقك خارج المستوى المطلوب",
    noLevel: "لا يوجد لاعب مصنّف في فريقك بعد",
    sharesMember: "فريقك يشترك في لاعب مع هذا الفريق",
    own: "تحدي فريقك",
  },
  filters: {
    label: "تصفية التحديات",
    sport: "الرياضة",
    level: "المستوى",
    area: "المنطقة",
    day: "اليوم",
    any: "الكل",
    clear: "مسح التصفية",
    chip: (name: string, value: string) => `${name}: ${value}`,
  },
  post: {
    cta: "انشر تحديًا",
    title: "تحدٍّ جديد",
    noTeamsTitle: "لا يمكن لأي من فرقك النشر الآن",
    noTeamsCopy:
      "فريق البادل يحتاج إلى اللاعبَين، وفريق كرة القدم إلى خمسة في القائمة، ولكل فريق تحدٍّ مفتوح واحد في كل مرة.",
    team: "الفريق",
    teamHint: "الرياضة تأتي من الفريق",
    you: "أنت",
    teamPair: (first: string, second: string) =>
      `${isolate(first)} و${isolate(second)}`,
    teamFootball: (sportAndLevel: string, roster: string) =>
      `${sportAndLevel}. ${roster}`,
    format: "الصيغة",
    rosterOf: (n: number, max: number) => `القائمة ${n} من ${max}`,
    formatNeeds: (side: string, n: number) =>
      plural("ar", n, {
        one: `${side} تحتاج إلى لاعب واحد في القائمة`,
        two: `${side} تحتاج إلى لاعبَين في القائمة`,
        few: `${side} تحتاج إلى {n} لاعبين في القائمة`,
        many: `${side} تحتاج إلى {n} لاعبًا في القائمة`,
        other: `${side} تحتاج إلى {n} لاعب في القائمة`,
      }),
    formatList: (sideSizes: readonly number[]) => {
      const sizes = sideSizes.map((size) => `${size} ضد ${size}`);
      const last = sizes.pop();
      return sizes.length > 0 ? `${sizes.join("، ")} و${last}` : (last ?? "");
    },
    formatRosterAll: (team: string, roster: string) =>
      `لدى ${isolate(team)} ${roster}، وهذا يكفي لأي صيغة.`,
    formatRosterSome: (team: string, roster: string, formats: string) =>
      `لدى ${isolate(team)} ${roster}، وهذا يكفي لـ${formats}.`,
    formatSquad: (side: number, reserves: number) =>
      `يختار القائدان تشكيلتين من ${side} لاعبين وحتى ${reserves} احتياطيين بعد تأكيد التحدي.`,
    formatSquadAny: (reserves: number) =>
      `يختار القائدان تشكيلتين بحجم الصيغة وحتى ${reserves} احتياطيين بعد تأكيد التحدي.`,
    venues: "الملاعب المفضلة",
    venuesPicked: (n: number) =>
      plural("ar", n, {
        one: "ملعب واحد مختار",
        two: "ملعبان مختاران",
        few: "{n} ملاعب مختارة",
        many: "{n} ملعبًا مختارًا",
        other: "{n} ملعب مختار",
      }),
    venuesUpTo: (max: number) => `حتى ${max}`,
    anywhere: "أي مكان",
    anywhereIn: (area: string) => `أي مكان في ${isolate(area)}`,
    days: "الأيام",
    timings: "الأوقات",
    timingsHint: "أو أضف مواعيد محددة",
    timingChips: {
      morning: "صباحًا",
      afternoon: "ظهرًا",
      evening: "مساءً",
    },
    slotLabel: (day: string, time: string) => `${day} ${time}`,
    slotTitle: "أضف موعدًا",
    slotDay: "اليوم",
    slotTime: "البدء",
    addSlot: "أضف موعدًا",
    removeSlot: (slot: string) => `إزالة ${isolate(slot)}`,
    level: "المستوى المطلوب",
    levelRange: (min: string, max: string) =>
      `${isolate(min)} إلى ${isolate(max)}`,
    levelAndUp: (band: string) => `${isolate(band)} فما فوق`,
    levelAndUnder: (band: string) => `${isolate(band)} فما دون`,
    anyLevel: "أي مستوى",
    note: "سطر عنكم",
    noteShown: "يظهر على البطاقة",
    noteCount: (n: number, max: number) => `${n} / ${max}`,
    review: "مراجعة",
    edit: "تعديل",
    submit: "انشر التحدي",
    posted: "نُشر التحدي",
    errorTitle: "تعذّر تحميل فرقك",
  },
  review: {
    title: "مراجعة",
    cardTitle: "كيف يظهر على اللوحة",
    rows: {
      team: "الفريق",
      format: "الصيغة",
      visibleTo: "يراه",
      openFor: "مفتوح لمدة",
      proposals: "العروض",
    },
    team: (team: string, roster: string) => `${isolate(team)}، ${roster}`,
    format: (side: string, squad: number) =>
      `${side}. تشكيلات حتى ${squad} لاعبين تُختار بعد التأكيد`,
    visibleTeams: {
      padel: "فرق البادل",
      football: "فرق كرة القدم",
    },
    visibleEvery: {
      padel: "كل فريق بادل على Temba",
      football: "كل فريق كرة قدم على Temba",
    },
    inArea: (area: string) => `في ${isolate(area)}`,
    openFor: (days: number) =>
      plural("ar", days, {
        one: "يوم واحد، ثم ينتهي",
        two: "يومان، ثم ينتهي",
        few: "{n} أيام، ثم ينتهي",
        many: "{n} يومًا، ثم ينتهي",
        other: "{n} يوم، ثم ينتهي",
      }),
    proposals: "تؤكد واحدًا، ويُبلَّغ الباقون",
    nudge: "هل ترسله أيضًا مباشرة إلى فريق لعبتم ضده؟",
    nudgeBefore: "هل ترسله أيضًا مباشرة إلى فريق لعبتم ضده؟ يصل تنبيه إلى ",
    nudgeAfter: " ويبقى التحدي على اللوحة المفتوحة.",
    nudgeTeams: "فرق لعبتم ضدها",
  },
  errors: {
    pickTeam: "اختر فريقًا",
    formatRequired: "اختر صيغة: 5 أو 6 أو 7 ضد مثلها",
    formatOnPadel: "تحديات البادل بلا صيغة",
    formatUnknown: "الصيغة 5 أو 6 أو 7 ضد مثلها",
    formatRoster: (side: string, count: number) =>
      plural("ar", count, {
        one: `${side} تحتاج إلى هذا العدد في القائمة. في قائمتك لاعب واحد.`,
        two: `${side} تحتاج إلى هذا العدد في القائمة. في قائمتك لاعبان.`,
        few: `${side} تحتاج إلى هذا العدد في القائمة. في قائمتك {n} لاعبين.`,
        many: `${side} تحتاج إلى هذا العدد في القائمة. في قائمتك {n} لاعبًا.`,
        other: `${side} تحتاج إلى هذا العدد في القائمة. في قائمتك {n} لاعب.`,
      }),
    padelRoster: "فريق البادل يحتاج إلى اللاعبَين لينشر",
    noteTooLong: (max: number) => `اجعل السطر ${max} حرفًا كحد أقصى`,
    venueSport: {
      padel: "اختر ملاعب فيها ملعب بادل",
      football: "اختر ملاعب فيها ملعب كرة قدم",
    },
    tooManyVenues: (max: number) => `اختر حتى ${max} ملاعب`,
    tooManySlots: (max: number) => `أضف حتى ${max} مواعيد`,
    slotPast: "يجب أن تكون المواعيد المحددة في المستقبل",
    alreadyOpen: "لهذا الفريق تحدٍّ مفتوح. اسحبه لتنشر غيره.",
    notActing: "هذا متاح فقط لمن يتصرف باسم الفريق",
    nudgeOwn: "أرسله إلى فريق آخر، لا إلى فريقك",
    nudgeSport: "أرسله إلى فريق من الرياضة نفسها",
    nudgeNotPlayed: "يمكنك إرساله مباشرة فقط إلى فريق لعبتم ضده",
    notOpen: "هذا التحدي لم يعد مفتوحًا",
    pickVenue: "اختر ملعبًا",
    pickSlot: "اختر وقتًا",
    slotTooSoon: "اختر وقتًا بعد ساعة على الأقل",
    slotTooFar: (days: number) => `اختر وقتًا خلال ${days} يومًا`,
    courtVenue: "هذا الملعب الفرعي ليس في هذا الملعب أو ليس لهذه الرياضة",
    alreadyProposed: "لفريقك عرض معلّق هنا. غيّره بدلًا من ذلك.",
    proposalNotFound: "العرض غير موجود",
    proposalNotPending: "هذا العرض لم يعد معلّقًا",
    setByChallenge: "الفريقان يحددهما التحدي؛ والقادة يسمّون التشكيلات",
    squad: {
      notFootball: "مباراة التحدي في كرة القدم وحدها لها تشكيلات تُسمّى",
      padel: "في البادل، اللاعبان هما التشكيلة",
      notOnGame: "هذا الفريق ليس في هذه المباراة",
      cancelled: "أُلغيت هذه المباراة",
      locked: "تُقفل التشكيلات بعد تسجيل النتيجة",
      duplicate: "سمِّ كل لاعب مرة واحدة",
      tooMany: (seats: number) => `سمِّ حتى ${seats}: الأساسيون وثلاثة احتياط`,
      notOnRoster: "يجب أن يكون كل من تسمّيه في قائمة الفريق",
      otherSide: (name: string) => `${isolate(name)} مُسمّى للفريق الآخر`,
    },
    nameBothSquads: "سمِّ التشكيلتين أولًا",
    recheck: {
      rosterShort: (team: string, side: string) =>
        `قائمة ${isolate(team)} لا تكفي لمباراة ${side}`,
      padelIncomplete: (team: string) => `${isolate(team)} يحتاج إلى اللاعبَين`,
      levelOutside: (team: string) =>
        `مستوى ${isolate(team)} خارج المستوى المطلوب`,
      noLevel: (team: string) => `لا لاعب مصنَّف في ${isolate(team)} بعد`,
      sharesMember: "الفريقان يتشاركان لاعبًا",
      tooSoon: "يبدأ هذا العرض خلال ساعة. اطلب وقتًا آخر.",
    },
  },
  proposal: {
    sent: (day: string) => `أُرسل ${day}`,
    expiresIn: (hours: number) => `ينتهي خلال ${hours} س`,
    expiresWithinHour: "ينتهي خلال الساعة",
    expired: "انتهت مدته",
    at: (venue: string, court: string) =>
      `${isolate(venue)}، ${isolate(court)}`,
    price: (amount: string) => `${amount} للفرد`,
    from: (team: string) => `من ${isolate(team)}`,
    waitingOn: (team: string) => `بانتظار تأكيد ${isolate(team)}`,
    anotherTime: "وقت آخر",
    anotherTimeA11y: (team: string) => `وقت آخر لـ ${isolate(team)}`,
    declineConfirm: {
      title: "تطلب وقتًا آخر؟",
      description: "يُرفض العرض ويمكن لفريقهم إرسال عرض جديد.",
      confirm: "وقت آخر",
    },
    declined: "رُفض العرض",
    change: "غيّر العرض",
    withdraw: "اسحب العرض",
    withdrawConfirm: {
      title: "تسحب عرضك؟",
      description: "يمكن لفريقك تقديم عرض جديد ما دام التحدي مفتوحًا.",
      confirm: "اسحب",
    },
    withdrawn: "سُحب العرض",
    queueTitle: "العروض",
    pendingTitle: "عرضك",
    confirm: "أكّد، واجعلها مباراة",
    confirmA11y: (team: string) => `أكّد عرض ${isolate(team)}`,
    confirmSheet: {
      title: "تجعلها مباراة؟",
      description:
        "تُنشأ المباراة والفريقان فيها. وتُتجاوز العروض الأخرى ويُبلَّغ أصحابها.",
      confirm: "أكّد، واجعلها مباراة",
    },
    confirmed: "صارت مباراة",
  },
  accept: {
    cta: "اقبل",
    ctaA11y: (team: string) => `اقبل تحدي ${isolate(team)}`,
    title: "اقبل التحدي",
    changeTitle: "غيّر عرضك",
    description: "القبول وقت وملعب، لا أكثر.",
    team: "فريقك",
    venue: "الملعب",
    preferred: "مفضّل",
    preferredVenue: (venue: string) => `${isolate(venue)}، مفضّل`,
    court: "الملعب الفرعي",
    courtHint: "اختياري. اتركه فارغًا إن لم تحجز بعد.",
    anyCourt: "لا ملعب بعد",
    day: "اليوم",
    time: "البداية",
    noSlots:
      "لم يبقَ وقت مقترح خلال الأسبوعين القادمين. اطلب من الفريق النشر من جديد.",
    price: "السعر للفرد",
    priceHint: "اختياري. يظهر في المباراة كتكلفة على كل لاعب.",
    pricePlaceholder: "1.500",
    send: (team: string) => `أرسل العرض إلى ${isolate(team)}`,
    sent: "أُرسل العرض",
    changed: "تغيّر العرض",
    footer: "لديهم 48 ساعة للتأكيد.",
    errorTitle: "تعذّر تحميل خياراتك",
    noTeams: "لا يمكن لأي من فرقك تقديم عرض على هذا التحدي",
  },
  detail: {
    title: "التحدي",
    record: "السجل",
    when: "متى",
    where: "أين",
    level: "المستوى المطلوب",
    note: "من الفريق",
    postedBy: (name: string, day: string) => `نشره ${isolate(name)}، ${day}`,
    proposeWith: (teams: string) => `يمكنك تقديم عرض مع ${isolate(teams)}`,
    closed: {
      expired: "انتهت مدة هذا التحدي",
      withdrawn: "سُحب هذا التحدي",
      confirmed: "تأكد هذا التحدي",
    },
    withdraw: "اسحب التحدي",
    withdrawConfirm: {
      title: "تسحب هذا التحدي؟",
      description:
        "سيغادر لوحة التحديات المفتوحة. يمكنك نشر تحدٍّ جديد في أي وقت.",
      confirm: "اسحب",
    },
    withdrawn: "سُحب التحدي",
    game: {
      title: "المباراة",
      when: "الانطلاق",
      proposedConfirmed: (proposer: string, confirmer: string) =>
        `اقترحها ${isolate(proposer)}، وأكّدها ${isolate(confirmer)}`,
      pitch: "الملعب",
      court: "الملعب الفرعي",
      place: (venue: string, court: string) =>
        `${isolate(venue)}، ${isolate(court)}`,
      bookYourselves: "احجزوه بأنفسكم",
      cost: "التكلفة",
      costEach: (amount: string) => `${amount} للفرد، الدفع في الملعب`,
      costSplit: "تُقسم على أربعة، الدفع في الملعب",
      costAtVenue: "الدفع في الملعب",
      squads: "التشكيلات",
      open: "افتح المباراة",
      cancelled: "أُلغيت المباراة",
    },
    notFound: "التحدي غير موجود",
    errorTitle: "تعذّر تحميل هذا التحدي",
  },
  squad: {
    side: "أساسي",
    reserve: "احتياط",
    counterNamed: (
      named: number,
      seats: number,
      side: number,
      reserves: number,
    ) => `سُمّي ${named} من ${seats}، ${side} + ${reserves} احتياط`,
    counterShort: (named: number, toName: number, seats: number) =>
      `${named} + ${toName} للتسمية، ${named} من ${seats}`,
    counterEmpty: (seats: number) => `لم يُسمَّ أحد بعد، 0 من ${seats}`,
    nameYourSquad: "سمِّ تشكيلتك",
    editYourSquad: "عدّل تشكيلتك",
    nameSquadFor: (team: string) => `سمِّ تشكيلة ${isolate(team)}`,
    editSquadFor: (team: string) => `عدّل تشكيلة ${isolate(team)}`,
    seatEmpty: (label: string) => `${label}، لم يُسمَّ بعد`,
    seatNamed: (label: string, name: string, role: string) =>
      `${label}: ${isolate(name)}، ${role}`,
    squadOf: (team: string) => `تشكيلة ${isolate(team)}`,
    saved: "حُفظت التشكيلة",
    sheet: {
      title: (day: string) => `تشكيلتك ليوم ${day}`,
      titleUndated: "تشكيلتك",
      help: (format: string, side: number, reserves: number) =>
        `${format}، أي ${side} أساسيين وحتى ${reserves} احتياط. سمِّ ${side} على الأقل لتأكيدها.`,
      counter: (named: number, seats: number, roster: number) =>
        `سُمّي ${named} من ${seats} من أصل ${roster} في القائمة`,
      sideCounter: (n: number) => `الأساسيون، ${n}`,
      reserveCounter: (n: number) => `الاحتياط، حتى ${n}`,
      short: (n: number) =>
        plural("ar", n, {
          one: "ينقص لاعب واحد لاكتمال الأساسيين. يمكنك الحفظ وتسمية الباقين لاحقًا.",
          two: "ينقص لاعبان لاكتمال الأساسيين. يمكنك الحفظ وتسمية الباقين لاحقًا.",
          few: "ينقص {n} لاعبين لاكتمال الأساسيين. يمكنك الحفظ وتسمية الباقين لاحقًا.",
          many: "ينقص {n} لاعبًا لاكتمال الأساسيين. يمكنك الحفظ وتسمية الباقين لاحقًا.",
          other:
            "ينقص {n} لاعب لاكتمال الأساسيين. يمكنك الحفظ وتسمية الباقين لاحقًا.",
        }),
      full: (seats: number) =>
        `اكتملت التشكيلة عند ${seats}. أزل لاعبًا لتضيف آخر.`,
      footer:
        "يُبلَّغ اللاعبون المُسمّون ويرون المباراة في تبويب المباريات. بقية القائمة تراها لكنها لا تلعب. يمكنك تغيير ذلك حتى تُدخَل النتيجة.",
      confirm: (n: number) => `أكّد التشكيلة، ${n} مُسمّى`,
      captain: "القائد",
      select: (name: string) => `سمِّ ${isolate(name)}`,
      deselect: (name: string) => `أخرج ${isolate(name)} من التشكيلة`,
      rosterLoadFailed: "تعذّر تحميل قائمة الفريق",
      namedOf: (named: number, seats: number) => `سُمّي ${named} من ${seats}`,
      fromRoster: (roster: number) => `من أصل ${roster} في القائمة`,
      you: "أنت",
      youCaptain: "أنت، القائد",
      addedByYou: "أضفته أنت، ليس على تمبا",
      addedByCaptain: "أضافه القائد، ليس على تمبا",
      moreOnRoster: (n: number) =>
        plural("ar", n, {
          one: "ولاعب آخر في القائمة",
          two: "ولاعبان آخران في القائمة",
          few: "و{n} لاعبين آخرين في القائمة",
          many: "و{n} لاعبًا آخر في القائمة",
          other: "و{n} لاعب آخر في القائمة",
        }),
      metaJoin: "، ",
      sentenceJoin: ". ",
      close: "إغلاق",
    },
    open: "شاغر",
    namedOf: (named: number, seats: number) => `سُمّي ${named} من ${seats}`,
    sideReserves: (side: number, reserves: number) =>
      `${side} + ${reserves} احتياط`,
    toName: (named: number, toName: number) => `${named} + ${toName} للتسمية`,
    ofSeats: (named: number, seats: number) => `${named} من ${seats}`,
    nobodyNamed: "لم يُسمَّ أحد بعد",
    note: "يسمّي القائدان التشكيلتين بعد التأكيد، من القائمة، حتى عدد الأساسيين زائد ثلاثة. يمكن التعديل حتى تُدخَل النتيجة. وحدهم اللاعبون المُسمّون يحصلون على النتيجة والتقييمات والمواجهات.",
  },
  gameDetails: {
    versus: "ضد",
    tag: "تحدٍّ",
    teamVsTeam: (home: string, away: string) =>
      `${isolate(home)} ضد ${isolate(away)}`,
    firstMeeting: "أول لقاء",
    headToHead: (line: string) => `المواجهات ${line}`,
    firstMeetingShort: "أول لقاء",
    headToHeadShort: (line: string) => `المواجهات ${line}`,
    recordYouCaptain: (record: string) => `${record}، أنت القائد`,
    fromChallenge: "من التحدي",
    postedBy: (team: string) => `نشره ${isolate(team)}`,
    postedByOn: (team: string, day: string) => `نشره ${isolate(team)}، ${day}`,
    proposedBy: "اقترحه",
    proposedConfirmed: (team: string, confirmer: string) =>
      `${isolate(team)}، وأكّده ${isolate(confirmer)}`,
    you: "أنت",
    placeBook: (place: string, hint: string) => `${place}. ${hint}`,
    confirmedByBoth: "أكّده الفريقان",
    subLineConfirmed: (line: string) => `${line}. أكّده الفريقان`,
    countsFor: "تُحتسب في",
    countsForLine: {
      padel: "سجلّ الفريقين، واللاعبين المُسمّين، والتقييم",
      football: "سجلّ الفريقين واللاعبين المُسمّين",
    },
    costSplitWays: (n: number) => `تُقسم على ${n}، الدفع في الملعب`,
    squadsTitle: "التشكيلات",
  },
  detailScreen: {
    status: {
      open: (daysLeft: number) =>
        daysLeft === 0
          ? "تحدٍّ مفتوح، آخر يوم"
          : plural("ar", daysLeft, {
              one: "تحدٍّ مفتوح، بقي يوم واحد",
              two: "تحدٍّ مفتوح، بقي يومان",
              few: "تحدٍّ مفتوح، بقيت {n} أيام",
              many: "تحدٍّ مفتوح، بقي {n} يومًا",
              other: "تحدٍّ مفتوح، بقي {n} يوم",
            }),
      proposalSent: (team: string) => `أُرسل العرض، بانتظار ${isolate(team)}`,
      confirmed: "تأكّد، وصار مباراة",
    },
    versus: "ضد",
    opponentName: "فريقك؟",
    opponentLine: "ليس بعد",
    teamLine: (level: string, rest: string) => `${isolate(level)}، ${rest}`,
    footballLine: (level: string, roster: string) =>
      `${isolate(level)}. ${roster}`,
    withSport: (sport: string, line: string) => `${sport}، ${line}`,
    twoNames: (first: string, second: string) =>
      `${isolate(first)} و${isolate(second)}`,
    nameSeparator: "، ",
    you: "أنت",
    rows: {
      level: "المستوى المطلوب",
      venues: "الملاعب المفضّلة",
      days: "الأيام",
      timings: "الأوقات",
      exactTimes: "مواعيد محددة",
      record: "السجل",
      posted: "نُشر",
    },
    level: {
      range: (min: string, max: string) =>
        `من ${isolate(min)} إلى ${isolate(max)}`,
      andUp: (band: string) => `${isolate(band)} فما فوق`,
      andUnder: (band: string) => `${isolate(band)} فما دون`,
      any: "أي مستوى",
    },
    timingRanges: {
      morning: "قبل الظهر",
      afternoon: "من الظهر إلى 6 مساءً",
      evening: "بعد 6 مساءً",
    },
    timingWithRange: (timing: string, range: string) => `${timing}، ${range}`,
    recordValue: (team: string, record: string) =>
      `${isolate(team)} ${isolate(record)}`,
    postedValue: (day: string, name: string) => `${day}، نشره ${isolate(name)}`,
    note: "من الفريق",
    footer: {
      proposals: (n: number) =>
        n === 0
          ? "لا عروض بعد"
          : plural("ar", n, {
              one: "عرض واحد حتى الآن",
              two: "عرضان حتى الآن",
              few: "{n} عروض حتى الآن",
              many: "{n} عرضًا حتى الآن",
              other: "{n} عرض حتى الآن",
            }),
      hint: "يختارون واحدًا ويؤكّدونه",
    },
    ago: {
      justNow: "الآن",
      minutes: (n: number) => `قبل ${n} د`,
      hours: (n: number) => `قبل ${n} س`,
      days: (n: number) =>
        plural("ar", n, {
          one: "قبل يوم",
          two: "قبل يومين",
          few: "قبل {n} أيام",
          many: "قبل {n} يومًا",
          other: "قبل {n} يوم",
        }),
    },
    proposal: {
      waiting: (team: string) => `عرضك، بانتظار ${isolate(team)}`,
      sent: (ago: string) => `أُرسل ${ago}.`,
      theyHave: (hours: number) =>
        hours <= 1
          ? "أمامهم أقل من ساعة للتأكيد."
          : plural("ar", hours, {
              one: "أمامهم ساعة واحدة للتأكيد.",
              two: "أمامهم ساعتان للتأكيد.",
              few: "أمامهم {n} ساعات للتأكيد.",
              many: "أمامهم {n} ساعة للتأكيد.",
              other: "أمامهم {n} ساعة للتأكيد.",
            }),
      youHave: (hours: number) =>
        hours <= 1
          ? "أمامك أقل من ساعة للتأكيد."
          : plural("ar", hours, {
              one: "أمامك ساعة واحدة للتأكيد.",
              two: "أمامك ساعتان للتأكيد.",
              few: "أمامك {n} ساعات للتأكيد.",
              many: "أمامك {n} ساعة للتأكيد.",
              other: "أمامك {n} ساعة للتأكيد.",
            }),
      lines: (sent: string, clock: string) => `${sent} ${clock}`,
      time: "الوقت",
      venue: "الملعب",
      price: "السعر",
      change: "غيّر العرض",
      withdraw: "اسحب",
      footnote: {
        padel:
          "لم يُحجز شيء بعد. حجز الملعب عليكما بعد أن يؤكّدوا؛ تمبا لا يحجزه.",
        football:
          "لم يُحجز شيء بعد. حجز الملعب عليكما بعد أن يؤكّدوا؛ تمبا لا يحجزه.",
      },
    },
    queue: {
      title: "العروض",
      empty: "لا عروض بعد. الفرق المناسبة تراه في لوحة التحديات المفتوحة.",
      hint: "اختر واحدًا وأكّده. ويُبلَّغ الآخرون.",
      confirm: "أكّد",
      another: "وقت آخر",
    },
    confirmed: {
      dayAt: (day: string, venue: string) => `${day}، ${isolate(venue)}`,
      placeFor: (place: string, duration: string) => `${place}، ${duration}`,
      duration: (minutes: number) => `${minutes} دقيقة`,
      viewGame: "اعرض المباراة",
      proposedBy: "اقترحه",
      confirmedBy: "أكّده",
      you: "أنت",
      byTeam: (name: string, team: string) =>
        `${isolate(name)}، ${isolate(team)}`,
      byTeamAgo: (name: string, team: string, ago: string) =>
        `${isolate(name)}، ${isolate(team)}، ${ago}`,
      bookIt: (place: string) => `احجزه: ${place}`,
      closedNote:
        "أُغلق هذا التحدي. كل شيء آخر يجري في المباراة: التشكيلة والنتيجة والشارات وبطاقة النتيجة.",
    },
    accept: {
      subtitle: (team: string) =>
        `اقترح وقتًا وملعبًا. يؤكّد ${isolate(team)}، فتصبح مباراة.`,
      toldOne: (name: string) =>
        `يُبلَّغ ${isolate(name)} حين تقدّم العرض، ومرة أخرى إن أكّدوا.`,
      toldRoster: "تُبلَّغ قائمة فريقك حين تقدّم العرض، ومرة أخرى إن أكّدوا.",
      venueHint: "المفضّلة لديهم أولًا",
      theirFirst: "خيارهم الأول",
      theirSecond: "خيارهم الثاني",
      theirPick: "من خياراتهم",
      youSuggest: "اقتراحك",
      somewhereElse: "مكان آخر",
      orSeparator: " أو ",
      daysTimings: (days: string, timings: string) => `${days} ${timings}`,
      timingsAfterDays: {
        morning: "صباحًا",
        afternoon: "ظهرًا",
        evening: "مساءً",
      },
      anyTime: "أي يوم، أي وقت",
      slotDay: (weekday: string, day: string) => `${weekday} ${day}`,
      moreTimes: "مواعيد أخرى",
      extras: "أضف ملعبًا فرعيًا أو سعرًا",
      propose: (when: string, venue: string) =>
        `اقترح ${when} في ${isolate(venue)}`,
      change: (when: string, venue: string) =>
        `غيّره إلى ${when} في ${isolate(venue)}`,
      proposeIncomplete: "اقترح",
      changeIncomplete: "غيّر العرض",
    },
  },
} satisfies typeof source;
