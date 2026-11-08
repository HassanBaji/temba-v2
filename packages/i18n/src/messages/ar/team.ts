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
  createDescription:
    "ابدأ فريقًا. تصبح أول عضو ويمكنك دعوة الآخرين لاحقًا.",
  sportLabel: "الرياضة",
  nameLabel: "الاسم (اختياري)",
  nameHint: "إن تركته فارغًا، تستخدم صفحة الفريق أسماء الأعضاء.",
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
    description:
      "لا يفتح صفحة الفريق إلا أعضاؤه أو مدعو بانتظار الرد.",
  },
  lookupNote: "اختر شخصًا واحدًا. الدعوات لا تنتهي.",
  squadLookupNote: "اختر من تريد دعوتهم. الدعوات لا تنتهي.",
  squadInviteDescription: "ادعُ لاعبين إلى التشكيلة، أو انسخ رابطًا لمشاركته.",
  squadInviteLabel: "دعوة لاعبين",
  inviteDescription: "ادعُ شريكًا للمكان الشاغر، أو انسخ رابطًا لمشاركته.",
  invitePartnerLabel: "ادعُ شريكك",
  leaveLabel: "مغادرة الفريق",
  dissolveLabel: "حل الفريق",
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
  leaveConfirm: {
    title: (name: string) => `مغادرة ${name}؟`,
    description: "لا يمكنك العودة إلا إذا دُعيت مجددًا.",
  },
  roster: {
    title: "قائمة الفريق",
    count: (count: number, max: number) => `${count} من ${max}`,
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
    opponentFallback: "المنافس",
  },
  games: {
    title: "المباريات",
    empty: "لا مباريات ملعوبة بعد.",
  },
} satisfies typeof source;
