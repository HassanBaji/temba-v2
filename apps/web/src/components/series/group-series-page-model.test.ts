import { describe, expect, it } from "vitest";

import {
  groupSeriesPageModel,
  type GroupSeriesList,
} from "./group-series-page-model";

const NOW = new Date("2026-11-05T10:00:00Z");

type Row = GroupSeriesList["running"][number];

function row(overrides: Partial<Row> & Pick<Row, "id" | "name">): Row {
  return {
    emblem: "cup",
    colour: "gold",
    sport: "padel",
    kind: null,
    playedCount: 0,
    next: null,
    endedAt: null,
    ...overrides,
  };
}

const sundaySocial = row({
  id: "sunday",
  name: "Sunday Social",
  kind: "social",
  playedCount: 11,
  next: {
    gameId: "game-12",
    edition: 12,
    startsAt: new Date("2026-11-09T16:00:00Z"),
  },
});

const thursdayLadder = row({
  id: "thursday",
  name: "Thursday Ladder",
  emblem: "bolt",
  colour: "blue",
  kind: "game",
  playedCount: 31,
  next: {
    gameId: "game-32",
    edition: 32,
    startsAt: new Date("2026-11-12T16:00:00Z"),
  },
});

const ramadanNights = row({
  id: "ramadan",
  name: "Ramadan Nights",
  emblem: "moon",
  colour: "purple",
  kind: "social",
  playedCount: 8,
  endedAt: new Date("2026-03-20T12:00:00Z"),
});

function list(overrides: Partial<GroupSeriesList> = {}): GroupSeriesList {
  return {
    groupName: "Tuesday Night Padel",
    enabled: true,
    canManage: false,
    running: [],
    ended: [],
    ...overrides,
  };
}

describe("groupSeriesPageModel", () => {
  it("lists running Series with the next date and ended ones with Badges stay", () => {
    const model = groupSeriesPageModel(
      list({ running: [sundaySocial, thursdayLadder], ended: [ramadanNights] }),
      "en",
      NOW,
    );

    expect(model.groupName).toBe("Tuesday Night Padel");
    expect(model.running?.meta).toBe("2");
    expect(model.running?.rows).toEqual([
      {
        id: "sunday",
        href: "/dashboard/series/sunday",
        name: "Sunday Social",
        emblem: "cup",
        colour: "gold",
        line: "Padel social. 11 played, next is edition 12",
        trailing: { kind: "next", label: "Next", date: "Mon 9 Nov" },
      },
      {
        id: "thursday",
        href: "/dashboard/series/thursday",
        name: "Thursday Ladder",
        emblem: "bolt",
        colour: "blue",
        line: "Padel game. 31 played, next is edition 32",
        trailing: { kind: "next", label: "Next", date: "Thu 12 Nov" },
      },
    ]);
    expect(model.ended?.meta).toBe("1");
    expect(model.ended?.rows[0]?.line).toBe(
      "Padel social. 8 played, ended in March",
    );
    expect(model.ended?.rows[0]?.trailing).toEqual({
      kind: "ended",
      label: "Badges stay",
    });
    expect(model.empty).toBeNull();
  });

  it("reads a new Series as not played yet, with nothing on the trailing side", () => {
    const model = groupSeriesPageModel(
      list({ running: [row({ id: "new", name: "Sunday Social" })] }),
      "en",
      NOW,
    );

    expect(model.running?.meta).toBe("1");
    expect(model.running?.rows[0]?.line).toBe("Padel series. Not played yet");
    expect(model.running?.rows[0]?.trailing).toBeNull();
    expect(model.ended).toBeNull();
  });

  it("is empty with no Series, and offers New series only to a Group approver", () => {
    const member = groupSeriesPageModel(list(), "en", NOW);
    expect(member.running).toBeNull();
    expect(member.ended).toBeNull();
    expect(member.empty).toBe("No series yet.");
    expect(member.canCreate).toBe(false);

    const approver = groupSeriesPageModel(list({ canManage: true }), "en", NOW);
    expect(approver.canCreate).toBe(true);
  });

  it("names a Group without a name", () => {
    expect(
      groupSeriesPageModel(list({ groupName: null }), "en", NOW).groupName,
    ).toBe("Untitled Group");
  });

  it("is not empty when only ended Series remain", () => {
    const model = groupSeriesPageModel(
      list({ ended: [ramadanNights] }),
      "en",
      NOW,
    );
    expect(model.running).toBeNull();
    expect(model.empty).toBeNull();
  });

  it("writes Arabic", () => {
    const model = groupSeriesPageModel(
      list({ running: [sundaySocial], ended: [ramadanNights] }),
      "ar",
      NOW,
    );
    expect(model.running?.meta).toBe("1");
    expect(model.ended?.rows[0]?.trailing).toEqual({
      kind: "ended",
      label: "الشارات تبقى",
    });
  });
});
