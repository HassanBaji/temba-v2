import { describe, expect, it } from "vitest";
import { createPlayerProfileFixtures } from "@repo/domain/player-profile-fixtures";

import { playerProfileModel, playerProfileState } from "./player-profile-model";

const ORIGIN = "https://api.example.com";
const fixtures = createPlayerProfileFixtures();

describe("playerProfileModel", () => {
  it("builds the header, Level card and Overall from one payload", () => {
    const model = playerProfileModel(fixtures.confirmed, ORIGIN);
    expect(model.name).toBe("Elin Nilsson");
    expect(model.imageUri).toBeNull();
    expect(model.subtitle).toBe("Padel, plays at Padelhuset Bromma");
    expect(model.level).toMatchObject({ kind: "rated", displayBand: "B" });
    expect(model.overall.tiles.map((tile) => tile.value)).toEqual([
      "64",
      "41",
      "64%",
      "61%",
    ]);
  });

  it("resolves a stored image path against the API origin", () => {
    const model = playerProfileModel(
      {
        ...fixtures.confirmed,
        player: { ...fixtures.confirmed.player, image: "/media/u.png" },
      },
      ORIGIN,
    );
    expect(model.imageUri).toBe(`${ORIGIN}/media/u.png`);
  });

  it("renders a new player with no Level and empty Overall", () => {
    const model = playerProfileModel(fixtures.newPlayer, ORIGIN);
    expect(model.subtitle).toBe("Padel");
    expect(model.level).toEqual({ kind: "none", label: "No Level yet" });
    expect(model.overall.tiles.map((tile) => tile.value)).toEqual([
      "0",
      "0",
      "—",
      "—",
    ]);
  });

  it("shows a viewer's own profile with their name, not You", () => {
    expect(playerProfileModel(fixtures.self, ORIGIN).name).toBe("Elin Nilsson");
  });
});

describe("playerProfileState", () => {
  it("reads NOT_FOUND as the refused state", () => {
    const error = { message: "Player not found", data: { code: "NOT_FOUND" } };
    expect(playerProfileState({ data: undefined, error }, ORIGIN)).toEqual({
      status: "refused",
    });
  });

  it("keeps other failures as errors", () => {
    const error = { message: "Network down", data: { code: "INTERNAL" } };
    expect(playerProfileState({ data: undefined, error }, ORIGIN)).toEqual({
      status: "error",
      message: "Network down",
    });
  });

  it("is loading before data arrives", () => {
    expect(
      playerProfileState({ data: undefined, error: null }, ORIGIN),
    ).toEqual({ status: "loading" });
  });
});
