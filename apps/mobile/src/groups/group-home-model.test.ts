import { createGroupFixtures } from "@repo/domain/group-fixtures";
import { describe, expect, it } from "vitest";

import {
  groupBanner,
  groupHomeHeader,
  groupJoinCta,
  memberList,
  memberSheetView,
  playedRowView,
  standingRowView,
  standingStats,
} from "./group-home-model";

const ORIGIN = "https://api.example.com";
const { home } = createGroupFixtures(new Date("2026-03-10T12:00:00Z"));

describe("groupHomeHeader", () => {
  it("builds the meta line and resolves the image against the API origin", () => {
    expect(groupHomeHeader(home.member, ORIGIN)).toEqual({
      name: "Bromma Tuesday",
      imageUri:
        "https://api.example.com/api/media/group-images/group-bromma/image?v=1",
      meta: "Padel, 4 members, season since Jan",
    });
  });
});

describe("groupJoinCta", () => {
  it("has no button for a member", () => {
    expect(groupJoinCta(home.member, false)).toBeNull();
  });

  it("joins an open Group", () => {
    expect(groupJoinCta(home.nonMemberJoin, false)).toEqual({
      label: "Join Group",
      disabled: false,
      door: "joinLoosePublic",
    });
  });

  it("requests when approval is required", () => {
    expect(groupJoinCta(home.nonMemberRequest, false)).toEqual({
      label: "Request to join",
      disabled: false,
      door: "requestJoin",
    });
    expect(groupJoinCta(home.clubRequest, true)).toMatchObject({
      label: "Requesting…",
      disabled: true,
    });
  });

  it("disables the button once requested", () => {
    expect(groupJoinCta(home.requested, false)).toEqual({
      label: "Requested",
      disabled: true,
      door: null,
    });
  });
});

describe("groupBanner", () => {
  it("warns that a Club request also joins the Community", () => {
    expect(groupBanner(home.clubRequest)?.body).toBe(
      "If approved, you also become a Member of Södermalm Padel.",
    );
  });

  it("explains an archived Community", () => {
    expect(groupBanner(home.archivedClub)?.heading).toBe(
      "Community Soft-archived",
    );
  });

  it("is absent for a plain Loose Group", () => {
    expect(groupBanner(home.member)).toBeNull();
  });
});

describe("standing rows", () => {
  const rows = home.member.standing.leaderboard.map(standingRowView);

  it("keeps the server's order", () => {
    expect(rows.map((row) => row.position)).toEqual([1, 2, 3, 4]);
    expect(rows.map((row) => row.key)).toEqual([
      "ada",
      "kim",
      "viewer",
      "elin",
    ]);
  });

  it("names the viewer You and shows W-L", () => {
    expect(rows[2]).toMatchObject({
      name: "You",
      record: "3-3",
      isViewer: true,
    });
  });

  it("hatches a Provisional or missing Level and labels a settled one", () => {
    expect(rows[0]!.level).toEqual({ kind: "label", label: "B+" });
    expect(rows[2]!.level.kind).toBe("provisional");
    expect(rows[3]!.accessibilityLabel).toContain("Level still Provisional");
  });

  it("counts played Games and Games awaiting a score", () => {
    expect(standingStats(home.member)).toEqual([
      { value: 7, label: "games played" },
      { value: 1, label: "awaiting score" },
    ]);
  });
});

describe("playedRowView", () => {
  const [won, lost, unscored, cancelled] =
    home.member.gameHistory.map(playedRowView);

  it("reads the score from the viewer's side with the viewer first", () => {
    expect(won).toMatchObject({
      mark: "won",
      title: "You, Ada L",
      trailing: { kind: "score", text: "6-4 4-6 7-5" },
    });
    expect(lost).toMatchObject({
      mark: "lost",
      title: "You, Ada L",
      trailing: { kind: "score", text: "2-6 3-6" },
    });
  });

  it("offers Enter for a Match with no score", () => {
    expect(unscored).toMatchObject({
      mark: "not-played",
      trailing: { kind: "enter" },
    });
    expect(unscored!.accessibilityLabel).toContain("No score yet");
  });

  it("reads a cancelled Game as cancelled", () => {
    expect(cancelled!.trailing).toEqual({ kind: "cancelled" });
  });
});

describe("memberList", () => {
  const leaderboard = home.member.standing.leaderboard;

  it("shows no search for a small Group", () => {
    const list = memberList(leaderboard, "ada", ORIGIN);
    expect(list.showSearch).toBe(false);
    expect(list.rows).toHaveLength(4);
  });

  it("filters by name once the Group has more than eight members", () => {
    const many = Array.from({ length: 9 }, (_, index) => ({
      ...leaderboard[0]!,
      userId: `u${index}`,
      name: index === 4 ? "Zed Zimmer" : `Player ${index}`,
    }));
    const list = memberList(many, "zed", ORIGIN);
    expect(list.showSearch).toBe(true);
    expect(list.rows.map((row) => row.name)).toEqual(["Zed Zimmer"]);
    expect(memberList(many, "nobody", ORIGIN).rows).toEqual([]);
  });

  it("captions the Organizer and keeps the latest four form marks", () => {
    const ada = memberList(leaderboard, "", ORIGIN).rows[0]!;
    expect(ada.caption).toBe("Organizer");
    expect(ada.formMarks).toHaveLength(4);
    expect(memberList([], "", ORIGIN).isEmpty).toBe(true);
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
    const rows = memberList(members, "", ORIGIN, true).rows;
    expect(rows.map((row) => row.selectable)).toEqual([true, false, true]);
    expect(
      memberList(members, "", ORIGIN).rows.some((row) => row.selectable),
    ).toBe(false);
  });

  it("captions a member with a set only for a Level setter", () => {
    const [, , row] = memberList(members, "", ORIGIN, true).rows;
    expect(row!.caption).toContain("Set by Sara K");
    expect(memberList(members, "", ORIGIN).rows[2]!.caption).toBe(
      "Member since Feb",
    );
  });

  it("speaks the Level with its Provisional state", () => {
    const provisional = {
      ...leaderboard[0]!,
      levelBand: "C2" as const,
      levelProvisional: true,
      level: "3.2",
    };
    const row = memberList([provisional], "", ORIGIN).rows[0]!;
    expect(row.accessibilityLabel).toContain("Level C 3.2, still Provisional");
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
    const view = memberSheetView(entry);
    expect(view.provisionalNote).toBe(
      "This Level is still Provisional. Set it by hand if you know Ada plays at a different Level.",
    );
    expect(view.latestSet).toMatch(/^Set by Sara K, .*\. Back from injury$/);
    expect(view.summary).toMatch(/ · 1 Rated Match$/);
  });

  it("omits the Provisional note and latest set when there are none", () => {
    const view = memberSheetView({
      ...entry,
      levelProvisional: false,
      levelOverride: null,
    });
    expect(view.provisionalNote).toBeNull();
    expect(view.latestSet).toBeNull();
    expect(view.summary).toBe("1 Rated Match");
  });
});
