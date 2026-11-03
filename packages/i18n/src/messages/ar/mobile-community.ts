import { plural } from "../../plural";
import type { mobileCommunity as source } from "../en/mobile-community";

export const mobileCommunity = {
  list: {
    limitedTitle: "قائمة المجتمعات محدودة",
    limitedDescription: "يُعدّ طاقم Temba هذه القائمة.",
    loadingA11y: "جارٍ تحميل المجتمعات",
  },
  create: {
    nameLabel: "الاسم",
    typeLabel: "النوع",
  },
  members: {
    roleFor: (name: string) => `دور ${name}`,
    search: "البحث في الأعضاء",
  },
  requests: {
    rowA11y: (title: string, meta: string) => `${title}. ${meta}`,
    approve: "موافقة",
    reject: "رفض",
    approveA11y: (title: string) => `الموافقة على ${title}`,
    rejectA11y: (title: string) => `رفض ${title}`,
  },
  sports: {
    removeA11y: (sport: string) => `إزالة ${sport}`,
    add: (sport: string) => `إضافة ${sport}`,
  },
  venue: {
    heading: "النادي",
    softArchived: "النادي مؤرشف",
  },
  share: {
    venueFallback: "النادي",
  },
  inviteSubtitle: {
    when: (day: string, time: string) => `${day} ${time}`,
    separator: "، ",
    sentence: (place: string) => `${place}.`,
    seatsOpen: (n: number) =>
      plural("ar", n, {
        one: "مقعد واحد متاح.",
        two: "مقعدان متاحان.",
        few: "{n} مقاعد متاحة.",
        many: "{n} مقعدًا متاحًا.",
        other: "{n} مقعد متاح.",
      }),
  },
  inviteSheet: {
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
  inviteLink: {
    title: "دعوة",
    incompleteTitle: "تعذّر فتح هذه الدعوة",
    incompleteDescription: "الرابط غير مكتمل. ارجع والصقه مرة أخرى.",
    loadingA11y: "جارٍ تحميل الدعوة",
    loadErrorTitle: "تعذّر تحميل هذه الدعوة",
    loadErrorDescription: "تحقق من اتصالك وحاول مرة أخرى.",
    chooseHowYouPlay: "اختر طريقة لعبك",
    teamsSet: "محدّدة",
    teamsByOrganizer: "يحدّدها المنظّم",
  },
  invites: {
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
  team: {
    statA11y: (label: string, value: string) => `${label} ${value}`,
    linkedTo: (community: string) => `مرتبط بـ ${community}`,
    actionsTitle: "إجراءات الفريق",
    noCommunityToLink: "لا يوجد مجتمع للربط",
  },
  teams: {
    invitedBy: (name: string) => `بدعوة من ${name}`,
    pendingInvitesTitle: "دعوات للانضمام إلى فريق",
    loadingA11y: "جارٍ تحميل الفرق",
  },
} satisfies typeof source;
