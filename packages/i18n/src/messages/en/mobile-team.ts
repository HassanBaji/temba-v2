export const mobileTeam = {
  home: {
    statA11y: (label: string, value: string) => `${label} ${value}`,
    actionsTitle: "Team actions",
    membersTitle: "Members",
  },
  list: {
    invitedBy: (name: string) => `Invited by ${name}`,
    pendingInvitesTitle: "Invites to join a Team",
    loadingA11y: "Loading Teams",
  },
};
