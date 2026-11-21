import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  footballBibs,
  footballDraftAnswers,
  footballFirstPicks,
  footballPickStatuses,
  footballPositions,
  footballRoles,
  footballTeamsMethods,
} from "@repo/db/schema";
import {
  FOOTBALL_BIBS,
  FOOTBALL_DRAFT_ANSWERS,
  FOOTBALL_FIRST_PICKS,
  FOOTBALL_PICK_STATUSES,
  FOOTBALL_POSITIONS,
  FOOTBALL_ROLES,
  FOOTBALL_TEAMS_METHODS,
} from "@repo/domain/football-lineup";

describe("football lineup enums", () => {
  it("list the schema enum values in order", () => {
    assert.deepEqual([...FOOTBALL_ROLES], footballRoles.enumValues);
    assert.deepEqual([...FOOTBALL_POSITIONS], footballPositions.enumValues);
    assert.deepEqual([...FOOTBALL_BIBS], footballBibs.enumValues);
    assert.deepEqual(
      [...FOOTBALL_TEAMS_METHODS],
      footballTeamsMethods.enumValues,
    );
    assert.deepEqual(
      [...FOOTBALL_DRAFT_ANSWERS],
      footballDraftAnswers.enumValues,
    );
    assert.deepEqual(
      [...FOOTBALL_PICK_STATUSES],
      footballPickStatuses.enumValues,
    );
    assert.deepEqual([...FOOTBALL_FIRST_PICKS], footballFirstPicks.enumValues);
  });
});
