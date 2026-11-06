import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import type { GroupJoinRequestData } from "./group-data";
import { formatPastDay, formatRequestedAt } from "./request-meta";

export function groupDeleteConfirm(groupName: string, locale: Locale) {
  const m = messagesFor(locale).group.admin.deleteConfirm;
  return {
    title: m.title(groupName),
    description: m.description,
    confirmLabel: m.confirmLabel,
  };
}

export function groupRemoveImageConfirm(groupName: string, locale: Locale) {
  const m = messagesFor(locale).group.admin.removeImageConfirm;
  return {
    title: m.title(groupName),
    description: m.description,
    confirmLabel: m.confirmLabel,
  };
}

export function groupJoinRequestMeta(
  request: Pick<GroupJoinRequestData, "createdAt" | "source" | "invitedBy">,
  locale: Locale,
  now?: Date,
) {
  const m = messagesFor(locale).group.admin.requestMeta;
  const when = formatPastDay(request.createdAt, locale, now);
  if (request.source === "invite_link") {
    return request.invitedBy
      ? m.viaInviteLinkFrom(request.invitedBy.name, when)
      : m.viaInviteLink(when);
  }
  return formatRequestedAt(request.createdAt, locale, now);
}

export function groupJoinRequestsBannerText(count: number, locale: Locale) {
  return messagesFor(locale).group.admin.requestsBanner(count);
}

export function groupJoinRequestsHeading(count: number, locale: Locale) {
  return messagesFor(locale).group.admin.requestsHeading(count);
}

export function groupJoinPolicyLine(requiresApproval: boolean, locale: Locale) {
  const m = messagesFor(locale).group.admin.policy;
  return requiresApproval ? m.approve : m.open;
}

/** The one-line card that stands in for the requests list when it is empty. */
export function groupJoinRequestsSummary(input: {
  requiresApproval: boolean;
  approvedToday: number;
  locale: Locale;
}) {
  const m = messagesFor(input.locale).group.admin;
  if (!input.requiresApproval) {
    return {
      title: m.policy.open,
      line: m.requestsSummary.openLine,
    };
  }
  return {
    title: m.requestsSummary.waitingTitle,
    line:
      input.approvedToday > 0
        ? m.requestsSummary.approvedToday(input.approvedToday)
        : m.policy.approve,
  };
}

export function groupWhoCanJoinDescription(locale: Locale) {
  return messagesFor(locale).group.admin.whoCanJoin.description;
}

export function groupRejectRequestCopy(name: string, locale: Locale) {
  const m = messagesFor(locale);
  return {
    title: m.group.admin.reject.title(name),
    description: m.group.admin.reject.description,
    rejectLabel: m.group.admin.reject.rejectLabel,
    blockLabel: m.group.admin.reject.blockLabel,
    cancelLabel: m.common.cancel,
  };
}

export type GroupJoinRequestDecision = "approved" | "rejected" | "blocked";

export function groupJoinRequestDecidedToast(
  name: string,
  decision: GroupJoinRequestDecision,
  locale: Locale,
) {
  return messagesFor(locale).group.admin.decided[decision](name);
}

export const GROUP_JOIN_NOTE_MAX_LENGTH = 280;

export type GroupManageAction = "change_image" | "remove_image" | "delete";

export function groupManageActions(input: {
  canManageImage: boolean;
  imageUrl: string | null;
  canDelete: boolean;
}): GroupManageAction[] {
  const actions: GroupManageAction[] = [];
  if (input.canManageImage) {
    actions.push("change_image");
    if (input.imageUrl) {
      actions.push("remove_image");
    }
  }
  if (input.canDelete) {
    actions.push("delete");
  }
  return actions;
}
