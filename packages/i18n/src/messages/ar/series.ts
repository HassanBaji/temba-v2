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
  },
} satisfies typeof source;
