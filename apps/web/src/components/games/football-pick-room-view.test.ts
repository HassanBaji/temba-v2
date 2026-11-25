import type { BoardPlayer } from "@repo/domain/football-board";
import { messagesFor } from "@repo/i18n/messages";
import { describe, expect, it } from "vitest";

import {
  pickRoomCounts,
  pickRoomNames,
  pickRoomPool,
  pickRoomRead,
  pickRoomUnknownIds,
  pickRoomViewerTurn,
} from "./football-pick-room-view";

function player(userId: string, extra: Partial<BoardPlayer> = {}): BoardPlayer {
  return {
    userId,
    name: `Player ${userId}`,
    image: null,
    role: "outfield",
    position: "mid",
    levelBand: null,
    sideIndex: null,
    goals: 0,
    isViewer: false,
    ...extra,
  };
}

describe("pickRoomRead", () => {
  const live = { status: "live" };

  it("does not count a read kept from an earlier visit", () => {
    expect(
      pickRoomRead(
        { isFetchedAfterMount: false, isSuccess: true, data: live },
        false,
      ),
    ).toBeNull();
  });

  it("is this visit's read once it lands", () => {
    expect(
      pickRoomRead(
        { isFetchedAfterMount: true, isSuccess: true, data: live },
        false,
      ),
    ).toBe(live);
  });

  it("reads a refused room as closed, the same read each time", () => {
    const failed = { isFetchedAfterMount: true, isSuccess: false } as const;
    expect(pickRoomRead(failed, true)).toEqual({ status: "closed" });
    expect(pickRoomRead(failed, true)).toBe(pickRoomRead(failed, true));
  });

  it("is nothing after a failure that is not a refusal", () => {
    expect(
      pickRoomRead({ isFetchedAfterMount: true, isSuccess: false }, false),
    ).toBeNull();
  });
});

describe("pickRoomUnknownIds", () => {
  const room = {
    pool: ["c", "d"],
    sides: {
      slot1: [{ userId: "a", pickNumber: null }],
      slot2: [{ userId: "b", pickNumber: null }],
    },
  };

  it("is empty while the board holds everyone the room names", () => {
    expect(
      pickRoomUnknownIds(room, [
        { userId: "a" },
        { userId: "b" },
        { userId: "c" },
        { userId: "d" },
      ]),
    ).toBe("");
  });

  it("names whoever the board has not read, from the pool or a side", () => {
    expect(pickRoomUnknownIds(room, [{ userId: "a" }, { userId: "c" }])).toBe(
      "d,b",
    );
  });
});

describe("pickRoomPool", () => {
  const players = [
    player("a", { ovr: 60, balanceStrength: 90 }),
    player("b", { ovr: 80, balanceStrength: 70 }),
    player("c", { ovr: 70, balanceStrength: 80 }),
  ];
  const ids = (pool: readonly BoardPlayer[]) =>
    pool.map((entry) => entry.userId);

  it("orders the pool for a Side captain by OVR", () => {
    expect(
      ids(
        pickRoomPool(
          { pool: ["a", "b", "c"], viewer: { isOrganizer: false } },
          players,
          "ovr",
        ),
      ),
    ).toEqual(["b", "c", "a"]);
  });

  it("orders the pool for an Organizer by balance strength", () => {
    expect(
      ids(
        pickRoomPool(
          { pool: ["a", "b", "c"], viewer: { isOrganizer: true } },
          players,
          "ovr",
        ),
      ),
    ).toEqual(["a", "c", "b"]);
  });

  it("leaves out anyone the board does not hold", () => {
    expect(
      ids(
        pickRoomPool(
          { pool: ["a", "z", "b"], viewer: { isOrganizer: false } },
          players,
          "ovr",
        ),
      ),
    ).toEqual(["b", "a"]);
  });
});

describe("pickRoomViewerTurn", () => {
  it("puts the Side captain on turn on turn", () => {
    expect(
      pickRoomViewerTurn({
        status: "live",
        turn: 2,
        viewer: { side: 2, isOrganizer: false },
      }),
    ).toEqual({ onTurn: true, mayPickFor: false });
  });

  it("lets nobody but an Organizer pick for the side on turn", () => {
    expect(
      pickRoomViewerTurn({
        status: "live",
        turn: 2,
        viewer: { side: 1, isOrganizer: false },
      }),
    ).toEqual({ onTurn: false, mayPickFor: false });
    expect(
      pickRoomViewerTurn({
        status: "live",
        turn: 2,
        viewer: { side: null, isOrganizer: true },
      }),
    ).toEqual({ onTurn: false, mayPickFor: true });
  });

  it("has an Organizer who captains the side on turn pick as its captain", () => {
    expect(
      pickRoomViewerTurn({
        status: "live",
        turn: 1,
        viewer: { side: 1, isOrganizer: true },
      }),
    ).toEqual({ onTurn: true, mayPickFor: false });
  });

  it("lets nobody pick once the pick is done", () => {
    expect(
      pickRoomViewerTurn({
        status: "done",
        turn: null,
        viewer: { side: 1, isOrganizer: true },
      }),
    ).toEqual({ onTurn: false, mayPickFor: false });
  });
});

describe("pickRoomNames", () => {
  const players = [
    player("a", { name: "Faisal Saleh" }),
    player("b", { isViewer: true }),
  ];
  const names = pickRoomNames(
    {
      bibs: { slot1: "red", slot2: "white" },
      captains: { slot1: { userId: "a" }, slot2: { userId: "b" } },
    },
    players,
    "en",
  );
  const en = messagesFor("en");

  it("names each team by its bib", () => {
    expect(names.teams).toEqual({
      slot1: en.football.lineup.bibs.red,
      slot2: en.football.lineup.bibs.white,
    });
  });

  it("names each Side captain as a line-up does", () => {
    expect(names.captains).toEqual({ slot1: "Faisal S", slot2: en.common.you });
  });

  it("finds anyone the board holds, and has no name for anyone else", () => {
    expect(names.playerOf("a")).toBe(players[0]);
    expect(names.nameOf("a")).toBe("Faisal S");
    expect(names.playerOf("z")).toBeUndefined();
    expect(names.nameOf("z")).toBe("");
    expect(names.nameOf(undefined)).toBe("");
  });

  it("leaves a side without a Side captain unnamed", () => {
    expect(
      pickRoomNames(
        {
          bibs: { slot1: "red", slot2: "white" },
          captains: { slot1: null, slot2: { userId: "a" } },
        },
        players,
        "en",
      ).captains,
    ).toEqual({ slot1: "", slot2: "Faisal S" });
  });
});

describe("pickRoomCounts", () => {
  const en = messagesFor("en").football.pick;
  const sides = {
    slot1: [{ userId: "a", pickNumber: null }],
    slot2: [
      { userId: "b", pickNumber: null },
      { userId: "c", pickNumber: 1 },
    ],
  };

  it("counts each side against what it ends with, and who is left", () => {
    expect(
      pickRoomCounts({ sides, pool: ["d", "e", "f"], firstPickSide: 2 }, "en"),
    ).toEqual({
      slot1: en.sideCount(1, 3),
      slot2: en.sideCount(2, 3),
      pool: en.poolLeft(3),
    });
  });

  it("counts side 1 as first before the toss", () => {
    expect(
      pickRoomCounts(
        {
          sides: {
            slot1: [{ userId: "a", pickNumber: null }],
            slot2: [{ userId: "b", pickNumber: null }],
          },
          pool: ["d"],
          firstPickSide: null,
        },
        "en",
      ),
    ).toEqual({
      slot1: en.sideCount(1, 2),
      slot2: en.sideCount(1, 1),
      pool: en.poolLeft(1),
    });
  });
});
