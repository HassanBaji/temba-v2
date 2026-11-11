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
};
