import type { webYou as source } from "../en/web-you";
import { plural } from "../../plural";

export const webYou = {
  sportsLabel: "رياضاتك",
  scopesLabel: "نطاق المستوى",
  scaleLabel: "مستويات المجموعات مقارنة بمستواك العام",
  noData: "—",
  outcome: {
    won: "فوز",
    lost: "خسارة",
    draw: "تعادل",
  },
  football: {
    goals: "أهداف",
    goalsPerGame: "أهداف في المباراة",
    goalsTotal: (n: number) =>
      plural("ar", n, {
        zero: "لا أهداف",
        one: "هدف واحد",
        two: "هدفان",
        few: "{n} أهداف",
        many: "{n} هدفًا",
        other: "{n} هدف",
      }),
    sameAsYours: "مثل مستواك",
    same: "مثله",
  },
  settings: {
    changePassword: "تغيير كلمة المرور",
    setPassword: "تعيين كلمة مرور",
    currentPassword: "كلمة المرور الحالية",
    newPassword: "كلمة المرور الجديدة",
    passwordSaved: "تم تغيير كلمة المرور",
    savePassword: "حفظ كلمة المرور",
    deleting: "جارٍ الحذف…",
    sportAdded: (sport: string) => `أُضيفت ${sport} إلى ملفك`,
    sportRemoved: (sport: string) => `أُزيلت ${sport} من ملفك`,
    levelPlaced: "تم حفظ المستوى",
  },
} satisfies typeof source;
