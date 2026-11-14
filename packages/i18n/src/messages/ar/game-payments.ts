import { isolate } from "../../bidi";
import type { gamePayments as source } from "../en/game-payments";
import { plural } from "../../plural";

export const gamePayments = {
  create: {
    trackTitle: "تتبّع الدفع",
    trackDescription: "اعرف من دفع حصته",
    keepersTitle: "حرّاس المرمى لا يدفعون",
    keepersDescription: "من يأخذ مركز الحارس يلعب مجانًا",
    whoPays: "من يدفع",
    toCollect: "المبلغ المستحق عند اكتمال العدد",
    notTracked: "فعّل تتبّع الدفع لتعرف من دفع.",
    summary: (payers: number, price: string) =>
      plural("ar", payers, {
        zero: `لا لاعبين بسعر ${isolate(price)}.`,
        one: `لاعب واحد بسعر ${isolate(price)}.`,
        two: `لاعبان بسعر ${isolate(price)}.`,
        few: `{n} لاعبين بسعر ${isolate(price)}.`,
        many: `{n} لاعبًا بسعر ${isolate(price)}.`,
        other: `{n} لاعب بسعر ${isolate(price)}.`,
      }),
    summaryKeepersFree: (payers: number, price: string) =>
      plural("ar", payers, {
        zero: `لا لاعبين بسعر ${isolate(price)}. يلعب الحرّاس مجانًا.`,
        one: `لاعب واحد بسعر ${isolate(price)}. يلعب الحرّاس مجانًا.`,
        two: `لاعبان بسعر ${isolate(price)}. يلعب الحرّاس مجانًا.`,
        few: `{n} لاعبين بسعر ${isolate(price)}. يلعب الحرّاس مجانًا.`,
        many: `{n} لاعبًا بسعر ${isolate(price)}. يلعب الحرّاس مجانًا.`,
        other: `{n} لاعب بسعر ${isolate(price)}. يلعب الحرّاس مجانًا.`,
      }),
    summaryKeepersPay: (payers: number, price: string) =>
      plural("ar", payers, {
        zero: `لا لاعبين بسعر ${isolate(price)}، بمن فيهم الحرّاس.`,
        one: `لاعب واحد بسعر ${isolate(price)}، بمن فيهم الحرّاس.`,
        two: `لاعبان بسعر ${isolate(price)}، بمن فيهم الحرّاس.`,
        few: `{n} لاعبين بسعر ${isolate(price)}، بمن فيهم الحرّاس.`,
        many: `{n} لاعبًا بسعر ${isolate(price)}، بمن فيهم الحرّاس.`,
        other: `{n} لاعب بسعر ${isolate(price)}، بمن فيهم الحرّاس.`,
      }),
    reviewLabel: "الدفع",
    reviewTracked: "مُتتبَّع",
    reviewTrackedKeepersFree: "مُتتبَّع، والحرّاس مجانًا",
    reviewNotTracked: "غير مُتتبَّع",
  },
  mark: {
    paid: "دفع",
    claimed: "يقول إنه دفع",
    due: "لم يدفع بعد",
    free: "لا يدفع",
  },
  member: {
    title: "الدفع",
    each: (price: string) => `${isolate(price)} للفرد`,
    dueTitle: "لم تدفع بعد",
    dueHint: "ادفع للمنظّم مباشرة",
    claimAction: "دفعت",
    noMoneyNote: "لا يجمع تمبا المال. هذا فقط لتتبّع من دفع.",
    claimedTitle: "قلت إنك دفعت",
    claimedHint: (when: string) => `${isolate(when)}. بانتظار تأكيد المنظّم`,
    undoPrompt: "غيّرت رأيك؟",
    undoAction: "تراجع، لم أدفع",
    paidTitle: "مدفوع",
    paidHint: (when: string) => `أكّده المنظّم، ${isolate(when)}`,
    returnedTitle: "لم يُستلم بعد",
    returnedHint: "لم يستلم المنظّم دفعتك",
    returnedNote: (note: string, when: string) =>
      `«${isolate(note)}» من المنظّم، ${isolate(when)}`,
    freeTitle: "لا شيء لتدفعه",
    freeHint: "أنت في المرمى. يلعب الحرّاس مجانًا في هذه المباراة",
    freeNote: (price: string) =>
      `إن انتقلت إلى مركز في الملعب قبل البداية، تصبح حصتك ${isolate(price)}، ومن يأخذ القفازين لا يدين بشيء.`,
  },
  claimSheet: {
    title: "دفعت",
    description: "أخبر المنظّم أنك دفعت حصتك. يؤكّد ذلك حين يستلم المال.",
    amount: "المبلغ",
    to: "إلى",
    organizer: "المنظّم",
    note: "يؤكّد المنظّم حين يستلم المال. يمكنك التراجع حتى ذلك الحين.",
    submit: "أخبر المنظّم أنني دفعت",
  },
  organizer: {
    title: "الدفع",
    entryHint: (paid: number, payers: number) =>
      `دفع ${isolate(String(paid))} من ${isolate(String(payers))}`,
    collectedOf: (currency: string, total: string) =>
      `${currency} مستلمة، من ${isolate(total)}`,
    confirmed: (n: number) => `${isolate(String(n))} مؤكَّد`,
    claimed: (n: number) =>
      plural("ar", n, {
        zero: "لا أحد يقول إنه دفع",
        one: "واحد يقول إنه دفع",
        two: "اثنان يقولان إنهما دفعا",
        few: "{n} يقولون إنهم دفعوا",
        many: "{n} يقولون إنهم دفعوا",
        other: "{n} يقولون إنهم دفعوا",
      }),
    due: (n: number) => `${isolate(String(n))} لم يدفعوا بعد`,
    free: (n: number) =>
      plural("ar", n, {
        zero: "لا حرّاس مجانًا",
        one: "حارس واحد، مجانًا",
        two: "حارسان، مجانًا",
        few: "{n} حرّاس، مجانًا",
        many: "{n} حارسًا، مجانًا",
        other: "{n} حارس، مجانًا",
      }),
    confirmAll: (n: number) => `أكّد الكل (${isolate(String(n))})`,
    nothingToConfirm: "لا شيء لتأكيده",
    remind: (n: number) => `ذكّر ${isolate(String(n))}`,
    everyonePaid: "دفع الجميع",
    players: "اللاعبون",
    you: "أنت",
    rowPaid: "مدفوع",
    rowClaimed: (when: string) => `يقول إنه دفع، ${isolate(when)}`,
    rowDue: "لم يدفع بعد",
    rowReturned: "لم يُستلم",
    rowFree: "حارس، يلعب مجانًا",
    confirm: "أكّد",
    markPaid: "سجّل الدفع",
    undo: "تراجع",
    notReceived: "لم يُستلم",
    footnote:
      "التأكيد يحوّل الادعاء إلى دفع. علامة الإلغاء تعيده إلى اللاعب كغير مستلم. «سجّل الدفع» للمال الذي استلمته. يرى أي مشرف في المجموعة هذا ويستطيع فعله.",
    loadFailed: "تعذّر تحميل الدفعات",
    toast: {
      confirmed: "تأكّد الدفع",
      markedPaid: "سُجّل الدفع",
      undone: "عاد إلى غير مدفوع",
      sentBack: "أُعيد إلى اللاعب",
      reminded: (n: number) =>
        plural("ar", n, {
          zero: "لم يُذكَّر أحد",
          one: "ذُكّر لاعب واحد",
          two: "ذُكّر لاعبان",
          few: "ذُكّر {n} لاعبين",
          many: "ذُكّر {n} لاعبًا",
          other: "ذُكّر {n} لاعب",
        }),
      confirmedAll: (n: number) =>
        plural("ar", n, {
          zero: "لم تُؤكَّد أي دفعة",
          one: "تأكّدت دفعة واحدة",
          two: "تأكّدت دفعتان",
          few: "تأكّدت {n} دفعات",
          many: "تأكّدت {n} دفعة",
          other: "تأكّدت {n} دفعة",
        }),
    },
  },
  notReceivedSheet: {
    title: "لم يُستلم؟",
    claimedAgo: (name: string, when: string) =>
      `قال ${isolate(name)} إنه دفع، ${isolate(when)}.`,
    why: "أخبره بالسبب (اختياري)",
    reasons: {
      nothing_arrived: "لم يصل شيء",
      wrong_amount: "المبلغ غير صحيح",
      sent_elsewhere: "أُرسل إلى شخص آخر",
    },
    noteLabel: "أضف ملاحظة",
    cancel: "إلغاء",
    submit: "سجّل أنه لم يُستلم",
  },
  memberToast: {
    claimed: "أُرسل إلى المنظّم",
    undone: "تم التراجع",
  },
  lineup: {
    more: (n: number) => `${isolate(String(n))} آخرون`,
    manage: "أكّد الدفعات وسجّلها",
    paidCount: (paid: number, payers: number) =>
      `دفع ${isolate(String(paid))} من ${isolate(String(payers))}`,
    youPaid: "أنت مشارك، ودفعت",
    confirmedByOrganizer: "أكّده المنظّم",
  },
  errors: {
    notTracked: "هذه المباراة لا تتتبّع الدفع",
    needsPrice: "حدّد سعرًا لتتبّع الدفع",
    keepersFootballOnly: "مباراة كرة القدم وحدها تتيح للحرّاس اللعب مجانًا",
    notPlayer: "يدفع لاعبو هذه المباراة فقط",
    nothingToPay: "لا شيء لتدفعه في هذه المباراة",
    alreadyPaid: "تأكّد الدفع مسبقًا",
    notClaimed: "لم يقل هذا اللاعب إنه دفع",
    notPaid: "هذه الدفعة غير مؤكَّدة",
  },
} satisfies typeof source;
