import { describe, expect, it } from "vitest";

import {
  communityClubGroupRow,
  communityHomeActions,
  communityHomeHeader,
  communityJoinRequestRow,
  communityMemberList,
  communityRequestsAreEmpty,
  communityRoleChangeAction,
  communityTabLabel,
  communityTeamLinkRequestRow,
  communityTeamRow,
} from "./community";
import { createCommunityFixtures } from "./community-fixtures";

const now = new Date("2026-03-10T12:00:00Z");
const fixtures = createCommunityFixtures(now);

describe("communityHomeHeader", () => {
  it("joins visibility, sport, members and role", () => {
    expect(communityHomeHeader(fixtures.home.owner).meta).toBe(
      "Public, Padel, 38 members, Owner",
    );
  });

  it("badges a pending join request only for a non-member", () => {
    expect(communityHomeHeader(fixtures.home.requestPending).badges).toEqual([
      "Join request pending",
    ]);
    expect(communityHomeHeader(fixtures.home.archivedMember).badges).toEqual([
      "Soft-archived",
    ]);
  });
});

describe("communityHomeActions", () => {
  it("needs the Group creator flag to create a Club Group", () => {
    expect(
      communityHomeActions(fixtures.home.owner, true).canCreateClubGroup,
    ).toBe(true);
    expect(
      communityHomeActions(fixtures.home.owner, false).canCreateClubGroup,
    ).toBe(false);
  });

  it("gives a plain Member only Leave", () => {
    expect(communityHomeActions(fixtures.home.member, true)).toEqual({
      canInvite: false,
      canCreateClubGroup: false,
      canUnarchive: false,
      canLeave: true,
      canSoftArchive: false,
    });
  });
});

describe("communityClubGroupRow", () => {
  it("names an unnamed Group and marks a joined one", () => {
    const rows = fixtures.home.owner.groups.map(communityClubGroupRow);
    expect(rows[0]?.accessibilityLabel).toBe(
      "Bromma Padel Club, Public, 14 members, Joined",
    );
    expect(rows[2]?.name).toBe("Untitled Group");
    expect(rows[2]?.meta).toBe("1 member");
  });
});

describe("communityTeamRow", () => {
  it("shows an open seat for a one-person Team", () => {
    expect(communityTeamRow(fixtures.home.owner.teams[0]!).openSeats).toBe(0);
    expect(communityTeamRow(fixtures.home.owner.teams[1]!).openSeats).toBe(1);
  });
});

describe("communityMemberList", () => {
  it("shows the viewer as You and falls back for a missing name", () => {
    const list = communityMemberList(fixtures.members, "viewer", "");
    expect(list.rows[0]?.displayName).toBe("You");
    expect(list.rows[3]?.name).toBe("Member");
    expect(list.showSearch).toBe(false);
  });

  it("searches only past eight members", () => {
    const many = Array.from({ length: 9 }, (_, index) => ({
      ...fixtures.members[2]!,
      id: `m${index}`,
      user: {
        ...fixtures.members[2]!.user,
        id: `u${index}`,
        name: `P${index}`,
      },
    }));
    const list = communityMemberList(many, "viewer", "p3");
    expect(list.showSearch).toBe(true);
    expect(list.rows.map((row) => row.name)).toEqual(["P3"]);
  });
});

describe("communityRoleChangeAction", () => {
  const base = { name: "Kim", isSelf: false };
  it("ignores an unchanged role", () => {
    expect(
      communityRoleChangeAction({ ...base, from: "member", to: "member" }),
    ).toBe("none");
  });
  it("confirms making an Owner or changing your own role", () => {
    expect(
      communityRoleChangeAction({ ...base, from: "member", to: "owner" }),
    ).toBe("confirm");
    expect(
      communityRoleChangeAction({
        ...base,
        isSelf: true,
        from: "owner",
        to: "admin",
      }),
    ).toBe("confirm");
  });
  it("applies a plain promotion at once", () => {
    expect(
      communityRoleChangeAction({ ...base, from: "member", to: "admin" }),
    ).toBe("apply");
  });
});

describe("request rows", () => {
  it("reads the requester and age", () => {
    expect(communityJoinRequestRow(fixtures.joinRequests[0]!, now).meta).toBe(
      "Requested 3 days ago",
    );
    expect(communityJoinRequestRow(fixtures.joinRequests[1]!).title).toBe(
      "User",
    );
    expect(
      communityTeamLinkRequestRow(fixtures.teamLinkRequests[0]!, now).meta,
    ).toContain("From Ada Lindqvist");
  });
});

describe("communityRequestsAreEmpty", () => {
  const base = {
    canManageJoinRequests: true,
    canManageTeamLinks: true,
    joinCount: 0,
    teamCount: 0,
    loading: false,
    failed: false,
  };
  it("is empty when every managed list is empty", () => {
    expect(communityRequestsAreEmpty(base)).toBe(true);
  });
  it("ignores a list the viewer cannot manage", () => {
    expect(
      communityRequestsAreEmpty({
        ...base,
        canManageTeamLinks: false,
        teamCount: undefined,
      }),
    ).toBe(true);
  });
  it("is not empty while loading, failed or populated", () => {
    expect(communityRequestsAreEmpty({ ...base, loading: true })).toBe(false);
    expect(communityRequestsAreEmpty({ ...base, failed: true })).toBe(false);
    expect(communityRequestsAreEmpty({ ...base, joinCount: 1 })).toBe(false);
    expect(communityRequestsAreEmpty({ ...base, joinCount: undefined })).toBe(
      false,
    );
  });
});

describe("communityTabLabel", () => {
  it("counts only the Requests tab", () => {
    expect(communityTabLabel("requests", 3)).toBe("Requests (3)");
    expect(communityTabLabel("requests", 0)).toBe("Requests");
    expect(communityTabLabel("members", 3)).toBe("Members");
  });
});
