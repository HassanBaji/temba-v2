import { describe, expect, it } from "vitest";

import {
  formatAbsoluteDay,
  formatGameTimeWindow,
} from "~/lib/format-game-start";
import {
  gameInviteOpenGraphMetadata,
  GENERIC_TEMBA_OPEN_GRAPH,
  occupiedFriendlyPositions,
} from "~/lib/game-invite-open-graph";

describe("occupiedFriendlyPositions", () => {
  it("counts filled Positions on the two sides and ignores Waitlist-only extras", () => {
    expect(
      occupiedFriendlyPositions([
        { sideIndex: 1, left: { name: "Ada" }, right: null },
        { sideIndex: 2, left: { name: "Lin" }, right: { name: "Sam" } },
        { sideIndex: 3, left: { name: "Waitlisted" }, right: { name: "Nope" } },
      ]),
    ).toBe(3);
  });
});

describe("gameInviteOpenGraphMetadata", () => {
  it("uses Venue title and occupancy without User names for an individual Friendly game", () => {
    const today = new Date();
    today.setHours(19, 0, 0, 0);
    const end = new Date(today);
    end.setHours(20, 0, 0, 0);
    const metadata = gameInviteOpenGraphMetadata({
      venueName: "Padel Club",
      windowStart: today,
      windowEnd: end,
      format: "friendly_game",
      registrationMode: "individual",
      occupiedCount: 2,
    });
    expect(metadata.title).toBe("Padel Club");
    expect(metadata.description).toBe(
      `${formatAbsoluteDay(today)}, ${formatGameTimeWindow(today, end, today)}, 2/4 sitting`,
    );
    expect(metadata.description).not.toMatch(/Tonight|Tomorrow/);
    expect(metadata.description).not.toMatch(/Ada|Lin|Sam/);
    expect(metadata.description).not.toContain("Team");
  });

  it("omits occupancy for other Game formats", () => {
    const start = new Date(2026, 8, 15, 19, 0, 0);
    const end = new Date(2026, 8, 15, 20, 0, 0);
    const metadata = gameInviteOpenGraphMetadata({
      venueName: "Padel Club",
      windowStart: start,
      windowEnd: end,
      format: "americano",
      registrationMode: "individual",
      occupiedCount: 2,
    });
    expect(metadata.title).toBe("Padel Club");
    expect(metadata.description).toBe(
      `${formatAbsoluteDay(start)}, ${formatGameTimeWindow(start, end, start)}`,
    );
    expect(metadata.description).not.toContain("sitting");
  });

  it("keeps generic Temba metadata for dead Invite cards", () => {
    expect(GENERIC_TEMBA_OPEN_GRAPH.title).toBe(
      "Temba - the future of competitive sports",
    );
    expect(GENERIC_TEMBA_OPEN_GRAPH.description).toBe(
      "Temba - the future of competitive sport",
    );
    expect(GENERIC_TEMBA_OPEN_GRAPH.title).not.toContain("Padel");
    expect(GENERIC_TEMBA_OPEN_GRAPH.description).not.toContain("sitting");
  });
});
