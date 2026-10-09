import { hubGameCardPlan, hubWaitlistJoinCall } from "@repo/domain/game-card";
import type { HubGameRow } from "@repo/domain/hub-game-row";
import { isTournamentMatchRow } from "@repo/domain/tournament-card";
import { isDrawnTournament } from "@repo/domain/tournament-rounds";

export type GamesTab = "my-games" | "history";

export type HubItem =
  | { kind: "match"; key: string; game: HubGameRow }
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
  game: Pick<HubGameRow, "id" | "format">,
): JoinRequest {
  return hubWaitlistJoinCall(game.format) === "register"
    ? { door: "register", input: { gameId: game.id } }
    : { door: "registerSeat", input: { gameId: game.id } };
}

export function registerRequest(gameId: string): JoinRequest {
  return { door: "register", input: { gameId } };
}

export function gamePath(gameId: string) {
  return `/games/${gameId}`;
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
