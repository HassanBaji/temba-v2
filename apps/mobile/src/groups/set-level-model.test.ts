import { createGroupFixtures } from "@repo/domain/group-fixtures";
import type { GroupLeaderboardEntryData } from "@repo/domain/group-data";
import { describe, expect, it } from "vitest";

import {
  savedLevelFromParams,
  savedLevelPath,
  savedLevelText,
  setGroupLevelPath,
  setGroupLevelView,
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
      "en",
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
      "en",
    );
    expect(view.alreadyConfirmed).toBe(false);
    expect(view.note).toBe(
      "A Level you set counts as confirmed. Rated Matches keep moving it from here. Sara will no longer be Provisional, and setting again will not change that.",
    );
  });

  it("starts a member with no Rating at Level 3.0", () => {
    const view = setLevelView(
      entry({ level: null, levelBand: null, levelProvisional: true }),
      "en",
    );
    expect(view.currentTenths).toBe(30);
    expect(view.wasLabel).toBe("no Level yet");
  });

  it("reads the note and the was label in Arabic", () => {
    const view = setLevelView(
      entry({ level: "2.4", levelBand: "C1", levelProvisional: true }),
      "ar",
    );
    expect(view.wasLabel).toBe("كان C- 2.4");
    expect(view.note).toContain("Sara");
    expect(view.note).toMatch(/[\u0600-\u06FF]/);
  });
});

describe("setGroupLevelView", () => {
  it("starts from the Temba Level and names the Group", () => {
    const view = setGroupLevelView(
      entry({ level: "3.8", levelBand: "C2", levelProvisional: false }),
      "Tuesday padel",
      "en",
    );
    expect(view.startTenths).toBe(38);
    expect(view.startLabel).toBe("Temba level C+ 3.8");
    expect(view.markerLabel).toBe("Temba C+ 3.8");
    expect(view.note).toBe(
      "Sara Karlsson's level in Tuesday padel. Results in this group move it from there. Their Temba level does not change.",
    );
  });

  it("starts from the Group Level once the member has one", () => {
    const view = setGroupLevelView(
      entry({
        level: "3.8",
        levelBand: "C2",
        groupLevel: {
          level: "4.4",
          rating: 4.41,
          levelBand: "B1",
          provisional: false,
        },
      }),
      "Tuesday padel",
      "en",
    );
    expect(view.startTenths).toBe(44);
    expect(view.startLabel).toMatch(/^Group level .* 4\.4$/);
    expect(view.markerLabel).toMatch(/^Now .* 4\.4$/);
  });

  it("starts a member with no Temba Level at 3.0, unmarked", () => {
    const view = setGroupLevelView(
      entry({ level: null, levelBand: null, levelProvisional: true }),
      "Tuesday padel",
      "en",
    );
    expect(view.startTenths).toBe(30);
    expect(view.startLabel).toBe("no Temba level yet");
    expect(view.markerLabel).toBeNull();
  });

  it("reads in Arabic", () => {
    const view = setGroupLevelView(entry({ level: "2.4" }), "Ladder", "ar");
    expect(view.startLabel).toMatch(/[\u0600-\u06FF]/);
    expect(view.note).toContain("Ladder");
  });
});

describe("setLevelUnchanged", () => {
  it("blocks only an unchanged value on an already confirmed Level", () => {
    const confirmed = setLevelView(
      entry({ level: "3.8", levelBand: "C2", levelProvisional: false }),
      "en",
    );
    const provisional = setLevelView(
      entry({ level: "3.8", levelBand: "C2", levelProvisional: true }),
      "en",
    );
    expect(setLevelUnchanged(confirmed, 38)).toBe(true);
    expect(setLevelUnchanged(confirmed, 39)).toBe(false);
    expect(setLevelUnchanged(provisional, 38)).toBe(false);
  });
});

describe("setLevelConfirmLabel", () => {
  it("names the letter and the Level", () => {
    expect(setLevelConfirmLabel(46, "en")).toBe("Set to B- 4.6");
    expect(setLevelConfirmLabel(46, "ar")).toBe("تحديد على B- 4.6");
  });
});

describe("paths and saved banner", () => {
  it("builds the screen path", () => {
    expect(setLevelPath("g 1", "u1")).toBe(
      "/groups/set-level?groupId=g%201&userId=u1",
    );
    expect(setGroupLevelPath("g 1", "u1")).toBe(
      "/groups/set-group-level?groupId=g%201&userId=u1",
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
      savedLevelText(
        {
          name: "Sara K",
          levelLabel: "B 4.6",
          reason: "back_from_injury",
        },
        "en",
      ),
    ).toEqual({
      headline: "Sara K set to B 4.6.",
      reason: "Reason: back from injury.",
    });
    expect(
      savedLevelText(
        { name: "Sara K", levelLabel: "B 4.6", reason: null },
        "en",
      ).reason,
    ).toBeNull();
  });
});
