import { describe, expect, it } from "vitest";

import {
  asGroupMemberFilter,
  asGroupMemberSort,
  defaultGroupMemberSort,
  formatTierPoints,
  groupMemberFilters,
  groupMemberMatchesFilter,
  groupMemberSortCaption,
  groupMemberSorts,
  groupMemberTableCaption,
  groupMemberTierView,
  groupMembersLegend,
  groupMembersLens,
  groupPendingInviteCaption,
  groupPendingInvitesTitle,
  groupTierProvisionalLine,
  groupTierSharkCard,
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

  it("orders a football Group by the OVR it shows", () => {
    const football = [
      { name: "Ali", level: "3.7", ovr: 71 },
      { name: "Yousif", level: "3.7", ovr: 72 },
      { name: "Jassim", level: null, ovr: null },
      { name: "Mahdi", level: "4.1", ovr: 75 },
      { name: "Aradi", level: "3.7", ovr: 71 },
    ];
    expect(names(sortGroupMembers(football))).toEqual([
      "Mahdi",
      "Yousif",
      "Ali",
      "Aradi",
      "Jassim",
    ]);
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

describe("a tier Group's Members table (screen 2b)", () => {
  const ranked = (place: number, band: "shark" | "hamour" | null) => ({
    band,
    place,
    points: 1412,
    provisional: false,
    gamesOfFive: 5,
  });

  it("orders by tier by default: places first, then Provisional by games", () => {
    expect(groupMemberSorts(false, true)).toEqual([
      "tier",
      "recent",
      "joined",
      "name",
    ]);
    expect(defaultGroupMemberSort(false, true)).toBe("tier");
    const rows = sortGroupMembersBy(
      [
        {
          name: "Majed",
          level: null,
          lastPlayedAt: null,
          joinedAt: null,
          tier: {
            ...ranked(0, null),
            place: null,
            provisional: true,
            gamesOfFive: 1,
          },
        },
        {
          name: "Ali",
          level: null,
          lastPlayedAt: null,
          joinedAt: null,
          tier: ranked(2, "hamour"),
        },
        {
          name: "Khalid",
          level: null,
          lastPlayedAt: null,
          joinedAt: null,
          tier: {
            ...ranked(0, null),
            place: null,
            provisional: true,
            gamesOfFive: 3,
          },
        },
        {
          name: "Hussain",
          level: null,
          lastPlayedAt: null,
          joinedAt: null,
          tier: ranked(1, "shark"),
        },
      ],
      "tier",
      "en",
    );
    expect(names(rows)).toEqual(["Hussain", "Ali", "Khalid", "Majed"]);
  });

  it("reads a fish, a place or a hatched Provisional slot", () => {
    expect(
      groupMemberTierView(
        { tier: ranked(1, "shark"), isOrganizer: true },
        "en",
      ),
    ).toMatchObject({
      cell: { kind: "fish", band: "shark", label: "Shark" },
      caption: "Shark, organizer",
      points: "1,412",
      pointsMuted: false,
    });
    expect(
      groupMemberTierView({ tier: ranked(2, null), isOrganizer: false }, "en"),
    ).toMatchObject({ cell: { kind: "place", label: "#2" }, caption: null });
    expect(
      groupMemberTierView(
        {
          tier: {
            band: null,
            place: null,
            points: null,
            provisional: true,
            gamesOfFive: 3,
          },
          isOrganizer: false,
        },
        "en",
      ),
    ).toMatchObject({
      cell: { kind: "provisional" },
      caption: "Provisional, 3 of 5 games",
      points: "no tier",
      pointsMuted: true,
    });
    expect(groupMemberTierView({ isOrganizer: false }, "en")).toBeNull();
  });

  it("shows the Shark card and the footnote", () => {
    const now = new Date("2026-11-12T12:00:00Z");
    const summary = {
      shark: {
        userId: "hussain",
        name: "Hussain A",
        points: 1412,
        since: new Date(now.getTime() - 36 * 24 * 60 * 60 * 1000),
      },
      rankedCount: 11,
      provisionalCount: 2,
    };
    expect(groupTierSharkCard(summary, now, "en")).toEqual({
      title: "The Shark",
      name: "Hussain A",
      line: "1,412 points, top for 5 weeks",
      fishLabel: "Shark",
    });
    expect(
      groupTierSharkCard(
        { ...summary, shark: { ...summary.shark, since: null } },
        now,
        "en",
      )?.line,
    ).toBe("1,412 points");
    expect(
      groupTierSharkCard({ ...summary, shark: null }, now, "en"),
    ).toBeNull();
    expect(groupTierProvisionalLine(summary, "en")).toBe("2 still provisional");
    expect(
      groupMembersLegend({ showLevel: false, showTier: true, locale: "en" }),
    ).toMatch(/^Tier and points are this group’s own/);
  });

  it("groups thousands in Latin digits", () => {
    expect(formatTierPoints(1064)).toBe("1,064");
    expect(formatTierPoints(980)).toBe("980");
    expect(formatTierPoints(12_345)).toBe("12,345");
  });
});
