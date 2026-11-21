import { isolate } from "@repo/i18n/bidi";
import { describe, expect, it } from "vitest";

import type { BoardPlayer } from "./football-board";
import {
  draftShareCard,
  draftShareMessage,
  draftShareNote,
  type DraftShareBoard,
  type DraftShareGame,
} from "./football-draft-share";

function player(
  userId: string,
  name: string,
  extra: Partial<BoardPlayer> = {},
): BoardPlayer {
  return {
    userId,
    name,
    image: null,
    role: "outfield",
    position: "mid",
    levelBand: "C1",
    sideIndex: null,
    goals: 0,
    isViewer: false,
    balanceStrength: 1500,
    ovr: 72,
    ovrProvisional: false,
    tier: null,
    ...extra,
  };
}

const players: BoardPlayer[] = [
  player("rashid", "Rashid Nasser", { position: "def", isViewer: true }),
  player("hassan", "Hassan Ali", { role: "keeper", position: null }),
  player("ali", "Ali Khalil", { position: "fwd", ovr: 90 }),
  player("mahmood", "Mahmood Jaber", { position: "def" }),
  player("faisal", "Faisal Ahmed", { role: "keeper", position: null }),
  player("omar", "Omar Mansoor", { position: "mid" }),
  player("noor", "Noor Abbas", { position: null }),
  player("late", "Late Joiner"),
];

const game: DraftShareGame = {
  windowStart: new Date("2026-10-17T17:00:00.000Z"),
  windowEnd: new Date("2026-10-17T18:00:00.000Z"),
  venue: { name: "Karbabad Turf", city: null },
  sideSize: 7,
  recordedCourts: [{ name: "Pitch 2" }],
};

const board: DraftShareBoard = {
  players,
  draft: {
    bibs: { slot1: "black", slot2: "white" },
    sides: {
      slot1: ["ali", "rashid", "hassan", "mahmood"],
      slot2: ["omar", "faisal", "noor"],
    },
    captains: { slot1: "rashid", slot2: null },
  },
};

function keysDeep(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(keysDeep);
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, inner]) => [
      key,
      ...keysDeep(inner),
    ]);
  }
  return [];
}

function valuesDeep(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value.flatMap(valuesDeep);
  }
  if (value && typeof value === "object") {
    return Object.values(value).flatMap(valuesDeep);
  }
  return [value];
}

describe("draftShareCard", () => {
  it("is null without a draft", () => {
    expect(draftShareCard(game, null, "both", "en")).toBeNull();
    expect(
      draftShareCard(game, { players, draft: null }, "both", "en"),
    ).toBeNull();
  });

  it("puts both teams on one card, stamped as a draft", () => {
    const card = draftShareCard(game, board, "both", "en")!;
    expect(card.typeLine).toBe("DRAFT / FOOTBALL / 7-A-SIDE");
    expect(card.stamp).toBe("DRAFT, NOT FINAL");
    expect(card.venue).toBe("Karbabad Turf, Pitch 2");
    expect(card.when).toBe("Sat 17 Oct 2026, 8:00 PM");
    expect(card.against).toBeNull();
    expect(
      card.sides.map((side) => [
        side.name,
        side.listLabel,
        side.captainLine,
        side.countLine,
      ]),
    ).toEqual([
      ["Black", "TEAM BLACK", "CAPTAIN RASHID N", "4 PLAYERS"],
      ["White", "TEAM WHITE", "NO CAPTAIN", "3 PLAYERS"],
    ]);
  });

  it("lists a team keepers first, then by line, with names, codes and the captain", () => {
    const card = draftShareCard(game, board, "both", "en")!;
    expect(
      card.sides[0]!.players.map((row) => [
        row.init,
        row.name,
        row.code,
        row.captain,
      ]),
    ).toEqual([
      ["HA", "Hassan A", "GK", false],
      ["MJ", "Mahmood J", "DEF", false],
      ["RN", "Rashid N", "DEF", true],
      ["AK", "Ali K", "FWD", false],
    ]);
    expect(card.sides[1]!.players.map((row) => row.code)).toEqual([
      "GK",
      "MID",
      null,
    ]);
    expect(card.sides[1]!.players.some((row) => row.captain)).toBe(false);
  });

  it("carries no Level, OVR, Tier or average, and marks nobody as the viewer", () => {
    for (const mode of ["both", "slot1", "slot2"] as const) {
      const card = draftShareCard(game, board, mode, "en")!;
      const keys = keysDeep(card);
      for (const key of keys) {
        expect(key).not.toMatch(
          /level|ovr|tier|avg|average|strength|rating|you|viewer/i,
        );
      }
      expect(valuesDeep(card)).not.toContain(72);
      expect(valuesDeep(card)).not.toContain(90);
      expect(valuesDeep(card)).not.toContain("You");
    }
  });

  it("reads the sharer's row by their name on every tab", () => {
    for (const mode of ["both", "slot1"] as const) {
      const card = draftShareCard(game, board, mode, "en")!;
      const rashid = card.sides
        .flatMap((side) => side.players)
        .find((row) => row.userId === "rashid");
      expect(rashid).toEqual({
        userId: "rashid",
        init: "RN",
        name: "Rashid N",
        code: "DEF",
        captain: true,
      });
    }
  });

  it("puts one team on its own card, against the other", () => {
    const black = draftShareCard(game, board, "slot1", "en")!;
    expect(black.sides.map((side) => side.name)).toEqual(["Black"]);
    expect(black.against).toBe(
      "against White, 7 start, the captain picks them",
    );
    const white = draftShareCard(game, board, "slot2", "en")!;
    expect(white.sides.map((side) => side.name)).toEqual(["White"]);
    expect(white.sides[0]!.captainLine).toBe("NO CAPTAIN");
    expect(white.against).toBe(
      "against Black, 7 start, the captain picks them",
    );
  });

  it("shares an incomplete draft as placed, skipping who has left", () => {
    const card = draftShareCard(
      game,
      {
        players,
        draft: {
          ...board.draft!,
          sides: { slot1: ["rashid", "gone"], slot2: [] },
        },
      },
      "both",
      "en",
    )!;
    expect(card.sides.map((side) => side.players.length)).toEqual([1, 0]);
    expect(card.sides.map((side) => side.countLine)).toEqual([
      "1 PLAYER",
      "0 PLAYERS",
    ]);
  });

  it("drops what the Game does not have", () => {
    const card = draftShareCard(
      {
        ...game,
        sideSize: null,
        windowStart: null,
        venue: null,
        recordedCourts: [],
      },
      board,
      "slot1",
      "en",
    )!;
    expect(card.typeLine).toBe("DRAFT / FOOTBALL");
    expect(card.against).toBe("against White");
    expect(card.when).toBe("");
  });

  it("reads in Arabic with the captain's name kept in its own direction", () => {
    const card = draftShareCard(game, board, "slot1", "ar")!;
    expect(card.sides[0]!.name).toBe("أسود");
    expect(card.sides[0]!.captainLine).toBe(`القائد ${isolate("RASHID N")}`);
    expect(card.sides[0]!.countLine).toBe("4 لاعبين");
    expect(card.stamp).toBe("مسودة، ليست نهائية");
    expect(card.against).toBe("ضد أبيض، يبدأ 7 لاعبين ويختارهم القائد");
  });
});

describe("draftShareNote", () => {
  const bibs = { slot1: "black", slot2: "white" } as const;

  it("changes with the tab", () => {
    expect(draftShareNote("both", bibs, { groupId: "g" }, "en")).toBe(
      "Both teams on one image, stamped as a draft. In Temba only organizers, admins and captains see it; an image goes wherever you send it.",
    );
    expect(draftShareNote("slot1", bibs, { groupId: "g" }, "en")).toBe(
      "Only Black, for that team's chat. Stamped as a draft; an image goes wherever you send it.",
    );
    expect(draftShareNote("slot2", bibs, { groupId: null }, "en")).toBe(
      "Only White, for that team's chat. Stamped as a draft; an image goes wherever you send it.",
    );
  });

  it("drops admins on a Game outside a Group", () => {
    expect(draftShareNote("both", bibs, { groupId: null }, "en")).toBe(
      "Both teams on one image, stamped as a draft. In Temba only organizers and captains see it; an image goes wherever you send it.",
    );
  });
});

describe("draftShareMessage", () => {
  const url = "https://temba.app/games/g1";

  it("names the Game and its time, then the link", () => {
    expect(
      draftShareMessage(
        {
          name: "Friday Football",
          hasCustomName: true,
          windowStart: game.windowStart,
        },
        url,
        "en",
      ),
    ).toBe(
      `Draft teams for Friday Football, Sat 17 Oct, 8:00 PM. Not final.\n${url}`,
    );
  });

  it("reads by day and time alone for a Game without a name of its own", () => {
    expect(
      draftShareMessage(
        {
          name: "Sat 17 Oct, 8:00–9:00 PM",
          hasCustomName: false,
          windowStart: game.windowStart,
        },
        url,
        "en",
      ),
    ).toBe(`Draft teams for Sat 17 Oct, 8:00 PM. Not final.\n${url}`);
  });

  it("isolates the name and time in Arabic", () => {
    const line = draftShareMessage(
      { name: "Friday Football", hasCustomName: true, windowStart: null },
      "",
      "ar",
    );
    expect(line).toBe(
      `مسودة الفرق لـ${isolate("Friday Football")}. ليست نهائية.`,
    );
  });
});
