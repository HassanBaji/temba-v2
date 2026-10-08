import { formatWinRate } from "./win-rate";

export type PlayerOverallInput = {
  played: number;
  won: number;
  lost: number;
  drawn: number;
  setsWon: number;
  /** Scored Sets, a drawn Set included. */
  setsPlayed: number;
};

export type PlayerOverallTile = { label: string; value: string };

export type PlayerOverallView = {
  title: string;
  scope: string;
  tiles: PlayerOverallTile[];
};

export const PLAYER_PROFILE_REFUSED = {
  title: "This profile isn't available",
  description: "You can see people you share a Group or a Game with.",
} as const;

/** Group member rows open Player profiles only for the Group's members. */
export function groupMemberRowsLink(membership: unknown) {
  return membership != null;
}

export function playerHeaderSubtitle(venue: { name: string } | null) {
  return venue ? `Padel, plays at ${venue.name}` : "Padel";
}

export function overallView(input: PlayerOverallInput): PlayerOverallView {
  return {
    title: "Overall",
    scope: "All time",
    tiles: [
      { label: "Matches", value: String(input.played) },
      { label: "Won", value: String(input.won) },
      { label: "Win rate", value: formatWinRate(input.won, input.played) },
      {
        label: "Sets won",
        value: formatWinRate(input.setsWon, input.setsPlayed),
      },
    ],
  };
}
