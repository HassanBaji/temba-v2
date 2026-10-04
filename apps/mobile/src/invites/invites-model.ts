import { gameInviteClipboardText } from "@repo/domain/game-invite-share-message";
import { groupInviteClipboardText } from "@repo/domain/group-invite-share-message";
import type { RouterOutputs } from "@repo/api/types";
import type {
  InviteKind,
  InviteLinkPath,
  InviteLinkPreview,
} from "@repo/domain/invites";

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
      return "/profile/teams";
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

export function lookupResultView(
  row: LookupResultRow,
  selected: boolean,
): LookupResultView {
  const meta = row.cue ?? row.username ?? row.email ?? row.phoneNumber ?? null;
  return {
    id: row.id,
    name: row.name,
    meta,
    accessibilityLabel: [row.name, meta, selected ? "selected" : null]
      .filter(Boolean)
      .join(", "),
  };
}

export function toggleSelection<T extends { id: string }>(
  selected: readonly T[],
  row: T,
  mode: "multiple" | "single",
): T[] {
  if (selected.some((entry) => entry.id === row.id)) {
    return selected.filter((entry) => entry.id !== row.id);
  }
  return mode === "single" ? [row] : [...selected, row];
}

export function sendLookupLabel(count: number, pending: boolean) {
  if (pending) {
    return "Sending…";
  }
  return count > 1 ? `Send ${count} Lookup invites` : "Send Lookup invite";
}

export function revokeConfirmCopy(name: string) {
  return {
    title: `Revoke the invite for ${name}?`,
    description: "They can no longer accept it.",
    confirmLabel: "Revoke",
  };
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
