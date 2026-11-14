import assert from "node:assert/strict";
import type {
  RequestRow,
  WaitingRequest,
  WaitingRequestGame,
} from "@repo/domain/waiting-requests";
import { describe, it } from "vitest";

import {
  allRequestsView,
  approvedNotCounted,
  canUndoAnswer,
  gameRequestRows,
  groupRequestRows,
  requestMutation,
  requestTouches,
  unsentAnswerIds,
  waitingQueueCounts,
  withAnswer,
  withCommitted,
  withoutAnswer,
  type AnsweredMap,
} from "./request-answers-model";

const friday: WaitingRequestGame = {
  id: "g1",
  sport: "football",
  startsAt: new Date("2026-11-20T16:00:00Z"),
  groupId: "grp1",
  groupName: "Karbabad Friday Football",
  levelMinTenths: 55,
  levelMaxTenths: 75,
  registeredCount: 11,
  capacity: 14,
};

const tuesday: WaitingRequestGame = {
  ...friday,
  id: "g2",
  sport: "padel",
  startsAt: new Date("2026-11-24T16:00:00Z"),
  groupId: "grp2",
  groupName: "Tuesday Night Padel",
  registeredCount: 2,
  capacity: 4,
};

const user = (id: string) => ({ id, name: id.toUpperCase(), image: null });

function levelRange(id: string, game = friday): WaitingRequest {
  return {
    kind: "level_range",
    id,
    createdAt: new Date("2026-11-10T10:00:00Z"),
    user: user(`u-${id}`),
    levelTenths: 52,
    game,
    requesterInGroup: true,
  };
}

function seatHold(id: string, game = friday): WaitingRequest {
  return {
    kind: "seat_hold",
    id,
    createdAt: new Date("2026-11-10T10:00:00Z"),
    user: user(`u-${id}`),
    levelTenths: 58,
    game,
    seatHeldUntil: new Date("2026-11-15T10:00:00Z"),
    group: { id: game.groupId ?? "none", name: game.groupName },
    invitedBy: null,
    invitedByViewer: true,
  };
}

function groupJoin(id: string, groupId = "grp1"): WaitingRequest {
  return {
    kind: "group_join",
    id,
    createdAt: new Date("2026-11-08T10:00:00Z"),
    user: user(`u-${id}`),
    levelTenths: null,
    group: { id: groupId, name: "Karbabad Friday Football", sport: "football" },
    source: "group_page",
    invitedBy: null,
    invitedByViewer: false,
    note: null,
    gamesWithMembers: 0,
  };
}

const waiting = (request: WaitingRequest): RequestRow => ({
  request,
  answer: null,
});

const answered = (
  request: WaitingRequest,
  decision: "approve" | "decline",
  committed = false,
): RequestRow => ({
  request,
  answer: { decision, committed, answeredAt: 1 },
});

describe("the answered map", () => {
  it("records an answer once, unsent, and keeps the first one", () => {
    const empty: AnsweredMap = new Map();
    const once = withAnswer(empty, seatHold("r1"), "approve", 100);
    assert.deepEqual(once.get("r1")?.answer, {
      decision: "approve",
      committed: false,
      answeredAt: 100,
    });
    assert.equal(withAnswer(once, seatHold("r1"), "decline", 200), once);
  });

  it("drops an answer on Undo and marks it sent on commit", () => {
    const map = withAnswer(new Map(), levelRange("r1"), "decline", 1);
    assert.equal(withoutAnswer(map, "r1").has("r1"), false);
    assert.equal(withoutAnswer(map, "missing"), map);
    assert.equal(withCommitted(map, "r1").get("r1")?.answer.committed, true);
  });

  it("lists the answers still to send, leaving out those on their way", () => {
    let map = withAnswer(new Map(), levelRange("r1"), "approve", 1);
    map = withAnswer(map, seatHold("r2"), "approve", 2);
    map = withAnswer(map, groupJoin("r3"), "decline", 3);
    map = withCommitted(map, "r3");
    assert.deepEqual(unsentAnswerIds(map, new Set(["r2"])), ["r1"]);
  });

  it("allows Undo only before the answer is sent", () => {
    const unsent = {
      decision: "approve" as const,
      committed: false,
      answeredAt: 1,
    };
    assert.equal(canUndoAnswer("r1", unsent, new Set()), true);
    assert.equal(canUndoAnswer("r1", unsent, new Set(["r1"])), false);
    assert.equal(
      canUndoAnswer("r1", { ...unsent, committed: true }, new Set()),
      false,
    );
    assert.equal(canUndoAnswer("r1", null, new Set()), false);
  });
});

describe("requestMutation", () => {
  it("sends a Level range request to the Game and the rest to the Group", () => {
    assert.equal(
      requestMutation(levelRange("a"), "approve"),
      "approveLevelRange",
    );
    assert.equal(
      requestMutation(levelRange("a"), "decline"),
      "rejectLevelRange",
    );
    assert.equal(requestMutation(seatHold("a"), "approve"), "approveJoin");
    assert.equal(requestMutation(groupJoin("a"), "decline"), "rejectJoin");
  });
});

describe("requestTouches", () => {
  it("names the Game and the Group each kind changes", () => {
    assert.deepEqual(requestTouches(levelRange("a")), {
      gameId: "g1",
      groupId: "grp1",
    });
    assert.deepEqual(requestTouches(seatHold("a")), {
      gameId: "g1",
      groupId: "grp1",
    });
    assert.deepEqual(requestTouches(groupJoin("a", "grp9")), {
      gameId: null,
      groupId: "grp9",
    });
  });
});

describe("screen filters", () => {
  const rows = [
    waiting(seatHold("s1")),
    waiting(levelRange("l1")),
    waiting(seatHold("s2", tuesday)),
    answered(groupJoin("j1"), "approve"),
    waiting(groupJoin("j2", "grp2")),
  ];

  it("keeps a Game's seat requests on its queue", () => {
    assert.deepEqual(
      gameRequestRows(rows, "g1").map((row) => row.request.id),
      ["s1", "l1"],
    );
  });

  it("keeps a Group's join requests, with or without a Seat hold", () => {
    assert.deepEqual(
      groupRequestRows(rows, "grp1").map((row) => row.request.id),
      ["s1", "j1"],
    );
  });

  it("counts what still waits on the Game queue heading", () => {
    assert.deepEqual(
      waitingQueueCounts([
        ...gameRequestRows(rows, "g1"),
        answered(seatHold("s3"), "decline"),
      ]),
      { levelRange: 1, seatHolds: 1 },
    );
  });
});

describe("approvedNotCounted", () => {
  it("counts an unsent approval, and a sent one until the count moves", () => {
    const sentStale = answered(seatHold("a"), "approve", true);
    const unsent = answered(seatHold("b"), "approve");
    const declined = answered(seatHold("c"), "decline");
    assert.equal(approvedNotCounted(friday, [sentStale, unsent, declined]), 2);
    const moved = { ...friday, registeredCount: 12 };
    assert.equal(approvedNotCounted(moved, [sentStale, unsent, declined]), 1);
  });
});

describe("allRequestsView", () => {
  it("groups seat rows by Game and keeps Group join rows apart", () => {
    const view = allRequestsView([
      waiting(seatHold("s1")),
      answered(levelRange("l1"), "approve"),
      waiting(seatHold("s2", tuesday)),
      waiting(groupJoin("j1")),
      answered(groupJoin("j2"), "decline", true),
    ]);
    assert.deepEqual(
      view.games.map((game) => ({
        id: game.game.id,
        rows: game.rows.map((row) => row.request.id),
        waiting: game.waiting.map((request) => request.id),
        approved: game.approved,
      })),
      [
        { id: "g1", rows: ["s1", "l1"], waiting: ["s1"], approved: 1 },
        { id: "g2", rows: ["s2"], waiting: ["s2"], approved: 0 },
      ],
    );
    assert.deepEqual(
      view.groups.map((row) => row.request.id),
      ["j1", "j2"],
    );
    assert.equal(view.gameWaitingCount, 2);
    assert.equal(view.groupWaitingCount, 1);
    assert.equal(view.empty, false);
  });

  it("is empty with nothing waiting and nothing answered", () => {
    const view = allRequestsView([]);
    assert.equal(view.empty, true);
    assert.equal(view.games.length, 0);
  });
});
