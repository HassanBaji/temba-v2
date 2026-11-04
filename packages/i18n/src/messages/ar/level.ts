import type { level as source } from "../en/level";

export const level = {
  negative: "لا يمكن أن يكون المستوى سالبًا",
  oneDecimal: "استخدم خانة عشرية واحدة",
  invalid: "أدخل مستوى صحيحًا",
  between: "يجب أن يكون المستوى بين 0.0 و7.0",
  rangeFieldDescription:
    "اختياري. فئات مستوى شاملة. «بلا» يعني بلا حد. «بلا» للطرفين يعني بلا نطاق مستوى. على المستخدمين بلا مستوى طلب اللعب عند تحديد نطاق.",
  rangeInverted: "لا يمكن أن يكون الحد الأدنى للمستوى أكبر من الحد الأقصى",
  rangeOutside: "مستواك خارج نطاق هذه اللعبة",
  rangeOutsideParty: "مستوى أحد المستخدمين خارج نطاق هذه اللعبة",
  rangePartner: "مستوى ذلك المستخدم خارج نطاق هذه اللعبة",
  rangeTeam: "مستوى أحد شركاء الفريق خارج نطاق هذه اللعبة",
  andUp: (band: string) => `${band} فما فوق`,
  andUnder: (band: string) => `${band} فما دون`,
  prose: (label: string) => `المستوى ${label}`,
  gateNoLevel: "ليس لديك مستوى بعد. حدّد واحدًا في «أنت»، أو اطلب اللعب.",
  gate: (range: string, band: string) =>
    `هذه اللعبة مخصصة لمن هم في ${range}. مستواك ${band}.`,
  gateRangeFallback: "نطاق هذه اللعبة",
  request: {
    title: "طلب اللعب",
    sent: "أُرسل الطلب",
    again: "اطلب مجددًا",
    pending: "قيد الانتظار",
    rejected: "مرفوض",
    noLevel: "بلا مستوى",
    provisional: "مبدئي",
  },
  overrideReason: {
    newToGroup: "جديد في المجموعة",
    playsAboveResults: "يلعب فوق نتائجه",
    playsBelowResults: "يلعب دون نتائجه",
    backFromInjury: "عائد من إصابة",
    correctingAMistake: "تصحيح خطأ",
  },
  overrideCaption: (who: string, when: string) => `حدّده ${who}، ${when}`,
  overrideByYou: "أنت",
} satisfies typeof source;
