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
};
