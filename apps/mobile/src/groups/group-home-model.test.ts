import { createGroupFixtures } from "@repo/domain/group-fixtures";
import { isolate } from "@repo/i18n/bidi";
import { describe, expect, it } from "vitest";

import {
  groupHomeHeader,
  groupJoinCta,
  memberIsRemovable,
  memberList,
  memberSheetView,
  standingRowView,
  standingStats,
} from "./group-home-model";

const ORIGIN = "https://api.example.com";
const { home } = createGroupFixtures(new Date("2026-03-10T12:00:00Z"));

describe("groupHomeHeader", () => {
  it("builds the meta line and resolves the image against the API origin", () => {
    expect(groupHomeHeader(home.member, ORIGIN, "en")).toEqual({
      name: "Bromma Tuesday",
      imageUri:
        "https://api.example.com/api/media/group-images/group-bromma/image?v=1",
      meta: "Padel, 4 members, since Jan",
    });
  });
});

describe("groupJoinCta", () => {
  it("has no button for a member", () => {
    expect(groupJoinCta(home.member, false, "en")).toBeNull();
  });

  it("joins an open Group", () => {
    expect(groupJoinCta(home.nonMemberJoin, false, "en")).toEqual({
      label: "Join Group",
      disabled: false,
      door: "joinPublic",
    });
  });

  it("requests when approval is required", () => {
    expect(groupJoinCta(home.nonMemberRequest, false, "en")).toEqual({
      label: "Request to join",
      disabled: false,
      door: "requestJoin",
    });
    expect(groupJoinCta(home.clubRequest, true, "en")).toMatchObject({
      label: "Requesting…",
      disabled: true,
    });
  });

  it("disables the button once requested", () => {
    expect(groupJoinCta(home.requested, false, "en")).toEqual({
      label: "Requested",
      disabled: true,
      door: null,
    });
  });
});

describe("standing rows", () => {
  const rows = home.member.standing.leaderboard.map((entry) =>
    standingRowView(entry, "en"),
  );

  it("keeps the server's order", () => {
    expect(rows.map((row) => row.position)).toEqual([1, 2, 3, 4]);
    expect(rows.map((row) => row.key)).toEqual([
      "ada",
      "kim",
      "viewer",
      "elin",
    ]);
  });

  it("names the viewer You and carries the 3/1/0 record", () => {
    expect(rows[2]).toMatchObject({
      name: "You",
      played: 6,
      wins: 3,
      draws: 0,
      losses: 3,
      points: 9,
      isViewer: true,
    });
    expect(rows[2]!.form).toHaveLength(5);
    expect(rows[2]!.accessibilityLabel).toContain("3–0–3 won drawn lost");
  });

  it("counts played Games and Games awaiting a score", () => {
    expect(standingStats(home.member, "en")).toEqual([
      { value: 7, label: "games played" },
      { value: 1, label: "awaiting score" },
    ]);
  });
});

describe("memberList", () => {
  const leaderboard = home.member.standing.leaderboard;

  it("shows no search for a small Group", () => {
    const list = memberList(leaderboard, "ada", ORIGIN, "en");
    expect(list.showSearch).toBe(false);
    expect(list.rows).toHaveLength(4);
  });

  it("filters by name once the Group has more than eight members", () => {
    const many = Array.from({ length: 9 }, (_, index) => ({
      ...leaderboard[0]!,
      userId: `u${index}`,
      name: index === 4 ? "Zed Zimmer" : `Player ${index}`,
    }));
    const list = memberList(many, "zed", ORIGIN, "en");
    expect(list.showSearch).toBe(true);
    expect(list.rows.map((row) => row.name)).toEqual(["Zed Zimmer"]);
    expect(memberList(many, "nobody", ORIGIN, "en").rows).toEqual([]);
  });

  it("captions the Organizer and speaks the Level", () => {
    const ada = memberList(leaderboard, "", ORIGIN, "en").rows[0]!;
    expect(ada.caption).toBe("Organizer");
    expect(ada.accessibilityLabel).toContain("Level B+");
    expect(memberList([], "", ORIGIN, "en").isEmpty).toBe(true);
  });

  it("orders by Level, highest first", () => {
    expect(
      memberList([...leaderboard].reverse(), "", ORIGIN, "en").rows.map(
        (row) => row.key,
      ),
    ).toEqual(["ada", "viewer", "kim", "elin"]);
  });
});

describe("memberList for a Level setter", () => {
  const leaderboard = home.member.standing.leaderboard;
  const withSet = {
    ...leaderboard[1]!,
    levelOverride: {
      setByName: "Sara Karlsson",
      setByIsViewer: false,
      createdAt: new Date("2026-03-07T12:00:00Z"),
      reason: "back_from_injury" as const,
    },
  };
  const members = [
    leaderboard[0]!,
    { ...leaderboard[2]!, isViewer: true },
    withSet,
  ];

  it("makes every row but the viewer's selectable", () => {
    const rows = memberList(members, "", ORIGIN, "en", true).rows;
    expect(rows.map((row) => row.selectable)).toEqual([true, false, true]);
    expect(
      memberList(members, "", ORIGIN, "en").rows.some((row) => row.selectable),
    ).toBe(false);
  });

  it("captions a member with a set only for a Level setter", () => {
    const [, , row] = memberList(members, "", ORIGIN, "en", true).rows;
    expect(row!.caption).toContain("Set by Sara K");
    expect(memberList(members, "", ORIGIN, "en").rows[2]!.caption).toBe(
      "Last Fri 7 Mar",
    );
  });

  it("speaks the Level with its Provisional state", () => {
    const provisional = {
      ...leaderboard[0]!,
      levelBand: "C2" as const,
      levelProvisional: true,
      level: "3.2",
    };
    const row = memberList([provisional], "", ORIGIN, "en").rows[0]!;
    expect(row.accessibilityLabel).toContain("Level C 3.2, still Provisional");
  });
});

describe("memberList with an Unclaimed player", () => {
  const leaderboard = home.member.standing.leaderboard;
  const unclaimed = {
    ...leaderboard[1]!,
    name: "Ali",
    unclaimed: true,
    phoneMasked: "+973 •••• 4408",
  };
  const members = [leaderboard[0]!, unclaimed];

  it("marks the row and lets only a Group approver select it to remove", () => {
    const approverRows = memberList(
      members,
      "",
      ORIGIN,
      "en",
      false,
      true,
    ).rows;
    expect(approverRows.map((row) => row.unclaimed)).toEqual([false, true]);
    expect(approverRows.map((row) => row.selectable)).toEqual([false, true]);
    expect(approverRows[1]!.caption).toContain(isolate("+973 •••• 4408"));
    expect(approverRows[1]!.accessibilityLabel).toContain("Not on Temba yet");
    expect(
      memberList(members, "", ORIGIN, "en").rows.some((row) => row.selectable),
    ).toBe(false);
    expect(memberIsRemovable(unclaimed, true)).toBe(true);
    expect(memberIsRemovable(unclaimed, false)).toBe(false);
    expect(memberIsRemovable(leaderboard[0]!, true)).toBe(false);
  });

  it("lets a Group approver remove any member but the Organizers by role", () => {
    const claimed = { ...leaderboard[1]!, unclaimed: false };
    expect(memberIsRemovable(claimed, true)).toBe(true);
    expect(
      memberIsRemovable(
        { ...claimed, isOrganizer: true, isAppointedOrganizer: false },
        true,
      ),
    ).toBe(false);
    expect(
      memberIsRemovable(
        { ...claimed, isOrganizer: true, isAppointedOrganizer: true },
        true,
      ),
    ).toBe(true);
    expect(memberIsRemovable({ ...claimed, isViewer: true }, true)).toBe(false);
  });

  it("marks the Standing row", () => {
    expect(standingRowView(unclaimed, "en").unclaimed).toBe(true);
    expect(standingRowView(leaderboard[0]!, "en").unclaimed).toBe(false);
  });
});

describe("memberSheetView", () => {
  const entry = {
    ...home.member.standing.leaderboard[1]!,
    name: "Ada Lindqvist",
    levelProvisional: true,
    ratedMatchCount: 1,
    levelOverride: {
      setByName: "Sara Karlsson",
      setByIsViewer: false,
      createdAt: new Date("2026-03-07T12:00:00Z"),
      reason: "back_from_injury" as const,
    },
  };

  it("carries the Provisional note, the latest set and the match count", () => {
    const view = memberSheetView(entry, "en");
    expect(view.provisionalNote).toBe(
      "This Level is still Provisional. Set it by hand if you know Ada plays at a different Level.",
    );
    expect(view.latestSet).toMatch(/^Set by Sara K, .*\. Back from injury$/);
    expect(view.summary).toMatch(/ · 1 Rated Match$/);
  });

  it("omits the Provisional note and latest set when there are none", () => {
    const view = memberSheetView(
      {
        ...entry,
        levelProvisional: false,
        levelOverride: null,
      },
      "en",
    );
    expect(view.provisionalNote).toBeNull();
    expect(view.latestSet).toBeNull();
    expect(view.summary).toBe("1 Rated Match");
  });

  it("reads the sheet in Arabic", () => {
    const view = memberSheetView(entry, "ar");
    expect(view.summary).toMatch(/ · مباراة مصنّفة واحدة$/);
    expect(view.provisionalNote).toContain("Ada");
    expect(view.latestSet).toMatch(/عائد من إصابة$/);
    expect(
      standingRowView(home.member.standing.leaderboard[2]!, "ar"),
    ).toMatchObject({
      name: "أنت",
    });
  });
});

describe("memberList with a sort and filter", () => {
  const base = home.member.standing.leaderboard[0]!;
  const now = new Date("2026-11-04T12:00:00Z");
  const member = (
    userId: string,
    name: string,
    lastPlayedAt: string | null,
    extra: Partial<typeof base> = {},
  ) => ({
    ...base,
    userId,
    name,
    isOrganizer: false,
    isViewer: false,
    unclaimed: false,
    lastPlayedAt: lastPlayedAt ? new Date(lastPlayedAt) : null,
    joinedAt: new Date("2026-09-06T09:00:00Z"),
    ...extra,
  });
  const members = [
    member("org", "ahmed-adesha", "2026-11-02T17:00:00Z", {
      isOrganizer: true,
    }),
    member("sayed", "sayed_ali", "2026-09-25T17:00:00Z"),
    member("yousif", "Yousif K", "2026-09-21T17:00:00Z"),
    member("abbas", "Abbas M", null, {
      unclaimed: true,
      joinedAt: new Date("2026-11-02T09:00:00Z"),
    }),
    ...Array.from({ length: 5 }, (_, index) =>
      member(`p${index}`, `Player ${index}`, "2026-10-28T17:00:00Z"),
    ),
  ];
  const lens = {
    sort: null,
    filter: null,
    showLevel: false,
    canManage: false,
    now,
  };

  it("defaults to Recently played with a caption to match", () => {
    const list = memberList(
      members,
      "",
      ORIGIN,
      "en",
      false,
      false,
      false,
      lens,
    );
    expect(list.sortLabel).toBe("Recently played");
    expect(list.rows[0]!.caption).toBe("Organizer, last Mon 2 Nov");
    expect(list.rows.at(-1)!.caption).toBe("No games yet, joined Mon 2 Nov");
    expect(list.countLine).toBe("9");
  });

  it("counts every filter and narrows to the picked one", () => {
    const list = memberList(members, "", ORIGIN, "en", false, false, false, {
      ...lens,
      filter: "inactive",
    });
    expect(list.filters.map((chip) => [chip.id, chip.count])).toEqual([
      ["all", 9],
      ["organizers", 1],
      ["active", 6],
      ["inactive", 2],
      ["noGames", 1],
    ]);
    expect(list.rows.map((row) => row.name)).toEqual(["sayed_ali", "Yousif K"]);
    expect(list.countLine).toBe("2 of 9");
    expect(list.filters.find((chip) => chip.selected)!.accessibilityLabel).toBe(
      "Inactive, 2 members",
    );
  });

  it("offers Not on Temba only to a manager and ignores it otherwise", () => {
    const hidden = memberList(members, "", ORIGIN, "en", false, false, false, {
      ...lens,
      filter: "notOnTemba",
    });
    expect(hidden.filters.some((chip) => chip.id === "notOnTemba")).toBe(false);
    expect(hidden.rows).toHaveLength(9);
    const managed = memberList(members, "", ORIGIN, "en", false, false, false, {
      ...lens,
      filter: "notOnTemba",
      canManage: true,
    });
    expect(managed.rows.map((row) => row.key)).toEqual(["abbas"]);
  });

  it("names the search and the filter when nobody matches", () => {
    const list = memberList(
      members,
      "yousif",
      ORIGIN,
      "en",
      false,
      false,
      false,
      {
        ...lens,
        filter: "noGames",
      },
    );
    expect(list.rows).toEqual([]);
    expect(list.countLine).toBe("0 of 9");
    expect(list.emptyText).toBe("Nobody matches “yousif” in No games.");
  });

  it("falls back to the default sort when Level is not offered", () => {
    const list = memberList(members, "", ORIGIN, "en", false, false, false, {
      ...lens,
      sort: "level",
    });
    expect(list.sortLabel).toBe("Recently played");
    expect(list.sorts.map((option) => option.id)).toEqual([
      "recent",
      "joined",
      "name",
    ]);
  });

  it("reads join dates for everyone under Recently joined", () => {
    const list = memberList(members, "", ORIGIN, "en", false, false, false, {
      ...lens,
      sort: "joined",
    });
    expect(list.rows[0]!.key).toBe("abbas");
    expect(list.rows.find((row) => row.key === "org")!.caption).toBe(
      "Organizer, joined Sun 6 Sep",
    );
  });
});

describe("memberList on a tier Group (screen 2b)", () => {
  const base = home.member.standing.leaderboard[0]!;
  const lens = {
    sort: null,
    filter: null,
    showLevel: false,
    showTier: true,
    canManage: false,
    now: new Date("2026-11-04T12:00:00Z"),
  };
  const member = (
    userId: string,
    name: string,
    tier: NonNullable<typeof base.tier>,
    isOrganizer = false,
  ) => ({ ...base, userId, name, isViewer: false, isOrganizer, tier });

  it("orders by tier and reads the fish, the band and the points", () => {
    const list = memberList(
      [
        member("khalid", "Khalid R", {
          band: null,
          place: null,
          points: null,
          provisional: true,
          gamesOfFive: 3,
        }),
        member(
          "hussain",
          "Hussain A",
          {
            band: "shark",
            place: 1,
            points: 1412,
            provisional: false,
            gamesOfFive: 5,
          },
          true,
        ),
      ],
      "",
      ORIGIN,
      "en",
      false,
      false,
      false,
      lens,
    );
    expect(list.sort).toBe("tier");
    expect(
      list.rows.map((row) => [row.name, row.caption, row.tier?.points]),
    ).toEqual([
      ["Hussain A", "Shark, organizer", "1,412"],
      ["Khalid R", "Provisional, 3 of 5 games", "no tier"],
    ]);
    expect(list.rows[0]?.tier?.cell).toEqual({
      kind: "fish",
      band: "shark",
      label: "Shark",
    });
    expect(list.rows[0]?.accessibilityLabel).toBe(
      "Hussain A. Shark, organizer. 1,412 tier points",
    );
  });
});
