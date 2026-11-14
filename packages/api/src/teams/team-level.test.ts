import { describe, expect, it } from "vitest";

import {
  makeTeam,
  makeUsers,
  rate,
  withDb,
} from "#src/challenges/challenges.test-support";

import { loadTeamLevels, teamLevelInRange } from "./team-level";

describe("loadTeamLevels", () => {
  it("averages the rated Roster members for the Team's sport and is null with none", async () => {
    await withDb(async ({ database, db }) => {
      const [a, b, c, d] = await makeUsers(database, "Player", 4);
      await rate(database, [a!], "football", 1400);
      await rate(database, [b!], "football", 2000);
      await rate(database, [c!], "padel", 2000);
      const football = await makeTeam(database, {
        name: "Mixed FC",
        sport: "football",
        userIds: [a!, b!, c!],
      });
      const padel = await makeTeam(database, {
        name: "Unrated",
        sport: "padel",
        userIds: [a!, d!],
      });

      const levels = await loadTeamLevels(db, [football, padel]);
      expect(levels.get(football.id)).toEqual({
        tenths: 34,
        level: "3.4",
        band: "C",
        ovr: 69,
      });
      expect(levels.get(padel.id)).toBeNull();
    });
  });
});

describe("teamLevelInRange", () => {
  const level = { tenths: 28, level: "2.8", band: "C" as const, ovr: null };

  it("passes any Team when no Level is wanted and none without a Team Level otherwise", () => {
    expect(
      teamLevelInRange(null, { levelMinTenths: null, levelMaxTenths: null }),
    ).toBe(true);
    expect(
      teamLevelInRange(null, { levelMinTenths: 28, levelMaxTenths: null }),
    ).toBe(false);
  });

  it("is inclusive at both ends", () => {
    expect(
      teamLevelInRange(level, { levelMinTenths: 28, levelMaxTenths: 28 }),
    ).toBe(true);
    expect(
      teamLevelInRange(level, { levelMinTenths: 29, levelMaxTenths: null }),
    ).toBe(false);
    expect(
      teamLevelInRange(level, { levelMinTenths: null, levelMaxTenths: 27 }),
    ).toBe(false);
  });
});
