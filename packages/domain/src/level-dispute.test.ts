import { describe, expect, it } from "vitest";

import { muFromLevel } from "./level";
import { levelFromOvr } from "./football-ovr";
import {
  LEVEL_DISPUTE_NOTE_MAX_LENGTH,
  levelDisputeCanSubmit,
  levelDisputeSheetCopy,
  levelDisputeView,
  operatorLevelDisputeLines,
} from "./level-dispute";

describe("levelDisputeView", () => {
  it("offers the action while the player may dispute, and a status after", () => {
    expect(levelDisputeView("available", "en")).toEqual({
      kind: "raise",
      label: "Dispute this adjustment",
    });
    expect(levelDisputeView("upheld", "en")).toEqual({
      kind: "status",
      line: "Temba agreed and took this adjustment back.",
    });
    expect(levelDisputeView(null, "en")).toEqual({ kind: "none" });
  });

  it("has Arabic copy", () => {
    expect(levelDisputeView("available", "ar")).toEqual({
      kind: "raise",
      label: "اعترض على هذا التعديل",
    });
  });
});

describe("levelDisputeSheetCopy", () => {
  it("names the window in days", () => {
    expect(levelDisputeSheetCopy("en").description).toBe(
      "Within 14 days of the adjustment. An operator reviews it, and if they agree, the adjustment is taken back.",
    );
  });
});

describe("levelDisputeCanSubmit", () => {
  it("needs a note within the limit", () => {
    expect(levelDisputeCanSubmit("  ")).toBe(false);
    expect(levelDisputeCanSubmit("Too high")).toBe(true);
    expect(
      levelDisputeCanSubmit("x".repeat(LEVEL_DISPUTE_NOTE_MAX_LENGTH + 1)),
    ).toBe(false);
  });
});

describe("operatorLevelDisputeLines", () => {
  it("shows the Operator the move, who made it, by which door, and why", () => {
    expect(
      operatorLevelDisputeLines(
        {
          sport: "padel",
          muBefore: muFromLevel(3.2),
          muAfter: muFromLevel(4.1),
          setByRole: "verifier",
          setBy: { name: "Coach Yaser" },
          venue: { name: "Fantasy FC" },
          reason: "plays_above_results",
          note: "Watched two sessions",
        },
        "en",
      ),
    ).toEqual({
      change: "Padel, 3.20 to 4.10",
      adjustedBy:
        "Adjusted by Coach Yaser at Fantasy FC (verifier): Plays above results",
      adjustedNote: "Their note: “Watched two sessions”",
    });
  });

  it("reads football in OVR and an old override with no reason", () => {
    const lines = operatorLevelDisputeLines(
      {
        sport: "football",
        muBefore: muFromLevel(levelFromOvr(68)),
        muAfter: muFromLevel(levelFromOvr(71)),
        setByRole: "operator",
        setBy: null,
        venue: null,
        reason: null,
        note: null,
      },
      "en",
    );
    expect(lines).toEqual({
      change: "Football, 68 to 71",
      adjustedBy: "Adjusted by Someone (operator): No reason given",
      adjustedNote: null,
    });
  });
});
