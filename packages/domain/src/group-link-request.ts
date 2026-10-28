export const VENUE_REQUESTS_TITLE = "Venue requests";

export const GROUP_LINK_REQUEST_ROW_META =
  "Only you can decide, as the Group creator.";

export const GROUP_LINK_REQUEST_ACCEPT_LABEL = "Accept";

export const GROUP_LINK_REQUEST_DECLINE_LABEL = "Decline";

export const GROUP_LINK_REQUEST_DECLINED_TOAST = "Request declined";

export function groupLinkRequestRowTitle(
  venueName: string,
  groupName: string | null,
) {
  return `${venueName} wants to add ${groupName ?? "your Group"} to its Community`;
}

export function groupLinkRequestBannerText(venueName: string) {
  return `${venueName} wants to add this Group to its Community.`;
}

export function groupLinkRequestAcceptedToast(
  groupName: string | null,
  venueName: string,
) {
  return `${groupName ?? "this Group"} is now part of ${venueName}`;
}

export function groupLinkRequestAcceptConfirm(
  groupName: string | null,
  venueName: string,
) {
  const name = groupName ?? "this Group";
  return {
    title: `Add ${name} to ${venueName}’s Community?`,
    description: `${name} becomes a Club Group. Here is what changes.`,
    confirmLabel: "Add Group",
    cancelLabel: "Not now",
    pendingLabel: "Adding…",
    consequences: [
      "Everyone in the Group becomes a Community Member.",
      "New people can’t join directly. They send a request instead.",
      "You can’t make Invite links any more. You can still invite existing Community Members.",
      `New Games are held at ${venueName}.`,
      "The Group is Verified, so it can host Rated Games and Games open to anyone with the link.",
    ],
  };
}

export function groupLinkRequestDeclineConfirm(venueName: string) {
  return {
    title: `Decline ${venueName}'s request?`,
    description: `${venueName} will see that you declined. They can send a new request later.`,
    confirmLabel: "Decline request",
    cancelLabel: "Keep request",
  };
}

export function groupPartOfVenueLine(venueName: string) {
  return `Part of ${venueName}`;
}

export const GROUP_UNLINK_ACTION_LABEL = "Unlink";

export function groupLeaveVenueActionLabel(venueName: string) {
  return `Leave ${venueName}’s Community`;
}

export function groupLeaveVenueConfirm(
  groupName: string | null,
  venueName: string,
) {
  const name = groupName ?? "this Group";
  return {
    title: `Leave ${venueName}’s Community?`,
    description: `${name} becomes a Loose Group again. New Games will be Unrated unless an Operator has verified the Group.`,
    confirmLabel: "Leave Community",
    cancelLabel: "Stay",
    pendingLabel: "Leaving…",
    consequences: [
      "Members, past Games and results stay as they are.",
      "Members stay in the Community until they leave it themselves.",
      "New Games can be held at any Venue.",
      "You can make Invite links again.",
    ],
  };
}

export function groupLeftVenueToast(venueName: string) {
  return `Left ${venueName}’s Community`;
}

export function venueUnlinkGroupConfirm(groupName: string | null) {
  const name = groupName ?? "this Group";
  return {
    title: `Unlink ${name}?`,
    description: `${name} leaves your Venue's Community and becomes a Loose Group. New Games will be Unrated unless an Operator has verified it. Past Games and members stay as they are.`,
    confirmLabel: "Unlink Group",
    cancelLabel: "Keep linked",
  };
}

export const VENUE_UNLINK_GROUP_TOAST = "Group unlinked";
