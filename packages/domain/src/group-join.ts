import { groupHomeHasStandingResults } from "./group-home-chrome";

export type GroupJoinMode = "join" | "request" | "requested";

export type GroupJoinDoor =
  | "joinLoosePublic"
  | "joinClubPublic"
  | "requestJoin";

export const GROUP_HISTORY_PAGE_SIZE = 20;

export const GROUP_ARCHIVE_GAMES_COPY =
  "Existing Games stay listed here, not on public pickup. Join, waitlist, and Game invites are closed while the Community is Soft-archived.";

export function groupGamesEmptyDescription(isCommunityArchived: boolean) {
  return isCommunityArchived
    ? GROUP_ARCHIVE_GAMES_COPY
    : "When a Game is set with a live window or Match, it will show up here.";
}

export function groupHomeCanJoin(joinMode: string): joinMode is GroupJoinMode {
  return (
    joinMode === "join" || joinMode === "request" || joinMode === "requested"
  );
}

export function groupDisplayName(name: string | null | undefined) {
  return name ?? "Untitled Group";
}

export function publicGroupMetaLine(input: {
  memberCountLabel: string;
  requiresApproval: boolean;
}) {
  return input.requiresApproval
    ? `${input.memberCountLabel} · Requires approval`
    : input.memberCountLabel;
}

export function groupJoinLabel(
  joinMode: GroupJoinMode,
  pending: boolean,
  style: "row" | "home",
) {
  if (joinMode === "requested") {
    return "Requested";
  }
  if (joinMode === "request") {
    return pending ? "Requesting…" : "Request to join";
  }
  if (pending) {
    return "Joining…";
  }
  return style === "home" ? "Join Group" : "Join";
}

export function groupJoinDisabled(joinMode: GroupJoinMode, pending: boolean) {
  return joinMode === "requested" || pending;
}

export function publicGroupJoinDoor(input: {
  joinMode: GroupJoinMode;
  communityName: string | null;
}): GroupJoinDoor | null {
  if (input.joinMode === "request") {
    return "requestJoin";
  }
  if (input.joinMode === "join") {
    return input.communityName ? "joinClubPublic" : "joinLoosePublic";
  }
  return null;
}

export function groupHomeJoinDoor(input: {
  joinMode: string;
  canJoinLoosePublic: boolean;
  canJoinClubPublic: boolean;
}): GroupJoinDoor | null {
  if (input.joinMode === "request") {
    return "requestJoin";
  }
  if (input.canJoinLoosePublic) {
    return "joinLoosePublic";
  }
  if (input.canJoinClubPublic) {
    return "joinClubPublic";
  }
  return null;
}

export function groupJoinToast(door: GroupJoinDoor) {
  return door === "requestJoin" ? "Requested to join" : "Joined Group";
}

export function groupLeaveToast(communityId: string | null | undefined) {
  return communityId
    ? "Left Group — you remain in the Community"
    : "Left Group";
}

export function groupLeaveConfirm(groupName: string) {
  return {
    title: `Leave ${groupName}?`,
    description: "You will leave this Group.",
    confirmLabel: "Leave Group",
  };
}

export type GroupHomeBanner = { heading: string | null; body: string };

export function groupHomeBanner(input: {
  isCommunityArchived: boolean;
  hasCommunityMembership: boolean;
  communityId: string | null;
  communityName: string | null;
  joinMode: string;
}): GroupHomeBanner | null {
  if (input.isCommunityArchived && !input.hasCommunityMembership) {
    return {
      heading: "This Club Group's Community is Soft-archived",
      body: "It is not open for join. Members of the Community can still open history and Games. This is not a missing page.",
    };
  }
  if (input.isCommunityArchived) {
    return {
      heading: "Community Soft-archived",
      body: "This Club Group stays attached to its Community. You can still open it and see history and Games while the Community is archived.",
    };
  }
  if (
    input.communityId &&
    !input.hasCommunityMembership &&
    (input.joinMode === "request" || input.joinMode === "requested")
  ) {
    return {
      heading: null,
      body: `If approved, you also become a Member of ${input.communityName ?? "this Community"}.`,
    };
  }
  return null;
}

export type GroupStandingState =
  | { kind: "not-member" }
  | { kind: "standing"; showNoResultsNotice: boolean; showTable: boolean };

export function groupStandingState(input: {
  isMember: boolean;
  leaderboard: readonly {
    totalSetsWon: number;
    totalPointsWon: number;
    totalGamesPlayed: number;
  }[];
}): GroupStandingState {
  if (!input.isMember) {
    return { kind: "not-member" };
  }
  return {
    kind: "standing",
    showNoResultsNotice: !groupHomeHasStandingResults(input.leaderboard),
    showTable: input.leaderboard.length > 0,
  };
}

export function groupHistoryCanLoadMore(input: {
  loadedCount: number;
  exhausted: boolean;
}) {
  return (
    !input.exhausted &&
    input.loadedCount > 0 &&
    input.loadedCount % GROUP_HISTORY_PAGE_SIZE === 0
  );
}

export function groupHistoryPageExhausted(pageLength: number) {
  return pageLength < GROUP_HISTORY_PAGE_SIZE;
}
