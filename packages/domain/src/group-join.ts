import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { groupHomeHasStandingResults } from "./group-home-chrome";

export type GroupJoinMode = "join" | "request" | "requested";

export type GroupJoinDoor =
  | "joinLoosePublic"
  | "joinClubPublic"
  | "requestJoin";

export const GROUP_HISTORY_PAGE_SIZE = 20;

export function groupArchiveGamesCopy(locale: Locale) {
  return messagesFor(locale).group.join.archiveGamesCopy;
}

export function groupGamesEmptyDescription(
  isCommunityArchived: boolean,
  locale: Locale,
) {
  const m = messagesFor(locale).group.join;
  return isCommunityArchived ? m.archiveGamesCopy : m.gamesEmptyDescription;
}

export function groupHomeCanJoin(joinMode: string): joinMode is GroupJoinMode {
  return (
    joinMode === "join" || joinMode === "request" || joinMode === "requested"
  );
}

export function groupDisplayName(
  name: string | null | undefined,
  locale: Locale,
) {
  return name ?? messagesFor(locale).group.untitled;
}

export function publicGroupMetaLine(input: {
  memberCountLabel: string;
  requiresApproval: boolean;
  locale: Locale;
}) {
  return input.requiresApproval
    ? messagesFor(input.locale).group.join.requiresApprovalMeta(
        input.memberCountLabel,
      )
    : input.memberCountLabel;
}

export function groupJoinLabel(
  joinMode: GroupJoinMode,
  pending: boolean,
  style: "row" | "home",
  locale: Locale,
) {
  const m = messagesFor(locale).group.join.label;
  if (joinMode === "requested") {
    return m.requested;
  }
  if (joinMode === "request") {
    return pending ? m.requesting : m.requestToJoin;
  }
  if (pending) {
    return m.joining;
  }
  return style === "home" ? m.joinGroup : m.join;
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

export function groupJoinToast(door: GroupJoinDoor, locale: Locale) {
  const m = messagesFor(locale).group.join.toast;
  return door === "requestJoin" ? m.requested : m.joined;
}

export function groupLeaveToast(
  communityId: string | null | undefined,
  locale: Locale,
) {
  const m = messagesFor(locale).group.join.toast;
  return communityId ? m.leftClub : m.left;
}

export function groupLeaveConfirm(groupName: string, locale: Locale) {
  const m = messagesFor(locale).group.join.leaveConfirm;
  return {
    title: m.title(groupName),
    description: m.description,
    confirmLabel: m.confirmLabel,
  };
}

export type GroupHomeBanner = { heading: string | null; body: string };

export function groupHomeBanner(input: {
  isCommunityArchived: boolean;
  hasCommunityMembership: boolean;
  communityId: string | null;
  communityName: string | null;
  joinMode: string;
  locale: Locale;
}): GroupHomeBanner | null {
  const m = messagesFor(input.locale).group.join.banner;
  if (input.isCommunityArchived && !input.hasCommunityMembership) {
    return {
      heading: m.archivedVisitor.heading,
      body: m.archivedVisitor.body,
    };
  }
  if (input.isCommunityArchived) {
    return {
      heading: m.archivedMember.heading,
      body: m.archivedMember.body,
    };
  }
  if (
    input.communityId &&
    !input.hasCommunityMembership &&
    (input.joinMode === "request" || input.joinMode === "requested")
  ) {
    return {
      heading: null,
      body: m.approvalJoinsCommunity(input.communityName ?? m.thisCommunity),
    };
  }
  return null;
}

export type GroupStandingState =
  | { kind: "not-member" }
  | {
      kind: "standing";
      showNoResultsNotice: boolean;
      showTable: boolean;
      showCreateFirstGame: boolean;
    };

export function groupStandingState(input: {
  isMember: boolean;
  hasGames: boolean;
  leaderboard: readonly { played: number }[];
}): GroupStandingState {
  if (!input.isMember) {
    return { kind: "not-member" };
  }
  return {
    kind: "standing",
    showNoResultsNotice: !groupHomeHasStandingResults(input.leaderboard),
    showTable: input.leaderboard.length > 0,
    showCreateFirstGame: !input.hasGames,
  };
}

export function groupHasGames(group: {
  upcomingGames: readonly unknown[];
  gameHistory: readonly unknown[];
}) {
  return group.upcomingGames.length > 0 || group.gameHistory.length > 0;
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
