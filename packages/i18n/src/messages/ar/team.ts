import { plural } from "../../plural";
import type { team as source } from "../en/team";

export const team = {
  title: "الفرق",
  description: "الشراكات التي تلعب بها",
  errorTitle: "تعذّر تحميل الفرق",
  empty: {
    title: "لا فرق بعد",
    description: "الفريق شراكة دائمة مع لاعب آخر.",
  },
  createLabel: "إنشاء فريق",
  createDescription:
    "ابدأ فريقًا مستقلًا. تصبح أول عضو ويمكنك دعوة الآخرين لاحقًا.",
  sportLabel: "الرياضة",
  nameLabel: "الاسم (اختياري)",
  nameHint: "إن تركته فارغًا، تستخدم صفحة الفريق أسماء الأعضاء.",
  toast: {
    created: "تم إنشاء الفريق",
    joined: "انضممت إلى الفريق",
    left: "غادرت الفريق",
    dissolved: "تم حل الفريق",
    unlinked: "تم فك ارتباط الفريق",
    linkRequested: "أُرسل طلب الربط",
  },
  teamErrorTitle: "تعذّر تحميل الفريق",
  notFound: {
    title: "الفريق غير موجود",
    description: "ربما حُلّ، أو ليس لديك صلاحية الوصول إليه.",
  },
  forbidden: {
    title: "لا يمكنك فتح هذا الفريق",
    description:
      "لا يفتح صفحة الفريق إلا أعضاؤه، أو أعضاء مجتمع مرتبط، أو مدعو بانتظار الرد.",
  },
  lookupNote: "اختر شخصًا واحدًا. الدعوات لا تنتهي.",
  squadLookupNote: "اختر من تريد دعوتهم. الدعوات لا تنتهي.",
  squadInviteDescription: "ادعُ لاعبين إلى التشكيلة، أو انسخ رابطًا لمشاركته.",
  squadInviteLabel: "دعوة لاعبين",
  inviteDescription: "ادعُ شريكًا للمقعد الشاغر، أو انسخ رابطًا لمشاركته.",
  invitePartnerLabel: "ادعُ شريكك",
  requestLinkLabel: "طلب الربط بمجتمع",
  requestLinkSubmitLabel: "طلب الربط",
  requestLinkDescription:
    "يمكن للفرق المكتملة طلب الربط بمجتمع. يوافق المالك أو المشرف، ويُقبل الأعضاء الناقصون تلقائيًا.",
  leaveLabel: "مغادرة الفريق",
  unlinkLabel: "فك الارتباط بالمجتمع",
  dissolveLabel: "حل الفريق",
  waitingCopy: "بانتظار شريك. هذا الفريق غير مكتمل حتى ينضم عضو ثانٍ.",
  noMembers: {
    title: "لا أعضاء",
    description: "يظهر هنا أعضاء هذا الفريق.",
  },
  looseLabel: "غير مرتبط بمجتمع",
  clubLabel: "فريق نادوي",
  incompleteLabel: "غير مكتمل",
  memberFallback: "عضو",
  fallbackName: "الفريق",
  rowMeta: (community: string) => `فريق نادوي · ${community}`,
  pendingLink: (community: string) => `طلب معلّق إلى ${community}.`,
  dissolveConfirm: {
    title: (name: string) => `حل ${name}؟`,
    description: "لا يمكن التراجع عن هذا.",
  },
  leaveConfirm: {
    title: (name: string) => `مغادرة ${name}؟`,
    description: "لا يمكنك العودة إلا إذا دُعيت مجددًا.",
  },
  unlinkConfirm: {
    title: (name: string) => `فك ارتباط ${name}؟`,
    description: "لن يبقى هذا الفريق مرتبطًا بمجتمعه.",
  },
  roster: {
    count: (count: number, max: number) => `${count} من ${max}`,
    full: "ممتلئ",
    complete: "مكتمل",
    needsForLink: (n: number) =>
      plural("ar", n, {
        one: "يحتاج الفريق إلى عضو واحد لطلب الربط بمجتمع.",
        two: "يحتاج الفريق إلى عضوين لطلب الربط بمجتمع.",
        few: "يحتاج الفريق إلى {n} أعضاء لطلب الربط بمجتمع.",
        many: "يحتاج الفريق إلى {n} عضوًا لطلب الربط بمجتمع.",
        other: "يحتاج الفريق إلى {n} عضو لطلب الربط بمجتمع.",
      }),
    moreToGo: (n: number) =>
      plural("ar", n, {
        one: "بقي عضو واحد.",
        two: "بقي عضوان.",
        few: "بقي {n} أعضاء.",
        many: "بقي {n} عضوًا.",
        other: "بقي {n} عضو.",
      }),
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
    gamesPlayed: "الألعاب الملعوبة",
    winRate: "نسبة الفوز",
  },
  creatorLabel: "المنشئ",
  noLinkableCommunity: "لست في مجتمع يمكنه ربط هذا الفريق.",
} satisfies typeof source;
