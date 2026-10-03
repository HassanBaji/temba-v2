import { describe, expect, it } from "vitest";

import {
  inviteOutcomeAction,
  inviteOutcomeCopy,
} from "~/lib/invite-outcome-copy";

describe("inviteOutcomeCopy", () => {
  it("gives invalid and unavailable links different titles", () => {
    const invalid = inviteOutcomeCopy("invalid", "Community");
    const unavailable = inviteOutcomeCopy("unavailable", "Community");
    expect(invalid.title).toBe("Link expired or invalid");
    expect(unavailable.title).toBe("Not accepting new members");
    expect(invalid.title).not.toBe(unavailable.title);
  });

  it("speaks of players for a Game and members otherwise", () => {
    expect(inviteOutcomeCopy("unavailable", "Game")).toEqual({
      title: "Not accepting new players",
      description: "This Game isn't accepting new players right now.",
    });
    expect(inviteOutcomeCopy("unavailable", "Team").description).toBe(
      "This Team isn't accepting new members right now.",
    );
  });

  it("titles the partner wait", () => {
    expect(inviteOutcomeCopy("waiting_for_partner", "Game").title).toBe(
      "Waiting for your partner",
    );
  });

  it("never mentions the auth vendor", () => {
    for (const outcome of [
      "invalid",
      "unavailable",
      "waiting_for_partner",
    ] as const) {
      const copy = inviteOutcomeCopy(outcome, "Group");
      expect(`${copy.title} ${copy.description}`).not.toMatch(/clerk/i);
    }
  });
});

describe("inviteOutcomeAction", () => {
  it("sends signed-in Users Home", () => {
    expect(inviteOutcomeAction(true)).toEqual({
      label: "Go to Home",
      href: "/dashboard",
    });
  });

  it("offers sign-in to signed-out visitors", () => {
    expect(inviteOutcomeAction(false)).toEqual({
      label: "Sign in",
      href: "/login",
    });
  });
});
