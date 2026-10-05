import { createCreateGameFixtures } from "@repo/domain/create-game-fixtures";
import { bahrainDate } from "@repo/domain/bahrain-date.test-support";
import { LEVEL_RANGE_INVERTED_MESSAGE } from "@repo/domain/level-range";
import { describe, expect, it } from "vitest";

import {
  advance,
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
  return { type, step, draft: { ...draft, day: "2026-10-09" } };
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
