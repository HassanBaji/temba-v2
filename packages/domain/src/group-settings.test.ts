import { describe, expect, it } from "vitest";

import {
  groupDeleteNameMatches,
  groupDeleteSheetCopy,
  groupEditCanSave,
  groupEditChanges,
  groupJoiningFooter,
  groupJoiningToggleHelp,
  groupMenuItems,
  groupMenuRoleLine,
  groupSeasonCount,
  groupTransferCandidates,
  groupTransferConfirmLabel,
  groupOwnershipTransferredToast,
  type GroupEditFields,
} from "./group-settings";

describe("groupMenuItems", () => {
  it("gives the owner every door and a member only Leave", () => {
    expect(
      groupMenuItems({
        isMember: true,
        canEdit: true,
        canInvite: true,
        canCopyLink: true,
      }),
    ).toEqual(["edit", "invite", "copy_link", "leave"]);
    expect(
      groupMenuItems({
        isMember: true,
        canEdit: false,
        canInvite: false,
        canCopyLink: false,
      }),
    ).toEqual(["leave"]);
  });

  it("is empty for someone outside the Group with no powers", () => {
    expect(
      groupMenuItems({
        isMember: false,
        canEdit: false,
        canInvite: false,
        canCopyLink: false,
      }),
    ).toEqual([]);
  });
});

describe("groupMenuRoleLine", () => {
  it("names the viewer's standing in the Group", () => {
    expect(
      groupMenuRoleLine({
        isOwner: true,
        isOrganizer: true,
        isMember: true,
        locale: "en",
      }),
    ).toBe("You own this Group");
    expect(
      groupMenuRoleLine({
        isOwner: false,
        isOrganizer: true,
        isMember: true,
        locale: "en",
      }),
    ).toBe("You organize this Group");
    expect(
      groupMenuRoleLine({
        isOwner: false,
        isOrganizer: false,
        isMember: true,
        locale: "en",
      }),
    ).toBe("You are a member");
    expect(
      groupMenuRoleLine({
        isOwner: false,
        isOrganizer: false,
        isMember: false,
        locale: "en",
      }),
    ).toBeNull();
  });

  it("reads in Arabic", () => {
    expect(
      groupMenuRoleLine({
        isOwner: true,
        isOrganizer: true,
        isMember: true,
        locale: "ar",
      }),
    ).toBe("أنت مالك هذه المجموعة");
  });
});

describe("groupEditChanges", () => {
  const initial: GroupEditFields = {
    name: "Gooz of Arad",
    sport: "football",
    visibility: "public",
    requiresApproval: true,
  };

  it("is null while nothing differs, including whitespace-only name edits", () => {
    expect(groupEditChanges(initial, initial)).toBeNull();
    expect(
      groupEditChanges(initial, { ...initial, name: "  Gooz of Arad " }),
    ).toBeNull();
    expect(groupEditCanSave(initial, initial)).toBe(false);
  });

  it("sends only the fields that changed", () => {
    expect(groupEditChanges(initial, { ...initial, name: "Arad FC" })).toEqual({
      name: "Arad FC",
    });
    expect(
      groupEditChanges(initial, { ...initial, requiresApproval: false }),
    ).toEqual({ requiresApproval: false });
    expect(groupEditChanges(initial, { ...initial, sport: "padel" })).toEqual({
      sport: "padel",
    });
  });

  it("turns approval off when the Group goes Private", () => {
    expect(
      groupEditChanges(initial, { ...initial, visibility: "private" }),
    ).toEqual({ type: "private", requiresApproval: false });
  });

  it("cannot save an empty name", () => {
    expect(groupEditCanSave(initial, { ...initial, name: "   " })).toBe(false);
    expect(groupEditCanSave(initial, { ...initial, name: "Arad" })).toBe(true);
  });
});

describe("joining copy", () => {
  it("counts the requests waiting", () => {
    expect(groupJoiningToggleHelp(0, "en")).toBe(
      "Anyone who finds the Group joins instantly.",
    );
    expect(groupJoiningToggleHelp(1, "en")).toBe(
      "1 request waiting on Group home.",
    );
    expect(groupJoiningToggleHelp(2, "en")).toBe(
      "2 requests waiting on Group home.",
    );
  });

  it("states the policy in the footer", () => {
    expect(
      groupJoiningFooter({
        visibility: "public",
        requiresApproval: false,
        locale: "en",
      }),
    ).toBe("Anyone can find the Group and joins instantly.");
    expect(
      groupJoiningFooter({
        visibility: "public",
        requiresApproval: true,
        locale: "en",
      }),
    ).toContain("waits for your approval");
    expect(
      groupJoiningFooter({
        visibility: "private",
        requiresApproval: true,
        locale: "en",
      }),
    ).toBe("Only people you invite can join.");
  });
});

describe("delete sheet", () => {
  it("counts seasons from the Group's first month, at least one", () => {
    const now = new Date("2026-11-01T00:00:00Z");
    expect(groupSeasonCount(new Date("2026-10-03T00:00:00Z"), now)).toBe(1);
    expect(groupSeasonCount(new Date("2025-10-03T00:00:00Z"), now)).toBe(2);
    expect(groupSeasonCount(null, now)).toBe(1);
  });

  it("lays out the stats and the confirmation prompt", () => {
    const copy = groupDeleteSheetCopy({
      name: "Gooz of Arad",
      gameCount: 12,
      memberCount: 8,
      seasonCount: 1,
      locale: "en",
    });
    expect(copy.title).toBe("Delete Gooz of Arad?");
    expect(copy.stats).toEqual([
      { value: 12, label: "Games" },
      { value: 8, label: "members" },
      { value: 1, label: "season" },
    ]);
    expect(copy.description).toContain("stay in each player's history");
  });

  it("matches the typed name ignoring case and whitespace", () => {
    expect(groupDeleteNameMatches("Gooz of Arad", " gooz OF arad ", "en")).toBe(
      true,
    );
    expect(groupDeleteNameMatches("Gooz of Arad", "Gooz", "en")).toBe(false);
    expect(groupDeleteNameMatches(null, "Untitled Group", "en")).toBe(true);
  });
});

describe("transfer ownership", () => {
  it("offers signed-up members other than the viewer", () => {
    expect(
      groupTransferCandidates([
        { userId: "me", isViewer: true, unclaimed: false },
        { userId: "ali", isViewer: false, unclaimed: false },
        { userId: "ghost", isViewer: false, unclaimed: true },
      ]).map((member) => member.userId),
    ).toEqual(["ali"]);
  });

  it("names the pick on the confirm button", () => {
    expect(groupTransferConfirmLabel(null, "en")).toBe("Transfer ownership");
    expect(groupTransferConfirmLabel("Ali Haji", "en")).toBe(
      "Transfer to Ali H",
    );
    expect(
      groupOwnershipTransferredToast("Ali Haji", "Gooz of Arad", "en"),
    ).toBe("Ali Haji now owns Gooz of Arad");
  });
});
