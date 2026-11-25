import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  GAME_GENDER_TAGS,
  gameGenderTagLabel,
  isGameGenderTag,
} from "./game-gender-tag";

describe("gameGenderTagLabel", () => {
  it("names each Gender tag in English and Arabic", () => {
    assert.deepEqual(
      GAME_GENDER_TAGS.map((tag) => gameGenderTagLabel(tag, "en")),
      ["Men only", "Women only", "Mixed"],
    );
    assert.deepEqual(
      GAME_GENDER_TAGS.map((tag) => gameGenderTagLabel(tag, "ar")),
      ["رجال فقط", "سيدات فقط", "مختلط"],
    );
  });

  it("is null for a Game with no Gender tag or an unknown value", () => {
    assert.equal(gameGenderTagLabel(null, "en"), null);
    assert.equal(gameGenderTagLabel(undefined, "en"), null);
    assert.equal(gameGenderTagLabel("everyone", "en"), null);
  });
});

describe("isGameGenderTag", () => {
  it("accepts only the three Gender tags", () => {
    assert.ok(GAME_GENDER_TAGS.every(isGameGenderTag));
    assert.equal(isGameGenderTag(""), false);
    assert.equal(isGameGenderTag(null), false);
  });
});
