import type { BoardPlayer } from "@repo/domain/football-board";
import { messagesFor } from "@repo/i18n/messages";
import { describe, expect, it } from "vitest";

import { pickRoomNames } from "./football-pick-room-view";

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
