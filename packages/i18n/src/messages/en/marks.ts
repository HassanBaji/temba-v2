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
};
