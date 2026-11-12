import { isolate } from "@repo/i18n/bidi";
import { describe, expect, it } from "vitest";

import { levelFromOvr } from "./football-ovr";
import { BAND_MIDPOINTS } from "./level";
import {
  earlyDaysView,
  footballPositionView,
  footballStatTiles,
  heroPositionLabel,
  levelTrendSince,
  partnerRowsView,
  padelStatTiles,
  profileFormView,
  profileHeroSubtitle,
  profileLevelView,
  profileStreaksView,
  sportSwitchView,
  withViewerView,
} from "./player-profile-page";

const NOV_4 = "2026-11-04T16:00:00.000Z";
const NOV_2 = "2026-11-02T16:00:00.000Z";
const SEP_29 = "2026-09-29T16:00:00.000Z";

describe("sportSwitchView", () => {
  it("offers no switch for one sport and counts games for two", () => {
    expect(
      sportSwitchView([{ sport: "football", played: 2 }], "football", "en"),
    ).toBeNull();
    expect(
      sportSwitchView(
        [
          { sport: "football", played: 24 },
          { sport: "padel", played: null },
        ],
        "football",
        "en",
      ),
    ).toEqual([
      { sport: "football", name: "Football", meta: "24 games", selected: true },
      { sport: "padel", name: "Padel", meta: null, selected: false },
    ]);
  });
});

describe("profileHeroSubtitle", () => {
  const venue = { name: "Fantasy Football Center" };

  it("leaves the sport to the switch when there is one", () => {
    expect(
      profileHeroSubtitle(
        { sport: "football", hasSwitch: true, position: "Midfield", venue },
        "en",
      ),
    ).toBe("Midfield, plays at Fantasy Football Center");
  });

  it("names the sport when there is no switch", () => {
    expect(
      profileHeroSubtitle(
        { sport: "football", hasSwitch: false, position: "Midfield", venue },
        "en",
      ),
    ).toBe("Football, midfield. Plays at Fantasy Football Center");
    expect(
      profileHeroSubtitle(
        { sport: "padel", hasSwitch: false, position: null, venue: null },
        "en",
      ),
    ).toBe("Padel");
  });

  it("names only a declared position", () => {
    expect(
      heroPositionLabel(
        { sport: "football", role: { role: "outfield", position: "mid" } },
        "en",
      ),
    ).toBe("Midfield");
    expect(
      heroPositionLabel(
        { sport: "football", role: { role: null, position: null } },
        "en",
      ),
    ).toBeNull();
  });
});

describe("profileLevelView", () => {
  const confirmed = {
    levelBand: "B2" as const,
    levelValue: 4.2,
    provisional: false,
    ratedMatchCount: 31,
    ratedMatchesRemaining: 0,
  };

  it("reads a confirmed Level with the distance to the next band", () => {
    const view = profileLevelView(
      confirmed,
      { sport: "padel", hasSwitch: true, trend: "+0.2 since Sep" },
      "en",
    );
    expect(view).toMatchObject({
      kind: "level",
      label: "Level",
      status: "Confirmed",
      statusDetail: "31 rated matches",
      band: "B",
      level: "4.2",
      trend: "+0.2 since Sep",
      hatched: false,
    });
    expect(view.kind === "level" && view.lead).toMatch(/ to B\+$/);
    expect(view.kind === "level" && view.trail).toMatch(/% of the way$/);
  });

  it("reads an unrated football Level as the starting one, hatched", () => {
    expect(
      profileLevelView(
        { ...confirmed, ratedMatchCount: 0, provisional: true },
        { sport: "football", hasSwitch: false, trend: null },
        "en",
      ),
    ).toMatchObject({
      label: "Football level",
      status: "Starting level",
      statusDetail: "Set at sign up",
      lead: "Doesn’t move with games yet",
      trail: null,
      percent: 0,
      hatched: true,
    });
  });

  it("reads a football Level as OVR: a self-placed Competitive is 72, an OVR of 74 is C+ on its way to B-", () => {
    expect(
      profileLevelView(
        {
          levelBand: "C1",
          levelValue: BAND_MIDPOINTS.C1,
          provisional: true,
          ratedMatchCount: 0,
          ratedMatchesRemaining: 5,
        },
        { sport: "football", hasSwitch: false, trend: null },
        "en",
      ),
    ).toMatchObject({ band: "C+", level: "72" });
    expect(
      profileLevelView(
        {
          levelBand: "C1",
          levelValue: levelFromOvr(74),
          provisional: false,
          ratedMatchCount: 6,
          ratedMatchesRemaining: 0,
        },
        { sport: "football", hasSwitch: true, trend: null },
        "en",
      ),
    ).toMatchObject({
      band: "C+",
      level: "74",
      lead: "2 to B-",
      trail: "76% of the way",
    });
  });

  it("reads no Level", () => {
    expect(
      profileLevelView(
        null,
        { sport: "padel", hasSwitch: true, trend: null },
        "en",
      ),
    ).toMatchObject({ kind: "none", value: "No Level yet" });
  });
});

describe("levelTrendSince", () => {
  it("sums the rated changes and names the oldest rated month", () => {
    expect(
      levelTrendSince(
        [
          { playedAt: NOV_4, rating: { levelChange: 0.1 } },
          { playedAt: NOV_2, rating: null },
          { playedAt: SEP_29, rating: { levelChange: 0.1 } },
        ],
        "en",
      ),
    ).toBe("+0.2 since Sep");
    expect(levelTrendSince([{ playedAt: NOV_4, rating: null }], "en")).toBe(
      null,
    );
  });
});

describe("profileStreaksView", () => {
  it("counts wins with the month the best streak was reached", () => {
    expect(
      profileStreaksView(
        { current: 2, best: 6, bestReachedAt: "2026-09-12T16:00:00.000Z" },
        "en",
      ),
    ).toMatchObject({
      current: { value: "2", unit: "wins", marks: 2 },
      best: { value: "6", unit: "wins", when: "September 2026" },
    });
  });
});

describe("stat tiles", () => {
  it("shows football W–D–L and goals per game from five games", () => {
    expect(
      footballStatTiles(
        { played: 24, won: 14, drawn: 4, lost: 6, goals: 19 },
        "en",
      ),
    ).toEqual([
      { value: "24", label: "Matches", locked: false },
      { value: "14–4–6", label: "Won, drawn, lost", locked: false },
      { value: "19", label: "Goals", locked: false },
      { value: "0.8", label: "Goals per game", locked: false },
    ]);
  });

  it("locks the win rate in the early days", () => {
    expect(
      footballStatTiles(
        { played: 2, won: 1, drawn: 0, lost: 1, goals: 1 },
        "en",
      ),
    ).toEqual([
      { value: "2", label: "Matches", locked: false },
      { value: "1", label: "Won", locked: false },
      { value: "1", label: "Goal", locked: false },
      { value: "After 5 games", label: "Win rate", locked: true },
    ]);
    expect(
      padelStatTiles(
        {
          played: 31,
          won: 19,
          lost: 12,
          drawn: 0,
          setsWon: 58,
          setsPlayed: 100,
        },
        "en",
      ).map((tile) => tile.value),
    ).toEqual(["31", "19", "61%", "58%"]);
  });
});

describe("profileFormView", () => {
  it("runs oldest to newest with not-played slots at the new end", () => {
    const view = profileFormView(
      [
        { outcome: "won", playedAt: NOV_4 },
        { outcome: "lost", playedAt: NOV_2 },
      ],
      { sport: "football", played: 2 },
      "en",
    );
    expect(view.title).toBe("Games");
    expect(view.record).toBe("2 played");
    expect(view.slots.slice(0, 3)).toEqual(["lost", "won", "not-played"]);
    expect(view.slots).toHaveLength(10);
    expect(view.ends).toEqual({ oldest: "2 Nov", newest: "4 Nov" });
  });

  it("reads W–D–L for football and W–L for padel once established", () => {
    const matches = [
      { outcome: "won" as const, playedAt: NOV_4 },
      { outcome: "draw" as const, playedAt: NOV_2 },
      { outcome: "lost" as const, playedAt: SEP_29 },
    ];
    expect(
      profileFormView(matches, { sport: "football", played: 8 }, "en").record,
    ).toBe("1–1–1");
    expect(
      profileFormView(
        matches.filter((match) => match.outcome !== "draw"),
        { sport: "padel", played: 8 },
        "en",
      ).record,
    ).toBe("1–1");
  });
});

describe("earlyDaysView", () => {
  it("leads a profile under five games and says since when", () => {
    expect(
      earlyDaysView(
        [{ playedAt: NOV_4 }, { playedAt: NOV_2 }],
        { sport: "football", played: 2 },
        "en",
      ),
    ).toEqual({
      title: "2 games so far",
      since: "since 2 Nov",
      note: "Streaks, win rate and teammates show after 5 games.",
    });
    expect(earlyDaysView([], { sport: "padel", played: 5 }, "en")).toBeNull();
  });
});

describe("withViewerView", () => {
  const tally = (won: number, drawn: number, lost: number) => ({
    played: won + drawn + lost,
    won,
    drawn,
    lost,
  });

  it("reads the record together and the head-to-head leader first", () => {
    expect(
      withViewerView(
        {
          together: tally(5, 1, 2),
          against: tally(3, 0, 2),
          sharedGroups: ["Gooz of Arad"],
        },
        { sport: "football", playerName: "Yousif Kadhem" },
        "en",
      ),
    ).toMatchObject({
      title: "You and Yousif",
      scope: "all time",
      columns: [
        { label: "As teammates", record: "5–1–2", detail: "in 8 games" },
        { label: "Against", record: "3–0–2", detail: "to Yousif" },
      ],
      groups: "Both in Gooz of Arad",
    });
    expect(
      withViewerView(
        {
          together: tally(4, 0, 1),
          against: tally(2, 0, 3),
          sharedGroups: ["A", "B", "C"],
        },
        { sport: "padel", playerName: "Yousif Kadhem" },
        "en",
      ),
    ).toMatchObject({
      columns: [
        { label: "As partners", record: "4–1", detail: "in 5 games" },
        { label: "Against each other", record: "3–2", detail: "to you" },
      ],
      groups: "Both in A and 2 other groups",
    });
  });

  it("says no games together when only a Group is shared", () => {
    expect(
      withViewerView(
        {
          together: tally(0, 0, 0),
          against: tally(0, 0, 0),
          sharedGroups: ["Gooz of Arad"],
        },
        { sport: "football", playerName: "Bo Fareed" },
        "en",
      ),
    ).toMatchObject({
      title: "You and Bo",
      columns: null,
      empty: "No games together yet.",
      groups: "Both in Gooz of Arad",
    });
    expect(
      withViewerView(null, { sport: "padel", playerName: "Bo" }, "en"),
    ).toBeNull();
  });
});

describe("footballPositionView", () => {
  it("puts a keeper in goal and an unset role nowhere", () => {
    expect(
      footballPositionView({ role: "keeper", position: null }, "en").sport ===
        "football" &&
        footballPositionView({ role: "keeper", position: null }, "en"),
    ).toMatchObject({ spot: "gk", value: "Keeper" });
    expect(
      footballPositionView({ role: null, position: null }, "en"),
    ).toMatchObject({ spot: null });
  });
});

describe("partnerRowsView", () => {
  it("reads W–D–L for teammates, W–L for partners, and the win share", () => {
    const partner = {
      userId: "u1",
      name: "Ali Mansoor",
      image: null,
      won: 6,
      lost: 1,
      played: 8,
    };
    expect(partnerRowsView([partner], "football", "en")[0]).toMatchObject({
      record: "6–1–1",
      percent: 75,
    });
    expect(
      partnerRowsView([{ ...partner, played: 7 }], "padel", "en")[0],
    ).toMatchObject({ record: "6–1", percent: 86 });
  });
});

describe("records in Arabic", () => {
  it("isolates W–D–L so the digits keep their order", () => {
    expect(
      footballStatTiles(
        { played: 24, won: 14, drawn: 4, lost: 6, goals: 19 },
        "ar",
      )[1]?.value,
    ).toBe(isolate("14–4–6"));
  });
});
