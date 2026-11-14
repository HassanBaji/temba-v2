import {
  groupWaitingRequests,
  isSeatRequest,
  type AnsweredRequest,
  type RequestAnswer,
  type RequestDecision,
  type RequestRow,
  type WaitingRequest,
  type WaitingRequestGame,
} from "@repo/domain/waiting-requests";

export type AnsweredMap = ReadonlyMap<string, AnsweredRequest>;

export function withAnswer(
  answered: AnsweredMap,
  request: WaitingRequest,
  decision: RequestDecision,
  now: number,
): AnsweredMap {
  if (answered.has(request.id)) {
    return answered;
  }
  const next = new Map(answered);
  next.set(request.id, {
    request,
    answer: { decision, committed: false, answeredAt: now },
  });
  return next;
}

export function withoutAnswer(
  answered: AnsweredMap,
  requestId: string,
): AnsweredMap {
  if (!answered.has(requestId)) {
    return answered;
  }
  const next = new Map(answered);
  next.delete(requestId);
  return next;
}

export function withCommitted(
  answered: AnsweredMap,
  requestId: string,
): AnsweredMap {
  const entry = answered.get(requestId);
  if (!entry || entry.answer.committed) {
    return answered;
  }
  const next = new Map(answered);
  next.set(requestId, {
    ...entry,
    answer: { ...entry.answer, committed: true },
  });
  return next;
}

/** Answers still waiting out their Undo window: not sent, not on their way. */
export function unsentAnswerIds(
  answered: AnsweredMap,
  sending: ReadonlySet<string>,
): string[] {
  return [...answered.values()]
    .filter(
      (entry) => !entry.answer.committed && !sending.has(entry.request.id),
    )
    .map((entry) => entry.request.id);
}

export function canUndoAnswer(
  requestId: string,
  answer: RequestAnswer | null,
  sending: ReadonlySet<string>,
) {
  return answer != null && !answer.committed && !sending.has(requestId);
}

export type RequestMutation =
  | "approveLevelRange"
  | "rejectLevelRange"
  | "approveJoin"
  | "rejectJoin";

/** A Level range request is the Game's to decide; a Seat hold and a Group join request are the Group's. */
export function requestMutation(
  request: WaitingRequest,
  decision: RequestDecision,
): RequestMutation {
  if (request.kind === "level_range") {
    return decision === "approve" ? "approveLevelRange" : "rejectLevelRange";
  }
  return decision === "approve" ? "approveJoin" : "rejectJoin";
}

/** The Game and the Group whose screens read this request once it is answered. */
export function requestTouches(request: WaitingRequest): {
  gameId: string | null;
  groupId: string | null;
} {
  if (request.kind === "level_range") {
    return { gameId: request.game.id, groupId: request.game.groupId };
  }
  if (request.kind === "seat_hold") {
    return { gameId: request.game.id, groupId: request.group.id };
  }
  return { gameId: null, groupId: request.group.id };
}

/** Rows on a Game's Requests queue: its Level range requests and Seat holds. */
export function gameRequestRows(
  rows: readonly RequestRow[],
  gameId: string,
): RequestRow[] {
  return rows.filter(
    (row) => isSeatRequest(row.request) && row.request.game.id === gameId,
  );
}

/** Rows on a Group's Members tab: its join requests, with or without a Seat hold. */
export function groupRequestRows(
  rows: readonly RequestRow[],
  groupId: string,
): RequestRow[] {
  return rows.filter(
    (row) =>
      row.request.kind !== "level_range" && row.request.group.id === groupId,
  );
}

export function waitingRows(rows: readonly RequestRow[]) {
  return rows.filter((row) => row.answer == null);
}

/** What the Game queue heading counts, from the rows still waiting. */
export function waitingQueueCounts(rows: readonly RequestRow[]) {
  const waiting = waitingRows(rows);
  const seatHolds = waiting.filter(
    (row) => row.request.kind === "seat_hold",
  ).length;
  return { levelRange: waiting.length - seatHolds, seatHolds };
}

export type AllRequestsGame = {
  game: WaitingRequestGame;
  rows: RequestRow[];
  waiting: WaitingRequest[];
  approved: number;
};

/**
 * Approvals the Game's count does not show yet. An unsent one never does; a
 * sent one does once the server's count has moved past the snapshot it was
 * answered from.
 */
export function approvedNotCounted(
  game: WaitingRequestGame,
  rows: readonly RequestRow[],
) {
  return rows.filter((row) => {
    if (row.answer?.decision !== "approve" || !isSeatRequest(row.request)) {
      return false;
    }
    return (
      !row.answer.committed ||
      row.request.game.registeredCount >= game.registeredCount
    );
  }).length;
}

/** All requests: seat rows by Game, then Group join rows, each with what still waits. */
export function allRequestsView(rows: readonly RequestRow[]) {
  const byId = new Map(rows.map((row) => [row.request.id, row]));
  const rowOf = (request: WaitingRequest) => byId.get(request.id)!;
  const grouped = groupWaitingRequests(rows.map((row) => row.request));
  const games: AllRequestsGame[] = grouped.games.map((entry) => {
    const gameRows = entry.requests.map(rowOf);
    return {
      game: entry.game,
      rows: gameRows,
      waiting: waitingRows(gameRows).map((row) => row.request),
      approved: approvedNotCounted(entry.game, gameRows),
    };
  });
  const groups = grouped.groups.map(rowOf);
  return {
    games,
    groups,
    gameWaitingCount: games.reduce(
      (total, game) => total + game.waiting.length,
      0,
    ),
    groupWaitingCount: waitingRows(groups).length,
    empty: rows.length === 0,
  };
}
