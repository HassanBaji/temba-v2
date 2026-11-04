import { describe, expect, it } from "vitest";

import { groupRowView, levelScale } from "./you-groups-model";
import type { GroupLevelRow } from "./you-hero-model";

function row(overrides: Partial<GroupLevelRow> = {}): GroupLevelRow {
  return {
    groupId: "g1",
    name: "Tuesday Crew",
    imageUrl: null,
    level: "3.4",
    rating: 3.38,
    levelBand: "C2",
    provisional: false,
    ratedMatchesRemaining: 0,
    ratedMatchCount: 10,
    rank: 3,
    rankedCount: 14,
    differenceFromGeneral: 0.17,
    setBy: null,
    ...overrides,
  };
}

describe("groupRowView", () => {
  it("ranks a confirmed Group Level", () => {
    const view = groupRowView(row(), "en");
    expect(view).toMatchObject({
      initials: "TC",
      sub: "#3 of 14 · 10 rated",
      band: "C",
      level: "3.38",
      difference: { text: "+0.17", above: true },
    });
  });

  it("counts what a Provisional Group Level still needs", () => {
    expect(
      groupRowView(row({ provisional: true, ratedMatchesRemaining: 2 }), "en")
        .sub,
    ).toBe("Provisional · 2 more to confirm");
  });

  it("names the Organizer who set it", () => {
    const view = groupRowView(
      row({
        differenceFromGeneral: -0.26,
        setBy: { name: "Jaber B", at: new Date() },
      }),
      "en",
    );
    expect(view.sub).toBe("Set by Jaber B, organizer");
    expect(view.difference).toEqual({ text: "−0.26", above: false });
  });
});

describe("levelScale", () => {
  it("places General and each Group between band boundaries", () => {
    const scale = levelScale(
      3.15,
      [
        { groupId: "a", name: "Seef Padel Club", rating: 2.8 },
        { groupId: "b", name: "Tuesday Crew", rating: 3.5 },
      ],
      "en",
    );
    expect(scale.ticks).toEqual([
      { label: "C", position: 0 },
      { label: "C+", position: 100 },
    ]);
    expect(scale.markers).toEqual([
      { key: "a", tag: "SC", position: 0, general: false },
      { key: "b", tag: "TC", position: 100, general: false },
      { key: "general", tag: "GEN", position: 50, general: true },
    ]);
  });
});
