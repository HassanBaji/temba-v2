import { describe, expect, it } from "vitest";

import {
  GROUP_HISTORY_PAGE_SIZE,
  groupArchiveGamesCopy,
  groupDisplayName,
  groupGamesEmptyDescription,
  groupHomeCanJoin,
  groupHistoryCanLoadMore,
  groupHistoryPageExhausted,
  groupHomeBanner,
  groupHomeJoinDoor,
  groupJoinDisabled,
  groupJoinLabel,
  groupJoinToast,
  groupLeaveToast,
  groupHasGames,
  groupStandingState,
  publicGroupJoinDoor,
  publicGroupMetaLine,
} from "./group-join";

describe("groupJoinLabel", () => {
  it("reads Requested once a request is open", () => {
    expect(groupJoinLabel("requested", false, "row", "en")).toBe("Requested");
    expect(groupJoinLabel("requested", true, "home", "en")).toBe("Requested");
  });

  it("names the request and join actions with their pending forms", () => {
    expect(groupJoinLabel("request", false, "row", "en")).toBe(
      "Request to join",
    );
    expect(groupJoinLabel("request", true, "row", "en")).toBe("Requesting…");
    expect(groupJoinLabel("join", false, "row", "en")).toBe("Join");
    expect(groupJoinLabel("join", false, "home", "en")).toBe("Join Group");
    expect(groupJoinLabel("join", true, "home", "en")).toBe("Joining…");
  });

  it("reads in Arabic", () => {
    expect(groupJoinLabel("join", false, "home", "ar")).toBe(
      "انضم إلى المجموعة",
    );
  });
});

describe("groupJoinDisabled", () => {
  it("disables a requested Group and any pending join", () => {
    expect(groupJoinDisabled("requested", false)).toBe(true);
    expect(groupJoinDisabled("join", true)).toBe(true);
    expect(groupJoinDisabled("request", false)).toBe(false);
  });
});

describe("publicGroupJoinDoor", () => {
  it("joins a Club Group through its Community door", () => {
    expect(
      publicGroupJoinDoor({ joinMode: "join", communityName: "Bromma" }),
    ).toBe("joinClubPublic");
  });

  it("joins a Loose Group through the Loose door", () => {
    expect(publicGroupJoinDoor({ joinMode: "join", communityName: null })).toBe(
      "joinLoosePublic",
    );
  });

  it("requests when approval is required and does nothing once requested", () => {
    expect(
      publicGroupJoinDoor({ joinMode: "request", communityName: null }),
    ).toBe("requestJoin");
    expect(
      publicGroupJoinDoor({ joinMode: "requested", communityName: null }),
    ).toBeNull();
  });
});

describe("groupHomeJoinDoor", () => {
  it("requests before it joins", () => {
    expect(
      groupHomeJoinDoor({
        joinMode: "request",
        canJoinLoosePublic: false,
        canJoinClubPublic: false,
      }),
    ).toBe("requestJoin");
  });

  it("picks the Loose or Club door from the join flags", () => {
    expect(
      groupHomeJoinDoor({
        joinMode: "join",
        canJoinLoosePublic: true,
        canJoinClubPublic: false,
      }),
    ).toBe("joinLoosePublic");
    expect(
      groupHomeJoinDoor({
        joinMode: "join",
        canJoinLoosePublic: false,
        canJoinClubPublic: true,
      }),
    ).toBe("joinClubPublic");
  });

  it("has no door when the viewer cannot join", () => {
    expect(
      groupHomeJoinDoor({
        joinMode: "member",
        canJoinLoosePublic: false,
        canJoinClubPublic: false,
      }),
    ).toBeNull();
  });
});

describe("toasts and copy", () => {
  it("confirms the join or the request", () => {
    expect(groupJoinToast("requestJoin", "en")).toBe("Requested to join");
    expect(groupJoinToast("joinLoosePublic", "en")).toBe("Joined Group");
  });

  it("says the viewer remains in the Community after leaving a Club Group", () => {
    expect(groupLeaveToast("c1", "en")).toBe(
      "Left Group — you remain in the Community",
    );
    expect(groupLeaveToast(null, "en")).toBe("Left Group");
  });

  it("falls back for an unnamed Group", () => {
    expect(groupDisplayName(null, "en")).toBe("Untitled Group");
    expect(groupDisplayName("Bromma", "en")).toBe("Bromma");
    expect(groupDisplayName(null, "ar")).toBe("مجموعة بلا اسم");
  });

  it("adds the approval note to the member count", () => {
    expect(
      publicGroupMetaLine({
        memberCountLabel: "3 members",
        requiresApproval: true,
        locale: "en",
      }),
    ).toBe("3 members · Requires approval");
    expect(
      publicGroupMetaLine({
        memberCountLabel: "3 members",
        requiresApproval: false,
        locale: "en",
      }),
    ).toBe("3 members");
  });
});

describe("groupHomeBanner", () => {
  const base = {
    isCommunityArchived: false,
    hasCommunityMembership: false,
    communityId: "c1",
    communityName: "Bromma",
    joinMode: "join",
    locale: "en" as const,
  };

  it("explains an archived Community to a non-member", () => {
    expect(
      groupHomeBanner({ ...base, isCommunityArchived: true })?.heading,
    ).toBe("This Club Group's Community is Soft-archived");
  });

  it("explains an archived Community to a member", () => {
    expect(
      groupHomeBanner({
        ...base,
        isCommunityArchived: true,
        hasCommunityMembership: true,
      })?.heading,
    ).toBe("Community Soft-archived");
  });

  it("warns that approval also joins the Community", () => {
    expect(groupHomeBanner({ ...base, joinMode: "request" })).toEqual({
      heading: null,
      body: "If approved, you also become a Member of Bromma.",
    });
  });

  it("shows nothing otherwise", () => {
    expect(groupHomeBanner(base)).toBeNull();
    expect(groupHomeBanner({ ...base, communityId: null })).toBeNull();
  });
});

describe("groupStandingState", () => {
  const played = { played: 1 };
  const unplayed = { played: 0 };
  const member = { isMember: true, hasGames: true };

  it("asks a non-member to join", () => {
    expect(
      groupStandingState({ ...member, isMember: false, leaderboard: [played] }),
    ).toEqual({ kind: "not-member" });
  });

  it("shows the table without a notice once there are results", () => {
    expect(groupStandingState({ ...member, leaderboard: [played] })).toEqual({
      kind: "standing",
      showNoResultsNotice: false,
      showTable: true,
      showCreateFirstGame: false,
    });
  });

  it("keeps the table and adds the notice before the first result", () => {
    expect(
      groupStandingState({ ...member, leaderboard: [unplayed] }),
    ).toMatchObject({ showNoResultsNotice: true, showTable: true });
    expect(groupStandingState({ ...member, leaderboard: [] })).toMatchObject({
      showNoResultsNotice: true,
      showTable: false,
    });
  });

  it("offers the first Game only while the Group has no Games", () => {
    expect(
      groupStandingState({ ...member, hasGames: false, leaderboard: [] }),
    ).toMatchObject({ showCreateFirstGame: true });
    expect(
      groupStandingState({ ...member, leaderboard: [unplayed] }),
    ).toMatchObject({ showCreateFirstGame: false });
  });
});

describe("groupHasGames", () => {
  it("counts upcoming and past Games", () => {
    expect(groupHasGames({ upcomingGames: [], gameHistory: [] })).toBe(false);
    expect(groupHasGames({ upcomingGames: [{}], gameHistory: [] })).toBe(true);
    expect(groupHasGames({ upcomingGames: [], gameHistory: [{}] })).toBe(true);
  });
});

describe("Game history paging", () => {
  it("offers more only after a full page", () => {
    expect(groupHistoryCanLoadMore({ loadedCount: 0, exhausted: false })).toBe(
      false,
    );
    expect(
      groupHistoryCanLoadMore({
        loadedCount: GROUP_HISTORY_PAGE_SIZE,
        exhausted: false,
      }),
    ).toBe(true);
    expect(groupHistoryCanLoadMore({ loadedCount: 7, exhausted: false })).toBe(
      false,
    );
    expect(
      groupHistoryCanLoadMore({
        loadedCount: GROUP_HISTORY_PAGE_SIZE * 2,
        exhausted: true,
      }),
    ).toBe(false);
  });

  it("is exhausted by a short page", () => {
    expect(groupHistoryPageExhausted(GROUP_HISTORY_PAGE_SIZE)).toBe(false);
    expect(groupHistoryPageExhausted(GROUP_HISTORY_PAGE_SIZE - 1)).toBe(true);
  });
});

describe("groupHomeCanJoin", () => {
  it("is true for the three join modes only", () => {
    expect(groupHomeCanJoin("join")).toBe(true);
    expect(groupHomeCanJoin("request")).toBe(true);
    expect(groupHomeCanJoin("requested")).toBe(true);
    expect(groupHomeCanJoin("member")).toBe(false);
    expect(groupHomeCanJoin("none")).toBe(false);
  });
});

describe("groupGamesEmptyDescription", () => {
  it("explains the archive freeze on an archived Community", () => {
    expect(groupGamesEmptyDescription(true, "en")).toBe(
      groupArchiveGamesCopy("en"),
    );
    expect(groupGamesEmptyDescription(false, "en")).toContain("live window");
  });
});
