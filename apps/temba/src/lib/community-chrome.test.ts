import { describe, expect, it } from "vitest";

import {
  clubGroupRowMetaLine,
  communityHomeMetaLine,
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

describe("communityHomeMetaLine", () => {
  it("reads visibility, sport, member count, and the viewer's role", () => {
    expect(
      communityHomeMetaLine({
        type: "public",
        sports: ["padel"],
        memberCount: 24,
        role: "admin",
      }),
    ).toBe("Public, Padel, 24 members, Admin");
  });

  it("joins two sports with and", () => {
    expect(
      communityHomeMetaLine({
        type: "private",
        sports: ["padel", "football"],
        memberCount: 1,
        role: "owner",
      }),
    ).toBe("Private, Padel and Football, 1 member, Owner");
  });

  it("drops the sport part when there are no sports", () => {
    expect(
      communityHomeMetaLine({
        type: "public",
        sports: [],
        memberCount: 3,
        role: "member",
      }),
    ).toBe("Public, 3 members, Member");
  });

  it("omits the role for a non-member", () => {
    expect(
      communityHomeMetaLine({
        type: "public",
        sports: ["padel"],
        memberCount: 12,
        role: null,
      }),
    ).toBe("Public, Padel, 12 members");
  });

  it("drops the member count when it is unknown", () => {
    expect(
      communityHomeMetaLine({
        type: "private",
        sports: [],
        memberCount: null,
        role: null,
      }),
    ).toBe("Private");
  });
});
