import { plural } from "../../plural";
import type { group as source } from "../en/group";

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
    daysAgo: (n: number) => `قبل ${n} أيام`,
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
    seasonSince: (month: string) => `الموسم منذ ${month}`,
    backToCommunity: "العودة إلى المجتمع",
    backToGroups: "العودة إلى المجموعات",
    openSeats: "مقاعد شاغرة",
    playedOpponentLine: (team: string, day: string) => `${team}، ${day}`,
    organizerAction: {
      appoint: "تعيين منظّمًا",
      dismiss: "إزالة كمنظّم",
    },
    organizerHint: {
      appoint: "يمكنه إنشاء الألعاب وتحديد الفرق وإضافة اللاعبين",
      dismiss: "يفقد حق إنشاء الألعاب وتحديد الفرق وإضافة اللاعبين",
    },
    organizerToast: {
      appointed: (name: string) => `${name} أصبح منظّمًا الآن.`,
      dismissed: (name: string) => `${name} لم يعد منظّمًا.`,
    },
  },
  empty: {
    standingAfterFirstResult: "يظهر الترتيب بعد أول نتيجة.",
    standingSeatsFilled: (filled: number, total: number) =>
      `شُغل ${filled} من ${total} مقاعد. يظهر الترتيب بعد أول نتيجة.`,
    games: "حين تُحدَّد لعبة بفترة مفتوحة أو مباراة، تظهر هنا.",
    gamesNeedPlayers: (sport: string, needed: number, have: number) =>
      `${sport}: يلزم ${needed} لاعبين، ولديك ${have}. حين تُحدَّد لعبة بفترة مفتوحة أو مباراة، تظهر هنا.`,
    aGame: "اللعبة",
  },
  join: {
    archiveGamesCopy:
      "تبقى الألعاب الحالية مدرجة هنا، لا في الألعاب العامة. الانضمام وقائمة الانتظار ودعوات الألعاب مغلقة ما دام المجتمع مؤرشفًا.",
    gamesEmptyDescription:
      "حين تُحدَّد لعبة بفترة مفتوحة أو مباراة، ستظهر هنا.",
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
      leftClub: "غادرت المجموعة، وما زلت في المجتمع",
      left: "غادرت المجموعة",
    },
    leaveConfirm: {
      title: (name: string) => `مغادرة ${name}؟`,
      description: "ستغادر هذه المجموعة.",
      confirmLabel: "مغادرة المجموعة",
    },
    banner: {
      archivedVisitor: {
        heading: "مجتمع هذه المجموعة النادوية مؤرشف",
        body: "الانضمام مغلق. ما زال بإمكان أعضاء المجتمع فتح السجل والألعاب. هذه ليست صفحة مفقودة.",
      },
      archivedMember: {
        heading: "المجتمع مؤرشف",
        body: "تبقى هذه المجموعة النادوية مرتبطة بمجتمعها. ما زال بإمكانك فتحها ورؤية السجل والألعاب ما دام المجتمع مؤرشفًا.",
      },
      approvalJoinsCommunity: (community: string) =>
        `إذا قُبل طلبك، تصبح أيضًا عضوًا في ${community}.`,
      thisCommunity: "هذا المجتمع",
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
      foundInCommunity: (community: string, when: string) =>
        `وجد المجموعة في ${community}، ${when}`,
      theCommunity: "المجتمع",
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
      descriptionIn: (community: string) =>
        `ينطبق على رابط الدعوة وعلى من يجد المجموعة في ${community}.`,
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
    loose: {
      publicLabel: "عامة (أي شخص لديه الرابط)",
      privateLabel: "خاصة (بالدعوة فقط)",
      publicHelp:
        "يمكن لأي شخص لديه رابط المجموعة الانضمام، أو طلب الانضمام إذا اشترطت الموافقة.",
      privateHelp: "أنت وحدك من يمكنه دعوة الأشخاص.",
      approvalHelp:
        "يطلب الأشخاص الانضمام. توافق عليهم أو ترفضهم في صفحة المجموعة.",
      submit: "إنشاء مجموعة",
    },
    club: {
      publicLabel: "عامة (أعضاء المجتمع)",
      privateLabel: "خاصة (بالدعوة فقط)",
      publicHelp:
        "يمكن لأي عضو في المجتمع الانضمام، أو طلب الانضمام إذا اشترطت الموافقة.",
      privateHelp:
        "يمكن للمالكين والمشرفين دعوة أي شخص. ويمكن لمنشئ المجموعة والمنظّمين دعوة أعضاء المجتمع.",
      approvalHelp:
        "يطلب أعضاء المجتمع الانضمام. توافق عليهم أو ترفضهم في صفحة المجموعة.",
      submit: "إنشاء مجموعة نادوية",
    },
    looseDescription:
      "مجموعة من الأشخاص الذين تلعب معهم، خارج أي مجتمع. تنضم إليها كأول عضو.",
    clubDescription: "مجموعة داخل مجتمعك. تنضم إليها كأول عضو.",
    createdToast: "تم إنشاء المجموعة",
    screen: {
      title: "إنشاء مجموعة",
      description: {
        loose:
          "المجموعة هي رفاقك المعتادون: رياضة واحدة، ترتيب واحد، وألعاب بلا حدود.",
        club: "مجموعة داخل مجتمعك: رياضة واحدة، ترتيب واحد، وألعاب بلا حدود.",
      },
      photo: "صورة",
      photoHelp: "صورة اختيارية، JPEG أو PNG",
      nameLabel: "اسم المجموعة",
      namePlaceholder: "مثلًا: رفاق بادل الثلاثاء",
      sportLabel: "الرياضة",
      visibilityLabel: "الظهور",
      footnote: "يمكنك تغيير كل هذا لاحقًا.",
    },
    submitNamed: (name: string) => `إنشاء ${name}`,
  },
  linkRequest: {
    venueRequestsTitle: "طلبات النوادي",
    rowMeta: "أنت وحدك من يقرر، بصفتك منشئ المجموعة.",
    acceptLabel: "قبول",
    declineLabel: "رفض",
    declinedToast: "تم رفض الطلب",
    rowTitle: (venue: string, group: string) =>
      `يريد ${venue} إضافة ${group} إلى مجتمعه`,
    yourGroup: "مجموعتك",
    thisGroup: "هذه المجموعة",
    bannerText: (venue: string) =>
      `يريد ${venue} إضافة هذه المجموعة إلى مجتمعه.`,
    acceptedToast: (group: string, venue: string) =>
      `${group} الآن جزء من ${venue}`,
    acceptConfirm: {
      title: (group: string, venue: string) =>
        `إضافة ${group} إلى مجتمع ${venue}؟`,
      description: (group: string) =>
        `تصبح ${group} مجموعة نادوية. إليك ما يتغير.`,
      confirmLabel: "إضافة المجموعة",
      cancelLabel: "ليس الآن",
      pendingLabel: "جارٍ الإضافة…",
      consequences: {
        members: "يصبح كل من في المجموعة عضوًا في المجتمع.",
        noDirectJoin:
          "لا يمكن للأشخاص الجدد الانضمام مباشرة. يرسلون طلبًا بدلًا من ذلك.",
        noInviteLinks:
          "لم يعد بإمكانك إنشاء روابط دعوة. ما زال بإمكانك دعوة أعضاء المجتمع الحاليين.",
        gamesHeldAt: (venue: string) => `تُقام الألعاب الجديدة في ${venue}.`,
        verified:
          "المجموعة موثّقة، فيمكنها استضافة ألعاب مصنّفة وألعاب مفتوحة لأي شخص لديه الرابط.",
      },
    },
    declineConfirm: {
      title: (venue: string) => `رفض طلب ${venue}؟`,
      description: (venue: string) =>
        `سيرى ${venue} أنك رفضت. يمكنه إرسال طلب جديد لاحقًا.`,
      confirmLabel: "رفض الطلب",
      cancelLabel: "إبقاء الطلب",
    },
    partOf: (venue: string) => `جزء من ${venue}`,
    unlinkLabel: "فك الارتباط",
    leaveVenueLabel: (venue: string) => `مغادرة مجتمع ${venue}`,
    leaveVenueConfirm: {
      title: (venue: string) => `مغادرة مجتمع ${venue}؟`,
      description: (group: string) =>
        `تعود ${group} مجموعة حرة. ستكون الألعاب الجديدة غير مصنّفة ما لم يوثّق مشغّل المجموعة.`,
      confirmLabel: "مغادرة المجتمع",
      cancelLabel: "البقاء",
      pendingLabel: "جارٍ المغادرة…",
      consequences: {
        historyStays: "يبقى الأعضاء والألعاب السابقة والنتائج كما هي.",
        membersStay: "يبقى الأعضاء في المجتمع حتى يغادروه بأنفسهم.",
        anyVenue: "يمكن إقامة الألعاب الجديدة في أي نادٍ.",
        inviteLinks: "يمكنك إنشاء روابط دعوة مجددًا.",
      },
    },
    leftVenueToast: (venue: string) => `غادرت مجتمع ${venue}`,
    venueUnlinkConfirm: {
      title: (group: string) => `فك ارتباط ${group}؟`,
      description: (group: string) =>
        `تغادر ${group} مجتمع ناديك وتصبح مجموعة حرة. ستكون الألعاب الجديدة غير مصنّفة ما لم يوثّقها مشغّل. تبقى الألعاب السابقة والأعضاء كما هم.`,
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
    range: (start: string, end: string) => `${start} – ${end}`,
    startsLine: (weekday: string, day: string) => `يبدأ ${weekday} ${day}`,
    lockedLine: (day: string) => `يُقفل عند الإغلاق، ${day}`,
    gamesCounted: (n: number) =>
      plural("ar", n, {
        zero: "لا ألعاب محسوبة",
        one: "لعبة واحدة محسوبة",
        two: "لعبتان محسوبتان",
        few: "{n} ألعاب محسوبة",
        many: "{n} لعبة محسوبة",
        other: "{n} لعبة محسوبة",
      }),
    overlapMessage: "لا يمكن أن تتداخل المواسم.",
    orderMessage: "يجب أن ينتهي الموسم بعد بدايته.",
    pickDaysMessage: "اختر يوم بداية ويوم نهاية.",
    allTime: "كل الأوقات",
    suggestedName: (n: number) => `الموسم ${n}`,
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
        zero: "لا ألعاب مؤكدة تُحسب.",
        one: "تُحسب لعبة واحدة مؤكدة.",
        two: "تُحسب لعبتان مؤكدتان.",
        few: "تُحسب {n} ألعاب مؤكدة.",
        many: "تُحسب {n} لعبة مؤكدة.",
        other: "تُحسب {n} لعبة مؤكدة.",
      }),
    closeBodyWaiting: (n: number) =>
      plural("ar", n, {
        one: "لعبة واحدة ما زالت بانتظار النتيجة لن تُحسب.",
        two: "لعبتان ما زالتا بانتظار النتيجة لن تُحسبا.",
        few: "{n} ألعاب ما زالت بانتظار النتيجة لن تُحسب.",
        many: "{n} لعبة ما زالت بانتظار النتيجة لن تُحسب.",
        other: "{n} لعبة ما زالت بانتظار النتيجة لن تُحسب.",
      }),
    createdToast: (name: string) => `تم إنشاء ${name}`,
    closedToast: (name: string) => `تم إغلاق ${name}`,
  },
  standing: {
    noGamesYet: "لا ألعاب بعد",
    fewerThan: (n: number) => `أقل من ${n} ألعاب`,
    setDifference: "فارق الأشواط",
    scoreDifference: "فارق النتيجة",
    rulesLine: (win: number, draw: number, loss: number, difference: string) =>
      `الفوز ${win}، التعادل ${draw}، الخسارة ${loss}، لكل لاعب في الفريق. تُحسب فقط الألعاب ذات النتيجة النهائية المؤكدة. عند التعادل: الانتصارات، ثم المواجهات المباشرة، ثم ${difference}، ثم الأقل لعبًا.`,
    oneGameRanks: "لعبة واحدة تكفي لترتيبك.",
    playGamesToRank: (n: number) => `العب ${n} ألعاب لتُرتَّب.`,
  },
  settings: {
    sportSublabel: {
      padel: "2 ضد 2",
      football: "5 إلى 11 في كل جانب",
    },
    visibility: {
      public: {
        title: "عامة",
        descriptionClub: "تظهر في البحث وفي المجتمع.",
        descriptionLoose: "تظهر في البحث وفي المجتمعات.",
      },
      private: {
        title: "خاصة",
        description: "مخفية عن البحث. لا يجدها إلا من لديه الرابط.",
      },
    },
    joining: {
      label: "الانضمام",
      toggle: "تتطلب موافقة",
      toggleHelp: "كل من يجد المجموعة ينضم فورًا.",
      openFooter: "يمكن لأي شخص العثور على المجموعة والانضمام فورًا.",
      approvalFooter:
        "يمكن لأي شخص العثور على المجموعة. كل من ينضم ينتظر موافقتك.",
      privateFooter: "لا ينضم إلا من تدعوه.",
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
    },
    role: {
      owner: "أنت مالك هذه المجموعة",
      organizer: "أنت منظّم هذه المجموعة",
      member: "أنت عضو",
    },
    linkCopiedToast: "تم نسخ رابط المجموعة",
    linkResetToast: "أُعيد تعيين الرابط. الروابط القديمة لم تعد تعمل.",
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
      sportLocked: "مقفلة بعد أول لعبة. الترتيب يعتمد عليها.",
      sportOpen: "تُقفل بعد أول لعبة. الترتيب يعتمد عليها.",
      visibilityLabel: "الظهور",
      inviteLinkLabel: "رابط الدعوة",
      inviteLinkNone: "لا رابط فعّال بعد. أنشئ واحدًا لمشاركته.",
      inviteLinkCreate: "إنشاء رابط",
      inviteLinkReset: "إعادة تعيين الرابط. الروابط القديمة لم تعد تعمل.",
      ownershipLabel: "الملكية",
      transferTitle: "نقل الملكية",
      transferHint: "سلّم المجموعة إلى عضو آخر.",
      deleteTitle: "حذف المجموعة",
      deleteHint: "يزيل المجموعة. تبقى الألعاب في سجل كل لاعب.",
      save: "حفظ التغييرات",
      discard: "تجاهل",
      nothingChanged: "لم يتغير شيء بعد.",
      unsavedChanges: "تغييرات غير محفوظة.",
      savedToast: "تم حفظ التغييرات",
    },
    delete: {
      title: (name: string) => `حذف ${name}؟`,
      description:
        "تُحذف المجموعة وترتيبها وأعضاؤها معها. تبقى الألعاب الملعوبة في سجل كل لاعب. لا يُشعَر أحد. لا يمكن التراجع عن هذا.",
      gamesStat: (n: number) =>
        plural("ar", n, {
          one: "لعبة",
          two: "لعبتان",
          few: "ألعاب",
          other: "لعبة",
        }),
      membersStat: (n: number) =>
        plural("ar", n, {
          one: "عضو",
          two: "عضوان",
          few: "أعضاء",
          other: "عضو",
        }),
      seasonsStat: (n: number) =>
        plural("ar", n, {
          one: "موسم",
          two: "موسمان",
          few: "مواسم",
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
    description: "أضف شخصًا برقم هاتفه. لا يحتاج إلى Temba ليلعب.",
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
    noPreference: "بلا تفضيل",
    sideWith: (name: string) => `مع ${name}`,
    sideOpen: "شاغر",
    preview: {
      thisPlayer: "هذا اللاعب",
      alreadyOnGame: (name: string) => `${name} موجود في هذه اللعبة بالفعل`,
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
      `إزالة ${name} من هذه المجموعة؟ تبقى ألعابه في السجل.`,
    removedToast: (name: string) => `أُزيل ${name}`,
    renameAction: "تعديل الاسم",
    renameDescription:
      "يبقى هاتفه كما هو. إن كان الرقم خاطئًا، أزله ثم أضفه مجددًا.",
    renamedToast: (name: string) => `تغيّر الاسم إلى ${name}`,
    seat: {
      left: "يسار",
      right: "يمين",
      label: (team: string, side: string) => `${team} · ${side}`,
    },
  },
  userName: {
    firstRequired: "أدخل اسمك الأول",
    lastRequired: "أدخل اسم عائلتك",
    tooLong: (max: number) => `لا يتجاوز ${max} حرفًا`,
  },
} satisfies typeof source;
