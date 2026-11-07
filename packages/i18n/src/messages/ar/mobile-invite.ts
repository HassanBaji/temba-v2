import { plural } from "../../plural";
import type { mobileInvite as source } from "../en/mobile-invite";

export const mobileInvite = {
  share: {
    venueFallback: "النادي",
  },
  subtitle: {
    when: (day: string, time: string) => `${day} ${time}`,
    separator: "، ",
    sentence: (place: string) => `${place}.`,
    seatsOpen: (n: number) =>
      plural("ar", n, {
        one: "مكان واحد شاغر.",
        two: "مكانان شاغران.",
        few: "{n} أماكن شاغرة.",
        many: "{n} مكانًا شاغرًا.",
        other: "{n} مكان شاغر.",
      }),
  },
  sheet: {
    searchPlaceholder: "الاسم أو رقم الهاتف",
    searchA11y: "البحث عن لاعبين",
    inviteA11y: (name: string) => `دعوة ${name}`,
    cancelInviteA11y: (name: string) => `إلغاء دعوة ${name}`,
    refusedLine: (name: string, message: string) => `${name}: ${message}`,
    phoneLabel: "رقم الهاتف",
    copyLinkA11y: "نسخ الرابط",
    shareLink: "مشاركة الرابط",
    whatsApp: "واتساب",
    messages: "الرسائل",
  },
  link: {
    title: "دعوة",
    incompleteTitle: "تعذّر فتح هذه الدعوة",
    incompleteDescription: "الرابط غير مكتمل. ارجع والصقه مرة أخرى.",
    loadingA11y: "جارٍ تحميل الدعوة",
    loadErrorTitle: "تعذّر تحميل هذه الدعوة",
    loadErrorDescription: "تحقق من اتصالك وحاول مرة أخرى.",
    chooseHowYouPlay: "اختر طريقة لعبك",
    teamsSet: "محدّدة",
    teamsByOrganizer: "يحدّدها المنظّم",
    fromALink: "من رابط",
    hero: {
      countIn: (inCount: number, seats: number | null) =>
        seats == null ? `${inCount} انضموا` : `${inCount} من ${seats} انضموا`,
      priceEach: (price: string) => `${price} لكل لاعب`,
      openSeatA11y: "مكان شاغر",
      rosterA11y: (inCount: number, seats: number | null) =>
        seats == null
          ? plural("ar", inCount, {
              zero: "لا لاعبين بعد",
              one: "لاعب واحد انضم",
              two: "لاعبان انضمّا",
              few: "{n} لاعبين انضموا",
              many: "{n} لاعبًا انضموا",
              other: "{n} لاعب انضموا",
            })
          : `${inCount} من ${seats} أماكن محجوزة`,
      organizerRow: "المنظّم",
      levelFits: (range: string) => `${range}، مستواك مناسب`,
      levelOutside: (range: string) => `${range}، خارج مستواك`,
      memberNote: (group: string) => `${group}. أنت عضو.`,
      joinedNote: (group: string) => `${group}. انضممت اليوم.`,
      levelCard: {
        fits: (range: string, yours: string) =>
          `هذه المباراة لمستوى ${range}. مستواك ${yours}، فأنت مناسب.`,
        outside: (range: string, yours: string) =>
          `هذه المباراة لمستوى ${range}. مستواك ${yours}، فالانضمام يسأل المنظّم.`,
        noLevel: (range: string) =>
          `هذه المباراة لمستوى ${range}. حدّد مستواك لترى إن كنت مناسبًا.`,
        signedOut: (range: string) =>
          `هذه المباراة لمستوى ${range}. سجّل الدخول لترى إن كنت مناسبًا، أو أنشئ حسابًا في دقيقة. المكان ينتظرك.`,
        asksFirst: "الانضمام يسأل عن المجموعة أولًا.",
      },
      notMemberYet: (sharer: string | null) =>
        sharer ? `شاركها ${sharer}. لست عضوًا بعد.` : "لست عضوًا بعد.",
      formatRow: "الصيغة",
      rated: "تُحتسب للتصنيف",
      unrated: "لا تُحتسب للتصنيف",
      courtRow: "الملعب",
      payAtVenue: (court: string | null) =>
        court ? `${court}، الدفع في الملعب` : "الدفع في الملعب",
      linkRow: "الرابط",
      linkUntil: (when: string) => `يعمل حتى ${when} أو حتى تمتلئ المقاعد`,
      linkOpen: "يعمل حتى تمتلئ المقاعد",
      signInToJoin: "سجّل الدخول للانضمام",
      signInSubline: "رقم هاتفك ودقيقة واحدة",
      playingTitle: "أنت في هذه المباراة",
      share: "مشاركة",
      openGameTitle: "فتح المباراة",
    },
    group: {
      sharedBy: (name: string) => `شاركها ${name}.`,
      notInYet: (group: string) => `لست عضوًا في ${group} بعد.`,
      landingNote: (group: string) =>
        `المباريات تعيش داخل المجموعات. يمكنك أخذ هذا المكان، أو الانضمام إلى ${group} فقط واختيار مباراة لاحقًا.`,
      joinGroup: "الانضمام إلى المجموعة",
      joinGame: "الانضمام إلى المباراة",
      seatsOpen: (n: number) =>
        plural("ar", n, {
          one: "مكان واحد شاغر",
          two: "مكانان شاغران",
          few: "{n} أماكن شاغرة",
          many: "{n} مكانًا شاغرًا",
          other: "{n} مكان شاغر",
        }),
      asksFirst: "الانضمام يسأل عن المجموعة أولًا",
      oneTap: "أنت عضو، فالانضمام بضغطة واحدة",
      groupRow: "المجموعة",
      groupMeta: (sport: string | null, members: string) =>
        sport ? `${sport}، ${members}` : members,
      members: (n: number) =>
        plural("ar", n, {
          one: "عضو واحد",
          two: "عضوان",
          few: "{n} أعضاء",
          many: "{n} عضوًا",
          other: "{n} عضو",
        }),
      memberNames: (names: string[], others: number) => {
        const list = names.join("، ");
        if (others <= 0) {
          return list;
        }
        return plural("ar", others, {
          one: `${list} وشخص آخر`,
          two: `${list} وشخصان آخران`,
          few: `${list} و{n} آخرين`,
          many: `${list} و{n} آخرين`,
          other: `${list} و{n} آخرين`,
        });
      },
      sheetTitle: "لست في هذه المجموعة بعد",
      openLead: (group: string) =>
        `${group} تقبل كل من لديه الرابط. اختر إلى أي مدى تريد الانضمام.`,
      approvalLead: (group: string, sharer: string | null) =>
        sharer
          ? `منظّمو ${group} يوافقون على الأعضاء الجدد. ${sharer} شارك المباراة، لذا يمكن حجز المكان ريثما يقرّرون.`
          : `منظّمو ${group} يوافقون على الأعضاء الجدد. يمكن حجز المكان ريثما يقرّرون.`,
      joinBoth: {
        title: "الانضمام إلى المجموعة وأخذ المكان",
        description: (group: string) =>
          `ستكون في هذه المباراة وفي ${group} للمباريات القادمة.`,
      },
      joinGroupOnly: {
        title: "الانضمام إلى المجموعة فقط",
        description:
          "شاهد مبارياتهم وانضم إلى واحدة حين يناسبك. يبقى هذا المكان شاغرًا.",
      },
      requestBoth: {
        title: "طلب الانضمام وحجز المكان",
        description: (hours: number) =>
          `يُحجز المكان ${hours} ساعة. إن وافقوا، ستكون في المباراة والمجموعة.`,
      },
      requestGroupOnly: {
        title: "طلب الانضمام إلى المجموعة فقط",
        description: "لا يُحجز مكان. يمكنك الانضمام إلى مباراة بعد الموافقة.",
      },
      justLooking: "أتصفّح فقط حاليًا",
      approvalNote: (sharer: string | null) =>
        sharer
          ? `يرى المنظّمون اسمك ومستواك وأن ${sharer} شارك الرابط معك. معظمهم يردّ خلال اليوم.`
          : "يرى المنظّمون اسمك ومستواك. معظمهم يردّ خلال اليوم.",
      joinedToast: (group: string) => `انضممت إلى ${group}`,
      joinedTitle: (group: string) => `أنت في ${group}`,
      joinedDescription: (seats: string | null) =>
        seats
          ? `مبارياتهم تظهر الآن في تبويب المباريات. ما زال في هذه ${seats}.`
          : "مبارياتهم تظهر الآن في تبويب المباريات.",
      openGroup: "فتح المجموعة",
      requestedToast: "أُرسل الطلب",
      requestSentTitle: (group: string) => `أُرسل الطلب إلى ${group}`,
      seatHeldUntil: (when: string) =>
        `المكان محجوز حتى ${when}. ستعرف فور أن يردّ أحد المنظّمين.`,
      noSeatHeld: "لا يُحجز مكان. يمكنك الانضمام إلى مباراة بعد الموافقة.",
      sharedByLabel: "شاركها",
      sharedByOrganizer: (name: string) => `${name}، منظّم`,
      withdraw: "سحب الطلب",
      withdrawnToast: "سُحب الطلب",
      waitingTitle: "بانتظار المنظّمين",
      waitingSubline: "تبقى المباراة ظاهرة لك في الأثناء",
    },
  },
  inbox: {
    description: "الدعوات المرسلة إليك. اقبل واحدة للانضمام.",
    loadingA11y: "جارٍ تحميل الدعوات",
    acceptInviteA11y: (title: string) => `قبول الدعوة إلى ${title}`,
    joinWaitlistA11y: (title: string) =>
      `الانضمام إلى قائمة الانتظار في ${title}`,
    declineRequestA11y: (venue: string) => `رفض الطلب من ${venue}`,
    reviewRequestA11y: (venue: string) => `مراجعة الطلب من ${venue}`,
    linkSectionTitle: "هل لديك رابط دعوة؟",
    linkLabel: "رابط الدعوة",
    linkPlaceholder: "الصق الرابط الذي وصلك",
    paste: "لصق",
    openLink: "فتح الرابط",
    pasteEmpty: "انسخ رابط الدعوة أولًا، ثم الصقه.",
    pasteInvalid: "هذا ليس رابط دعوة من Temba. الصق الرابط الكامل الذي وصلك.",
  },
  seatChoice: {
    occupiedA11y: (side: string, seat: string, name: string) =>
      `${side} ${seat}، ${name}`,
    sitLeft: "اجلس يسارًا",
    sitRight: "اجلس يمينًا",
  },
} satisfies typeof source;
