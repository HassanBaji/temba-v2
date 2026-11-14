import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { bahrainDate } from "./bahrain-date.test-support";
import {
  applyTeamCountChange,
  friendlyTournamentPlan,
  friendlyTournamentScheduleFor,
  reclampQualifiersPerPool,
  validateFootballGameSubmit,
  validateFriendlyGameSubmit,
  validateFriendlyTournamentSubmit,
  validateTournamentStepThree,
} from "./create-game-submit";
import { levelRangeInvertedMessage } from "./level-range";

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
    const result = validateFriendlyGameSubmit(game, NOW, "en");
    assert.ok(result.ok);
    if (result.ok) {
      assert.equal(result.input.groupId, "group-1");
      assert.equal(result.input.courtId, undefined);
      assert.equal(result.input.format, "friendly_game");
      assert.equal("pricePerPlayerFils" in result.input, false);
      assert.equal("rated" in result.input, false);
    }
  });

  it("sends rated false only when the creator picked Unrated", () => {
    const unrated = validateFriendlyGameSubmit(
      { ...game, rated: false },
      NOW,
      "en",
    );
    assert.ok(unrated.ok);
    if (unrated.ok) {
      assert.equal(unrated.input.rated, false);
    }
    const rated = validateFriendlyGameSubmit(
      { ...game, rated: true },
      NOW,
      "en",
    );
    assert.ok(rated.ok);
    if (rated.ok) {
      assert.equal("rated" in rated.input, false);
    }
  });

  it("reports the earliest incomplete step", () => {
    const where = validateFriendlyGameSubmit(
      { ...game, groupId: "" },
      NOW,
      "en",
    );
    assert.ok(!where.ok);
    if (!where.ok) {
      assert.equal(where.step, 2);
      assert.equal(where.message, "Pick a Group");
    }
    const when = validateFriendlyGameSubmit(
      { ...game, startTime: "" },
      NOW,
      "en",
    );
    assert.ok(!when.ok);
    if (!when.ok) {
      assert.equal(when.step, 3);
    }
  });

  it("rejects a bad price and an inverted Level range at step 4", () => {
    const price = validateFriendlyGameSubmit(
      { ...game, pricePerPlayer: "abc" },
      NOW,
      "en",
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
      "en",
    );
    assert.ok(!level.ok);
    if (!level.ok) {
      assert.equal(level.field, "levelMinTenths");
      assert.equal(level.message, levelRangeInvertedMessage("en"));
    }
  });

  it("sends the price in fils and the Level bounds as tenths", () => {
    const result = validateFriendlyGameSubmit(
      { ...game, courtId: "court-1", pricePerPlayer: "4.5", levelMin: "C" },
      NOW,
      "en",
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

const football = {
  groupId: "group-1",
  venueId: "venue-1",
  courtId: "none",
  day: "2026-09-23",
  startTime: "20:00",
  finishTime: "21:30",
  pricePerPlayer: "",
  sideSize: 5,
  playersAllowed: 12,
} as const;

describe("validateFriendlyGameSubmit Public Game", () => {
  it("sends no Group, isPublic and no Rating choice", () => {
    const result = validateFriendlyGameSubmit(
      {
        ...game,
        groupId: "",
        isPublic: true,
        rated: false,
        levelMin: "C",
        levelMax: "B",
      },
      NOW,
      "en",
    );
    assert.ok(result.ok);
    if (result.ok) {
      assert.equal("groupId" in result.input, false);
      assert.equal(result.input.isPublic, true);
      assert.equal("rated" in result.input, false);
      assert.equal(typeof result.input.levelMinTenths, "number");
    }
  });

  it("still asks for a Group when the draft is not public", () => {
    const result = validateFriendlyGameSubmit(
      { ...game, groupId: "" },
      NOW,
      "en",
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.field, "groupId");
      assert.equal(result.step, 2);
    }
  });

  it("asks a Public Game for a Venue", () => {
    const result = validateFriendlyGameSubmit(
      { ...game, groupId: "", venueId: "", isPublic: true },
      NOW,
      "en",
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.field, "venueId");
    }
  });
});

describe("validateFootballGameSubmit Public Game", () => {
  it("sends football with no Group, isPublic, the OVR range and no Rating choice", () => {
    const result = validateFootballGameSubmit(
      {
        ...football,
        groupId: "",
        isPublic: true,
        rated: false,
        levelMin: "C+",
        levelMax: "B",
      },
      NOW,
      "en",
      { levelRange: true },
    );
    assert.ok(result.ok);
    if (result.ok) {
      assert.equal("groupId" in result.input, false);
      assert.equal(result.input.isPublic, true);
      assert.equal(
        "sport" in result.input ? result.input.sport : null,
        "football",
      );
      assert.equal("rated" in result.input, false);
      assert.equal(result.input.sideSize, 5);
      assert.equal(result.input.levelMinTenths, 35);
      assert.equal(result.input.levelMaxTenths, 55);
    }
  });

  it("still needs a Venue", () => {
    const result = validateFootballGameSubmit(
      { ...football, groupId: "", venueId: "", isPublic: true },
      NOW,
      "en",
    );
    assert.equal(result.ok ? null : result.field, "venueId");
  });
});

describe("validateFootballGameSubmit", () => {
  it("sends the side size and cap with no sport, Level range or seats", () => {
    const result = validateFootballGameSubmit(
      { ...football, courtId: "pitch-1", pricePerPlayer: "2.5" },
      NOW,
      "en",
    );
    assert.ok(result.ok);
    if (result.ok) {
      assert.equal(result.input.format, "friendly_game");
      assert.equal(result.input.registrationMode, "individual");
      assert.equal(result.input.sideSize, 5);
      assert.equal(result.input.playersAllowed, 12);
      assert.equal(result.input.courtId, "pitch-1");
      assert.equal(result.input.pricePerPlayerFils, 2500);
      assert.equal(result.input.isPublic, false);
      assert.equal("sport" in result.input, false);
      assert.equal("levelMinTenths" in result.input, false);
      assert.equal("levelMaxTenths" in result.input, false);
    }
  });

  it("sends a Level range only on a Game that counts for Temba Level", () => {
    const draft = { ...football, levelMin: "C+", levelMax: "B" } as const;
    const ignored = validateFootballGameSubmit(draft, NOW, "en");
    assert.ok(ignored.ok);
    if (ignored.ok) {
      assert.equal("levelMinTenths" in ignored.input, false);
    }
    const counting = validateFootballGameSubmit(draft, NOW, "en", {
      levelRange: true,
    });
    assert.ok(counting.ok);
    if (counting.ok) {
      assert.equal(counting.input.levelMinTenths, 35);
      assert.equal(typeof counting.input.levelMaxTenths, "number");
    }
    const inverted = validateFootballGameSubmit(
      { ...football, levelMin: "B", levelMax: "C+" },
      NOW,
      "en",
      { levelRange: true },
    );
    assert.equal(inverted.ok, false);
  });

  it("sends only the Unrated choice", () => {
    const unrated = validateFootballGameSubmit(
      { ...football, rated: false },
      NOW,
      "en",
    );
    const rated = validateFootballGameSubmit(
      { ...football, rated: true },
      NOW,
      "en",
    );
    assert.ok(unrated.ok && rated.ok);
    if (unrated.ok && rated.ok) {
      assert.equal(unrated.input.rated, false);
      assert.equal("rated" in rated.input, false);
    }
  });

  it("leaves the pitch out when none is picked", () => {
    const result = validateFootballGameSubmit(football, NOW, "en");
    assert.ok(result.ok);
    if (result.ok) {
      assert.equal(result.input.courtId, undefined);
      assert.equal("pricePerPlayerFils" in result.input, false);
    }
  });

  it("reports the earliest incomplete step", () => {
    const where = validateFootballGameSubmit(
      { ...football, venueId: "" },
      NOW,
      "en",
    );
    assert.ok(!where.ok);
    if (!where.ok) {
      assert.equal(where.step, 2);
    }
    const when = validateFootballGameSubmit(
      { ...football, startTime: "" },
      NOW,
      "en",
    );
    assert.ok(!when.ok);
    if (!when.ok) {
      assert.equal(when.step, 3);
    }
  });

  it("refuses a cap below twice the side size or past 40", () => {
    for (const playersAllowed of [9, 41]) {
      const result = validateFootballGameSubmit(
        { ...football, playersAllowed },
        NOW,
        "en",
      );
      assert.ok(!result.ok);
      if (!result.ok) {
        assert.equal(result.step, 4);
        assert.equal(result.field, "playersAllowed");
        assert.equal(
          result.message,
          "Players allowed must be between 10 and 40",
        );
      }
    }
  });

  it("refuses an unknown side size and a bad price", () => {
    const size = validateFootballGameSubmit(
      { ...football, sideSize: 4 },
      NOW,
      "en",
    );
    assert.ok(!size.ok);
    if (!size.ok) {
      assert.equal(size.field, "sideSize");
    }
    const price = validateFootballGameSubmit(
      { ...football, pricePerPlayer: "abc" },
      NOW,
      "en",
    );
    assert.ok(!price.ok);
    if (!price.ok) {
      assert.equal(price.field, "pricePerPlayerFils");
      assert.equal(price.step, 4);
    }
  });
});

describe("validateFriendlyTournamentSubmit", () => {
  it("trims the name and omits pool fields for knockout only", () => {
    const groups = validateFriendlyTournamentSubmit(
      tournament,
      NOW,
      true,
      "en",
    );
    assert.ok(groups.ok);
    if (groups.ok) {
      assert.equal(groups.input.name, "Friday cup");
      assert.equal(groups.input.poolCount, 3);
      assert.deepEqual(groups.input.courtIds, ["court-1"]);
      assert.equal("qualifiersPerPool" in groups.input, false);
      assert.equal("rated" in groups.input, false);
    }
    const knockout = validateFriendlyTournamentSubmit(
      { ...tournament, tournamentShape: "knockout_only", courtIds: [] },
      NOW,
      true,
      "en",
    );
    assert.ok(knockout.ok);
    if (knockout.ok) {
      assert.equal("poolCount" in knockout.input, false);
      assert.equal("courtIds" in knockout.input, false);
    }
    const then = validateFriendlyTournamentSubmit(
      { ...tournament, tournamentShape: "groups_then_knockout", roundCount: 2 },
      NOW,
      true,
      "en",
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
      true,
      "en",
    );
    assert.ok(!minutes.ok);
    if (!minutes.ok) {
      assert.equal(minutes.step, 3);
      assert.equal(minutes.elementId, "tournament-match-minutes");
    }
    const name = validateFriendlyTournamentSubmit(
      { ...tournament, name: "  " },
      NOW,
      true,
      "en",
    );
    assert.ok(!name.ok);
    if (!name.ok) {
      assert.equal(name.step, 4);
      assert.equal(name.message, "Name the tournament");
    }
  });
});

describe("validateFriendlyTournamentSubmit, King of the court", () => {
  const king = {
    ...tournament,
    tournamentShape: "king_of_the_court",
    teamCount: 8,
  } as const;

  it("keeps the creator's Rating choice", () => {
    const rated = validateFriendlyTournamentSubmit(king, NOW, true, "en");
    const unrated = validateFriendlyTournamentSubmit(
      { ...king, rated: false },
      NOW,
      true,
      "en",
    );
    assert.ok(rated.ok && unrated.ok);
    if (rated.ok && unrated.ok) {
      assert.equal("rated" in rated.input, false);
      assert.equal(unrated.input.rated, false);
    }
  });
});

describe("validateFriendlyTournamentSubmit Rating choice", () => {
  it("sends rated false when the creator picked Unrated", () => {
    const result = validateFriendlyTournamentSubmit(
      { ...tournament, rated: false },
      NOW,
      false,
      "en",
    );
    assert.ok(result.ok);
    if (result.ok) {
      assert.equal(result.input.rated, false);
    }
  });
});

describe("validateFriendlyTournamentSubmit public Games", () => {
  const publicDraft = { ...tournament, isPublic: true };

  it("keeps a public choice on a Verified Group", () => {
    const result = validateFriendlyTournamentSubmit(
      publicDraft,
      NOW,
      true,
      "en",
    );
    assert.ok(result.ok);
    if (result.ok) {
      assert.equal(result.input.isPublic, true);
    }
  });

  it("never sends public for a Group that is not Verified", () => {
    const result = validateFriendlyTournamentSubmit(
      publicDraft,
      NOW,
      false,
      "en",
    );
    assert.ok(result.ok);
    if (result.ok) {
      assert.equal(result.input.isPublic, false);
    }
  });
});

describe("validateTournamentStepThree", () => {
  it("passes a complete step", () => {
    assert.equal(validateTournamentStepThree(tournament, NOW, "en"), null);
  });

  it("flags a groups count that does not fit the Game team count", () => {
    const issue = validateTournamentStepThree(
      { ...tournament, teamCount: 4, poolCount: 3 },
      NOW,
      "en",
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
        "en",
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
      locale: "en" as const,
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

describe("Arabic validation", () => {
  it("reports the issue in Arabic", () => {
    const where = validateFriendlyGameSubmit(
      { ...game, groupId: "" },
      NOW,
      "ar",
    );
    assert.ok(!where.ok);
    if (!where.ok) {
      assert.equal(where.message, "اختر مجموعة");
    }
    const cap = validateFootballGameSubmit(
      { ...football, playersAllowed: 9 },
      NOW,
      "ar",
    );
    assert.ok(!cap.ok);
    if (!cap.ok) {
      assert.equal(
        cap.message,
        "يجب أن يكون عدد اللاعبين المسموح به بين 10 و40",
      );
    }
  });
});
