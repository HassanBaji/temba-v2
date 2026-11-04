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
        "en",
        now,
      ),
    ).toBe("Via invite link from Ali Haji, yesterday");
  });

  it("says the invite link alone when its sharer is gone", () => {
    expect(
      groupJoinRequestMeta(
        { createdAt: now, source: "invite_link", invitedBy: null },
        null,
        "en",
        now,
      ),
    ).toBe("Via invite link, today");
  });

  it("names the Community the Group was found in", () => {
    expect(
      groupJoinRequestMeta(
        { createdAt: yesterday, source: "community", invitedBy: null },
        "Södermalm Padel",
        "en",
        now,
      ),
    ).toBe("Found the Group in Södermalm Padel, yesterday");
  });

  it("falls back to when the request was made", () => {
    expect(
      groupJoinRequestMeta(
        { createdAt: now, source: null, invitedBy: null },
        null,
        "en",
        now,
      ),
    ).toBe("Requested today");
    expect(
      groupJoinRequestMeta(
        { createdAt: now, source: "group_page", invitedBy: null },
        null,
        "en",
        now,
      ),
    ).toBe("Requested today");
  });

  it("reads in Arabic", () => {
    expect(
      groupJoinRequestMeta(
        { createdAt: now, source: "invite_link", invitedBy: null },
        null,
        "ar",
        now,
      ),
    ).toBe("عبر رابط دعوة، اليوم");
  });
});

describe("join request counts", () => {
  it("counts people in the banner and the card heading", () => {
    expect(groupJoinRequestsBannerText(1, "en")).toBe("1 person wants to join");
    expect(groupJoinRequestsBannerText(3, "en")).toBe("3 people want to join");
    expect(groupJoinRequestsHeading(1, "en")).toBe("1 wants to join");
    expect(groupJoinRequestsHeading(3, "en")).toBe("3 want to join");
  });
});

describe("groupJoinRequestsSummary", () => {
  it("states the approval policy and today's approvals", () => {
    expect(
      groupJoinRequestsSummary({
        requiresApproval: true,
        approvedToday: 2,
        locale: "en",
      }),
    ).toEqual({
      title: "No requests waiting",
      line: "Organizers approve new members, 2 approved today",
    });
    expect(
      groupJoinRequestsSummary({
        requiresApproval: true,
        approvedToday: 0,
        locale: "en",
      }).line,
    ).toBe("Organizers approve new members");
  });

  it("says joining is instant when approval is off", () => {
    expect(
      groupJoinRequestsSummary({
        requiresApproval: false,
        approvedToday: 4,
        locale: "en",
      }),
    ).toEqual({
      title: "Anyone with the link can join",
      line: "Joins instantly, no review",
    });
    expect(groupJoinPolicyLine(false, "en")).toBe(
      "Anyone with the link can join",
    );
    expect(groupJoinPolicyLine(true, "en")).toBe(
      "Organizers approve new members",
    );
  });
});

describe("decision copy", () => {
  it("names the person in the reject sheet and each toast", () => {
    expect(groupRejectRequestCopy("omar.m", "en").title).toBe("Reject omar.m?");
    expect(groupJoinRequestDecidedToast("Kareem", "approved", "en")).toBe(
      "Kareem added to the Group",
    );
    expect(groupJoinRequestDecidedToast("Kareem", "rejected", "en")).toBe(
      "Kareem rejected",
    );
    expect(groupJoinRequestDecidedToast("Kareem", "blocked", "en")).toBe(
      "Kareem rejected and blocked",
    );
  });

  it("names the Community a Club Group lives in", () => {
    expect(groupWhoCanJoinDescription("Arad", "en")).toBe(
      "Applies to the invite link and to people who find the Group in Arad.",
    );
    expect(groupWhoCanJoinDescription(null, "en")).toBe(
      "Applies to the invite link and to people who find the Group.",
    );
  });
});

describe("confirm copy", () => {
  it("names the Group in each confirmation", () => {
    expect(groupDeleteConfirm("Bromma", "en").title).toBe("Delete Bromma?");
    expect(groupRemoveImageConfirm("Bromma", "en").title).toBe(
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
