import { describe, expect, it } from "vitest";

import {
  challengeBoardFilterGroups,
  challengeBoardQuery,
  challengeCardView,
  challengeGameView,
  challengeLevelWanted,
  challengeProposalView,
  challengeWhenLine,
  NO_CHALLENGE_BOARD_FILTERS,
  type ChallengeCardInput,
} from "./challenge-card";

const now = new Date("2026-11-08T10:00:00Z");

function card(overrides: Partial<ChallengeCardInput> = {}): ChallengeCardInput {
  return {
    id: "c1",
    sport: "football",
    sideSize: 6,
    levelMinTenths: 28,
    levelMaxTenths: 48,
    days: ["sat", "sun"],
    timings: ["evening"],
    exactSlots: [],
    venues: [{ name: "Matchday Pitches" }],
    note: null,
    proposalCount: 2,
    expiresAt: new Date("2026-11-13T10:00:00Z"),
    team: {
      displayName: "Gooz FC",
      rosterCount: 12,
      teamLevel: { level: "2.8" },
      members: Array.from({ length: 12 }, (_, index) => ({
        name: `Player ${index}`,
      })),
    },
    viewer: { ineligibleReason: null },
    ...overrides,
  };
}

describe("challengeCardView", () => {
  it("reads the football card lines", () => {
    const view = challengeCardView(card(), "en", now);
    expect(view.title).toBe("Gooz FC");
    expect(view.sportLine).toBe(
      "Football, 6-a-side, avg 2.8, 12 on the roster. Wants C to B-",
    );
    expect(view.whenLine).toBe("Weekends · Evenings");
    expect(view.venuesLine).toBe("Matchday Pitches");
    expect(view.proposalsLine).toBe("2 proposals, 5 days left");
    expect(view.tiles).toHaveLength(6);
    expect(view.opponentSeats).toBe(6);
    expect(view.greyed).toBe(false);
  });

  it("reads a padel card without a Team Level or Level wanted", () => {
    const view = challengeCardView(
      card({
        sport: "padel",
        sideSize: null,
        levelMinTenths: null,
        levelMaxTenths: null,
        days: [],
        timings: [],
        venues: [],
        proposalCount: 0,
        team: {
          displayName: "Seef Smashers",
          rosterCount: 2,
          teamLevel: null,
          members: [{ name: "Ali" }, { name: "Omar" }],
        },
      }),
      "en",
      now,
    );
    expect(view.sportLine).toBe("Padel. Open to any level");
    expect(view.whenLine).toBe("Any day · Any time");
    expect(view.venuesLine).toBe("Any venue");
    expect(view.proposalsLine).toBe("No proposals yet, 5 days left");
    expect(view.opponentSeats).toBe(2);
  });

  it("greys the card and says why, except on the viewer's own Challenge", () => {
    const short = challengeCardView(
      card({ viewer: { ineligibleReason: "roster_short" } }),
      "en",
      now,
    );
    expect(short.greyed).toBe(true);
    expect(short.greyedLine).toBe("Your Roster is short for 6-a-side");
    const own = challengeCardView(
      card({ viewer: { ineligibleReason: "own" } }),
      "en",
      now,
    );
    expect(own.greyed).toBe(false);
    expect(own.greyedLine).toBe("Your Team's challenge");
  });

  it("lists exact slots after the days and timings", () => {
    const view = challengeCardView(
      card({ exactSlots: [new Date("2026-11-13T16:00:00Z")] }),
      "en",
      now,
    );
    expect(view.slotsLine).toBe("Or Fri 13 Nov, 7:00 PM");
  });

  it("tells only the nudged Team that a Rematch was sent straight to it", () => {
    const nudged = challengeCardView(
      card({
        nudgedTeam: { displayName: "Arad Athletic" },
        viewerTeamIsNudged: true,
      }),
      "en",
      now,
    );
    expect(nudged.nudgeLine).toBe(
      "A rematch, sent straight to Arad Athletic. It's on the open board too.",
    );
    expect(nudged.accessibilityLabel).toContain(nudged.nudgeLine);
    expect(
      challengeCardView(
        card({
          nudgedTeam: { displayName: "Arad Athletic" },
          viewerTeamIsNudged: false,
        }),
        "en",
        now,
      ).nudgeLine,
    ).toBeNull();
    expect(challengeCardView(card(), "en", now).nudgeLine).toBeNull();
  });
});

describe("challengeLevelWanted and challengeWhenLine", () => {
  it("reads one-sided and single-band ranges", () => {
    expect(challengeLevelWanted(42, null, "en")).toBe("Wants B- and up");
    expect(challengeLevelWanted(null, 34, "en")).toBe("Wants C and under");
    expect(challengeLevelWanted(28, 34, "en")).toBe("Wants C");
  });

  it("names weekdays and picked days in week order", () => {
    expect(
      challengeWhenLine(["mon", "tue", "wed", "thu", "fri"], [], "en"),
    ).toBe("Weekdays · Any time");
    expect(
      challengeWhenLine(["sat", "tue"], ["evening", "morning"], "en"),
    ).toBe("Tue, Sat · Mornings, Evenings");
  });
});

describe("board filters", () => {
  it("asks for nothing without filters", () => {
    expect(challengeBoardQuery(NO_CHALLENGE_BOARD_FILTERS)).toEqual({});
  });

  it("turns a Level band into its tenths and passes the rest", () => {
    expect(
      challengeBoardQuery({
        sport: "padel",
        level: "C",
        area: "Lisbon",
        day: "fri",
      }),
    ).toEqual({
      sport: "padel",
      levelMinTenths: 28,
      levelMaxTenths: 34,
      area: "Lisbon",
      weekday: "fri",
    });
  });

  it("puts Any first in each group and marks the pick", () => {
    const groups = challengeBoardFilterGroups(
      { ...NO_CHALLENGE_BOARD_FILTERS, area: "Porto" },
      ["Lisbon", "Porto"],
      "en",
    );
    expect(groups.map((group) => group.label)).toEqual([
      "Sport",
      "Level",
      "Area",
      "Day",
    ]);
    const area = groups[2]!;
    expect(area.summary).toBe("Porto");
    expect(
      area.options.map((option) => [option.label, option.selected]),
    ).toEqual([
      ["Any", false],
      ["Lisbon", false],
      ["Porto", true],
    ]);
  });
});

describe("challengeProposalView", () => {
  const proposal = {
    startsAt: new Date("2026-11-13T16:00:00Z"),
    venue: { name: "Padel Central" },
    court: { name: "Court 2" },
    pricePerPlayerFils: 1500,
    expiresAt: new Date("2026-11-09T08:00:00Z"),
    sentAt: new Date("2026-11-07T08:00:00Z"),
    team: { displayName: "Riffa Rackets" },
  };

  it("reads the time, the venue and court, the price each and the hours left", () => {
    const view = challengeProposalView(proposal, now, "en");
    expect(view.title).toBe("Riffa Rackets");
    expect(view.whenLine).toContain("7:00 PM");
    expect(view.whereLine).toBe("Padel Central, Court 2");
    expect(view.priceLine).toBe("1.500 BD each");
    expect(view.expiresLine).toBe("Expires in 22h");
    expect(view.sentLine).toMatch(/^Sent /);
  });

  it("drops the court and the price when the Proposal has none", () => {
    const view = challengeProposalView(
      { ...proposal, court: null, pricePerPlayerFils: null },
      now,
      "en",
    );
    expect(view.whereLine).toBe("Padel Central");
    expect(view.priceLine).toBeNull();
    expect(
      challengeProposalView({ ...proposal, pricePerPlayerFils: 0 }, now, "en")
        .priceLine,
    ).toBe("Free");
  });
});

describe("challengeGameView", () => {
  const base = {
    startsAt: new Date("2026-11-13T17:00:00Z"),
    cancelled: false,
    venue: { name: "Pitch Park" },
    court: { name: "Pitch 2" },
    proposedBy: { name: "Rafi" },
    confirmedBy: { name: "Ali" },
  };

  it("reads a football Game's pitch, cost, deciders and both squads", () => {
    const view = challengeGameView(
      {
        ...base,
        sport: "football",
        pricePerPlayerFils: 1500,
        sides: [
          {
            displayName: "Hidd United",
            sideSize: 6,
            namedCount: 6,
            squadState: "named",
          },
          {
            displayName: "Arad Athletic",
            sideSize: 6,
            namedCount: 0,
            squadState: "empty",
          },
        ],
      },
      "en",
    );
    expect(view).toMatchObject({
      placeLabel: "Pitch",
      placeLine: "Pitch Park, Pitch 2",
      bookLine: "Book it yourselves",
      decidedLine: "Proposed by Rafi, confirmed by Ali",
      cancelledLine: null,
    });
    expect(view.costLine).toMatch(/each, pay at the venue$/);
    expect(view.squads).toEqual([
      {
        title: "Hidd United",
        counter: "6 of 9 named, 6 + 3 reserves",
      },
      {
        title: "Arad Athletic",
        counter: "Nobody named yet, 0 of 9",
      },
    ]);
  });

  it("splits a padel Game four ways without a price and shows no squads", () => {
    const view = challengeGameView(
      {
        ...base,
        sport: "padel",
        court: null,
        cancelled: true,
        pricePerPlayerFils: null,
        sides: [],
      },
      "en",
    );
    expect(view).toMatchObject({
      placeLabel: "Court",
      placeLine: "Pitch Park",
      costLine: "Split four ways, pay at the venue",
      squads: [],
      cancelledLine: "The game was cancelled",
    });
  });
});
