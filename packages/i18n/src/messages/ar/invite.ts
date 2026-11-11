import { plural } from "../../plural";
import type { invite as source } from "../en/invite";

export const invite = {
  rateLimited: "محاولات كثيرة جدًا. انتظر بضع دقائق ثم حاول مجددًا.",
  kind: {
    group: "المجموعة",
    team: "الفريق",
    game: "المباراة",
  },
  door: {
    mode: {
      players: "اللاعبون",
      phone: "الهاتف",
      link: "الرابط",
    },
    invitePlayers: "دعوة لاعبين",
    resultsHeading: "النتائج",
    suggestedHeading: "مقترحون",
    searchHint: "اكتب اسمًا، أو البريد الإلكتروني أو رقم الهاتف كاملًا.",
    noMatch: (query: string) => `لا أحد على Temba يطابق «${query}».`,
    noMatchTryOtherWays: (query: string) =>
      `لا أحد على Temba يطابق «${query}».\nجرّب رقم هاتفه أو أرسل له الرابط.`,
    inviteButton: "دعوة",
    invitedButton: "تمت الدعوة",
    invitedA11y: "مدعو",
    phone: {
      sending: "جارٍ الإرسال…",
      send: "إرسال الدعوة برسالة نصية",
      enterNumber: "أدخل رقمًا",
      note: "يتلقى رسالة نصية بدعوتك.",
      noteWithLookup:
        "يتلقى رسالة نصية بدعوتك. وإن كان على Temba تصله في تطبيقه أيضًا.",
    },
    linkLifetime: {
      game: "يعمل حتى تنتهي المباراة أو يُغلق التسجيل.",
      other: "يعمل كل رابط لمدة 6 ساعات.",
    },
    linkEmptyNote: "يُنشأ رابط جديد عند مشاركته.",
    linkNote: {
      game: "يمكن لأي شخص لديه الرابط أخذ مكان. مناسب لمجموعات واتساب.",
      group:
        "يمكن لأي شخص لديه الرابط الانضمام إلى المجموعة. مناسب لمجموعات واتساب.",
      team: "أرسله إلى الشريك الذي تريده في فريقك.",
    },
    pendingHeading: (n: number) => `معلّقة، ${n}`,
    pendingNote: "بانتظار الرد",
    noPending: "لم تُرسل دعوات بعد.",
  },
  outcome: {
    invalid: {
      title: "الرابط منتهٍ أو غير صالح",
      description: "اطلب من الشخص الذي شاركه رابط دعوة جديدًا.",
    },
    unavailable: {
      playersTitle: "لا يقبل لاعبين جددًا",
      membersTitle: "لا يقبل أعضاء جددًا",
      description: {
        group: "هذه المجموعة لا تقبل أعضاء جددًا حاليًا.",
        team: "هذا الفريق لا يقبل أعضاء جددًا حاليًا.",
        game: "هذه المباراة لا تقبل لاعبين جددًا حاليًا.",
      },
    },
    waitingForPartner: {
      title: "بانتظار شريكك",
      description:
        "يُسجَّل فريقك حين يقبل الشريكان. حتى ذلك الحين لا تحجز مكانًا ولا مكانًا في قائمة الانتظار.",
    },
  },
  inbox: {
    rowMeta: {
      group: (inviter: string) => `دعوة إلى مجموعة من ${inviter}`,
      team: (inviter: string) => `دعوة إلى فريق من ${inviter}`,
      game: (inviter: string) => `دعوة إلى مباراة من ${inviter}`,
    },
    empty: {
      title: "لا شيء بانتظارك",
      description: "تظهر هنا دعوات المباريات والمجموعات والفرق.",
    },
    errorTitle: "تعذّر تحميل الدعوات",
    acceptLabel: "قبول",
    sitHereLabel: "اجلس هنا",
    joinWaitlistLabel: "انضم إلى قائمة الانتظار",
    linkCopiedToast: "تم نسخ رابط الدعوة",
    linkCopyFailedToast: "تعذّر نسخ الرابط",
    lookupRevokedToast: "أُلغيت الدعوة المباشرة",
    groupLookupNote:
      "يمكنك أنت ومنظّمو المجموعة دعوة الأشخاص هنا. الدعوات لا تنتهي.",
    seatCopy: {
      frozen:
        "تُظهر الأماكن المشغولة من سجّل بالفعل. هذه المباراة غير مفتوحة للتسجيل.",
      signedOut:
        "تُظهر الأماكن المشغولة من سجّل بالفعل. سجّل الدخول أو أنشئ حسابًا لاختيار مركز شاغر.",
      waitlistLink:
        "لا مركز شاغرًا. تُظهر الأماكن المشغولة من سجّل بالفعل. اقبل للانضمام إلى قائمة الانتظار.",
      waitlistInbox: "لا مركز شاغرًا. تُظهر الأماكن المشغولة من سجّل بالفعل.",
      pick: "تُظهر الأماكن المشغولة من سجّل بالفعل. اختر مركزًا شاغرًا للجلوس.",
    },
    joinedToast: {
      group: "انضممت إلى المجموعة",
      team: "انضممت إلى الفريق",
    },
    lookupSent: (n: number) =>
      plural("ar", n, {
        one: "أُرسلت دعوة مباشرة",
        two: "أُرسلت دعوتان مباشرتان",
        few: "أُرسلت {n} دعوات مباشرة",
        many: "أُرسلت {n} دعوة مباشرة",
        other: "أُرسلت {n} دعوة مباشرة",
      }),
  },
  link: {
    joinLabel: (name: string) => `انضم إلى ${name}`,
    requestJoinLabel: (name: string) => `اطلب الانضمام إلى ${name}`,
    waitingForPartnerToast: "بانتظار قبول شريكك في الفريق",
    alreadyOnGameToast: "أنت في هذه المباراة بالفعل",
    joinedGameAndGroupToast: "انضممت إلى المباراة ومجموعتها",
    joinedWaitlistAndGroupToast: "انضممت إلى قائمة الانتظار والمجموعة",
    levelRangePendingNote: "الطلب معلّق. لم يقرر المنظّمون بعد.",
    requesting: "جارٍ الطلب…",
    requestAgain: "اطلب مجددًا",
    requestToPlay: "اطلب اللعب",
  },
  groupShare: {
    fallbackName: "المجموعة",
    invitationLine: (name: string) => `أنت مدعو للانضمام إلى «${name}»`,
    invitationLineSport: (name: string, sport: string) =>
      `أنت مدعو للانضمام إلى «${name}» للعب «${sport}»`,
    joinLine: (url: string) => `انضم: ${url}`,
  },
  errors: {
    linkInvalid: "رابط الدعوة غير صالح أو منتهي الصلاحية",
    linkUnavailable: "رابط الدعوة غير متاح",
    lookupUnavailable: "الدعوة المباشرة غير متاحة",
    lookupNotFound: "الدعوة المباشرة غير موجودة",
    differentUser: "هذه الدعوة لمستخدم آخر",
    lookupAcceptedNoRevoke: "لا يمكن إلغاء دعوة مباشرة مقبولة",
    teamOnlyNoLookup: "مباريات الفرق لا تستخدم الدعوات المباشرة",
    lookupSelf: "لا يمكنك دعوة نفسك",
    lookupExists: "توجد بالفعل دعوة مباشرة غير مستخدمة لهذا المستخدم",
    unknownUser: "مستخدم غير معروف",
    frozenMint: {
      group: "لا تقبل هذه المجموعة دعوات حاليًا",
      team: "لا يقبل هذا الفريق دعوات حاليًا",
    },
    frozenAccept: {
      group: "لا تقبل هذه المجموعة أعضاء جددًا حاليًا",
      team: "لا يقبل هذا الفريق أعضاء جددًا حاليًا",
    },
  },
} satisfies typeof source;
