import assert from "node:assert/strict";
import { describe, it } from "vitest";

import type {
  RequestAnswer,
  RequestRow,
  WaitingRequest,
  WaitingRequestGame,
} from "@repo/domain/waiting-requests";

import {
  allRequestsView,
  gameRequestRows,
  groupRequestRows,
  waitingOf,
} from "./request-rows";

const user = { id: "u", name: "Omar T", image: null };

function game(
  id: string,
  overrides: Partial<WaitingRequestGame> = {},
): WaitingRequestGame {
  return {
    id,
    sport: "football",
    startsAt: new Date("2026-11-20T16:00:00Z"),
    groupId: "g1",
    groupName: "Karbabad Friday Football",
    levelMinTenths: 55,
    levelMaxTenths: 75,
    registeredCount: 11,
    capacity: 14,
    ...overrides,
  };
}

function levelRange(id: string, onGame: WaitingRequestGame): WaitingRequest {
  return {
    kind: "level_range",
    id,
    createdAt: new Date("2026-11-10T10:00:00Z"),
    user,
    levelTenths: 52,
    game: onGame,
    requesterInGroup: true,
  };
}

function seatHold(id: string, onGame: WaitingRequestGame): WaitingRequest {
  return {
    kind: "seat_hold",
    id,
    createdAt: new Date("2026-11-10T10:00:00Z"),
    user,
    levelTenths: 58,
    game: onGame,
    seatHeldUntil: new Date("2026-11-15T10:00:00Z"),
    group: { id: "g1", name: "Karbabad Friday Football" },
    invitedBy: null,
    invitedByViewer: true,
  };
}

function groupJoin(id: string, groupId = "g1"): WaitingRequest {
  return {
    kind: "group_join",
    id,
    createdAt: new Date("2026-11-08T10:00:00Z"),
    user,
    levelTenths: 66,
    group: { id: groupId, name: "Karbabad Friday Football", sport: "football" },
    source: "group_page",
    invitedBy: null,
    invitedByViewer: false,
    note: null,
    gamesWithMembers: 0,
  };
}

function answered(
  decision: RequestAnswer["decision"],
  answeredAt: number,
): RequestAnswer {
  return { decision, committed: false, answeredAt };
}

function row(
  request: WaitingRequest,
  answer: RequestAnswer | null = null,
): RequestRow {
  return { request, answer };
}

describe("gameRequestRows", () => {
  it("keeps the seat requests on that Game only", () => {
    const friday = game("friday");
    const tuesday = game("tuesday");
    const rows = [
      row(levelRange("a", friday)),
      row(seatHold("b", friday)),
      row(seatHold("c", tuesday)),
      row(groupJoin("d")),
    ];
    assert.deepEqual(
      gameRequestRows(rows, "friday").map((r) => r.request.id),
      ["a", "b"],
    );
  });
});

describe("groupRequestRows", () => {
  it("keeps join requests to that Group, held seat or not", () => {
    const friday = game("friday");
    const rows = [
      row(levelRange("a", friday)),
      row(seatHold("b", friday)),
      row(groupJoin("c")),
      row(groupJoin("d", "g2")),
    ];
    assert.deepEqual(
      groupRequestRows(rows, "g1").map((r) => r.request.id),
      ["b", "c"],
    );
  });
});

describe("waitingOf", () => {
  it("leaves out answered rows", () => {
    const friday = game("friday");
    const rows = [
      row(seatHold("a", friday), answered("approve", 1)),
      row(seatHold("b", friday)),
    ];
    assert.deepEqual(
      waitingOf(rows).map((request) => request.id),
      ["b"],
    );
  });
});

describe("allRequestsView", () => {
  it("groups seat requests by Game and counts what still waits", () => {
    const friday = game("friday");
    const tuesday = game("tuesday", {
      startsAt: new Date("2026-11-24T16:00:00Z"),
    });
    const view = allRequestsView([
      row(seatHold("a", friday)),
      row(levelRange("b", friday), answered("approve", 5)),
      row(seatHold("c", tuesday)),
      row(groupJoin("d")),
      row(groupJoin("e"), answered("decline", 6)),
    ]);
    assert.deepEqual(
      view.games.map((section) => ({
        game: section.game.id,
        rows: section.rows.map((r) => r.request.id),
        waiting: section.waiting.map((request) => request.id),
        approved: section.approved,
      })),
      [
        { game: "friday", rows: ["a", "b"], waiting: ["a"], approved: 1 },
        { game: "tuesday", rows: ["c"], waiting: ["c"], approved: 0 },
      ],
    );
    assert.deepEqual(
      view.groups.map((r) => r.request.id),
      ["d", "e"],
    );
    assert.equal(view.gamesWaiting, 2);
    assert.equal(view.groupsWaiting, 1);
  });

  it("reads the Game from the first answer's snapshot so approvals count once", () => {
    const before = game("friday", { registeredCount: 11 });
    const after = game("friday", { registeredCount: 12 });
    const view = allRequestsView([
      row(seatHold("a", after)),
      row(seatHold("b", before), answered("approve", 1)),
    ]);
    assert.equal(view.games[0]?.game.registeredCount, 11);
    assert.equal(view.games[0]?.approved, 1);
  });

  it("is empty when nothing waits or was answered", () => {
    const view = allRequestsView([]);
    assert.deepEqual(view.games, []);
    assert.deepEqual(view.groups, []);
    assert.equal(view.gamesWaiting, 0);
  });
});
