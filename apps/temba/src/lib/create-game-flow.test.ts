import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  CREATE_FLOW_PRICE_CHIPS,
  CREATE_GAME_TYPE_CARDS,
  applyLevelBoundChange,
  createFlowStepForField,
  createGameFlowHref,
  finishSlotForDuration,
  firstIncompleteFriendlyGameStep,
  friendlyGameKickoff,
  friendlyGamePreviewLine,
  friendlyTournamentCreateHref,
  isLevelBoundDisabled,
  matchingDurationPreset,
  parseCreateFlowStep,
  parseCreateFlowType,
  priceChipIsSelected,
  resolveCreateFlowStep,
  validateFriendlyGameWhen,
  validateFriendlyGameWhere,
  venueCardMeta,
  visibleCreateGroups,
  createVenueCopy,
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
  it("opens step 1 until a Friendly game type is chosen", () => {
    assert.equal(
      resolveCreateFlowStep({
        type: null,
        requestedStep: 4,
        draft: emptyDraft,
        now: NOW,
      }),
      1,
    );
    assert.equal(
      resolveCreateFlowStep({
        type: "friendly_tournament",
        requestedStep: null,
        draft: emptyDraft,
        now: NOW,
      }),
      1,
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
      "/dashboard/games/new-tournament?groupId=group+1",
    );
    assert.equal(
      friendlyTournamentCreateHref(),
      "/dashboard/games/new-tournament",
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
