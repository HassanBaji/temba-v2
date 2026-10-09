import { describe, expect, it } from "vitest";

import { GroupSportEnum } from "@repo/db";
import { SPORTS, type Sport } from "@repo/domain/sport";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

const sportsMatchDatabaseEnum: Equal<Sport, `${GroupSportEnum}`> = true;

describe("sport values", () => {
  it("match the database enum", () => {
    expect(sportsMatchDatabaseEnum).toBe(true);
    expect([...SPORTS].sort()).toEqual(Object.values(GroupSportEnum).sort());
  });
});
