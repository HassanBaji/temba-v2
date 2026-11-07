import { plural } from "../../plural";

export const marks = {
  kind: {
    dynamo: {
      name: "Dynamo",
      description: "Covered every ball and never stopped running.",
    },
    let_him_cook: {
      name: "Let him cook",
      description: "I stepped back and let him run the game.",
    },
    mr_fumble: {
      name: "Mr Fumble",
      description: "Had it in his hands. Dropped it anyway.",
    },
    sayed_malek: {
      name: "Sayed Malek",
      description: "Played like a sleepy old man. Nap time on court.",
    },
    clutch: {
      name: "Clutch",
      description: "Won the points that mattered.",
    },
    mr_ice: {
      name: "Mr Ice",
      description: "Never cracked under pressure.",
    },
    smash_machine: {
      name: "Smash Machine",
      description: "Couldn’t stop putting balls away.",
    },
    goal_machine: {
      name: "Goal Machine",
      description: "Couldn’t stop scoring.",
    },
    great_wall: {
      name: "The Great Wall",
      description: "Nothing got past.",
    },
    comeback_king: {
      name: "Comeback King",
      description: "Came back from a lost position.",
    },
    underdog: {
      name: "Underdog",
      description: "Nobody expected the win.",
    },
    good_game: {
      name: "Good Game",
      description: "Fair, fun, respect.",
    },
    mvp: {
      name: "MVP",
      description: "Most valuable player, one per game.",
    },
  },
  group: {
    teammate: "From your teammate or partner",
    anyone: "From anyone in the game",
    opponent: "From the other side",
  },
  window: {
    closes: (when: string) => `closes ${when}`,
    closed: (when: string) => `Closed ${when}`,
    opensAfterScore: "Open 48h after the score",
  },
  give: {
    title: "Give your marks",
    toGive: (n: number) => `${n} to give, one per player`,
    choosePlayer: "Choose a player",
    youGave: (given: number, total: number) => `You gave ${given} of ${total}`,
    gaveTo: (kind: string, name: string) => `${kind} to ${name}`,
    retract: "Take back",
    refused: {
      self: "You can’t give yourself a mark.",
      notParticipant: "Only players in this game give marks, to others in it.",
      windowClosed: "Marks are closed for this game.",
      capReached: "You’ve given all your marks for this game.",
      alreadyMarkedReceiver: "You’ve already given this player a mark.",
      kindNotAllowed: "That mark can’t go to this player.",
    },
  },
  soFar: (given: number, givers: number) =>
    `${given} given by ${plural("en", givers, {
      one: "{n} player",
      other: "{n} players",
    })}`,
  count: (n: number) => `×${n}`,
  mvp: {
    mode: {
      vote: {
        label: "Players vote",
        description:
          "Everyone in the game gets one vote after the score. Hidden until it closes.",
        help: "A tied vote comes to you to break. Voting closes 48 hours after the score, or earlier when everyone has voted.",
      },
      organizer: {
        label: "Organizer picks",
        description: "You choose, with marks and goals shown as hints.",
        help: "You can change your pick until the 48-hour window closes.",
      },
      none: {
        label: "No MVP",
        description: "Marks still work. Nobody gets the gold coin.",
        help: "You can turn this on later from the game, as long as the score isn’t confirmed yet.",
      },
    },
    notDecided: "MVP not decided yet",
    vote: "Vote",
    pick: "Pick the MVP",
    changePick: "Change pick",
    progress: (cast: number, eligible: number, closes: string) =>
      `${cast} of ${eligible} have voted, ${closes}`,
    byVote: (cast: number, eligible: number) =>
      `By vote, ${cast} of ${eligible}`,
    organizerPick: "Organizer’s pick",
    tieBreak: "Tied vote, Organizer’s pick",
    noMvp: "No MVP this game",
    make: (firstName: string) => `Make ${firstName} the MVP`,
    tieNotice: (n: number) =>
      `Tied vote, ${plural("en", n, {
        one: "{n} player",
        other: "{n} players",
      })}. Pick the MVP.`,
    refused: {
      wrongMode: "This game doesn’t decide its MVP that way.",
      notVoter: "Only players in this game vote for the MVP.",
      notOrganizer: "Only an organizer picks the MVP.",
      self: "You can’t pick yourself.",
      notCandidate: "That player can’t be the MVP here.",
      closed: "The MVP is no longer open.",
    },
  },
};
