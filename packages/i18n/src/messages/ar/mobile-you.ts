import type { mobileYou as source } from "../en/mobile-you";
import { plural } from "../../plural";

export const mobileYou = {
  names: (names: string[]) => names.join(" و"),
  goals: "أهداف",
  goalsAGame: "هدف لكل مباراة",
  goalsInMatch: (n: number) =>
    plural("ar", n, {
      zero: "لا أهداف",
      one: "هدف واحد",
      two: "هدفان",
      few: "{n} أهداف",
      many: "{n} هدفًا",
      other: "{n} هدف",
    }),
  curveSpoken: (from: string, to: string) => `التصنيف من ${from} إلى ${to}`,
  leftName: "اسمك",
  sportAdded: (sport: string) => `أضيفت ${sport} إلى ملفك`,
  sportRemoved: (sport: string) => `أزيلت ${sport} من ملفك`,
  pickFromList: (label: string) => `${label}، اختر من القائمة`,
  password: {
    current: "كلمة المرور الحالية",
    save: "حفظ كلمة المرور",
    saved: "تم تغيير كلمة المرور",
  },
} satisfies typeof source;
