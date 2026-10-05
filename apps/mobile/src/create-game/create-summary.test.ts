import { bahrainDate } from "@repo/domain/bahrain-date.test-support";
import { friendlyTournamentPlan } from "@repo/domain/create-game-submit";
import { describe, expect, it } from "vitest";

import {
  levelRangeSummary,
  PICK_COURTS_FOR_SCHEDULE,
  tournamentMatchTotals,
  tournamentScheduleSummary,
} from "./create-summary";

const NOW = bahrainDate(2026, 9, 4, 12, 0, 0);
const DAY = "2026-10-09";

const groupsOnly = friendlyTournamentPlan({
  teamCount: 12,
  poolCount: 3,
  roundCount: null,
  qualifiersPerPool: 2,
  tournamentShape: "groups_only",
});
const knockoutOnly = friendlyTournamentPlan({
  teamCount: 12,
  poolCount: 3,
  roundCount: null,
  qualifiersPerPool: 2,
  tournamentShape: "knockout_only",
});
const groupsThenKnockout = friendlyTournamentPlan({
  teamCount: 12,
  poolCount: 3,
  roundCount: null,
  qualifiersPerPool: 2,
  tournamentShape: "groups_then_knockout",
});

describe("levelRangeSummary", () => {
  it("reads Any for both bounds and is open when neither is set", () => {
    expect(levelRangeSummary("none", "none")).toEqual({
      minimum: "Any",
      maximum: "Any",
      open: true,
    });
  });

  it("shows the minimum alone", () => {
    expect(levelRangeSummary("C", "none")).toEqual({
      minimum: "C",
      maximum: "Any",
      open: false,
    });
  });

  it("shows the maximum alone", () => {
    expect(levelRangeSummary("none", "B+")).toEqual({
      minimum: "Any",
      maximum: "B+",
      open: false,
    });
  });

  it("shows both bounds", () => {
    expect(levelRangeSummary("D+", "B")).toEqual({
      minimum: "D+",
      maximum: "B",
      open: false,
    });
  });
});

describe("tournamentMatchTotals", () => {
  it("counts every group Match for Groups only", () => {
    expect(tournamentMatchTotals(groupsOnly)).toEqual({
      pool: 18,
      knockout: 0,
      total: 18,
    });
  });

  it("counts Knockout Matches without the Byes", () => {
    expect(knockoutOnly.knockoutTree?.byeCount).toBe(4);
    expect(tournamentMatchTotals(knockoutOnly)).toEqual({
      pool: 0,
      knockout: 11,
      total: 11,
    });
  });

  it("adds the knockout after the groups", () => {
    expect(tournamentMatchTotals(groupsThenKnockout)).toEqual({
      pool: 18,
      knockout: 5,
      total: 23,
    });
  });

  it("follows a custom Round count", () => {
    const plan = friendlyTournamentPlan({
      teamCount: 12,
      poolCount: 3,
      roundCount: 2,
      qualifiersPerPool: 2,
      tournamentShape: "groups_only",
    });
    expect(tournamentMatchTotals(plan)).toEqual({
      pool: 12,
      knockout: 0,
      total: 12,
    });
  });

  it("is zero when the groups do not fit", () => {
    const plan = friendlyTournamentPlan({
      teamCount: 4,
      poolCount: 3,
      roundCount: null,
      qualifiersPerPool: 2,
      tournamentShape: "groups_only",
    });
    expect(tournamentMatchTotals(plan).total).toBe(0);
  });
});

describe("tournamentScheduleSummary", () => {
  const input = {
    plan: groupsThenKnockout,
    day: DAY,
    startTime: "09:00",
    finishTime: "18:00",
    matchMinutes: "45",
    courtCount: 3,
    now: NOW,
  };

  it("reads the Match total, the start and the last finish when it fits", () => {
    expect(tournamentScheduleSummary(input)).toEqual({
      kind: "schedule",
      title: "23 Matches, 9:00 AM to 3:45 PM",
      detail:
        "18 group Matches and 5 knockout Matches. 3 Courts, 45 minutes a Match, 9 slots back to back.",
      lastFinish: "3:45 PM",
      overruns: false,
    });
  });

  it("matches the hero total", () => {
    const summary = tournamentScheduleSummary(input);
    expect(summary?.kind === "schedule" && summary.title).toMatch(
      new RegExp(`^${tournamentMatchTotals(groupsThenKnockout).total} Matches`),
    );
  });

  it("reads Knockout only Matches alone", () => {
    const summary = tournamentScheduleSummary({
      ...input,
      plan: knockoutOnly,
      courtCount: 1,
    });
    expect(summary).toMatchObject({
      kind: "schedule",
      title: "11 Matches, 9:00 AM to 5:15 PM",
      detail:
        "11 knockout Matches. 1 Court, 45 minutes a Match, 11 slots back to back.",
    });
  });

  it("flags an overrun past the finish time", () => {
    const summary = tournamentScheduleSummary({
      ...input,
      finishTime: "12:00",
    });
    expect(summary).toMatchObject({ kind: "schedule", overruns: true });
  });

  it("asks for Courts when none are picked", () => {
    expect(tournamentScheduleSummary({ ...input, courtCount: 0 })).toEqual({
      kind: "pickCourts",
      message: PICK_COURTS_FOR_SCHEDULE,
    });
  });

  it("has nothing to show with invalid Game length minutes", () => {
    expect(
      tournamentScheduleSummary({ ...input, matchMinutes: "7" }),
    ).toBeNull();
  });

  it("has nothing to show without a start time", () => {
    expect(tournamentScheduleSummary({ ...input, startTime: "" })).toBeNull();
  });
});
