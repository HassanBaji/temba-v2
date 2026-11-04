import { describe, expect, it } from "vitest";

import {
  asGroupMemberFilter,
  asGroupMemberSort,
  defaultGroupMemberSort,
  groupMemberFilters,
  groupMemberMatchesFilter,
  groupMemberSortCaption,
  groupMemberSorts,
  groupMemberTableCaption,
  groupMembersLegend,
  groupMembersLens,
  groupPendingInviteCaption,
  groupPendingInvitesTitle,
  sortGroupMembers,
  sortGroupMembersBy,
} from "./group-members-table";

const members = [
  { name: "Yousif", level: "3.4" },
  { name: "Ali", level: "4.1" },
  { name: "Jassim", level: null },
  { name: "Aradi", level: "3.0" },
  { name: "Mahdi", level: "4.1" },
];

const names = (rows: readonly { name: string }[]) =>
  rows.map((row) => row.name);

describe("sortGroupMembers", () => {
  it("sorts by Level, ties by name, with no Level last", () => {
    expect(names(sortGroupMembers(members))).toEqual([
      "Ali",
      "Mahdi",
      "Yousif",
      "Aradi",
      "Jassim",
    ]);
  });

  it("leaves the input untouched", () => {
    const before = names(members);
    sortGroupMembers(members);
    expect(names(members)).toEqual(before);
  });
});

describe("groupMemberTableCaption", () => {
  it("reads Organizer first", () => {
    expect(
      groupMemberTableCaption(
        {
          isOrganizer: true,
          lastPlayedAt: "2026-10-24T17:00:00Z",
          joinedAt: null,
        },
        "en",
      ),
    ).toBe("Organizer");
  });

  it("reads when the member last played, in Bahrain time", () => {
    expect(
      groupMemberTableCaption(
        {
          isOrganizer: false,
          lastPlayedAt: "2026-10-24T17:00:00Z",
          joinedAt: "2026-10-01T09:00:00Z",
        },
        "en",
      ),
    ).toBe("Last Sat 24 Oct");
  });

  it("falls back to the join date, then to nothing", () => {
    expect(
      groupMemberTableCaption(
        {
          isOrganizer: false,
          lastPlayedAt: null,
          joinedAt: new Date("2026-10-22T09:00:00Z"),
        },
        "en",
      ),
    ).toBe("Joined Thu 22 Oct");
    expect(
      groupMemberTableCaption(
        { isOrganizer: false, lastPlayedAt: null, joinedAt: null },
        "en",
      ),
    ).toBeNull();
  });

  it("reads in Arabic", () => {
    expect(
      groupMemberTableCaption(
        { isOrganizer: true, lastPlayedAt: null, joinedAt: null },
        "ar",
      ),
    ).toBe("المنظّم");
  });
});

describe("groupMembersLegend", () => {
  it("explains the hatch only on a Group with Levels", () => {
    expect(groupMembersLegend({ showLevel: true, locale: "en" })).toBe(
      "Hatched Levels are still Provisional.",
    );
    expect(groupMembersLegend({ showLevel: false, locale: "en" })).toBeNull();
  });
});

describe("groupPendingInvitesTitle", () => {
  it("pluralises invite", () => {
    expect(groupPendingInvitesTitle(1, "en")).toBe("1 invite pending");
    expect(groupPendingInvitesTitle(2, "en")).toBe("2 invites pending");
  });
});

describe("groupPendingInviteCaption", () => {
  it("reads the day the invite was sent", () => {
    expect(groupPendingInviteCaption("2026-10-26T08:00:00Z", "en")).toBe(
      "Invited Mon 26 Oct",
    );
    expect(groupPendingInviteCaption("not a date", "en")).toBeNull();
  });
});

const dated = [
  {
    name: "zuhair",
    level: "5.9",
    lastPlayedAt: "2026-10-28T17:00:00Z",
    joinedAt: "2026-10-01T09:00:00Z",
  },
  {
    name: "Ali",
    level: null,
    lastPlayedAt: "2026-11-02T17:00:00Z",
    joinedAt: "2026-10-01T09:00:00Z",
  },
  {
    name: "Abbas",
    level: null,
    lastPlayedAt: null,
    joinedAt: "2026-11-02T09:00:00Z",
  },
  {
    name: "talal",
    level: "4.4",
    lastPlayedAt: null,
    joinedAt: "2026-10-29T09:00:00Z",
  },
  {
    name: "Hassan",
    level: "6.1",
    lastPlayedAt: "2026-11-02T17:00:00Z",
    joinedAt: "2026-10-08T09:00:00Z",
  },
];

describe("groupMemberSorts", () => {
  it("offers Level and defaults to it only on a Group with Levels", () => {
    expect(groupMemberSorts(false)).toEqual(["recent", "joined", "name"]);
    expect(groupMemberSorts(true)).toContain("level");
    expect(defaultGroupMemberSort(false)).toBe("recent");
    expect(defaultGroupMemberSort(true)).toBe("level");
  });
});

describe("sortGroupMembersBy", () => {
  it("puts the latest game first, then the newest join, ties by name", () => {
    expect(names(sortGroupMembersBy(dated, "recent", "en"))).toEqual([
      "Hassan",
      "Ali",
      "zuhair",
      "Abbas",
      "talal",
    ]);
  });

  it("puts the newest member first", () => {
    expect(names(sortGroupMembersBy(dated, "joined", "en"))).toEqual([
      "Abbas",
      "talal",
      "Hassan",
      "Ali",
      "zuhair",
    ]);
  });

  it("sorts by name without regard to case", () => {
    expect(names(sortGroupMembersBy(dated, "name", "en"))).toEqual([
      "Abbas",
      "Ali",
      "Hassan",
      "talal",
      "zuhair",
    ]);
  });

  it("sorts by Level with no Level last", () => {
    expect(names(sortGroupMembersBy(dated, "level", "en"))).toEqual([
      "Hassan",
      "zuhair",
      "talal",
      "Abbas",
      "Ali",
    ]);
  });
});

describe("groupMemberMatchesFilter", () => {
  const now = new Date("2026-11-04T12:00:00Z");
  const member = (lastPlayedAt: string | null, extra = {}) => ({
    isOrganizer: false,
    unclaimed: false,
    lastPlayedAt,
    ...extra,
  });

  it("splits players into Active, Inactive and No games at 30 days", () => {
    const recent = member("2026-10-06T12:00:00Z");
    const stale = member("2026-10-04T12:00:00Z");
    const fresh = member(null);
    expect(groupMemberMatchesFilter(recent, "active", now)).toBe(true);
    expect(groupMemberMatchesFilter(recent, "inactive", now)).toBe(false);
    expect(groupMemberMatchesFilter(stale, "inactive", now)).toBe(true);
    expect(groupMemberMatchesFilter(stale, "active", now)).toBe(false);
    expect(groupMemberMatchesFilter(fresh, "noGames", now)).toBe(true);
    expect(groupMemberMatchesFilter(fresh, "active", now)).toBe(false);
    expect(groupMemberMatchesFilter(fresh, "inactive", now)).toBe(false);
  });

  it("matches Organizers and players Not on Temba", () => {
    const organizer = member(null, { isOrganizer: true });
    const unclaimed = member(null, { unclaimed: true });
    expect(groupMemberMatchesFilter(organizer, "organizers", now)).toBe(true);
    expect(groupMemberMatchesFilter(unclaimed, "organizers", now)).toBe(false);
    expect(groupMemberMatchesFilter(unclaimed, "notOnTemba", now)).toBe(true);
    expect(groupMemberMatchesFilter(organizer, "all", now)).toBe(true);
  });

  it("offers Not on Temba only to someone who manages the members", () => {
    expect(groupMemberFilters(false)).not.toContain("notOnTemba");
    expect(groupMemberFilters(true)).toContain("notOnTemba");
  });
});

describe("groupMemberSortCaption", () => {
  const organizer = {
    isOrganizer: true,
    lastPlayedAt: "2026-11-02T17:00:00Z",
    joinedAt: "2026-10-04T09:00:00Z",
  };
  const newcomer = {
    isOrganizer: false,
    lastPlayedAt: null,
    joinedAt: "2026-10-29T09:00:00Z",
  };

  it("reads the last game under Recently played", () => {
    expect(groupMemberSortCaption(organizer, "recent", "en")).toBe(
      "Organizer, last Mon 2 Nov",
    );
    expect(groupMemberSortCaption(newcomer, "recent", "en")).toBe(
      "No games yet, joined Thu 29 Oct",
    );
  });

  it("reads the join date for everyone under Recently joined", () => {
    expect(groupMemberSortCaption(organizer, "joined", "en")).toBe(
      "Organizer, joined Sun 4 Oct",
    );
    expect(groupMemberSortCaption(newcomer, "joined", "en")).toBe(
      "Joined Thu 29 Oct",
    );
  });

  it("keeps the table caption under Name and Level", () => {
    expect(groupMemberSortCaption(organizer, "name", "en")).toBe("Organizer");
    expect(groupMemberSortCaption(newcomer, "level", "en")).toBe(
      "Joined Thu 29 Oct",
    );
  });

  it("reads in Arabic", () => {
    expect(groupMemberSortCaption(organizer, "joined", "ar")).toContain(
      "المنظّم، انضم",
    );
  });
});

describe("groupMembersLens", () => {
  const now = new Date("2026-11-04T12:00:00Z");
  const member = (
    name: string,
    lastPlayedAt: string | null,
    extra: { isOrganizer?: boolean; unclaimed?: boolean } = {},
  ) => ({
    name,
    level: null,
    lastPlayedAt,
    joinedAt: "2026-09-06T09:00:00Z",
    isOrganizer: false,
    unclaimed: false,
    ...extra,
  });
  const members = [
    member("ahmed", "2026-11-02T17:00:00Z", { isOrganizer: true }),
    member("sayed", "2026-09-25T17:00:00Z"),
    member("Yousif", "2026-09-21T17:00:00Z"),
    member("Abbas", null, { unclaimed: true }),
    ...Array.from({ length: 5 }, (_, index) =>
      member(`Player ${index}`, "2026-10-28T17:00:00Z"),
    ),
  ];
  const input = {
    query: "",
    sort: null,
    filter: null,
    showLevel: false,
    canManage: true,
    now,
    locale: "en" as const,
  };

  it("counts every filter and narrows to the picked one", () => {
    const view = groupMembersLens(members, { ...input, filter: "inactive" });
    expect(view.filters.map((chip) => [chip.id, chip.count])).toEqual([
      ["all", 9],
      ["organizers", 1],
      ["active", 6],
      ["inactive", 2],
      ["noGames", 1],
      ["notOnTemba", 1],
    ]);
    expect(view.rows.map((row) => row.name)).toEqual(["sayed", "Yousif"]);
    expect(view.countLine).toBe("2 of 9");
  });

  it("names the search and filter when nobody matches", () => {
    const view = groupMembersLens(members, {
      ...input,
      query: " yousif ",
      filter: "noGames",
    });
    expect(view.rows).toEqual([]);
    expect(view.emptyText).toBe("Nobody matches “yousif” in No games.");
    expect(
      groupMembersLens(members, { ...input, filter: "organizers", query: "x" })
        .emptyText,
    ).toBe("Nobody matches “x” in Organizers.");
    expect(groupMembersLens(members, { ...input, query: "zz" }).emptyText).toBe(
      "Nobody matches “zz”.",
    );
  });

  it("falls back to the defaults for a pick not on offer", () => {
    const view = groupMembersLens(members, {
      ...input,
      sort: "level",
      filter: "notOnTemba",
      canManage: false,
    });
    expect(view.sort).toBe("recent");
    expect(view.filter).toBe("all");
    expect(view.sortLabel).toBe("Recently played");
    expect(view.countLine).toBe("9");
  });

  it("hides the controls and ignores the picks on a small Group", () => {
    const view = groupMembersLens(members.slice(0, 4), {
      ...input,
      query: "ahmed",
      sort: "name",
      filter: "inactive",
    });
    expect(view.showControls).toBe(false);
    expect(view.sort).toBe("recent");
    expect(view.rows).toHaveLength(4);
  });
});

describe("stored lens values", () => {
  it("keeps only known sorts and filters", () => {
    expect(asGroupMemberSort("joined")).toBe("joined");
    expect(asGroupMemberSort("wins")).toBeNull();
    expect(asGroupMemberFilter("noGames")).toBe("noGames");
    expect(asGroupMemberFilter(3)).toBeNull();
  });
});
