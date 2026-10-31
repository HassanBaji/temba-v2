import { describe, expect, it } from "vitest";

import {
  groupDeleteConfirm,
  groupJoinPolicyLine,
  groupJoinRequestDecidedToast,
  groupJoinRequestMeta,
  groupJoinRequestsBannerText,
  groupJoinRequestsHeading,
  groupJoinRequestsSummary,
  groupManageActions,
  groupRejectRequestCopy,
  groupRemoveImageConfirm,
  groupWhoCanJoinDescription,
} from "./group-admin";
import { groupHomeOverflowItems } from "./group-home-cta";

const now = new Date("2026-10-04T12:00:00Z");

describe("groupJoinRequestMeta", () => {
  const yesterday = new Date("2026-10-03T12:00:00Z");

  it("names who shared the invite link", () => {
    expect(
      groupJoinRequestMeta(
        {
          createdAt: yesterday,
          source: "invite_link",
          invitedBy: { id: "ali", name: "Ali Haji" },
        },
        null,
        now,
      ),
    ).toBe("Via invite link from Ali Haji, yesterday");
  });

  it("says the invite link alone when its sharer is gone", () => {
    expect(
      groupJoinRequestMeta(
        { createdAt: now, source: "invite_link", invitedBy: null },
        null,
        now,
      ),
    ).toBe("Via invite link, today");
  });

  it("names the Community the Group was found in", () => {
    expect(
      groupJoinRequestMeta(
        { createdAt: yesterday, source: "community", invitedBy: null },
        "Södermalm Padel",
        now,
      ),
    ).toBe("Found the Group in Södermalm Padel, yesterday");
  });

  it("falls back to when the request was made", () => {
    expect(
      groupJoinRequestMeta(
        { createdAt: now, source: null, invitedBy: null },
        null,
        now,
      ),
    ).toBe("Requested today");
    expect(
      groupJoinRequestMeta(
        { createdAt: now, source: "group_page", invitedBy: null },
        null,
        now,
      ),
    ).toBe("Requested today");
  });
});

describe("join request counts", () => {
  it("counts people in the banner and the card heading", () => {
    expect(groupJoinRequestsBannerText(1)).toBe("1 person wants to join");
    expect(groupJoinRequestsBannerText(3)).toBe("3 people want to join");
    expect(groupJoinRequestsHeading(1)).toBe("1 wants to join");
    expect(groupJoinRequestsHeading(3)).toBe("3 want to join");
  });
});

describe("groupJoinRequestsSummary", () => {
  it("states the approval policy and today's approvals", () => {
    expect(
      groupJoinRequestsSummary({ requiresApproval: true, approvedToday: 2 }),
    ).toEqual({
      title: "No requests waiting",
      line: "Organizers approve new members, 2 approved today",
    });
    expect(
      groupJoinRequestsSummary({ requiresApproval: true, approvedToday: 0 })
        .line,
    ).toBe("Organizers approve new members");
  });

  it("says joining is instant when approval is off", () => {
    expect(
      groupJoinRequestsSummary({ requiresApproval: false, approvedToday: 4 }),
    ).toEqual({
      title: "Anyone with the link can join",
      line: "Joins instantly, no review",
    });
    expect(groupJoinPolicyLine(false)).toBe("Anyone with the link can join");
    expect(groupJoinPolicyLine(true)).toBe("Organizers approve new members");
  });
});

describe("decision copy", () => {
  it("names the person in the reject sheet and each toast", () => {
    expect(groupRejectRequestCopy("omar.m").title).toBe("Reject omar.m?");
    expect(groupJoinRequestDecidedToast("Kareem", "approved")).toBe(
      "Kareem added to the Group",
    );
    expect(groupJoinRequestDecidedToast("Kareem", "rejected")).toBe(
      "Kareem rejected",
    );
    expect(groupJoinRequestDecidedToast("Kareem", "blocked")).toBe(
      "Kareem rejected and blocked",
    );
  });

  it("names the Community a Club Group lives in", () => {
    expect(groupWhoCanJoinDescription("Arad")).toBe(
      "Applies to the invite link and to people who find the Group in Arad.",
    );
    expect(groupWhoCanJoinDescription(null)).toBe(
      "Applies to the invite link and to people who find the Group.",
    );
  });
});

describe("confirm copy", () => {
  it("names the Group in each confirmation", () => {
    expect(groupDeleteConfirm("Bromma").title).toBe("Delete Bromma?");
    expect(groupRemoveImageConfirm("Bromma").title).toBe(
      "Remove image for Bromma?",
    );
  });
});

describe("groupManageActions", () => {
  it("offers nothing to a plain member", () => {
    expect(
      groupManageActions({
        canManageImage: false,
        imageUrl: "/x",
        canDelete: false,
      }),
    ).toEqual([]);
  });

  it("offers Remove image only when there is an image", () => {
    expect(
      groupManageActions({
        canManageImage: true,
        imageUrl: null,
        canDelete: false,
      }),
    ).toEqual(["change_image"]);
    expect(
      groupManageActions({
        canManageImage: true,
        imageUrl: "/x",
        canDelete: true,
      }),
    ).toEqual(["change_image", "remove_image", "delete"]);
  });

  it("agrees with the web overflow menu on image and delete", () => {
    const input = { canManageImage: true, imageUrl: "/x", canDelete: true };
    const overflow = groupHomeOverflowItems({
      family: { kind: "none" },
      hasCommunity: false,
      hasCreateAccess: false,
      canShowCreateGame: false,
      isLoosePublic: false,
      canManageInvites: false,
      canManageImage: input.canManageImage,
      hasImage: true,
      isMember: false,
      canDelete: input.canDelete,
    });
    expect(overflow).toEqual(groupManageActions(input));
  });
});
