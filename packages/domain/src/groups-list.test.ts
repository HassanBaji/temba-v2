import { bahrainDate } from "./bahrain-date.test-support";
import { describe, expect, it } from "vitest";

import { groupNextGameWeekday, groupRowMetaLine } from "./groups-list";

describe("groupRowMetaLine", () => {
  it("names the viewer's rank when they hold a standing position", () => {
    expect(
      groupRowMetaLine({ memberCount: 14, standingPosition: 3, locale: "en" }),
    ).toBe("14 members, you are rank 3");
  });

  it("drops the rank clause when the viewer has no standing position", () => {
    expect(
      groupRowMetaLine({
        memberCount: 22,
        standingPosition: null,
        locale: "en",
      }),
    ).toBe("22 members");
  });

  it("pluralises member", () => {
    expect(
      groupRowMetaLine({
        memberCount: 1,
        standingPosition: null,
        locale: "en",
      }),
    ).toBe("1 member");
    expect(
      groupRowMetaLine({
        memberCount: 0,
        standingPosition: null,
        locale: "en",
      }),
    ).toBe("0 members");
  });

  it("reads in Arabic", () => {
    expect(
      groupRowMetaLine({ memberCount: 14, standingPosition: 3, locale: "ar" }),
    ).toBe("14 عضوًا، ترتيبك 3");
  });
});

describe("groupNextGameWeekday", () => {
  it("abbreviates the weekday", () => {
    expect(groupNextGameWeekday(bahrainDate(2026, 8, 17, 19, 0), "en")).toBe(
      "Thu",
    );
  });

  it("accepts a serialized date", () => {
    expect(
      groupNextGameWeekday(bahrainDate(2026, 8, 19, 9, 0).toISOString(), "en"),
    ).toBe("Sat");
  });

  it("returns null for an unparseable date", () => {
    expect(groupNextGameWeekday("not a date", "en")).toBeNull();
  });
});
