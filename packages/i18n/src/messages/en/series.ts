import { plural } from "../../plural";
import { tournamentRounds } from "./tournament-rounds";

const { ordinal } = tournamentRounds.shareCard;

export const series = {
  noun: {
    series: "series",
    edition: "edition",
    badge: "badge",
  },
  emblems: {
    cup: "Cup",
    crown: "Crown",
    star: "Star",
    bolt: "Bolt",
    flame: "Flame",
    moon: "Moon",
    ball: "Ball",
  },
  colours: {
    gold: "Gold",
    red: "Red",
    blue: "Blue",
    green: "Green",
    purple: "Purple",
    teal: "Teal",
  },
  gallery: {
    title: "Series badges",
  },
  tab: {
    title: "Series",
    running: (n: number) =>
      plural("en", n, { one: "{n} running", other: "{n} running" }),
    ended: "Ended",
    note: "A series is a social or a game this group plays again and again. Whoever wins one gets its badge on their profile.",
    empty: "No series yet.",
    newSeries: "New series",
    next: "Next",
    badgesStay: "Badges stay",
    loadError: "The series could not be loaded",
    rowKind: {
      padel: {
        social: "Padel social",
        game: "Padel game",
        none: "Padel series",
      },
      football: {
        social: "Football social",
        game: "Football game",
        none: "Football series",
      },
    },
    played: (n: number) =>
      plural("en", n, { one: "{n} played", other: "{n} played" }),
    notPlayedYet: "Not played yet",
    rowLine: (kind: string, played: string) => `${kind}. ${played}`,
    rowLineNext: (kind: string, played: string, edition: number) =>
      `${kind}. ${played}, next is edition ${edition}`,
    rowLineEnded: (kind: string, played: string, month: string) =>
      `${kind}. ${played}, ended in ${month}`,
  },
  create: {
    title: "New series",
    preview: "Preview",
    namePlaceholder: "Series name",
    previewNote: "How it sits on a winner’s profile",
    nameLabel: "Name",
    nameHint: "What players will see on the game and on their profile.",
    emblem: "Emblem",
    colour: "Colour",
    rules: {
      social: { label: "In a social", value: "The top team wins it" },
      game: { label: "In a game", value: "The winning side wins it" },
      draw: { label: "A draw", value: "Nobody wins that one" },
    },
    submit: "Create series",
    submitNote: "Attach it to a game or a social when you create one.",
  },
  attach: {
    title: "Series",
    none: "Not part of a series",
    noneHint: "A one-off",
    willBe: (edition: number) => `This will be edition ${edition}`,
    wouldBe: (edition: number) => `This would be edition ${edition}`,
    note: (group: string) =>
      `Series of ${group}. The winners get the badge on their profile.`,
    review: (name: string, edition: number) => `${name}, edition ${edition}`,
    locked: "The score is in, so the series stays.",
    rowA11y: (title: string, hint: string) => `${title}, ${hint}`,
  },
  game: {
    winnersTwo: (first: string, second: string) => `${first} and ${second}`,
    winnersMore: (first: string, second: string, more: number) =>
      plural("en", more, {
        one: `${first}, ${second} and {n} more`,
        other: `${first}, ${second} and {n} more`,
      }),
    ruleSide:
      "Every player on the winning side gets the badge. A draw gives it to nobody.",
    rule: {
      table: (edition: number) =>
        `Top of the table wins edition ${edition} and the badge.`,
      tables: (edition: number) =>
        `Top of each group wins edition ${edition} and the badge.`,
      champion: (edition: number) =>
        `The champion wins edition ${edition} and the badge.`,
      king: (edition: number) =>
        `The king of the court wins edition ${edition} and the badge.`,
      americano: (edition: number) =>
        `Top of the standings wins edition ${edition} and the badge.`,
    },
    wonLast: (winners: string) => `${winners} won the last one.`,
    partOf: (name: string) => `Part of ${name}`,
    seeSeries: "See series",
    heroEdition: (edition: number) => `edition ${edition}`,
    factsLabel: "Series",
    facts: (name: string, edition: number) => `${name}, edition ${edition}`,
    cardLabel: (title: string, rule: string) => `${title}. ${rule}`,
    openHint: "Opens the series",
    seeTheSeries: "See the series",
    winners: "Winners",
    team: (first: string, second: string) => `${first} & ${second}`,
    wonBy: (winners: string) => `Won by ${winners}`,
    draw: (edition: number) => `A draw. Nobody wins edition ${edition}.`,
    tableNote:
      "The series goes to the top of the table once the last round is saved. If the organizer corrects a score, it follows the table.",
    winnersCardLabel: (title: string, names: readonly string[]) =>
      `${title}. Winners: ${names.join(", ")}`,
  },
  win: {
    ordinal: (name: string, n: number) => `${name}’s ${ordinal(n)}`,
    yourOrdinal: (n: number) => `Your ${ordinal(n)}`,
    standingNew: "new on the profile",
    standingMost: "most of anyone",
    standingLevelWith: (name: string) => `most of anyone, level with ${name}`,
    standingLevelWithCount: (n: number) =>
      plural("en", n, {
        one: "most of anyone, level with {n} other",
        other: "most of anyone, level with {n} others",
      }),
  },
  profile: {
    title: "Series",
    meta: (wins: number, series: number) =>
      `${plural("en", wins, { one: "{n} win", other: "{n} wins" })} in ${series}`,
    allWins: "All series wins",
    badgeLabel: (name: string, wins: number) =>
      `${name}, ${plural("en", wins, { one: "{n} win", other: "{n} wins" })}`,
    sheetWon: (wins: number, of: number) => `Won ${wins} of ${of}`,
    played: (n: number) =>
      plural("en", n, { one: "played {n}", other: "played {n}" }),
    seeSeries: "See the series",
    winsTitle: "Series wins",
    winTitle: (name: string, edition: number) => `${name}, edition ${edition}`,
    winLine: (who: string, date: string) => `${who}. ${date}`,
    loadError: "These wins could not be loaded",
    with: (who: string) => `With ${who}`,
    bibScore: (bib: string, mine: number, theirs: number) =>
      `${bib}, ${mine}–${theirs}`,
  },
  latest: {
    title: (name: string) => `Series win: ${name}`,
    line: (edition: number, who: string | null, place: string) =>
      who
        ? `Edition ${edition} with ${who}. ${place}`
        : `Edition ${edition}. ${place}`,
  },
  page: {
    title: "Series",
    loadError: "This series could not be loaded",
    played: (n: number) => plural("en", n, { one: "played", other: "played" }),
    differentWinners: (n: number) =>
      plural("en", n, {
        one: "different winner",
        other: "different winners",
      }),
    runningSince: "running since",
    ended: "ended",
    mostWins: "Most wins",
    of: (played: number) => `of ${played}`,
    lastWon: (edition: number) => `Last won edition ${edition}`,
    youLastWon: (edition: number) => `You. Last won edition ${edition}`,
    wins: (n: number) => plural("en", n, { one: "{n} win", other: "{n} wins" }),
    allWinners: (n: number) =>
      plural("en", n, { one: "All {n} winner", other: "All {n} winners" }),
    editions: "Editions",
    newestFirst: "newest first",
    edition: (edition: number) => `Edition ${edition}`,
    notPlayedYet: "Not played yet",
    noResultYet: "No result yet",
    nobodyWon: "Nobody won",
    allEditions: (n: number) =>
      plural("en", n, { one: "All {n} edition", other: "All {n} editions" }),
    empty:
      "No editions yet. Attach this series when you create a game or a social.",
    actions: "Series actions",
    end: "End series",
    endTitle: (name: string) => `End ${name}?`,
    endConfirm:
      "Nothing can be attached to it any more. Badges already won stay on profiles.",
    endRemoves: "This series has no editions, so it will be removed.",
    rowLabel: (parts: readonly string[]) => parts.join(". "),
  },
  errors: {
    notFound: "Series not found",
    verifiedOnly: "Only a verified group can have a series",
    nameRequired: "Give the series a name",
    nameTooLong: (max: number) =>
      plural("en", max, {
        one: "Keep the name to 1 character",
        other: "Keep the name to {n} characters",
      }),
    nameTaken: "A running series of this group already has that name",
    tooMany: (max: number) =>
      plural("en", max, {
        one: "A group can run 1 series at once. End one to start another",
        other:
          "A group can run up to {n} series at once. End one to start another",
      }),
    alreadyEnded: "This series has already ended",
    ended: "This series has ended. Pick a running one",
    notInGroup: "Only a game of the series' group can be part of it",
    cannotCarry: "This kind of game cannot be part of a series",
    needsDay: "Pick the game's day before adding a series",
    scoreIn: "The score is in, so the series stays",
  },
};
