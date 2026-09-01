import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  gameSummaryPrimaryAction,
  showsFriendlyRoster,
  type GameSummaryCtaInput,
} from "./game-summary-cta";

function game(
  overrides: Partial<GameSummaryCtaInput> = {},
): GameSummaryCtaInput {
  return {
    format: "friendly_game",
    registrationMode: "individual",
    canRegister: false,
    canWaitlist: false,
    joinFrozen: false,
    isRegistered: false,
    isSeated: false,
    isWaitlisted: false,
    registrationStatus: "open",
    ...overrides,
  };
}

describe("gameSummaryPrimaryAction", () => {
  it("offers Join on an open individual Friendly game", () => {
    assert.equal(gameSummaryPrimaryAction(game({ canRegister: true })), "join");
  });

  it("offers Join waitlist when the Friendly game is full", () => {
    assert.equal(
      gameSummaryPrimaryAction(
        game({
          canWaitlist: true,
          registrationStatus: "full",
        }),
      ),
      "join_waitlist",
    );
  });

  it("offers View when already registered, seated, or waitlisted", () => {
    assert.equal(
      gameSummaryPrimaryAction(game({ canRegister: true, isRegistered: true })),
      "view",
    );
    assert.equal(
      gameSummaryPrimaryAction(game({ canRegister: true, isSeated: true })),
      "view",
    );
    assert.equal(
      gameSummaryPrimaryAction(game({ canWaitlist: true, isWaitlisted: true })),
      "view",
    );
  });

  it("offers View when Soft-archived, closed, or cancelled", () => {
    assert.equal(
      gameSummaryPrimaryAction(game({ canRegister: true, joinFrozen: true })),
      "view",
    );
    assert.equal(
      gameSummaryPrimaryAction(
        game({ canRegister: true, registrationStatus: "closed" }),
      ),
      "view",
    );
    assert.equal(
      gameSummaryPrimaryAction(
        game({ canRegister: true, registrationStatus: "cancelled" }),
      ),
      "view",
    );
  });

  it("offers View on team-only Games", () => {
    assert.equal(
      gameSummaryPrimaryAction(
        game({
          registrationMode: "team_only",
          canRegister: true,
        }),
      ),
      "view",
    );
  });

  it("offers Register or Join waitlist on Americano without a seat sheet", () => {
    assert.equal(
      gameSummaryPrimaryAction(
        game({ format: "americano", canRegister: true }),
      ),
      "register",
    );
    assert.equal(
      gameSummaryPrimaryAction(
        game({
          format: "americano",
          canWaitlist: true,
          registrationStatus: "full",
        }),
      ),
      "join_waitlist",
    );
  });

  it("keeps Friendly tournament on View or waitlist without Join", () => {
    assert.equal(
      gameSummaryPrimaryAction(
        game({ format: "friendly_tournament", canRegister: true }),
      ),
      "view",
    );
    assert.equal(
      gameSummaryPrimaryAction(
        game({
          format: "friendly_tournament",
          canWaitlist: true,
          registrationStatus: "full",
        }),
      ),
      "join_waitlist",
    );
  });
});

describe("showsFriendlyRoster", () => {
  it("is only true for individual Friendly game", () => {
    assert.equal(showsFriendlyRoster("friendly_game", "individual"), true);
    assert.equal(showsFriendlyRoster("friendly_game", "team_only"), false);
    assert.equal(showsFriendlyRoster("americano", "individual"), false);
    assert.equal(
      showsFriendlyRoster("friendly_tournament", "individual"),
      false,
    );
  });
});
