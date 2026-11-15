import { describe, expect, it } from "vitest";

import {
  tournamentTeamCountChoices,
  tournamentTeamCountFits,
  tournamentTeamCountStep,
} from "./tournament-resize";

describe("tournamentTeamCountChoices", () => {
  it("keeps King of the court at two teams a court, two to six courts", () => {
    expect(
      tournamentTeamCountChoices({
        tournamentShape: "king_of_the_court",
        poolCount: null,
        roundCount: null,
        qualifiersPerPool: null,
      }),
    ).toEqual([4, 6, 8, 10, 12]);
  });

  it("keeps at least three teams a group", () => {
    const shape = {
      tournamentShape: "groups_only",
      poolCount: 3,
      roundCount: null,
      qualifiersPerPool: null,
    };
    expect(tournamentTeamCountChoices(shape)[0]).toBe(10);
    expect(tournamentTeamCountFits(shape, 8)).toBe(false);
    expect(tournamentTeamCountStep(shape, 12, -1)).toBe(10);
    expect(tournamentTeamCountStep(shape, 10, -1)).toBeNull();
    expect(tournamentTeamCountStep(shape, 32, 1)).toBeNull();
  });

  it("keeps the Rounds shape's Round count inside two Passes", () => {
    const shape = {
      tournamentShape: "rounds",
      poolCount: 1,
      roundCount: 10,
      qualifiersPerPool: null,
    };
    expect(tournamentTeamCountFits(shape, 4)).toBe(false);
    expect(tournamentTeamCountFits(shape, 6)).toBe(true);
  });

  it("takes any even Knockout only field from 4 to 32", () => {
    const shape = {
      tournamentShape: "knockout_only",
      poolCount: null,
      roundCount: null,
      qualifiersPerPool: null,
    };
    expect(tournamentTeamCountChoices(shape)).toHaveLength(15);
  });
});
