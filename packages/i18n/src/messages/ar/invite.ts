import { plural } from "../../plural";
import type { invite as source } from "../en/invite";

export const invite = {
  kind: {
    community: "المجتمع",
    group: "المجموعة",
    team: "الفريق",
    game: "اللعبة",
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
      game: "يعمل حتى تنتهي اللعبة أو يُغلق التسجيل.",
      other: "يعمل كل رابط لمدة 6 ساعات.",
    },
    linkEmptyNote: "يُنشأ رابط جديد عند مشاركته.",
    linkNote: {
      game: "يمكن لأي شخص لديه الرابط أخذ مقعد. مناسب لمجموعات واتساب.",
      group:
        "يمكن لأي شخص لديه الرابط الانضمام إلى المجموعة. مناسب لمجموعات واتساب.",
      community:
        "يمكن لأي شخص لديه الرابط الانضمام إلى المجتمع. مناسب لمجموعات واتساب.",
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
        community: "هذا المجتمع لا يقبل أعضاء جددًا حاليًا.",
        group: "هذه المجموعة لا تقبل أعضاء جددًا حاليًا.",
        team: "هذا الفريق لا يقبل أعضاء جددًا حاليًا.",
        game: "هذه اللعبة لا تقبل لاعبين جددًا حاليًا.",
      },
    },
    waitingForPartner: {
      title: "بانتظار شريكك",
      description:
        "يُسجَّل فريقك حين يقبل الشريكان. حتى ذلك الحين لا تحجز مقعدًا ولا مكانًا في قائمة الانتظار.",
    },
  },
  inbox: {
    rowMeta: {
      community: (inviter: string) => `دعوة إلى مجتمع من ${inviter}`,
      group: (inviter: string) => `دعوة إلى مجموعة من ${inviter}`,
      team: (inviter: string) => `دعوة إلى فريق من ${inviter}`,
      game: (inviter: string) => `دعوة إلى لعبة من ${inviter}`,
    },
    empty: {
      title: "لا شيء بانتظارك",
      description: "تظهر هنا دعوات الألعاب والمجموعات والفرق والمجتمعات.",
    },
    errorTitle: "تعذّر تحميل الدعوات",
    acceptLabel: "قبول",
    sitHereLabel: "اجلس هنا",
    joinWaitlistLabel: "انضم إلى قائمة الانتظار",
    linkCopiedToast: "تم نسخ رابط الدعوة",
    linkCopyFailedToast: "تعذّر نسخ الرابط",
    lookupRevokedToast: "أُلغيت الدعوة المباشرة",
    groupLookupNote: {
      loose: "يمكنك أنت ومنظّمو المجموعة دعوة الأشخاص هنا. الدعوات لا تنتهي.",
      club: "يمكن للمالكين والمشرفين دعوة أي شخص، فينضم إلى المجتمع أيضًا. ويمكن لمنشئ المجموعة والمنظّمين دعوة أعضاء المجتمع.",
    },
    seatCopy: {
      frozen:
        "تُظهر المقاعد المشغولة من سجّل بالفعل. هذه اللعبة غير مفتوحة للتسجيل.",
      signedOut:
        "تُظهر المقاعد المشغولة من سجّل بالفعل. سجّل الدخول أو أنشئ حسابًا لاختيار مركز شاغر.",
      waitlistLink:
        "لا مركز شاغرًا. تُظهر المقاعد المشغولة من سجّل بالفعل. اقبل للانضمام إلى قائمة الانتظار.",
      waitlistInbox: "لا مركز شاغرًا. تُظهر المقاعد المشغولة من سجّل بالفعل.",
      pick: "تُظهر المقاعد المشغولة من سجّل بالفعل. اختر مركزًا شاغرًا للجلوس.",
    },
    joinedToast: {
      community: "انضممت إلى المجتمع",
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
    alreadyOnGameToast: "أنت في هذه اللعبة بالفعل",
    joinedGameAndGroupToast: "انضممت إلى اللعبة ومجموعتها",
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
} satisfies typeof source;
