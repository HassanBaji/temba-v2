import { describe, expect, it } from "vitest";

import { footballSizeLabel } from "./football-size-copy";
import {
  FOOTBALL_SIDE_SIZES,
  footballPlayersAllowedBounds,
  isFootballSideSize,
  isRosterRegistrationGame,
  sideSizeLabel,
} from "./game-shape";

describe("isRosterRegistrationGame", () => {
  const cases: {
    format: string;
    sport: string | null;
    roster: boolean;
  }[] = [
    { format: "friendly_game", sport: "padel", roster: false },
    { format: "friendly_game", sport: null, roster: false },
    { format: "friendly_game", sport: "football", roster: true },
    { format: "americano", sport: "padel", roster: true },
    { format: "americano", sport: "football", roster: true },
    { format: "friendly_tournament", sport: "padel", roster: false },
    { format: "friendly_tournament", sport: "football", roster: false },
  ];

  it.each(cases)("$format on $sport", ({ format, sport, roster }) => {
    expect(isRosterRegistrationGame({ format, sport })).toBe(roster);
  });
});

describe("football sizes", () => {
  it("lists the allowed side sizes", () => {
    expect([...FOOTBALL_SIDE_SIZES]).toEqual([5, 6, 7, 8, 9, 11]);
    expect(isFootballSideSize(7)).toBe(true);
    expect(isFootballSideSize(10)).toBe(false);
  });

  it("bounds players allowed from twice the side size to 40", () => {
    expect(footballPlayersAllowedBounds(5)).toEqual({ min: 10, max: 40 });
    expect(footballPlayersAllowedBounds(11)).toEqual({ min: 22, max: 40 });
  });

  it("labels the size", () => {
    expect(sideSizeLabel(5)).toBe("5-a-side");
    expect(footballSizeLabel(5, 10)).toBe("5-a-side · 10 players");
  });
});
