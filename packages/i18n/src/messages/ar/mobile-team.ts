import type { mobileTeam as source } from "../en/mobile-team";

export const mobileTeam = {
  home: {
    statA11y: (label: string, value: string) => `${label} ${value}`,
    actionsTitle: "إجراءات الفريق",
  },
} satisfies typeof source;
