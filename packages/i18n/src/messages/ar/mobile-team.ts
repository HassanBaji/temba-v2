import type { mobileTeam as source } from "../en/mobile-team";

export const mobileTeam = {
  home: {
    statA11y: (label: string, value: string) => `${label} ${value}`,
    actionsTitle: "إجراءات الفريق",
  },
  list: {
    invitedBy: (name: string) => `بدعوة من ${name}`,
    pendingInvitesTitle: "دعوات للانضمام إلى فريق",
    loadingA11y: "جارٍ تحميل الفرق",
  },
} satisfies typeof source;
