import { NO_CHALLENGE_BOARD_FILTERS } from "@repo/domain/challenge-card";
import { describe, expect, it } from "vitest";

import {
  challengePath,
  MINE_PATH,
  NEW_CHALLENGE_PATH,
  setBoardFilter,
  toggleValue,
} from "./challenges-model";

describe("challenge paths", () => {
  it("nest under the Challenges tab", () => {
    expect(challengePath("c1")).toBe("/challenges/c1");
    expect(NEW_CHALLENGE_PATH).toBe("/challenges/new");
    expect(MINE_PATH).toBe("/challenges?tab=mine");
  });
});

describe("setBoardFilter", () => {
  it("sets a filter and clears it when picked again", () => {
    const sport = setBoardFilter(NO_CHALLENGE_BOARD_FILTERS, "sport", "padel");
    expect(sport).toEqual({ ...NO_CHALLENGE_BOARD_FILTERS, sport: "padel" });
    expect(setBoardFilter(sport, "sport", "padel")).toEqual(
      NO_CHALLENGE_BOARD_FILTERS,
    );
    expect(setBoardFilter(sport, "sport", null)).toEqual(
      NO_CHALLENGE_BOARD_FILTERS,
    );
  });
});

describe("toggleValue", () => {
  it("adds and removes a pick", () => {
    expect(toggleValue(["fri"], "sat")).toEqual(["fri", "sat"]);
    expect(toggleValue(["fri", "sat"], "fri")).toEqual(["sat"]);
  });
});
