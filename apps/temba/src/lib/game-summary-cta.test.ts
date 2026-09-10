import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  gameCardActionLabel,
  gameCardActionSolid,
  gameSummaryPrimaryAction,
  gameViewerStatus,
  showsFriendlyRoster,
  showsGameCardFooterAction,
  showsGameCardPartnerFooter,
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

describe("gameViewerStatus", () => {
  it("is null when the viewer has no standing on the Game", () => {
    assert.equal(gameViewerStatus(game()), null);
  });

  it("reads as in when seated or registered", () => {
    assert.equal(gameViewerStatus(game({ isSeated: true })), "in");
    assert.equal(gameViewerStatus(game({ isRegistered: true })), "in");
  });

  it("reads as waitlisted only without a seat or registration", () => {
    assert.equal(gameViewerStatus(game({ isWaitlisted: true })), "waitlisted");
    assert.equal(
      gameViewerStatus(game({ isWaitlisted: true, isSeated: true })),
      "in",
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

describe("gameCardActionLabel", () => {
  it("uses Join game for an open Friendly join", () => {
    assert.equal(gameCardActionLabel("join"), "Join game");
  });

  it("offers Invite a player when the viewer is in and a seat is open", () => {
    assert.equal(
      gameCardActionLabel("view", { viewerIn: true, openSpots: 1 }),
      "Invite a player",
    );
  });

  it("falls back to Details when the Game is full or the viewer is out", () => {
    assert.equal(
      gameCardActionLabel("view", { viewerIn: true, openSpots: 0 }),
      "Details",
    );
    assert.equal(gameCardActionLabel("view"), "Details");
  });
});

describe("gameCardActionSolid", () => {
  it("keeps Invite a player and join actions solid", () => {
    assert.equal(gameCardActionSolid("Invite a player", "view"), true);
    assert.equal(gameCardActionSolid("Join game", "join"), true);
    assert.equal(gameCardActionSolid("Details", "view"), false);
  });
});

describe("showsGameCardFooterAction", () => {
  it("omits Join game when the Friendly roster is shown", () => {
    assert.equal(showsGameCardFooterAction("join", true), false);
  });

  it("keeps Join game when there is no roster to join from", () => {
    assert.equal(showsGameCardFooterAction("join", false), true);
  });

  it("keeps Join waitlist, Register, and Details with a roster", () => {
    assert.equal(showsGameCardFooterAction("join_waitlist", true), true);
    assert.equal(showsGameCardFooterAction("register", true), true);
    assert.equal(showsGameCardFooterAction("view", true), true);
  });
});

const occupant = { name: "Ada" };

describe("showsGameCardPartnerFooter", () => {
  it("shows Join with a partner when primary action is join and a side is fully vacant", () => {
    assert.equal(
      showsGameCardPartnerFooter("join", [
        { left: occupant, right: occupant },
        { left: null, right: null },
      ]),
      true,
    );
  });

  it("hides when sides are only half-full", () => {
    assert.equal(
      showsGameCardPartnerFooter("join", [
        { left: occupant, right: null },
        { left: null, right: occupant },
      ]),
      false,
    );
  });

  it("hides when there is no roster", () => {
    assert.equal(showsGameCardPartnerFooter("join", undefined), false);
    assert.equal(showsGameCardPartnerFooter("join", []), false);
  });

  it("hides for waitlist, view, and register even with a vacant side", () => {
    const vacant = [
      { left: occupant, right: occupant },
      { left: null, right: null },
    ];
    assert.equal(showsGameCardPartnerFooter("join_waitlist", vacant), false);
    assert.equal(showsGameCardPartnerFooter("view", vacant), false);
    assert.equal(showsGameCardPartnerFooter("register", vacant), false);
  });
});
