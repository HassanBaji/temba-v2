import { plural } from "../../plural";

export const rating = {
  bands: {
    shark: "Shark",
    hamour: "Hamour",
    kanaad: "Kanaad",
    safi: "Safi",
  },
  provisional: "Provisional",
  scope: {
    group: "Counts for group tier",
    groupNote:
      "Moves tier points in this group only. Temba levels move in verified groups.",
  },
  tier: {
    columnTier: "Tier",
    columnPlayer: "Player",
    columnPoints: "Points",
    theShark: "The Shark",
    points: (points: string) => `${points} points`,
    sharkFor: (points: string, weeks: number) =>
      plural("en", weeks, {
        one: `${points} points, top for 1 week`,
        other: `${points} points, top for {n} weeks`,
      }),
    place: (place: number) => `#${place}`,
    provisionalGames: (games: number, of: number) =>
      `Provisional, ${games} of ${of} games`,
    noTier: "no tier",
    withOrganizer: (label: string) => `${label}, organizer`,
    stillProvisional: (n: number) =>
      plural("en", n, {
        one: "1 still provisional",
        other: "{n} still provisional",
      }),
    pointsSpoken: (points: string) => `${points} tier points`,
    footnote:
      "Tier and points are this group’s own: Hamour is the top 15% after the Shark, Kanaad the next 35%, Safi everyone else. Points come from this group’s games only.",
  },
  adjust: {
    menuRow: "Adjust rating",
    menuHint: "Move their tier points by hand, with a reason they can see",
    title: "Adjust rating",
    subtitle: (group: string) =>
      `${group}. A manual change, on top of what the games did.`,
    placeOf: (place: number, of: number) => `#${place} of ${of}`,
    now: (points: string, standing: string) => `Now ${points}, ${standing}`,
    nowRanked: (band: string, placeOf: string) => `${band}, ${placeOf}`,
    nowProvisional: (games: number, of: number) =>
      `provisional, ${games} of ${of} games`,
    newPoints: "New points",
    noChange: "no change",
    place: "Place",
    noFish: "No fish yet",
    step: (delta: string) => `Change by ${delta}`,
    orJump: "or jump:",
    into: (band: string) => `into ${band}`,
    reset: "Reset",
    tierAfter: "Tier after the change",
    effect: {
      none: "No change yet. Tiers are places in the group, so when one player moves, someone moves the other way.",
      stays: (band: string, placeOf: string) =>
        `Still a ${band}, now ${placeOf}.`,
      nobodyElse: "Nobody else changes tier.",
      ranked: (name: string, band: string, placeOf: string) =>
        `${name} is ranked ${placeOf}, a ${band}.`,
      rankedNoFish: (name: string, placeOf: string) =>
        `${name} is ranked ${placeOf}.`,
      passes: (name: string, names: string, band: string) =>
        `${name} passes ${names} and takes a ${band} place.`,
      dropsBelow: (name: string, names: string, band: string) =>
        `${name} drops below ${names} into ${band}.`,
      movesUp: (name: string, band: string) => `${name} moves up to ${band}.`,
      movesDown: (name: string, band: string) => `${name} drops to ${band}.`,
      noFish: (placeOf: string) =>
        `Now ${placeOf}. No fish until four players are ranked.`,
      otherUp: (name: string, band: string) => `${name} moves up to ${band}.`,
      otherBecomes: (name: string, band: string) =>
        `${name} becomes a ${band}.`,
      andMore: (n: number) =>
        plural("en", n, {
          one: "1 more player changes tier.",
          other: "{n} more players change tier.",
        }),
      twoNames: (first: string, last: string) => `${first} and ${last}`,
      nameSeparator: ", ",
    },
    why: (name: string) => `Why? ${name} will see this.`,
    reasons: {
      new_to_group: "New here, known level",
      back_from_injury: "Back from a break",
      plays_above_results: "Playing above this",
      plays_below_results: "Playing below this",
      correcting_a_mistake: "Fixing a mistake",
    },
    notePlaceholder: "Add a note (optional)",
    noteLabel: "Note",
    saveMoveFirst: "Move the points first",
    savePickReason: "Pick a reason to save",
    save: (delta: string) => `Save ${delta} and log it`,
    saved: (name: string) => `Saved and logged in ${name}’s history`,
    errors: {
      organizerOnly: "Only an organizer of this group can adjust tier points.",
      notYourOwn: "You can’t adjust your own tier points.",
      noTier:
        "This group has no tier. Tiers are for football groups that aren’t verified.",
      notMember: "That player isn’t in this group.",
      reasonRequired: "Pick a reason. The player will see it.",
      noChange: "Move the points first.",
      tooFar: (max: number) =>
        `An adjustment can move tier points by at most ${max}.`,
      belowZero: "Tier points can’t go below zero.",
    },
  },
  history: {
    title: "Points and history",
    menuRow: "Points and history",
    menuHint: "What moved their tier points, game by game",
    groupGames: (n: number) =>
      plural("en", n, {
        one: "1 group game",
        other: "{n} group games",
      }),
    toNextBand: (points: string, band: string) => `${points} to ${band}`,
    whatMovedIt: "What moved it",
    lastCount: (n: number) => `last ${n}`,
    empty:
      "Nothing has moved these points yet. They move after each group game.",
    deltaSpoken: (delta: string) => `${delta} points`,
    game: {
      won: (score: string) => `Won ${score}`,
      drew: (score: string) => `Drew ${score}`,
      lost: (score: string) => `Lost ${score}`,
      played: "Group game",
      rated: (title: string, rating: string) => `${title}, rated ${rating}`,
      parts: (date: string, result: string, performance: string) =>
        `${date}. Result ${result}, performance ${performance}`,
      resultOnly: (date: string, result: string) => `${date}. Result ${result}`,
    },
    adjustment: {
      title: "Set by an organizer",
      detail: (date: string, from: string, to: string) =>
        `${date}, ${from} to ${to}`,
      byline: (name: string, reason: string) => `${name}, ${reason}`,
      bylineNote: (name: string, reason: string, note: string) =>
        `${name}, ${reason}: “${note}”`,
      quote: (name: string, note: string) => `${name}: “${note}”`,
      you: "You",
      someone: "An organizer",
    },
    footnote: {
      other: (name: string) =>
        `${name} sees this same list. Nothing here changes a Temba Level.`,
      self: "Your group’s organizers see this same list. Nothing here changes your Temba Level.",
    },
    unnamed: "Player",
    loadFailed: "Couldn’t load points and history",
    errors: {
      forbidden:
        "Only the player and this group’s organizers can see these points.",
    },
  },
};
