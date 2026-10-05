import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { bahrainDate } from "./bahrain-date.test-support";
import { createCreateGameFixtures } from "./create-game-fixtures";
import {
  validateFriendlyGameSubmit,
  validateFriendlyTournamentSubmit,
  validateTournamentStepThree,
} from "./create-game-submit";
import { LEVEL_RANGE_INVERTED_MESSAGE } from "./level-range";

const NOW = bahrainDate(2026, 9, 4, 12, 0, 0);
const fixtures = createCreateGameFixtures(NOW);
const drafts = fixtures.drafts;
const withDay = (draft: (typeof drafts)["emptyGame"]) => ({
  ...draft,
  day: "2026-10-09",
});

describe("create game fixtures", () => {
  it("submits the complete game and tournament drafts", () => {
    assert.ok(validateFriendlyGameSubmit(withDay(drafts.gameReview), NOW).ok);
    for (const key of [
      "tournamentGroupsOnly",
      "tournamentKnockoutOnly",
      "tournamentGroupsThenKnockout",
      "tournamentReview",
    ] as const) {
      assert.ok(
        validateFriendlyTournamentSubmit(withDay(drafts[key]), NOW).ok,
        key,
      );
    }
  });

  it("carries the failing states the validation messages describe", () => {
    const level = validateFriendlyGameSubmit(
      withDay(drafts.invertedLevelRange),
      NOW,
    );
    assert.ok(!level.ok);
    if (!level.ok) {
      assert.equal(level.message, LEVEL_RANGE_INVERTED_MESSAGE);
    }
    const price = validateFriendlyGameSubmit(withDay(drafts.badPrice), NOW);
    assert.ok(!price.ok);
    assert.equal(
      validateTournamentStepThree(withDay(drafts.teamCountDoesNotFit), NOW)
        ?.message,
      "Pick a groups count",
    );
  });

  it("locks a Club Group to its linked Venue", () => {
    assert.equal(fixtures.pickers.club.locked, true);
    assert.equal(fixtures.pickers.club.venues.length, 1);
  });
});
