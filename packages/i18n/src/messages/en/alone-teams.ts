import { plural } from "../../plural";

const players = (n: number) =>
  plural("en", n, { one: "{n} player", other: "{n} players" });
const teams = (n: number) =>
  plural("en", n, { one: "{n} team", other: "{n} teams" });
const rounds = (n: number) =>
  plural("en", n, { one: "{n} round", other: "{n} rounds" });

export const aloneTeams = {
  create: {
    choice: "Alone only, you make the teams",
    choiceHint: "Everyone signs up alone. You make the teams",
    sizeHint: (teamCount: number) =>
      `${teams(teamCount)} of two, ${players(teamCount * 2)}. Players sign up one by one; you pair them, then post the teams.`,
    review: "Alone only, you make the teams",
    feeNote:
      "Each player pays their own share, since nobody enters as a team. Zero means free. Temba does not collect payment.",
  },
  hero: {
    teamsLater: "teams, made later",
    seatsWaiting: "teams are made when full",
    seatsReady: "full, ready for teams",
    seatsPosted: "full, ready to draw",
    tag: "Alone",
  },
  players: {
    title: "Players",
    count: (n: number, cap: number) => `${n} of ${cap}`,
    openSeat: "Open seat",
    you: "You",
    note: "One list of players. No team to pick and nobody to bring: the organizer pairs everyone at the end.",
    organizerNote:
      "Everyone signed up alone. Making the teams is the next step; the draw only opens once they are posted.",
    waitingTitle: "Waiting for a partner",
    waitingNote:
      "Not in a team yet. They get a seat when one opens, or the organizer moves them in Edit teams.",
  },
  waiting: {
    title: "The teams",
    body: (cap: number) =>
      `Made by the organizer once all ${cap} seats are taken. You sign up alone and get a partner. Then comes the draw.`,
    scheduleAfter: "after teams and the draw",
  },
  organizerCard: {
    allIn: (n: number) => `All ${n} in. Make the teams`,
    someIn: (n: number, cap: number) => `${n} of ${cap} in. Make the teams`,
    body: "Pair them by level or by hand, then post.",
    action: "Make teams",
    needMore: (min: number, n: number) =>
      `Make teams opens at ${players(min)}. ${n} in so far.`,
  },
  join: {
    title: "Take a seat",
    body: "You sign up alone. Once the seats are full the organizer pairs everyone and posts the teams.",
    side: "Side",
    optional: "optional",
    left: "Left",
    right: "Right",
    either: "Either",
    sideHint:
      "The organizer sees this when pairing, so a left can go with a right.",
    partner: "Your partner",
    partnerValue: "Picked by the organizer",
    submit: "Take a seat",
    submitWithSide: (side: string) => `Take a seat, ${side}`,
    footer: "Sign up alone",
    seatsLeft: (n: number) =>
      plural("en", n, { one: "{n} seat left", other: "{n} seats left" }),
  },
  make: {
    eyebrow: "Organizer",
    title: "Make teams",
    intro: (n: number) =>
      `${players(n)} signed up alone. Pair them up, then post. The draw comes after.`,
    balance: "Balance by level",
    shuffle: "Shuffle",
    balancedNote: (spread: string) =>
      `Balanced by level: the teams are within ${spread} of each other.`,
    sidesNote: "Every pair has a left and a right.",
    shuffledNote: "Shuffled at random. Balance by level to go back.",
    editedNote: "Changed by hand. Balance by level to start again.",
    columnNumber: "#",
    columnLeft: "Left",
    columnRight: "Right",
    columnAverage: "Avg",
    legend:
      "Each player shows their level and the side they asked for. Avg is the pair’s level; 2 L or 2 R marks a pair who both asked for the same side.",
    sideShortLeft: "L",
    sideShortRight: "R",
    sameSide: (side: string) => `2 ${side}`,
    swapHint: "Tap two players to swap them.",
    swapSelected: (name: string) => `${name} picked. Tap another to swap.`,
    unplaced: (name: string) =>
      `${name} signed up last and waits on the list for one more player.`,
    noLevel: "–",
    post: "Post the teams",
    postAgain: "Post the teams again",
    postNote: (n: number) =>
      `Posting tells all ${n} who their partner is. The draw opens next.`,
    postAgainNote:
      "Posting again replaces the teams and tells everyone their partner.",
    posted: "Teams posted",
    close: "Close",
    tooFew: (min: number) => `Make teams needs ${players(min)} signed up.`,
  },
  posted: {
    organizerTitle: "Teams posted. Draw the group",
    organizerTitleKnockout: "Teams posted. Draw the bracket",
    organizerTitleKing: "Teams posted. Draw the starting courts",
    organizerBody: "Random, nobody seeded. Then make the rounds your way.",
    openDraw: "Open the draw",
    share: "Share teams",
    makeAgain: "Make teams again",
    teamsTitle: "Teams",
    teamsMadeByYou: (n: number, total: number) =>
      `${n} of ${total}, made by you`,
    teamsComplete: (n: number, total: number) => `${n} of ${total} complete`,
    playerTitle: (partner: string) => `You’re with ${partner}`,
    playerBody: (viewerSide: "left" | "right", partner: string) =>
      viewerSide === "left"
        ? `The organizer made the teams. You on the left, ${partner} on the right. The draw comes next.`
        : `The organizer made the teams. You on the right, ${partner} on the left. The draw comes next.`,
    playerBodyNoSide: "The organizer made the teams. The draw comes next.",
    playerWaitingTitle: "Waiting for a partner",
    playerWaitingBody:
      "The organizer posted the teams with an odd number in. You get a seat when one opens.",
    pairName: (left: string, right: string) => `${left} & ${right}`,
    yourTeam: "your team",
    full: "full",
    andMore: (n: number) =>
      plural("en", n, {
        one: "and {n} more, all complete",
        other: "and {n} more, all complete",
      }),
    listNote: (n: number) =>
      `Made by the organizer from ${players(n)} who signed up alone.`,
    lockNote:
      "Left side first in each pair. Teams can be edited until the draw is posted; after that they are locked, like any social.",
  },
  share: {
    title: "Share teams",
    done: "Done",
    story: "Story",
    square: "Square",
    text: "Text",
    brand: "TEMBA",
    eyebrow: "Teams / Padel / Social",
    theTeams: "The teams",
    meta: (
      group: string | null,
      teamCount: number,
      roundCount: number | null,
    ) =>
      [group, teams(teamCount), roundCount ? rounds(roundCount) : null]
        .filter(Boolean)
        .join(" / "),
    storySize: "1080 × 1920 / Story",
    squareSize: "1080 × 1080 / Square",
    showLevels: "Show levels",
    showLevelsHint: "Adds each pair’s average. Off, names only",
    storyNote: (n: number) =>
      `All ${teams(n)} on one image, for a story or a status. Nobody is highlighted.`,
    squareNote: "For the group chat. Nobody is highlighted.",
    textNote:
      "A numbered list to paste into the group chat, where most organizers announce teams.",
    shareImage: "Share image",
    save: "Save",
    copyLink: "Copy link",
    message: "Message",
    copyText: "Copy text",
    copied: "Copied",
    shareFailed: "Could not share. Try Save instead.",
    textTitle: (game: string) => `${game}: the teams`,
    textLine: (n: number, left: string, right: string) =>
      `${n}. ${left} & ${right}`,
    textLineLevel: (n: number, left: string, right: string, level: string) =>
      `${n}. ${left} & ${right} (${level})`,
    imageAlt: (game: string) => `The teams for ${game}`,
  },
  detail: {
    signUp: "Sign up",
    signUpValue: "Alone, organizer makes the teams",
  },
  errors: {
    americano: "An Americano already has everyone sign up alone.",
    partnerOnly: "Pick either Alone only or With a partner only, not both.",
    notAloneOnly: "The organizer does not make the teams on this Social.",
    sideOnlyAloneOnly:
      "Only a Social where the organizer makes the teams asks for a side.",
    partnerRegistration:
      "Everyone signs up alone on this Social. The organizer makes the teams.",
    teamsFirst: "Post the teams before the draw.",
    drawPosted: "The draw is posted. Use Edit teams instead.",
    tooFewPairs: (min: number) => `Make at least ${teams(min)}.`,
    tooManyPairs: (max: number) => `This Social has room for ${teams(max)}.`,
    playerTwice: "A player is in two teams.",
    notOnGame: "Someone in these teams is not signed up.",
    leftOut:
      "Every player needs a team, except one when the number signed up is odd.",
    cancelled: "This Social is cancelled.",
  },
};
