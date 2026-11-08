/** The Notification email (ADR-0054). Title and subline reuse `notification`. */
export const email = {
  open: {
    game: "Open the Game",
    group: "Open the Group",
    history: "See your Games",
    teams: "Open your Teams",
  },
  inGroup: (group: string) => `In ${group}`,
  footer: {
    why: "You received this email because Email notifications are on for your Temba account.",
    settings: "Manage Email notifications in Settings",
  },
};
