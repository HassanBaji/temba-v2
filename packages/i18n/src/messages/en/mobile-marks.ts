import { plural } from "../../plural";

function timesEn(n: number) {
  if (n === 2) {
    return "twice";
  }
  return plural("en", n, { one: "once", other: "{n} times" });
}

/**
 * The Marks and MVP rows and sheets on the mobile Played game screen, and
 * the cabinet on the profile.
 */
export const mobileMarks = {
  sentences: (parts: string[]) => parts.join(". "),
  and: (first: string, second: string) => `${first} and ${second}`,
  marksCount: (n: number) =>
    plural("en", n, { one: "1 mark", other: "{n} marks" }),
  closesAt: (when: string) => `Closes ${when}`,
  mvp: {
    title: (name: string) => `${name}, MVP`,
    votePending: (mode: string, progress: string) => `${mode}. ${progress}`,
    organizerPending: (when: string) => `Organizer picks. Closes ${when}`,
    tieWaiting: (when: string) =>
      `Tied vote. The organizer picks, closes ${when}`,
    pickChangeable: (when: string) =>
      `Organizer’s pick, can change until ${when}`,
  },
  give: {
    noneLeft: "No marks left. Take one back to give it to someone else.",
  },
  pickPlayer: {
    title: "Who earned one?",
    subtitle: (n: number) =>
      plural("en", n, {
        one: "1 mark left. One per player, and not yourself.",
        other: "{n} marks left. One per player, and not yourself.",
      }),
    ownSide: (side: string) => `Your side, ${side}`,
    ownCaption: "teammate marks and shared marks",
    otherSide: (side: string) => `Other side, ${side}`,
    otherCaption: "opponent marks and shared marks",
    retractSpoken: (kind: string, name: string) =>
      `Take back ${kind} from ${name}`,
  },
  pickMark: {
    title: (name: string) => `A mark for ${name}`,
    teammateSubtitle: "Teammate. Pick one, they’ll see who it came from.",
    opponentSubtitle: "Opponent. Pick one, they’ll see who it came from.",
    forTeammate: "For a teammate",
    forOpponent: "For an opponent",
    roasts: "Roasts",
    roastsCaption: "they can hide these from their profile",
    padelOnly: (kind: string) => `${kind} isn’t here: it’s padel only.`,
    footballOnly: (kind: string) => `${kind} isn’t here: it’s football only.`,
    opponentOnly: (kind: string) =>
      `Opponent marks like ${kind} only show when you pick someone from the other side.`,
    teammateOnly: (kind: string) =>
      `Teammate marks like ${kind} only show when you pick someone from your side.`,
    picked: (kind: string, name: string) => `${kind} for ${name}`,
    leftAfter: (n: number) => `${n} left after this`,
    give: (kind: string) => `Give ${kind}`,
    choose: "Pick a mark",
  },
  vote: {
    title: "Vote for the MVP",
    subtitle: (when: string) =>
      `One vote, either side, not yourself. Votes stay hidden until it closes ${when}.`,
    progress: (cast: number, eligible: number) =>
      `${cast} of ${eligible} have voted`,
    tieRule: "Tie goes to the organizer",
    current: (name: string) =>
      `Your vote: ${name}. You can change it until it closes.`,
    cta: (firstName: string) => `Vote for ${firstName}`,
  },
  pick: {
    subtitle:
      "You set this game to organizer’s pick. Marks and goals are hints, the call is yours.",
    footnote:
      "Sorted by marks received. When a vote ties, this same sheet opens for you with only the tied players.",
  },
  roster: {
    openTitle: "Marks so far",
    closedTitle: "Marks",
    footnote:
      "Tap a coin to see who gave it. Roasts a player has hidden still show here, to the people who were in the game.",
    coinsSpoken: (name: string, coins: string) =>
      `Marks for ${name}: ${coins}. Show who gave them`,
  },
  givers: {
    title: (name: string) => `Marks for ${name}`,
  },
  cabinet: {
    empty: "No marks yet",
    unavailableTitle: "These marks aren’t available",
    unavailableDescription:
      "Marks follow who the player lets see their Match history.",
    loadError: "Marks could not be loaded",
    coinSpoken: (name: string, n: number) => `${name} ${n}`,
    rowSpoken: (received: string, coins: string) =>
      `Marks, ${received}. ${coins}`,
    showAll: "Show all marks",
    marksReceived: (n: number) =>
      plural("en", n, {
        one: "1 mark received",
        other: "{n} marks received",
      }),
    marksReceivedIn: (marks: string, games: number) =>
      `${marks} in ${plural("en", games, { one: "1 game", other: "{n} games" })}`,
    sections: {
      teammate: "From teammates",
      anyone: "From anyone",
      opponent: "From opponents",
    },
    kinds: (n: number) =>
      plural("en", n, { one: "1 kind", other: "{n} kinds" }),
    kindsIn: (n: number, sport: "padel" | "football") =>
      `${plural("en", n, { one: "1 kind", other: "{n} kinds" })} in ${sport}`,
    from: (name: string, when: string) => `From ${name}, ${when}`,
    mvpTimes: {
      vote: (n: number) => `${timesEn(n)} by vote`,
      organizer: (n: number) => `${timesEn(n)} by the organizer`,
      tieBreak: (n: number) =>
        `${timesEn(n)} by the organizer after a tied vote`,
    },
    mvpHow: (parts: string[]) => {
      const joined = parts.join(", ");
      return joined.charAt(0).toUpperCase() + joined.slice(1);
    },
    lastOne: (when: string, game: string) => `Last one ${when}, ${game}`,
  },
  detail: {
    about: (description: string, givenBy: string) =>
      `${description} ${givenBy}`,
    givenBy: {
      teammate: "A teammate or partner gives it.",
      anyone: "Anyone in the game can give it.",
      opponent: "Someone on the other side gives it.",
    },
    byVote: "By vote",
    firstOne: (when: string) => `First one ${when}`,
    otherTab: (sport: "padel" | "football"): string =>
      sport === "padel"
        ? "Padel marks show under the Padel tab"
        : "Football marks show under the Football tab",
    otherTabMvp: (sport: "padel" | "football"): string =>
      sport === "padel"
        ? "Padel MVPs show under the Padel tab"
        : "Football MVPs show under the Football tab",
  },
};
