import { describe, expect, it } from "vitest";

import {
  challengeSlotDays,
  challengeSuggestedSlots,
  proposalSlotMessage,
  proposalSlotProblem,
} from "./challenge-slots";

// Sunday 8 November 2026, 1:00 PM in Bahrain.
const now = new Date("2026-11-08T10:00:00Z");
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

describe("proposalSlotProblem", () => {
  it("refuses a start under an hour ahead or more than 30 days out", () => {
    expect(
      proposalSlotProblem(new Date(now.getTime() + 30 * 60 * 1000), now),
    ).toBe("too_soon");
    expect(proposalSlotProblem(new Date(now.getTime() + HOUR), now)).toBeNull();
    expect(
      proposalSlotProblem(new Date(now.getTime() + 30 * DAY), now),
    ).toBeNull();
    expect(
      proposalSlotProblem(new Date(now.getTime() + 30 * DAY + 1), now),
    ).toBe("too_far");
    expect(proposalSlotMessage("too_soon", "en")).toBe(
      "Pick a time at least an hour ahead",
    );
    expect(proposalSlotMessage("too_far", "en")).toBe(
      "Pick a time within 30 days",
    );
  });
});

describe("challengeSuggestedSlots", () => {
  it("crosses the picked days with the picked timings over two weeks, plus exact slots", () => {
    const exact = new Date("2026-11-20T17:00:00Z");
    const slots = challengeSuggestedSlots(
      { days: ["fri"], timings: ["evening"], exactSlots: [exact] },
      now,
    );
    expect(slots.map((slot) => slot.toISOString())).toEqual([
      "2026-11-13T16:00:00.000Z",
      "2026-11-13T17:30:00.000Z",
      "2026-11-20T16:00:00.000Z",
      "2026-11-20T17:00:00.000Z",
      "2026-11-20T17:30:00.000Z",
    ]);
  });

  it("reads empty days and timings as any, and drops times too soon", () => {
    const slots = challengeSuggestedSlots(
      { days: [], timings: [], exactSlots: [] },
      now,
    );
    // Today's two morning starts are gone; 2 PM is exactly an hour ahead.
    expect(slots[0]?.toISOString()).toBe("2026-11-08T11:00:00.000Z");
    expect(slots).toHaveLength(14 * 6 - 2);
    expect(slots.every((slot) => proposalSlotProblem(slot, now) == null)).toBe(
      true,
    );
  });

  it("drops a past exact slot and does not repeat one that matches a suggestion", () => {
    const slots = challengeSuggestedSlots(
      {
        days: ["fri"],
        timings: ["evening"],
        exactSlots: [
          new Date("2026-11-01T16:00:00Z"),
          new Date("2026-11-13T16:00:00Z"),
        ],
      },
      now,
    );
    expect(slots.map((slot) => slot.toISOString())).toEqual([
      "2026-11-13T16:00:00.000Z",
      "2026-11-13T17:30:00.000Z",
      "2026-11-20T16:00:00.000Z",
      "2026-11-20T17:30:00.000Z",
    ]);
  });
});

describe("challengeSlotDays", () => {
  it("groups slots by product day with a time label each", () => {
    const days = challengeSlotDays(
      [
        new Date("2026-11-13T17:30:00Z"),
        new Date("2026-11-13T16:00:00Z"),
        new Date("2026-11-20T16:00:00Z"),
      ],
      "en",
    );
    expect(days.map((day) => day.key)).toEqual(["2026-11-13", "2026-11-20"]);
    expect(days[0]?.slots.map((slot) => slot.label)).toEqual([
      "7:00 PM",
      "8:30 PM",
    ]);
    expect(days[0]?.label).toContain("13");
  });
});
