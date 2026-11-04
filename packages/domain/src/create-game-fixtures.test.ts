import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { bahrainDate } from "./bahrain-date.test-support";
import { createCreateGameFixtures } from "./create-game-fixtures";
import {
  validateFriendlyGameSubmit,
  validateFriendlyTournamentSubmit,
  validateTournamentStepThree,
} from "./create-game-submit";
import { levelRangeInvertedMessage } from "./level-range";

const NOW = bahrainDate(2026, 9, 4, 12, 0, 0);
const fixtures = createCreateGameFixtures(NOW);
const drafts = fixtures.drafts;
const withDay = (draft: (typeof drafts)["emptyGame"]) => ({
  ...draft,
  day: "2026-10-09",
});

describe("create game fixtures", () => {
  it("submits the complete game and tournament drafts", () => {
    assert.ok(
      validateFriendlyGameSubmit(withDay(drafts.gameReview), NOW, "en").ok,
    );
    for (const key of [
      "tournamentGroupsOnly",
      "tournamentKnockoutOnly",
      "tournamentGroupsThenKnockout",
      "tournamentReview",
    ] as const) {
      assert.ok(
        validateFriendlyTournamentSubmit(withDay(drafts[key]), NOW, true, "en")
          .ok,
        key,
      );
    }
  });

  it("carries the failing states the validation messages describe", () => {
    const level = validateFriendlyGameSubmit(
      withDay(drafts.invertedLevelRange),
      NOW,
      "en",
    );
    assert.ok(!level.ok);
    if (!level.ok) {
      assert.equal(level.message, levelRangeInvertedMessage("en"));
    }
    const price = validateFriendlyGameSubmit(
      withDay(drafts.badPrice),
      NOW,
      "en",
    );
    assert.ok(!price.ok);
    assert.equal(
      validateTournamentStepThree(
        withDay(drafts.teamCountDoesNotFit),
        NOW,
        "en",
      )?.message,
      "Pick a groups count",
    );
  });

  it("locks a Club Group to its linked Venue", () => {
    assert.equal(fixtures.pickers.club.locked, true);
    assert.equal(fixtures.pickers.club.venues.length, 1);
  });
});
