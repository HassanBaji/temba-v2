import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

export function groupLinkRequestRowTitle(
  venueName: string,
  groupName: string | null,
  locale: Locale,
) {
  const m = messagesFor(locale).group.linkRequest;
  return m.rowTitle(venueName, groupName ?? m.yourGroup);
}

export function groupLinkRequestBannerText(venueName: string, locale: Locale) {
  return messagesFor(locale).group.linkRequest.bannerText(venueName);
}

export function groupLinkRequestAcceptedToast(
  groupName: string | null,
  venueName: string,
  locale: Locale,
) {
  const m = messagesFor(locale).group.linkRequest;
  return m.acceptedToast(groupName ?? m.thisGroup, venueName);
}

export function groupLinkRequestAcceptConfirm(
  groupName: string | null,
  venueName: string,
  locale: Locale,
) {
  const m = messagesFor(locale).group.linkRequest;
  const name = groupName ?? m.thisGroup;
  return {
    title: m.acceptConfirm.title(name, venueName),
    description: m.acceptConfirm.description(name),
    confirmLabel: m.acceptConfirm.confirmLabel,
    cancelLabel: m.acceptConfirm.cancelLabel,
    pendingLabel: m.acceptConfirm.pendingLabel,
    consequences: [
      m.acceptConfirm.consequences.members,
      m.acceptConfirm.consequences.noDirectJoin,
      m.acceptConfirm.consequences.noInviteLinks,
      m.acceptConfirm.consequences.gamesHeldAt(venueName),
      m.acceptConfirm.consequences.verified,
    ],
  };
}

export function groupLinkRequestDeclineConfirm(
  venueName: string,
  locale: Locale,
) {
  const m = messagesFor(locale).group.linkRequest.declineConfirm;
  return {
    title: m.title(venueName),
    description: m.description(venueName),
    confirmLabel: m.confirmLabel,
    cancelLabel: m.cancelLabel,
  };
}

export function groupPartOfVenueLine(venueName: string, locale: Locale) {
  return messagesFor(locale).group.linkRequest.partOf(venueName);
}

export function groupLeaveVenueActionLabel(venueName: string, locale: Locale) {
  return messagesFor(locale).group.linkRequest.leaveVenueLabel(venueName);
}

export function groupLeaveVenueConfirm(
  groupName: string | null,
  venueName: string,
  locale: Locale,
) {
  const m = messagesFor(locale).group.linkRequest;
  const name = groupName ?? m.thisGroup;
  return {
    title: m.leaveVenueConfirm.title(venueName),
    description: m.leaveVenueConfirm.description(name),
    confirmLabel: m.leaveVenueConfirm.confirmLabel,
    cancelLabel: m.leaveVenueConfirm.cancelLabel,
    pendingLabel: m.leaveVenueConfirm.pendingLabel,
    consequences: [
      m.leaveVenueConfirm.consequences.historyStays,
      m.leaveVenueConfirm.consequences.membersStay,
      m.leaveVenueConfirm.consequences.anyVenue,
      m.leaveVenueConfirm.consequences.inviteLinks,
    ],
  };
}

export function groupLeftVenueToast(venueName: string, locale: Locale) {
  return messagesFor(locale).group.linkRequest.leftVenueToast(venueName);
}

export function venueUnlinkGroupConfirm(
  groupName: string | null,
  locale: Locale,
) {
  const m = messagesFor(locale).group.linkRequest;
  const name = groupName ?? m.thisGroup;
  return {
    title: m.venueUnlinkConfirm.title(name),
    description: m.venueUnlinkConfirm.description(name),
    confirmLabel: m.venueUnlinkConfirm.confirmLabel,
    cancelLabel: m.venueUnlinkConfirm.cancelLabel,
  };
}
