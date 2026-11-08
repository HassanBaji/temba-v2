import { describe, expect, it } from "vitest";

import {
  challengeFormatOptions,
  challengeFormatProblem,
  challengeLevelWantedAround,
  challengeNudgeView,
  challengeReviewLines,
  challengeSlotDayOptions,
  challengeSlotInstant,
  challengeSlotTimeOptions,
  emptyChallengeDraft,
  rematchChallengeDraft,
  validateChallengeDraft,
  type ChallengeDraftTeam,
  type ChallengePlayedTeam,
} from "./challenge-form";

const now = new Date("2026-11-08T10:00:00Z");

const gooz: ChallengeDraftTeam = {
  id: "gooz",
  displayName: "Gooz FC",
  sport: "football",
  rosterCount: 12,
};

const seef: ChallengeDraftTeam = {
  id: "seef",
  displayName: "Seef Smashers",
  sport: "padel",
  rosterCount: 2,
};

describe("challengeFormatProblem", () => {
  it("lets a football Roster post the Formats it can field", () => {
    const five = { sport: "football" as const, rosterCount: 5 };
    expect(challengeFormatProblem({ ...five, sideSize: 5 })).toBeNull();
    expect(challengeFormatProblem({ ...five, sideSize: 6 })).toBe(
      "format_roster",
    );
    const six = { sport: "football" as const, rosterCount: 6 };
    expect(challengeFormatProblem({ ...six, sideSize: 5 })).toBeNull();
    expect(challengeFormatProblem({ ...six, sideSize: 6 })).toBeNull();
    expect(challengeFormatProblem({ ...six, sideSize: 7 })).toBe(
      "format_roster",
    );
  });

  it("needs a Format on football and refuses one on padel", () => {
    expect(
      challengeFormatProblem({
        sport: "football",
        rosterCount: 8,
        sideSize: null,
      }),
    ).toBe("format_required");
    expect(
      challengeFormatProblem({
        sport: "football",
        rosterCount: 12,
        sideSize: 11,
      }),
    ).toBe("format_unknown");
    expect(
      challengeFormatProblem({ sport: "padel", rosterCount: 2, sideSize: 5 }),
    ).toBe("format_on_padel");
    expect(
      challengeFormatProblem({
        sport: "padel",
        rosterCount: 1,
        sideSize: null,
      }),
    ).toBe("padel_roster");
    expect(
      challengeFormatProblem({
        sport: "padel",
        rosterCount: 2,
        sideSize: null,
      }),
    ).toBeNull();
  });
});

describe("challengeFormatOptions", () => {
  it("disables the Formats the Roster cannot field", () => {
    expect(
      challengeFormatOptions(6, "en").map((option) => [
        option.label,
        option.disabled,
      ]),
    ).toEqual([
      ["5-a-side", false],
      ["6-a-side", false],
      ["7-a-side", true],
    ]);
    expect(challengeFormatOptions(6, "en")[2]?.accessibilityLabel).toBe(
      "7-a-side needs 7 on the Roster",
    );
  });
});

describe("validateChallengeDraft", () => {
  it("returns the post input for a valid football draft", () => {
    const slot = new Date("2026-11-13T16:00:00Z");
    const result = validateChallengeDraft(
      {
        ...emptyChallengeDraft("gooz"),
        sideSize: 6,
        venueIds: ["v1"],
        days: ["fri"],
        timings: ["evening"],
        exactSlots: [slot],
        levelMin: "C",
        levelMax: "B-",
        note: "  Friendly, on time  ",
      },
      gooz,
      "en",
      now,
    );
    expect(result).toEqual({
      ok: true,
      input: {
        teamId: "gooz",
        sideSize: 6,
        levelMinTenths: 28,
        levelMaxTenths: 48,
        venueIds: ["v1"],
        days: ["fri"],
        timings: ["evening"],
        exactSlots: [slot],
        note: "Friendly, on time",
        nudgeTeamId: null,
      },
    });
  });

  it("names the Format problem from the catalog", () => {
    const result = validateChallengeDraft(
      { ...emptyChallengeDraft("gooz"), sideSize: 7 },
      { ...gooz, rosterCount: 6 },
      "en",
      now,
    );
    expect(result).toEqual({
      ok: false,
      errors: {
        format: "7-a-side needs that many on the Roster. Yours has 6.",
      },
    });
  });

  it("refuses an inverted range, a long line, a past slot and no Team", () => {
    const result = validateChallengeDraft(
      {
        ...emptyChallengeDraft("seef"),
        levelMin: "B",
        levelMax: "C",
        note: "x".repeat(141),
        exactSlots: [new Date(now.getTime() - 1)],
      },
      seef,
      "en",
      now,
    );
    expect(result.ok).toBe(false);
    expect(!result.ok && Object.keys(result.errors).sort()).toEqual([
      "level",
      "note",
      "slots",
    ]);
    expect(
      validateChallengeDraft(emptyChallengeDraft(), null, "en", now),
    ).toEqual({ ok: false, errors: { team: "Pick a Team" } });
  });

  it("drops a Format left on the draft when the Team is padel", () => {
    const result = validateChallengeDraft(
      { ...emptyChallengeDraft("seef"), sideSize: 6 },
      seef,
      "en",
      now,
    );
    expect(result.ok && result.input.sideSize).toBeNull();
  });
});

describe("challengeReviewLines", () => {
  it("reads the football review from the catalog", () => {
    expect(
      challengeReviewLines(gooz, 6, "en").map((line) => line.text),
    ).toEqual([
      "Team Gooz FC, 12 on the roster",
      "Format 6-a-side. Squads of up to 9 named after confirmation",
      "Visible to every football Team on Temba",
      "Open for 7 days",
      "Proposals: You confirm one; the rest are told",
    ]);
  });

  it("has no Format line on padel", () => {
    expect(
      challengeReviewLines(seef, null, "en").map((line) => line.key),
    ).toEqual(["team", "visibility", "open", "proposals"]);
  });
});

describe("exact slots", () => {
  it("offers two weeks of days from today and half-hour starts", () => {
    const days = challengeSlotDayOptions(now, "en");
    expect(days).toHaveLength(14);
    expect(days[0]).toMatchObject({ value: "2026-11-08", label: "Sun 8 Nov" });
    const times = challengeSlotTimeOptions("en");
    expect(times[0]).toEqual({ value: 360, label: "6:00 AM" });
    expect(times.at(-1)).toEqual({ value: 1380, label: "11:00 PM" });
  });

  it("reads a day and a start in the product timezone", () => {
    expect(challengeSlotInstant("2026-11-13", 19 * 60)).toEqual(
      new Date("2026-11-13T16:00:00Z"),
    );
  });
});

const arad: ChallengePlayedTeam = {
  id: "arad",
  displayName: "Arad Athletic",
  teamLevel: { tenths: 28 },
  lastGame: { sideSize: 6, venueId: "pitches" },
};

describe("rematchChallengeDraft", () => {
  it("pre-fills the Format, the Venue, a Level around the opponent and the nudge", () => {
    const draft = rematchChallengeDraft(gooz, arad, ["pitches", "arena"]);
    expect(draft).toEqual({
      ...emptyChallengeDraft("gooz"),
      sideSize: 6,
      venueIds: ["pitches"],
      levelMin: "C-",
      levelMax: "C+",
      nudgeTeamId: "arad",
    });
    const result = validateChallengeDraft(draft, gooz, "en", now);
    expect(result.ok && result.input).toMatchObject({
      sideSize: 6,
      venueIds: ["pitches"],
      levelMinTenths: 21,
      levelMaxTenths: 41,
      nudgeTeamId: "arad",
    });
  });

  it("stays editable: every pre-filled field can be changed before Post", () => {
    const edited = {
      ...rematchChallengeDraft(gooz, arad, ["pitches", "arena"]),
      sideSize: 7,
      venueIds: ["arena"],
      levelMin: "B-" as const,
      levelMax: "B" as const,
    };
    const result = validateChallengeDraft(edited, gooz, "en", now);
    expect(result.ok && result.input).toMatchObject({
      sideSize: 7,
      venueIds: ["arena"],
      levelMinTenths: 42,
      levelMaxTenths: 55,
      nudgeTeamId: "arad",
    });
  });

  it("leaves out a Format the Roster cannot field, a Venue no longer offered and a missing Team Level", () => {
    const draft = rematchChallengeDraft(
      { ...gooz, rosterCount: 5 },
      { ...arad, teamLevel: null },
      ["arena"],
    );
    expect(draft).toMatchObject({
      sideSize: null,
      venueIds: [],
      levelMin: "none",
      levelMax: "none",
      nudgeTeamId: "arad",
    });
    expect(
      rematchChallengeDraft(
        seef,
        { ...arad, lastGame: { sideSize: null, venueId: "central" } },
        ["central"],
      ),
    ).toMatchObject({ sideSize: null, venueIds: ["central"] });
  });
});

describe("challengeLevelWantedAround", () => {
  it("stops at the lowest and highest bands", () => {
    expect(challengeLevelWantedAround(3)).toEqual({
      levelMin: "D",
      levelMax: "D+",
    });
    expect(challengeLevelWantedAround(70)).toEqual({
      levelMin: "B+",
      levelMax: "A",
    });
  });
});

describe("challengeNudgeView", () => {
  it("lists the Teams played and names the one picked", () => {
    const view = challengeNudgeView([arad], "arad", "en");
    expect(view).toEqual({
      title: "Also send it straight to a team you've played?",
      hint: "Who acts for that team hears now. It still sits on the open board for everyone.",
      teamsLabel: "Teams you've played",
      on: true,
      selected: "arad",
      options: [{ value: "arad", label: "Arad Athletic" }],
      line: "Sent straight to Arad Athletic too",
    });
    expect(challengeNudgeView([arad], null, "en")).toMatchObject({
      on: false,
      line: null,
    });
    expect(challengeNudgeView([arad], "arad", "ar")?.title).toBe(
      "هل ترسله أيضًا مباشرة إلى فريق لعبتم ضده؟",
    );
  });

  it("has nothing to offer a Team that has played nobody", () => {
    expect(challengeNudgeView([], null, "en")).toBeNull();
  });
});
