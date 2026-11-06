import { describe, expect, it } from "vitest";

import {
  GROUP_HISTORY_PAGE_SIZE,
  groupDisplayName,
  groupGamesEmptyDescription,
  groupHomeCanJoin,
  groupHistoryCanLoadMore,
  groupHistoryPageExhausted,
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
  it("joins a Public Group through the one join door", () => {
    expect(publicGroupJoinDoor({ joinMode: "join" })).toBe("joinPublic");
  });

  it("requests when approval is required and does nothing once requested", () => {
    expect(publicGroupJoinDoor({ joinMode: "request" })).toBe("requestJoin");
    expect(publicGroupJoinDoor({ joinMode: "requested" })).toBeNull();
  });
});

describe("groupHomeJoinDoor", () => {
  it("requests before it joins", () => {
    expect(
      groupHomeJoinDoor({
        joinMode: "request",
        canJoin: false,
      }),
    ).toBe("requestJoin");
  });

  it("picks the Loose or Club door from the join flags", () => {
    expect(
      groupHomeJoinDoor({
        joinMode: "join",
        canJoin: true,
      }),
    ).toBe("joinPublic");
  });

  it("has no door when the viewer cannot join", () => {
    expect(
      groupHomeJoinDoor({
        joinMode: "member",
        canJoin: false,
      }),
    ).toBeNull();
  });
});

describe("toasts and copy", () => {
  it("confirms the join or the request", () => {
    expect(groupJoinToast("requestJoin", "en")).toBe("Requested to join");
    expect(groupJoinToast("joinPublic", "en")).toBe("Joined Group");
  });

  it("confirms leaving a Group", () => {
    expect(groupLeaveToast("en")).toBe("Left Group");
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
  it("explains when a Game will appear", () => {
    expect(groupGamesEmptyDescription("en")).toContain("live window");
  });
});
