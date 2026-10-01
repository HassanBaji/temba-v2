import { describe, expect, it } from "vitest";

import {
  clubGroupRowMetaLine,
  communityListMetaLine,
} from "~/lib/community-chrome";

describe("communityListMetaLine", () => {
  it("reads visibility, member count, and the viewer's role", () => {
    expect(
      communityListMetaLine({ type: "public", memberCount: 12, role: "owner" }),
    ).toBe("Public, 12 members, you are Owner");
  });

  it("pluralises member", () => {
    expect(
      communityListMetaLine({ type: "private", memberCount: 1, role: "owner" }),
    ).toBe("Private, 1 member, you are Owner");
    expect(
      communityListMetaLine({ type: "private", memberCount: 0, role: "owner" }),
    ).toBe("Private, 0 members, you are Owner");
  });

  it("names each role", () => {
    expect(
      communityListMetaLine({ type: "public", memberCount: 3, role: "admin" }),
    ).toBe("Public, 3 members, you are Admin");
    expect(
      communityListMetaLine({ type: "public", memberCount: 3, role: "member" }),
    ).toBe("Public, 3 members, you are Member");
  });
});

describe("clubGroupRowMetaLine", () => {
  it("reads visibility and member count", () => {
    expect(clubGroupRowMetaLine({ type: "public", memberCount: 8 })).toBe(
      "Public, 8 members",
    );
    expect(clubGroupRowMetaLine({ type: "private", memberCount: 2 })).toBe(
      "Private, 2 members",
    );
  });

  it("pluralises member", () => {
    expect(clubGroupRowMetaLine({ type: "public", memberCount: 1 })).toBe(
      "Public, 1 member",
    );
    expect(clubGroupRowMetaLine({ type: "private", memberCount: 0 })).toBe(
      "Private, 0 members",
    );
  });

  it("drops the visibility when the Group has no type", () => {
    expect(clubGroupRowMetaLine({ type: null, memberCount: 4 })).toBe(
      "4 members",
    );
  });
});
