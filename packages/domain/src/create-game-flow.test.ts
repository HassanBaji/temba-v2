import { zonedParts } from "@repo/domain/product-timezone";
import { bahrainDate } from "@repo/domain/bahrain-date.test-support";
import assert from "node:assert/strict";
import { isolate } from "@repo/i18n/bidi";
import { messagesFor } from "@repo/i18n/messages";
import { describe, it } from "vitest";

import { sizeFriendlyTournament } from "@repo/domain/tournament-sizing";
import {
  friendlyTournamentCourtsLabel,
  friendlyTournamentPreviewDetail,
  createFlowPriceChips,
  createGameTypeCards,
  createRatingChoice,
  createRatingChoiceShown,
  createLevelRangeShown,
  applyLevelBoundChange,
  createFlowFirstStep,
  createFlowLaterSteps,
  createFlowSeatsLabel,
  changeFootballPlayersAllowed,
  changeFootballSideSize,
  footballSideSizeStep,
  splitCostAcrossPlayers,
  createFlowStepForField,
  createGameFlowTarget,
  createVenueCopy,
  finishSlotForDuration,
  firstIncompleteFriendlyGameStep,
  firstIncompleteFriendlyTournamentStep,
  friendlyGameKickoff,
  friendlyGamePreviewLines,
  friendlyTournamentCreateTarget,
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
  venueMatchesQuery,
  visibleCreateCourts,
  visibleCreateGroups,
  DEFAULT_TOURNAMENT_SHAPE,
  tournamentShapeOptions,
  friendlyTournamentFormatLabel,
  changeCreateDay,
  changeCreateGroup,
  changeCreateVenue,
  toggleCreateCourt,
  reconcileWindowForDay,
  resetCreateBranch,
  selectDurationFinish,
  selectStartSlot,
} from "./create-game-flow";
import { initialCreateGameDraft } from "./create-game-draft";

const NOW = bahrainDate(2026, 8, 22, 12, 0, 0);

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
    assert.equal(createFlowStepForField("pricePerPlayerFils"), 4);
    assert.equal(createFlowStepForField("levelMinTenths"), 4);
    assert.equal(createFlowStepForField("levelMaxTenths"), 4);
    assert.equal(createFlowStepForField("name"), 4);
  });

  it("sends tournament size and schedule fields to their steps", () => {
    assert.equal(createFlowStepForField("teamCount"), 2);
    assert.equal(createFlowStepForField("courtIds"), 2);
    assert.equal(createFlowStepForField("poolCount"), 3);
    assert.equal(createFlowStepForField("roundCount"), 3);
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

  it("builds the create and tournament targets", () => {
    assert.deepEqual(createGameFlowTarget({}), {
      groupId: null,
      type: null,
      step: null,
    });
    assert.deepEqual(
      createGameFlowTarget({
        groupId: "group-1",
        type: "friendly_game",
        step: 3,
      }),
      { groupId: "group-1", type: "friendly_game", step: 3 },
    );
    assert.deepEqual(friendlyTournamentCreateTarget("group 1"), {
      groupId: "group 1",
      type: "friendly_tournament",
      step: null,
    });
    assert.deepEqual(friendlyTournamentCreateTarget(), {
      groupId: null,
      type: "friendly_tournament",
      step: null,
    });
  });
});

describe("create game type cards", () => {
  it("offers Friendly game and Friendly tournament, both rated", () => {
    assert.deepEqual(
      createGameTypeCards("en").map((card) => card.title),
      ["Friendly game", "Friendly tournament"],
    );
    assert.deepEqual(
      createGameTypeCards("en").map((card) => card.rating),
      ["Counts for your rating", "Counts for your rating"],
    );
  });
});

describe("where helpers", () => {
  it("keeps the venue copy for lock, catalog, and Soft-archive", () => {
    assert.equal(
      createVenueCopy(
        {
          locked: true,
          groupKind: "club",
          venues: [{ archivedAt: null }],
        },
        "en",
      ),
      "Venue is this Group’s linked Venue and cannot be changed. Court is optional.",
    );
    assert.equal(
      createVenueCopy(
        {
          locked: true,
          groupKind: "club",
          venues: [{ archivedAt: "2026-01-01" }],
        },
        "en",
      ),
      "This Group’s Venue is Soft-archived. You can still create this Game here. Skip Court.",
    );
    assert.equal(
      createVenueCopy(
        {
          locked: false,
          groupKind: "loose",
          venues: [],
        },
        "en",
      ),
      "Pick a Venue. Court is optional.",
    );
  });

  it("formats the venue card line from court count and city", () => {
    assert.equal(venueCardMeta(4, "Manama", "en"), "4 Courts · Manama");
    assert.equal(venueCardMeta(1, "Riffa", "en"), "1 Court · Riffa");
  });

  it("matches a venue search against name and city", () => {
    const venue = { name: "Karbabad Courts", city: "Manama" };
    assert.equal(venueMatchesQuery(venue, ""), true);
    assert.equal(venueMatchesQuery(venue, "  karbabad "), true);
    assert.equal(venueMatchesQuery(venue, "manama"), true);
    assert.equal(venueMatchesQuery(venue, "riffa"), false);
  });

  it("shows recent booking courts, or the first three", () => {
    const courts = [
      { id: "a" },
      { id: "b" },
      { id: "c" },
      { id: "d" },
      { id: "e" },
    ];
    assert.deepEqual(
      visibleCreateCourts(courts, ["e", "b", "a", "missing"]).map(
        (court) => court.id,
      ),
      ["e", "b", "a"],
    );
    assert.deepEqual(
      visibleCreateCourts(courts, []).map((court) => court.id),
      ["a", "b", "c"],
    );
    assert.deepEqual(
      visibleCreateCourts(courts, [], ["e"]).map((court) => court.id),
      ["a", "b", "c", "e"],
    );
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
    assert.deepEqual(validateFriendlyGameWhere("", "venue-1", "en"), {
      ok: false,
      field: "groupId",
      message: "Pick a Group",
      elementId: "game-group",
    });
    assert.deepEqual(validateFriendlyGameWhere("group-1", "", "en"), {
      ok: false,
      field: "venueId",
      message: "Pick a Venue",
      elementId: "game-venue",
    });
    assert.deepEqual(validateFriendlyGameWhere("group-1", "venue-1", "en"), {
      ok: true,
    });
  });
});

describe("when helpers", () => {
  it("validates only the window fields", () => {
    assert.equal(
      validateFriendlyGameWhen("", "20:00", "21:30", "en", NOW).ok,
      false,
    );
    const missingStart = validateFriendlyGameWhen(
      "2026-09-23",
      "",
      "21:30",
      "en",
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
      "en",
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
      "en",
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
      validateFriendlyGameWhen("2026-09-23", "20:00", "21:30", "en", NOW).ok,
      true,
    );
  });

  it("lets a Game run past midnight and start at the closing midnight", () => {
    const lateGame = validateFriendlyGameWhen(
      "2026-09-23",
      "22:30",
      "24:00",
      "en",
      NOW,
    );
    assert.equal(lateGame.ok, true);
    if (lateGame.ok) {
      assert.equal(
        lateGame.windowStart.toISOString(),
        bahrainDate(2026, 8, 23, 22, 30).toISOString(),
      );
      assert.equal(
        lateGame.windowEnd.toISOString(),
        bahrainDate(2026, 8, 24, 0, 0).toISOString(),
      );
    }
    const midnightGame = validateFriendlyGameWhen(
      "2026-09-23",
      "24:00",
      "25:30",
      "en",
      NOW,
    );
    assert.equal(midnightGame.ok, true);
    if (midnightGame.ok) {
      assert.equal(
        midnightGame.windowEnd.toISOString(),
        bahrainDate(2026, 8, 24, 1, 30).toISOString(),
      );
    }
    const tooLate = validateFriendlyGameWhen(
      "2026-09-23",
      "24:00",
      "27:30",
      "en",
      NOW,
    );
    assert.equal(tooLate.ok, false);
    if (!tooLate.ok) {
      assert.equal(tooLate.message, "Pick a finish time");
    }
    assert.equal(
      validateFriendlyGameWhen("2026-09-23", "00:00", "01:00", "en", NOW).ok,
      false,
    );
  });

  it("maps duration chips onto 30-minute finish slots", () => {
    assert.equal(finishSlotForDuration("20:00", 90), "21:30");
    assert.equal(finishSlotForDuration("23:00", 120), "25:00");
    assert.equal(finishSlotForDuration("24:00", 90), "25:30");
    assert.equal(finishSlotForDuration("24:00", 240), null);
    assert.equal(finishSlotForDuration("00:00", 60), null);
    assert.equal(matchingDurationPreset("22:30", "24:00"), 90);
    assert.equal(matchingDurationPreset("24:00", "25:30"), 90);
    assert.equal(matchingDurationPreset("20:00", "21:00"), 60);
    assert.equal(matchingDurationPreset("20:00", "21:30"), 90);
    assert.equal(matchingDurationPreset("20:00", "22:00"), 120);
    assert.equal(matchingDurationPreset("20:00", "20:30"), null);
  });

  it("builds the header preview from the game-home kickoff", () => {
    const kickoff = friendlyGameKickoff("2026-09-23", "20:00", "21:30", "en");
    assert.equal(kickoff?.time, "8:00");
    assert.equal(kickoff?.trailer, "PM until 9:30");
    const lines = friendlyGamePreviewLines({
      day: "2026-09-23",
      groupName: "Tuesday Crew",
      venueName: "Karbabad Courts",
      courtName: "Court 2",
      locale: "en",
    });
    assert.equal(lines.length, 2);
    assert.equal(lines[1], "Karbabad Courts, Court 2");
  });
});

describe("friendly tournament Courts", () => {
  it("joins Court names with the list separator", () => {
    assert.equal(
      friendlyTournamentCourtsLabel(["Court 1", "Court 2"], "en"),
      "Court 1, Court 2",
    );
    assert.equal(
      friendlyTournamentCourtsLabel(["Court 1", "Court 2"], "ar"),
      `${isolate("Court 1")}، ${isolate("Court 2")}`,
    );
    assert.equal(
      friendlyTournamentPreviewDetail({
        day: "",
        venueName: "Padel Hub",
        courtNames: ["Court 1", "Court 2"],
        locale: "en",
      }),
      "Padel Hub · Court 1, Court 2",
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
    assert.equal(parseCreateMatchMinutes("20", "en").ok, true);
    assert.equal(parseCreateMatchMinutes("30", "en").ok, true);
    assert.equal(parseCreateMatchMinutes("45", "en").ok, true);
    assert.equal(parseCreateMatchMinutes("10", "en").ok, true);
    assert.equal(parseCreateMatchMinutes("120", "en").ok, true);
    assert.equal(parseCreateMatchMinutes("15", "en").ok, true);
    assert.equal(parseCreateMatchMinutes("9", "en").ok, false);
    assert.equal(parseCreateMatchMinutes("125", "en").ok, false);
    assert.equal(parseCreateMatchMinutes("47", "en").ok, false);
    assert.equal(parseCreateMatchMinutes("", "en").ok, false);
  });

  it("blocks an empty tournament name", () => {
    const empty = validateTournamentName("   ", "en");
    assert.equal(empty.ok, false);
    if (!empty.ok) {
      assert.equal(empty.field, "name");
      assert.equal(empty.elementId, "tournament-name");
    }
    const named = validateTournamentName("  Friendly tournament · Fri  ", "en");
    assert.equal(named.ok, true);
    if (named.ok) {
      assert.equal(named.name, "Friendly tournament · Fri");
    }
  });

  it("prefills the name from the day without a year", () => {
    const name = friendlyTournamentDefaultName("2026-09-25", "en");
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
      friendlyTournamentGroupsLine(even.sizing, "en"),
      "3 groups of 4",
    );
    const uneven = sizeFriendlyTournament(10, 3);
    assert.equal(uneven.ok, true);
    if (!uneven.ok) {
      return;
    }
    assert.equal(
      friendlyTournamentGroupsLine(uneven.sizing, "en"),
      "1 group of 4, 2 groups of 3",
    );
    const single = sizeFriendlyTournament(4, 1);
    assert.equal(single.ok, true);
    if (!single.ok) {
      return;
    }
    assert.equal(
      friendlyTournamentGroupsLine(single.sizing, "en"),
      "1 group of 4",
    );
    assert.match(
      messagesFor("en").createGame.unevenGroups,
      /Groups are uneven/,
    );
    assert.equal(
      createFlowLaterSteps("friendly_tournament", "en")[0]?.title,
      "Where and size",
    );
  });

  it("offers Groups only first, then Knockout only and Groups then knockout", () => {
    assert.deepEqual(
      tournamentShapeOptions("en").map((option) => option.id),
      ["groups_only", "knockout_only", "groups_then_knockout"],
    );
    assert.equal(
      tournamentShapeOptions("en")[2]?.title,
      "Groups, then knockout",
    );
    assert.equal(
      tournamentShapeOptions("en")[2]?.description,
      "The best in each group carry on",
    );
    assert.equal(createFlowStepForField("qualifiersPerPool"), 3);
    assert.equal(DEFAULT_TOURNAMENT_SHAPE, "groups_only");
    assert.equal(
      tournamentShapeOptions("en")[1]?.description,
      "Lose once and you are done for the day",
    );
    assert.equal(createFlowStepForField("tournamentShape"), 3);
  });

  it("feeds the schedule line from game length and warns on overrun", () => {
    const start = bahrainDate(2026, 8, 25, 9, 0, 0);
    const finish = bahrainDate(2026, 8, 25, 12, 0, 0);
    const clock = (date: Date) =>
      `${zonedParts(date).hour}:${String(zonedParts(date).minute).padStart(2, "0")}`;
    const shortGame = friendlyTournamentSchedule({
      start,
      finish,
      roundMatches: [1, 1],
      courtCount: 1,
      matchMinutes: 20,
      clock,
      locale: "en",
    });
    assert.equal(
      shortGame.line,
      "2 group Matches, last Match finishes at 9:40",
    );
    assert.equal(shortGame.overruns, false);
    const longGame = friendlyTournamentSchedule({
      start,
      finish,
      roundMatches: [1, 1],
      courtCount: 1,
      matchMinutes: 120,
      clock,
      locale: "en",
    });
    assert.equal(longGame.overruns, true);
    const knockout = friendlyTournamentSchedule({
      start,
      finish,
      roundMatches: [2, 2, 1],
      courtCount: 2,
      matchMinutes: 45,
      clock,
      locale: "en",
      knockoutOnly: true,
    });
    assert.equal(
      knockout.line,
      "5 knockout Matches, last Match finishes at 11:15",
    );
    assert.equal(knockout.overruns, false);
    assert.equal(
      friendlyTournamentSchedule({
        start,
        finish,
        roundMatches: [2, 2, 1],
        courtCount: 1,
        matchMinutes: 45,
        clock,
        locale: "en",
        knockoutOnly: true,
      }).overruns,
      true,
    );
    const groupsThenKnockout = friendlyTournamentSchedule({
      start,
      finish,
      roundMatches: [2, 2],
      courtCount: 2,
      matchMinutes: 45,
      clock,
      locale: "en",
      knockoutRoundMatches: [1, 1],
    });
    assert.equal(
      groupsThenKnockout.line,
      "4 group Matches and 2 knockout Matches, last Match finishes at 12:00",
    );
    assert.equal(groupsThenKnockout.overruns, false);
    assert.equal(
      friendlyTournamentSchedule({
        start,
        finish,
        roundMatches: [2, 2],
        courtCount: 2,
        matchMinutes: 45,
        clock,
        locale: "en",
        knockoutRoundMatches: [1, 1, 1],
      }).overruns,
      true,
    );
    assert.equal(
      friendlyTournamentScheduleLine(18, "3:00 PM", "en"),
      "18 group Matches, last Match finishes at 3:00 PM",
    );
    const noCourts = friendlyTournamentSchedule({
      start,
      finish,
      roundMatches: [6, 6, 6],
      courtCount: 0,
      matchMinutes: 45,
      clock,
      locale: "en",
    });
    assert.equal(noCourts.line, null);
    assert.equal(noCourts.overruns, true);
  });

  it("prices a Game team of two at twice the player price", () => {
    assert.equal(
      gameTeamOfTwoCopy("6.50", "en"),
      "13.000 BD a Game team of two",
    );
    assert.equal(gameTeamOfTwoCopy("0", "en"), "0.000 BD a Game team of two");
    assert.equal(gameTeamOfTwoCopy("", "en"), null);
    assert.equal(gameTeamOfTwoCopy("nope", "en"), null);
  });

  it("uses the plural court copy for tournaments", () => {
    assert.equal(
      createVenueCopy({ locked: false, groupKind: "loose", venues: [] }, "en", {
        manyCourts: true,
      }),
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
      createFlowPriceChips("en").map((chip) => chip.label),
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
    for (const chip of createFlowPriceChips("en")) {
      assert.equal(priceChipIsSelected(chip.value, chip.value), true);
    }
    assert.equal(priceChipIsSelected("3.50", "3.5"), true);
    assert.equal(priceChipIsSelected("0", ""), false);
  });
});

describe("friendlyTournamentFormatLabel", () => {
  it("names the groups, and the knockout after them when the shape has one", () => {
    assert.equal(friendlyTournamentFormatLabel(1, "en"), "1 group");
    assert.equal(friendlyTournamentFormatLabel(3, "en"), "3 groups");
    assert.equal(
      friendlyTournamentFormatLabel(3, "en", true),
      "3 groups, then knockout",
    );
    assert.equal(
      friendlyTournamentFormatLabel(1, "en", true),
      "1 group, then knockout",
    );
  });
});

describe("window reconciliation", () => {
  it("clears both times when the start is no longer offered on the new day", () => {
    assert.deepEqual(
      reconcileWindowForDay(
        { startTime: "00:00", finishTime: "01:00" },
        "2026-08-22",
        NOW,
        "allowed",
      ),
      { startTime: "", finishTime: "" },
    );
  });

  it("clears only a finish before the start, or at it when blocked", () => {
    const current = { startTime: "20:00", finishTime: "20:00" };
    assert.deepEqual(
      reconcileWindowForDay(current, "2026-09-23", NOW, "allowed"),
      current,
    );
    assert.deepEqual(
      reconcileWindowForDay(current, "2026-09-23", NOW, "blocked"),
      { startTime: "20:00", finishTime: "" },
    );
  });

  it("keeps the duration preset when the start moves", () => {
    assert.deepEqual(
      selectStartSlot(
        { startTime: "20:00", finishTime: "21:30" },
        "19:00",
        true,
      ),
      { startTime: "19:00", finishTime: "20:30" },
    );
    assert.deepEqual(
      selectStartSlot(
        { startTime: "20:00", finishTime: "21:30" },
        "22:00",
        false,
      ),
      { startTime: "22:00", finishTime: "" },
    );
    assert.equal(selectDurationFinish("20:00", 90), "21:30");
    assert.equal(selectDurationFinish("20:00", 7), "");
  });
});

describe("draft helpers", () => {
  it("resets the tournament fields when switching to a Friendly game", () => {
    const draft = {
      ...initialCreateGameDraft(NOW, "en"),
      courtIds: ["court-1"],
      teamCount: 8,
      isPublic: true,
      allowSoloRegister: false,
      nameTouched: true,
      name: "Mine",
    };
    const reset = resetCreateBranch(draft, "friendly_game", "en");
    assert.deepEqual(reset.courtIds, []);
    assert.equal(reset.isPublic, false);
    assert.equal(reset.allowSoloRegister, true);
    assert.equal(reset.nameTouched, false);
    assert.equal(reset.name, friendlyTournamentDefaultName(draft.day, "en"));
  });

  it("clears the Court when switching to a tournament", () => {
    const draft = { ...initialCreateGameDraft(NOW, "en"), courtId: "court-1" };
    assert.equal(
      resetCreateBranch(draft, "friendly_tournament", "en").courtId,
      "none",
    );
  });

  it("renames to the day only until the name is touched", () => {
    const base = initialCreateGameDraft(NOW, "en");
    assert.equal(
      changeCreateDay(base, "2026-09-24", "en").name,
      friendlyTournamentDefaultName("2026-09-24", "en"),
    );
    assert.equal(
      changeCreateDay(
        { ...base, nameTouched: true, name: "Mine" },
        "2026-09-24",
        "en",
      ).name,
      "Mine",
    );
  });
});

describe("where helpers", () => {
  const picked = {
    ...initialCreateGameDraft(NOW, "en"),
    groupId: "g1",
    venueId: "v1",
    courtId: "c1",
    courtIds: ["c1", "c2"],
  };

  it("clears the Venue and Courts when the Group changes", () => {
    const next = changeCreateGroup(picked, "g2");
    assert.equal(next.groupId, "g2");
    assert.equal(next.venueId, "");
    assert.equal(next.courtId, "none");
    assert.deepEqual(next.courtIds, []);
  });

  it("clears a public choice when the Group changes", () => {
    const next = changeCreateGroup({ ...picked, isPublic: true }, "g2");
    assert.equal(next.isPublic, false);
  });

  it("clears the Courts only when the Venue actually changes", () => {
    assert.equal(changeCreateVenue(picked, "v1"), picked);
    const next = changeCreateVenue(picked, "v2");
    assert.equal(next.venueId, "v2");
    assert.deepEqual(next.courtIds, []);
  });

  it("toggles a Court", () => {
    assert.deepEqual(toggleCreateCourt(["a"], "b"), ["a", "b"]);
    assert.deepEqual(toggleCreateCourt(["a", "b"], "a"), ["b"]);
  });
});

describe("football create flow", () => {
  it("skips the Type step and ends on Size and price", () => {
    assert.equal(createFlowFirstStep("football"), 2);
    assert.equal(createFlowFirstStep("padel"), 1);
    assert.deepEqual(
      createFlowLaterSteps("friendly_tournament", "en", "football").map(
        (item) => item.title,
      ),
      ["Where", "When", "Size and price"],
    );
    assert.equal(
      createFlowLaterSteps(null, "en", "padel")[2]?.title,
      "Level and price",
    );
  });

  it("says the size instead of four open seats", () => {
    assert.equal(
      createFlowSeatsLabel(
        "football",
        { sideSize: 5, playersAllowed: 12 },
        "en",
      ),
      "5-a-side · 12 players",
    );
    assert.equal(
      createFlowSeatsLabel("padel", { sideSize: 5, playersAllowed: 10 }, "en"),
      "4 open seats",
    );
  });

  it("moves the cap with the side size while it sits at the minimum", () => {
    const draft = { sideSize: 5, playersAllowed: 10 };
    assert.deepEqual(changeFootballSideSize(draft, 7), {
      sideSize: 7,
      playersAllowed: 14,
    });
  });

  it("keeps a chosen cap that still fits the new side size", () => {
    assert.deepEqual(
      changeFootballSideSize({ sideSize: 5, playersAllowed: 16 }, 7),
      { sideSize: 7, playersAllowed: 16 },
    );
    assert.deepEqual(
      changeFootballSideSize({ sideSize: 5, playersAllowed: 12 }, 7),
      { sideSize: 7, playersAllowed: 14 },
    );
  });

  it("follows the minimum down and ignores an unknown side size", () => {
    assert.deepEqual(
      changeFootballSideSize({ sideSize: 11, playersAllowed: 22 }, 5),
      { sideSize: 5, playersAllowed: 10 },
    );
    const draft = { sideSize: 5, playersAllowed: 10 };
    assert.equal(changeFootballSideSize(draft, 4), draft);
    assert.equal(changeFootballPlayersAllowed(draft, 99).playersAllowed, 40);
    assert.equal(changeFootballPlayersAllowed(draft, 3).playersAllowed, 10);
    assert.equal(changeFootballPlayersAllowed(draft, 13).playersAllowed, 13);
  });

  it("steps the side size through the allowed list", () => {
    assert.equal(footballSideSizeStep(5, 1), 6);
    assert.equal(footballSideSizeStep(9, 1), 11);
    assert.equal(footballSideSizeStep(11, 1), 11);
    assert.equal(footballSideSizeStep(5, -1), 5);
  });

  it("splits a price across the chosen cap and rounds up", () => {
    assert.equal(splitCostAcrossPlayers(40000, 4), 10000);
    assert.equal(splitCostAcrossPlayers(40000, 14), 2858);
    assert.equal(splitCostAcrossPlayers(40000, 0), 40000);
  });

  it("says pitch for a football Venue", () => {
    assert.equal(
      venueCardMeta(2, "Manama", "en", "football"),
      "2 pitches · Manama",
    );
    assert.equal(
      venueCardMeta(1, "Manama", "en", "football"),
      "1 pitch · Manama",
    );
    assert.match(
      createVenueCopy(
        { locked: true, groupKind: "club", venues: [{ archivedAt: null }] },
        "en",
        { sport: "football" },
      ),
      /Pitch is optional/,
    );
    assert.match(
      createVenueCopy(
        {
          locked: true,
          groupKind: "club",
          venues: [{ archivedAt: new Date() }],
        },
        "en",
        { sport: "football" },
      ),
      /Skip pitch\./,
    );
  });
});

describe("Rating choice", () => {
  it("shows for any Game on a Group", () => {
    assert.equal(
      createRatingChoiceShown({ sport: "padel", hasGroup: true }),
      true,
    );
    assert.equal(
      createRatingChoiceShown({
        sport: "football",
        hasGroup: true,
        groupVerified: false,
      }),
      true,
    );
    assert.equal(
      createRatingChoiceShown({
        sport: "football",
        hasGroup: true,
        groupVerified: true,
      }),
      true,
    );
    assert.equal(
      createRatingChoiceShown({ sport: "football", hasGroup: false }),
      false,
    );
    assert.equal(
      createRatingChoiceShown({ sport: "padel", hasGroup: false }),
      false,
    );
  });

  it("offers a Level range on padel, and on football only when the Game counts for Temba Level", () => {
    const on = { hasGroup: true, rated: true };
    assert.equal(
      createLevelRangeShown({ ...on, sport: "padel", groupVerified: false }),
      true,
    );
    assert.equal(
      createLevelRangeShown({ ...on, sport: "football", groupVerified: true }),
      true,
    );
    assert.equal(
      createLevelRangeShown({ ...on, sport: "football", groupVerified: false }),
      false,
    );
    assert.equal(
      createLevelRangeShown({
        ...on,
        sport: "football",
        groupVerified: true,
        rated: false,
      }),
      false,
    );
  });

  it("describes Rated by the Group's scope and notes the picked one", () => {
    const verified = createRatingChoice({
      groupVerified: true,
      rated: true,
      locale: "en",
    });
    assert.equal(verified.title, "Rating");
    assert.equal(verified.scope, "temba");
    assert.equal(verified.scopeLabel, "Counts for Temba rating");
    assert.deepEqual(
      verified.options.map((option) => [
        option.rated,
        option.label,
        option.description,
      ]),
      [
        [true, "Rated", "Counts for Temba rating"],
        [false, "Unrated", null],
      ],
    );
    assert.equal(verified.note, messagesFor("en").you.ratingScope.temba_note);

    const loose = createRatingChoice({
      groupVerified: false,
      rated: true,
      locale: "en",
    });
    assert.equal(loose.scope, "group");
    assert.equal(loose.options[0]?.description, "Counts for group rating");
    assert.equal(loose.note, messagesFor("en").you.ratingScope.group_note);

    const unrated = createRatingChoice({
      groupVerified: true,
      rated: false,
      locale: "en",
    });
    assert.equal(unrated.scope, "unrated");
    assert.equal(unrated.scopeLabel, "Unrated");
    assert.equal(unrated.note, messagesFor("en").you.ratingScope.unrated_note);
  });

  it("describes Rated on a tier Group as the group tier", () => {
    const choice = createRatingChoice({
      groupVerified: false,
      rated: true,
      locale: "en",
      sport: "football",
    });
    assert.equal(choice.scope, "group");
    assert.equal(choice.scopeLabel, "Counts for group tier");
    assert.equal(choice.options[0]?.description, "Counts for group tier");
    assert.equal(choice.note, messagesFor("en").rating.scope.groupNote);
  });

  it("describes Rated on a Verified football Group as the Temba Level", () => {
    const choice = createRatingChoice({
      groupVerified: true,
      rated: true,
      locale: "en",
      sport: "football",
    });
    assert.equal(choice.scope, "temba");
    assert.equal(choice.scopeLabel, "Counts for Temba Level");
    assert.equal(choice.options[0]?.description, "Counts for Temba Level");
    assert.equal(choice.note, messagesFor("en").rating.scope.tembaNote);
  });

  it("reads in Arabic", () => {
    const choice = createRatingChoice({
      groupVerified: false,
      rated: true,
      locale: "ar",
    });
    assert.equal(choice.title, messagesFor("ar").you.ratingScope.title);
    assert.equal(choice.scopeLabel, messagesFor("ar").you.ratingScope.group);
  });
});

describe("Arabic copy", () => {
  it("writes the create flow copy in Arabic", () => {
    assert.equal(
      createVenueCopy({ locked: false, groupKind: "loose", venues: [] }, "ar", {
        sport: "football",
      }),
      "اختر ناديًا. الملعب اختياري.",
    );
    assert.equal(
      friendlyTournamentFormatLabel(3, "ar", true),
      "3 مجموعات، ثم خروج المغلوب",
    );
    assert.equal(createGameTypeCards("ar")[0]?.title, "مباراة ودية");
    assert.equal(
      createFlowSeatsLabel("padel", { sideSize: 5, playersAllowed: 10 }, "ar"),
      "4 أماكن شاغرة",
    );
    assert.equal(
      createFlowSeatsLabel(
        "football",
        { sideSize: 5, playersAllowed: 10 },
        "ar",
      ),
      "5 ضد 5، حتى 10 لاعبين",
    );
    assert.equal(
      friendlyGameKickoff("2026-11-04", "14:00", "15:30", "ar")?.trailer,
      "م حتى 3:30 م",
    );
    assert.deepEqual(
      friendlyGamePreviewLines({
        day: "2026-11-04",
        groupName: null,
        venueName: "نادي الأهلي",
        courtName: "الملعب 2",
        locale: "ar",
      }).slice(1),
      ["نادي الأهلي، الملعب 2"],
    );
    assert.equal(venueCardMeta(2, "المنامة", "ar"), "ملعبان · المنامة");
    assert.equal(
      friendlyTournamentScheduleLine(2, "3:00 م", "ar"),
      "مباراتا مجموعات، تنتهي آخر مباراة في 3:00 م",
    );
    assert.equal(
      gameTeamOfTwoCopy("6.50", "ar"),
      "13.000 د.ب لفريق من لاعبَين",
    );
  });
});
