import { plural } from "../../plural";

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
  },
};
