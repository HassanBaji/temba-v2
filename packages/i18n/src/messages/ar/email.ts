import type { email as source } from "../en/email";

export const email = {
  open: {
    game: "افتح المباراة",
    group: "افتح المجموعة",
    history: "اطّلع على مبارياتك",
    teams: "افتح فرقك",
  },
  inGroup: (group: string) => `في ${group}`,
  footer: {
    why: "وصلتك هذه الرسالة لأن إشعارات البريد الإلكتروني مفعّلة في حسابك على Temba.",
    settings: "إدارة إشعارات البريد الإلكتروني من الإعدادات",
  },
} satisfies typeof source;
