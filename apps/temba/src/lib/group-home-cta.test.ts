import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  groupHomeCtaFamily,
  groupHomeOverflowItems,
  type GroupHomeCtaInput,
} from "./group-home-cta";

function cta(overrides: Partial<GroupHomeCtaInput> = {}): GroupHomeCtaInput {
  return {
    canJoin: false,
    hasCreateAccess: false,
    canCreateGame: false,
    canManageLookupInvites: false,
    canManageInviteLinks: false,
    ...overrides,
  };
}

describe("groupHomeCtaFamily", () => {
  it("keeps Join Group primary when the viewer canJoin", () => {
    assert.deepEqual(groupHomeCtaFamily(cta({ canJoin: true })), {
      kind: "join_group",
      secondary: null,
    });
  });

  it("pairs Join Group with Create game when the UI gate and canCreateGame both pass", () => {
    assert.deepEqual(
      groupHomeCtaFamily(
        cta({
          canJoin: true,
          hasCreateAccess: true,
          canCreateGame: true,
          canManageLookupInvites: true,
        }),
      ),
      { kind: "join_group", secondary: "create_game" },
    );
  });

  it("pairs Join Group with Invite when create is gated off", () => {
    assert.deepEqual(
      groupHomeCtaFamily(
        cta({
          canJoin: true,
          canCreateGame: true,
          hasCreateAccess: false,
          canManageInviteLinks: true,
        }),
      ),
      { kind: "join_group", secondary: "invite" },
    );
  });

  it("hides Create game without the group-creator UI flag even when canCreateGame is true", () => {
    assert.deepEqual(
      groupHomeCtaFamily(
        cta({
          hasCreateAccess: false,
          canCreateGame: true,
          canManageLookupInvites: true,
        }),
      ),
      { kind: "invite" },
    );
  });

  it("uses Create game as primary when join is closed and create is allowed", () => {
    assert.deepEqual(
      groupHomeCtaFamily(
        cta({
          hasCreateAccess: true,
          canCreateGame: true,
          canManageInviteLinks: true,
        }),
      ),
      { kind: "create_game", secondary: "invite" },
    );
  });

  it("uses Invite as primary when join and create are closed", () => {
    assert.deepEqual(
      groupHomeCtaFamily(cta({ canManageLookupInvites: true })),
      { kind: "invite" },
    );
  });

  it("has no action bar when join, create, and invite are all closed", () => {
    assert.deepEqual(groupHomeCtaFamily(cta()), { kind: "none" });
  });
});

describe("groupHomeOverflowItems", () => {
  it("hides overflow when nothing is available", () => {
    assert.deepEqual(
      groupHomeOverflowItems({
        family: { kind: "none" },
        hasCommunity: false,
        canShowCreateGame: false,
        isLoosePublic: false,
        canManageInvites: false,
        isMember: false,
        canDelete: false,
      }),
      [],
    );
  });

  it("lists Club Community doors and destructive confirms", () => {
    assert.deepEqual(
      groupHomeOverflowItems({
        family: { kind: "join_group", secondary: "create_game" },
        hasCommunity: true,
        canShowCreateGame: true,
        isLoosePublic: false,
        canManageInvites: true,
        isMember: true,
        canDelete: true,
      }),
      [
        "open_community",
        "all_communities",
        "manage_invites",
        "leave",
        "delete",
      ],
    );
  });

  it("lists Copy Group URL on Loose Public and omits Create game already on the bar", () => {
    assert.deepEqual(
      groupHomeOverflowItems({
        family: { kind: "create_game", secondary: null },
        hasCommunity: false,
        canShowCreateGame: true,
        isLoosePublic: true,
        canManageInvites: false,
        isMember: false,
        canDelete: false,
      }),
      ["copy_group_url"],
    );
  });

  it("puts Create game and Manage invites in overflow when they are not on the action bar", () => {
    assert.deepEqual(
      groupHomeOverflowItems({
        family: { kind: "none" },
        hasCommunity: false,
        canShowCreateGame: true,
        isLoosePublic: false,
        canManageInvites: true,
        isMember: false,
        canDelete: false,
      }),
      ["create_game", "manage_invites"],
    );
  });
});
