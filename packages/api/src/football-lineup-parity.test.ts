import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  footballBibs,
  footballPositions,
  footballRoles,
  footballTeamsMethods,
} from "@repo/db/schema";
import {
  FOOTBALL_BIBS,
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
  });
});
