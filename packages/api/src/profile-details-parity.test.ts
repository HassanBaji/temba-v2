import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  MATCH_HISTORY_VISIBILITY_VALUES,
  PLAY_WINDOW_VALUES,
  USER_GENDER_VALUES,
} from "@repo/db/schema";
import {
  GENDERS,
  MATCH_HISTORY_VISIBILITIES,
  PLAY_WINDOWS,
} from "@repo/domain/profile-details";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

const gendersMatch: Equal<
  (typeof GENDERS)[number],
  (typeof USER_GENDER_VALUES)[number]
> = true;
const windowsMatch: Equal<
  (typeof PLAY_WINDOWS)[number],
  (typeof PLAY_WINDOW_VALUES)[number]
> = true;
const visibilitiesMatch: Equal<
  (typeof MATCH_HISTORY_VISIBILITIES)[number],
  (typeof MATCH_HISTORY_VISIBILITY_VALUES)[number]
> = true;

describe("profile details enums", () => {
  it("list the schema enum values in order", () => {
    assert.ok(gendersMatch && windowsMatch && visibilitiesMatch);
    assert.deepEqual([...GENDERS], [...USER_GENDER_VALUES]);
    assert.deepEqual([...PLAY_WINDOWS], [...PLAY_WINDOW_VALUES]);
    assert.deepEqual(
      [...MATCH_HISTORY_VISIBILITIES],
      [...MATCH_HISTORY_VISIBILITY_VALUES],
    );
  });
});
