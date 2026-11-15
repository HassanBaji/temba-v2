import { bahrainDate, bahrainDayFromToday } from "./bahrain-date.test-support";
import { isolate } from "@repo/i18n/bidi";
import { describe, expect, it } from "vitest";

import { formatAbsoluteDay, formatGameTimeWindow } from "./format-game-start";
import {
  gameInviteOpenGraphMetadata,
  genericTembaOpenGraph,
  occupiedFriendlyPositions,
} from "./game-invite-open-graph";

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
    const today = bahrainDayFromToday(0, 19);
    const end = bahrainDayFromToday(0, 20);
    const metadata = gameInviteOpenGraphMetadata({
      venueName: "Padel Club",
      windowStart: today,
      windowEnd: end,
      format: "friendly_game",
      registrationMode: "individual",
      occupiedCount: 2,
      locale: "en",
    });
    expect(metadata.title).toBe("Padel Club");
    expect(metadata.description).toBe(
      `${formatAbsoluteDay(today, "en")}, ${formatGameTimeWindow(today, end, today, "en")}, 2/4 sitting`,
    );
    expect(metadata.description).not.toMatch(/Tonight|Tomorrow/);
    expect(metadata.description).not.toMatch(/Ada|Lin|Sam/);
    expect(metadata.description).not.toContain("Team");
  });

  it("appends the Game Level range when set and never a User Level", () => {
    const today = bahrainDayFromToday(0, 19);
    const end = bahrainDayFromToday(0, 20);
    const metadata = gameInviteOpenGraphMetadata({
      venueName: "Padel Club",
      windowStart: today,
      windowEnd: end,
      format: "friendly_game",
      registrationMode: "individual",
      occupiedCount: 2,
      levelMinTenths: 30,
      levelMaxTenths: 45,
      locale: "en",
    });
    expect(metadata.description).toContain("Level C/B");
    expect(metadata.description).toContain("2/4 sitting");
    expect(metadata.description).not.toMatch(/5\.2|Your Level/);
  });

  it("reads a football Game's range in OVR, never a band", () => {
    const metadata = gameInviteOpenGraphMetadata({
      venueName: "Pitch Club",
      windowStart: null,
      windowEnd: null,
      format: "friendly_game",
      registrationMode: "individual",
      occupiedCount: 0,
      levelMinTenths: 30,
      levelMaxTenths: 45,
      sport: "football",
      locale: "en",
    });
    expect(metadata.description).toBe("Pitch Club, OVR 65 to 78");
  });

  it("titles a Group Game with the Group name and leads the description with the Venue", () => {
    const start = bahrainDate(2026, 8, 15, 19, 0, 0);
    const end = bahrainDate(2026, 8, 15, 20, 0, 0);
    const metadata = gameInviteOpenGraphMetadata({
      venueName: "Padel Club",
      groupName: "Friday Night",
      windowStart: start,
      windowEnd: end,
      format: "friendly_game",
      registrationMode: "individual",
      occupiedCount: 3,
      levelMinTenths: 30,
      levelMaxTenths: 45,
      locale: "en",
    });
    expect(metadata.title).toBe("Friday Night");
    expect(metadata.description).toBe(
      `Padel Club · ${formatAbsoluteDay(start, "en")}, ${formatGameTimeWindow(start, end, start, "en")}, 3/4 sitting, Level C/B-`,
    );
  });

  it("keeps the Venue title when the Group has no name", () => {
    const start = bahrainDate(2026, 8, 15, 19, 0, 0);
    const metadata = gameInviteOpenGraphMetadata({
      venueName: "Padel Club",
      groupName: "  ",
      windowStart: start,
      windowEnd: null,
      format: "americano",
      registrationMode: "individual",
      occupiedCount: 0,
      locale: "en",
    });
    expect(metadata.title).toBe("Padel Club");
    expect(metadata.description).not.toContain("·");
  });

  it("omits occupancy for other Game formats", () => {
    const start = bahrainDate(2026, 8, 15, 19, 0, 0);
    const end = bahrainDate(2026, 8, 15, 20, 0, 0);
    const metadata = gameInviteOpenGraphMetadata({
      venueName: "Padel Club",
      windowStart: start,
      windowEnd: end,
      format: "americano",
      registrationMode: "individual",
      occupiedCount: 2,
      locale: "en",
    });
    expect(metadata.title).toBe("Padel Club");
    expect(metadata.description).toBe(
      `${formatAbsoluteDay(start, "en")}, ${formatGameTimeWindow(start, end, start, "en")}`,
    );
    expect(metadata.description).not.toContain("sitting");
  });

  it("keeps generic Temba metadata for dead Invite cards", () => {
    expect(genericTembaOpenGraph("en").title).toBe(
      "Temba - the future of competitive sports",
    );
    expect(genericTembaOpenGraph("en").description).toBe(
      "Temba - the future of competitive sport",
    );
    expect(genericTembaOpenGraph("en").title).not.toContain("Padel");
    expect(genericTembaOpenGraph("en").description).not.toContain("sitting");
  });
});

describe("Arabic metadata", () => {
  it("describes the Game in Arabic", () => {
    const start = bahrainDate(2026, 8, 15, 19, 0, 0);
    const end = bahrainDate(2026, 8, 15, 20, 0, 0);
    const metadata = gameInviteOpenGraphMetadata({
      venueName: "Padel Club",
      windowStart: start,
      windowEnd: end,
      format: "friendly_game",
      registrationMode: "individual",
      occupiedCount: 2,
      levelMinTenths: 30,
      levelMaxTenths: 45,
      locale: "ar",
    });
    expect(metadata.description).toBe(
      `${formatAbsoluteDay(start, "ar")}، ${formatGameTimeWindow(start, end, start, "ar")}، 2/4 جالسون، المستوى ${isolate("C/B-")}`,
    );
    expect(genericTembaOpenGraph("ar").title).toContain("Temba");
  });
});
