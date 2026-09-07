import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  deriveRecentForm,
  recentFormRecord,
  recentFormStatus,
  recentFormWinRateCopy,
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
  it("renders ten empty slots when History is empty", () => {
    const form = deriveRecentForm([]);
    assert.equal(form.bars.length, 10);
    assert.ok(form.bars.every((bar) => bar.kind === "empty"));
    assert.equal(recentFormRecord(form), "0–0");
    assert.equal(recentFormStatus(form), "Ten slots left to fill");
  });

  it("puts the most recent result on the left and pads empty slots to the right", () => {
    const form = deriveRecentForm([row("won"), row("lost"), row("draw")]);
    assert.deepEqual(
      form.bars.map((bar) => (bar.kind === "played" ? bar.label : "empty")),
      [
        "W",
        "L",
        "D",
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
    assert.ok(form.bars.every((bar) => bar.kind === "played"));
    assert.deepEqual(
      form.bars.map((bar) => (bar.kind === "played" ? bar.label : "empty")),
      ["W", "L", "L", "L", "L", "L", "L", "L", "L", "L"],
    );
  });

  it("includes draws in the record only when a draw exists", () => {
    const withDraw = deriveRecentForm([row("won"), row("lost"), row("draw")]);
    assert.equal(recentFormRecord(withDraw), "1–1–1");
    const without = deriveRecentForm([row("won"), row("lost")]);
    assert.equal(recentFormRecord(without), "1–1");
  });

  it("invites the User to fill slots until the row is full", () => {
    const form = deriveRecentForm([row("won")]);
    assert.equal(recentFormStatus(form), "Nine slots left to fill");
  });

  it("uses streak copy once ten slots are filled", () => {
    const form = deriveRecentForm(wins(10));
    assert.equal(recentFormStatus(form), "On a 10 games Win streak");
  });

  it("hides win rate until three games exist", () => {
    const form = deriveRecentForm([row("lost")]);
    assert.deepEqual(recentFormWinRateCopy(form), {
      value: "—",
      caption: "win rate after 3 games",
    });
  });

  it("shows win rate from three games", () => {
    const form = deriveRecentForm([...wins(2), row("lost")]);
    assert.deepEqual(recentFormWinRateCopy(form), {
      value: "67%",
      caption: "win rate",
    });
  });

  it("counts a win streak from the newest qualifying Game", () => {
    const form = deriveRecentForm([
      row("won"),
      row("won"),
      row("won"),
      row("lost"),
    ]);
    assert.deepEqual(form.streak, {
      kind: "won",
      count: 3,
      label: "On a 3 games Win streak",
    });
  });

  it("counts a loss streak and uses singular copy", () => {
    const form = deriveRecentForm([row("lost"), row("won")]);
    assert.deepEqual(form.streak, {
      kind: "lost",
      count: 1,
      label: "Painful loss",
    });
  });

  it("uses singular copy for a one-game win streak", () => {
    const form = deriveRecentForm([row("won"), row("lost")]);
    assert.deepEqual(form.streak, {
      kind: "won",
      count: 1,
      label: "Building that win streak",
    });
  });

  it("breaks the streak on a newest Draw", () => {
    const form = deriveRecentForm([row("draw"), row("won"), row("won")]);
    assert.deepEqual(form.streak, { kind: "none", label: "No streak" });
  });

  it("stops a win streak when a Draw is hit walking backward", () => {
    const form = deriveRecentForm([
      row("won"),
      row("won"),
      row("draw"),
      row("won"),
    ]);
    assert.deepEqual(form.streak, {
      kind: "won",
      count: 2,
      label: "On a 2 games Win streak",
    });
  });

  it("counts Draws as played, not won, in the last-10 rate", () => {
    const form = deriveRecentForm([...wins(6), row("draw"), ...losses(3)]);
    assert.equal(form.winRatePercent, 60);
  });
});
