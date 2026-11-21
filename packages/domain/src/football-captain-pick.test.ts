import { describe, expect, it } from "vitest";

import type { BoardPlayer } from "./football-board";
import {
  captainPickCountLines,
  captainPickDone,
  captainPickFinalSizes,
  captainPickFirstPickLine,
  captainPickPoolLine,
  captainPickPoolOrder,
  captainPickProgressLine,
  captainPickRoomLines,
  captainPickSetupProblem,
  firstPickSide,
  pickTurn,
} from "./football-captain-pick";

const names = { slot1: "Black", slot2: "White" };

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

function tier(
  band: "shark" | "hamour" | "kanaad" | "safi" | null,
  place: number | null,
) {
  return {
    band,
    place,
    points: null,
    provisional: band == null,
    gamesOfFive: 0,
  };
}

describe("captainPickSetupProblem", () => {
  const roster = ["a", "b", "c", "d"];

  it("opens with two different captains with an account and four players", () => {
    expect(
      captainPickSetupProblem({ slot1: "a", slot2: "b" }, roster, roster, "en"),
    ).toBeNull();
  });

  it("needs four registered players", () => {
    expect(
      captainPickSetupProblem(
        { slot1: "a", slot2: "b" },
        ["a", "b", "c"],
        ["a", "b", "c"],
        "en",
      ),
    ).toBe("Captain pick needs at least 4 players");
  });

  it("needs both captains, different, registered and with an account", () => {
    expect(
      captainPickSetupProblem(
        { slot1: "a", slot2: null },
        roster,
        roster,
        "en",
      ),
    ).toBe("Pick a captain for each side");
    expect(
      captainPickSetupProblem({ slot1: "a", slot2: "a" }, roster, roster, "en"),
    ).toBe("Pick two different captains");
    expect(
      captainPickSetupProblem({ slot1: "a", slot2: "z" }, roster, roster, "en"),
    ).toBe("Only registered players can be placed on a team");
    expect(
      captainPickSetupProblem({ slot1: "a", slot2: "b" }, roster, ["a"], "en"),
    ).toBe("A guest player or a player without an account can't be a captain");
  });

  it("answers in Arabic", () => {
    expect(
      captainPickSetupProblem(
        { slot1: "a", slot2: null },
        roster,
        roster,
        "ar",
      ),
    ).toBe("اختر قائدًا لكل فريق");
  });
});

describe("firstPickSide", () => {
  it("is the side named, or the toss", () => {
    expect(firstPickSide("slot1", () => 0.9)).toBe(1);
    expect(firstPickSide("slot2", () => 0.1)).toBe(2);
    expect(firstPickSide("toss", () => 0.1)).toBe(1);
    expect(firstPickSide("toss", () => 0.9)).toBe(2);
  });
});

describe("pick progress", () => {
  it("reads the pick to come of all the picks", () => {
    expect(captainPickProgressLine({ made: 5, total: 14 }, "en")).toBe(
      "Pick 6 of 14",
    );
    expect(captainPickProgressLine({ made: 14, total: 14 }, "en")).toBe(
      "Pick 14 of 14",
    );
    expect(captainPickProgressLine({ made: 0, total: 14 }, "ar")).toBe(
      "الاختيار 1 من 14",
    );
  });

  it("reads the pool and how it splits, even or odd", () => {
    expect(captainPickPoolLine(14, "en")).toBe("14 players, 7 each");
    expect(captainPickPoolLine(13, "en")).toBe("13 players, 7 and 6");
    expect(captainPickPoolLine(2, "ar")).toBe("لاعبان، 1 لكل فريق");
  });

  it("names who picks first, the toss before and after", () => {
    expect(
      captainPickFirstPickLine(
        { firstPick: "toss", firstPickSide: null },
        names,
        "en",
      ),
    ).toBe("Tossed when both are in");
    expect(
      captainPickFirstPickLine(
        { firstPick: "toss", firstPickSide: 2 },
        names,
        "en",
      ),
    ).toBe("White won the toss");
    expect(
      captainPickFirstPickLine(
        { firstPick: "slot1", firstPickSide: null },
        names,
        "en",
      ),
    ).toBe("Black picks first");
  });
});

describe("captainPickPoolOrder", () => {
  it("sorts an Organizer's pool by balance strength, best first", () => {
    const pool = [
      player("a", { balanceStrength: 60, ovr: 90 }),
      player("b", { balanceStrength: 80, ovr: 50 }),
      player("c", { balanceStrength: 70, ovr: 70 }),
    ];
    expect(
      captainPickPoolOrder(pool, { organizer: true, balanceOn: "ovr" }).map(
        (row) => row.userId,
      ),
    ).toEqual(["b", "c", "a"]);
  });

  it("sorts a captain's pool by OVR outside a tier Group, unrated last, ties in roster order", () => {
    const pool = [
      player("a", { ovr: 60 }),
      player("b", { ovr: null }),
      player("c", { ovr: 72 }),
      player("d", { ovr: 60 }),
    ];
    expect(
      captainPickPoolOrder(pool, { organizer: false, balanceOn: "ovr" }).map(
        (row) => row.userId,
      ),
    ).toEqual(["c", "a", "d", "b"]);
  });

  it("sorts a captain's pool in a tier Group by Tier band and place, never by points", () => {
    const pool = [
      player("a", { tier: tier("hamour", 5), ovr: 99 }),
      player("b", { tier: tier(null, null), ovr: 99 }),
      player("c", { tier: tier("shark", 2) }),
      player("d", { tier: tier("hamour", 4) }),
      player("e", { tier: tier("shark", 1) }),
    ];
    expect(
      captainPickPoolOrder(pool, {
        organizer: false,
        balanceOn: "tierPoints",
      }).map((row) => row.userId),
    ).toEqual(["e", "c", "d", "a", "b"]);
  });
});

/** Picks the whole pool by the turn rule and says which side took each pick. */
function pickAll(
  start: { slot1: number; slot2: number },
  pool: number,
  first: 1 | 2,
) {
  const sizes = { ...start };
  const order: (1 | 2)[] = [];
  for (let pick = 0; pick < pool; pick += 1) {
    const side = pickTurn({ ...sizes, firstPickSide: first });
    order.push(side);
    if (side === 1) {
      sizes.slot1 += 1;
    } else {
      sizes.slot2 += 1;
    }
  }
  return { order, sizes };
}

describe("pickTurn", () => {
  it("alternates from the first pick in an untouched pick", () => {
    expect(pickAll({ slot1: 1, slot2: 1 }, 6, 1).order).toEqual([
      1, 2, 1, 2, 1, 2,
    ]);
    expect(pickAll({ slot1: 1, slot2: 1 }, 4, 2).order).toEqual([2, 1, 2, 1]);
  });

  it("gives the first picker the last player of an odd pool", () => {
    const white = pickAll({ slot1: 1, slot2: 1 }, 5, 2);
    expect(white.order).toEqual([2, 1, 2, 1, 2]);
    expect(white.sizes).toEqual({ slot1: 3, slot2: 4 });
    expect(pickAll({ slot1: 1, slot2: 1 }, 13, 1).sizes).toEqual({
      slot1: 8,
      slot2: 7,
    });
  });

  it("gives the turn back after an undo", () => {
    expect(pickTurn({ slot1: 2, slot2: 1, firstPickSide: 1 })).toBe(2);
    expect(pickTurn({ slot1: 2, slot2: 2, firstPickSide: 1 })).toBe(1);
    expect(pickTurn({ slot1: 2, slot2: 1, firstPickSide: 1 })).toBe(2);
  });

  it("goes to the side that lost a picked player, which then catches up", () => {
    expect(pickTurn({ slot1: 2, slot2: 3, firstPickSide: 1 })).toBe(1);
    expect(pickTurn({ slot1: 3, slot2: 2, firstPickSide: 2 })).toBe(2);
    expect(pickAll({ slot1: 2, slot2: 4 }, 4, 1).order).toEqual([1, 1, 1, 2]);
  });

  it("takes a late joiner into the pool without moving the turn", () => {
    expect(pickTurn({ slot1: 3, slot2: 2, firstPickSide: 1 })).toBe(2);
    expect(pickAll({ slot1: 3, slot2: 2 }, 4, 1).order).toEqual([2, 1, 2, 1]);
    expect(pickAll({ slot1: 3, slot2: 3 }, 1, 2).order).toEqual([2]);
  });
});

describe("captainPickDone and the counts", () => {
  it("is done once the pool is empty", () => {
    expect(captainPickDone(0)).toBe(true);
    expect(captainPickDone(1)).toBe(false);
  });

  it("counts each side against what it ends with, and who is left", () => {
    expect(
      captainPickFinalSizes({ slot1: 4, slot2: 3, pool: 9, firstPickSide: 1 }),
    ).toEqual({ slot1: 8, slot2: 8 });
    expect(
      captainPickCountLines(
        { slot1: 4, slot2: 3, pool: 9, firstPickSide: 1 },
        "en",
      ),
    ).toEqual({ slot1: "4 of 8", slot2: "3 of 8", pool: "9 left" });
    expect(
      captainPickCountLines(
        { slot1: 1, slot2: 1, pool: 13, firstPickSide: 2 },
        "en",
      ),
    ).toEqual({ slot1: "1 of 7", slot2: "1 of 8", pool: "13 left" });
    expect(
      captainPickCountLines(
        { slot1: 8, slot2: 8, pool: 1, firstPickSide: 1 },
        "en",
      ).pool,
    ).toBe("1 left");
    expect(
      captainPickCountLines(
        { slot1: 2, slot2: 1, pool: 2, firstPickSide: 1 },
        "ar",
      ).pool,
    ).toBe("بقي لاعبان");
  });
});

describe("captainPickRoomLines", () => {
  const roomNames = {
    captains: { slot1: "Rashid", slot2: "Faisal" },
    teams: { slot1: "Black", slot2: "White" },
  };
  const live = {
    status: "live" as const,
    picks: { made: 5, total: 14 },
    turn: 2 as const,
    firstPick: "toss" as const,
    firstPickSide: 1 as const,
    sizes: { slot1: 4, slot2: 3 },
  };

  it("tells the captain on turn to pick, and that the other sees it in a moment", () => {
    expect(captainPickRoomLines(live, 2, roomNames, "en")).toEqual({
      progress: "Pick 6 of 14",
      title: "Your pick",
      sub: "Tap a player, then confirm. Rashid sees it in a moment.",
      toss: null,
    });
  });

  it("tells the other captain who is picking", () => {
    expect(captainPickRoomLines(live, 1, roomNames, "en")).toEqual({
      progress: "Pick 6 of 14",
      title: "Faisal is picking",
      sub: "You pick again as soon as Faisal has chosen.",
      toss: null,
    });
  });

  it("shows the Organizer the pick as watching", () => {
    expect(captainPickRoomLines(live, null, roomNames, "en")).toEqual({
      progress: "Pick 6 of 14, watching",
      title: "Faisal is picking",
      sub: "Players can't see the pick. You can watch it happen, or step in below.",
      toss: null,
    });
  });

  it("names who won the toss on the first pick only", () => {
    const first = {
      ...live,
      picks: { made: 0, total: 14 },
      turn: 1 as const,
      sizes: { slot1: 1, slot2: 1 },
    };
    expect(captainPickRoomLines(first, 1, roomNames, "en").toss).toBe(
      "Black won the toss",
    );
    expect(
      captainPickRoomLines({ ...first, firstPick: "slot1" }, 1, roomNames, "en")
        .toss,
    ).toBeNull();
  });

  it("reads the finished pick, even or odd", () => {
    const done = {
      ...live,
      status: "done" as const,
      picks: { made: 14, total: 14 },
      sizes: { slot1: 8, slot2: 8 },
    };
    expect(captainPickRoomLines(done, 1, roomNames, "en")).toEqual({
      progress: "All 14 picked",
      title: "Teams are picked",
      sub: "8 a side. They go to the organizer as a draft, with both captains already agreed.",
      toss: null,
    });
    expect(
      captainPickRoomLines(
        { ...done, sizes: { slot1: 7, slot2: 8 } },
        null,
        roomNames,
        "en",
      ).sub,
    ).toBe(
      "Teams of 8 and 7. They go to the organizer as a draft, with both captains already agreed.",
    );
  });

  it("reads in Arabic", () => {
    expect(captainPickRoomLines(live, 2, roomNames, "ar").title).toBe(
      "دورك في الاختيار",
    );
  });
});
