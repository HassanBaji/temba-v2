import { describe, expect, it } from "vitest";

import {
  footballFormatNote,
  footballSideSizeStep,
  gameEditChangeNote,
  gameEditDraftFrom,
  gameEditPlan,
  gameEditSeasonFix,
  gameEditSectionsFor,
  playersAllowedForSideSize,
  playersCapWaitNote,
  venueLockedLine,
  windowDurationLabel,
  type GameEditDraft,
} from "./game-edit-form";
import type { GroupSeasonData } from "./group-season";

const NOW = new Date("2026-11-02T10:00:00Z");

const football = gameEditSectionsFor({
  format: "friendly_game",
  sport: "football",
  groupId: "g1",
  tournamentRounds: false,
});

const saved: GameEditDraft = {
  customName: "مباراة رقم 174",
  day: "2026-11-02",
  startTime: "19:00",
  finishTime: "20:30",
  price: "2.000",
  playersAllowed: 12,
  sideSize: 6,
  levelMin: "none",
  levelMax: "none",
  roundCount: null,
  seasonId: "s3",
};

const s3: GroupSeasonData = {
  id: "s3",
  name: "Season 3",
  startsOn: "2026-11-01",
  endsOn: "2027-01-31",
  closedAt: null,
};
const s4: GroupSeasonData = {
  id: "s4",
  name: "Season 4",
  startsOn: "2027-02-01",
  endsOn: "2027-04-30",
  closedAt: null,
};

describe("gameEditDraftFrom", () => {
  it("reads the Game into the sheet's fields", () => {
    const draft = gameEditDraftFrom({
      name: "Monday kickabout",
      hasCustomName: true,
      windowStart: new Date("2026-11-02T16:00:00Z"),
      windowEnd: new Date("2026-11-02T17:30:00Z"),
      pricePerPlayerFils: 2000,
      playersAllowed: 12,
      sideSize: 6,
      levelMinTenths: null,
      levelMaxTenths: null,
      roundCount: null,
      seasonId: "s3",
    });
    expect(draft).toEqual({
      customName: "Monday kickabout",
      day: "2026-11-02",
      startTime: "19:00",
      finishTime: "20:30",
      price: "2.000",
      playersAllowed: 12,
      sideSize: 6,
      levelMin: "none",
      levelMax: "none",
      roundCount: null,
      seasonId: "s3",
    });
  });

  it("shows the sections a Game needs", () => {
    expect(football).toEqual({
      name: true,
      window: true,
      caps: true,
      price: true,
      level: false,
      rounds: false,
      season: true,
    });
    expect(
      gameEditSectionsFor({
        format: "friendly_tournament",
        sport: "padel",
        groupId: null,
        tournamentRounds: true,
      }),
    ).toEqual({
      name: false,
      window: true,
      caps: false,
      price: true,
      level: true,
      rounds: true,
      season: false,
    });
  });
});

describe("gameEditPlan", () => {
  it("has nothing to send while the draft matches the Game", () => {
    expect(gameEditPlan(saved, { ...saved }, football)).toEqual({
      ok: true,
      steps: [],
      changed: [],
    });
    expect(gameEditChangeNote(saved, saved, football)).toBe("None yet");
  });

  it("ignores whitespace in the name and trailing zeros in the price", () => {
    const draft = { ...saved, customName: " مباراة رقم 174 ", price: "2" };
    expect(gameEditPlan(saved, draft, football)).toMatchObject({
      ok: true,
      steps: [],
    });
  });

  it("orders the steps name, window, caps, price, then season", () => {
    const draft: GameEditDraft = {
      ...saved,
      customName: "",
      startTime: "20:00",
      finishTime: "21:30",
      playersAllowed: 10,
      sideSize: 5,
      price: "2.500",
      seasonId: null,
    };
    const plan = gameEditPlan(saved, draft, football);
    expect(plan.ok).toBe(true);
    if (!plan.ok) {
      return;
    }
    expect(plan.steps.map((step) => step.kind)).toEqual([
      "name",
      "window",
      "caps",
      "price",
    ]);
    expect(plan.steps[0]).toEqual({ kind: "name", customName: null });
    expect(plan.steps[1]).toMatchObject({
      kind: "window",
      name: "Mon 8:00 PM - 9:30 PM",
      seasonId: null,
    });
    expect(plan.steps[2]).toEqual({
      kind: "caps",
      playersAllowed: 10,
      sideSize: 5,
    });
    expect(plan.steps[3]).toEqual({ kind: "price", pricePerPlayerFils: 2500 });
    expect(gameEditChangeNote(saved, draft, football)).toBe(
      "Name, time changed, players, a-side, price, season unlinked",
    );
  });

  it("sends a season change alone when the window stays", () => {
    const draft = { ...saved, seasonId: null };
    expect(gameEditPlan(saved, draft, football)).toEqual({
      ok: true,
      steps: [{ kind: "season", seasonId: null }],
      changed: ["season"],
    });
    expect(
      gameEditChangeNote({ ...saved, seasonId: null }, saved, football),
    ).toBe("Season linked");
  });

  it("refuses a price it cannot read", () => {
    expect(
      gameEditPlan(saved, { ...saved, price: "2.0000" }, football),
    ).toEqual({
      ok: false,
      field: "price",
      message: "Use up to three decimal places",
    });
  });

  it("refuses an inverted Level range", () => {
    const padel = gameEditSectionsFor({
      format: "friendly_game",
      sport: "padel",
      groupId: "g1",
      tournamentRounds: false,
    });
    const draft = { ...saved, levelMin: "B", levelMax: "D" } as GameEditDraft;
    expect(gameEditPlan(saved, draft, padel)).toMatchObject({
      ok: false,
      field: "level",
    });
  });

  it("refuses a half-picked window", () => {
    expect(gameEditPlan(saved, { ...saved, finishTime: "" }, football)).toEqual(
      {
        ok: false,
        field: "window",
        message: "Pick a day, a start time and a finish time",
      },
    );
  });
});

describe("season fix", () => {
  it("flags the day leaving the linked Season in the change note", () => {
    const draft = { ...saved, day: "2027-02-01" };
    const fix = gameEditSeasonFix(draft, [s3, s4], NOW);
    expect(fix?.moveLabel).toBe("Move to Season 4");
    expect(
      gameEditChangeNote(saved, draft, football, { seasonNeedsFix: true }),
    ).toBe("Day moved. Season needs a fix.");
  });

  it("clears once the link moves with the day", () => {
    const draft = { ...saved, day: "2027-02-01", seasonId: "s4" };
    expect(gameEditSeasonFix(draft, [s3, s4], NOW)).toBeNull();
    expect(gameEditChangeNote(saved, draft, football)).toBe(
      "Day moved, season changed",
    );
  });
});

describe("players and price copy", () => {
  it("describes the pitch and the subs", () => {
    expect(footballFormatNote(6, 12)).toBe("6-a-side, 12 on the pitch");
    expect(footballFormatNote(6, 13)).toBe("6-a-side, 12 on the pitch, 1 sub");
    expect(footballFormatNote(5, 14)).toBe("5-a-side, 10 on the pitch, 4 subs");
  });

  it("counts who moves to the waiting list", () => {
    expect(playersCapWaitNote(12, 9)).toBe(
      "Everyone who joined keeps their spot.",
    );
    expect(playersCapWaitNote(7, 9)).toBe(
      "2 of the 9 joined move to the waiting list, latest to join first.",
    );
  });

  it("steps the side size through the allowed sizes", () => {
    expect(footballSideSizeStep(9, 1)).toBe(11);
    expect(footballSideSizeStep(11, 1)).toBeNull();
    expect(footballSideSizeStep(5, -1)).toBeNull();
    expect(footballSideSizeStep(6, -1)).toBe(5);
  });

  it("raises players allowed to two full sides when the side grows", () => {
    expect(playersAllowedForSideSize(12, 7)).toBe(14);
    expect(playersAllowedForSideSize(12, 5)).toBe(12);
    expect(playersAllowedForSideSize(null, 6)).toBe(12);
  });

  it("formats the duration and the venue line", () => {
    expect(windowDurationLabel("2026-11-02", "19:00", "20:30")).toBe("90 min");
    expect(windowDurationLabel("2026-11-02", "19:00", "")).toBeNull();
    expect(venueLockedLine("Karbabad Turf", "Pitch 2")).toBe(
      "Karbabad Turf, Pitch 2. Venue can't change.",
    );
    expect(venueLockedLine("Karbabad Turf", null)).toBe(
      "Karbabad Turf. Venue can't change.",
    );
  });
});
