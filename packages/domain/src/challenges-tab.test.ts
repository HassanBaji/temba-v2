import { describe, expect, it } from "vitest";

import {
  challengesSegments,
  challengesTabFromQuery,
  challengesTabQuery,
  challengeTeamInviteView,
  challengeTeamRowView,
} from "./challenges-tab";

describe("challengesTabFromQuery", () => {
  it("reads Mine and Teams and falls back to Open", () => {
    expect(challengesTabFromQuery("mine")).toBe("mine");
    expect(challengesTabFromQuery("teams")).toBe("teams");
    expect(challengesTabFromQuery("open")).toBe("open");
    expect(challengesTabFromQuery("board")).toBe("open");
    expect(challengesTabFromQuery(undefined)).toBe("open");
  });
});

describe("challengesTabQuery", () => {
  it("leaves Open off the query", () => {
    expect(challengesTabQuery("open")).toBe("");
    expect(challengesTabQuery("mine")).toBe("?tab=mine");
    expect(challengesTabQuery("teams")).toBe("?tab=teams");
  });
});

describe("challengesSegments", () => {
  it("lists Open, Mine and Teams with each count once it is known", () => {
    expect(challengesSegments({ open: 3, mine: null, teams: 0 }, "en")).toEqual(
      [
        {
          key: "open",
          label: "Open",
          count: 3,
          accessibilityLabel: "Open, 3",
        },
        { key: "mine", label: "Mine", count: null, accessibilityLabel: "Mine" },
        {
          key: "teams",
          label: "Teams",
          count: 0,
          accessibilityLabel: "Teams, 0",
        },
      ],
    );
  });

  it("reads the labels from the Arabic catalog", () => {
    expect(
      challengesSegments({ open: null, mine: null, teams: 1 }, "ar").map(
        (segment) => segment.accessibilityLabel,
      ),
    ).toEqual(["مفتوحة", "تحدياتي", "الفرق، 1"]);
  });
});

const record = { gamesPlayed: 10, wins: 7, draws: 0, losses: 3 };

describe("challengeTeamRowView", () => {
  it("reads a padel Team as the pair, the viewer first, and its rivals", () => {
    const view = challengeTeamRowView(
      {
        id: "t1",
        displayName: "Seef Smashers",
        sport: "padel",
        incomplete: false,
        members: [{ name: "Ali Mansoor" }, { name: "Hamad Hasan", you: true }],
        rosterCount: 2,
        record,
        rivalCount: 1,
        groupTag: null,
      },
      "en",
    );
    expect(view.line).toBe("Padel. You and Ali M. 1 rival");
    expect(view.record).toEqual({ value: "7–3", label: "record" });
  });

  it("reads a football Team by its Roster and Group tag", () => {
    const view = challengeTeamRowView(
      {
        id: "t2",
        displayName: "Gooz FC",
        sport: "football",
        incomplete: false,
        members: [],
        rosterCount: 12,
        record: { gamesPlayed: 7, wins: 4, draws: 2, losses: 1 },
        rivalCount: 3,
        groupTag: { id: "g1", name: "Gooz of Arad" },
      },
      "en",
    );
    expect(view.line).toBe("Football. 12 on the roster. Gooz of Arad's team");
    expect(view.record.label).toBe("record");
  });
});

describe("challengeTeamInviteView", () => {
  it("reads the sport, who invited you and the seats still to fill", () => {
    expect(
      challengeTeamInviteView(
        {
          id: "i1",
          displayName: "Thursday Crew",
          sport: "football",
          rosterCount: 3,
          invitedBy: { name: "Noor Saleh" },
        },
        "en",
      ).line,
    ).toBe("Football. Noor S invited you, 2 seats open");
    expect(
      challengeTeamInviteView(
        {
          id: "i2",
          displayName: "Pair",
          sport: "padel",
          rosterCount: 2,
          invitedBy: { name: null },
        },
        "en",
      ).line,
    ).toMatch(/^Padel\. .+ invited you$/);
  });
});
