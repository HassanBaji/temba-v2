export type GroupHomeCtaSecondary = "create_game" | "invite" | null;

export type GroupHomeCtaFamily =
  | { kind: "join_group"; secondary: GroupHomeCtaSecondary }
  | { kind: "join_game"; gameId: string; secondary: GroupHomeCtaSecondary }
  | { kind: "create_game"; secondary: "invite" | null }
  | { kind: "invite" }
  | { kind: "none" };

export type GroupHomeCtaInput = {
  canJoin: boolean;
  nextJoinableGameId: string | null;
  hasCreateAccess: boolean;
  canCreateGame: boolean;
  canManageLookupInvites: boolean;
  canManageInviteLinks: boolean;
};

export type GroupHomeOverflowItem =
  | "open_community"
  | "all_communities"
  | "create_game"
  | "copy_group_url"
  | "manage_invites"
  | "leave"
  | "delete";

export type GroupHomeOverflowInput = {
  family: GroupHomeCtaFamily;
  hasCommunity: boolean;
  canShowCreateGame: boolean;
  isLoosePublic: boolean;
  canManageInvites: boolean;
  isMember: boolean;
  canDelete: boolean;
};

export function groupHomeCanShowCreateGame(input: {
  hasCreateAccess: boolean;
  canCreateGame: boolean;
}) {
  return input.hasCreateAccess && input.canCreateGame;
}

export function groupHomeCanManageInvites(input: {
  canManageLookupInvites: boolean;
  canManageInviteLinks: boolean;
}) {
  return input.canManageLookupInvites || input.canManageInviteLinks;
}

function createOrInviteSecondary(input: {
  canShowCreateGame: boolean;
  canManageInvites: boolean;
}): GroupHomeCtaSecondary {
  if (input.canShowCreateGame) {
    return "create_game";
  }
  if (input.canManageInvites) {
    return "invite";
  }
  return null;
}

export function groupHomeCtaFamily(
  input: GroupHomeCtaInput,
): GroupHomeCtaFamily {
  const canShowCreateGame = groupHomeCanShowCreateGame(input);
  const canManageInvites = groupHomeCanManageInvites(input);

  if (input.canJoin) {
    return {
      kind: "join_group",
      secondary: createOrInviteSecondary({
        canShowCreateGame,
        canManageInvites,
      }),
    };
  }
  if (input.nextJoinableGameId) {
    return {
      kind: "join_game",
      gameId: input.nextJoinableGameId,
      secondary: createOrInviteSecondary({
        canShowCreateGame,
        canManageInvites,
      }),
    };
  }
  if (canShowCreateGame) {
    return {
      kind: "create_game",
      secondary: canManageInvites ? "invite" : null,
    };
  }
  if (canManageInvites) {
    return { kind: "invite" };
  }
  return { kind: "none" };
}

export function groupHomeCreateOnActionBar(family: GroupHomeCtaFamily) {
  return (
    family.kind === "create_game" ||
    (family.kind === "join_group" && family.secondary === "create_game") ||
    (family.kind === "join_game" && family.secondary === "create_game")
  );
}

export function groupHomeInviteOnActionBar(family: GroupHomeCtaFamily) {
  return (
    family.kind === "invite" ||
    (family.kind === "create_game" && family.secondary === "invite") ||
    (family.kind === "join_group" && family.secondary === "invite") ||
    (family.kind === "join_game" && family.secondary === "invite")
  );
}

export function groupHomeNextJoinableGame(
  upcoming: readonly {
    id: string;
    registrationStatus: string;
    joinFrozen: boolean;
    isRegistered: boolean;
    isWaitlisted: boolean;
    isPublic: boolean;
  }[],
  isMember: boolean,
): { id: string } | null {
  for (const game of upcoming) {
    if (game.registrationStatus !== "open") {
      continue;
    }
    if (game.joinFrozen) {
      continue;
    }
    if (game.isRegistered || game.isWaitlisted) {
      continue;
    }
    if (!isMember && !game.isPublic) {
      continue;
    }
    return { id: game.id };
  }
  return null;
}

export function groupHomeOverflowItems(
  input: GroupHomeOverflowInput,
): GroupHomeOverflowItem[] {
  const items: GroupHomeOverflowItem[] = [];
  const createOnBar = groupHomeCreateOnActionBar(input.family);
  const inviteOnBar = groupHomeInviteOnActionBar(input.family);

  if (input.hasCommunity) {
    items.push("open_community", "all_communities");
  }
  if (input.canShowCreateGame && !createOnBar) {
    items.push("create_game");
  }
  if (input.isLoosePublic) {
    items.push("copy_group_url");
  }
  if (input.canManageInvites && !inviteOnBar) {
    items.push("manage_invites");
  }
  if (input.isMember) {
    items.push("leave");
  }
  if (input.canDelete) {
    items.push("delete");
  }
  return items;
}
