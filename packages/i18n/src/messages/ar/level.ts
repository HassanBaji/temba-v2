import { isolate } from "../../bidi";
import type { level as source } from "../en/level";

export const level = {
  negative: "لا يمكن أن يكون المستوى سالبًا",
  oneDecimal: "استخدم خانة عشرية واحدة",
  invalid: "أدخل مستوى صحيحًا",
  between: "يجب أن يكون المستوى بين 0.0 و7.0",
  rangeFieldDescription:
    "اختياري. فئات مستوى شاملة. «بلا» يعني بلا حد. «بلا» للطرفين يعني بلا نطاق مستوى. على المستخدمين بلا مستوى طلب اللعب عند تحديد نطاق.",
  rangeInverted: "لا يمكن أن يكون الحد الأدنى للمستوى أكبر من الحد الأقصى",
  rangeOutside: "مستواك خارج نطاق هذه المباراة",
  rangeOutsideParty: "مستوى أحد المستخدمين خارج نطاق هذه المباراة",
  rangePartner: "مستوى ذلك المستخدم خارج نطاق هذه المباراة",
  rangeTeam: "مستوى أحد شركاء الفريق خارج نطاق هذه المباراة",
  andUp: (band: string) => `${isolate(band)} فما فوق`,
  andUnder: (band: string) => `${isolate(band)} فما دون`,
  ovr: (value: string) => `OVR ${isolate(value)}`,
  ovrRange: (min: string, max: string) =>
    `OVR ${isolate(min)} إلى ${isolate(max)}`,
  ovrAndUp: (min: string) => `OVR ${isolate(min)} فما فوق`,
  ovrAndUnder: (max: string) => `OVR ${isolate(max)} فما دون`,
  prose: (label: string) => `المستوى ${label}`,
  gateNoLevel: "ليس لديك مستوى بعد. حدّد واحدًا في «أنت»، أو اطلب اللعب.",
  gate: (range: string, band: string) =>
    `هذه المباراة مخصصة لمن هم في ${range}. مستواك ${isolate(band)}.`,
  gateRangeFallback: "نطاق هذه المباراة",
  gateNoOvr: (range: string) =>
    `هذه المباراة مخصصة لمن هم في ${range}. ليس لديك OVR في كرة القدم بعد، لذا أنت خارج النطاق. حدّد مستواك في كرة القدم في «أنت»، أو اطلب اللعب.`,
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
  noReasonGiven: "دون ذكر سبب",
  overrideWhyWithNote: (reason: string, note: string) => `${reason}: «${note}»`,
  errors: {
    pickFootball: "اختر مستوى كرة القدم",
    pickPadel: "اختر مستوى البادل",
    declareAfterRated: "لا يمكنك تحديد مستواك بعد مباراة مصنّفة",
    alreadyDeclared: "حدّدت مستواك من قبل",
    groupOrganizerSets: "لا يحدد مستوى المجموعة إلا أحد منظّميها",
    ownGroupLevel: "لا يمكنك تحديد مستواك في المجموعة",
    groupLevelRetired:
      "لم يعد للمجموعات مستوى خاص بها. منظّمو مجموعة كرة القدم يعدّلون نقاط الفئة بدلًا من ذلك.",
    notGroupMember: "هذا اللاعب ليس عضوًا في هذه المجموعة",
    noSport: "لا رياضة لهذه المجموعة، لذا لا مستويات فيها",
    footballFromResults: "مستويات كرة القدم تأتي من النتائج",
    groupMembersSet: "لا يحدد المستوى إلا أعضاء المجموعة",
    ownLevel: "لا يمكنك تحديد مستواك بنفسك",
    reasonRequired: "اختر سببًا. سيراه اللاعب.",
    levelOrOvr: "حدّد المستوى أو OVR، واحدًا منهما",
    ovrFootballOnly: "OVR هو مستوى كرة القدم. حدّد مستوى البادل من 0.0 إلى 7.0",
    ovrBetween: "يجب أن يكون OVR عددًا صحيحًا من 40 إلى 99",
  },
} satisfies typeof source;
