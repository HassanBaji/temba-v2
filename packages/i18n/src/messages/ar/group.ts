import { isolate } from "../../bidi";
import { plural } from "../../plural";
import type { group as source } from "../en/group";

function winPoints(n: number) {
  return plural("ar", n, {
    one: "نقطة واحدة",
    two: "نقطتان",
    few: "{n} نقاط",
    many: "{n} نقطة",
    other: "{n} نقطة",
  });
}

export const group = {
  untitled: "مجموعة بلا اسم",
  metaSeparator: "، ",
  memberCount: (n: number) =>
    plural("ar", n, {
      zero: "0 أعضاء",
      one: "عضو واحد",
      two: "عضوان",
      few: "{n} أعضاء",
      many: "{n} عضوًا",
      other: "{n} عضو",
    }),
  pastDay: {
    today: "اليوم",
    yesterday: "أمس",
    daysAgo: (n: number) =>
      plural("ar", n, {
        one: "قبل يوم",
        two: "قبل يومين",
        few: "قبل {n} أيام",
        many: "قبل {n} يومًا",
        other: "قبل {n} يوم",
      }),
    requested: (when: string) => `طُلب ${when}`,
  },
  list: {
    rowMeta: (members: string, rank: number) => `${members}، ترتيبك ${rank}`,
    mineEmptyTitle: "لا مجموعات بعد",
    mineEmptyCopy:
      "اختر البادل أو كرة القدم، وادعُ اللاعبين، وتتولى Temba الترتيب والسجل.",
    placeholderTitle: "مجموعتك الأولى",
    publicEmptyTitle: "لا مجموعات عامة للانضمام إليها الآن",
    publicEmptyLine: "تظهر المجموعات العامة هنا. أنشئ واحدة ليجدها اللاعبون.",
    publicEmptyLineSport: (sport: string) =>
      `تظهر مجموعات ${sport} العامة هنا. أنشئ واحدة ليجدها اللاعبون.`,
  },
  home: {
    since: (month: string) => `منذ ${month}`,
    backToGroups: "العودة إلى المجموعات",
    openSeats: "أماكن شاغرة",
    organizerAction: {
      appoint: "تعيين منظّمًا",
      dismiss: "إزالة كمنظّم",
    },
    organizerHint: {
      appoint: "يمكنه إنشاء المباريات وتحديد الفرق وإضافة اللاعبين",
      dismiss: "يفقد حق إنشاء المباريات وتحديد الفرق وإضافة اللاعبين",
    },
    organizerToast: {
      appointed: (name: string) => `${name} أصبح منظّمًا الآن.`,
      dismissed: (name: string) => `${name} لم يعد منظّمًا.`,
    },
  },
  played: {
    cancelled: "ملغاة",
    noScoreYet: "لا نتيجة بعد",
    untitled: "مباراة",
    filtersLabel: "تصفية المباريات السابقة",
    filters: {
      finished: "منتهية",
      needs_score: "بانتظار النتيجة",
      cancelled: "ملغاة",
      all: "الكل",
    },
    filterSpoken: (label: string, n: number) =>
      `${label}، ${plural("ar", n, {
        zero: "لا مباريات",
        one: "مباراة واحدة",
        two: "مباراتان",
        few: "{n} مباريات",
        many: "{n} مباراة",
        other: "{n} مباراة",
      })}`,
    filterEmpty: {
      finished: "لا مباريات منتهية بعد.",
      needs_score: "كل المباريات لها نتيجة.",
      cancelled: "لا مباريات ملغاة.",
      all: "لا مباريات بعد.",
    },
    showAll: "عرض كل المباريات",
    enterScore: "أدخل النتيجة",
    you: "فريقك",
    versus: (first: string, second: string) => `${first} ضد ${second}`,
    pair: (first: string, second: string) => `${first} و${second}`,
    record: (wins: number, draws: number | null, losses: number) =>
      draws == null
        ? `فوز ${wins} · خسارة ${losses}`
        : `فوز ${wins} · تعادل ${draws} · خسارة ${losses}`,
    recordSpoken: (wins: number, draws: number | null, losses: number) =>
      draws == null
        ? `فوز ${wins}، خسارة ${losses}`
        : `فوز ${wins}، تعادل ${draws}، خسارة ${losses}`,
    monthCount: (n: number) =>
      plural("ar", n, {
        zero: "لا مباريات",
        one: "مباراة واحدة",
        two: "مباراتان",
        few: "{n} مباريات",
        many: "{n} مباراة",
        other: "{n} مباراة",
      }),
    joined: (joined: number, allowed: number) => `انضم ${joined} من ${allowed}`,
    joinedOpen: (joined: number) => `انضم ${joined}`,
    sideSpoken: (name: string, score: string) => `${name} ${score}`,
    card: (parts: string[]) => parts.join(". "),
  },
  empty: {
    standingAfterFirstResult: "يظهر الترتيب بعد أول نتيجة.",
    standingSeatsFilled: (filled: number, total: number) =>
      plural("ar", total, {
        one: `شُغل ${filled} من مكان واحد. يظهر الترتيب بعد أول نتيجة.`,
        two: `شُغل ${filled} من مكانين. يظهر الترتيب بعد أول نتيجة.`,
        few: `شُغل ${filled} من {n} أماكن. يظهر الترتيب بعد أول نتيجة.`,
        many: `شُغل ${filled} من {n} مكانًا. يظهر الترتيب بعد أول نتيجة.`,
        other: `شُغل ${filled} من {n} مكان. يظهر الترتيب بعد أول نتيجة.`,
      }),
    games: "حين تُحدَّد مباراة بفترة مفتوحة أو بمواجهة، تظهر هنا.",
    gamesNeedPlayers: (sport: string, needed: number, have: number) =>
      plural("ar", needed, {
        one: `${sport}: يلزم لاعب واحد، ولديك ${have}. حين تُحدَّد مباراة بفترة مفتوحة أو بمواجهة، تظهر هنا.`,
        two: `${sport}: يلزم لاعبان، ولديك ${have}. حين تُحدَّد مباراة بفترة مفتوحة أو بمواجهة، تظهر هنا.`,
        few: `${sport}: يلزم {n} لاعبين، ولديك ${have}. حين تُحدَّد مباراة بفترة مفتوحة أو بمواجهة، تظهر هنا.`,
        many: `${sport}: يلزم {n} لاعبًا، ولديك ${have}. حين تُحدَّد مباراة بفترة مفتوحة أو بمواجهة، تظهر هنا.`,
        other: `${sport}: يلزم {n} لاعب، ولديك ${have}. حين تُحدَّد مباراة بفترة مفتوحة أو بمواجهة، تظهر هنا.`,
      }),
    aGame: "المباراة",
  },
  join: {
    gamesEmptyDescription:
      "حين تُحدَّد مباراة بفترة مفتوحة أو بمواجهة، ستظهر هنا.",
    requiresApprovalMeta: (members: string) => `${members} · تتطلب موافقة`,
    label: {
      requested: "تم الطلب",
      requestToJoin: "طلب الانضمام",
      requesting: "جارٍ الطلب…",
      joining: "جارٍ الانضمام…",
      joinGroup: "انضم إلى المجموعة",
      join: "انضم",
    },
    toast: {
      requested: "تم طلب الانضمام",
      joined: "انضممت إلى المجموعة",
      left: "غادرت المجموعة",
    },
    leaveConfirm: {
      title: (name: string) => `مغادرة ${name}؟`,
      description: "ستغادر هذه المجموعة.",
      confirmLabel: "مغادرة المجموعة",
    },
  },
  admin: {
    requireApproval: "تتطلب موافقة",
    requestsErrorTitle: "تعذّر تحميل طلبات الانضمام",
    imageSavedToast: "تم حفظ الصورة",
    imageRemovedToast: "تمت إزالة الصورة",
    deletedToast: "تم حذف المجموعة",
    deleteConfirm: {
      title: (name: string) => `حذف ${name}؟`,
      description: "لا يمكن التراجع عن هذا.",
      confirmLabel: "حذف المجموعة",
    },
    removeImageConfirm: {
      title: (name: string) => `إزالة صورة ${name}؟`,
      description: "ستُزال الصورة الحالية.",
      confirmLabel: "إزالة الصورة",
    },
    requestMeta: {
      viaInviteLinkFrom: (name: string, when: string) =>
        `عبر رابط دعوة من ${name}، ${when}`,
      viaInviteLink: (when: string) => `عبر رابط دعوة، ${when}`,
    },
    requestsBanner: (n: number) =>
      plural("ar", n, {
        one: "شخص واحد يريد الانضمام",
        two: "شخصان يريدان الانضمام",
        few: "{n} أشخاص يريدون الانضمام",
        many: "{n} شخصًا يريدون الانضمام",
        other: "{n} شخص يريدون الانضمام",
      }),
    requestsHeading: (n: number) =>
      plural("ar", n, {
        one: "1 يريد الانضمام",
        two: "2 يريدان الانضمام",
        other: "{n} يريدون الانضمام",
      }),
    reviewLabel: "مراجعة",
    changeLabel: "تغيير",
    policy: {
      approve: "يوافق المنظّمون على الأعضاء الجدد",
      open: "يمكن لأي شخص لديه الرابط الانضمام",
    },
    requestsSummary: {
      openLine: "انضمام فوري، بلا مراجعة",
      waitingTitle: "لا طلبات بانتظار الرد",
      approvedToday: (n: number) =>
        `يوافق المنظّمون على الأعضاء الجدد، تمت الموافقة على ${n} اليوم`,
    },
    whoCanJoin: {
      title: "من يمكنه الانضمام",
      approve: {
        title: "يوافق المنظّمون",
        description: "تنتظر الطلبات في تبويب الأعضاء حتى تقرر.",
      },
      open: {
        title: "أي شخص لديه الرابط",
        description: "ينضمون فورًا. الطلبات المعلّقة لا تُقبل تلقائيًا.",
      },
      description: "ينطبق على رابط الدعوة وعلى من يجد المجموعة.",
    },
    reject: {
      title: (name: string) => `رفض ${name}؟`,
      description:
        "لن يُشعَر بالرفض ويمكنه الطلب مجددًا. الرفض مع الحظر يوقف الطلبات اللاحقة.",
      rejectLabel: "رفض الطلب",
      blockLabel: "رفض وحظر",
    },
    decided: {
      approved: (name: string) => `أُضيف ${name} إلى المجموعة`,
      rejected: (name: string) => `رُفض ${name}`,
      blocked: (name: string) => `رُفض ${name} وحُظر`,
    },
    undoLabel: "تراجع",
    requestJoinSheet: {
      title: "طلب الانضمام",
      description:
        "يوافق المنظّمون على الأعضاء الجدد. ملاحظة قصيرة تساعدهم على معرفة مستواك.",
      notePlaceholder: "أضف ملاحظة (اختياري)",
      submitLabel: "إرسال الطلب",
    },
  },
  create: {
    publicLabel: "عامة (أي شخص لديه الرابط)",
    privateLabel: "خاصة (بالدعوة فقط)",
    publicHelp:
      "يمكن لأي شخص لديه رابط المجموعة الانضمام، أو طلب الانضمام إذا اشترطت الموافقة.",
    privateHelp: "أنت وحدك من يمكنه دعوة الأشخاص.",
    approvalHelp:
      "يطلب الأشخاص الانضمام. توافق عليهم أو ترفضهم في صفحة المجموعة.",
    submit: "إنشاء مجموعة",
    description: "مجموعة من الأشخاص الذين تلعب معهم. تنضم إليها كأول عضو.",
    createdToast: "تم إنشاء المجموعة",
    screen: {
      title: "إنشاء مجموعة",
      description:
        "المجموعة هي رفاقك المعتادون: رياضة واحدة، ترتيب واحد، ومباريات بلا حدود.",
      photo: "صورة",
      photoHelp: "صورة اختيارية، JPEG أو PNG",
      nameLabel: "اسم المجموعة",
      namePlaceholder: "مثلًا: رفاق بادل الثلاثاء",
      sportLabel: "الرياضة",
      sportHelp: "لا يمكن تغيير الرياضة بعد أول مباراة.",
      visibilityLabel: "الظهور",
      footnote: "يمكنك تغيير كل هذا لاحقًا.",
    },
    submitNamed: (name: string) => `إنشاء ${name}`,
  },
  linkRequest: {
    venueRequestsTitle: "طلبات النوادي",
    publicOnly: "لا تُربط بنادٍ عبر طلب إلا مجموعة عامة",
    rowMeta: "أنت وحدك من يقرر، بصفتك منشئ المجموعة.",
    acceptLabel: "قبول",
    declineLabel: "رفض",
    declinedToast: "تم رفض الطلب",
    rowTitle: (venue: string, group: string) => `يريد ${venue} ربط ${group}`,
    yourGroup: "مجموعتك",
    thisGroup: "هذه المجموعة",
    bannerText: (venue: string) => `يريد ${venue} ربط هذه المجموعة.`,
    acceptedToast: (group: string, venue: string) =>
      `${group} مرتبطة الآن بـ ${venue}`,
    acceptConfirm: {
      title: (group: string, venue: string) => `ربط ${group} بـ ${venue}؟`,
      description: (group: string) =>
        `تصبح ${group} مجموعة نادوية. إليك ما يتغير.`,
      confirmLabel: "ربط المجموعة",
      cancelLabel: "ليس الآن",
      pendingLabel: "جارٍ الربط…",
      consequences: {
        gamesHeldAt: (venue: string) => `تُقام المباريات الجديدة في ${venue}.`,
        verified:
          "المجموعة موثّقة، فيمكن أن تُحتسب مبارياتها في تصنيف Temba وأن تُفتح لأي شخص لديه الرابط.",
      },
    },
    declineConfirm: {
      title: (venue: string) => `رفض طلب ${venue}؟`,
      description: (venue: string) =>
        `سيرى ${venue} أنك رفضت. يمكنه إرسال طلب جديد لاحقًا.`,
      confirmLabel: "رفض الطلب",
      cancelLabel: "إبقاء الطلب",
    },
    partOf: (venue: string) => `مرتبطة بـ ${venue}`,
    unlinkLabel: "فك الارتباط",
    leaveVenueLabel: (venue: string) => `فك الارتباط بـ ${venue}`,
    leaveVenueConfirm: {
      title: (venue: string) => `فك الارتباط بـ ${venue}؟`,
      description: (group: string) =>
        `تعود ${group} مجموعة حرة. لن تُحتسب المباريات الجديدة لمستوى Temba، ما لم يوثّق مشغّل المجموعة.`,
      confirmLabel: "فك الارتباط",
      cancelLabel: "إبقاء الارتباط",
      pendingLabel: "جارٍ فك الارتباط…",
      consequences: {
        historyStays: "يبقى الأعضاء والمباريات السابقة والنتائج كما هي.",
        anyVenue: "يمكن إقامة المباريات الجديدة في أي نادٍ.",
      },
    },
    leftVenueToast: (venue: string) => `تم فك الارتباط بـ ${venue}`,
    venueUnlinkConfirm: {
      title: (group: string) => `فك ارتباط ${group}؟`,
      description: (group: string) =>
        `لم تعد ${group} مرتبطة بناديك وتصبح مجموعة حرة. لن تُحتسب المباريات الجديدة لمستوى Temba، ما لم يوثّقها مشغّل. تبقى المباريات السابقة والأعضاء كما هم.`,
      confirmLabel: "فك ارتباط المجموعة",
      cancelLabel: "إبقاء الارتباط",
    },
    venueUnlinkedToast: "تم فك ارتباط المجموعة",
  },
  members: {
    organizer: "المنظّم",
    lastPlayed: (day: string) => `آخر لعب ${day}`,
    joined: (day: string) => `انضم ${day}`,
    organizerLastPlayed: (day: string) => `المنظّم، آخر لعب ${day}`,
    organizerJoined: (day: string) => `المنظّم، انضم ${day}`,
    noGamesJoined: (day: string) => `لا ألعاب بعد، انضم ${day}`,
    organizerNoGamesJoined: (day: string) =>
      `المنظّم، لا ألعاب بعد، انضم ${day}`,
    legend: "المستويات المخطّطة ما زالت مبدئية.",
    lens: {
      sort: {
        title: "ترتيب الأعضاء",
        chip: (label: string) => `ترتيب الأعضاء، ${label}`,
        footnote:
          "يبقى الترتيب والتصفية لهذه المجموعة كما اخترتهما حتى تغيّرهما.",
        options: {
          recent: {
            label: "لعبوا مؤخرًا",
            hint: "آخر لعبة في هذه المجموعة أولًا",
          },
          joined: { label: "انضموا مؤخرًا", hint: "الأعضاء الأحدث أولًا" },
          name: { label: "الاسم", hint: "من أ إلى ي" },
          level: {
            label: "المستوى",
            hint: "الأعلى أولًا، ومن بلا مستوى أخيرًا",
          },
          tier: {
            label: "الفئة",
            hint: "القرش أولًا، والمبدئيون أخيرًا",
          },
        },
      },
      filters: {
        label: "تصفية الأعضاء",
        all: "الكل",
        organizers: "المنظّمون",
        active: "نشطون",
        inactive: "غير نشطين",
        noGames: "بلا ألعاب",
        notOnTemba: "ليسوا على Temba",
      },
      filterSpoken: (label: string, count: string) => `${label}، ${count}`,
      countOf: (shown: number, total: number) => `${shown} من ${total}`,
      noMatchQuery: (query: string) => `لا أحد يطابق «${query}».`,
      noMatchQueryIn: (query: string, filter: string) =>
        `لا أحد يطابق «${query}» في ${filter}.`,
      noneIn: (filter: string) => `لا أعضاء في ${filter}.`,
      showAll: "عرض كل الأعضاء",
    },
    pendingInvitesTitle: (n: number) =>
      plural("ar", n, {
        one: "دعوة واحدة معلّقة",
        two: "دعوتان معلّقتان",
        few: "{n} دعوات معلّقة",
        many: "{n} دعوة معلّقة",
        other: "{n} دعوة معلّقة",
      }),
    invited: (day: string) => `دُعي ${day}`,
  },
  season: {
    settingsIntro:
      "يحصر الموسم الترتيب في فترة زمنية. المستويات لا تُعاد أبدًا مع الموسم.",
    newStandingNote:
      "يبدأ الترتيب فارغًا في الموسم الجديد. تبقى المستويات وسجل الفوز والخسارة والمواسم السابقة كما هي.",
    status: {
      upcoming: "قادم",
      active: "جارٍ",
      closed: "مغلق",
    },
    progress: (day: number, total: number) => `اليوم ${day} من ${total}`,
    range: (start: string, end: string) => isolate(`${start} – ${end}`),
    startsLine: (weekday: string, day: string) => `يبدأ ${weekday} ${day}`,
    lockedLine: (day: string) => `يُقفل عند الإغلاق، ${day}`,
    gamesCounted: (n: number) =>
      plural("ar", n, {
        zero: "لا مباريات محتسبة بعد",
        one: "مباراة واحدة محتسبة",
        two: "مباراتان محتسبتان",
        few: "{n} مباريات محتسبة",
        many: "{n} مباراة محتسبة",
        other: "{n} مباراة محتسبة",
      }),
    overlapMessage: "لا يمكن أن تتداخل المواسم.",
    orderMessage: "يجب أن ينتهي الموسم بعد بدايته.",
    pickDaysMessage: "اختر يوم بداية ويوم نهاية.",
    allTime: "كل المواسم",
    suggestedName: (n: number) => `الموسم ${n}`,
    upcomingName: (name: string) => `${name} (قادم)`,
    summaryDays: (n: number) =>
      plural("ar", n, {
        one: "يوم واحد.",
        two: "يومان.",
        few: "{n} أيام.",
        many: "{n} يومًا.",
        other: "{n} يوم.",
      }),
    startsDayAfter: (previous: string) =>
      `يبدأ في اليوم التالي لإغلاق ${previous}.`,
    startsDaysAfter: (n: number, previous: string) =>
      plural("ar", n, {
        one: `يبدأ بعد يوم واحد من إغلاق ${previous}.`,
        two: `يبدأ بعد يومين من إغلاق ${previous}.`,
        few: `يبدأ بعد {n} أيام من إغلاق ${previous}.`,
        many: `يبدأ بعد {n} يومًا من إغلاق ${previous}.`,
        other: `يبدأ بعد {n} يوم من إغلاق ${previous}.`,
      }),
    closeEndsToday: "اليوم",
    closeEndsEarly: (n: number) =>
      plural("ar", n, {
        one: "اليوم، قبل الموعد بيوم واحد",
        two: "اليوم، قبل الموعد بيومين",
        few: "اليوم، قبل الموعد بـ{n} أيام",
        many: "اليوم، قبل الموعد بـ{n} يومًا",
        other: "اليوم، قبل الموعد بـ{n} يوم",
      }),
    closeTitle: (name: string) => `إغلاق ${name}؟`,
    closeAction: (name: string) => `إغلاق ${name} مبكرًا`,
    closeBodyLead: "يُقفل الترتيب على وضعه الحالي.",
    closeBodyCounted: (n: number) =>
      plural("ar", n, {
        zero: "لا مباريات مؤكدة تُحسب.",
        one: "تُحسب مباراة واحدة مؤكدة.",
        two: "تُحسب مباراتان مؤكدتان.",
        few: "تُحسب {n} مباريات مؤكدة.",
        many: "تُحسب {n} مباراة مؤكدة.",
        other: "تُحسب {n} مباراة مؤكدة.",
      }),
    closeBodyWaiting: (n: number) =>
      plural("ar", n, {
        one: "مباراة واحدة ما زالت بانتظار النتيجة لن تُحسب.",
        two: "مباراتان ما زالتا بانتظار النتيجة لن تُحسبا.",
        few: "{n} مباريات ما زالت بانتظار النتيجة لن تُحسب.",
        many: "{n} مباراة ما زالت بانتظار النتيجة لن تُحسب.",
        other: "{n} مباراة ما زالت بانتظار النتيجة لن تُحسب.",
      }),
    createdToast: (name: string) => `تم إنشاء ${name}`,
    closedToast: (name: string) => `تم إغلاق ${name}`,
  },
  standing: {
    noGamesYet: "لا مباريات بعد",
    fewerThan: (n: number) =>
      plural("ar", n, {
        one: "أقل من مباراة واحدة",
        two: "أقل من مباراتين",
        few: "أقل من {n} مباريات",
        many: "أقل من {n} مباراة",
        other: "أقل من {n} مباراة",
      }),
    setDifference: "فارق الأشواط",
    scoreDifference: "فارق النتيجة",
    rulesLine: (difference: string) =>
      `تُمنح النقاط لكل لاعب في الفريق. تُحسب فقط المباريات ذات النتيجة النهائية المؤكدة. عند تساوي النقاط: الانتصارات، ثم المواجهات المباشرة، ثم ${difference}، ثم الأقل لعبًا.`,
    legend: {
      played: "ل لعب",
      won: "ف فوز",
      drawn: "ت تعادل",
      lost: "خ خسارة",
      points: (win: number) => `الفوز ${winPoints(win)}.`,
      pointsWithDraw: (win: number, draw: number) =>
        `الفوز ${winPoints(win)} والتعادل ${draw}.`,
    },
    oneGameRanks: "مباراة واحدة تكفي لترتيبك.",
    playGamesToRank: (n: number) =>
      plural("ar", n, {
        one: "العب مباراة واحدة لتُرتَّب.",
        two: "العب مباراتين لتُرتَّب.",
        few: "العب {n} مباريات لتُرتَّب.",
        many: "العب {n} مباراة لتُرتَّب.",
        other: "العب {n} مباراة لتُرتَّب.",
      }),
    tierFootnote: {
      season:
        "يحتسب الترتيب مباريات هذا الموسم ويبدأ من جديد في الموسم القادم.",
      before: "قوة كل لاعب في المجموعة، أي فئته، تجدها في ",
      membersLink: "الأعضاء",
      after: ".",
    },
  },
  settings: {
    sportSublabel: {
      padel: "2 ضد 2",
      football: "من 5 ضد 5 إلى 11 ضد 11",
    },
    visibility: {
      public: {
        title: "عامة",
        description: "تظهر في البحث وفي قائمة المجموعات العامة.",
      },
      private: {
        title: "خاصة",
        description: "مخفية عن البحث. لا يجدها إلا من لديه رابط الدعوة.",
      },
    },
    joining: {
      label: "الانضمام",
      toggle: "مراجعة طلبات الانضمام",
      toggleHelpOff: "ينضم أي شخص يجد المجموعة مباشرة.",
      toggleHelpOn: "توافق على كل طلب قبل انضمامه.",
      requestsWaiting: (n: number) =>
        plural("ar", n, {
          one: "طلب واحد بانتظارك في صفحة المجموعة.",
          two: "طلبان بانتظارك في صفحة المجموعة.",
          few: "{n} طلبات بانتظارك في صفحة المجموعة.",
          many: "{n} طلبًا بانتظارك في صفحة المجموعة.",
          other: "{n} طلب بانتظارك في صفحة المجموعة.",
        }),
    },
    menu: {
      edit: "تعديل المجموعة",
      invite: "دعوة لاعبين",
      copyLink: "نسخ رابط المجموعة",
      leave: "مغادرة المجموعة",
      leaveOwnerHint: "انقل الملكية أولًا.",
    },
    role: {
      owner: "أنت مالك هذه المجموعة",
      organizer: "أنت منظّم هذه المجموعة",
      member: "أنت عضو",
    },
    linkCopiedToast: "تم نسخ رابط المجموعة",
    linkResetToast: "أُعيد تعيين الرابط. الروابط القديمة لم تعد تعمل.",
    linkResetOwnerOnly: "مالك المجموعة وحده يستطيع إعادة تعيين رابط الدعوة",
    ownerLeave: {
      title: (name: string) => `سلّم ${name} لشخص آخر أولًا`,
      description:
        "أنت مالك هذه المجموعة. انقل الملكية إلى عضو آخر قبل المغادرة، أو احذف المجموعة.",
      confirmLabel: "نقل الملكية",
      cancelLabel: "ليس الآن",
    },
    edit: {
      title: "تعديل المجموعة",
      nameLabel: "اسم المجموعة",
      nameHelp: "يرى الأعضاء الاسم الجديد فورًا",
      photoChange: "تغيير",
      photoRemove: "إزالة الصورة",
      sportLabel: "الرياضة",
      sportLocked:
        "لا يمكن تغيير الرياضة بعد أول مباراة، لأن الترتيب مبني عليها.",
      sportOpen: "تُقفل الرياضة بعد أول مباراة، لأن الترتيب مبني عليها.",
      visibilityLabel: "الظهور",
      inviteLinkLabel: "رابط الدعوة",
      inviteLinkNone: "لا يوجد رابط دعوة بعد.",
      inviteLinkCreate: "إنشاء رابط",
      inviteLinkReset: "إعادة تعيين الرابط. الروابط القديمة لم تعد تعمل.",
      ownershipLabel: "الملكية",
      transferTitle: "نقل الملكية",
      transferHint: "سلّم المجموعة إلى عضو آخر.",
      deleteTitle: "حذف المجموعة",
      deleteHint:
        "يُحذف الترتيب للجميع وتُلغى المباريات القادمة. تبقى المباريات السابقة في سجل كل لاعب.",
      save: "حفظ التغييرات",
      discard: "تجاهل",
      nothingChanged: "لم يتغير شيء بعد.",
      unsavedChanges: "تغييرات غير محفوظة.",
      savedToast: "تم حفظ التغييرات",
    },
    delete: {
      title: (name: string) => `حذف ${name}؟`,
      description:
        "تُحذف المجموعة وترتيبها وأعضاؤها معها. تبقى المباريات السابقة في سجل كل لاعب. لا يُشعَر أحد. لا يمكن التراجع عن هذا.",
      gamesStat: (n: number) =>
        plural("ar", n, {
          one: "مباراة",
          two: "مباراتان",
          few: "مباريات",
          many: "مباراة",
          other: "مباراة",
        }),
      membersStat: (n: number) =>
        plural("ar", n, {
          one: "عضو",
          two: "عضوان",
          few: "أعضاء",
          many: "عضوًا",
          other: "عضو",
        }),
      seasonsStat: (n: number) =>
        plural("ar", n, {
          one: "موسم",
          two: "موسمان",
          few: "مواسم",
          many: "موسمًا",
          other: "موسم",
        }),
      confirmPrompt: "اكتب اسم المجموعة للتأكيد",
      deleteLabel: "حذف المجموعة",
      keepLabel: "إبقاء المجموعة",
    },
    transfer: {
      title: "نقل الملكية",
      description: (name: string) =>
        `سلّم ${name} إلى عضو آخر. يتولى المجموعة، وتبقى أنت منظّمًا.`,
      empty:
        "لا أحد آخر يمكنه امتلاك هذه المجموعة بعد. ادعُ لاعبًا على Temba أولًا.",
      confirmLabel: "نقل الملكية",
      confirmTo: (name: string) => `نقل إلى ${name}`,
      transferredToast: (name: string, group: string) =>
        `${name} يملك ${group} الآن`,
      transferredToastUnnamed: (group: string) => `انتقلت ملكية ${group} الآن`,
    },
  },
  addPlayer: {
    action: "إضافة لاعب",
    notOnTembaYet: "ليس على Temba بعد",
    nameLabel: "اسمه",
    description: "أضِف لاعبًا برقم هاتفه. لا يحتاج إلى التطبيق ليلعب.",
    menuHint: "برقم الهاتف، دون حاجة إلى التطبيق",
    addToGame: "إضافة إلى المباراة",
    notSure: {
      name: "غير متأكد",
      detail: (level: string) => `يبدأ من ${level}.`,
    },
    noSeat: "كل المراكز مشغولة.",
    noSide: "كل الجوانب ممتلئة.",
    footballRole: {
      player: { name: "لاعب", detail: "في الملعب" },
      keeper: { name: "حارس", detail: "في المرمى" },
    },
    roles: { outfield: "لاعب ميدان", keeper: "حارس مرمى" },
    positions: {
      any: "أي مركز",
      def: "مدافع",
      mid: "وسط",
      fwd: "مهاجم",
    },
    sideWith: (name: string) => `مع ${name}`,
    sideOpen: "شاغر",
    preview: {
      thisPlayer: "هذا اللاعب",
      alreadyOnGame: (name: string) => `${name} موجود في هذه المباراة بالفعل`,
      account: (name: string) => `هذا ${name} (لديه حساب)`,
      unclaimed: (name: string) =>
        `موجود على Temba باسم ${name} (بلا حساب بعد)`,
      new: "ليس على Temba بعد. أضف اسمه ومستواه الأولي.",
      alreadyInGroup: (name: string) => `${name} في هذه المجموعة بالفعل`,
      accountInvited: (name: string) =>
        `هذا ${name} (لديه حساب). سيتلقى دعوة لقبولها.`,
    },
    addedToast: (name: string) => `أُضيف ${name}`,
    groupDescription:
      "أضف شخصًا برقم هاتفه. إن كان على Temba، يتلقى دعوة لقبولها.",
    inviteSentToast: (name: string) => `أُرسلت دعوة إلى ${name}`,
    removeAction: "إزالة من المجموعة",
    removeConfirm: (name: string) =>
      `إزالة ${name} من هذه المجموعة؟ تبقى مبارياته في السجل.`,
    removedToast: (name: string) => `أُزيل ${name}`,
    renameAction: "تعديل الاسم",
    whatsAppAction: "واتساب",
    whatsAppFor: (name: string) => `مراسلة ${name} على واتساب`,
    renameDescription:
      "يبقى هاتفه كما هو. إن كان الرقم خاطئًا، أزله ثم أضفه مجددًا.",
    renamedToast: (name: string) => `تغيّر الاسم إلى ${name}`,
    guest: {
      tab: "ضيف",
      description: "يلعب الضيف هذه المباراة باسمه فقط. دون هاتف ودون حساب.",
      nameLabel: "الاسم",
      levelNote:
        "يُحتسب مستواه كمتوسط مستوى اللاعبين الآخرين في كل مباراة، ولا تتغير إلا مستويات اللاعبين الحقيقيين.",
      submit: (name: string) =>
        name ? `إضافة ${isolate(name)} كضيف` : "إضافة كضيف",
      addedToast: (name: string) => `أُضيف ${isolate(name)} كضيف`,
      tag: "ضيف",
      nameGuest: (name: string) => `${isolate(name)}، ضيف`,
      renameDescription: "اسمه في هذه المباراة.",
    },
    fromGroup: {
      tab: "من المجموعة",
      phoneTab: "بالهاتف",
      modes: "طريقة الإضافة",
      description:
        "اختر من المجموعة، ثم حدّد كيف يلعب كل واحد. ملفه الشخصي يملأ ذلك مسبقًا.",
      search: "ابحث في الأعضاء",
      groupLine: (group: string, count: number) =>
        plural("ar", count, {
          zero: `${group}، لا أعضاء`,
          one: `${group}، عضو واحد`,
          two: `${group}، عضوان`,
          few: `${group}، {n} أعضاء`,
          many: `${group}، {n} عضوًا`,
          other: `${group}، {n} عضو`,
        }),
      spotsLeft: (left: number, open: number) =>
        plural("ar", open, {
          one: `${left} من مكان واحد شاغر`,
          two: `${left} من مكانين شاغرين`,
          few: `${left} من {n} أماكن شاغرة`,
          many: `${left} من {n} مكانًا شاغرًا`,
          other: `${left} من {n} مكان شاغر`,
        }),
      gameFull: "المباراة ممتلئة",
      inGame: "في المباراة",
      onWaitlist: "في قائمة الانتظار",
      noSpotsLeft: "لا أماكن متبقية",
      level: (label: string) => `المستوى ${label}`,
      noPreferenceShort: "بلا تفضيل",
      select: "اختر لاعبين",
      addCount: (count: number) =>
        plural("ar", count, {
          one: "إضافة لاعب واحد",
          two: "إضافة لاعبَين",
          few: "إضافة {n} لاعبين",
          many: "إضافة {n} لاعبًا",
          other: "إضافة {n} لاعب",
        }),
      addedCount: (count: number) =>
        plural("ar", count, {
          one: "أُضيف لاعب واحد",
          two: "أُضيف لاعبان",
          few: "أُضيف {n} لاعبين",
          many: "أُضيف {n} لاعبًا",
          other: "أُضيف {n} لاعب",
        }),
      noMatch: (query: string) => `لا أحد يطابق "${query}".`,
      tryPhone: "أضفه برقم هاتفه بدلًا من ذلك.",
      loading: "جارٍ تحميل الأعضاء…",
      listSeparator: "، ",
    },
    seat: {
      left: "يسار",
      right: "يمين",
      label: (team: string, side: string) => `${team} · ${side}`,
    },
  },
  userName: {
    firstRequired: "أدخل اسمك الأول",
    lastRequired: "أدخل اسم عائلتك",
    tooLong: (max: number) =>
      plural("ar", max, {
        one: "لا يتجاوز حرفًا واحدًا",
        two: "لا يتجاوز حرفين",
        few: "لا يتجاوز {n} أحرف",
        many: "لا يتجاوز {n} حرفًا",
        other: "لا يتجاوز {n} حرف",
      }),
  },
  nickname: {
    spoken: (nickname: string, name: string) =>
      `${nickname}، اسم ${name} في هذه المجموعة`,
  },
  errors: {
    notFound: "المجموعة غير موجودة",
    cannotJoin: "لا يمكنك الانضمام إلى هذه المجموعة",
    approverOnly: "هذا لمن يوافق على أعضاء المجموعة فقط",
    inviterOnly: "لا يدير دعوات هذه المجموعة إلا منشئها أو أحد منظّميها",
    seasonsOwnerOnly: "مالك المجموعة وحده يستطيع إدارة المواسم",
    notLinkedToVenue: "هذه المجموعة غير مرتبطة بالنادي",
    deleteOwnerOnly: "مالك المجموعة وحده يستطيع حذفها",
    editOwnerOnly: "مالك المجموعة وحده يستطيع تعديلها",
    transferOwnerOnly: "مالك المجموعة وحده يستطيع نقل الملكية",
    alreadyMember: "أنت عضو في هذه المجموعة بالفعل",
    userAlreadyMember: "هذا المستخدم عضو في هذه المجموعة بالفعل",
    notMember: "لست عضوًا في هذه المجموعة",
    linkRequestNotFound: "طلب ربط المجموعة غير موجود",
    linkRequestNotPending: "لم يعد طلب ربط المجموعة معلّقًا",
    creatorDecides: "منشئ المجموعة وحده يستطيع البتّ في هذا الطلب",
    looseOnlyLink: "لا تُربط بنادٍ إلا مجموعة حرة",
    linkArchivedVenue: "لا يمكن ربط مجموعة بنادٍ مؤرشف",
    creatorUnlinks: "منشئ المجموعة وحده يستطيع فك ارتباطها بالنادي",
    pendingLinkRequest: "لدى هذه المجموعة طلب ربط معلّق من هذا النادي بالفعل",
    playerAlreadyIn: (name: string) =>
      `${isolate(name)} في هذه المجموعة بالفعل`,
    joinRequestNotFound: "طلب الانضمام غير موجود",
    joinRequestNotPending: "لم يعد طلب الانضمام معلّقًا",
    joinRequestNotDecided: "لم يُبتّ في طلب الانضمام بعد",
    alreadyPlayed: "سبق أن لعب في هذه المجموعة",
    isOrganizer: "إنه منظّم في هذه المجموعة",
    seasonNotFound: "الموسم غير موجود",
    seasonNotActive: "لا يُغلق إلا الموسم النشط",
    privateNoUrlJoin: "لا يمكن الانضمام إلى المجموعات الخاصة عبر رابط المجموعة",
    requiresApproval: "تتطلب هذه المجموعة موافقة. اطلب الانضمام بدلًا من ذلك.",
    cannotRequestJoin: "لا يمكنك طلب الانضمام إلى هذه المجموعة",
    playerNotInGroup: "هذا اللاعب ليس في المجموعة",
    ownerCannotLeave: "انقل الملكية إلى عضو آخر قبل المغادرة، أو احذف المجموعة",
    cannotRemoveCreator: "لا يمكن إزالة منشئ المجموعة",
    removeSelf: "غادر المجموعة بدلًا من ذلك",
    onlyUnclaimedRemovable: "لا يُزال إلا اللاعبون الذين ليسوا على Temba بعد",
    sportLocked: "تُثبَّت الرياضة بعد أول مباراة في المجموعة",
    alwaysOrganizer: "منشئ المجموعة منظّم دائمًا",
    unclaimedOrganizer: "لا يكون منظّمًا من ليس على Temba بعد",
    alreadyOwner: "إنه مالك هذه المجموعة بالفعل",
    unclaimedOwner: "لا يملك مجموعةً من ليس على Temba بعد",
    standingMembersOnly: "انضم إلى المجموعة لترى ترتيبها",
    approvalPublicOnly: "اشتراط الموافقة للمجموعات العامة فقط",
    imageEmpty: "ملف الصورة فارغ",
    nicknameTooLong: (max: number) =>
      plural("ar", max, {
        one: "لا يتجاوز الاسم حرفًا واحدًا",
        two: "لا يتجاوز الاسم حرفين",
        few: "لا يتجاوز الاسم {n} أحرف",
        many: "لا يتجاوز الاسم {n} حرفًا",
        other: "لا يتجاوز الاسم {n} حرف",
      }),
  },
} satisfies typeof source;
