import { createGroupFixtures } from "@repo/domain/group-fixtures";
import type { GroupLeaderboardEntryData } from "@repo/domain/group-data";
import { describe, expect, it } from "vitest";

import {
  savedLevelFromParams,
  savedLevelPath,
  savedLevelText,
  setLevelConfirmLabel,
  setLevelPath,
  setLevelUnchanged,
  setLevelView,
} from "./set-level-model";

const { home } = createGroupFixtures(new Date("2026-03-10T12:00:00Z"));
const base = home.member.standing.leaderboard[0]!;

function entry(
  overrides: Partial<GroupLeaderboardEntryData>,
): GroupLeaderboardEntryData {
  return { ...base, name: "Sara Karlsson", ...overrides };
}

describe("setLevelView", () => {
  it("starts from the current Level and says it counts as confirmed", () => {
    const view = setLevelView(
      entry({ level: "3.8", levelBand: "C2", levelProvisional: false }),
    );
    expect(view.currentTenths).toBe(38);
    expect(view.wasLabel).toBe("was C+ 3.8");
    expect(view.alreadyConfirmed).toBe(true);
    expect(view.note).toBe(
      "A Level you set counts as confirmed. Rated Matches keep moving it from here.",
    );
  });

  it("adds the Provisional sentence for a Provisional member", () => {
    const view = setLevelView(
      entry({ level: "2.4", levelBand: "C1", levelProvisional: true }),
    );
    expect(view.alreadyConfirmed).toBe(false);
    expect(view.note).toBe(
      "A Level you set counts as confirmed. Rated Matches keep moving it from here. Sara will no longer be Provisional, and setting again will not change that.",
    );
  });

  it("starts a member with no Rating at Level 3.0", () => {
    const view = setLevelView(
      entry({ level: null, levelBand: null, levelProvisional: true }),
    );
    expect(view.currentTenths).toBe(30);
    expect(view.wasLabel).toBe("no Level yet");
  });
});

describe("setLevelUnchanged", () => {
  it("blocks only an unchanged value on an already confirmed Level", () => {
    const confirmed = setLevelView(
      entry({ level: "3.8", levelBand: "C2", levelProvisional: false }),
    );
    const provisional = setLevelView(
      entry({ level: "3.8", levelBand: "C2", levelProvisional: true }),
    );
    expect(setLevelUnchanged(confirmed, 38)).toBe(true);
    expect(setLevelUnchanged(confirmed, 39)).toBe(false);
    expect(setLevelUnchanged(provisional, 38)).toBe(false);
  });
});

describe("setLevelConfirmLabel", () => {
  it("names the letter and the Level", () => {
    expect(setLevelConfirmLabel(46)).toBe("Set to B 4.6");
  });
});

describe("paths and saved banner", () => {
  it("builds the screen path", () => {
    expect(setLevelPath("g 1", "u1")).toBe(
      "/groups/set-level?groupId=g%201&userId=u1",
    );
  });

  it("round-trips a saved Level through the Group path", () => {
    const saved = {
      name: "Sara K",
      levelLabel: "B 4.6",
      reason: "back_from_injury" as const,
    };
    const url = new URL(savedLevelPath("g1", saved), "https://x.test");
    expect(url.pathname).toBe("/groups/g1");
    expect(
      savedLevelFromParams({
        savedName: url.searchParams.get("savedName")!,
        savedLevel: url.searchParams.get("savedLevel")!,
        savedReason: url.searchParams.get("savedReason")!,
      }),
    ).toEqual(saved);
  });

  it("has no banner without a name and Level, and drops an unknown reason", () => {
    expect(savedLevelFromParams({})).toBeNull();
    expect(
      savedLevelFromParams({
        savedName: "Sara K",
        savedLevel: "B 4.6",
        savedReason: "nope",
      })?.reason,
    ).toBeNull();
  });

  it("words the banner with an optional reason and no Undo", () => {
    expect(
      savedLevelText({
        name: "Sara K",
        levelLabel: "B 4.6",
        reason: "back_from_injury",
      }),
    ).toEqual({
      headline: "Sara K set to B 4.6.",
      reason: "Reason: back from injury.",
    });
    expect(
      savedLevelText({ name: "Sara K", levelLabel: "B 4.6", reason: null })
        .reason,
    ).toBeNull();
  });
});
