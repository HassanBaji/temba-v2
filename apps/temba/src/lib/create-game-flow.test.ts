import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { sizeFriendlyTournament } from "./tournament-sizing";
import {
  CREATE_FLOW_PRICE_CHIPS,
  CREATE_GAME_TYPE_CARDS,
  FRIENDLY_TOURNAMENT_UNEVEN_GROUPS,
  applyLevelBoundChange,
  createFlowLaterSteps,
  createFlowStepForField,
  createGameFlowHref,
  createVenueCopy,
  finishSlotForDuration,
  firstIncompleteFriendlyGameStep,
  firstIncompleteFriendlyTournamentStep,
  friendlyGameKickoff,
  friendlyGamePreviewLine,
  friendlyTournamentCreateHref,
  friendlyTournamentDefaultName,
  friendlyTournamentGroupsLine,
  friendlyTournamentSchedule,
  friendlyTournamentScheduleLine,
  gameTeamOfTwoCopy,
  isLevelBoundDisabled,
  matchingDurationPreset,
  parseCreateFlowStep,
  parseCreateFlowType,
  parseCreateMatchMinutes,
  priceChipIsSelected,
  resolveCreateFlowStep,
  validateFriendlyGameWhen,
  validateFriendlyGameWhere,
  validateTournamentName,
  venueCardMeta,
  visibleCreateGroups,
} from "./create-game-flow";

const NOW = new Date(2026, 8, 22, 12, 0, 0);

const emptyDraft = {
  groupId: "",
  venueId: "",
  day: "",
  startTime: "",
  finishTime: "",
};

describe("createFlowStepForField", () => {
  it("sends where fields to step 2", () => {
    assert.equal(createFlowStepForField("groupId"), 2);
    assert.equal(createFlowStepForField("venueId"), 2);
    assert.equal(createFlowStepForField("courtId"), 2);
  });

  it("sends the window to step 3", () => {
    assert.equal(createFlowStepForField("windowStart"), 3);
    assert.equal(createFlowStepForField("windowEnd"), 3);
  });

  it("sends level and price to step 4", () => {
    assert.equal(createFlowStepForField("pricePerPlayerCents"), 4);
    assert.equal(createFlowStepForField("levelMinTenths"), 4);
    assert.equal(createFlowStepForField("levelMaxTenths"), 4);
    assert.equal(createFlowStepForField("name"), 4);
  });

  it("sends tournament size and schedule fields to their steps", () => {
    assert.equal(createFlowStepForField("teamCount"), 2);
    assert.equal(createFlowStepForField("courtIds"), 2);
    assert.equal(createFlowStepForField("poolCount"), 3);
    assert.equal(createFlowStepForField("matchMinutes"), 3);
    assert.equal(createFlowStepForField("windowEnd"), 3);
  });
});

describe("firstIncompleteFriendlyGameStep", () => {
  it("starts at where when Group or Venue is missing", () => {
    assert.equal(
      firstIncompleteFriendlyGameStep(
        { ...emptyDraft, groupId: "group-1" },
        NOW,
      ),
      2,
    );
    assert.equal(firstIncompleteFriendlyGameStep(emptyDraft, NOW), 2);
  });

  it("stops at when until day, start, and finish are valid", () => {
    assert.equal(
      firstIncompleteFriendlyGameStep(
        {
          groupId: "group-1",
          venueId: "venue-1",
          day: "2026-09-23",
          startTime: "20:00",
          finishTime: "",
        },
        NOW,
      ),
      3,
    );
  });

  it("reaches level and price once where and when are complete", () => {
    assert.equal(
      firstIncompleteFriendlyGameStep(
        {
          groupId: "group-1",
          venueId: "venue-1",
          day: "2026-09-23",
          startTime: "20:00",
          finishTime: "21:30",
        },
        NOW,
      ),
      4,
    );
  });
});

describe("resolveCreateFlowStep", () => {
  it("opens step 1 until a type is chosen", () => {
    assert.equal(
      resolveCreateFlowStep({
        type: null,
        requestedStep: 4,
        draft: emptyDraft,
        now: NOW,
      }),
      1,
    );
  });

  it("opens step 2 of the tournament branch when step is absent", () => {
    assert.equal(
      resolveCreateFlowStep({
        type: "friendly_tournament",
        requestedStep: null,
        draft: emptyDraft,
        now: NOW,
      }),
      2,
    );
  });

  it("opens step 2 when the type is set and step is absent", () => {
    assert.equal(
      resolveCreateFlowStep({
        type: "friendly_game",
        requestedStep: null,
        draft: emptyDraft,
        now: NOW,
      }),
      2,
    );
  });

  it("keeps an earlier requested step", () => {
    assert.equal(
      resolveCreateFlowStep({
        type: "friendly_game",
        requestedStep: 1,
        draft: {
          groupId: "group-1",
          venueId: "venue-1",
          day: "2026-09-23",
          startTime: "20:00",
          finishTime: "21:30",
        },
        now: NOW,
      }),
      1,
    );
  });

  it("opens the first incomplete step when the requested step is ahead", () => {
    assert.equal(
      resolveCreateFlowStep({
        type: "friendly_game",
        requestedStep: 4,
        draft: { ...emptyDraft, groupId: "group-1", venueId: "venue-1" },
        now: NOW,
      }),
      3,
    );
    assert.equal(
      resolveCreateFlowStep({
        type: "friendly_game",
        requestedStep: 4,
        draft: { ...emptyDraft, groupId: "group-1" },
        now: NOW,
      }),
      2,
    );
  });
});

describe("create flow query", () => {
  it("parses type and step", () => {
    assert.equal(parseCreateFlowType("friendly_game"), "friendly_game");
    assert.equal(
      parseCreateFlowType("friendly_tournament"),
      "friendly_tournament",
    );
    assert.equal(parseCreateFlowType("americano"), null);
    assert.equal(parseCreateFlowStep("2"), 2);
    assert.equal(parseCreateFlowStep("5"), null);
  });

  it("builds the create and tournament hrefs", () => {
    assert.equal(createGameFlowHref({}), "/dashboard/games/new");
    assert.equal(
      createGameFlowHref({
        groupId: "group-1",
        type: "friendly_game",
        step: 3,
      }),
      "/dashboard/games/new?groupId=group-1&type=friendly_game&step=3",
    );
    assert.equal(
      friendlyTournamentCreateHref("group 1"),
      "/dashboard/games/new?groupId=group+1&type=friendly_tournament",
    );
    assert.equal(
      friendlyTournamentCreateHref(),
      "/dashboard/games/new?type=friendly_tournament",
    );
  });
});

describe("create game type cards", () => {
  it("offers Friendly game and Friendly tournament, both rated", () => {
    assert.deepEqual(
      CREATE_GAME_TYPE_CARDS.map((card) => card.title),
      ["Friendly game", "Friendly tournament"],
    );
    assert.deepEqual(
      CREATE_GAME_TYPE_CARDS.map((card) => card.rating),
      ["Counts for your rating", "Counts for your rating"],
    );
  });
});

describe("where helpers", () => {
  it("keeps the venue copy for lock, catalog, and Soft-archive", () => {
    assert.equal(
      createVenueCopy({
        locked: true,
        groupKind: "club",
        venues: [{ archivedAt: null }],
      }),
      "Venue is this Community’s linked Venue and cannot be changed. Court is optional.",
    );
    assert.equal(
      createVenueCopy({
        locked: true,
        groupKind: "club",
        venues: [{ archivedAt: "2026-01-01" }],
      }),
      "This Community’s linked Venue is Soft-archived. You can still create this Game here. Skip Court.",
    );
    assert.equal(
      createVenueCopy({
        locked: false,
        groupKind: "club",
        venues: [],
      }),
      "This Community has no Venue link. Pick a Venue. Court is optional.",
    );
    assert.equal(
      createVenueCopy({
        locked: false,
        groupKind: "loose",
        venues: [],
      }),
      "Pick a Venue. Court is optional.",
    );
  });

  it("formats the venue card line from court count and city", () => {
    assert.equal(venueCardMeta(4, "Manama"), "4 Courts · Manama");
    assert.equal(venueCardMeta(1, "Riffa"), "1 Court · Riffa");
  });

  it("shows the first groups and keeps a selected group visible", () => {
    const groups = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
    assert.deepEqual(
      visibleCreateGroups(groups, "").map((group) => group.id),
      ["a", "b", "c"],
    );
    assert.deepEqual(
      visibleCreateGroups(groups, "d").map((group) => group.id),
      ["d", "a", "b"],
    );
  });

  it("requires Group and Venue", () => {
    assert.deepEqual(validateFriendlyGameWhere("", "venue-1"), {
      ok: false,
      field: "groupId",
      message: "Pick a Group",
      elementId: "game-group",
    });
    assert.deepEqual(validateFriendlyGameWhere("group-1", ""), {
      ok: false,
      field: "venueId",
      message: "Pick a Venue",
      elementId: "game-venue",
    });
    assert.deepEqual(validateFriendlyGameWhere("group-1", "venue-1"), {
      ok: true,
    });
  });
});

describe("when helpers", () => {
  it("validates only the window fields", () => {
    assert.equal(validateFriendlyGameWhen("", "20:00", "21:30", NOW).ok, false);
    const missingStart = validateFriendlyGameWhen(
      "2026-09-23",
      "",
      "21:30",
      NOW,
    );
    assert.equal(missingStart.ok, false);
    if (!missingStart.ok) {
      assert.equal(missingStart.elementId, "game-window-start");
    }
    const missingFinish = validateFriendlyGameWhen(
      "2026-09-23",
      "20:00",
      "",
      NOW,
    );
    assert.equal(missingFinish.ok, false);
    if (!missingFinish.ok) {
      assert.equal(missingFinish.message, "Pick a finish time");
    }
    const inverted = validateFriendlyGameWhen(
      "2026-09-23",
      "21:00",
      "20:00",
      NOW,
    );
    assert.equal(inverted.ok, false);
    if (!inverted.ok) {
      assert.equal(
        inverted.message,
        "Finish time must be at or after start time",
      );
    }
    assert.equal(
      validateFriendlyGameWhen("2026-09-23", "20:00", "21:30", NOW).ok,
      true,
    );
  });

  it("maps duration chips onto 30-minute finish slots", () => {
    assert.equal(finishSlotForDuration("20:00", 90), "21:30");
    assert.equal(finishSlotForDuration("23:00", 120), null);
    assert.equal(matchingDurationPreset("20:00", "21:00"), 60);
    assert.equal(matchingDurationPreset("20:00", "21:30"), 90);
    assert.equal(matchingDurationPreset("20:00", "22:00"), 120);
    assert.equal(matchingDurationPreset("20:00", "20:30"), null);
  });

  it("builds the header preview from the game-home kickoff", () => {
    const kickoff = friendlyGameKickoff("2026-09-23", "20:00", "21:30");
    assert.equal(kickoff?.time, "8:00");
    assert.equal(kickoff?.trailer, "PM until 9:30");
    assert.match(
      friendlyGamePreviewLine({
        day: "2026-09-23",
        groupName: "Tuesday Crew",
        venueName: "Karbabad Courts",
        courtName: "Court 2",
      }),
      /Karbabad Courts · Court 2/,
    );
  });
});

describe("friendly tournament branch", () => {
  const completeWhen = {
    groupId: "group-1",
    venueId: "venue-1",
    day: "2026-09-25",
    startTime: "09:00",
    finishTime: "15:00",
    matchMinutes: "45",
  };

  it("stops at the first incomplete tournament step", () => {
    assert.equal(
      firstIncompleteFriendlyTournamentStep(
        { ...completeWhen, groupId: "", matchMinutes: "45" },
        NOW,
      ),
      2,
    );
    assert.equal(
      firstIncompleteFriendlyTournamentStep(
        { ...completeWhen, finishTime: "" },
        NOW,
      ),
      3,
    );
    assert.equal(
      firstIncompleteFriendlyTournamentStep(
        { ...completeWhen, matchMinutes: "7" },
        NOW,
      ),
      3,
    );
    assert.equal(firstIncompleteFriendlyTournamentStep(completeWhen, NOW), 4);
  });

  it("pulls an ahead tournament step back to the first gap", () => {
    assert.equal(
      resolveCreateFlowStep({
        type: "friendly_tournament",
        requestedStep: 4,
        draft: { ...completeWhen, venueId: "" },
        now: NOW,
      }),
      2,
    );
    assert.equal(
      resolveCreateFlowStep({
        type: "friendly_tournament",
        requestedStep: 4,
        draft: { ...completeWhen, matchMinutes: "12" },
        now: NOW,
      }),
      3,
    );
  });

  it("accepts game length chips and custom steps of 5", () => {
    assert.equal(parseCreateMatchMinutes("20").ok, true);
    assert.equal(parseCreateMatchMinutes("30").ok, true);
    assert.equal(parseCreateMatchMinutes("45").ok, true);
    assert.equal(parseCreateMatchMinutes("10").ok, true);
    assert.equal(parseCreateMatchMinutes("120").ok, true);
    assert.equal(parseCreateMatchMinutes("15").ok, true);
    assert.equal(parseCreateMatchMinutes("9").ok, false);
    assert.equal(parseCreateMatchMinutes("125").ok, false);
    assert.equal(parseCreateMatchMinutes("47").ok, false);
    assert.equal(parseCreateMatchMinutes("").ok, false);
  });

  it("blocks an empty tournament name", () => {
    const empty = validateTournamentName("   ");
    assert.equal(empty.ok, false);
    if (!empty.ok) {
      assert.equal(empty.field, "name");
      assert.equal(empty.elementId, "tournament-name");
    }
    const named = validateTournamentName("  Friendly tournament · Fri  ");
    assert.equal(named.ok, true);
    if (named.ok) {
      assert.equal(named.name, "Friendly tournament · Fri");
    }
  });

  it("prefills the name from the day without a year", () => {
    const name = friendlyTournamentDefaultName("2026-09-25");
    assert.match(name, /^Friendly tournament · /);
    assert.equal(name.includes("2026"), false);
    assert.match(name, /25/);
  });

  it("describes groups in this flow", () => {
    const even = sizeFriendlyTournament(12, 3);
    assert.equal(even.ok, true);
    if (!even.ok) {
      return;
    }
    assert.equal(
      friendlyTournamentGroupsLine(even.sizing),
      "3 groups of 4, 3 games each",
    );
    const uneven = sizeFriendlyTournament(10, 3);
    assert.equal(uneven.ok, true);
    if (!uneven.ok) {
      return;
    }
    assert.equal(
      friendlyTournamentGroupsLine(uneven.sizing),
      "1 group of 4, 2 groups of 3",
    );
    assert.match(FRIENDLY_TOURNAMENT_UNEVEN_GROUPS, /Groups are uneven/);
    assert.equal(
      createFlowLaterSteps("friendly_tournament")[0]?.title,
      "Where and size",
    );
  });

  it("feeds the schedule line from game length and warns on overrun", () => {
    const start = new Date(2026, 8, 25, 9, 0, 0);
    const finish = new Date(2026, 8, 25, 12, 0, 0);
    const clock = (date: Date) =>
      `${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
    const shortGame = friendlyTournamentSchedule({
      start,
      finish,
      poolMatches: 2,
      courtCount: 1,
      matchMinutes: 20,
      clock,
    });
    assert.equal(
      shortGame.line,
      "2 group Matches, last Match finishes at 9:40",
    );
    assert.equal(shortGame.overruns, false);
    const longGame = friendlyTournamentSchedule({
      start,
      finish,
      poolMatches: 2,
      courtCount: 1,
      matchMinutes: 120,
      clock,
    });
    assert.equal(longGame.overruns, true);
    assert.equal(
      friendlyTournamentScheduleLine(18, "3:00 PM"),
      "18 group Matches, last Match finishes at 3:00 PM",
    );
    const noCourts = friendlyTournamentSchedule({
      start,
      finish,
      poolMatches: 18,
      courtCount: 0,
      matchMinutes: 45,
      clock,
    });
    assert.equal(noCourts.line, null);
    assert.equal(noCourts.overruns, true);
  });

  it("prices a Game team of two at twice the player price", () => {
    assert.equal(gameTeamOfTwoCopy("6.50"), "13.00 BD a Game team of two");
    assert.equal(gameTeamOfTwoCopy("0"), "0.00 BD a Game team of two");
    assert.equal(gameTeamOfTwoCopy(""), null);
    assert.equal(gameTeamOfTwoCopy("nope"), null);
  });

  it("uses the plural court copy for tournaments", () => {
    assert.equal(
      createVenueCopy(
        { locked: false, groupKind: "loose", venues: [] },
        { manyCourts: true },
      ),
      "Pick a Venue. Courts are optional.",
    );
  });
});

describe("level and price", () => {
  it("refuses an inverted level range", () => {
    assert.deepEqual(
      applyLevelBoundChange({ min: "C", max: "C+" }, "min", "B"),
      { min: "B", max: "B" },
    );
    assert.deepEqual(
      applyLevelBoundChange({ min: "B", max: "A" }, "max", "C"),
      { min: "C", max: "C" },
    );
    assert.equal(isLevelBoundDisabled("min", "A", "C"), true);
    assert.equal(isLevelBoundDisabled("max", "C", "B"), true);
    assert.equal(isLevelBoundDisabled("min", "C", "none"), false);
  });

  it("fills price chips with amounts the price parser accepts", () => {
    assert.deepEqual(
      CREATE_FLOW_PRICE_CHIPS.map((chip) => chip.label),
      [
        "Free",
        "3.500",
        "4.250",
        "4.500",
        "5.250",
        "6.000",
        "6.500",
        "7.000",
        "7.500",
      ],
    );
    for (const chip of CREATE_FLOW_PRICE_CHIPS) {
      assert.equal(priceChipIsSelected(chip.value, chip.value), true);
    }
    assert.equal(priceChipIsSelected("3.50", "3.5"), true);
    assert.equal(priceChipIsSelected("0", ""), false);
  });
});
