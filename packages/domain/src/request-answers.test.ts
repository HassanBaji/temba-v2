import { describe, expect, it } from "vitest";

import {
  allRequestsView,
  canUndoAnswer,
  createRequestAnswerQueue,
  gameRequestRows,
  groupRequestRows,
  homeRequestsView,
  notificationsRequestsView,
  REQUEST_UNDO_WINDOW_MS,
  requestDoor,
  requestRows,
  requestTouches,
  waitingQueueCounts,
  type AnsweredRequests,
  type RequestAnswerPhase,
} from "./request-answers";
import type {
  RequestDecision,
  SeatOutcome,
  WaitingRequest,
  WaitingRequestGame,
} from "./waiting-requests";

const NOW = new Date("2026-11-11T09:00:00.000Z").getTime();
const HOUR = 60 * 60 * 1000;

const FRIDAY_GAME: WaitingRequestGame = {
  id: "game-fri",
  sport: "football",
  startsAt: "2026-11-13T16:00:00.000Z",
  groupId: "group-kff",
  groupName: "Karbabad Friday Football",
  levelMinTenths: 25,
  levelMaxTenths: 41,
  registeredCount: 11,
  capacity: 14,
};

const TUESDAY_GAME: WaitingRequestGame = {
  ...FRIDAY_GAME,
  id: "game-tue",
  sport: "padel",
  startsAt: "2026-11-17T16:00:00.000Z",
  groupId: "group-tnp",
  groupName: "Tuesday Night Padel",
  registeredCount: 2,
  capacity: 4,
};

function base(id: string, name: string, hoursAgo: number) {
  return {
    id,
    createdAt: new Date(NOW - hoursAgo * HOUR),
    user: { id: `u-${id}`, name, image: null },
    levelTenths: 30,
  };
}

const omar: WaitingRequest = {
  ...base("ot", "Omar T", 3),
  kind: "level_range",
  game: FRIDAY_GAME,
  requesterInGroup: true,
  pickedSeat: true,
};

const jassim: WaitingRequest = {
  ...base("ja", "Jassim A", 3),
  kind: "seat_hold",
  game: FRIDAY_GAME,
  seatHeldUntil: new Date(NOW + 21 * HOUR),
  group: { id: "group-kff", name: "Karbabad Friday Football" },
  invitedBy: null,
  invitedByViewer: false,
};

const faisal: WaitingRequest = {
  ...base("fj", "Faisal J", 24),
  kind: "level_range",
  game: TUESDAY_GAME,
  requesterInGroup: true,
  pickedSeat: false,
};

const jawad: WaitingRequest = {
  ...base("jr", "Jawad R", 48),
  kind: "group_join",
  group: { id: "group-tnp", name: "Tuesday Night Padel", sport: "padel" },
  source: "invite_link",
  invitedBy: null,
  invitedByViewer: false,
  note: null,
  gamesWithMembers: 3,
};

const mahdi: WaitingRequest = {
  ...base("ms", "Mahdi S", 72),
  kind: "group_join",
  group: {
    id: "group-kff",
    name: "Karbabad Friday Football",
    sport: "football",
  },
  source: "group_page",
  invitedBy: null,
  invitedByViewer: false,
  note: null,
  gamesWithMembers: 0,
};

const ALL = [omar, jassim, faisal, jawad, mahdi];

function answered(
  entries: [
    WaitingRequest,
    RequestDecision,
    RequestAnswerPhase,
    number,
    SeatOutcome?,
  ][],
): AnsweredRequests {
  return new Map(
    entries.map(([request, decision, phase, answeredAt, outcome]) => [
      request.id,
      {
        request,
        answer:
          outcome === undefined
            ? { decision, phase, answeredAt }
            : { decision, phase, answeredAt, outcome },
      },
    ]),
  );
}

function ids(rows: readonly { request: WaitingRequest }[]) {
  return rows.map((row) => row.request.id);
}

describe("requestRows", () => {
  it("keeps an answered request in its place after the server drops it", () => {
    const rows = requestRows(
      [omar, faisal, jawad, mahdi],
      answered([[jassim, "approve", "settled", 1]]),
    );
    expect(
      rows.map((row) => [row.request.id, row.answer?.decision ?? null]),
    ).toEqual([
      ["ja", "approve"],
      ["ot", null],
      ["fj", null],
      ["ms", null],
      ["jr", null],
    ]);
  });

  it("hides a request the server still lists while its answer is not settled", () => {
    const rows = requestRows(ALL, answered([[jawad, "decline", "sent", 1]]));
    expect(rows.find((row) => row.request.id === "jr")?.answer?.decision).toBe(
      "decline",
    );
  });

  it("lets a request wait again when it is asked again after its answer settled", () => {
    const rows = requestRows(ALL, answered([[jawad, "decline", "settled", 1]]));
    expect(rows.find((row) => row.request.id === "jr")?.answer).toBeNull();
    expect(rows).toHaveLength(ALL.length);
  });
});

describe("homeRequestsView", () => {
  it("shows one request under the last answer that is not sent", () => {
    const view = homeRequestsView(
      requestRows(
        ALL,
        answered([
          [jassim, "approve", "held", 1],
          [omar, "decline", "sending", 2],
        ]),
      ),
    );
    expect(view.visible).toBe(true);
    expect(view.waitingCount).toBe(3);
    expect(view.current?.id).toBe("fj");
    expect(view.rest.map((request) => request.id)).toEqual(["ms", "jr"]);
    expect(view.last?.request.id).toBe("ot");
  });

  it("leaves Home once nothing waits and every answer is sent", () => {
    const sent = answered(
      ALL.map((request, index) => [request, "approve", "sent", index]),
    );
    const view = homeRequestsView(requestRows([], sent));
    expect(view.visible).toBe(false);
    expect(view.last).toBeNull();
  });
});

describe("notificationsRequestsView", () => {
  it("shows every answer and the three most urgent waiting", () => {
    const view = notificationsRequestsView(
      requestRows(ALL, answered([[jassim, "approve", "held", 1]])),
    );
    expect(ids(view.rows)).toEqual(["ja", "ot", "fj", "ms"]);
    expect(view.waitingCount).toBe(4);
    expect(view.moreCount).toBe(1);
    expect(view.visible).toBe(true);
  });

  it("goes once nothing waits and every answer is sent", () => {
    const view = notificationsRequestsView(
      requestRows([], answered([[jassim, "approve", "settled", 1]])),
    );
    expect(view.visible).toBe(false);
  });
});

describe("rows by Game and by Group", () => {
  const rows = requestRows(ALL, new Map());

  it("gives a Game its Level range requests and Seat holds", () => {
    expect(ids(gameRequestRows(rows, "game-fri"))).toEqual(["ja", "ot"]);
  });

  it("counts a Game's waiting Level range requests and Seat holds apart", () => {
    const answeredRows = requestRows(
      ALL,
      answered([[omar, "approve", "held", 1]]),
    );
    expect(waitingQueueCounts(gameRequestRows(rows, "game-fri"))).toEqual({
      levelRange: 1,
      seatHolds: 1,
    });
    expect(
      waitingQueueCounts(gameRequestRows(answeredRows, "game-fri")),
    ).toEqual({ levelRange: 0, seatHolds: 1 });
  });

  it("gives a Group its join requests, held seat or not", () => {
    expect(ids(groupRequestRows(rows, "group-kff"))).toEqual(["ja", "ms"]);
  });
});

describe("allRequestsView", () => {
  it("groups seat rows by Game in urgency order, then Group join rows", () => {
    const view = allRequestsView(requestRows(ALL, new Map()));
    expect(view.games.map((section) => section.game.id)).toEqual([
      "game-fri",
      "game-tue",
    ]);
    expect(ids(view.games[0]?.rows ?? [])).toEqual(["ja", "ot"]);
    expect(ids(view.groups)).toEqual(["ms", "jr"]);
    expect(view.gameWaitingCount).toBe(3);
    expect(view.groupWaitingCount).toBe(2);
    expect(view.empty).toBe(false);
  });

  it("counts as held only the requests whose approval takes a seat", () => {
    const view = allRequestsView(requestRows(ALL, new Map()));
    expect(view.games[0]).toMatchObject({ heldSeats: 2, approvedSeats: 0 });
    expect(view.games[1]).toMatchObject({ heldSeats: 0, approvedSeats: 0 });
  });

  it("adds an approval's seat once, from the Game as it stood before the answer", () => {
    const after = { ...FRIDAY_GAME, registeredCount: 12 };
    const view = allRequestsView(
      requestRows(
        [{ ...omar, game: after }],
        answered([[jassim, "approve", "settled", 1, "registered"]]),
      ),
    );
    expect(view.games[0]).toMatchObject({
      game: { registeredCount: 11 },
      heldSeats: 1,
      approvedSeats: 1,
    });
  });

  it("adds no seat for an approval that only waived the Level range, or went to the Waitlist", () => {
    const view = allRequestsView(
      requestRows(
        [],
        answered([
          [faisal, "approve", "held", 1],
          [omar, "approve", "sent", 2, "waitlisted"],
          [jassim, "decline", "sent", 3],
        ]),
      ),
    );
    expect(view.games.map((section) => section.approvedSeats)).toEqual([0, 0]);
  });

  it("is empty with no rows", () => {
    expect(allRequestsView([]).empty).toBe(true);
  });
});

describe("requestDoor and requestTouches", () => {
  it("sends a Level range request to the Game and the rest to the Group", () => {
    expect(requestDoor(omar, "approve")).toBe("approveLevelRange");
    expect(requestDoor(omar, "decline")).toBe("rejectLevelRange");
    expect(requestDoor(jassim, "approve")).toBe("approveJoin");
    expect(requestDoor(jawad, "decline")).toBe("rejectJoin");
  });

  it("names the Game and Group an answer changes", () => {
    expect(requestTouches(omar)).toEqual({
      gameId: "game-fri",
      groupId: "group-kff",
    });
    expect(requestTouches(jassim)).toEqual({
      gameId: "game-fri",
      groupId: "group-kff",
    });
    expect(requestTouches(jawad)).toEqual({
      gameId: null,
      groupId: "group-tnp",
    });
  });
});

type Sent = {
  request: WaitingRequest;
  decision: RequestDecision;
  resolve: (outcome: SeatOutcome) => void;
  reject: () => void;
};

function harness() {
  const timers = new Map<number, { run: () => void; ms: number }>();
  let nextTimer = 1;
  const sent: Sent[] = [];
  const failed: string[] = [];
  const refreshes: { id: string; resolve: () => void; reject: () => void }[] =
    [];
  let changes = 0;
  const queue = createRequestAnswerQueue<number>({
    send: (request, decision) =>
      new Promise<SeatOutcome>((resolve, reject) => {
        sent.push({
          request,
          decision,
          resolve,
          reject: () => reject(new Error("refused")),
        });
      }),
    refresh: (request) =>
      new Promise<void>((resolve, reject) => {
        refreshes.push({
          id: request.id,
          resolve,
          reject: () => reject(new Error("offline")),
        });
      }),
    onChange: () => {
      changes += 1;
    },
    onFailed: (request) => failed.push(request.id),
    setTimer: (run, ms) => {
      const id = nextTimer++;
      timers.set(id, { run, ms });
      return id;
    },
    clearTimer: (id) => {
      timers.delete(id);
    },
    now: () => NOW,
  });
  return {
    queue,
    sent,
    failed,
    refreshes,
    timers,
    changes: () => changes,
    fireTimers() {
      for (const [id, timer] of [...timers]) {
        timers.delete(id);
        timer.run();
      }
    },
    phaseOf: (id: string) => queue.answered().get(id)?.answer.phase ?? null,
  };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("createRequestAnswerQueue", () => {
  it("holds an answer for the Undo window before sending it", async () => {
    const h = harness();
    h.queue.answer([omar], "approve");
    expect(h.phaseOf("ot")).toBe("held");
    expect(canUndoAnswer(h.queue.answered().get("ot")?.answer ?? null)).toBe(
      true,
    );
    expect([...h.timers.values()].map((timer) => timer.ms)).toEqual([
      REQUEST_UNDO_WINDOW_MS,
    ]);
    expect(h.sent).toHaveLength(0);

    h.fireTimers();
    expect(h.phaseOf("ot")).toBe("sending");
    expect(h.sent.map((entry) => [entry.request.id, entry.decision])).toEqual([
      ["ot", "approve"],
    ]);

    h.sent[0]?.resolve("waitlisted");
    await settle();
    expect(h.queue.answered().get("ot")?.answer).toMatchObject({
      phase: "sent",
      outcome: "waitlisted",
    });

    h.refreshes[0]?.resolve();
    await settle();
    expect(h.phaseOf("ot")).toBe("settled");
  });

  it("undoes a held answer and never sends it", () => {
    const h = harness();
    h.queue.answer([omar], "decline");
    h.queue.undo("ot");
    expect(h.phaseOf("ot")).toBeNull();
    expect(h.timers.size).toBe(0);
    h.fireTimers();
    expect(h.sent).toHaveLength(0);
  });

  it("cannot undo once the answer is on its way", () => {
    const h = harness();
    h.queue.answer([omar], "approve");
    h.fireTimers();
    h.queue.undo("ot");
    expect(h.phaseOf("ot")).toBe("sending");
  });

  it("sends every held answer at once on flush, each once", () => {
    const h = harness();
    h.queue.answer([omar, jassim], "approve");
    h.queue.flush();
    h.queue.flush();
    h.fireTimers();
    expect(h.sent.map((entry) => entry.request.id)).toEqual(["ot", "ja"]);
    expect(h.timers.size).toBe(0);
  });

  it("drops a refused answer so the request waits again, and says so", async () => {
    const h = harness();
    h.queue.answer([jawad], "approve");
    h.queue.flush();
    h.sent[0]?.reject();
    await settle();
    expect(h.phaseOf("jr")).toBeNull();
    expect(h.failed).toEqual(["jr"]);
    expect(h.refreshes.map((entry) => entry.id)).toEqual(["jr"]);
  });

  it("stays sent when the list cannot be read again", async () => {
    const h = harness();
    h.queue.answer([jawad], "decline");
    h.queue.flush();
    h.sent[0]?.resolve(null);
    await settle();
    h.refreshes[0]?.reject();
    await settle();
    expect(h.phaseOf("jr")).toBe("sent");
  });

  it("ignores a second answer until the first settles, then takes a new one", async () => {
    const h = harness();
    h.queue.answer([jawad], "decline");
    h.queue.answer([jawad], "approve");
    expect(h.queue.answered().get("jr")?.answer.decision).toBe("decline");

    h.queue.flush();
    h.sent[0]?.resolve(null);
    await settle();
    h.refreshes[0]?.resolve();
    await settle();

    h.queue.answer([jawad], "approve");
    expect(h.queue.answered().get("jr")?.answer).toMatchObject({
      decision: "approve",
      phase: "held",
    });
  });
});
