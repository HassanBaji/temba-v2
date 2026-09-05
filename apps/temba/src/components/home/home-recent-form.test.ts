import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  deriveRecentForm,
  type RecentFormHistoryRow,
} from "./home-recent-form";

function row(
  outcome: RecentFormHistoryRow["outcome"],
  sets: readonly (readonly [number, number])[] = [[6, 4]],
): RecentFormHistoryRow {
  return {
    outcome,
    scoredSets: sets.map(([slot1GamesWon, slot2GamesWon]) => ({
      slot1GamesWon,
      slot2GamesWon,
    })),
  };
}

function wins(count: number): RecentFormHistoryRow[] {
  return Array.from({ length: count }, () => row("won"));
}

function losses(count: number): RecentFormHistoryRow[] {
  return Array.from({ length: count }, () => row("lost"));
}

describe("deriveRecentForm", () => {
  it("hides the card when History is empty", () => {
    assert.equal(deriveRecentForm([]), null);
  });

  it("pads 1–9 played games to 10 bars with empty slots on the right", () => {
    const form = deriveRecentForm([row("won"), row("lost"), row("draw")]);
    assert.ok(form);
    assert.equal(form.bars.length, 10);
    assert.deepEqual(
      form.bars.map((bar) => (bar.kind === "played" ? bar.label : "empty")),
      [
        "D",
        "L",
        "W",
        "empty",
        "empty",
        "empty",
        "empty",
        "empty",
        "empty",
        "empty",
      ],
    );
  });

  it("uses the most recent 10 as bars when History is longer", () => {
    const rows = [row("won"), ...losses(9), row("draw")];
    const form = deriveRecentForm(rows);
    assert.ok(form);
    assert.equal(form.bars.length, 10);
    assert.ok(form.bars.every((bar) => bar.kind === "played"));
    assert.deepEqual(
      form.bars.map((bar) => (bar.kind === "played" ? bar.label : "empty")),
      ["L", "L", "L", "L", "L", "L", "L", "L", "L", "W"],
    );
  });

  it("hides trend when History has fewer than 20 Games", () => {
    const form = deriveRecentForm([...wins(7), ...losses(8)]);
    assert.ok(form);
    assert.equal(form.trendPoints, null);
  });

  it("compares win rate to the previous 10 when n ≥ 20", () => {
    const form = deriveRecentForm([
      ...wins(7),
      ...losses(3),
      ...wins(5),
      ...losses(5),
    ]);
    assert.ok(form);
    assert.equal(form.winRatePercent, 70);
    assert.equal(form.trendPoints, 20);
  });

  it("maps outcomes and Set games-won differential / 18 to fill", () => {
    const form = deriveRecentForm([
      row("won", [
        [6, 0],
        [6, 0],
      ]),
      row("lost", [
        [0, 6],
        [0, 6],
        [0, 6],
      ]),
      row("draw", [
        [6, 6],
        [6, 6],
      ]),
    ]);
    assert.ok(form);
    assert.deepEqual(
      form.bars
        .filter((bar) => bar.kind === "played")
        .map((bar) => ({
          label: bar.label,
          outcome: bar.outcome,
          fillRatio: bar.fillRatio,
        })),
      [
        { label: "D", outcome: "draw", fillRatio: 0 },
        { label: "L", outcome: "lost", fillRatio: 1 },
        { label: "W", outcome: "won", fillRatio: 12 / 18 },
      ],
    );
  });

  it("counts a win streak from the newest qualifying Game", () => {
    const form = deriveRecentForm([
      row("won"),
      row("won"),
      row("won"),
      row("lost"),
    ]);
    assert.ok(form);
    assert.deepEqual(form.streak, {
      kind: "won",
      count: 3,
      label: "3 Wins",
    });
  });

  it("counts a loss streak and uses singular copy", () => {
    const form = deriveRecentForm([row("lost"), row("won")]);
    assert.ok(form);
    assert.deepEqual(form.streak, {
      kind: "lost",
      count: 1,
      label: "1 Loss",
    });
  });

  it("uses singular copy for a one-game win streak", () => {
    const form = deriveRecentForm([row("won"), row("lost")]);
    assert.ok(form);
    assert.deepEqual(form.streak, {
      kind: "won",
      count: 1,
      label: "1 Win",
    });
  });

  it("breaks the streak on a newest Draw", () => {
    const form = deriveRecentForm([row("draw"), row("won"), row("won")]);
    assert.ok(form);
    assert.deepEqual(form.streak, { kind: "none", label: "No streak" });
  });

  it("stops a win streak when a Draw is hit walking backward", () => {
    const form = deriveRecentForm([
      row("won"),
      row("won"),
      row("draw"),
      row("won"),
    ]);
    assert.ok(form);
    assert.deepEqual(form.streak, {
      kind: "won",
      count: 2,
      label: "2 Wins",
    });
  });

  it("counts Draws as played, not won, in the last-10 rate", () => {
    const form = deriveRecentForm([...wins(6), row("draw"), ...losses(3)]);
    assert.ok(form);
    assert.equal(form.winRatePercent, 60);
  });

  it("shows muted 0 trend points when current and previous rates match", () => {
    const form = deriveRecentForm([
      ...wins(5),
      ...losses(5),
      ...wins(5),
      ...losses(5),
    ]);
    assert.ok(form);
    assert.equal(form.winRatePercent, 50);
    assert.equal(form.trendPoints, 0);
  });

  it("rounds win rate the same way as overall stats", () => {
    const form = deriveRecentForm([...wins(2), ...losses(1)]);
    assert.ok(form);
    assert.equal(form.winRatePercent, 67);
  });
});
