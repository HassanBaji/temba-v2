export const challenge = {
  segments: {
    label: "Challenges sections",
    open: "Open",
    mine: "Mine",
    teams: "Teams",
    withCount: (segment: string, n: number) => `${segment}, ${n}`,
  },
  open: {
    emptyTitle: "No open challenges yet",
    emptyCopy:
      "Teams post a challenge here when they want an opponent: the level they want, where and when they like to play.",
    untilThen: "Until then, get your Team ready.",
  },
  mine: {
    emptyTitle: "Nothing waiting on you",
    emptyCopy:
      "Your Teams' challenges, the proposals you send and your Challenge Games show here.",
    untilThen: "Until then, make a Team or fill your Roster.",
  },
  goToTeams: "See your teams",
  teams: {
    invitedTitle: "Invited to",
    invitedBy: (name: string) => `Invited by ${name}`,
    join: "Join",
    joinA11y: (team: string) => `Join ${team}`,
    createTeam: "Create team",
    emptyTitle: "No team yet",
    emptyCopy:
      "Teams are yours, not a group's. Make one to post challenges and keep a record.",
    createFirst: "Create a team",
    createFromGroup: (group: string) => `Create from ${group}`,
    lineSeparator: ". ",
    record: "W–L",
    recordWithDraws: "W–D–L",
  },
};
