import { describe, expect, it } from "vitest";
import { createPlayerProfileFixtures } from "@repo/domain/player-profile-fixtures";

import { playerMatchesModel } from "./player-matches-model";

const ORIGIN = "https://api.example.com";
const fixtures = createPlayerProfileFixtures();

describe("playerMatchesModel", () => {
  it("lists all ten with live chip counts and no sheet", () => {
    const model = playerMatchesModel(
      fixtures.confirmed,
      { filter: "all", matchId: null },
      ORIGIN,
    );
    expect(model.subtitle).toBe("Elin Nilsson, 7 won, 3 lost");
    expect(model.chips.map((chip) => chip.label)).toEqual([
      "All 10",
      "Won 7",
      "Lost 3",
    ]);
    expect(model.rows).toHaveLength(10);
    expect(model.rows[0]?.partnerVenue).toBe("with Jonas B, Padelhuset Bromma");
    expect(model.empty).toBeNull();
    expect(model.sheet).toBeNull();
  });

  it("filters rows and keeps the open sheet even when filtered out", () => {
    const model = playerMatchesModel(
      fixtures.confirmed,
      { filter: "lost", matchId: "match-2026-10-01" },
      ORIGIN,
    );
    expect(model.rows.map((row) => row.outcome)).toEqual([
      "lost",
      "lost",
      "lost",
    ]);
    expect(model.sheet?.title).toBe("Tuesday Crew");
  });

  it("reads No games here. for an empty filter", () => {
    const model = playerMatchesModel(
      fixtures.newPlayer,
      { filter: "won", matchId: null },
      ORIGIN,
    );
    expect(model.rows).toEqual([]);
    expect(model.empty).toBe("No games here.");
  });

  it("resolves sheet player images against the API origin", () => {
    const data = {
      ...fixtures.confirmed,
      lastMatches: fixtures.confirmed.lastMatches.map((match) => ({
        ...match,
        slot2: match.slot2.map((player) => ({
          ...player,
          image: "/media/avatar.png",
        })),
      })),
    };
    const model = playerMatchesModel(
      data,
      { filter: "all", matchId: "match-2026-10-01" },
      ORIGIN,
    );
    expect(model.sheet?.teams[1]?.players[0]?.imageUri).toBe(
      `${ORIGIN}/media/avatar.png`,
    );
    expect(model.sheet?.teams[0]?.players[0]?.imageUri).toBeNull();
  });

  it("opens no sheet for a Match outside the Last 10", () => {
    expect(
      playerMatchesModel(
        fixtures.confirmed,
        { filter: "all", matchId: "unknown" },
        ORIGIN,
      ).sheet,
    ).toBeNull();
  });
});
