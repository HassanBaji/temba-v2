import { describe, expect, it } from "vitest";

import type { BoardPlayer } from "./football-board";
import {
  captainPickFirstPickLine,
  captainPickPoolLine,
  captainPickPoolOrder,
  captainPickProgressLine,
  captainPickSetupProblem,
  firstPickSide,
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
