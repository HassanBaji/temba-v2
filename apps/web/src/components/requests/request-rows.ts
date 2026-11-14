import {
  groupWaitingRequests,
  isSeatRequest,
  type RequestRow,
  type WaitingRequest,
  type WaitingRequestGame,
} from "@repo/domain/waiting-requests";

export function waitingOf(rows: readonly RequestRow[]): WaitingRequest[] {
  return rows.filter((row) => row.answer == null).map((row) => row.request);
}

type SeatRequestRow = RequestRow<
  Extract<WaitingRequest, { game: WaitingRequestGame }>
>;

/** Seat requests on one Game: its Level range requests and its Seat holds. */
export function gameRequestRows(
  rows: readonly RequestRow[],
  gameId: string,
): SeatRequestRow[] {
  return rows.filter(
    (row): row is SeatRequestRow =>
      isSeatRequest(row.request) && row.request.game.id === gameId,
  );
}

/** Requests to join one Group, with or without a held seat. */
export function groupRequestRows(rows: readonly RequestRow[], groupId: string) {
  return rows.filter(
    (row) =>
      row.request.kind !== "level_range" && row.request.group.id === groupId,
  );
}

export type GameRequestsSection = {
  game: WaitingRequestGame;
  rows: RequestRow[];
  waiting: WaitingRequest[];
  approved: number;
};

/**
 * The Game as it stood before this session's first answer on it, so the
 * approvals counted on top of it are not counted twice once the server's
 * list catches up.
 */
function gameBeforeAnswers(
  game: WaitingRequestGame,
  rows: readonly RequestRow[],
): WaitingRequestGame {
  let first: RequestRow | null = null;
  for (const row of rows) {
    if (
      row.answer &&
      (first?.answer == null || row.answer.answeredAt < first.answer.answeredAt)
    ) {
      first = row;
    }
  }
  return first && isSeatRequest(first.request) ? first.request.game : game;
}

/** All requests: seat requests by Game, then Group join requests. */
export function allRequestsView(rows: readonly RequestRow[]) {
  const byId = new Map(rows.map((row) => [row.request.id, row]));
  const rowsOf = (requests: readonly WaitingRequest[]) =>
    requests.flatMap((request) => {
      const row = byId.get(request.id);
      return row ? [row] : [];
    });
  const grouped = groupWaitingRequests(rows.map((row) => row.request));
  const games: GameRequestsSection[] = grouped.games.map(
    ({ game, requests }) => {
      const gameRows = rowsOf(requests);
      return {
        game: gameBeforeAnswers(game, gameRows),
        rows: gameRows,
        waiting: waitingOf(gameRows),
        approved: gameRows.filter((row) => row.answer?.decision === "approve")
          .length,
      };
    },
  );
  const groups = rowsOf(grouped.groups);
  return {
    games,
    groups,
    gamesWaiting: games.reduce(
      (total, section) => total + section.waiting.length,
      0,
    ),
    groupsWaiting: waitingOf(groups).length,
  };
}
