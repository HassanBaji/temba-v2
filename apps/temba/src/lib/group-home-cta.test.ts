import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  groupHomeCtaFamily,
  groupHomeNextJoinableGame,
  groupHomeOverflowItems,
  type GroupHomeCtaInput,
} from "./group-home-cta";

function cta(overrides: Partial<GroupHomeCtaInput> = {}): GroupHomeCtaInput {
  return {
    canJoin: false,
    nextJoinableGameId: null,
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

  it("does not let Join game replace Join Group", () => {
    assert.deepEqual(
      groupHomeCtaFamily(cta({ canJoin: true, nextJoinableGameId: "game-1" })),
      { kind: "join_group", secondary: null },
    );
  });

  it("uses Join game as a primary link when join is closed and a next Open Game exists", () => {
    assert.deepEqual(
      groupHomeCtaFamily(
        cta({
          nextJoinableGameId: "game-1",
          hasCreateAccess: true,
          canCreateGame: true,
        }),
      ),
      { kind: "join_game", gameId: "game-1", secondary: "create_game" },
    );
  });
});

describe("groupHomeNextJoinableGame", () => {
  const openGame = {
    id: "soonest",
    registrationStatus: "open",
    joinFrozen: false,
    isRegistered: false,
    isWaitlisted: false,
    isPublic: true,
  };

  it("picks the soonest Open Game the viewer is not on", () => {
    assert.deepEqual(
      groupHomeNextJoinableGame([openGame, { ...openGame, id: "later" }], true),
      { id: "soonest" },
    );
  });

  it("skips full, closed, frozen, registered, and waitlisted Games", () => {
    assert.equal(
      groupHomeNextJoinableGame(
        [
          { ...openGame, id: "full", registrationStatus: "full" },
          { ...openGame, id: "closed", registrationStatus: "closed" },
          { ...openGame, id: "frozen", joinFrozen: true },
          { ...openGame, id: "seated", isRegistered: true },
          { ...openGame, id: "wait", isWaitlisted: true },
        ],
        true,
      ),
      null,
    );
  });

  it("requires membership or a public Game for the join gate", () => {
    assert.equal(
      groupHomeNextJoinableGame([{ ...openGame, isPublic: false }], false),
      null,
    );
    assert.deepEqual(
      groupHomeNextJoinableGame([{ ...openGame, isPublic: false }], true),
      { id: "soonest" },
    );
  });
});

describe("groupHomeOverflowItems", () => {
  it("hides overflow when nothing is available", () => {
    assert.deepEqual(
      groupHomeOverflowItems({
        family: { kind: "none" },
        hasCommunity: false,
        hasCreateAccess: false,
        canShowCreateGame: false,
        isLoosePublic: false,
        canManageInvites: false,
        canManageImage: false,
        hasImage: false,
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
        hasCreateAccess: true,
        canShowCreateGame: true,
        isLoosePublic: false,
        canManageInvites: true,
        canManageImage: false,
        hasImage: false,
        isMember: true,
        canDelete: true,
      }),
      [
        "open_community",
        "all_communities",
        "create_tournament",
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
        hasCreateAccess: true,
        canShowCreateGame: true,
        isLoosePublic: true,
        canManageInvites: false,
        canManageImage: false,
        hasImage: false,
        isMember: false,
        canDelete: false,
      }),
      ["create_tournament", "copy_group_url"],
    );
  });

  it("puts Create game and Manage invites in overflow when they are not on the action bar", () => {
    assert.deepEqual(
      groupHomeOverflowItems({
        family: { kind: "none" },
        hasCommunity: false,
        hasCreateAccess: true,
        canShowCreateGame: true,
        isLoosePublic: false,
        canManageInvites: true,
        canManageImage: false,
        hasImage: false,
        isMember: false,
        canDelete: false,
      }),
      ["create_game", "create_tournament", "manage_invites"],
    );
  });

  it("omits Create game from overflow when Join game already shows it", () => {
    assert.deepEqual(
      groupHomeOverflowItems({
        family: {
          kind: "join_game",
          gameId: "game-1",
          secondary: "create_game",
        },
        hasCommunity: false,
        hasCreateAccess: true,
        canShowCreateGame: true,
        isLoosePublic: false,
        canManageInvites: true,
        canManageImage: false,
        hasImage: false,
        isMember: true,
        canDelete: false,
      }),
      ["create_tournament", "manage_invites", "leave"],
    );
  });

  it("keeps Open Community without the create-access flag and omits All Communities", () => {
    assert.deepEqual(
      groupHomeOverflowItems({
        family: { kind: "none" },
        hasCommunity: true,
        hasCreateAccess: false,
        canShowCreateGame: false,
        isLoosePublic: false,
        canManageInvites: false,
        canManageImage: false,
        hasImage: false,
        isMember: false,
        canDelete: false,
      }),
      ["open_community"],
    );
  });

  it("includes All Communities only when the create-access flag is true", () => {
    const base = {
      family: { kind: "none" } as const,
      hasCommunity: true,
      canShowCreateGame: false,
      isLoosePublic: false,
      canManageInvites: false,
      canManageImage: false,
      hasImage: false,
      isMember: false,
      canDelete: false,
    };
    assert.deepEqual(
      groupHomeOverflowItems({ ...base, hasCreateAccess: false }),
      ["open_community"],
    );
    assert.deepEqual(
      groupHomeOverflowItems({ ...base, hasCreateAccess: true }),
      ["open_community", "all_communities"],
    );
  });

  it("lists Change image when the viewer may manage the image, and Remove image only when an image is present", () => {
    const base = {
      family: { kind: "none" } as const,
      hasCommunity: false,
      hasCreateAccess: false,
      canShowCreateGame: false,
      isLoosePublic: false,
      canManageInvites: false,
      isMember: false,
      canDelete: false,
    };
    assert.deepEqual(
      groupHomeOverflowItems({
        ...base,
        canManageImage: false,
        hasImage: true,
      }),
      [],
    );
    assert.deepEqual(
      groupHomeOverflowItems({
        ...base,
        canManageImage: true,
        hasImage: false,
      }),
      ["change_image"],
    );
    assert.deepEqual(
      groupHomeOverflowItems({
        ...base,
        canManageImage: true,
        hasImage: true,
      }),
      ["change_image", "remove_image"],
    );
  });
});
