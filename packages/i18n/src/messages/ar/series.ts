import { isolate } from "../../bidi";
import { plural } from "../../plural";
import type { series as source } from "../en/series";

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
