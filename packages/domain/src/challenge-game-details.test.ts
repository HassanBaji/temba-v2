import { isolate } from "@repo/i18n/bidi";
import { describe, expect, it } from "vitest";

import {
  challengeCostLine,
  challengeCountsForLine,
  challengeGameDetailsRows,
  challengeHeadToHeadLine,
  challengeTeamVsTeamView,
} from "./challenge-game-details";

const hidd = {
  name: "Hidd United",
  initials: "HU",
  record: { wins: 3, draws: 1, losses: 2 },
  headToHead: { wins: 2, draws: 0, losses: 1 },
};
const arad = {
  name: "Arad Athletic",
  initials: "AA",
  record: { wins: 1, draws: 0, losses: 4 },
  headToHead: { wins: 1, draws: 0, losses: 2 },
};

describe("challenge game details", () => {
  it("reads head-to-head from the first Team's side, or a first meeting", () => {
    expect(challengeHeadToHeadLine(hidd.headToHead, "football", "en")).toBe(
      "Head-to-head 2–0–1",
    );
    expect(challengeHeadToHeadLine(hidd.headToHead, "padel", "en")).toBe(
      "Head-to-head 2–1",
    );
    expect(challengeHeadToHeadLine(null, "football", "en")).toBe(
      "First meeting",
    );
    expect(challengeHeadToHeadLine(null, "padel", "ar")).toBe("أول لقاء");
  });

  it("puts both crests, names and records on the team-vs-team row", () => {
    const view = challengeTeamVsTeamView([hidd, arad], "football", "en");
    expect(view.home).toEqual({
      name: "Hidd United",
      initials: "HU",
      recordLabel: "W–D–L",
      recordValue: "3–1–2",
      recordSpoken: "Won 3, drew 1, lost 2",
    });
    expect(view.away.recordValue).toBe("1–0–4");
    expect(view.title).toBe("Hidd United v Arad Athletic");
    expect(view.headToHeadLine).toBe("Head-to-head 2–0–1");
    expect(view.accessibilityLabel).toContain(
      "Head-to-head: won 2, drew 0, lost 1",
    );
    expect(
      challengeTeamVsTeamView(
        [
          { ...hidd, headToHead: null },
          { ...arad, headToHead: null },
        ],
        "padel",
        "en",
      ),
    ).toMatchObject({
      headToHeadLine: "First meeting",
      home: { recordLabel: "W–L", recordValue: "3–2" },
    });
  });

  it("writes the cost from the price, or splits padel by its players", () => {
    expect(
      challengeCostLine({ sport: "football", pricePerPlayerFils: 1500 }, "en"),
    ).toBe("1.500 BD each, pay at the venue");
    expect(
      challengeCostLine({ sport: "football", pricePerPlayerFils: null }, "en"),
    ).toBe("Pay at the venue");
    expect(
      challengeCostLine({ sport: "padel", pricePerPlayerFils: null }, "en"),
    ).toBe("Split four ways, pay at the venue");
    expect(
      challengeCostLine(
        { sport: "padel", pricePerPlayerFils: null, playerCount: 3 },
        "en",
      ),
    ).toBe("Split 3 ways, pay at the venue");
    expect(
      challengeCostLine({ sport: "padel", pricePerPlayerFils: 0 }, "en"),
    ).toBe("Free");
  });

  it("says what the Game counts for, by sport", () => {
    expect(challengeCountsForLine("football", "en")).toBe(
      "Both teams' records and the players named",
    );
    expect(challengeCountsForLine("padel", "en")).toBe(
      "Both teams' records, the players named and rating",
    );
  });

  it("lists the details rows in the mockup's order", () => {
    const rows = challengeGameDetailsRows(
      {
        sport: "football",
        postedByTeamName: "Hidd United",
        proposedByName: "Sara",
        confirmedByName: "Ali",
        venueName: "Pitch Park",
        courtName: "Pitch 2",
        costLine: "1.500 BD each, pay at the venue",
      },
      "en",
    );
    expect(rows).toEqual([
      {
        key: "from",
        label: "From",
        value: "Hidd United's challenge",
        hint: null,
      },
      {
        key: "agreed",
        label: "Agreed",
        value: "Proposed by Sara, confirmed by Ali",
        hint: null,
      },
      {
        key: "place",
        label: "Pitch",
        value: "Pitch Park, Pitch 2",
        hint: "Book it yourselves",
      },
      {
        key: "cost",
        label: "Cost",
        value: "1.500 BD each, pay at the venue",
        hint: null,
      },
      {
        key: "counts",
        label: "Counts for",
        value: "Both teams' records and the players named",
        hint: null,
      },
    ]);
    const padel = challengeGameDetailsRows(
      {
        sport: "padel",
        postedByTeamName: "Seef Smashers",
        proposedByName: null,
        confirmedByName: null,
        venueName: "Padel Central",
        courtName: null,
        costLine: "Split four ways, pay at the venue",
      },
      "ar",
    );
    expect(padel[0]?.value).toBe(`تحدي ${isolate("Seef Smashers")}`);
    expect(padel[2]?.value).toBe("Padel Central");
  });
});
