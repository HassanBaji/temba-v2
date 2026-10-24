import { gameInviteClipboardText } from "@repo/domain/game-invite-share-message";
import { groupInviteClipboardText } from "@repo/domain/group-invite-share-message";
import { formatGameClock } from "@repo/domain/format-game-start";
import { TEAM_INVITE_PARTNER_LABEL } from "@repo/domain/teams";
import type { RouterOutputs } from "@repo/api/types";
import type {
  InviteKind,
  InviteLinkPath,
  InviteLinkPreview,
} from "@repo/domain/invites";

import { relativeDay } from "../booking/booking-model";

export type InviteLinkParams = {
  kind?: string | string[];
  token?: string | string[];
  code?: string | string[];
};

export function inviteLandingPath(kind: InviteKind, id: string) {
  switch (kind) {
    case "game":
      return `/games/${id}`;
    case "group":
      return `/groups/${id}`;
    case "team":
      return `/profile/teams/${id}`;
    case "community":
      return "/communities";
  }
}

export function inviteLinkHref(link: InviteLinkPath) {
  const params =
    "code" in link
      ? { kind: link.kind, code: link.code }
      : { kind: link.kind, token: link.token };
  return { pathname: "/profile/invite-link", params } as const;
}

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const KINDS: readonly string[] = ["community", "group", "team", "game"];

export function inviteLinkFromParams(
  params: InviteLinkParams,
): InviteLinkPath | null {
  const kind = single(params.kind);
  const token = single(params.token);
  const code = single(params.code);
  if (kind === "game-short" || kind === "group-short") {
    return code ? { kind, code } : null;
  }
  if (kind && KINDS.includes(kind) && token) {
    return { kind: kind as InviteKind, token };
  }
  return null;
}

export const PASTE_LINK_INVALID_MESSAGE =
  "That is not a Temba invite link. Paste the whole link you were sent.";

export const PASTE_LINK_EMPTY_MESSAGE =
  "Copy the invite link first, then paste.";

export function groupShareMessage(input: {
  name: string | null;
  sport: string | null;
  link: { shortUrl: string | null; inviteUrl: string };
}) {
  return groupInviteClipboardText({
    groupName: input.name,
    sport: input.sport,
    inviteUrl: input.link.shortUrl ?? input.link.inviteUrl,
  });
}

export type GameShareContext = {
  format: string;
  registrationMode: string;
  venueName: string | null;
  courtName: string | null;
  windowStart: Date | string | null;
  windowEnd: Date | string | null;
  sides: {
    sideIndex: number;
    left: { name: string } | null;
    right: { name: string } | null;
  }[];
};

export function gameShareMessage(
  game: GameShareContext,
  link: { shortUrl: string | null; inviteUrl: string },
) {
  const url = link.shortUrl ?? link.inviteUrl;
  return gameInviteClipboardText({
    format: game.format,
    registrationMode: game.registrationMode,
    shortUrl: url,
    roster: {
      venueName: game.venueName ?? "Venue",
      courtName: game.courtName,
      windowStart: game.windowStart,
      windowEnd: game.windowEnd,
      sides: game.sides,
      shortUrl: url,
    },
  });
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

export function inviteSheetTitle(kind: InviteDoorKind) {
  return kind === "team" ? TEAM_INVITE_PARTNER_LABEL : "Invite players";
}

export function openSeatCount(sides: GameShareContext["sides"]) {
  return sides.reduce(
    (count, side) => count + (side.left ? 0 : 1) + (side.right ? 0 : 1),
    0,
  );
}

/** "Tonight 8:30 PM, Court 2. 2 seats open." */
export function gameInviteSubtitle(game: GameShareContext, now: Date) {
  const start = game.windowStart ? new Date(game.windowStart) : null;
  const when = start
    ? `${relativeDay(start, now)} ${formatGameClock(start)}`
    : null;
  const place = [when, game.courtName ?? game.venueName]
    .filter(Boolean)
    .join(", ");
  const open = openSeatCount(game.sides);
  const seats =
    open === 0 ? null : open === 1 ? "1 seat open." : `${open} seats open.`;
  return [place ? `${place}.` : null, seats].filter(Boolean).join(" ") || null;
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

export function whatsAppUrl(body: string) {
  return `whatsapp://send?text=${encodeURIComponent(body)}`;
}

export function pendingHeading(count: number) {
  return `Pending, ${count}`;
}

export const PENDING_NOTE = "Waiting for an answer";
export const NO_PENDING_COPY = "No invites sent yet.";

type CommunityPreviewData = RouterOutputs["communities"]["previewInviteLink"];
type GroupPreviewData = RouterOutputs["groups"]["previewInviteLink"];
type TeamPreviewData = RouterOutputs["teams"]["previewInviteLink"];
type GamePreviewData = RouterOutputs["games"]["previewInviteLink"];

export function communityPreview(
  data: CommunityPreviewData,
): InviteLinkPreview {
  return data.status === "ready"
    ? { status: "ready", kind: "community", name: data.communityName }
    : { status: data.status };
}

export function groupPreview(data: GroupPreviewData): InviteLinkPreview {
  return data.status === "ready"
    ? { status: "ready", kind: "group", name: data.groupName }
    : { status: data.status };
}

export function teamPreview(data: TeamPreviewData): InviteLinkPreview {
  return data.status === "ready"
    ? { status: "ready", kind: "team", name: data.teamName }
    : { status: data.status };
}

export function gamePreview(data: GamePreviewData): InviteLinkPreview {
  return data.status === "ready"
    ? { status: "ready", kind: "game", game: data }
    : { status: data.status };
}
