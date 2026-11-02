import { describe, expect, it } from "vitest";

import {
  groupMemberTableCaption,
  groupMembersLegend,
  groupPendingInviteCaption,
  groupPendingInvitesTitle,
  sortGroupMembers,
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
      groupMemberTableCaption({
        isOrganizer: true,
        lastPlayedAt: "2026-10-24T17:00:00Z",
        joinedAt: null,
      }),
    ).toBe("Organizer");
  });

  it("reads when the member last played, in Bahrain time", () => {
    expect(
      groupMemberTableCaption({
        isOrganizer: false,
        lastPlayedAt: "2026-10-24T17:00:00Z",
        joinedAt: "2026-10-01T09:00:00Z",
      }),
    ).toBe("Last Sat 24 Oct");
  });

  it("falls back to the join date, then to nothing", () => {
    expect(
      groupMemberTableCaption({
        isOrganizer: false,
        lastPlayedAt: null,
        joinedAt: new Date("2026-10-22T09:00:00Z"),
      }),
    ).toBe("Joined Thu 22 Oct");
    expect(
      groupMemberTableCaption({
        isOrganizer: false,
        lastPlayedAt: null,
        joinedAt: null,
      }),
    ).toBeNull();
  });
});

describe("groupMembersLegend", () => {
  it("explains the hatch only on a Group with Levels", () => {
    expect(groupMembersLegend({ showLevel: true })).toBe(
      "Hatched Levels are still Provisional.",
    );
    expect(groupMembersLegend({ showLevel: false })).toBeNull();
  });
});

describe("groupPendingInvitesTitle", () => {
  it("pluralises invite", () => {
    expect(groupPendingInvitesTitle(1)).toBe("1 invite pending");
    expect(groupPendingInvitesTitle(2)).toBe("2 invites pending");
  });
});

describe("groupPendingInviteCaption", () => {
  it("reads the day the invite was sent", () => {
    expect(groupPendingInviteCaption("2026-10-26T08:00:00Z")).toBe(
      "Invited Mon 26 Oct",
    );
    expect(groupPendingInviteCaption("not a date")).toBeNull();
  });
});
