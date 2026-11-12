import { isolate } from "../../bidi";
import { plural } from "../../plural";
import type { team as source } from "../en/team";

export const team = {
  title: "الفرق",
  description: "الفرق والثنائيات التي تلعب فيها",
  errorTitle: "تعذّر تحميل الفرق",
  empty: {
    title: "لا فرق بعد",
    description: "الفريق شراكة دائمة مع لاعب آخر.",
  },
  createLabel: "إنشاء فريق",
  sportLabel: "الرياضة",
  toast: {
    created: "تم إنشاء الفريق",
    joined: "انضممت إلى الفريق",
    left: "غادرت الفريق",
    dissolved: "تم حل الفريق",
  },
  teamErrorTitle: "تعذّر تحميل الفريق",
  notFound: {
    title: "الفريق غير موجود",
    description: "ربما حُلّ، أو ليس لديك صلاحية الوصول إليه.",
  },
  forbidden: {
    title: "لا يمكنك فتح هذا الفريق",
    description: "لا يفتح صفحة الفريق إلا أعضاؤه أو مدعو بانتظار الرد.",
  },
  lookupNote: "اختر شخصًا واحدًا. الدعوات لا تنتهي.",
  squadLookupNote: "اختر من تريد دعوتهم. الدعوات لا تنتهي.",
  squadInviteDescription: "ادعُ لاعبين إلى التشكيلة، أو انسخ رابطًا لمشاركته.",
  squadInviteLabel: "دعوة لاعبين",
  inviteDescription: "ادعُ شريكًا للمكان الشاغر، أو انسخ رابطًا لمشاركته.",
  invitePartnerLabel: "ادعُ شريكك",
  leaveLabel: "مغادرة الفريق",
  dissolveLabel: "حل الفريق",
  image: {
    add: "إضافة صورة",
    change: "تغيير الصورة",
    remove: "إزالة الصورة",
    savedToast: "تم حفظ الصورة",
    removedToast: "تمت إزالة الصورة",
    uploading: "جارٍ رفع الصورة…",
    createdWithoutImage: "أُنشئ الفريق بدون صورة",
    removeConfirm: {
      title: (name: string) => `إزالة صورة ${isolate(name)}؟`,
      description: "سيعود الفريق إلى أحرفه الأولى.",
      confirmLabel: "إزالة الصورة",
    },
  },
  waitingCopy: "بانتظار شريك. هذا الفريق غير مكتمل حتى ينضم عضو ثانٍ.",
  noMembers: {
    title: "لا أعضاء",
    description: "يظهر هنا أعضاء هذا الفريق.",
  },
  incompleteLabel: "غير مكتمل",
  memberFallback: "عضو",
  fallbackName: "الفريق",
  dissolveConfirm: {
    title: (name: string) => `حل ${name}؟`,
    description: "لا يمكن التراجع عن هذا.",
  },
  dissolveBlocked: {
    openChallenge: "اسحب التحدي المفتوح لهذا الفريق قبل حلّه",
    pendingProposal: "اسحب العروض المعلّقة لهذا الفريق قبل حلّه",
    challengeGame:
      "لهذا الفريق مباراة تحدٍّ لم تُلعب بعد. ألغها أو أكملها قبل حلّ الفريق.",
  },
  leaveConfirm: {
    title: (name: string) => `مغادرة ${name}؟`,
    description: "لا يمكنك العودة إلا إذا دُعيت مجددًا.",
  },
  roster: {
    title: "قائمة الفريق",
    count: (count: number, max: number) => `${count} من ${max}`,
    hero: (count: number, max: number) => `قائمة الفريق ${count} من ${max}`,
    plays: (sideSizes: readonly number[]) => {
      const sizes = sideSizes.map((size) => `${size} ضد ${size}`);
      const last = sizes.pop();
      const list = sizes.length > 0 ? `${sizes.join("، ")} و${last}` : last;
      return `يلعب ${list}`;
    },
    more: (n: number) =>
      plural("ar", n, {
        one: "وواحد آخر",
        two: "واثنان آخران",
        few: "و{n} آخرون",
        many: "و{n} آخرين",
        other: "و{n} آخرين",
      }),
    addMore: {
      title: "أضف المزيد",
      detail: (max: number) => `برقم الهاتف أو على Temba. حتى ${max}`,
      detailWithGroup: (group: string, max: number) =>
        `برقم الهاتف، أو على Temba، أو من ${isolate(group)}. حتى ${max}`,
    },
    full: "ممتلئ",
    complete: "مكتمل",
    waitingSquad: (n: number) =>
      plural("ar", n, {
        one: "يلزم عضو واحد آخر ليكتمل.",
        two: "يلزم عضوان آخران ليكتمل.",
        few: "يلزم {n} أعضاء آخرين ليكتمل.",
        many: "يلزم {n} عضوًا آخر ليكتمل.",
        other: "يلزم {n} عضو آخر ليكتمل.",
      }),
  },
  stats: {
    gamesPlayed: "المباريات الملعوبة",
    draws: "التعادلات",
  },
  captainLabel: "القائد",
  draft: {
    countLine: (count: number, max: number) => `${count} من ${max}، معك أنت`,
    added: "مضاف، ليس على Temba",
    remove: (name: string) => `إزالة ${isolate(name)}`,
    full: (max: number) => `القائمة ممتلئة عند ${max}.`,
  },
  addPlayers: {
    title: "أضف لاعبين",
    description:
      "أضف برقم الهاتف، أو ابحث عن شخص على Temba، أو اختر من مجموعة تنظّمها. من على Temba تصله دعوة ليقبلها.",
    tabs: {
      label: "طريقة الإضافة",
      phone: "برقم الهاتف",
      temba: "على Temba",
      group: "من مجموعة",
    },
    spotsLeft: (n: number) =>
      plural("ar", n, {
        one: "بقي مكان واحد",
        two: "بقي مكانان",
        few: "بقيت {n} أماكن",
        many: "بقي {n} مكانًا",
        other: "بقي {n} مكان",
      }),
    full: "القائمة ممتلئة.",
    addToRoster: "أضف إلى القائمة",
    searchLabel: "ابحث بالاسم أو اسم المستخدم أو البريد أو الهاتف",
    searchEmpty: "لا أحد على Temba يطابق البحث.",
    invite: "ادعُ",
    invitedMark: "مدعو",
    preview: {
      alreadyOnTeam: (name: string) => `${isolate(name)} في القائمة بالفعل`,
      alreadyInvited: (name: string) => `لدى ${isolate(name)} دعوة بالفعل`,
      alreadyListed: (name: string) => `${isolate(name)} في القائمة بالفعل`,
    },
    groupLabel: "المجموعة",
    noGroups: "تظهر هنا المجموعات التي تنظّمها.",
    groupEmpty: "كل أعضاء هذه المجموعة في القائمة بالفعل.",
    memberUnclaimed: "ليس على Temba بعد. أضفه برقم الهاتف.",
    addCount: (n: number) =>
      plural("ar", n, {
        one: "أضف لاعبًا واحدًا",
        two: "أضف لاعبَين",
        few: "أضف {n} لاعبين",
        many: "أضف {n} لاعبًا",
        other: "أضف {n} لاعب",
      }),
    select: "اختر لاعبين",
    invitesSent: (n: number) =>
      plural("ar", n, {
        one: "أُرسلت دعوة واحدة",
        two: "أُرسلت دعوتان",
        few: "أُرسلت {n} دعوات",
        many: "أُرسلت {n} دعوة",
        other: "أُرسلت {n} دعوة",
      }),
    listed: (name: string) => `${isolate(name)} في القائمة`,
    removeConfirm: {
      title: (name: string) => `إزالة ${isolate(name)}؟`,
      description:
        "ليس على Temba بعد، لذا يُزال من القائمة. تبقى مبارياته في السجل.",
      confirm: "إزالة",
    },
  },
  create: {
    title: "فريق جديد",
    fromGroupTitle: "فريق من مجموعة",
    nameTitle: "الاسم",
    nameLabel: "اسم الفريق",
    namePlaceholder: "Gooz FC",
    sportTitle: "الرياضة",
    sportHint: "تحدد حجم الفريق",
    sport: {
      padel: { name: "بادل", detail: "لاعبان" },
      football: {
        name: "كرة القدم",
        detail: (max: number) => `قائمة حتى ${max}`,
      },
    },
    rosterTitle: "القائمة",
    stripHelper: "5 لمباراة 5 ضد 5، و7 لمباراة 7 ضد 7",
    stripMax: (max: number) => `${max} كحد أقصى`,
    stripSpoken: (taken: number, waiting: number, max: number) =>
      `${taken} من ${max} مقاعد، ${waiting} لم يؤكَّدوا بعد`,
    legendIn: "في الفريق",
    legendPending: "مدعو أو مضاف، لم يؤكَّد بعد",
    sources: {
      label: "طريقة الإضافة",
      phone: "برقم الهاتف",
      temba: "على Temba",
      group: "من مجموعة",
    },
    phoneLabel: "رقم الهاتف",
    lookingUp: "جارٍ البحث…",
    lookup: {
      found: (tag: string | null, games: number) =>
        [
          "على Temba",
          tag,
          games > 0
            ? plural("ar", games, {
                one: "مباراة واحدة معك",
                two: "مباراتان معك",
                few: "{n} مباريات معك",
                other: "{n} مباراة معك",
              })
            : null,
        ]
          .filter(Boolean)
          .join(". "),
      sportLevel: (sport: string, level: string | null) =>
        level ? `${sport} ${level}` : sport,
      invite: "دعوة",
      inviteA11y: (name: string) => `دعوة ${isolate(name)}`,
      inviteNote: (name: string) =>
        `تصل الدعوة إلى ${isolate(name)} في التطبيق. يظهر المقعد بانتظار القبول حتى يقبل؛ ويمكنك نشر التحديات في الأثناء.`,
      newTitle: "ليس على Temba بعد",
      newLine: "أضفه على أي حال. لا يحتاج إلى التطبيق ليكون في الفريق.",
      unclaimedLine: "ليس على Temba بعد. سبقت إضافته برقم الهاتف",
      add: "إضافة",
      addA11y: (name: string) => `إضافة ${isolate(name)}`,
      nameLabel: "الاسم",
      roleLabel: "المركز",
      roles: {
        gk: "حارس",
        def: "دفاع",
        mid: "وسط",
        fwd: "هجوم",
      },
      addNamed: (name: string) => `أضف ${isolate(name)} إلى الفريق`,
      addUnnamed: "أضف إلى الفريق",
    },
    row: {
      captain: "القائد",
      invited: "مدعو",
      waiting: "بانتظار القبول",
      addedByYou: "أضفته أنت",
      notOnTemba: "ليس على Temba",
      sentence: (parts: readonly string[]) => parts.join(". "),
      invitedByPhone: "دُعي برقم الهاتف",
      invitedOnTemba: "دُعي على Temba",
      invitedFromGroup: (group: string) => `دُعي من ${isolate(group)}`,
      remove: (name: string) => `إزالة ${isolate(name)}`,
    },
    addMore: "أضف المزيد. برقم الهاتف، أو على Temba، أو من مجموعة",
    enough: (count: number, side: number) =>
      `${count} لاعبين يكفون لنشر تحدٍّ ${side} ضد ${side}؛ وتُختار تشكيلة المباراة لكل مباراة بعد تأكيدها.`,
    addedNote:
      "اللاعبون المضافون يُحسبون في القائمة ويظهرون في التحديات بأسمائهم. وإن انضموا إلى Temba بالرقم نفسه لاحقًا، يصبح المقعد لهم: بالسجل والنتائج والعلامات.",
    submit: "أنشئ الفريق",
    submitNamed: (name: string) => `أنشئ ${isolate(name)}`,
    group: {
      title: "المجموعة",
      organize: (n: number) => `تنظّم ${n}`,
      meta: (sport: string, members: number, teams: number) =>
        `${sport}، ${plural("ar", members, {
          zero: "لا أعضاء",
          one: "عضو واحد",
          two: "عضوان",
          few: "{n} أعضاء",
          other: "{n} عضوًا",
        })}. ${
          teams === 0
            ? "لا فريق بعد"
            : plural("ar", teams, {
                one: "لها فريق واحد",
                two: "لها فريقان",
                few: "لها {n} فرق",
                other: "لها {n} فريقًا",
              })
        }`,
      empty: "تظهر هنا المجموعات التي تنظّمها.",
      squadTitle: "اختر التشكيلة",
      squadCount: (picked: number, max: number, sport: string) =>
        `${picked} من ${max}، ${sport}`,
      sportLower: { padel: "بادل", football: "كرة القدم" },
      youCaptain: "أنت، القائد",
      more: (n: number) =>
        plural("ar", n, {
          one: "وعضو آخر",
          two: "وعضوان آخران",
          few: "و{n} أعضاء آخرين",
          other: "و{n} عضوًا آخر",
        }),
      tag: (group: string) => ({
        before: "وسم كفريق ",
        strong: isolate(group),
        after: ". يظهر في صفحة المجموعة؛ ويمكن للمنظمين نشر تحديات باسمه.",
      }),
    },
  },
  groupTag: {
    line: (group: string) => `فريق ${isolate(group)}`,
    tagAs: (group: string) => `وسم كفريق ${isolate(group)}`,
    remove: "إزالة الوسم",
    tagged: (group: string) => `أصبح فريق ${isolate(group)}`,
    removed: "أزيل الوسم",
    captainOnly: "القائد وحده يستطيع وسم هذا الفريق بمجموعة",
  },
  recordSpoken: (wins: number, losses: number) => `فاز ${wins}، خسر ${losses}`,
  recordSpokenWithDraws: (wins: number, draws: number, losses: number) =>
    `فاز ${wins}، تعادل ${draws}، خسر ${losses}`,
  onRoster: (n: number) =>
    plural("ar", n, {
      zero: "لا أحد في قائمة الفريق",
      one: "لاعب واحد في قائمة الفريق",
      two: "لاعبان في قائمة الفريق",
      few: "{n} لاعبين في قائمة الفريق",
      many: "{n} لاعبًا في قائمة الفريق",
      other: "{n} لاعب في قائمة الفريق",
    }),
  level: {
    member: (band: string, level: string) => `${band}، ${level}`,
    team: (band: string, level: string) => `${band}، المعدل ${level}`,
  },
  seat: {
    left: "يلعب يسارًا",
    right: "يلعب يمينًا",
    either: "أي جهة",
    keeper: "حارس مرمى",
    outfield: "لاعب ميدان",
  },
  form: {
    title: "آخر النتائج",
    empty: "لا نتائج بعد. تظهر هنا آخر عشر نتائج.",
    older: "الأقدم",
    latest: "الأحدث",
  },
  rivals: {
    title: "المنافسون",
    headToHead: (wins: number, losses: number) => `${wins}–${losses}`,
    headToHeadWithDraws: (wins: number, draws: number, losses: number) =>
      `${wins}–${draws}–${losses}`,
    headToHeadSpoken: (wins: number, losses: number) =>
      `المواجهات المباشرة: فاز ${wins}، خسر ${losses}`,
    headToHeadSpokenWithDraws: (wins: number, draws: number, losses: number) =>
      `المواجهات المباشرة: فاز ${wins}، تعادل ${draws}، خسر ${losses}`,
    played: (n: number) =>
      plural("ar", n, {
        zero: "لا مباريات",
        one: "مباراة واحدة",
        two: "مباراتان",
        few: "{n} مباريات",
        many: "{n} مباراة",
        other: "{n} مباراة",
      }),
    last: (result: string, day: string) => `الأخيرة: ${result}، ${day}`,
    closest: (name: string) =>
      `الأقرب: ${name}، لعبتم مرة واحدة. مباراة أخرى تجعله منافسًا.`,
    empty: "العب ضد الفريق نفسه مرتين ليصبح منافسًا.",
    rematch: "مباراة إعادة",
    rematchA11y: (team: string) => `مباراة إعادة ضد ${isolate(team)}`,
    opponentFallback: "المنافس",
  },
  games: {
    title: "المباريات",
    empty: "لا مباريات ملعوبة بعد.",
  },
  detail: {
    sportLevel: (sport: string, band: string) => `${sport}، ${band}`,
    since: (month: string, year: number) => `منذ ${month} ${year}`,
    sentences: (parts: readonly string[]) => parts.join(". "),
    record: {
      label: "السجل",
      games: (n: number) =>
        plural("ar", n, {
          zero: "لا مباريات",
          one: "مباراة واحدة",
          two: "مباراتان",
          few: "{n} مباريات",
          many: "{n} مباراة",
          other: "{n} مباراة",
        }),
      wonDrawnLost: "فوز، تعادل، خسارة",
    },
    membersSpoken: (names: string) => `الأعضاء: ${names}`,
    postChallenge: "انشر تحديًا",
    share: "مشاركة",
    shareText: (team: string, url: string) =>
      `${isolate(team)} على Temba: ${url}`,
    shareCopied: "نُسخ رابط الفريق",
    openGroup: (group: string) => `افتح ${isolate(group)}`,
    form: {
      allTime: "كل الأوقات",
    },
    rivals: {
      subtitle: "لعبتم ضدهم مرتين أو أكثر",
      none: "لا أحد بعد",
      result: { won: "فوز", lost: "خسارة", draw: "تعادل" },
      last: (result: string, score: string, day: string) =>
        `الأخيرة: ${result} ${score} في ${day}`,
      lastNoScore: (day: string) => `الأخيرة: لُعبت في ${day}، بلا نتيجة`,
      next: (last: string, day: string) => `${last}. القادمة ${day}`,
      footnote:
        "مباراة الإعادة تملأ تحديًا لذلك الفريق مسبقًا وترسله إليه مباشرة.",
      emptyTitle: "لا منافسين بعد",
      emptyBody:
        "العب ضد الفريق نفسه مرتين ليظهر هنا مع نتائج المواجهات المباشرة.",
      versus: "ضد",
      closest: (name: string) => `الأقرب: ${isolate(name)}، لعبتم مرة واحدة.`,
      closestNext: (name: string, day: string) =>
        `الأقرب: ${isolate(name)}، لعبتم مرة واحدة. ${day} تجعلها مرتين.`,
    },
    members: {
      title: "الأعضاء",
      you: "أنت",
      captain: "القائد",
      youCaptain: "أنت، القائد",
      line: (who: string, seat: string) => `${who}. ${seat}`,
      level: (band: string, level: string) => `${band} ${level}`,
      side: {
        left: "الجهة اليسرى",
        right: "الجهة اليمنى",
        either: "أي جهة",
      },
    },
    roster: {
      openSeat: "مقعد شاغر",
      invite: "دعوة",
      partnerDetail: "ابحث عن شريكك على Temba، أو شارك رابطًا",
      footnote:
        "القائمة هي من في الفريق. ومن يلعب مباراة بعينها هو تشكيلة يوم المباراة، تُسمّى لكل مباراة: الأساسيون وحتى ثلاثة احتياط. وهم وحدهم من تُحتسب لهم النتيجة.",
    },
    games: {
      subtitle: "كلها من التحديات",
      versus: (name: string) => `ضد ${isolate(name)}`,
      sets: (sets: readonly string[]) => sets.join(", "),
    },
  },
  errors: {
    full: "اكتمل هذا الفريق",
    inviteUnavailable: "دعوة الفريق غير متاحة",
    inviteNotFound: "دعوة الفريق غير موجودة",
    pairTaken: "لهذا الثنائي فريق أو دعوة معلّقة بالفعل",
    alreadyMember: "أنت عضو في هذا الفريق بالفعل",
    userAlreadyMember: "هذا المستخدم عضو في هذا الفريق بالفعل",
    captainImage: "القائد وحده يستطيع تغيير صورة الفريق",
    memberDissolves: "لا يحلّ هذا الفريق إلا أحد أعضائه",
    creatorDissolves: "منشئ الفريق وحده يستطيع حلّه",
    creatorDissolvesIncomplete: "منشئ الفريق وحده يستطيع حلّ فريق غير مكتمل",
    inviteSelf: "لا يمكنك دعوة نفسك",
    revokeUnusedFirst: "ألغِ الدعوة غير المستخدمة قبل إرسال دعوة جديدة",
    memberLeaves: "لا يغادر هذا الفريق إلا أحد أعضائه",
    dissolveInstead: "حُلّ الفريق بدلًا من ذلك",
    creatorCannotLeave: "لا يستطيع المنشئ المغادرة؛ حُلّ الفريق بدلًا من ذلك",
    groupOrganizersAdd: "لا يضيف أعضاء المجموعة إلا منظّموها",
    captainAdds: "القائد وحده يستطيع إضافة لاعبين",
    groupSport: "اختر مجموعة من رياضة الفريق",
    creatorListsInvites: "منشئ الفريق وحده يستطيع عرض دعواته",
    captainRemoves: "القائد وحده يستطيع إزالة لاعبين",
    notOnRoster: "هذا اللاعب ليس في القائمة",
    creatorRevokesInvites: "منشئ الفريق وحده يستطيع إلغاء دعواته",
    acceptedNoRevoke: "لا يمكن إلغاء الدعوات المقبولة",
    tagRemover: "لا يزيل الوسم إلا القائد أو أحد منظّمي المجموعة الموسومة",
    tagSport: "لا يُوسم الفريق إلا بمجموعة من رياضته",
    tagCaptainGroup: "لا يُوسم الفريق إلا بمجموعة يكون قائده عضوًا فيها",
    playerAlreadyOnRoster: (name: string) =>
      `${isolate(name)} في القائمة بالفعل`,
    creatorInvitesPartner:
      "منشئ الفريق وحده يستطيع دعوة شريك ما دام الفريق غير مكتمل",
    creatorInvites: "منشئ الفريق وحده يستطيع الدعوة إليه",
    listedTwice: "شخص مذكور مرتين في القائمة",
    numberListedTwice: "رقم مذكور مرتين في القائمة",
    rosterLimit: (max: number) =>
      plural("ar", max, {
        zero: "لا يتسع الفريق لأي لاعب. أزل أحدًا أولًا",
        one: "يتسع الفريق للاعب واحد، وأنت منهم. أزل أحدًا أولًا",
        two: "يتسع الفريق للاعبَين، وأنت منهما. أزل أحدًا أولًا",
        few: "يتسع الفريق لـ{n} لاعبين، وأنت منهم. أزل أحدًا أولًا",
        many: "يتسع الفريق لـ{n} لاعبًا، وأنت منهم. أزل أحدًا أولًا",
        other: "يتسع الفريق لـ{n} لاعب، وأنت منهم. أزل أحدًا أولًا",
      }),
    roleOnFootballTeam: "الدور والمركز لفرق كرة القدم فقط",
  },
} satisfies typeof source;
