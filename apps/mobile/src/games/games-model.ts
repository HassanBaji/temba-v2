import { hubGameCardPlan, hubWaitlistJoinCall } from "@repo/domain/game-card";
import type { HubGameRow } from "@repo/domain/hub-game-row";
import { isTournamentMatchRow } from "@repo/domain/tournament-card";
import { isDrawnTournament } from "@repo/domain/tournament-rounds";

export type GamesTab = "my-games" | "history";

export type HubItem =
  | { kind: "match"; key: string; game: HubGameRow }
  | { kind: "football"; key: string; game: HubGameRow }
  | { kind: "tournament"; key: string; game: HubGameRow }
  | {
      kind: "game";
      key: string;
      game: HubGameRow;
      plan: ReturnType<typeof hubGameCardPlan<HubGameRow>>;
    };

export function hubItems(rows: readonly HubGameRow[]): HubItem[] {
  return rows.map((game) => {
    if (isTournamentMatchRow(game)) {
      return { kind: "match", key: game.matchId ?? game.id, game };
    }
    if (isDrawnTournament(game.format, game.poolCount, game.tournamentShape)) {
      return { kind: "tournament", key: game.id, game };
    }
    if (game.football) {
      return { kind: "football", key: game.id, game };
    }
    return {
      kind: "game",
      key: game.matchId ?? game.id,
      game,
      plan: hubGameCardPlan(game),
    };
  });
}

export type JoinRequest =
  | {
      door: "registerSeat";
      input: {
        gameId: string;
        sideIndex?: number;
        position?: "left" | "right";
      };
    }
  | { door: "register"; input: { gameId: string } };

export function seatJoinRequest(
  gameId: string,
  sideIndex: number,
  position: "left" | "right",
): JoinRequest {
  return { door: "registerSeat", input: { gameId, sideIndex, position } };
}

export function waitlistJoinRequest(
  game: Pick<HubGameRow, "id" | "format"> & Partial<Pick<HubGameRow, "sport">>,
): JoinRequest {
  return hubWaitlistJoinCall(game.format, game.sport) === "register"
    ? { door: "register", input: { gameId: game.id } }
    : { door: "registerSeat", input: { gameId: game.id } };
}

export function registerRequest(gameId: string): JoinRequest {
  return { door: "register", input: { gameId } };
}

export function gamePath(gameId: string) {
  return `/games/${gameId}`;
}

export function footballJoinPath(gameId: string) {
  return `/games/${gameId}?intent=join`;
}

export function footballScorePath(gameId: string) {
  return `/games/${gameId}/score`;
}

export type SportFilter = "all" | "padel" | "football";

export const SPORT_FILTERS: { key: SportFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "padel", label: "Padel" },
  { key: "football", label: "Football" },
];

export function filterBySport<T extends { sport: string | null }>(
  rows: readonly T[],
  filter: SportFilter,
): T[] {
  if (filter === "all") {
    return [...rows];
  }
  return rows.filter((row) => (row.sport ?? "padel") === filter);
}

export type FootballSection = "result" | "open" | "teams" | "full";

export const FOOTBALL_SECTIONS: {
  key: FootballSection;
  title: string;
  meta: string;
}[] = [
  {
    key: "result",
    title: "Needs your confirmation",
    meta: "score in or missing",
  },
  { key: "open", title: "Seats open", meta: "teams not set" },
  { key: "teams", title: "Teams set", meta: "see your team" },
  { key: "full", title: "Full", meta: "waitlist open" },
];

/** A played Game the viewer lined up in still needs its Score agreed. */
export function footballAwaitsResult(row: HubGameRow, now: Date) {
  const football = row.football;
  if (!football || football.matchStatus === "completed") {
    return false;
  }
  if (football.needsViewerConfirmation) {
    return true;
  }
  const played =
    row.windowEnd != null && row.windowEnd.getTime() < now.getTime();
  return (
    played &&
    football.score == null &&
    football.sides != null &&
    football.viewer.sideIndex != null
  );
}

export function footballSection(row: HubGameRow, now: Date): FootballSection {
  if (footballAwaitsResult(row, now)) {
    return "result";
  }
  if (row.football?.sides) {
    return "teams";
  }
  return row.registrationStatus === "full" ? "full" : "open";
}

export function footballSections(rows: readonly HubGameRow[], now: Date) {
  return FOOTBALL_SECTIONS.map((section) => ({
    ...section,
    rows: rows.filter(
      (row) => row.football && footballSection(row, now) === section.key,
    ),
  })).filter((section) => section.rows.length > 0);
}

export function historyEmptyCopy() {
  return {
    title: "No Match history yet",
    description: "Completed Games you played in show up here.",
  };
}

export function myGamesEmptyCopy() {
  return {
    title: "No Games yet",
    description: "Games you create or join show up here.",
  };
}

export function tabCount(count: number | undefined) {
  return count != null && count > 0 ? count : null;
}
