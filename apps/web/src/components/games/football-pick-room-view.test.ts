import { describe, expect, it } from "vitest";

import {
  lastPick,
  pickRoomUserIds,
  withPick,
  type OpenPickRoom,
} from "./football-pick-room-view";

function room(overrides: Partial<OpenPickRoom> = {}): OpenPickRoom {
  return {
    status: "live",
    serverNow: new Date("2026-11-21T10:00:00Z"),
    viewer: { role: "captain", side: 1, isOrganizer: false },
    bibs: { slot1: "black", slot2: "white" },
    captains: {
      slot1: { userId: "c1", inRoom: true },
      slot2: { userId: "c2", inRoom: true },
    },
    firstPick: "slot1",
    firstPickSide: 1,
    sides: {
      slot1: [{ userId: "c1", pickNumber: null }],
      slot2: [{ userId: "c2", pickNumber: null }],
    },
    turn: 1,
    pool: ["p1", "p2", "p3"],
    picks: { made: 0, total: 3, next: 1 },
    ...overrides,
  };
}

describe("withPick", () => {
  it("places the pick on the side on turn and hands the turn over", () => {
    const next = withPick(room(), { userId: "p2", pickNumber: 1 });
    expect(next.status).toBe("live");
    if (next.status === "stopped") {
      throw new Error("unreachable");
    }
    expect(next.sides.slot1).toEqual([
      { userId: "c1", pickNumber: null },
      { userId: "p2", pickNumber: 1 },
    ]);
    expect(next.pool).toEqual(["p1", "p3"]);
    expect(next.turn).toBe(2);
    expect(next.picks).toEqual({ made: 1, total: 3, next: 2 });
  });

  it("finishes the pick when the pool empties", () => {
    const next = withPick(
      room({
        pool: ["p3"],
        turn: 2,
        sides: {
          slot1: [
            { userId: "c1", pickNumber: null },
            { userId: "p1", pickNumber: 1 },
          ],
          slot2: [{ userId: "c2", pickNumber: null }],
        },
        picks: { made: 1, total: 2, next: 2 },
      }),
      { userId: "p3", pickNumber: 2 },
    );
    expect(next.status).toBe("done");
    if (next.status === "stopped") {
      throw new Error("unreachable");
    }
    expect(next.turn).toBeNull();
    expect(next.sides.slot2.map((row) => row.userId)).toEqual(["c2", "p3"]);
  });

  it("leaves a room that is not live as it is", () => {
    const waiting = room({ status: "waiting", turn: null });
    expect(withPick(waiting, { userId: "p1", pickNumber: 1 })).toBe(waiting);
    const stopped = {
      status: "stopped" as const,
      serverNow: new Date(),
    };
    expect(withPick(stopped, { userId: "p1", pickNumber: 1 })).toBe(stopped);
  });
});

describe("lastPick", () => {
  it("is the highest pick number on either side", () => {
    expect(
      lastPick({
        slot1: [
          { userId: "c1", pickNumber: null },
          { userId: "p1", pickNumber: 1 },
          { userId: "p3", pickNumber: 3 },
        ],
        slot2: [
          { userId: "c2", pickNumber: null },
          { userId: "p2", pickNumber: 2 },
        ],
      }),
    ).toEqual({ userId: "p3", pickNumber: 3, side: 1 });
  });

  it("is null before the first pick", () => {
    expect(
      lastPick({
        slot1: [{ userId: "c1", pickNumber: null }],
        slot2: [{ userId: "c2", pickNumber: null }],
      }),
    ).toBeNull();
  });
});

describe("pickRoomUserIds", () => {
  it("names the pool and both sides", () => {
    expect(pickRoomUserIds(room())).toEqual(["p1", "p2", "p3", "c1", "c2"]);
  });
});
