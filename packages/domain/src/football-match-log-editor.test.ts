import { describe, expect, it } from "vitest";

import {
  logEditorReducer,
  startLogEditor,
  type LogEditorAction,
  type LogEditorState,
} from "./football-match-log-editor";
import { logGoal, logWarning, type MatchLogLine } from "./football-match-log";

const kickoff = new Date("2026-11-20T17:00:00Z");
let n = 0;
const stamp = (minutes = 10) => ({
  id: `new-${String((n += 1))}`,
  at: new Date(kickoff.getTime() + minutes * 60_000),
  kickoff,
});

const ali = { userId: "ali", sideIndex: 1 as const };
const omar = { userId: "omar", sideIndex: 2 as const };
const players = [ali, omar];

function run(state: LogEditorState, ...actions: LogEditorAction[]) {
  return actions.reduce(logEditorReducer, state);
}

const empty = () => startLogEditor([], players);

describe("the Match log editor", () => {
  it("records what the choice says and goes back to a goal after each line", () => {
    const state = run(
      empty(),
      { type: "mode", mode: "warning" },
      { type: "tapPlayer", player: omar, stamp: stamp() },
      { type: "tapPlayer", player: ali, stamp: stamp() },
    );
    expect(state.lines.map((line) => [line.kind, line.userId])).toEqual([
      ["warning", "omar"],
      ["goal", "ali"],
    ]);
    expect(state.mode).toBe("goal");
  });

  it("goes back to a goal after plus on a side", () => {
    const state = run(
      empty(),
      { type: "mode", mode: "own_goal" },
      { type: "addUnknownGoal", side: 2, stamp: stamp() },
    );
    expect(state.mode).toBe("goal");
    expect(state.lines).toHaveLength(1);
  });

  it("asks before a red card, and gives it or lets it go", () => {
    const asked = run(
      empty(),
      { type: "mode", mode: "red_card" },
      { type: "tapPlayer", player: omar, stamp: stamp() },
    );
    expect(asked.redCardFor).toEqual(omar);
    expect(asked.lines).toEqual([]);

    const cancelled = run(asked, { type: "cancelRedCard" });
    expect(cancelled).toMatchObject({ mode: "goal", redCardFor: null });
    expect(cancelled.lines).toEqual([]);

    const given = run(asked, {
      type: "giveRedCard",
      reason: "dissent",
      stamp: stamp(),
    });
    expect(given.lines[0]).toMatchObject({
      kind: "red_card",
      userId: "omar",
      reason: "dissent",
    });
    expect(given).toMatchObject({ mode: "goal", redCardFor: null });
  });

  it("does not ask about a player already sent off", () => {
    const state = run(
      empty(),
      { type: "mode", mode: "red_card" },
      { type: "tapPlayer", player: omar, stamp: stamp() },
      { type: "giveRedCard", reason: null, stamp: stamp() },
      { type: "mode", mode: "red_card" },
      { type: "tapPlayer", player: omar, stamp: stamp() },
    );
    expect(state).toMatchObject({ mode: "goal", redCardFor: null });
    expect(state.lines).toHaveLength(1);
  });

  it("puts the log back exactly as it was with Undo, until the next change", () => {
    let lines: MatchLogLine[] = logGoal([], ali, { ...stamp(5), id: "g" });
    lines = logWarning(lines, omar, { ...stamp(11), id: "w1" });
    lines = logWarning(lines, omar, { ...stamp(38), id: "w2" });
    const started = startLogEditor(lines, players);

    const removed = run(started, { type: "remove", id: "w1" });
    expect(removed.undo?.removed.map((line) => line.id)).toEqual([
      "w1",
      "w2-red",
    ]);
    expect(run(removed, { type: "undo" }).lines).toEqual(lines);

    const moved = run(removed, { type: "changeMinute", id: "g", minute: 7 });
    expect(moved.undo).toBeNull();
    expect(run(moved, { type: "undo" })).toBe(moved);
  });

  it("takes out a side's latest goal with minus and offers Undo", () => {
    const state = run(
      empty(),
      { type: "tapPlayer", player: ali, stamp: stamp(5) },
      { type: "addUnknownGoal", side: 1, stamp: stamp(9) },
      { type: "removeLatestGoal", side: 1 },
    );
    expect(state.lines.map((line) => line.userId)).toEqual(["ali"]);
    expect(state.undo?.removed).toHaveLength(1);
    expect(run(state, { type: "removeLatestGoal", side: 2 })).toBe(state);
  });

  it("opens a stored log without the lines of a player who left", () => {
    const lines = logWarning(logGoal([], ali, { ...stamp(5), id: "g" }), omar, {
      ...stamp(8),
      id: "w",
    });
    const state = startLogEditor(lines, [omar]);
    expect(state.lines.map((line) => [line.kind, line.userId])).toEqual([
      ["goal", null],
      ["warning", "omar"],
    ]);
  });
});
