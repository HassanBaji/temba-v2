import { describe, expect, it } from "vitest";

import {
  gameOrganizerRequests,
  gameRequestsVisible,
  requestsQueueCounts,
} from "./game-requests";

const NOW = new Date("2026-11-09T10:00:00Z");

const hold = {
  id: "hold-1",
  createdAt: NOW,
  seatHeldUntil: new Date("2026-11-10T07:00:00Z"),
  user: { id: "u1", name: "Hassan Haji", image: null },
  invitedBy: { id: "u2", name: "Yousif Kadhem" },
  groupName: "Gooz of Arad",
  levelTenths: 24,
  provisional: false,
};

describe("gameOrganizerRequests", () => {
  it("lists link requests first, held or not, then Level range requests", () => {
    const requests = gameOrganizerRequests(
      {
        pendingSeatHolds: [
          hold,
          { ...hold, id: "group-only", seatHeldUntil: null },
        ],
        pendingLevelRangeRequests: [
          {
            id: "level-1",
            levelTenths: 24,
            provisional: false,
            createdAt: NOW,
            user: { id: "u3", name: "Omar T", image: null },
          },
        ],
      },
      "en",
      NOW,
    );
    expect(requests.map((request) => [request.kind, request.held])).toEqual([
      ["seat_hold", "held 21h"],
      ["seat_hold", null],
      ["level_range", null],
    ]);
    expect(requests[0]?.detail).toBe(
      "Wants the seat and to join Gooz of Arad. Came through Yousif Kadhem's link.",
    );
    expect(requests[1]?.detail).toBe(
      "Wants to join Gooz of Arad, no seat. Came through Yousif Kadhem's link.",
    );
    expect(requests[2]?.detail).toBe("Outside the Level range, asked anyway.");
    expect(requestsQueueCounts(requests)).toEqual({
      levelRange: 2,
      seatHolds: 1,
    });
  });

  it("shows the queue for a Level range or a waiting link request", () => {
    const base = {
      isOrganizer: true,
      levelMinTenths: null,
      levelMaxTenths: null,
    };
    expect(gameRequestsVisible(base)).toBe(false);
    expect(gameRequestsVisible({ ...base, levelMinTenths: 40 })).toBe(true);
    expect(gameRequestsVisible({ ...base, pendingSeatHolds: [hold] })).toBe(
      true,
    );
    expect(
      gameRequestsVisible({ ...base, isOrganizer: false, levelMinTenths: 40 }),
    ).toBe(false);
  });
});
