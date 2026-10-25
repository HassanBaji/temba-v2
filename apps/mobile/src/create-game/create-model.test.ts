import { createCreateGameFixtures } from "@repo/domain/create-game-fixtures";
import { bahrainDate } from "@repo/domain/bahrain-date.test-support";
import { LEVEL_RANGE_INVERTED_MESSAGE } from "@repo/domain/level-range";
import { describe, expect, it } from "vitest";

import {
  advance,
  continueBlocked,
  createReducer,
  initialCreateState,
  serverFailure,
  submitRequest,
  type CreateState,
} from "./create-model";

const NOW = bahrainDate(2026, 9, 4, 12, 0, 0);
const fixtures = createCreateGameFixtures(NOW);
const context = { now: NOW, venuesPending: false, emptyCatalog: false };

function stateAt(
  step: CreateState["step"],
  type: CreateState["type"],
  draft: CreateState["draft"],
): CreateState {
  return {
    sport: "padel",
    type,
    step,
    draft: { ...draft, day: "2026-10-09" },
  };
}

describe("createReducer", () => {
  it("starts on the type step without a type", () => {
    const state = initialCreateState(NOW, "group-friends");
    expect(state.step).toBe(1);
    expect(state.draft.groupId).toBe("group-friends");
  });

  it("resets the other branch when the type changes", () => {
    const game = createReducer(initialCreateState(NOW), {
      kind: "selectType",
      type: "friendly_game",
    });
    const picked = createReducer(game, { kind: "toggleCourt", courtId: "c1" });
    const tournament = createReducer(picked, {
      kind: "selectType",
      type: "friendly_tournament",
    });
    expect(tournament.draft.courtId).toBe("none");
    expect(tournament.draft.courtIds).toEqual(["c1"]);
    const back = createReducer(tournament, {
      kind: "selectType",
      type: "friendly_game",
    });
    expect(back.draft.courtIds).toEqual([]);
  });

  it("clears the Venue and Courts when the Group changes", () => {
    const state = stateAt(2, "friendly_game", fixtures.drafts.tournamentWhere);
    const next = createReducer(state, { kind: "setGroup", groupId: "other" });
    expect(next.draft.venueId).toBe("");
    expect(next.draft.courtIds).toEqual([]);
  });

  it("keeps the picked duration when the start moves in a Friendly game", () => {
    const state = stateAt(3, "friendly_game", fixtures.drafts.gameWhenFilled);
    const next = createReducer(state, { kind: "setStart", slot: "19:00" });
    expect(next.draft.startTime).toBe("19:00");
    expect(next.draft.finishTime).toBe("20:30");
  });

  it("clamps the groups count and qualifiers when the Game team count changes", () => {
    const state = stateAt(
      3,
      "friendly_tournament",
      fixtures.drafts.tournamentGroupsThenKnockout,
    );
    const next = createReducer(state, { kind: "setTeamCount", teamCount: 4 });
    expect(next.draft.teamCount).toBe(4);
    expect(next.draft.poolCount).toBeLessThanOrEqual(2);
    expect(next.draft.roundCount).toBeNull();
  });

  it("keeps the Level range ordered and marks it preferred", () => {
    const state = stateAt(4, "friendly_game", fixtures.drafts.gameWhenFilled);
    const lowered = createReducer(
      createReducer(state, { kind: "setLevelBound", bound: "max", value: "C" }),
      { kind: "setLevelBound", bound: "min", value: "B" },
    );
    expect(lowered.draft.levelMin).toBe("B");
    expect(lowered.draft.levelMax).toBe("B");
    expect(lowered.draft.preferLevelRange).toBe(true);
    const open = createReducer(lowered, { kind: "openLevelRange" });
    expect(open.draft.levelMin).toBe("none");
    expect(open.draft.preferLevelRange).toBe(false);
  });

  it("stops following the day once the name is edited", () => {
    const state = stateAt(
      3,
      "friendly_tournament",
      fixtures.drafts.tournamentGroupsOnly,
    );
    const next = createReducer(state, {
      kind: "setDay",
      day: "2026-10-10",
      now: NOW,
    });
    expect(next.draft.name).toBe("Friday cup");
  });
});

describe("advance", () => {
  it("asks for a type, then moves to Where", () => {
    const empty = initialCreateState(NOW);
    expect(advance(empty, context)).toEqual({
      moved: false,
      errors: { type: "Pick a Game type" },
    });
    const picked = createReducer(empty, {
      kind: "selectType",
      type: "friendly_game",
    });
    const moved = advance(picked, context);
    expect(moved.moved && moved.state.step).toBe(2);
  });

  it("asks for a Group, then a Venue", () => {
    const state = stateAt(2, "friendly_game", fixtures.drafts.emptyGame);
    expect(advance(state, context)).toEqual({
      moved: false,
      errors: { groupId: "Pick a Group" },
    });
    const withGroup = createReducer(state, { kind: "setGroup", groupId: "g" });
    expect(advance(withGroup, context)).toEqual({
      moved: false,
      errors: { venueId: "Pick a Venue" },
    });
  });

  it("shows the refused Group message over the generic one", () => {
    const state = stateAt(2, "friendly_game", fixtures.drafts.emptyGame);
    expect(
      advance(state, {
        ...context,
        groupFieldError: "You cannot create a Game in that Group.",
      }),
    ).toEqual({
      moved: false,
      errors: { groupId: "You cannot create a Game in that Group." },
    });
  });

  it("holds on Where while Venues load or the catalog is empty", () => {
    const state = stateAt(2, "friendly_game", fixtures.drafts.gameWhereFilled);
    expect(advance(state, { ...context, venuesPending: true })).toEqual({
      moved: false,
      errors: {},
    });
    expect(advance(state, { ...context, emptyCatalog: true })).toEqual({
      moved: false,
      errors: {},
    });
  });

  it("validates the tournament groups count on the format step", () => {
    const state = stateAt(
      3,
      "friendly_tournament",
      fixtures.drafts.teamCountDoesNotFit,
    );
    expect(advance(state, context)).toEqual({
      moved: false,
      errors: { poolCount: "Pick a groups count" },
    });
  });

  it("asks for a start time on the When step", () => {
    const state = stateAt(3, "friendly_game", fixtures.drafts.gameWhereFilled);
    const result = advance(state, context);
    expect(result.moved).toBe(false);
  });
});

describe("continueBlocked", () => {
  it("blocks step 1 until a type is picked", () => {
    expect(continueBlocked(stateAt(1, null, fixtures.drafts.emptyGame))).toBe(
      true,
    );
    for (const type of ["friendly_game", "friendly_tournament"] as const) {
      expect(continueBlocked(stateAt(1, type, fixtures.drafts.emptyGame))).toBe(
        false,
      );
    }
  });

  it("blocks step 2 until a Group is picked, in both branches", () => {
    for (const type of ["friendly_game", "friendly_tournament"] as const) {
      expect(continueBlocked(stateAt(2, type, fixtures.drafts.emptyGame))).toBe(
        true,
      );
      expect(
        continueBlocked(stateAt(2, type, fixtures.drafts.gameWhereFilled)),
      ).toBe(false);
    }
  });

  it("leaves step 2 open without a Venue so advance can name the field", () => {
    const draft = { ...fixtures.drafts.gameWhereFilled, venueId: "" };
    expect(continueBlocked(stateAt(2, "friendly_game", draft))).toBe(false);
  });

  it("never blocks steps 3 and 4, in both branches", () => {
    for (const type of ["friendly_game", "friendly_tournament"] as const) {
      for (const step of [3, 4] as const) {
        expect(
          continueBlocked(stateAt(step, type, fixtures.drafts.emptyGame)),
        ).toBe(false);
      }
    }
  });
});

describe("submitRequest", () => {
  it("builds a Friendly game request", () => {
    const result = submitRequest(
      stateAt(4, "friendly_game", fixtures.drafts.gameReview),
      NOW,
    );
    expect(result.ok && result.request.kind).toBe("friendly_game");
  });

  it.each([
    "tournamentGroupsOnly",
    "tournamentKnockoutOnly",
    "tournamentGroupsThenKnockout",
  ] as const)("builds a tournament request for %s", (key) => {
    const result = submitRequest(
      stateAt(4, "friendly_tournament", fixtures.drafts[key]),
      NOW,
    );
    expect(result.ok && result.request.kind).toBe("friendly_tournament");
  });

  it("uses the web messages for an inverted Level range and a bad price", () => {
    const level = submitRequest(
      stateAt(4, "friendly_game", fixtures.drafts.invertedLevelRange),
      NOW,
    );
    expect(level).toMatchObject({
      ok: false,
      errors: { levelMinTenths: LEVEL_RANGE_INVERTED_MESSAGE },
    });
    const price = submitRequest(
      stateAt(4, "friendly_game", fixtures.drafts.badPrice),
      NOW,
    );
    expect(price).toMatchObject({
      ok: false,
      step: 4,
      errors: { pricePerPlayerFils: "Enter a valid amount" },
    });
  });

  it("sends the user back to Where when the Group is missing", () => {
    const result = submitRequest(
      stateAt(4, "friendly_game", fixtures.drafts.emptyGame),
      NOW,
    );
    expect(result).toMatchObject({ ok: false, step: 2 });
  });
});

describe("serverFailure", () => {
  it("returns the server's message when there are no field errors", () => {
    expect(serverFailure({ message: "Venue is archived" }, 4)).toEqual({
      fieldErrors: {},
      globalMessage: "Venue is archived",
      step: 4,
    });
  });

  it("jumps to the step of the first field the server refused", () => {
    const failure = serverFailure(
      {
        message: "Invalid",
        data: { zodError: { fieldErrors: { windowStart: ["Too early"] } } },
      },
      4,
    );
    expect(failure.step).toBe(3);
    expect(failure.fieldErrors).toEqual({ windowStart: "Too early" });
  });
});

describe("football create flow", () => {
  function footballState(overrides: Partial<CreateState> = {}): CreateState {
    return {
      ...stateAt(4, "friendly_game", fixtures.drafts.gameReview),
      sport: "football",
      ...overrides,
    };
  }

  it("skips the Type step when a football Group is picked", () => {
    const picked = createReducer(initialCreateState(NOW), {
      kind: "setGroup",
      groupId: "group-football",
      sport: "football",
    });
    expect(picked.sport).toBe("football");
    expect(picked.type).toBe("friendly_game");
    expect(picked.step).toBe(2);
  });

  it("turns a chosen tournament into a Friendly game on a football Group", () => {
    const tournament = createReducer(initialCreateState(NOW), {
      kind: "selectType",
      type: "friendly_tournament",
    });
    const picked = createReducer(tournament, {
      kind: "setGroup",
      groupId: "group-football",
      sport: "football",
    });
    expect(picked.type).toBe("friendly_game");
    expect(picked.draft.courtIds).toEqual([]);
  });

  it("keeps the padel flow when a padel Group is picked", () => {
    const picked = createReducer(initialCreateState(NOW), {
      kind: "setGroup",
      groupId: "group-padel",
      sport: "padel",
    });
    expect(picked.sport).toBe("padel");
    expect(picked.type).toBeNull();
    expect(picked.step).toBe(1);
    const unknown = createReducer(initialCreateState(NOW), {
      kind: "setGroup",
      groupId: "group-padel",
    });
    expect(unknown.sport).toBe("padel");
  });

  it("returns to padel when the Group changes back", () => {
    const football = createReducer(initialCreateState(NOW), {
      kind: "setGroup",
      groupId: "group-football",
      sport: "football",
    });
    const padel = createReducer(football, {
      kind: "setGroup",
      groupId: "group-padel",
      sport: "padel",
    });
    expect(padel.sport).toBe("padel");
    expect(padel.type).toBe("friendly_game");
  });

  it("moves the cap with the side size and clamps the stepper", () => {
    const seven = createReducer(footballState(), {
      kind: "setSideSize",
      sideSize: 7,
    });
    expect(seven.draft.sideSize).toBe(7);
    expect(seven.draft.playersAllowed).toBe(14);
    const below = createReducer(seven, {
      kind: "setPlayersAllowed",
      playersAllowed: 3,
    });
    expect(below.draft.playersAllowed).toBe(14);
    const above = createReducer(seven, {
      kind: "setPlayersAllowed",
      playersAllowed: 99,
    });
    expect(above.draft.playersAllowed).toBe(40);
  });

  it("submits the side size and cap, never a Level range or sport", () => {
    const sized = createReducer(footballState(), {
      kind: "setPlayersAllowed",
      playersAllowed: 12,
    });
    const result = submitRequest(sized, NOW);
    expect(result.ok && result.request.kind).toBe("football_game");
    if (result.ok && result.request.kind === "football_game") {
      expect(result.request.input.sideSize).toBe(5);
      expect(result.request.input.playersAllowed).toBe(12);
      expect("sport" in result.request.input).toBe(false);
      expect("levelMinTenths" in result.request.input).toBe(false);
    }
  });

  it("points a cap error back at step 4", () => {
    const state = footballState({
      draft: { ...footballState().draft, playersAllowed: 3 },
    });
    const result = submitRequest(state, NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.step).toBe(4);
      expect(result.errors.playersAllowed).toMatch(/between 10 and 40/);
    }
  });

  it("leaves the padel request unchanged", () => {
    const result = submitRequest(
      stateAt(4, "friendly_game", fixtures.drafts.gameReview),
      NOW,
    );
    expect(result.ok && result.request.kind).toBe("friendly_game");
  });
});
