import { describe, expect, it } from "vitest";

import { inviteOutcomeAction, inviteOutcomeCopy } from "./invite-outcome-copy";

describe("inviteOutcomeCopy", () => {
  it("gives invalid and unavailable links different titles", () => {
    const invalid = inviteOutcomeCopy("invalid", "Group", "en");
    const unavailable = inviteOutcomeCopy("unavailable", "Group", "en");
    expect(invalid.title).toBe("Link expired or invalid");
    expect(unavailable.title).toBe("Not accepting new members");
    expect(invalid.title).not.toBe(unavailable.title);
  });

  it("speaks of players for a Game and members otherwise", () => {
    expect(inviteOutcomeCopy("unavailable", "Game", "en")).toEqual({
      title: "Not accepting new players",
      description: "This Game isn't accepting new players right now.",
    });
    expect(inviteOutcomeCopy("unavailable", "Team", "en").description).toBe(
      "This Team isn't accepting new members right now.",
    );
  });

  it("titles the partner wait", () => {
    expect(inviteOutcomeCopy("waiting_for_partner", "Game", "en").title).toBe(
      "Waiting for your partner",
    );
  });

  it("never mentions the auth vendor", () => {
    for (const outcome of [
      "invalid",
      "unavailable",
      "waiting_for_partner",
    ] as const) {
      const copy = inviteOutcomeCopy(outcome, "Group", "en");
      expect(`${copy.title} ${copy.description}`).not.toMatch(/clerk/i);
    }
  });

  it("reads in Arabic", () => {
    expect(inviteOutcomeCopy("unavailable", "Game", "ar")).toEqual({
      title: "لا يقبل لاعبين جددًا",
      description: "هذه المباراة لا تقبل لاعبين جددًا حاليًا.",
    });
  });
});

describe("inviteOutcomeAction", () => {
  it("sends signed-in Users Home", () => {
    expect(inviteOutcomeAction(true, "en")).toEqual({
      label: "Go to Home",
      target: "home",
    });
  });

  it("offers sign-in to signed-out visitors", () => {
    expect(inviteOutcomeAction(false, "en")).toEqual({
      label: "Sign in",
      target: "sign-in",
    });
  });
});
