import { describe, expect, it } from "vitest";

import {
  challengeFormatOptions,
  challengeFormatProblem,
  challengeLevelWantedAround,
  challengeDaysHint,
  challengeDraftWithTeam,
  challengeFormatHelp,
  challengeInitialDraft,
  challengeLevelChips,
  challengeLevelHint,
  challengeLevelSelected,
  challengeLevelTap,
  challengeNudgeView,
  challengePreviewCardInput,
  challengeReviewRows,
  challengeRosterHint,
  challengeSlotLabel,
  challengeTeamChoice,
  challengeVenueChoice,
  challengeWeekdayOptions,
  challengeSlotDayOptions,
  challengeSlotInstant,
  challengeSlotTimeOptions,
  emptyChallengeDraft,
  rematchChallengeDraft,
  validateChallengeDraft,
  type ChallengeDraftTeam,
  type ChallengeFormTeam,
  type ChallengePlayedTeam,
} from "./challenge-form";
import { parseLevelBandSelectTenths } from "./level-range";

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

describe("challengeReviewRows", () => {
  it("reads the football review from the catalog", () => {
    expect(
      challengeReviewRows(
        gooz,
        {
          sideSize: 6,
          levelMinTenths: parseLevelBandSelectTenths("C", "min"),
          levelMaxTenths: parseLevelBandSelectTenths("B-", "max"),
        },
        [{ city: "Manama" }, { city: "Manama " }],
        "en",
      ),
    ).toEqual([
      { key: "team", label: "Team", value: "Gooz FC, 12 on the roster" },
      {
        key: "format",
        label: "Format",
        value: "6-a-side. Squads of up to 9 named after confirmation",
      },
      {
        key: "visibility",
        label: "Visible to",
        value: "Football teams, C to B-, in Manama",
      },
      { key: "open", label: "Open for", value: "7 days, then it expires" },
      {
        key: "proposals",
        label: "Proposals",
        value: "You confirm one; the rest are told",
      },
    ]);
  });

  it("has no Format row on padel and says everyone sees an open one", () => {
    const rows = challengeReviewRows(
      seef,
      { sideSize: null, levelMinTenths: null, levelMaxTenths: null },
      [],
      "en",
    );
    expect(rows.map((row) => row.key)).toEqual([
      "team",
      "visibility",
      "open",
      "proposals",
    ]);
    expect(rows[0]?.value).toBe("Seef Smashers");
    expect(rows[1]?.value).toBe("Every padel team on Temba");
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
  const hidd = { id: "hidd", displayName: "Hidd United" };

  it("names the Team picked, or the most recent one while off", () => {
    expect(challengeNudgeView([hidd, arad], "arad", "en")).toEqual({
      title: "Also send it straight to a team you've played?",
      before: "Also send it straight to a team you've played? ",
      teamName: "Arad Athletic",
      after: " get a nudge and it stays on the open board.",
      teamsLabel: "Teams you've played",
      on: true,
      selected: "arad",
      firstTeamId: "hidd",
      options: [
        { value: "hidd", label: "Hidd United" },
        { value: "arad", label: "Arad Athletic" },
      ],
    });
    expect(challengeNudgeView([hidd, arad], null, "en")).toMatchObject({
      on: false,
      selected: null,
      teamName: "Hidd United",
    });
    expect(challengeNudgeView([arad], "arad", "ar")?.title).toBe(
      "هل ترسله أيضًا مباشرة إلى فريق لعبتم ضده؟",
    );
  });

  it("has nothing to offer a Team that has played nobody", () => {
    expect(challengeNudgeView([], null, "en")).toBeNull();
  });
});

const goozForm: ChallengeFormTeam = {
  ...gooz,
  teamLevel: { tenths: 28, level: "2.8", band: "C" },
  members: [{ name: "Hamad Hasan", isViewer: true }],
  playedTeams: [arad],
};

const seefForm: ChallengeFormTeam = {
  ...seef,
  teamLevel: { tenths: 31, level: "3.1", band: "C+" },
  members: [{ name: "Ali Mansoor" }, { name: "Sara Khalil", isViewer: true }],
  playedTeams: [],
};

describe("challengeInitialDraft", () => {
  const options = {
    teams: [goozForm, seefForm],
    venues: { football: [{ id: "pitches" }], padel: [] },
  };

  it("pre-fills a Rematch from the Team played", () => {
    expect(
      challengeInitialDraft(options, {
        teamId: "gooz",
        opponentTeamId: "arad",
      }),
    ).toMatchObject({
      teamId: "gooz",
      sideSize: 6,
      venueIds: ["pitches"],
      nudgeTeamId: "arad",
    });
  });

  it("selects the Team a link names, or the only Team", () => {
    expect(
      challengeInitialDraft(options, { teamId: "seef", opponentTeamId: null }),
    ).toEqual(emptyChallengeDraft("seef"));
    expect(
      challengeInitialDraft(options, { teamId: null, opponentTeamId: null }),
    ).toEqual(emptyChallengeDraft());
    expect(
      challengeInitialDraft(
        { ...options, teams: [goozForm] },
        { teamId: null, opponentTeamId: "arad" },
      ),
    ).toEqual(emptyChallengeDraft("gooz"));
  });
});

describe("challengeDraftWithTeam", () => {
  it("keeps what still applies to the new Team", () => {
    const draft = {
      ...emptyChallengeDraft("gooz"),
      sideSize: 7,
      venueIds: ["pitches"],
      nudgeTeamId: "arad",
    };
    const small = { ...gooz, id: "small", rosterCount: 6 };
    expect(
      challengeDraftWithTeam(draft, [gooz, small, seef], "small"),
    ).toMatchObject({
      teamId: "small",
      sideSize: null,
      venueIds: ["pitches"],
      nudgeTeamId: null,
    });
    expect(
      challengeDraftWithTeam(draft, [gooz, small, seef], "seef"),
    ).toMatchObject({ teamId: "seef", sideSize: null, venueIds: [] });
  });
});

describe("challengeTeamChoice", () => {
  it("describes a padel pair with you first and a football Roster", () => {
    expect(challengeTeamChoice(seefForm, "en").detail).toBe(
      "Padel, C+, you and Ali M",
    );
    expect(challengeTeamChoice(goozForm, "en").detail).toBe(
      "Football, C. 12 on the roster",
    );
    expect(
      challengeTeamChoice({ ...goozForm, teamLevel: null }, "en").detail,
    ).toBe("Football. 12 on the roster");
  });
});

describe("Format copy", () => {
  it("reads the Roster against the twenty cap", () => {
    expect(challengeRosterHint(12, "en")).toBe("roster 12 of 20");
  });

  it("says what the Roster can field and how squads are named", () => {
    expect(challengeFormatHelp(gooz, 6, "en")).toBe(
      "Gooz FC has 12 on the roster, enough for any format. Squads of 6 plus up to 3 reserves are named by both captains after the challenge is confirmed.",
    );
    expect(challengeFormatHelp({ ...gooz, rosterCount: 6 }, null, "en")).toBe(
      "Gooz FC has 6 on the roster, enough for 5 and 6-a-side. Squads of the format plus up to 3 reserves are named by both captains after the challenge is confirmed.",
    );
  });
});

describe("challengeVenueChoice", () => {
  const venues = [
    { id: "fantasy", name: "Fantasy FC", city: "Manama" },
    { id: "karbabad", name: "Karbabad Turf", city: "Manama" },
    { id: "aali", name: "A'ali Club", city: "Manama" },
    { id: "zallaq", name: "Zallaq Pitch", city: "Manama" },
  ];

  it("counts the picks and caps them at three", () => {
    const two = challengeVenueChoice(venues, ["fantasy", "karbabad"], "en");
    expect(two.hint).toBe("2 picked");
    expect(two.anywhere).toEqual({
      label: "Anywhere in Manama",
      selected: false,
    });
    const three = challengeVenueChoice(
      venues,
      ["fantasy", "karbabad", "aali"],
      "en",
    );
    expect(three.chips.find((chip) => chip.value === "zallaq")?.disabled).toBe(
      true,
    );
  });

  it("selects Anywhere with no pick, unnamed across cities", () => {
    const choice = challengeVenueChoice(
      [...venues, { id: "riffa", name: "Riffa Arena", city: "Riffa" }],
      [],
      "en",
    );
    expect(choice.anywhere).toEqual({ label: "Anywhere", selected: true });
    expect(choice.hint).toBe("up to 3");
  });
});

describe("days", () => {
  it("runs the chips Saturday to Friday and the hint in week order", () => {
    expect(challengeWeekdayOptions("en").map((day) => day.label)).toEqual([
      "Sat",
      "Sun",
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
    ]);
    expect(challengeDaysHint(["sat", "fri"], "en")).toBe("Fri, Sat");
    expect(challengeDaysHint([], "en")).toBe("Any day");
  });
});

describe("level wanted", () => {
  const none = { levelMin: "none", levelMax: "none" } as const;

  it("shows six bands around the Team Level, taking in the picks", () => {
    expect(challengeLevelChips(28, none)).toEqual([
      "D+",
      "C-",
      "C",
      "C+",
      "B-",
      "B",
    ]);
    expect(challengeLevelChips(70, none)).toEqual([
      "C",
      "C+",
      "B-",
      "B",
      "B+",
      "A",
    ]);
    expect(challengeLevelChips(28, { levelMin: "C", levelMax: "A" })).toEqual(
      ["C-", "C", "C+", "B-", "B", "B+", "A"].slice(1),
    );
    expect(challengeLevelChips(null, none)).toHaveLength(6);
  });

  it("stretches, shrinks and clears one run of bands", () => {
    const c = challengeLevelTap(none, "C");
    expect(c).toEqual({ levelMin: "C", levelMax: "C" });
    const wide = challengeLevelTap(c, "B-");
    expect(wide).toEqual({ levelMin: "C", levelMax: "B-" });
    expect(challengeLevelSelected(wide, "C+")).toBe(true);
    expect(challengeLevelSelected(wide, "B")).toBe(false);
    expect(challengeLevelTap(wide, "C")).toEqual({
      levelMin: "C+",
      levelMax: "B-",
    });
    expect(challengeLevelTap(wide, "D+")).toEqual({
      levelMin: "D+",
      levelMax: "B-",
    });
    expect(challengeLevelTap(c, "C")).toEqual(none);
  });

  it("names the run beside the heading", () => {
    expect(challengeLevelHint({ levelMin: "C", levelMax: "B-" }, "en")).toBe(
      "C to B-",
    );
    expect(challengeLevelHint({ levelMin: "C", levelMax: "C" }, "en")).toBe(
      "C",
    );
    expect(challengeLevelHint(none, "en")).toBe("Any level");
  });
});

describe("challengeSlotLabel", () => {
  it("says the weekday this week and the date further out", () => {
    expect(
      challengeSlotLabel(new Date("2026-11-12T17:00:00Z"), now, "en"),
    ).toBe("Thu 8:00 PM");
    expect(
      challengeSlotLabel(new Date("2026-11-19T17:00:00Z"), now, "en"),
    ).not.toBe("Thu 8:00 PM");
  });
});

describe("challengePreviewCardInput", () => {
  it("shows only the Venues picked, as a fresh Challenge", () => {
    const input = challengePreviewCardInput(
      goozForm,
      {
        teamId: "gooz",
        sideSize: 6,
        levelMinTenths: null,
        levelMaxTenths: null,
        venueIds: ["fantasy"],
        days: ["fri"],
        timings: ["evening"],
        exactSlots: [],
        note: "Six who turn up",
        nudgeTeamId: null,
      },
      [
        { id: "fantasy", name: "Fantasy FC" },
        { id: "aali", name: "A'ali Club" },
      ],
      now,
    );
    expect(input).toMatchObject({
      id: "preview",
      venues: [{ id: "fantasy", name: "Fantasy FC" }],
      proposalCount: 0,
      viewer: { ineligibleReason: null },
    });
  });
});
