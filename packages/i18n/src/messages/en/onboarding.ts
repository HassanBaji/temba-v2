export const onboarding = {
  sport: {
    padel: {
      description:
        "Doubles, 90 minute slots. A letter Level that follows your results.",
      meta: "Level D to A, side",
    },
    football: {
      description:
        "Five or seven a side. Pool first, teams set before kick-off.",
      meta: "Level, role, position",
    },
  },
  padelLevel: {
    newToPadel: {
      name: "New to padel",
      detail: "Learning the walls and the rules.",
    },
    beginner: { name: "Beginner", detail: "Lobs and volleys with intent." },
    improver: {
      name: "Improver",
      detail: "Overheads and volleys are reliable, errors still creep in.",
    },
    clubPlayer: {
      name: "Club player",
      detail:
        "Comfortable off the glass, builds the point instead of rushing it.",
    },
    intermediate: {
      name: "Intermediate",
      detail:
        "Plays tournaments, picks the right shot, rarely gives points away.",
    },
    advanced: {
      name: "Advanced",
      detail: "Wins tournaments, finishes points at the net.",
    },
    competitor: {
      name: "Competitor",
      detail:
        "Places in tournaments, pressures at the net, defends the lob well.",
    },
    expert: {
      name: "Expert",
      detail: "Top of the local scene, reads the game a step ahead.",
    },
    pro: {
      name: "Pro",
      detail: "Competes on the national or international circuit.",
    },
  },
  padelSide: {
    left: "backhand side",
    right: "forehand side",
    either: "wherever open",
  },
  footballRole: {
    outfield: "Player",
    keeper: "Keeper",
  },
  padelNotSure: (level: string) =>
    `Not sure, start at ${level} and leave side open`,
  summary: {
    levelAlreadySet: "Level already set",
    padelLine: (level: string, side: string) =>
      `${level}, ${side.toLowerCase()}`,
    footballLine: (slot: string, placement: string) =>
      `${slot}, ${placement.toLowerCase()}`,
  },
  flow: {
    pickAtLeastOne: "Pick at least one",
    continueWithBoth: "Continue with both",
    continueWith: (sport: string) => `Continue with ${sport.toLowerCase()}`,
    findSportGames: (sport: string) => `Find ${sport.toLowerCase()} games`,
    findGames: "Find games",
  },
};
