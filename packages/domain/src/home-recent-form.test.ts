import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  deriveRecentForm,
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
    const form = deriveRecentForm([], "en");
    assert.equal(form.bars.length, 10);
    assert.ok(form.bars.every((bar) => bar.kind === "empty"));
    assert.equal(recentFormStatus(form, "en"), "Ten slots left to fill");
  });

  it("puts the most recent result on the left and pads empty slots to the right", () => {
    const form = deriveRecentForm([row("won"), row("lost"), row("draw")], "en");
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
    const form = deriveRecentForm(rows, "en");
    assert.ok(form.bars.every((bar) => bar.kind === "played"));
    assert.deepEqual(
      form.bars.map((bar) => (bar.kind === "played" ? bar.label : "empty")),
      ["W", "L", "L", "L", "L", "L", "L", "L", "L", "L"],
    );
  });

  it("reads the result letters in Arabic", () => {
    const form = deriveRecentForm([row("won"), row("lost"), row("draw")], "ar");
    assert.deepEqual(
      form.bars.flatMap((bar) => (bar.kind === "played" ? [bar.label] : [])),
      ["ف", "خ", "ت"],
    );
  });

  it("invites the User to fill slots until the row is full", () => {
    const form = deriveRecentForm([row("won")], "en");
    assert.equal(recentFormStatus(form, "en"), "Nine slots left to fill");
  });

  it("uses streak copy once ten slots are filled", () => {
    const form = deriveRecentForm(wins(10), "en");
    assert.equal(recentFormStatus(form, "en"), "On a 10 games Win streak");
  });

  it("hides win rate until five games exist", () => {
    const form = deriveRecentForm([...wins(2), ...losses(2)], "en");
    assert.deepEqual(recentFormWinRateCopy(form, "en"), {
      value: "—",
      caption: "Win rate shows after 5 matches",
    });
    assert.equal(
      recentFormWinRateCopy(form, "ar").caption,
      "تظهر نسبة الفوز بعد 5 مباريات",
    );
  });

  it("shows win rate from five games", () => {
    const form = deriveRecentForm([...wins(3), ...losses(2)], "en");
    assert.deepEqual(recentFormWinRateCopy(form, "en"), {
      value: "60%",
      caption: "win rate",
    });
  });

  it("counts a win streak from the newest qualifying Game", () => {
    const form = deriveRecentForm(
      [row("won"), row("won"), row("won"), row("lost")],
      "en",
    );
    assert.deepEqual(form.streak, {
      kind: "won",
      count: 3,
      label: "On a 3 games Win streak",
    });
  });

  it("counts a loss streak and uses singular copy", () => {
    const form = deriveRecentForm([row("lost"), row("won")], "en");
    assert.deepEqual(form.streak, {
      kind: "lost",
      count: 1,
      label: "Painful loss",
    });
  });

  it("uses singular copy for a one-game win streak", () => {
    const form = deriveRecentForm([row("won"), row("lost")], "en");
    assert.deepEqual(form.streak, {
      kind: "won",
      count: 1,
      label: "Building that win streak",
    });
  });

  it("breaks the streak on a newest Draw", () => {
    const form = deriveRecentForm([row("draw"), row("won"), row("won")], "en");
    assert.deepEqual(form.streak, { kind: "none", label: "No streak" });
  });

  it("stops a win streak when a Draw is hit walking backward", () => {
    const form = deriveRecentForm(
      [row("won"), row("won"), row("draw"), row("won")],
      "en",
    );
    assert.deepEqual(form.streak, {
      kind: "won",
      count: 2,
      label: "On a 2 games Win streak",
    });
  });

  it("reads the status and streak in Arabic", () => {
    assert.equal(
      recentFormStatus(deriveRecentForm([row("won")], "ar"), "ar"),
      "بقيت 9 أماكن لملئها",
    );
    assert.equal(
      deriveRecentForm(wins(10), "ar").streak.label,
      "في سلسلة فوز من 10 مباريات",
    );
  });

  it("counts Draws as played, not won, in the last-10 rate", () => {
    const form = deriveRecentForm(
      [...wins(6), row("draw"), ...losses(3)],
      "en",
    );
    assert.equal(form.winRatePercent, 60);
  });
});
