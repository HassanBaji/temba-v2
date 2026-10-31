import {
  gameInviteClipboardText,
  type GameInviteShareFootball,
} from "@repo/domain/game-invite-share-message";
import { groupInviteClipboardText } from "@repo/domain/group-invite-share-message";
import { formatGameClock } from "@repo/domain/format-game-start";
import { openSeatCount } from "@repo/domain/invite-door";
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
  customName?: string | null;
  format: string;
  sport?: string | null;
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
  football?: GameInviteShareFootball;
};

export function gameShareMessage(
  game: GameShareContext,
  link: { shortUrl: string | null; inviteUrl: string },
) {
  const url = link.shortUrl ?? link.inviteUrl;
  return gameInviteClipboardText({
    format: game.format,
    sport: game.sport,
    registrationMode: game.registrationMode,
    shortUrl: url,
    roster: {
      customName: game.customName,
      venueName: game.venueName ?? "Venue",
      courtName: game.courtName,
      windowStart: game.windowStart,
      windowEnd: game.windowEnd,
      sides: game.sides,
      shortUrl: url,
      football: game.football,
    },
  });
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

export function whatsAppUrl(body: string) {
  return `whatsapp://send?text=${encodeURIComponent(body)}`;
}

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
    ? {
        status: "ready",
        kind: "group",
        name: data.groupName,
        requiresApproval: data.requiresApproval,
      }
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
