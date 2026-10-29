import { teamInviteLabel } from "./teams";

export type InviteDoorKind = "game" | "group" | "community" | "team";
export type InviteMode = "players" | "phone" | "link";

export const INVITE_MODE_LABELS: Record<InviteMode, string> = {
  players: "Players",
  phone: "Phone",
  link: "Link",
};

/** A text carries the invite link, so the Phone way in needs link rights. */
export function inviteModes(door: {
  canLookup: boolean;
  canLink: boolean;
}): InviteMode[] {
  const modes: InviteMode[] = [];
  if (door.canLookup) {
    modes.push("players");
  }
  if (door.canLink) {
    modes.push("phone", "link");
  }
  return modes;
}

export function inviteSheetTitle(kind: InviteDoorKind, teamSquad = false) {
  return kind === "team" ? teamInviteLabel(teamSquad) : "Invite players";
}

export type LookupResultRow = {
  id: string;
  name: string;
  username?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  cue?: string | null;
};

export type LookupResultView = {
  id: string;
  name: string;
  meta: string | null;
  accessibilityLabel: string;
};

/** "@nora_newman, Group member". */
export function lookupResultView(
  row: LookupResultRow,
  invited: boolean,
): LookupResultView {
  const meta =
    [
      row.username ? `@${row.username}` : null,
      row.cue ?? row.email ?? row.phoneNumber ?? null,
    ]
      .filter(Boolean)
      .join(", ") || null;
  return {
    id: row.id,
    name: row.name,
    meta,
    accessibilityLabel: [row.name, meta, invited ? "invited" : null]
      .filter(Boolean)
      .join(", "),
  };
}

export function openSeatCount(
  sides: {
    left: { name: string } | null;
    right: { name: string } | null;
  }[],
) {
  return sides.reduce(
    (count, side) => count + (side.left ? 0 : 1) + (side.right ? 0 : 1),
    0,
  );
}

export function playersHeading(query: string) {
  return query.trim() ? "Results" : "Suggested";
}

export function noPlayersMatchCopy(query: string, canLink: boolean) {
  const lead = `No one on Temba matches "${query.trim()}".`;
  return canLink
    ? `${lead}\nTry their phone number or send them the link.`
    : lead;
}

export function inviteButtonLabel(invited: boolean) {
  return invited ? "Invited" : "Invite";
}

export function phoneInviteLabel(ready: boolean, sending: boolean) {
  if (sending) {
    return "Sending…";
  }
  return ready ? "Send invite by text" : "Enter a number";
}

export function phoneInviteNote(canLookup: boolean) {
  return canLookup
    ? "They get a text with your invite. If they are already on Temba it lands in their app too."
    : "They get a text with your invite.";
}

/** The Temba User whose number is exactly this one, not just containing it. */
export function rowWithPhone(
  rows: readonly LookupResultRow[],
  e164: string,
): LookupResultRow | null {
  const digits = e164.replace(/\D/g, "");
  return (
    rows.find((row) => row.phoneNumber?.replace(/\D/g, "") === digits) ?? null
  );
}

export const INVITE_LINK_TTL_NOTE = "Each link works for 6 hours.";
export const INVITE_LINK_EMPTY_NOTE = "A new link is made when you share it.";

export function inviteLinkNote(kind: InviteDoorKind) {
  switch (kind) {
    case "game":
      return "Anyone with the link can take a seat. Good for WhatsApp groups.";
    case "group":
      return "Anyone with the link can join the Group. Good for WhatsApp groups.";
    case "community":
      return "Anyone with the link can join the Community. Good for WhatsApp groups.";
    case "team":
      return "Send it to the partner you want on your Team.";
  }
}

export function copyLinkLabel(copied: boolean) {
  return copied ? "Copied" : "Copy";
}

/** iOS reads the body after `&`, Android after `?`. */
export function textMessageUrl(
  platform: string,
  to: string | null,
  body: string,
) {
  const separator = platform === "ios" ? "&" : "?";
  return `sms:${to ?? ""}${separator}body=${encodeURIComponent(body)}`;
}

export function pendingHeading(count: number) {
  return `Pending, ${count}`;
}

export const PENDING_NOTE = "Waiting for an answer";
export const NO_PENDING_COPY = "No invites sent yet.";
