import { describe, expect, it } from "vitest";

import {
  challengeBoardFilterGroups,
  challengeBoardQuery,
  challengeCardView,
  challengeDaysLine,
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
      teamLevel: { level: "2.8", band: "C" },
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
      "Football, 6-a-side, avg 2.8. Wants OVR 64 to 80",
    );
    expect(view.whenLine).toBe("Weekends · Evenings");
    expect(view.daysLine).toBe("Weekend evenings");
    expect(view.venuesLine).toBe("Matchday Pitches");
    expect(view.proposalsLine).toBe("2 proposals, 5 days left");
    expect(view.footerLine).toBe("2 proposals, 5 days left");
    expect(view.tiles).toHaveLength(6);
    expect(view.opponentSeats).toBe(6);
    expect(view.greyed).toBe(false);
    expect(view.canAccept).toBe(true);
  });

  it("previews the poster's own card: the Roster count, the days it stays open, Accept inert", () => {
    const view = challengeCardView(
      card({ expiresAt: new Date("2026-11-15T10:00:00Z") }),
      "en",
      now,
      { preview: true },
    );
    expect(view.sportLine).toBe(
      "Football, 6-a-side, avg 2.8, 12 on the roster. Wants OVR 64 to 80",
    );
    expect(view.footerLine).toBe("Open for 7 days");
    expect(view.preview).toBe(true);
    expect(view.canAccept).toBe(false);
  });

  it("reads a football Team Level as the mean OVR", () => {
    const view = challengeCardView(
      card({
        team: {
          ...card().team,
          teamLevel: { level: "3.9", band: "C+", ovr: 72 },
        },
      }),
      "en",
      now,
    );
    expect(view.sportLine).toBe(
      "Football, 6-a-side, avg OVR 72. Wants OVR 64 to 80",
    );
    expect(view.levelBadge).toBe("72");
  });

  it("puts the Team's band beside a padel card, never on football", () => {
    expect(
      challengeCardView(card({ sport: "padel", sideSize: null }), "en", now)
        .levelBadge,
    ).toBe("C");
    expect(challengeCardView(card(), "en", now).levelBadge).toBeNull();
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
    expect(view.levelBadge).toBeNull();
    expect(view.sportLine).toBe("Padel. Open to any level");
    expect(view.whenLine).toBe("Any day · Any time");
    expect(view.daysLine).toBe("Any day · Any time");
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
    expect(short.canAccept).toBe(false);
    expect(short.greyedLine).toBe("Your Roster is short for 6-a-side");
    expect(
      challengeCardView(
        card({ viewer: { ineligibleReason: "no_team" } }),
        "en",
        now,
      ).canAccept,
    ).toBe(true);
    const own = challengeCardView(
      card({ viewer: { ineligibleReason: "own" } }),
      "en",
      now,
    );
    expect(own.greyed).toBe(false);
    expect(own.canAccept).toBe(false);
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
  it("reads one-sided and single-band ranges in the sport's face", () => {
    expect(challengeLevelWanted(42, null, "en", "padel")).toBe(
      "Wants 4.2 and up",
    );
    expect(challengeLevelWanted(null, 34, "en", "padel")).toBe(
      "Wants 3.4 and under",
    );
    expect(challengeLevelWanted(28, 34, "en", "padel")).toBe(
      "Wants 2.8 to 3.4",
    );
    expect(challengeLevelWanted(42, null, "en", "football")).toBe(
      "Wants OVR 75 and up",
    );
    expect(challengeLevelWanted(null, null, "en", "football")).toBe(
      "Open to any level",
    );
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

describe("challengeDaysLine", () => {
  it("joins picked days with the timings, or reads one side alone", () => {
    expect(challengeDaysLine(["thu", "tue"], ["evening"], "en")).toBe(
      "Tue, Thu evenings",
    );
    expect(
      challengeDaysLine(["mon", "tue", "wed", "thu", "fri"], ["morning"], "en"),
    ).toBe("Weekday mornings");
    expect(challengeDaysLine(["fri", "sat"], [], "en")).toBe("Fri, Sat");
    expect(challengeDaysLine([], ["morning", "evening"], "en")).toBe(
      "Mornings, Evenings",
    );
    expect(challengeDaysLine([], [], "ar")).toBe(
      challengeWhenLine([], [], "ar"),
    );
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
    expect(groups.map((group) => group.summary)).toEqual([
      "All",
      "Any",
      "Porto",
      "Any",
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

describe("challengeBoardFilterGroups Level", () => {
  const levelLabels = (sport: "padel" | "football" | null) =>
    challengeBoardFilterGroups(
      { ...NO_CHALLENGE_BOARD_FILTERS, sport, level: "C+" },
      [],
      "en",
    )[1]!;

  it("lists bands for padel or any sport, and OVR spans for football", () => {
    expect(levelLabels(null).summary).toBe("C+");
    expect(levelLabels("padel").options.map((option) => option.label)).toEqual([
      "Any",
      "D",
      "D+",
      "C-",
      "C",
      "C+",
      "B-",
      "B",
      "B+",
      "A",
    ]);
    const football = levelLabels("football");
    expect(football.summary).toBe("70–75");
    expect(football.options.map((option) => option.label)).toEqual([
      "Any",
      "40–51",
      "52–57",
      "58–63",
      "64–69",
      "70–75",
      "75–80",
      "81–86",
      "87–92",
      "93–99",
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
