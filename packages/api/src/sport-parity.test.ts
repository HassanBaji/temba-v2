import { describe, expect, it } from "vitest";

import { GameSportEnum, GroupSportEnum } from "@repo/db";
import { SPORTS, type Sport } from "@repo/domain/sport";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

const sportsMatchDatabaseEnum: Equal<Sport, `${GroupSportEnum}`> = true;
const sportsMatchGameEnum: Equal<Sport, `${GameSportEnum}`> = true;

describe("sport values", () => {
  it("match the database enum", () => {
    expect(sportsMatchDatabaseEnum).toBe(true);
    expect([...SPORTS].sort()).toEqual(Object.values(GroupSportEnum).sort());
  });

  it("match the Game sport enum, whose football member is spelled Football", () => {
    expect(sportsMatchGameEnum).toBe(true);
    expect([...SPORTS].sort()).toEqual(Object.values(GameSportEnum).sort());
  });
});
