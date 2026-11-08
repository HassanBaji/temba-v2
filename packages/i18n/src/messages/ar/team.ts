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
  createDescription: "ابدأ فريقًا. تصبح أول عضو ويمكنك دعوة الآخرين لاحقًا.",
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
  sportChoice: {
    padel: { name: "بادل", detail: "لاعبان" },
    football: {
      name: "كرة القدم",
      detail: (max: number) => `قائمة حتى ${max}`,
    },
  },
  rosterHelper: (max: number) =>
    `5 لمباراة 5 ضد 5، و7 لمباراة 7 ضد 7، و${max} كحد أقصى`,
  draft: {
    countLine: (count: number, max: number) => `${count} من ${max}، معك أنت`,
    invited: "مدعو، بانتظار القبول",
    added: "مضاف، ليس على Temba",
    remove: (name: string) => `إزالة ${isolate(name)}`,
    footer:
      "ستة لاعبين تكفي لنشر تحدٍّ 6 ضد 6؛ وتُختار تشكيلة المباراة لكل مباراة بعد تأكيدها.",
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
    listedCount: (n: number) =>
      plural("ar", n, {
        one: "لاعب واحد في القائمة",
        two: "لاعبان في القائمة",
        few: "{n} لاعبين في القائمة",
        many: "{n} لاعبًا في القائمة",
        other: "{n} لاعب في القائمة",
      }),
    removeConfirm: {
      title: (name: string) => `إزالة ${isolate(name)}؟`,
      description:
        "ليس على Temba بعد، لذا يُزال من القائمة. تبقى مبارياته في السجل.",
      confirm: "إزالة",
    },
  },
  groupTag: {
    line: (group: string) => `فريق ${isolate(group)}`,
    tagAs: (group: string) => `وسم كفريق ${isolate(group)}`,
    remove: "إزالة الوسم",
    tagged: (group: string) => `أصبح فريق ${isolate(group)}`,
    removed: "أزيل الوسم",
    createNote: (group: string) => `سيُوسم هذا الفريق كفريق ${isolate(group)}.`,
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
    opponentFallback: "المنافس",
  },
  games: {
    title: "المباريات",
    empty: "لا مباريات ملعوبة بعد.",
  },
} satisfies typeof source;
