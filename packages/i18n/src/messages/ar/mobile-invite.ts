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
