import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { GAME_GENDER_TAG_VALUES } from "@repo/db/schema";
import { GAME_GENDER_TAGS } from "@repo/domain/game-gender-tag";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

const tagsMatch: Equal<
  (typeof GAME_GENDER_TAGS)[number],
  (typeof GAME_GENDER_TAG_VALUES)[number]
> = true;

describe("Gender tag values", () => {
  it("list the schema enum values in order", () => {
    assert.ok(tagsMatch);
    assert.deepEqual([...GAME_GENDER_TAGS], [...GAME_GENDER_TAG_VALUES]);
  });
});
