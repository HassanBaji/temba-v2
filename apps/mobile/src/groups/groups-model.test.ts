import { describe, expect, it } from "vitest";
import { createGroupFixtures } from "@repo/domain/group-fixtures";

import { groupPath, groupRowView, publicGroupRowView } from "./groups-model";

const ORIGIN = "https://api.example.com";
const fixtures = createGroupFixtures(new Date("2026-03-10T12:00:00Z"));

describe("groupRowView", () => {
  it("shows the viewer's rank, the next Game weekday and an absolute image", () => {
    const row = groupRowView(fixtures.mine[0]!, ORIGIN);
    expect(row.meta).toBe("14 members, you are rank 3");
    expect(row.nextGameWeekday).toBe("Thu");
    expect(row.imageUri).toBe(
      "https://api.example.com/api/media/group-images/group-bromma/image?v=1",
    );
    expect(row.accessibilityLabel).toBe(
      "Bromma Tuesday, 14 members, you are rank 3, next Game Thu",
    );
  });

  it("leaves rank and next Game out before the Group has either", () => {
    const row = groupRowView(fixtures.mine[1]!, ORIGIN);
    expect(row.meta).toBe("1 member");
    expect(row.nextGameWeekday).toBeNull();
    expect(row.accessibilityLabel).toContain("no Game scheduled");
  });

  it("names an unnamed Group", () => {
    expect(groupRowView(fixtures.mine[2]!, ORIGIN).name).toBe("Untitled Group");
  });
});

describe("publicGroupRowView", () => {
  const [open, approval, requested] = fixtures.publicGroups;

  it("offers Join on an open Group", () => {
    const row = publicGroupRowView(open!, null, ORIGIN);
    expect(row).toMatchObject({
      joinLabel: "Join",
      joinDisabled: false,
      joinOutlined: false,
      door: "joinLoosePublic",
    });
  });

  it("offers Request to join when approval is required", () => {
    const row = publicGroupRowView(approval!, null, ORIGIN);
    expect(row).toMatchObject({
      joinLabel: "Request to join",
      joinOutlined: true,
      door: "requestJoin",
      subtitle: "Södermalm Padel",
      meta: "9 members · Requires approval",
    });
  });

  it("disables a requested Group and marks only the pending row", () => {
    expect(publicGroupRowView(requested!, null, ORIGIN)).toMatchObject({
      joinLabel: "Requested",
      joinDisabled: true,
      door: null,
    });
    expect(publicGroupRowView(open!, open!.id, ORIGIN)).toMatchObject({
      joinLabel: "Joining…",
      joinDisabled: true,
    });
    expect(publicGroupRowView(open!, "other", ORIGIN).joinLabel).toBe("Join");
  });
});

describe("groupPath", () => {
  it("opens the Group home", () => {
    expect(groupPath("g1")).toBe("/groups/g1");
  });
});
