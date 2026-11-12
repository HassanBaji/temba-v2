import { describe, expect, it } from "vitest";

import { inYourGroupsRows, type GroupStandingData } from "./ratings-screen";

function row(overrides: Partial<GroupStandingData> = {}): GroupStandingData {
  return {
    groupId: "g1",
    name: "Tuesday Night Padel",
    seasonId: "s1",
    position: 3,
    memberCount: 12,
    won: 14,
    drawn: 0,
    lost: 8,
    ...overrides,
  };
}

describe("inYourGroupsRows", () => {
  it("reads won, lost and place for the Season, as screen 1b", () => {
    expect(inYourGroupsRows([row()], "en")).toEqual([
      {
        groupId: "g1",
        name: "Tuesday Night Padel",
        initials: "TP",
        record: "14 won, 8 lost this season",
        place: "#3 of 12",
        ranked: true,
        spoken: "Tuesday Night Padel, #3 of 12, 14 won, 8 lost this season",
      },
    ]);
  });

  it("names draws only when there are some", () => {
    expect(inYourGroupsRows([row({ drawn: 2 })], "en")[0]?.record).toBe(
      "14 won, 2 drawn, 8 lost this season",
    );
  });

  it("reads all-time for a Group with no Season, and Unranked before a result", () => {
    const [view] = inYourGroupsRows(
      [row({ seasonId: null, position: null, won: 0, lost: 0 })],
      "en",
    );
    expect(view?.record).toBe("0 won, 0 lost");
    expect(view?.place).toBe("Unranked");
    expect(view?.ranked).toBe(false);
  });

  it("reads in Arabic", () => {
    const [view] = inYourGroupsRows([row()], "ar");
    expect(view?.record).toBe("14 فوز، 8 خسارة هذا الموسم");
    expect(view?.place).toBe("#3 من 12");
  });
});
