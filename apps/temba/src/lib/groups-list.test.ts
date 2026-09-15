import { describe, expect, it } from "vitest";

import { groupNextGameWeekday, groupRowMetaLine } from "~/lib/groups-list";

describe("groupRowMetaLine", () => {
  it("names the viewer's rank when they hold a standing position", () => {
    expect(groupRowMetaLine({ memberCount: 14, standingPosition: 3 })).toBe(
      "14 members, you are rank 3",
    );
  });

  it("drops the rank clause when the viewer has no standing position", () => {
    expect(groupRowMetaLine({ memberCount: 22, standingPosition: null })).toBe(
      "22 members",
    );
  });

  it("pluralises member", () => {
    expect(groupRowMetaLine({ memberCount: 1, standingPosition: null })).toBe(
      "1 member",
    );
    expect(groupRowMetaLine({ memberCount: 0, standingPosition: null })).toBe(
      "0 members",
    );
  });
});

describe("groupNextGameWeekday", () => {
  it("abbreviates the weekday", () => {
    expect(groupNextGameWeekday(new Date(2026, 8, 17, 19, 0))).toBe("Thu");
  });

  it("accepts a serialized date", () => {
    expect(
      groupNextGameWeekday(new Date(2026, 8, 19, 9, 0).toISOString()),
    ).toBe("Sat");
  });

  it("returns null for an unparseable date", () => {
    expect(groupNextGameWeekday("not a date")).toBeNull();
  });
});
