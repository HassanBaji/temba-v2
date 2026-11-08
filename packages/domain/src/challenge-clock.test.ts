import { describe, expect, it } from "vitest";

import {
  challengeDaysLeft,
  challengeExpiresAt,
  isChallengeOpen,
  isProposalPending,
  proposalExpiresAt,
} from "./challenge-clock";

const posted = new Date("2026-11-08T10:00:00Z");
const day = 24 * 60 * 60 * 1000;

describe("challenge clock", () => {
  it("opens a Challenge for seven days and a Proposal for 48 hours", () => {
    expect(challengeExpiresAt(posted)).toEqual(
      new Date("2026-11-15T10:00:00Z"),
    );
    expect(proposalExpiresAt(posted)).toEqual(new Date("2026-11-10T10:00:00Z"));
  });

  it("keeps a Challenge open until expiry, and after it only while a Proposal is pending", () => {
    const row = { status: "open", expiresAt: challengeExpiresAt(posted) };
    expect(isChallengeOpen(row, new Date(posted.getTime() + 6 * day))).toBe(
      true,
    );
    const dayEight = new Date(posted.getTime() + 8 * day);
    expect(isChallengeOpen(row, dayEight)).toBe(false);
    expect(isChallengeOpen(row, dayEight, true)).toBe(true);
    expect(isChallengeOpen({ ...row, status: "withdrawn" }, posted)).toBe(
      false,
    );
  });

  it("reads a Proposal past its 48 hours as no longer pending", () => {
    const row = { status: "pending", expiresAt: proposalExpiresAt(posted) };
    expect(isProposalPending(row, posted)).toBe(true);
    expect(isProposalPending(row, new Date(posted.getTime() + 2 * day))).toBe(
      false,
    );
    expect(isProposalPending({ ...row, status: "declined" }, posted)).toBe(
      false,
    );
  });

  it("counts days left rounded up, never below zero", () => {
    const expiresAt = challengeExpiresAt(posted);
    expect(challengeDaysLeft(expiresAt, posted)).toBe(7);
    expect(challengeDaysLeft(expiresAt, new Date(posted.getTime() + 1))).toBe(
      7,
    );
    expect(
      challengeDaysLeft(expiresAt, new Date(posted.getTime() + 6.5 * day)),
    ).toBe(1);
    expect(
      challengeDaysLeft(expiresAt, new Date(posted.getTime() + 9 * day)),
    ).toBe(0);
  });
});
