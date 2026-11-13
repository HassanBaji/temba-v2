import { isolate } from "@repo/i18n/bidi";
import { describe, expect, it } from "vitest";

import {
  challengeCostLine,
  challengeCountsForLine,
  challengeGameDetailsRows,
  challengeHeadToHeadLine,
  challengeHeroSubLine,
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
      recordLine: "3–1–2",
      recordSpoken: "Won 3, drew 1, lost 2",
    });
    expect(view.middleLine).toBe("head-to-head 2–0–1");
    expect(
      challengeTeamVsTeamView(
        [{ ...hidd, viewerIsCaptain: true }, arad],
        "football",
        "en",
      ).home.recordLine,
    ).toBe("3–1–2, you captain");
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
      middleLine: "first meeting",
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
    expect(challengeCountsForLine("football", true, "en")).toBe(
      "Both teams' records, the players named and Temba Level, once each team confirms the score",
    );
    expect(challengeCountsForLine("padel", true, "en")).toBe(
      "Both teams' records, the players named and rating",
    );
  });

  it("keeps an older Unrated football Challenge Game off Temba Level", () => {
    expect(challengeCountsForLine("football", false, "en")).toBe(
      "Both teams' records and the players named",
    );
    expect(challengeCountsForLine("football", true, "ar")).toBe(
      "سجلّ الفريقين، واللاعبين المُسمّين، ومستوى Temba، بعد أن يؤكّد كل فريق النتيجة",
    );
  });

  it("lists the details rows in the design's order", () => {
    const rows = challengeGameDetailsRows(
      {
        sport: "football",
        rated: true,
        postedByTeamName: "Gooz FC",
        postedAt: "2026-11-04T09:00:00.000Z",
        proposedByTeamName: "Hidd United",
        confirmedByName: "Hassan Haji",
        confirmedByViewer: true,
        venueName: "Fantasy FC",
        courtName: "Pitch 1",
        costLine: "1.500 BD each, pay at the venue",
      },
      "en",
    );
    expect(rows).toEqual([
      {
        key: "from",
        label: "From challenge",
        value: "Posted by Gooz FC, 4 Nov",
      },
      {
        key: "proposed",
        label: "Proposed by",
        value: "Hidd United, confirmed by you",
      },
      {
        key: "place",
        label: "Pitch",
        value: "Fantasy FC, Pitch 1. Book it yourselves",
      },
      {
        key: "cost",
        label: "Cost",
        value: "1.500 BD each, pay at the venue",
      },
      {
        key: "counts",
        label: "Counts for",
        value:
          "Both teams' records, the players named and Temba Level, once each team confirms the score",
      },
    ]);
    const padel = challengeGameDetailsRows(
      {
        sport: "padel",
        rated: true,
        postedByTeamName: "Seef Smashers",
        postedAt: null,
        proposedByTeamName: "Riffa Duo",
        confirmedByName: "Ali",
        confirmedByViewer: false,
        venueName: "Padel Central",
        courtName: null,
        costLine: "Split four ways, pay at the venue",
      },
      "ar",
    );
    expect(padel[0]?.value).toBe(`نشره ${isolate("Seef Smashers")}`);
    expect(padel[1]?.value).toBe(
      `${isolate("Riffa Duo")}، وأكّده ${isolate("Ali")}`,
    );
    expect(padel[2]).toMatchObject({
      label: "الملعب الفرعي",
      value: "Padel Central. احجزوه بأنفسكم",
    });
  });

  it("writes the hero's pitch, format, length and confirmation", () => {
    expect(
      challengeHeroSubLine(
        {
          pitchName: "Pitch 1",
          sideSize: 6,
          windowStart: "2026-11-14T16:00:00.000Z",
          windowEnd: "2026-11-14T17:30:00.000Z",
        },
        "en",
      ),
    ).toBe("Pitch 1, 6-a-side, 90 min. Confirmed by both teams");
    expect(
      challengeHeroSubLine(
        { pitchName: null, sideSize: null, windowStart: null, windowEnd: null },
        "en",
      ),
    ).toBe("Confirmed by both teams");
  });
});
