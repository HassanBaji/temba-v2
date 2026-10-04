import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { bahrainDate } from "./bahrain-date.test-support";
import {
  applyTeamCountChange,
  friendlyTournamentPlan,
  friendlyTournamentScheduleFor,
  reclampQualifiersPerPool,
  validateFriendlyGameSubmit,
  validateFriendlyTournamentSubmit,
  validateTournamentStepThree,
} from "./create-game-submit";
import { LEVEL_RANGE_INVERTED_MESSAGE } from "./level-range";

const NOW = bahrainDate(2026, 8, 22, 12, 0, 0);

const game = {
  groupId: "group-1",
  venueId: "venue-1",
  courtId: "none",
  day: "2026-09-23",
  startTime: "20:00",
  finishTime: "21:30",
  pricePerPlayer: "",
  levelMin: "none",
  levelMax: "none",
} as const;

const tournament = {
  groupId: "group-1",
  venueId: "venue-1",
  courtIds: ["court-1"],
  day: "2026-09-23",
  startTime: "09:00",
  finishTime: "18:00",
  pricePerPlayer: "",
  levelMin: "none",
  levelMax: "none",
  teamCount: 12,
  tournamentShape: "groups_only",
  poolCount: 3,
  roundCount: null,
  qualifiersPerPool: 2,
  matchMinutes: "45",
  name: " Friday cup ",
  isPublic: false,
  allowSoloRegister: true,
} as const;

describe("validateFriendlyGameSubmit", () => {
  it("builds the create input from a complete draft", () => {
    const result = validateFriendlyGameSubmit(game, NOW);
    assert.ok(result.ok);
    if (result.ok) {
      assert.equal(result.input.groupId, "group-1");
      assert.equal(result.input.courtId, undefined);
      assert.equal(result.input.format, "friendly_game");
      assert.equal("pricePerPlayerFils" in result.input, false);
    }
  });

  it("reports the earliest incomplete step", () => {
    const where = validateFriendlyGameSubmit({ ...game, groupId: "" }, NOW);
    assert.ok(!where.ok);
    if (!where.ok) {
      assert.equal(where.step, 2);
      assert.equal(where.message, "Pick a Group");
    }
    const when = validateFriendlyGameSubmit({ ...game, startTime: "" }, NOW);
    assert.ok(!when.ok);
    if (!when.ok) {
      assert.equal(when.step, 3);
    }
  });

  it("rejects a bad price and an inverted Level range at step 4", () => {
    const price = validateFriendlyGameSubmit(
      { ...game, pricePerPlayer: "abc" },
      NOW,
    );
    assert.ok(!price.ok);
    if (!price.ok) {
      assert.equal(price.step, 4);
      assert.equal(price.field, "pricePerPlayerFils");
      assert.equal(price.message, "Enter a valid amount");
    }
    const level = validateFriendlyGameSubmit(
      { ...game, levelMin: "B", levelMax: "C" },
      NOW,
    );
    assert.ok(!level.ok);
    if (!level.ok) {
      assert.equal(level.field, "levelMinTenths");
      assert.equal(level.message, LEVEL_RANGE_INVERTED_MESSAGE);
    }
  });

  it("sends the price in fils and the Level bounds as tenths", () => {
    const result = validateFriendlyGameSubmit(
      { ...game, courtId: "court-1", pricePerPlayer: "4.5", levelMin: "C" },
      NOW,
    );
    assert.ok(result.ok);
    if (result.ok) {
      assert.equal(result.input.pricePerPlayerFils, 4500);
      assert.equal(result.input.courtId, "court-1");
      assert.equal(typeof result.input.levelMinTenths, "number");
      assert.equal("levelMaxTenths" in result.input, false);
    }
  });
});

describe("validateFriendlyTournamentSubmit", () => {
  it("trims the name and omits pool fields for knockout only", () => {
    const groups = validateFriendlyTournamentSubmit(tournament, NOW);
    assert.ok(groups.ok);
    if (groups.ok) {
      assert.equal(groups.input.name, "Friday cup");
      assert.equal(groups.input.poolCount, 3);
      assert.deepEqual(groups.input.courtIds, ["court-1"]);
      assert.equal("qualifiersPerPool" in groups.input, false);
    }
    const knockout = validateFriendlyTournamentSubmit(
      { ...tournament, tournamentShape: "knockout_only", courtIds: [] },
      NOW,
    );
    assert.ok(knockout.ok);
    if (knockout.ok) {
      assert.equal("poolCount" in knockout.input, false);
      assert.equal("courtIds" in knockout.input, false);
    }
    const then = validateFriendlyTournamentSubmit(
      { ...tournament, tournamentShape: "groups_then_knockout", roundCount: 2 },
      NOW,
    );
    assert.ok(then.ok);
    if (then.ok) {
      assert.equal(then.input.qualifiersPerPool, 2);
      assert.equal(then.input.roundCount, 2);
    }
  });

  it("reports match length at step 3 and the name at step 4", () => {
    const minutes = validateFriendlyTournamentSubmit(
      { ...tournament, matchMinutes: "7" },
      NOW,
    );
    assert.ok(!minutes.ok);
    if (!minutes.ok) {
      assert.equal(minutes.step, 3);
      assert.equal(minutes.elementId, "tournament-match-minutes");
    }
    const name = validateFriendlyTournamentSubmit(
      { ...tournament, name: "  " },
      NOW,
    );
    assert.ok(!name.ok);
    if (!name.ok) {
      assert.equal(name.step, 4);
      assert.equal(name.message, "Name the tournament");
    }
  });
});

describe("validateTournamentStepThree", () => {
  it("passes a complete step", () => {
    assert.equal(validateTournamentStepThree(tournament, NOW), null);
  });

  it("flags a groups count that does not fit the Game team count", () => {
    const issue = validateTournamentStepThree(
      { ...tournament, teamCount: 4, poolCount: 3 },
      NOW,
    );
    assert.equal(issue?.field, "poolCount");
    assert.equal(issue?.message, "Pick a groups count");
  });

  it("ignores the groups count for knockout only", () => {
    assert.equal(
      validateTournamentStepThree(
        {
          ...tournament,
          tournamentShape: "knockout_only",
          teamCount: 4,
          poolCount: 3,
        },
        NOW,
      ),
      null,
    );
  });
});

describe("tournament sizing helpers", () => {
  it("keeps a valid groups count and clamps qualifiers when the team count changes", () => {
    const next = applyTeamCountChange(
      { poolCount: 3, qualifiersPerPool: 2 },
      12,
    );
    assert.deepEqual(next, {
      teamCount: 12,
      poolCount: 3,
      qualifiersPerPool: 2,
      roundCount: null,
    });
  });

  it("falls back to the default groups count when the old one no longer fits", () => {
    const next = applyTeamCountChange(
      { poolCount: 6, qualifiersPerPool: 2 },
      4,
    );
    assert.ok(next.poolCount <= 2);
  });

  it("returns the current qualifiers when sizing is invalid", () => {
    assert.equal(reclampQualifiersPerPool(4, 9, 3), 3);
  });

  it("plans each Tournament shape", () => {
    const base = {
      teamCount: 12,
      poolCount: 3,
      roundCount: null,
      qualifiersPerPool: 2,
    };
    const groups = friendlyTournamentPlan({
      ...base,
      tournamentShape: "groups_only",
    });
    assert.ok(groups.sizing && groups.rounds);
    assert.equal(groups.knockoutTree, null);
    const knockout = friendlyTournamentPlan({
      ...base,
      tournamentShape: "knockout_only",
    });
    assert.ok(knockout.knockoutTree);
    assert.equal(knockout.sizing, null);
    const both = friendlyTournamentPlan({
      ...base,
      tournamentShape: "groups_then_knockout",
    });
    assert.ok(both.poolKnockoutTree && both.qualifiersRange);
  });

  it("schedules only once the window and match length are valid", () => {
    const plan = friendlyTournamentPlan({
      teamCount: 12,
      poolCount: 3,
      roundCount: null,
      qualifiersPerPool: 2,
      tournamentShape: "groups_only",
    });
    const input = {
      plan,
      day: "2026-09-23",
      startTime: "09:00",
      finishTime: "18:00",
      matchMinutes: "45",
      courtCount: 2,
      now: NOW,
      clock: (date: Date) => date.toISOString(),
    };
    assert.ok(friendlyTournamentScheduleFor(input)?.line);
    assert.equal(
      friendlyTournamentScheduleFor({ ...input, matchMinutes: "x" }),
      null,
    );
    assert.equal(
      friendlyTournamentScheduleFor({ ...input, startTime: "" }),
      null,
    );
  });
});
