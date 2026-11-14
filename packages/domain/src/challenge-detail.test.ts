import { describe, expect, it } from "vitest";

import {
  challengeAgoLine,
  challengeConfirmedView,
  challengeConfirmSheetDescription,
  challengeDetailFooter,
  challengeDetailRows,
  challengeDetailStatusLine,
  challengeLevelValue,
  challengeProposalCard,
  challengeTeamFaceLine,
  challengeTeamFaceView,
  challengeTimingsValue,
  type ChallengeTeamFace,
} from "./challenge-detail";

const now = new Date("2026-11-09T10:00:00Z");
const HOUR = 60 * 60 * 1000;

const riffa: ChallengeTeamFace = {
  id: "riffa",
  displayName: "Riffa Rackets",
  sport: "padel",
  rosterCount: 2,
  teamLevel: { band: "C+" },
  members: [
    { name: "Khalid Ahmed", isViewer: false },
    { name: "Mahmood Saleh", isViewer: false },
  ],
};

describe("the team-vs-team box", () => {
  it("reads padel as the Team Level and both players", () => {
    expect(challengeTeamFaceLine(riffa, "en")).toBe(
      "C+, Khalid A and Mahmood S",
    );
    expect(challengeTeamFaceView(riffa, "en")).toMatchObject({
      name: "Riffa Rackets",
      initials: "RR",
    });
  });

  it("puts the viewer first as you, and the sport when asked", () => {
    const seef: ChallengeTeamFace = {
      ...riffa,
      displayName: "Seef Smashers",
      members: [
        { name: "Ali Mansoor", isViewer: false },
        { name: "Sara Khalifa", isViewer: true },
      ],
    };
    expect(challengeTeamFaceLine(seef, "en", { withSport: true })).toBe(
      "Padel, C+, you and Ali M",
    );
  });

  it("reads football as the Team Level and the Roster size", () => {
    const gooz: ChallengeTeamFace = {
      id: "gooz",
      displayName: "Gooz FC",
      sport: "football",
      rosterCount: 12,
      teamLevel: { band: "C", ovr: 66 },
      members: [],
    };
    expect(challengeTeamFaceLine(gooz, "en", { withSport: true })).toBe(
      "Football, OVR 66. 12 on the roster",
    );
    expect(challengeTeamFaceLine({ ...gooz, teamLevel: null }, "en")).toBe(
      "12 on the roster",
    );
  });
});

describe("the status line", () => {
  const base = {
    state: "open" as const,
    expiresAt: new Date(now.getTime() + 4.5 * 24 * HOUR),
    posterName: "Riffa Rackets",
    hasViewerProposal: false,
    gameCancelled: false,
  };

  it("counts the days left on an open Challenge", () => {
    expect(challengeDetailStatusLine(base, now, "en")).toBe(
      "Open challenge, 5 days left",
    );
  });

  it("waits on the poster once the viewer proposed", () => {
    expect(
      challengeDetailStatusLine(
        { ...base, hasViewerProposal: true },
        now,
        "en",
      ),
    ).toBe("Proposal sent, waiting for Riffa Rackets");
  });

  it("says confirmed, or that the Game was cancelled", () => {
    expect(
      challengeDetailStatusLine({ ...base, state: "confirmed" }, now, "en"),
    ).toBe("Confirmed, now a game");
    expect(
      challengeDetailStatusLine(
        { ...base, state: "confirmed", gameCancelled: true },
        now,
        "en",
      ),
    ).toBe("The game was cancelled");
  });
});

describe("the details list", () => {
  it("lists Level wanted, venues, days, timings, record and who posted", () => {
    const rows = challengeDetailRows(
      {
        sport: "padel",
        levelMinTenths: 30,
        levelMaxTenths: 39,
        venues: [{ name: "Padel Point Riffa" }, { name: "Ace Padel" }],
        days: ["thu", "tue"],
        timings: ["evening"],
        exactSlots: [],
        team: {
          displayName: "Riffa Rackets",
          record: { wins: 5, draws: 0, losses: 4 },
        },
        postedBy: { name: "Khalid Ahmed" },
        createdAt: new Date("2026-11-04T09:00:00Z"),
      },
      "en",
    );
    expect(rows.map((row) => [row.label, row.value])).toEqual([
      ["Level wanted", "3.0 to 3.9"],
      ["Preferred venues", "Padel Point Riffa, Ace Padel"],
      ["Days", "Tue, Thu"],
      ["Timings", "Evenings, after 6 PM"],
      ["Record", "Riffa Rackets 5–4"],
      ["Posted", "Wed 4 Nov, by Khalid A"],
    ]);
    expect(challengeLevelValue(30, 39, "en", "football")).toBe("OVR 65 to 73");
  });

  it("reads open bounds and no bounds", () => {
    expect(challengeLevelValue(null, null, "en", "padel")).toBe("Any level");
    expect(challengeLevelValue(42, null, "en", "padel")).toBe("4.2 and up");
    expect(challengeTimingsValue([], "en")).toBe("Any time");
    expect(challengeTimingsValue(["morning", "evening"], "en")).toBe(
      "Mornings, Evenings",
    );
  });
});

describe("the footer and clocks", () => {
  it("counts proposals so far", () => {
    expect(challengeDetailFooter(2, "en")).toEqual({
      title: "2 proposals so far",
      hint: "They pick one and confirm",
    });
    expect(challengeDetailFooter(0, "en").title).toBe("No proposals yet");
  });

  it("says how long ago", () => {
    expect(challengeAgoLine(now, now, "en")).toBe("just now");
    expect(
      challengeAgoLine(new Date(now.getTime() - 2 * HOUR), now, "en"),
    ).toBe("2h ago");
    expect(
      challengeAgoLine(new Date(now.getTime() - 50 * HOUR), now, "en"),
    ).toBe("2 days ago");
  });
});

describe("a Proposal card", () => {
  const proposal = {
    startsAt: new Date("2026-11-12T17:00:00Z"),
    venue: { name: "Padel Point Riffa" },
    court: null,
    pricePerPlayerFils: null,
    sentAt: new Date(now.getTime() - 2 * HOUR),
    expiresAt: new Date(now.getTime() + 46 * HOUR),
    team: { displayName: "Seef Smashers" },
  };

  it("waits on the poster from the proposing side", () => {
    expect(
      challengeProposalCard(
        proposal,
        { side: "proposer", posterName: "Riffa Rackets" },
        now,
        "en",
      ),
    ).toMatchObject({
      title: "Your proposal, waiting for Riffa Rackets",
      subline: "Sent 2h ago. They have 46 hours to confirm.",
      timeValue: "Thu 12 Nov, 8:00 PM",
      venueValue: "Padel Point Riffa",
      priceValue: null,
    });
  });

  it("names the proposing Team to the poster", () => {
    expect(
      challengeProposalCard(
        proposal,
        { side: "poster", posterName: "Riffa Rackets" },
        now,
        "en",
      ),
    ).toMatchObject({
      title: "Seef Smashers",
      subline: "Sent 2h ago. You have 46 hours to confirm.",
    });
  });
});

describe("the confirmed state", () => {
  it("splits the clock and lists who proposed, who confirmed, the court and the cost", () => {
    const view = challengeConfirmedView(
      {
        sport: "padel",
        startsAt: new Date("2026-11-12T17:00:00Z"),
        endsAt: new Date("2026-11-12T18:30:00Z"),
        cancelled: false,
        venue: { name: "Padel Point Riffa" },
        court: { name: "Court 2" },
        pricePerPlayerFils: null,
        proposedBy: { name: "Sara Khalifa", isViewer: true },
        confirmedBy: { name: "Khalid Ahmed" },
        confirmedAt: new Date(now.getTime() - HOUR),
      },
      { proposer: "Seef Smashers", poster: "Riffa Rackets" },
      now,
      "en",
    );
    expect(view).toMatchObject({
      statusLine: "Confirmed, now a game",
      time: "8:00",
      meridiem: "PM",
      dayLine: "Thu 12 Nov, Padel Point Riffa",
      placeLine: "Court 2, 90 min",
    });
    expect(view.rows.map((row) => [row.label, row.value])).toEqual([
      ["Proposed by", "You, Seef Smashers"],
      ["Confirmed by", "Khalid A, Riffa Rackets, 1h ago"],
      ["Court", "Book it: Padel Point Riffa, Court 2"],
      ["Cost", "Split four ways, pay at the venue"],
    ]);
  });
});

describe("challengeConfirmSheetDescription", () => {
  it("says a football Game counts for Temba Level once each Team confirms", () => {
    expect(challengeConfirmSheetDescription("football", "en")).toBe(
      "The Game is created with both Teams on it and counts for Temba Level once someone from each Team confirms the score. The other proposals are passed over and told.",
    );
    expect(challengeConfirmSheetDescription("padel", "en")).toBe(
      "The Game is created with both Teams on it. The other proposals are passed over and told.",
    );
  });
});
