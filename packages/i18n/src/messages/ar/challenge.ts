import { isolate } from "../../bidi";
import type { challenge as source } from "../en/challenge";

export const challenge = {
  segments: {
    label: "أقسام التحديات",
    open: "مفتوحة",
    mine: "تحدياتي",
    teams: "الفرق",
    withCount: (segment: string, n: number) => `${segment}، ${n}`,
  },
  open: {
    emptyTitle: "لا تحديات مفتوحة بعد",
    emptyCopy:
      "تنشر الفرق تحديًا هنا عندما تبحث عن منافس: المستوى المطلوب، وأين ومتى تحب أن تلعب.",
    untilThen: "حتى ذلك الحين، جهّز فريقك.",
  },
  mine: {
    emptyTitle: "لا شيء بانتظارك",
    emptyCopy:
      "تظهر هنا تحديات فرقك، والعروض التي ترسلها، ومباريات التحدي الخاصة بك.",
    untilThen: "حتى ذلك الحين، أنشئ فريقًا أو أكمل قائمة فريقك.",
  },
  goToTeams: "اعرض فرقك",
  teams: {
    invitedTitle: "دعوات إلى",
    invitedBy: (name: string) => `بدعوة من ${isolate(name)}`,
    join: "انضمام",
    joinA11y: (team: string) => `انضم إلى ${isolate(team)}`,
    createTeam: "إنشاء فريق",
    emptyTitle: "لا فريق بعد",
    emptyCopy: "الفرق لك، لا للمجموعة. أنشئ فريقًا لتنشر التحديات وتحتفظ بسجل.",
    createFirst: "أنشئ فريقًا",
    createFromGroup: (group: string) => `أنشئ من ${isolate(group)}`,
    lineSeparator: ". ",
    record: "ف–خ",
    recordWithDraws: "ف–ت–خ",
  },
} satisfies typeof source;
