import { isolate } from "../../bidi";
import { plural } from "../../plural";
import type { series as source } from "../en/series";
import { tournamentRounds } from "./tournament-rounds";

const placeWord = tournamentRounds.shareCard.ordinal;

export const series = {
  noun: {
    series: "سلسلة",
    edition: "نسخة",
    badge: "شارة",
  },
  emblems: {
    cup: "كأس",
    crown: "تاج",
    star: "نجمة",
    bolt: "صاعقة",
    flame: "شعلة",
    moon: "قمر",
    ball: "كرة",
  },
  colours: {
    gold: "ذهبي",
    red: "أحمر",
    blue: "أزرق",
    green: "أخضر",
    purple: "بنفسجي",
    teal: "فيروزي",
  },
  gallery: {
    title: "شارات السلاسل",
  },
  tab: {
    title: "السلاسل",
    running: (n: number) =>
      plural("ar", n, {
        zero: "لا سلاسل جارية",
        one: "سلسلة جارية",
        two: "سلسلتان جاريتان",
        few: "{n} سلاسل جارية",
        many: "{n} سلسلة جارية",
        other: "{n} سلسلة جارية",
      }),
    ended: "المنتهية",
    note: "السلسلة سوشيال أو مباراة تلعبها هذه المجموعة مرة بعد مرة. من يفوز بها ينال شارتها على ملفه الشخصي.",
    empty: "لا سلاسل بعد.",
    newSeries: "سلسلة جديدة",
    next: "التالية",
    badgesStay: "الشارات تبقى",
    loadError: "تعذّر تحميل السلاسل",
    rowKind: {
      padel: {
        social: "سوشيال بادل",
        game: "مباراة بادل",
        none: "سلسلة بادل",
      },
      football: {
        social: "سوشيال كرة قدم",
        game: "مباراة كرة قدم",
        none: "سلسلة كرة قدم",
      },
    },
    played: (n: number) =>
      plural("ar", n, {
        zero: "لم تُلعب أي نسخة",
        one: "لُعبت نسخة واحدة",
        two: "لُعبت نسختان",
        few: "لُعبت {n} نسخ",
        many: "لُعبت {n} نسخة",
        other: "لُعبت {n} نسخة",
      }),
    notPlayedYet: "لم تُلعب بعد",
    rowLine: (kind: string, played: string) => `${kind}. ${played}`,
    rowLineNext: (kind: string, played: string, edition: number) =>
      `${kind}. ${played}، والتالية النسخة ${edition}`,
    rowLineEnded: (kind: string, played: string, month: string) =>
      `${kind}. ${played}، وانتهت في ${month}`,
  },
  create: {
    title: "سلسلة جديدة",
    preview: "معاينة",
    namePlaceholder: "اسم السلسلة",
    previewNote: "هكذا تظهر على ملف الفائز",
    nameLabel: "الاسم",
    nameHint: "ما سيراه اللاعبون على المباراة وعلى ملفاتهم الشخصية.",
    emblem: "الرمز",
    colour: "اللون",
    rules: {
      social: { label: "في السوشيال", value: "يفوز بها الفريق المتصدّر" },
      game: { label: "في المباراة", value: "يفوز بها الجانب الفائز" },
      draw: { label: "التعادل", value: "لا يفوز بها أحد" },
    },
    submit: "إنشاء السلسلة",
    submitNote: "أضفها إلى مباراة أو سوشيال عند إنشائه.",
  },
  attach: {
    title: "السلسلة",
    none: "ليست ضمن سلسلة",
    noneHint: "لمرة واحدة",
    willBe: (edition: number) => `ستكون النسخة ${edition}`,
    wouldBe: (edition: number) => `ستكون النسخة ${edition} إن اخترتها`,
    note: (group: string) =>
      `من سلاسل ${isolate(group)}. ينال الفائزون الشارة على ملفاتهم الشخصية.`,
    review: (name: string, edition: number) =>
      `${isolate(name)}، النسخة ${edition}`,
    locked: "النتيجة مسجّلة، لذا تبقى السلسلة كما هي.",
  },
  game: {
    winnersTwo: (first: string, second: string) =>
      `${isolate(first)} و${isolate(second)}`,
    winnersMore: (first: string, second: string, more: number) =>
      plural("ar", more, {
        one: `${isolate(first)} و${isolate(second)} وشخص آخر`,
        two: `${isolate(first)} و${isolate(second)} وشخصان آخران`,
        few: `${isolate(first)} و${isolate(second)} و{n} آخرين`,
        many: `${isolate(first)} و${isolate(second)} و{n} آخرين`,
        other: `${isolate(first)} و${isolate(second)} و{n} آخرين`,
      }),
    ruleSide: "ينال الشارة كل لاعب في الجانب الفائز. التعادل لا يمنحها لأحد.",
    rule: {
      table: (edition: number) =>
        `متصدّر الجدول يفوز بالنسخة ${edition} وبالشارة.`,
      tables: (edition: number) =>
        `متصدّر كل مجموعة يفوز بالنسخة ${edition} وبالشارة.`,
      champion: (edition: number) => `البطل يفوز بالنسخة ${edition} وبالشارة.`,
      king: (edition: number) => `ملك الملعب يفوز بالنسخة ${edition} وبالشارة.`,
      americano: (edition: number) =>
        `متصدّر الترتيب يفوز بالنسخة ${edition} وبالشارة.`,
    },
    wonLast: (winners: string) =>
      `النسخة السابقة كانت من نصيب ${isolate(winners)}.`,
  },
  win: {
    ordinal: (name: string, n: number) =>
      `الفوز ${placeWord(n)} لـ${isolate(name)}`,
    yourOrdinal: (n: number) => `فوزك ${placeWord(n)}`,
    standingNew: "شارة جديدة على الملف الشخصي",
    standingMost: "الأكثر فوزًا",
    standingLevelWith: (name: string) =>
      `الأكثر فوزًا، بالتساوي مع ${isolate(name)}`,
    standingLevelWithCount: (n: number) =>
      plural("ar", n, {
        one: "الأكثر فوزًا، بالتساوي مع شخص آخر",
        two: "الأكثر فوزًا، بالتساوي مع شخصين آخرين",
        few: "الأكثر فوزًا، بالتساوي مع {n} آخرين",
        many: "الأكثر فوزًا، بالتساوي مع {n} آخرين",
        other: "الأكثر فوزًا، بالتساوي مع {n} آخرين",
      }),
  },
  profile: {
    meta: (wins: number, series: number) =>
      `${plural("ar", wins, {
        zero: "لا انتصارات",
        one: "فوز واحد",
        two: "فوزان",
        few: "{n} انتصارات",
        many: "{n} فوزًا",
        other: "{n} فوز",
      })} في ${plural("ar", series, {
        zero: "لا سلاسل",
        one: "سلسلة واحدة",
        two: "سلسلتين",
        few: "{n} سلاسل",
        many: "{n} سلسلة",
        other: "{n} سلسلة",
      })}`,
    with: (who: string) => `مع ${isolate(who)}`,
    bibScore: (bib: string, mine: number, theirs: number) =>
      `${bib}، ${isolate(`${mine}–${theirs}`)}`,
  },
  latest: {
    title: (name: string) => `فوز في سلسلة: ${isolate(name)}`,
    line: (edition: number, who: string | null, place: string) =>
      who
        ? `النسخة ${edition} مع ${isolate(who)}. ${place}`
        : `النسخة ${edition}. ${place}`,
  },
  page: {
    title: "السلسلة",
    loadError: "تعذّر تحميل هذه السلسلة",
    played: (n: number) =>
      plural("ar", n, {
        zero: "نسخ لُعبت",
        one: "نسخة لُعبت",
        two: "نسختان لُعبتا",
        few: "نسخ لُعبت",
        many: "نسخة لُعبت",
        other: "نسخة لُعبت",
      }),
    differentWinners: (n: number) =>
      plural("ar", n, {
        zero: "فائزين مختلفين",
        one: "فائز",
        two: "فائزان مختلفان",
        few: "فائزين مختلفين",
        many: "فائزًا مختلفًا",
        other: "فائز مختلف",
      }),
    runningSince: "جارية منذ",
    ended: "انتهت",
    mostWins: "الأكثر فوزًا",
    of: (played: number) => `من ${played}`,
    lastWon: (edition: number) => `آخر فوز في النسخة ${edition}`,
    youLastWon: (edition: number) => `أنت. آخر فوز في النسخة ${edition}`,
    wins: (n: number) =>
      plural("ar", n, {
        zero: "لا انتصارات",
        one: "فوز واحد",
        two: "فوزان",
        few: "{n} انتصارات",
        many: "{n} فوزًا",
        other: "{n} فوز",
      }),
    allWinners: (n: number) =>
      plural("ar", n, {
        one: "الفائز الوحيد",
        two: "الفائزان",
        few: "كل الفائزين الـ{n}",
        many: "كل الفائزين الـ{n}",
        other: "كل الفائزين الـ{n}",
      }),
    editions: "النسخ",
    newestFirst: "الأحدث أولًا",
    edition: (edition: number) => `النسخة ${edition}`,
    notPlayedYet: "لم تُلعب بعد",
    noResultYet: "لا نتيجة بعد",
    nobodyWon: "لم يفز أحد",
    allEditions: (n: number) =>
      plural("ar", n, {
        one: "النسخة الوحيدة",
        two: "النسختان",
        few: "كل النسخ الـ{n}",
        many: "كل النسخ الـ{n}",
        other: "كل النسخ الـ{n}",
      }),
    empty: "لا نسخ بعد. أضف هذه السلسلة عند إنشاء مباراة أو سوشيال.",
    actions: "إجراءات السلسلة",
    end: "إنهاء السلسلة",
    endTitle: (name: string) => `إنهاء ${isolate(name)}؟`,
    endConfirm:
      "لن يمكن إضافة أي شيء إليها بعد الآن. تبقى الشارات المكتسبة على الملفات الشخصية.",
    endRemoves: "لا نسخ لهذه السلسلة، لذا ستُحذف.",
    rowLabel: (parts: readonly string[]) => parts.join(". "),
  },
  errors: {
    notFound: "السلسلة غير موجودة",
    verifiedOnly: "السلاسل للمجموعات الموثّقة فقط",
    nameRequired: "أعطِ السلسلة اسمًا",
    nameTooLong: (max: number) =>
      plural("ar", max, {
        one: "اجعل الاسم حرفًا واحدًا كحد أقصى",
        two: "اجعل الاسم حرفين كحد أقصى",
        few: "اجعل الاسم {n} أحرف كحد أقصى",
        many: "اجعل الاسم {n} حرفًا كحد أقصى",
        other: "اجعل الاسم {n} حرف كحد أقصى",
      }),
    nameTaken: "لدى المجموعة سلسلة جارية بهذا الاسم",
    tooMany: (max: number) =>
      plural("ar", max, {
        one: "تدير المجموعة سلسلة واحدة في وقت واحد. أنهِ سلسلة لتبدأ أخرى",
        two: "تدير المجموعة سلسلتين في وقت واحد. أنهِ سلسلة لتبدأ أخرى",
        few: "تدير المجموعة {n} سلاسل في وقت واحد. أنهِ سلسلة لتبدأ أخرى",
        many: "تدير المجموعة {n} سلسلة في وقت واحد. أنهِ سلسلة لتبدأ أخرى",
        other: "تدير المجموعة {n} سلسلة في وقت واحد. أنهِ سلسلة لتبدأ أخرى",
      }),
    alreadyEnded: "انتهت هذه السلسلة بالفعل",
    ended: "انتهت هذه السلسلة. اختر سلسلة جارية",
    notInGroup: "لا تكون جزءًا من هذه السلسلة إلا مباريات مجموعتها",
    cannotCarry: "لا يمكن أن يكون هذا النوع من المباريات جزءًا من سلسلة",
    needsDay: "اختر يوم المباراة قبل إضافة سلسلة",
    scoreIn: "النتيجة مسجّلة، لذا تبقى السلسلة كما هي",
  },
} satisfies typeof source;
