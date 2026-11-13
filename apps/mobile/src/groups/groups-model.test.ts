import { describe, expect, it } from "vitest";
import { createGroupFixtures } from "@repo/domain/group-fixtures";

import {
  groupNewSeasonPath,
  groupRatingSettingsPath,
  groupPath,
  groupRowView,
  groupSeasonsPath,
  publicGroupRowView,
} from "./groups-model";

const ORIGIN = "https://api.example.com";
const fixtures = createGroupFixtures(new Date("2026-03-10T12:00:00Z"));

describe("groupRowView", () => {
  it("shows the viewer's rank, the next Game weekday and an absolute image", () => {
    const row = groupRowView(fixtures.mine[0]!, ORIGIN, "en");
    expect(row.meta).toBe("14 members, you are rank 3");
    expect(row.nextGameWeekday).toBe("Thu");
    expect(row.imageUri).toBe(
      "https://api.example.com/api/media/group-images/group-bromma/image?v=1",
    );
    expect(row.accessibilityLabel).toBe(
      "Padel, Bromma Tuesday, 14 members, you are rank 3, next Game Thu",
    );
  });

  it("names the Group's sport above its name", () => {
    expect(groupRowView(fixtures.mine[0]!, ORIGIN, "en").sportLabel).toBe(
      "Padel",
    );
    expect(groupRowView(fixtures.mine[1]!, ORIGIN, "ar").sportLabel).toBe(
      "كرة القدم",
    );
    expect(groupRowView(fixtures.mine[2]!, ORIGIN, "en").sportLabel).toBeNull();
  });

  it("leaves rank and next Game out before the Group has either", () => {
    const row = groupRowView(fixtures.mine[1]!, ORIGIN, "en");
    expect(row.meta).toBe("1 member");
    expect(row.nextGameWeekday).toBeNull();
    expect(row.accessibilityLabel).toContain("no Game scheduled");
  });

  it("names an unnamed Group", () => {
    expect(groupRowView(fixtures.mine[2]!, ORIGIN, "en").name).toBe(
      "Untitled Group",
    );
  });

  it("reads the row in Arabic", () => {
    const row = groupRowView(fixtures.mine[0]!, ORIGIN, "ar");
    expect(row.meta).toBe("14 عضوًا، ترتيبك 3");
    expect(row.accessibilityLabel).toContain("المباراة القادمة");
  });
});

describe("publicGroupRowView", () => {
  const [open, approval, requested] = fixtures.publicGroups;

  it("offers Join on an open Group", () => {
    const row = publicGroupRowView(open!, null, ORIGIN, "en");
    expect(row).toMatchObject({
      joinLabel: "Join",
      joinDisabled: false,
      joinOutlined: false,
      door: "joinPublic",
    });
  });

  it("carries the sport word for the row", () => {
    expect(publicGroupRowView(open!, null, ORIGIN, "en")).toMatchObject({
      sportLabel: "Padel",
    });
    expect(publicGroupRowView(requested!, null, ORIGIN, "en").sportLabel).toBe(
      "Football",
    );
  });

  it("offers Request to join when approval is required", () => {
    const row = publicGroupRowView(approval!, null, ORIGIN, "en");
    expect(row).toMatchObject({
      joinLabel: "Request to join",
      joinOutlined: true,
      door: "requestJoin",
      subtitle: "Södermalm Padel",
      meta: "9 members · Requires approval",
    });
  });

  it("disables a requested Group and marks only the pending row", () => {
    expect(publicGroupRowView(requested!, null, ORIGIN, "en")).toMatchObject({
      joinLabel: "Requested",
      joinDisabled: true,
      door: null,
    });
    expect(publicGroupRowView(open!, open!.id, ORIGIN, "en")).toMatchObject({
      joinLabel: "Joining…",
      joinDisabled: true,
    });
    expect(publicGroupRowView(open!, "other", ORIGIN, "en").joinLabel).toBe(
      "Join",
    );
  });
});

describe("groupPath", () => {
  it("opens the Group home", () => {
    expect(groupPath("g1")).toBe("/groups/g1");
  });
});

describe("groupSeasonsPath", () => {
  it("opens the Group's Seasons and the new Season form", () => {
    expect(groupSeasonsPath("g1")).toEqual({
      pathname: "/groups/seasons",
      params: { groupId: "g1" },
    });
    expect(groupNewSeasonPath("g1")).toEqual({
      pathname: "/groups/new-season",
      params: { groupId: "g1" },
    });
  });
});

describe("groupRatingSettingsPath", () => {
  it("opens the Group's Rating settings", () => {
    expect(groupRatingSettingsPath("g1")).toEqual({
      pathname: "/groups/rating-settings",
      params: { groupId: "g1" },
    });
  });
});
