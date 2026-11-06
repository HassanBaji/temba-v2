import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { groupHomeHasStandingResults } from "./group-home-chrome";

export type GroupJoinMode = "join" | "request" | "requested";

export type GroupJoinDoor = "joinPublic" | "requestJoin";

export const GROUP_HISTORY_PAGE_SIZE = 20;

export function groupGamesEmptyDescription(locale: Locale) {
  return messagesFor(locale).group.join.gamesEmptyDescription;
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
}): GroupJoinDoor | null {
  if (input.joinMode === "request") {
    return "requestJoin";
  }
  if (input.joinMode === "join") {
    return "joinPublic";
  }
  return null;
}

export function groupHomeJoinDoor(input: {
  joinMode: string;
  canJoin: boolean;
}): GroupJoinDoor | null {
  if (input.joinMode === "request") {
    return "requestJoin";
  }
  if (input.canJoin) {
    return "joinPublic";
  }
  return null;
}

export function groupJoinToast(door: GroupJoinDoor, locale: Locale) {
  const m = messagesFor(locale).group.join.toast;
  return door === "requestJoin" ? m.requested : m.joined;
}

export function groupLeaveToast(locale: Locale) {
  return messagesFor(locale).group.join.toast.left;
}

export function groupLeaveConfirm(groupName: string, locale: Locale) {
  const m = messagesFor(locale).group.join.leaveConfirm;
  return {
    title: m.title(groupName),
    description: m.description,
    confirmLabel: m.confirmLabel,
  };
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
