import { plural } from "../../plural";
import type { football as source } from "../en/football";

export const football = {
  status: {
    cancelled: "أُلغيت",
    played: "لُعبت",
    playedScoreMissing: "انتهت، أدخل النتيجة",
    teamsSet: "الفرق جاهزة",
    teamsSetOn: (weekday: string) => `الفرق جاهزة، ${weekday}`,
    upcoming: "قادمة",
    upcomingOn: (weekday: string) => `قادمة، ${weekday}`,
  },
  positionCode: {
    gk: "حارس",
    def: "دفاع",
    mid: "وسط",
    fwd: "هجوم",
  },
  lineup: {
    positions: {
      def: "مدافع",
      mid: "وسط",
      fwd: "مهاجم",
    },
    keeperSeatsTaken: "مكانا الحارسين محجوزان",
    keeperSeatsOpen: (left: number, total: number) =>
      `أماكن الحراس الشاغرة: ${left} من ${total}`,
    keepersIn: (n: number) =>
      plural("ar", n, {
        zero: "لا حراس مشاركون",
        one: "حارس واحد مشارك",
        two: "حارسان مشاركان",
        few: "{n} حراس مشاركون",
        many: "{n} حارسًا مشاركًا",
        other: "{n} حارس مشارك",
      }),
    oneKeeperOneMoreNeeded: "حارس واحد، مطلوب حارس آخر",
    noKeeperYet: "لا حارس بعد",
    positionCountsLine: (def: number, mid: number, fwd: number, gk: number) =>
      `المشاركون حتى الآن: ${def} دفاع، ${mid} وسط، ${fwd} هجوم، ${gk} حارس.`,
    bibs: {
      black: "أسود",
      white: "أبيض",
      red: "أحمر",
      navy: "أزرق داكن",
      sky: "أزرق فاتح",
      green: "أخضر",
      yellow: "أصفر",
      orange: "برتقالي",
      purple: "بنفسجي",
      pink: "وردي",
      grey: "رمادي",
    },
    teamsMethod: {
      manual: "من اختيار المنظّم",
      level: "متوازنة حسب المستوى",
      captain_pick: "اختيار القائدين",
    },
    nobodyInYet: "لا أحد مشارك بعد.",
    stillToPlace: (n: number) => `${n} لم يُوزَّعوا بعد.`,
    bothTeamsNeedPlayers: "كلا الفريقين يحتاج إلى لاعبين.",
    sideHasExtra: (team: string, extra: number) =>
      plural("ar", extra, {
        one: `لدى ${team} لاعب واحد زيادة. انقل واحدًا إلى الجهة الأخرى قبل النشر.`,
        two: `لدى ${team} لاعبان زيادة. انقل واحدًا إلى الجهة الأخرى قبل النشر.`,
        few: `لدى ${team} {n} لاعبين زيادة. انقل واحدًا إلى الجهة الأخرى قبل النشر.`,
        many: `لدى ${team} {n} لاعبًا زيادة. انقل واحدًا إلى الجهة الأخرى قبل النشر.`,
        other: `لدى ${team} {n} لاعب زيادة. انقل واحدًا إلى الجهة الأخرى قبل النشر.`,
      }),
    draw: "تعادل.",
    winBy: (team: string, margin: number) => `${team} يفوز بفارق ${margin}.`,
    scorersExceed: (team: string, score: number) =>
      `مجموع أهداف مسجّلي ${team} يتجاوز ${score}.`,
  },
  board: {
    tileName: (first: string, initial: string) => `${first} ${initial}.`,
    outfieldLine: (inCount: number, seats: number) =>
      plural("ar", seats, {
        one: `${inCount} من لاعب واحد`,
        two: `${inCount} من لاعبَين`,
        few: `${inCount} من {n} لاعبين`,
        many: `${inCount} من {n} لاعبًا`,
        other: `${inCount} من {n} لاعب`,
      }),
    keeperNoteClaimed: (perGame: number, name: string) =>
      `حارس واحد لكل فريق، أي ${perGame} لكل مباراة. ${name} أخذ الأول.`,
    keeperNoteUnclaimed: (perGame: number) =>
      `حارس واحد لكل فريق، أي ${perGame} لكل مباراة. لم يأخذ أحد مكانًا بعد.`,
    keeperSeatsBothTaken: "كلاهما محجوز",
    keeperSeatsLeft: (n: number) =>
      plural("ar", n, {
        one: "تبقّى مكان واحد",
        two: "تبقّى مكانان",
        few: "تبقّت {n} أماكن",
        many: "تبقّى {n} مكانًا",
        other: "تبقّى {n} مكان",
      }),
    seatKeeper: "حارس",
    seatPlayerPrefers: (code: string) => `لاعب، يفضّل ${code}`,
    joinAsKeeper: "انضم كحارس",
    joinAsPosition: (code: string) => `انضم بمركز ${code}`,
    joinWithPrice: (lead: string, price: string) => `${lead}، ${price}`,
    seatsOpen: (n: number) =>
      plural("ar", n, {
        zero: "لا أماكن شاغرة",
        one: "مكان واحد شاغر",
        two: "مكانان شاغران",
        few: "{n} أماكن شاغرة",
        many: "{n} مكانًا شاغرًا",
        other: "{n} مكان شاغر",
      }),
    everyonePlaced: (
      team1: string,
      average1: string,
      team2: string,
      average2: string,
    ) =>
      `وُزّع الجميع. متوسط ${team1} ${average1}، ومتوسط ${team2} ${average2}.`,
    keeperCount: (n: number) =>
      plural("ar", n, {
        zero: "لا حراس",
        one: "حارس واحد",
        two: "حارسان",
        few: "{n} حراس",
        many: "{n} حارسًا",
        other: "{n} حارس",
      }),
    goalsNote:
      "تُحتسب الأهداف في الأداء الأخير للاعب، لا في التصنيف. تجاوز إن لم يتابع أحد العدّ.",
    goalsNamed: (
      named1: number,
      score1: number,
      team1: string,
      named2: number,
      score2: number,
      team2: string,
    ) =>
      `سُمّي ${named1} من أهداف ${team1} الـ${score1} و${named2} من أهداف ${team2} الـ${score2}.`,
    bothSidesConfirmed: "أكّد الفريقان.",
    confirmedByOrganizer: "أكّده المنظّم.",
    waitingOrganizerFor: (team: string) => `تأكيد المنظّم عن ${team}`,
    waitingPlayerFrom: (team: string) => `تأكيد لاعب واحد من ${team}`,
    waitingFor: (who: string) => `بانتظار ${who}.`,
    waitingForBoth: (first: string, second: string) =>
      `بانتظار ${first} و${second}.`,
    waitingOrganizerBoth: "بانتظار تأكيد المنظّم عن الفريقين.",
    waitingEachSide: "بانتظار تأكيد لاعب واحد من كل فريق.",
    youPlayInAs: (team: string, code: string) =>
      `تلعب في ${team} بمركز ${code}.`,
    youPlayIn: (team: string) => `تلعب في ${team}.`,
  },
  details: {
    priceLabel: "السعر",
    durationLabel: "المدة",
    minutesShort: (n: number) => `${n} د`,
    waitlistedTitle: "أنت في قائمة الانتظار",
    registeredTitle: "أنت في التشكيلة",
    joinTitle: "انضم إلى هذه المباراة",
    fullTitle: "هذه المباراة مكتملة",
    joinWaitlistAction: "انضم إلى قائمة الانتظار",
    fallbackTitle: "مباراة",
  },
  hub: {
    sections: {
      result: {
        title: "بحاجة إلى تأكيدك",
        meta: "النتيجة مُدخلة أو ناقصة",
      },
      open: { title: "أماكن شاغرة", meta: "الفرق غير جاهزة" },
      teams: { title: "الفرق جاهزة", meta: "اطّلع على فريقك" },
      full: { title: "مكتملة", meta: "قائمة الانتظار مفتوحة" },
    },
    card: {
      waitingForPlayers: "بانتظار اللاعبين",
      playersOf: (taken: number, seats: number) =>
        plural("ar", seats, {
          one: `${taken} من لاعب واحد`,
          two: `${taken} من لاعبَين`,
          few: `${taken} من {n} لاعبين`,
          many: `${taken} من {n} لاعبًا`,
          other: `${taken} من {n} لاعب`,
        }),
      openSpots: (n: number) =>
        plural("ar", n, {
          one: "، مكان واحد شاغر",
          two: "، مكانان شاغران",
          few: "، {n} أماكن شاغرة",
          many: "، {n} مكانًا شاغرًا",
          other: "، {n} مكان شاغر",
        }),
    },
  },
  selfPlacement: {
    beginner: {
      label: "مبتدئ",
      description: "ما زلت تتعلم. تلعب بين حين وآخر.",
    },
    casual: {
      label: "هاوٍ",
      description: "مباريات عفوية، تحافظ على مركزك. 1–2× في الأسبوع.",
    },
    competitive: {
      label: "تنافسي",
      description: "تلعب بطولات محلية وتصمد المباراة كاملة. 2–3× في الأسبوع.",
    },
    pro: {
      label: "محترف",
      description:
        "خلفية نادٍ أو أكاديمية، تتحكم في المباراة. عدة مرات في الأسبوع.",
    },
  },
  sizeLine: (sideSize: string, players: number) =>
    `${sideSize}، حتى ${plural("ar", players, {
      one: "لاعب واحد",
      two: "لاعبَين",
      few: "{n} لاعبين",
      many: "{n} لاعبًا",
      other: "{n} لاعب",
    })}`,
  draft: {
    status: "مسودة، لم تُنشر",
    statusCaptain: (team: string) => `مسودة، أنت قائد ${team}`,
    tag: "مسودة",
    title: "مسودة التشكيلة",
    savedAt: (day: string, time: string) => `حُفظت ${day} ${time}`,
    readyToPublish: "وُزّع الجميع. انشر عندما تكون جاهزًا.",
    visibleToGroupAdmins:
      "لا يرى اللاعبون هذه الفرق بعد. لا يراها إلا أنت ومشرفو المجموعة.",
    visibleToYou: "لا يرى اللاعبون هذه الفرق بعد. لا يراها إلا أنت.",
    visibleToGroupAdminsAndCaptains:
      "لا يرى اللاعبون هذه الفرق بعد. لا يراها إلا أنت ومشرفو المجموعة والقائدان.",
    visibleToYouAndCaptains:
      "لا يرى اللاعبون هذه الفرق بعد. لا يراها إلا أنت والقائدان.",
    noCaptainsGroup:
      "لم تختر قائدين، فلا يرى هذه المسودة إلا أنت ومشرفو المجموعة.",
    noCaptainsYou: "لم تختر قائدين، فلا يرى هذه المسودة إلا أنت.",
    captainApproved: "وافق القائد على فريقه. انشر عندما تكون جاهزًا.",
    bothCaptainsApproved: "وافق القائدان على فريقيهما. انشر عندما تكون جاهزًا.",
    captainsApprovedOf: (approved: number, total: number) =>
      plural("ar", total, {
        one: `وافق ${approved} من قائد واحد. يمكنك النشر دون انتظار.`,
        two: `وافق ${approved} من قائدَين. يمكنك النشر دون انتظار.`,
        few: `وافق ${approved} من {n} قادة. يمكنك النشر دون انتظار.`,
        many: `وافق ${approved} من {n} قائدًا. يمكنك النشر دون انتظار.`,
        other: `وافق ${approved} من {n} قائد. يمكنك النشر دون انتظار.`,
      }),
    publishAnyTime:
      "يمكنك النشر دون انتظار. نقل لاعب إلى فريق أو منه بعد موافقة قائده يعيد السؤال إلى ذلك القائد.",
    answer: {
      approved: "وافق",
      change_asked: "طلب تغييرًا",
      waiting: "بانتظار الرد",
      none: "لا أحد لسؤاله",
    },
    note: (note: string) => `«${note}»`,
    captainView: {
      from: (name: string) => `مسودة من ${name}.`,
      bothCaptainsAndOrganizers: "لا يراها إلا القائدان والمنظّمون.",
      bothCaptainsAndOrganizer: "لا يراها إلا القائدان والمنظّم.",
      youAndOrganizers: "لا يراها إلا أنت والمنظّمون.",
      youAndOrganizer: "لا يراها إلا أنت والمنظّم.",
    },
    captainPanel: {
      yourTeam: (team: string) => `فريقك، ${team}`,
      playersAvg: (n: number, avg: string) =>
        plural("ar", n, {
          one: `لاعب واحد، المعدل ${avg}`,
          two: `لاعبان، المعدل ${avg}`,
          few: `{n} لاعبين، المعدل ${avg}`,
          many: `{n} لاعبًا، المعدل ${avg}`,
          other: `{n} لاعب، المعدل ${avg}`,
        }),
      ask: (organizer: string) =>
        `راضٍ عن هذا الفريق؟ وافق ليعرف ${organizer} أن فريقك جاهز. لا شيء نهائي قبل النشر.`,
      approve: "أوافق على فريقي",
      askChange: "اطلب تغييرًا",
      approvedTitle: (team: string) => `وافقت على ${team}`,
      approvedBody: (organizer: string) => `ينشر ${organizer} حين يكون جاهزًا`,
      changeTitle: "طلبت تغييرًا",
      changeBody: (organizer: string) => `يرى ${organizer} ملاحظتك على المسودة`,
      undo: "تراجع",
      otherTeam: (team: string, captain: string | null) =>
        captain ? `${team}، القائد ${captain}` : `${team}، بلا قائد`,
      ownTeamOnly: (other: string) =>
        `توافق على فريقك وحده. ترى ${other}، لكن قائده هو من يرد عنه.`,
      noteSheet: {
        title: "اطلب تغييرًا",
        body: (organizer: string) =>
          `يرى ${organizer} ملاحظتك على المسودة. يبقى فريقك كما هو حتى يغيّره.`,
        label: "ملاحظتك",
        placeholder: "من يتبادل مع من، ولماذا؟",
        send: "أرسل",
        cancel: "إلغاء",
      },
    },
    notPublished: {
      title: "لم تُنشر الفرق بعد",
      body: "المنظّم يكوّنها الآن. سترى فريقك ولون صدريتك هنا فور نشرها.",
      value: "لم تُنشر",
    },
  },
  captains: {
    title: "القادة",
    optional: "اختياري، قائد لكل فريق",
    add: "أضف قائدًا",
    sheetBody:
      "يرى القائد المسودة ويستطيع الموافقة على فريقه قبل أن تنشر. ويبقى هو من يختار الأساسيين يوم المباراة.",
    noCaptainFor: (team: string) => `بلا قائد لـ${team}`,
    noneOnTeam:
      "لا أحد في هذا الفريق يمكن أن يكون قائدًا بعد. لا يصلح لذلك الضيوف ولا من ليس لديه حساب.",
    done: "تم",
    badge: "ق",
    spoken: "القائد",
    chipSpoken: (team: string, captain: string | null) =>
      captain ? `قائد ${team}: ${captain}` : `أضف قائدًا لـ${team}`,
    named: (name: string) => `القائد ${name}`,
    none: "لم يُختر قائد",
  },
  pick: {
    setup: {
      intro: "يكوّن قائدان الفريقين بنفسيهما، لاعبًا بعد لاعب، في غرفة مشتركة.",
      captainsTitle: "القائدان",
      captainsHint: "قائد لكل فريق",
      captainChip: (name: string, team: string) => `${name}، ${team}`,
      addCaptain: (team: string) => `قائد ${team}`,
      chipSpoken: (team: string, captain: string | null) =>
        captain ? `قائد ${team}: ${captain}` : `اختر قائدًا لـ${team}`,
      sheetBody:
        "يختار القائدان لاعبي الفريقين بالتناوب. يصلح لذلك أي لاعب في القائمة لديه حساب.",
      noneOnRoster:
        "لا أحد هنا يمكن أن يكون قائدًا بعد. لا يصلح لذلك الضيوف ولا من ليس لديه حساب.",
      firstPickTitle: "الاختيار الأول",
      toss: "القرعة",
      tossNote:
        "تُجرى القرعة في الغرفة حين يدخل القائدان. بعدها يختار كل منهما لاعبًا بالتناوب.",
      sideNote: (team: string) =>
        `يختار ${team} أولًا. بعدها يختار كل منهما لاعبًا بالتناوب.`,
      toBePicked: "بانتظار الاختيار",
      open: "افتح غرفة الاختيار",
      told: (first: string, second: string) =>
        `سيُبلَّغ ${first} و${second}. يبدأ الاختيار حين يدخل الاثنان.`,
      needsCaptains: "اختر قائدًا لكل فريق. يُبلَّغان حين تُفتح الغرفة.",
      replaceTitle: "استبدال المسودة المحفوظة؟",
      replaceBody:
        "فتح غرفة الاختيار يستبدل المسودة المحفوظة لهذه المباراة. يختار القائدان الفريقين من البداية.",
      replaceConfirm: "افتح غرفة الاختيار",
      cancel: "إلغاء",
    },
    title: "اختيار القائدين",
    introCaptain: (other: string) =>
      `تختار أنت و${other} الفريقين بينكما. يبدأ الاختيار حين تكونان معًا في الغرفة.`,
    introOrganizer: (first: string, second: string) =>
      `يختار ${first} و${second} الفريقين بينهما. يبدأ الاختيار حين يدخلان الغرفة، أو حين تبدؤه أنت.`,
    inRoom: "في الغرفة",
    notHereYet: "لم يصل بعد",
    presenceSpoken: (team: string, name: string, presence: string) =>
      `${team}، ${name}: ${presence}`,
    firstPickLabel: "الاختيار الأول",
    tossedWhenBothIn: "بالقرعة حين يدخل الاثنان",
    wonTheToss: (team: string) => `فاز ${team} بالقرعة`,
    picksFirst: (team: string) => `يختار ${team} أولًا`,
    orderLabel: "الترتيب",
    orderValue: "لاعب لكل منهما بالتناوب",
    toPickLabel: "للاختيار",
    poolEach: (n: number, each: number) =>
      `${plural("ar", n, {
        one: "لاعب واحد",
        two: "لاعبان",
        few: "{n} لاعبين",
        many: "{n} لاعبًا",
        other: "{n} لاعب",
      })}، ${each} لكل فريق`,
    poolSplit: (n: number, more: number, fewer: number) =>
      `${plural("ar", n, {
        one: "لاعب واحد",
        two: "لاعبان",
        few: "{n} لاعبين",
        many: "{n} لاعبًا",
        other: "{n} لاعب",
      })}، ${more} و${fewer}`,
    progress: (next: number, total: number) => `الاختيار ${next} من ${total}`,
    progressWatching: (next: number, total: number) =>
      `الاختيار ${next} من ${total}، تشاهد`,
    allPicked: (n: number) => `اكتمل الاختيار: ${n} من ${n}`,
    yourPick: "دورك في الاختيار",
    isPicking: (name: string) => `${name} يختار`,
    yourPickHint: (other: string) =>
      `اضغط على لاعب ثم أكّد. يراه ${other} بعد لحظة.`,
    pickAgainHint: (name: string) =>
      `تختار مجددًا حين ينتهي ${name} من اختياره.`,
    watchingHint:
      "لا يرى اللاعبون الاختيار. يمكنك مشاهدته وهو يجري، أو التدخل من الأسفل.",
    doneSizesEven: (each: number) => `${each} لكل فريق.`,
    doneSizesSplit: (more: number, fewer: number) =>
      `فريق من ${more} وآخر من ${fewer}.`,
    sideCount: (count: number, of: number) => `${count} من ${of}`,
    sideAverage: (team: string, average: string) => `متوسط ${team} ${average}`,
    poolLeft: (n: number) =>
      plural("ar", n, {
        one: "بقي لاعب واحد",
        two: "بقي لاعبان",
        few: "بقي {n} لاعبين",
        many: "بقي {n} لاعبًا",
        other: "بقي {n} لاعب",
      }),
    nextPick: (n: number) => `الاختيار ${n}`,
    nextPickSpoken: (team: string, n: number) => `الاختيار ${n} لـ${team}`,
    pickedSpoken: (n: number, player: string) => `الاختيار ${n}، ${player}`,
    pickPlayer: (name: string) => `اختر ${name}`,
    pickPlayerFor: (name: string, captain: string) =>
      `اختر ${name} عن ${captain}`,
    tapToPick: "اضغط على لاعب لاختياره",
    isChoosing: (name: string) => `${name} يختار الآن`,
    pickFor: (name: string) => `اختر عن ${name}`,
    pickForHint: (name: string) => `إن خرج ${name} من الغرفة`,
    undoLast: "تراجع عن آخر اختيار",
    undoHint: (name: string) => `يعود ${name} إلى قائمة الاختيار`,
    undoTitle: (n: number) => `التراجع عن الاختيار ${n}؟`,
    undoBody: (name: string, captain: string) =>
      `يعود ${name} إلى قائمة الاختيار ويختار ${captain} من جديد.`,
    undoNothing: "لا يوجد اختيار للتراجع عنه بعد",
    undoConfirm: "تراجع عن الاختيار",
    stopTitle: "إيقاف الاختيار؟",
    stopBody: "يبقى ما اختير مسودةً. تضع بقية اللاعبين بنفسك في تكوين الفرق.",
    cancel: "إلغاء",
    undone: (name: string) => `عاد ${name} إلى قائمة الاختيار`,
    poolTitle: "اللاعبون",
    poolHead: (n: number) => `${n}، الأعلى مستوى أولًا`,
    andMore: (n: number) =>
      plural("ar", n, {
        one: "ولاعب آخر",
        two: "ولاعبان آخران",
        few: "و{n} لاعبين آخرين",
        many: "و{n} لاعبًا آخر",
        other: "و{n} لاعب آخر",
      }),
    waitingFor: (name: string) => `بانتظار ${name}`,
    waitingForBoth: "بانتظار القائدين",
    remind: (name: string) => `ذكّر ${name}`,
    reminded: (name: string) => `ذُكّر ${name}`,
    remindedRecently: (name: string) => `ذُكّر ${name} خلال آخر 5 دقائق`,
    startNow: "ابدأ الاختيار الآن",
    startNowHint: "ابدأ دون انتظار. يمكنك الاختيار عن قائد غائب.",
    stop: "أوقف الاختيار",
    stopHint: "احتفظ بما اختير وأكمل الفريقين بنفسك",
    doneTitle: "اكتمل اختيار الفريقين",
    doneBody: "يصلان إلى المنظّم مسودةً، وقد وافق عليهما القائدان.",
    seeTheDraft: "اعرض المسودة",
    stopped: "أوقف المنظّم الاختيار",
    closedTitle: "غرفة الاختيار مغلقة",
    closedBody: "لا يفتحها إلا القائدان والمنظّمون، وما دام الاختيار جاريًا.",
    backToGame: "العودة إلى المباراة",
    loading: "جارٍ تحميل غرفة الاختيار",
    loadError: "تعذّر تحميل غرفة الاختيار",
    inProgress: {
      title: "اختيار القائدين جارٍ",
      waiting: "الغرفة مفتوحة. يبدأ الاختيار حين يدخل القائدان.",
      live: "القائدان يختاران الفريقين الآن.",
      open: "افتح غرفة الاختيار",
    },
  },
  draftShare: {
    title: "شارك المسودة",
    bothTeams: "الفريقان",
    typeLine: (sideSize: string | null) =>
      sideSize ? `مسودة / كرة القدم / ${sideSize}` : "مسودة / كرة القدم",
    captain: (name: string) => `القائد ${name}`,
    noCaptain: "بلا قائد",
    players: (n: number) =>
      plural("ar", n, {
        one: "لاعب واحد",
        two: "لاعبان",
        few: "{n} لاعبين",
        many: "{n} لاعبًا",
        other: "{n} لاعب",
      }),
    sideLine: (captain: string, players: string) => `${captain} / ${players}`,
    teamLabel: (team: string) => `فريق ${team}`,
    against: (other: string, sideSize: number | null) =>
      sideSize
        ? `ضد ${other}، ${plural("ar", sideSize, {
            one: "يبدأ لاعب واحد",
            two: "يبدأ لاعبان",
            few: "يبدأ {n} لاعبين",
            many: "يبدأ {n} لاعبًا",
            other: "يبدأ {n} لاعب",
          })} ويختارهم القائد`
        : `ضد ${other}`,
    andMore: (n: number) =>
      plural("ar", n, {
        one: "ولاعب آخر",
        two: "ولاعبان آخران",
        few: "و{n} لاعبين آخرين",
        many: "و{n} لاعبًا آخر",
        other: "و{n} لاعب آخر",
      }),
    stamp: "مسودة، ليست نهائية",
    noteBothGroup:
      "الفريقان في صورة واحدة، مختومة بأنها مسودة. في Temba لا يراها إلا المنظّمون والمشرفون والقادة؛ أما الصورة فتصل إلى حيث ترسلها.",
    noteBoth:
      "الفريقان في صورة واحدة، مختومة بأنها مسودة. في Temba لا يراها إلا المنظّمون والقادة؛ أما الصورة فتصل إلى حيث ترسلها.",
    noteOne: (team: string) =>
      `${team} وحده، لمحادثة ذلك الفريق. مختومة بأنها مسودة؛ أما الصورة فتصل إلى حيث ترسلها.`,
    message: (game: string | null, when: string | null) => {
      const subject = [game, when].filter(Boolean).join("، ");
      return subject
        ? `مسودة الفرق لـ${subject}. ليست نهائية.`
        : "مسودة الفرق. ليست نهائية.";
    },
    loading: "جارٍ تحميل المسودة",
    loadError: "تعذّر تحميل المسودة",
    empty: {
      title: "لا توجد مسودة للمشاركة",
      body: "لا يشارك المسودة إلا المنظّمون والقادة، وحتى تُنشر الفرق فقط.",
    },
  },
  matchLog: {
    whatHappened: "ماذا حدث",
    modes: {
      goal: "هدف",
      ownGoal: "هدف عكسي",
      warning: "إنذار",
      redCard: "بطاقة حمراء",
    },
    hints: {
      goal: "اضغط على اسم لإضافة هدف",
      ownGoal: "اضغط على من سجّل في مرماه",
      warning: "اضغط على من يُنذَر",
      redCard: "اضغط على من يُطرَد",
    },
    entryNote:
      "استخدم زر الزائد لفريق إن لم يرَ أحد من سجّل. تُحتسب الأهداف في الأداء الأخير للاعب، لا في التصنيف. تجاوز كل هذا إن لم يتابع أحد العدّ.",
    title: "سجل المباراة",
    lineCount: (n: number) =>
      plural("ar", n, {
        zero: "لا أسطر",
        one: "سطر واحد، الأحدث أولًا",
        two: "سطران، الأحدث أولًا",
        few: "{n} أسطر، الأحدث أولًا",
        many: "{n} سطرًا، الأحدث أولًا",
        other: "{n} سطر، الأحدث أولًا",
      }),
    empty: "لم يُسجَّل شيء بعد",
    logNote:
      "يحتفظ كل سطر بوقت تسجيله. احذف أي سطر بزر الإغلاق، وتتبعه النتيجة. اضغط على سطر لتغييره.",
    playerOfTeam: (name: string, team: string) => `${name}، ${team}`,
    scorerUnknown: "المسجّل غير معروف",
    playerUnknown: "اللاعب غير معروف",
    addScorer: "أضف المسجّل",
    undo: "تراجع",
    minute: (minute: number) => `${minute}′`,
    minuteSpoken: (minute: number) => `الدقيقة ${minute}`,
    sub: {
      goal: (team: string) => `هدف، ${team}`,
      ownGoal: (team: string) => `هدف عكسي، يُحتسب لـ${team}`,
      warning: (team: string) => `إنذار، ${team}`,
      redCard: (team: string) => `بطاقة حمراء، ${team}`,
      redCardWhy: (team: string, why: string) => `بطاقة حمراء، ${team}. ${why}`,
    },
    kind: {
      goal: "هدف",
      ownGoal: "هدف عكسي",
      warning: "إنذار",
      redCard: "بطاقة حمراء",
    },
    ownGoalTag: "هدف عكسي",
    reasons: {
      second_warning: "إنذار ثانٍ",
      serious_foul: "خطأ جسيم",
      violent_conduct: "سلوك عنيف",
      dissent: "اعتراض",
      other: "سبب آخر",
    },
    removed: {
      goal: (name: string) => `حُذف هدف ${name}`,
      ownGoal: (name: string) => `حُذف الهدف العكسي لـ${name}`,
      warning: (name: string) => `حُذف إنذار ${name}`,
      redCard: (name: string) => `حُذفت بطاقة ${name} الحمراء`,
      unknownGoal: (team: string) => `حُذف هدف لـ${team}`,
    },
    removeLine: (what: string) => `احذف: ${what}`,
    editLine: (what: string) => `غيّر: ${what}`,
    redSheet: {
      title: "بطاقة حمراء",
      why: "السبب، اختياري",
      note: "يُعَدّ اللاعب مطرودًا في هذه المباراة. يظهر ذلك للجميع في المباراة بعد تأكيد النتيجة.",
      give: "أعطِ بطاقة حمراء",
    },
    scorerSheet: {
      title: "من سجّل",
      what: (team: string, minute: number, clock: string) =>
        `هدف لـ${team}، ${minute}′، ${clock}`,
      ownGoalBy: (team: string) => `هدف عكسي من ${team}`,
      note: "يبقى السطر في مكانه في السجل. يتغيّر المسجّل أو الدقيقة فقط.",
    },
    editSheet: {
      title: "غيّر السطر",
      who: "من",
      minuteLabel: "دقيقة المباراة",
      earlier: "دقيقة أبكر",
      later: "دقيقة أبعد",
      done: "تم",
      remove: "احذف السطر",
    },
    cancel: "إلغاء",
    chip: {
      goals: (n: number) =>
        plural("ar", n, {
          zero: "لا أهداف",
          one: "هدف واحد",
          two: "هدفان",
          few: "{n} أهداف",
          many: "{n} هدفًا",
          other: "{n} هدف",
        }),
      warned: "مُنذَر",
      sentOff: "مطرود",
    },
    confirm: {
      enteredBy: "أدخلها",
      cards: "البطاقات",
      sentOff: "طُرد",
      sentOffAt: (name: string, minute: number) => `${name}، ${minute}′`,
      scorers: "المسجّلون",
      ownGoals: "هدف عكسي",
      confirmedBy: "أكّدها",
      warningsSpoken: (n: number) =>
        plural("ar", n, {
          zero: "لا إنذارات",
          one: "إنذار واحد",
          two: "إنذاران",
          few: "{n} إنذارات",
          many: "{n} إنذارًا",
          other: "{n} إنذار",
        }),
      redCardsSpoken: (n: number) =>
        plural("ar", n, {
          zero: "لا بطاقات حمراء",
          one: "بطاقة حمراء واحدة",
          two: "بطاقتان حمراوان",
          few: "{n} بطاقات حمراء",
          many: "{n} بطاقة حمراء",
          other: "{n} بطاقة حمراء",
        }),
      sidesNote: (team1: string, team2: string) =>
        `أحداث ${team1} على اليمين، و${team2} على اليسار. يظهر الهدف العكسي في جهة الفريق الذي احتُسب له.`,
    },
    errors: {
      lineSide: "سطر في سجل المباراة على الفريق الخطأ",
      linePlayer: "لاعب في سجل المباراة ليس في أيٍّ من الفريقين",
      linePlayerNeeded: "سمِّ اللاعب لكل بطاقة وكل هدف عكسي",
      reasonOnRedOnly: "السبب للبطاقة الحمراء فقط",
      sentOffOnce: "يُطرد اللاعب مرة واحدة فقط",
      logMatchesScore: "يجب أن يطابق سجل المباراة النتيجة",
      logMatchesScorers: "يجب أن يسمّي سجل المباراة المسجّلين أنفسهم",
    },
  },
  errors: {
    notFootball: "الفرق والنتيجة لمباريات كرة القدم فقط",
    roleOnFootball: "الدور والمركز لمباريات كرة القدم فقط",
    friendlyOnly: "مباريات كرة القدم ودية",
    noLevelRange: "نطاق المستوى فقط لمباراة كرة قدم تُحتسب لمستوى Temba",
    keeperSeatsTaken: "مكانا حارس المرمى مشغولان",
    oneTeamOnly: "يكون اللاعب في فريق واحد فقط",
    registeredOnly: "لا يوضع في الفرق إلا اللاعبون المسجّلون",
    differentBibs: "اختر لونين مختلفين للصدريات",
    teamsFixed: "سُجّلت النتيجة، لذا الفرق ثابتة",
    publishTeamsFirst: "انشر الفرق قبل إدخال النتيجة",
    scoreLocked: "هذه النتيجة مؤكدة؛ لم يعد بالإمكان تغييرها",
    scoreOpensAtKickOff: "تُفتح النتيجة عند البداية",
    scoreOrganizerOrPlayers: "لا يدخل النتيجة إلا المنظّم أو لاعبو الفريقين",
    scorerOnce: "اذكر كل هدّاف مرة واحدة",
    scorersOnTeams: "يجب أن يكون الهدّافون من أحد الفريقين",
    draftNeedsPlayer: "ضع لاعبًا واحدًا على الأقل لحفظ مسودة",
    draftChanged: "تغيّرت المسودة. افتحها من جديد.",
    draftTeamsPublished: "نُشرت الفرق، فلا توجد مسودة لحفظها",
    captainOnSide: "يجب أن يكون القائد لاعبًا في فريقه",
    captainNeedsAccount: "لا يمكن أن يكون الضيف أو من ليس لديه حساب قائدًا",
    draftNotCaptain: "لا يرد عن الفريق إلا قائده",
    draftNoteLength: (max: number) => `اكتب ملاحظة من 1 إلى ${max} حرفًا`,
    pickNeedsPlayers: (min: number) =>
      `يحتاج اختيار القائدين ${min} لاعبين على الأقل`,
    pickNeedsCaptains: "اختر قائدًا لكل فريق",
    pickCaptainsDiffer: "اختر قائدين مختلفين",
    pickRunning: "اختيار القائدين جارٍ. أوقفه أولًا.",
    pickNotWaiting: "بدأ الاختيار بالفعل",
    pickNotRunning: "لا يجري اختيار قائدين الآن",
    pickRemindOtherSide: "تستطيع تذكير القائد الآخر فقط",
    pickNotLive: "الاختيار ليس جاريًا",
    pickOnTurnOnly: "لا يختار إلا القائد صاحب الدور",
    pickNotYourTurn: "الدور للفريق الآخر",
    pickNotInPool: "هذا اللاعب ليس في قائمة الاختيار",
    pickMovedOn: "تقدّم الاختيار",
    pickNothingToUndo: "لا يوجد اختيار للتراجع عنه",
  },
} satisfies typeof source;
