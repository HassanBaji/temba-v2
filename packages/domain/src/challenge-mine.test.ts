import { describe, expect, it } from "vitest";

import {
  challengeMineExpiresLine,
  challengeMineGameView,
  challengeMineOutcome,
  challengeMinePostedView,
  challengeMineScoreLine,
  challengeMineSections,
  challengeMineWaitingView,
} from "./challenge-mine";

const now = new Date("2026-11-08T10:00:00Z");
const HOUR = 60 * 60 * 1000;

describe("challengeMineSections", () => {
  it("keeps waiting on you first, then posted, pending, and accepted with played under it, with one focus", () => {
    const sections = challengeMineSections(
      [
        { kind: "played", key: "p1" },
        { kind: "waiting", key: "w1" },
        { kind: "waiting", key: "w2" },
        { kind: "accepted", key: "a1" },
        { kind: "pending", key: "s1" },
        { kind: "posted", key: "c1" },
      ] as const,
      "en",
    );
    expect(sections.map((section) => [section.title, section.hint])).toEqual([
      ["Waiting on you", null],
      ["Posted", "waiting for a team"],
      ["Proposed", "waiting on them"],
      ["Accepted", "now games"],
    ]);
    expect(
      sections.flatMap((section) =>
        section.items.map((entry) => [entry.item.key, entry.focus]),
      ),
    ).toEqual([
      ["w1", true],
      ["w2", false],
      ["c1", false],
      ["s1", false],
      ["a1", false],
      ["p1", false],
    ]);
  });

  it("drops empty sections", () => {
    expect(
      challengeMineSections([{ kind: "played" as const }], "ar").map(
        (section) => section.kind,
      ),
    ).toEqual(["accepted"]);
  });
});

describe("challengeMineScoreLine and challengeMineOutcome", () => {
  it("joins the scored Sets from the viewer's Team and skips empty shells", () => {
    expect(
      challengeMineScoreLine(
        [
          { us: 6, them: 4 },
          { us: 3, them: 6 },
          { us: null, them: null },
        ],
        "en",
      ),
    ).toBe("6–4, 3–6");
    expect(challengeMineScoreLine([{ us: 2, them: 2 }], "ar")).toBe("2–2");
    expect(challengeMineScoreLine([{ us: null, them: null }], "en")).toBe(null);
  });

  it("reads won, lost, drawn or not played from the viewer's side", () => {
    expect(
      challengeMineOutcome([
        { us: 6, them: 3 },
        { us: 6, them: 4 },
      ]),
    ).toBe("won");
    expect(challengeMineOutcome([{ us: 1, them: 3 }])).toBe("lost");
    expect(challengeMineOutcome([{ us: 2, them: 2 }])).toBe("draw");
    expect(challengeMineOutcome([])).toBe("not-played");
  });
});

describe("challengeMineExpiresLine", () => {
  it("counts the hours left, then within the hour", () => {
    expect(
      challengeMineExpiresLine(new Date(now.getTime() + 22 * HOUR), now, "en"),
    ).toBe("proposal expires in 22h");
    expect(
      challengeMineExpiresLine(new Date(now.getTime() + HOUR / 2), now, "en"),
    ).toBe("proposal expires within the hour");
  });
});

describe("challengeMineWaitingView", () => {
  it("reads who accepted, the poster and sport, the time and the venue", () => {
    const view = challengeMineWaitingView(
      {
        sport: "padel",
        posterTeam: { displayName: "Seef Smashers" },
        proposal: {
          startsAt: new Date("2026-11-12T17:00:00Z"),
          venue: { name: "Padel Point Riffa" },
          court: null,
          pricePerPlayerFils: null,
          expiresAt: new Date(now.getTime() + 22 * HOUR),
          sentAt: now,
          team: { displayName: "Riffa Rackets" },
        },
      },
      now,
      "en",
    );
    expect(view.title).toBe("Riffa Rackets accepted your challenge");
    expect(view.subtitle).toBe("Seef Smashers, padel");
    expect(view.expiresLine).toBe("proposal expires in 22h");
    expect(view.proposedLine).toBe("Thu 12 Nov, 8:00 PM");
    expect(view.venueLine).toBe("Padel Point Riffa");
  });
});

describe("challengeMinePostedView", () => {
  it("reads the Team and sport, when and where, the level, the proposals and days left", () => {
    const view = challengeMinePostedView(
      {
        id: "c1",
        sport: "football",
        sideSize: 6,
        levelMinTenths: 28,
        levelMaxTenths: 48,
        days: ["fri", "sat"],
        timings: ["evening"],
        exactSlots: [],
        venues: [{ name: "Fantasy FC" }],
        note: null,
        proposalCount: 0,
        expiresAt: new Date(now.getTime() + 6 * 24 * HOUR),
        team: {
          displayName: "Gooz FC",
          rosterCount: 6,
          teamLevel: null,
          members: [],
        },
        viewer: { ineligibleReason: "own" },
      },
      now,
      "en",
    );
    expect(view.title).toBe("Gooz FC, football");
    expect(view.line).toBe("Fri, Sat evenings, Fantasy FC. Wants OVR 64 to 80");
    expect(view.proposalsLine).toBe("0 proposals");
    expect(view.daysLeftLine).toBe("6 days left");
  });
});

describe("challengeMineGameView", () => {
  const game = {
    startsAt: new Date("2026-11-14T16:00:00Z"),
    team: { displayName: "Gooz FC" },
    opponent: { displayName: "Hidd United" },
    venue: { name: "Fantasy FC" },
    cancelled: false,
    nameYourSquad: false,
    sets: [],
  };

  it("reads a Game still to play with its venue", () => {
    const view = challengeMineGameView({ ...game, kind: "accepted" }, "en");
    expect(view.title).toBe("Gooz FC vs Hidd United");
    expect(view.line).toBe("Sat 14 Nov, 7:00 PM, Fantasy FC");
    expect(view.mark).toBeNull();
  });

  it("reads a played Game with its result and score", () => {
    const view = challengeMineGameView(
      {
        ...game,
        kind: "played",
        startsAt: new Date("2026-11-02T16:00:00Z"),
        sets: [
          { us: 6, them: 3 },
          { us: 6, them: 4 },
        ],
      },
      "en",
    );
    expect(view.line).toBe("Played Mon 2 Nov, won 6–3, 6–4");
    expect(view.mark).toBe("won");
    expect(challengeMineGameView({ ...game, kind: "played" }, "en").line).toBe(
      "Played Sat 14 Nov",
    );
  });

  it("says when the Game was cancelled or a squad needs naming", () => {
    expect(
      challengeMineGameView(
        { ...game, kind: "accepted", cancelled: true },
        "en",
      ).statusLine,
    ).toBe("Game cancelled");
    expect(
      challengeMineGameView(
        { ...game, kind: "accepted", nameYourSquad: true },
        "en",
      ).statusLine,
    ).toBe("Name your squad");
  });
});
