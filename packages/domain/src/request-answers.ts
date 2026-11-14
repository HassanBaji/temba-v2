import {
  approvalSeats,
  compareWaitingRequests,
  expectedSeatOutcome,
  isSeatRequest,
  type RequestDecision,
  type SeatOutcome,
  type WaitingRequest,
  type WaitingRequestGame,
} from "./waiting-requests";

/** How long an answer waits, with Undo, before it is sent (ADR-0087). */
export const REQUEST_UNDO_WINDOW_MS = 6000;

/** How many waiting requests Notifications shows before its `N more requests` row. */
export const NOTIFICATIONS_REQUEST_LIMIT = 3;

/**
 * Where an answer given in this session stands: `held` while Undo is open,
 * `sending` on its way to the door, `sent` once the door took it, and
 * `settled` once the waiting list was read again after that.
 */
export type RequestAnswerPhase = "held" | "sending" | "sent" | "settled";

export type RequestAnswer = {
  decision: RequestDecision;
  phase: RequestAnswerPhase;
  answeredAt: number;
  /** What the door did about a seat; unknown until the answer is sent. */
  outcome?: SeatOutcome;
};

/** An answer with the request as it read when it was answered. */
export type AnsweredRequest = {
  request: WaitingRequest;
  answer: RequestAnswer;
};

export type AnsweredRequests = ReadonlyMap<string, AnsweredRequest>;

export type RequestRow = {
  request: WaitingRequest;
  answer: RequestAnswer | null;
};

export function canUndoAnswer(answer: RequestAnswer | null) {
  return answer?.phase === "held";
}

function isUnsent(answer: RequestAnswer | null) {
  return answer?.phase === "held" || answer?.phase === "sending";
}

/** A settled answer whose request the list shows again: the requester asked again. */
function askedAgain(entry: AnsweredRequest, waitingIds: ReadonlySet<string>) {
  return entry.answer.phase === "settled" && waitingIds.has(entry.request.id);
}

/**
 * The server's waiting list merged with this session's answers, most urgent
 * first. An answered request keeps its place as a line, from the snapshot
 * taken when it was answered, after the server stops listing it. A request
 * asked again after its answer settled waits again.
 */
export function requestRows(
  waiting: readonly WaitingRequest[],
  answered: AnsweredRequests,
): RequestRow[] {
  const waitingIds = new Set(waiting.map((request) => request.id));
  const lines = [...answered.values()].filter(
    (entry) => !askedAgain(entry, waitingIds),
  );
  const lineIds = new Set(lines.map((entry) => entry.request.id));
  const rows: RequestRow[] = [
    ...waiting
      .filter((request) => !lineIds.has(request.id))
      .map((request) => ({ request, answer: null })),
    ...lines,
  ];
  return rows.sort((a, b) => compareWaitingRequests(a.request, b.request));
}

export function waitingRequestsOf(rows: readonly RequestRow[]) {
  return rows.filter((row) => row.answer == null).map((row) => row.request);
}

/**
 * Home: one full request, the most urgent, under the line the last answer
 * left while it is not sent yet. The section leaves Home once nothing waits
 * and every answer is sent.
 */
export function homeRequestsView(rows: readonly RequestRow[]) {
  const [current, ...rest] = waitingRequestsOf(rows);
  const last = rows
    .filter((row) => isUnsent(row.answer))
    .sort(
      (a, b) => (b.answer?.answeredAt ?? 0) - (a.answer?.answeredAt ?? 0),
    )[0];
  return {
    visible: current != null || last != null,
    waitingCount: current ? rest.length + 1 : 0,
    current: current ?? null,
    rest,
    last: last ?? null,
  };
}

/**
 * Notifications: every answer stays as a line beside the most urgent requests
 * still waiting. The section goes once nothing waits and every answer is sent.
 */
export function notificationsRequestsView(rows: readonly RequestRow[]) {
  let shown = 0;
  const visibleRows = rows.filter(
    (row) => row.answer != null || shown++ < NOTIFICATIONS_REQUEST_LIMIT,
  );
  const waitingCount = waitingRequestsOf(rows).length;
  return {
    visible: waitingCount > 0 || rows.some((row) => isUnsent(row.answer)),
    waitingCount,
    rows: visibleRows,
    moreCount: Math.max(0, waitingCount - NOTIFICATIONS_REQUEST_LIMIT),
  };
}

/** Rows on a Game's Requests queue: its Level range requests and Seat holds. */
export function gameRequestRows(rows: readonly RequestRow[], gameId: string) {
  return rows.filter(
    (row) => isSeatRequest(row.request) && row.request.game.id === gameId,
  );
}

/** Rows on a Group's Members tab: its join requests, with or without a Seat hold. */
export function groupRequestRows(rows: readonly RequestRow[], groupId: string) {
  return rows.filter(
    (row) =>
      row.request.kind !== "level_range" && row.request.group.id === groupId,
  );
}

/** What a Game's Requests queue heading counts, from the rows still waiting. */
export function waitingQueueCounts(rows: readonly RequestRow[]) {
  const waiting = waitingRequestsOf(rows);
  const seatHolds = waiting.filter(
    (request) => request.kind === "seat_hold",
  ).length;
  return { levelRange: waiting.length - seatHolds, seatHolds };
}

/** The seat an approved row took, as the door said, or as expected until it is sent. */
function approvedSeatOutcome(row: RequestRow): SeatOutcome {
  if (row.answer?.decision !== "approve") {
    return null;
  }
  return row.answer.outcome === undefined
    ? expectedSeatOutcome(row.request)
    : row.answer.outcome;
}

/**
 * The Game as it stood before this session's first answer on it, so the seats
 * counted on top of it are not counted twice once the server's list catches up.
 */
function gameBeforeAnswers(
  game: WaitingRequestGame,
  rows: readonly RequestRow[],
): WaitingRequestGame {
  const first = rows
    .filter((row) => row.answer != null)
    .sort(
      (a, b) => (a.answer?.answeredAt ?? 0) - (b.answer?.answeredAt ?? 0),
    )[0];
  return first && isSeatRequest(first.request) ? first.request.game : game;
}

export type GameRequestsSection = {
  game: WaitingRequestGame;
  rows: RequestRow[];
  waiting: WaitingRequest[];
  /** Waiting requests whose approval takes a seat. */
  heldSeats: number;
  /** Seats this session's approvals took on top of `game.registeredCount`. */
  approvedSeats: number;
};

function gameSection(
  game: WaitingRequestGame,
  rows: RequestRow[],
): GameRequestsSection {
  const waiting = waitingRequestsOf(rows);
  return {
    game: gameBeforeAnswers(game, rows),
    rows,
    waiting,
    heldSeats: waiting.filter(approvalSeats).length,
    approvedSeats: rows.filter(
      (row) => approvedSeatOutcome(row) === "registered",
    ).length,
  };
}

/** All requests: seat rows by Game, in the order their most urgent request comes, then Group join rows. */
export function allRequestsView(rows: readonly RequestRow[]) {
  const byGame = new Map<
    string,
    { game: WaitingRequestGame; rows: RequestRow[] }
  >();
  const groups: RequestRow[] = [];
  for (const row of rows) {
    if (!isSeatRequest(row.request)) {
      groups.push(row);
      continue;
    }
    const { game } = row.request;
    const entry = byGame.get(game.id);
    if (entry) {
      entry.rows.push(row);
      // A waiting row carries the server's latest read of the Game.
      if (row.answer == null) {
        entry.game = game;
      }
    } else {
      byGame.set(game.id, { game, rows: [row] });
    }
  }
  const games = [...byGame.values()].map((entry) =>
    gameSection(entry.game, entry.rows),
  );
  return {
    games,
    groups,
    gameWaitingCount: games.reduce(
      (total, section) => total + section.waiting.length,
      0,
    ),
    groupWaitingCount: waitingRequestsOf(groups).length,
    empty: rows.length === 0,
  };
}

export type RequestDoor =
  | "approveLevelRange"
  | "rejectLevelRange"
  | "approveJoin"
  | "rejectJoin";

/** A Level range request is the Game's to decide; a Seat hold and a Group join request are the Group's. */
export function requestDoor(
  request: WaitingRequest,
  decision: RequestDecision,
): RequestDoor {
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

export type RequestAnswerQueueDeps<Timer> = {
  /** Calls the door; resolves with what it did about a seat. */
  send: (
    request: WaitingRequest,
    decision: RequestDecision,
  ) => Promise<SeatOutcome>;
  /** Reads the waiting list, and what else the answer changed, again. */
  refresh: (request: WaitingRequest) => Promise<unknown>;
  onChange: (answered: AnsweredRequests) => void;
  onFailed: (request: WaitingRequest) => void;
  setTimer: (run: () => void, ms: number) => Timer;
  clearTimer: (timer: Timer) => void;
  now: () => number;
};

/**
 * This session's answers and their Undo windows (ADR-0087). An answer is held
 * for `REQUEST_UNDO_WINDOW_MS`, then sent; `flush` sends what is held at once.
 * A failed send drops the answer, so the request waits again.
 */
export function createRequestAnswerQueue<Timer>(
  deps: RequestAnswerQueueDeps<Timer>,
) {
  let answered: AnsweredRequests = new Map();
  const timers = new Map<string, Timer>();

  function set(next: Map<string, AnsweredRequest>) {
    answered = next;
    deps.onChange(answered);
  }

  function setPhase(
    requestId: string,
    phase: RequestAnswerPhase,
    outcome?: SeatOutcome,
  ) {
    const entry = answered.get(requestId);
    if (!entry) {
      return;
    }
    const answer =
      outcome === undefined
        ? { ...entry.answer, phase }
        : { ...entry.answer, phase, outcome };
    set(new Map(answered).set(requestId, { ...entry, answer }));
  }

  function drop(requestId: string) {
    const next = new Map(answered);
    next.delete(requestId);
    set(next);
  }

  function stopTimer(requestId: string) {
    const timer = timers.get(requestId);
    if (timer !== undefined) {
      deps.clearTimer(timer);
      timers.delete(requestId);
    }
  }

  async function send(requestId: string) {
    const entry = answered.get(requestId);
    if (entry?.answer.phase !== "held") {
      return;
    }
    stopTimer(requestId);
    setPhase(requestId, "sending");
    const { request } = entry;
    let outcome: SeatOutcome;
    try {
      outcome = await deps.send(request, entry.answer.decision);
    } catch {
      drop(requestId);
      deps.onFailed(request);
      void deps.refresh(request).catch(() => undefined);
      return;
    }
    setPhase(requestId, "sent", outcome);
    try {
      await deps.refresh(request);
    } catch {
      return;
    }
    if (answered.get(requestId)?.answer.phase === "sent") {
      setPhase(requestId, "settled");
    }
  }

  return {
    answered: () => answered,
    answer: (
      requests: readonly WaitingRequest[],
      decision: RequestDecision,
    ) => {
      const next = new Map(answered);
      const fresh = requests.filter((request) => {
        const phase = next.get(request.id)?.answer.phase;
        return phase === undefined || phase === "settled";
      });
      if (fresh.length === 0) {
        return;
      }
      const answeredAt = deps.now();
      for (const request of fresh) {
        next.set(request.id, {
          request,
          answer: { decision, phase: "held", answeredAt },
        });
        timers.set(
          request.id,
          deps.setTimer(() => {
            timers.delete(request.id);
            void send(request.id);
          }, REQUEST_UNDO_WINDOW_MS),
        );
      }
      set(next);
    },
    undo: (requestId: string) => {
      if (!canUndoAnswer(answered.get(requestId)?.answer ?? null)) {
        return;
      }
      stopTimer(requestId);
      drop(requestId);
    },
    flush: () => {
      for (const entry of [...answered.values()]) {
        if (entry.answer.phase === "held") {
          void send(entry.request.id);
        }
      }
    },
  };
}

export type RequestAnswerQueue = ReturnType<
  typeof createRequestAnswerQueue<unknown>
>;
