import { describe, expect, it } from "vitest";

import {
  livePickSeat,
  otherCaptainSide,
  pickRoomCaptainNames,
  pickRoomCountLines,
  pickRoomPlayer,
  pickRoomPlayerName,
  pickRoomPoolPlayers,
  pickRoomRead,
  pickRoomUnknownUserIds,
} from "./pick-room-model";

const player = (userId: string, name: string) => ({
  userId,
  name,
  isViewer: false,
});

const players = [
  player("ali", "Ali Hassan"),
  player("badr", "Badr Saleh"),
  player("omar", "Omar Nasser"),
];

describe("pickRoomRead", () => {
  const room = { status: "live" as const };

  it("is nothing until this visit has read the room", () => {
    expect(
      pickRoomRead({ fetchedAfterMount: false, read: room, refused: false }),
    ).toBeNull();
    expect(
      pickRoomRead({
        fetchedAfterMount: false,
        read: undefined,
        refused: true,
      }),
    ).toBeNull();
  });

  it("is the room this visit read", () => {
    expect(
      pickRoomRead({ fetchedAfterMount: true, read: room, refused: false }),
    ).toBe(room);
  });

  it("reads a refusal as a closed room, the same one each time", () => {
    const refused = { fetchedAfterMount: true, read: undefined, refused: true };
    expect(pickRoomRead(refused)).toEqual({ status: "closed" });
    expect(pickRoomRead(refused)).toBe(pickRoomRead(refused));
  });

  it("is nothing for a read that failed some other way", () => {
    expect(
      pickRoomRead({
        fetchedAfterMount: true,
        read: undefined,
        refused: false,
      }),
    ).toBeNull();
  });
});

describe("pickRoomUnknownUserIds", () => {
  const room = {
    pool: ["omar", "zaid"],
    sides: {
      slot1: [{ userId: "ali", pickNumber: null }],
      slot2: [
        { userId: "badr", pickNumber: null },
        { userId: "yusuf", pickNumber: 1 },
      ],
    },
  };

  it("names who the room has and the board does not", () => {
    expect(pickRoomUnknownUserIds(room, players)).toEqual(["zaid", "yusuf"]);
  });

  it("is empty once the board holds everyone", () => {
    expect(
      pickRoomUnknownUserIds(room, [
        ...players,
        player("zaid", "Zaid"),
        player("yusuf", "Yusuf"),
      ]),
    ).toEqual([]);
  });
});

describe("pickRoomPoolPlayers", () => {
  it("keeps the room's order and leaves out a player the board does not hold", () => {
    expect(pickRoomPoolPlayers(["omar", "zaid", "ali"], players)).toEqual([
      players[2],
      players[0],
    ]);
  });
});

describe("pickRoomPlayer and pickRoomPlayerName", () => {
  it("finds a player by user id", () => {
    expect(pickRoomPlayer(players, "badr")).toBe(players[1]);
    expect(pickRoomPlayer(players, "zaid")).toBeUndefined();
    expect(pickRoomPlayer(players, undefined)).toBeUndefined();
  });

  it("names a player the board holds as the line-up does, and no one else", () => {
    expect(pickRoomPlayerName(players, "badr", "en")).toBe("Badr S");
    expect(pickRoomPlayerName(players, "zaid", "en")).toBe("");
    expect(pickRoomPlayerName(players, undefined, "en")).toBe("");
  });
});

describe("pickRoomCaptainNames", () => {
  it("names each side's captain, empty for a side without one", () => {
    expect(
      pickRoomCaptainNames(
        { slot1: { userId: "ali" }, slot2: null },
        players,
        "en",
      ),
    ).toEqual({ slot1: "Ali H", slot2: "" });
  });
});

describe("otherCaptainSide", () => {
  it("is the side across from a captain's", () => {
    expect(otherCaptainSide(1)).toBe(2);
    expect(otherCaptainSide(2)).toBe(1);
  });

  it("is no side for an Organizer who is not a captain", () => {
    expect(otherCaptainSide(null)).toBeNull();
  });
});

describe("pickRoomCountLines", () => {
  const sides = {
    slot1: [
      { userId: "ali", pickNumber: null },
      { userId: "omar", pickNumber: 1 },
    ],
    slot2: [{ userId: "badr", pickNumber: null }],
  };

  it("counts each side against what it ends with, and who is left", () => {
    expect(
      pickRoomCountLines(
        { sides, pool: ["zaid", "yusuf", "saad"], firstPickSide: 1 },
        "en",
      ),
    ).toEqual({ slot1: "2 of 3", slot2: "1 of 3", pool: "3 left" });
  });

  it("counts from the first side before the toss", () => {
    const room = { sides, pool: ["zaid", "yusuf", "saad"] };
    expect(pickRoomCountLines({ ...room, firstPickSide: null }, "en")).toEqual(
      pickRoomCountLines({ ...room, firstPickSide: 1 }, "en"),
    );
  });
});

describe("livePickSeat", () => {
  const captain = (side: 1 | 2, isOrganizer = false) => ({
    side,
    isOrganizer,
  });
  const organizer = { side: null, isOrganizer: true };
  const live = { status: "live" as const, turn: 1 as const };

  it("lets the captain on turn choose", () => {
    expect(livePickSeat({ ...live, viewer: captain(1) }, false)).toEqual({
      viewerOnTurn: true,
      mayPickFor: false,
      selectable: true,
      waiting: false,
    });
  });

  it("has the other captain wait", () => {
    expect(livePickSeat({ ...live, viewer: captain(2) }, false)).toEqual({
      viewerOnTurn: false,
      mayPickFor: false,
      selectable: false,
      waiting: true,
    });
  });

  it("lets an Organizer watch until they say they pick for the captain on turn", () => {
    expect(livePickSeat({ ...live, viewer: organizer }, false)).toEqual({
      viewerOnTurn: false,
      mayPickFor: true,
      selectable: false,
      waiting: false,
    });
    expect(livePickSeat({ ...live, viewer: organizer }, true)).toEqual({
      viewerOnTurn: false,
      mayPickFor: true,
      selectable: true,
      waiting: false,
    });
  });

  it("lets an Organizer who is the other captain wait or pick for the one on turn", () => {
    const viewer = captain(2, true);
    expect(livePickSeat({ ...live, viewer }, false)).toEqual({
      viewerOnTurn: false,
      mayPickFor: true,
      selectable: false,
      waiting: true,
    });
    expect(livePickSeat({ ...live, viewer }, true)).toEqual({
      viewerOnTurn: false,
      mayPickFor: true,
      selectable: true,
      waiting: false,
    });
  });

  it("does not let an Organizer on turn pick for themselves", () => {
    expect(livePickSeat({ ...live, viewer: captain(1, true) }, true)).toEqual({
      viewerOnTurn: true,
      mayPickFor: false,
      selectable: true,
      waiting: false,
    });
  });

  it("gives no one a pick once the pick is finished or before it starts", () => {
    const none = {
      viewerOnTurn: false,
      mayPickFor: false,
      selectable: false,
      waiting: false,
    };
    expect(
      livePickSeat({ status: "done", turn: null, viewer: captain(1) }, false),
    ).toEqual(none);
    expect(
      livePickSeat({ status: "done", turn: 1, viewer: organizer }, true),
    ).toEqual(none);
    expect(
      livePickSeat(
        { status: "waiting", turn: null, viewer: captain(1) },
        false,
      ),
    ).toEqual(none);
  });
});
