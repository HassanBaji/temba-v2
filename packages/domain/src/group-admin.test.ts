import { describe, expect, it } from "vitest";

import {
  groupDeleteConfirm,
  groupJoinRequestMeta,
  groupManageActions,
  groupRemoveImageConfirm,
} from "./group-admin";
import { groupHomeOverflowItems } from "./group-home-cta";

const now = new Date("2026-10-04T12:00:00Z");

describe("groupJoinRequestMeta", () => {
  it("says only when the request was made on a Loose Group", () => {
    expect(
      groupJoinRequestMeta(
        { createdAt: now, isCommunityMember: null },
        null,
        now,
      ),
    ).toBe("Requested today");
  });

  it("flags a requester who is not yet a Community Member", () => {
    expect(
      groupJoinRequestMeta(
        { createdAt: now, isCommunityMember: false },
        "Södermalm Padel",
        now,
      ),
    ).toBe("Not yet a Södermalm Padel Member · Requested today");
  });

  it("falls back to Community when the name is unknown", () => {
    expect(
      groupJoinRequestMeta(
        { createdAt: now, isCommunityMember: false },
        null,
        now,
      ),
    ).toBe("Not yet a Community Member · Requested today");
  });

  it("stays quiet about membership for a Community Member", () => {
    expect(
      groupJoinRequestMeta(
        { createdAt: now, isCommunityMember: true },
        "Södermalm Padel",
        now,
      ),
    ).toBe("Requested today");
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
