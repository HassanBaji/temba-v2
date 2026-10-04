import { friendlyGameCanMintInvite } from "./friendly-game-cta";
import { gameJoinToast, GAME_TOAST } from "./game-copy";
import type { InviteHostLabel } from "./invite-outcome-copy";

export type InviteKind = "community" | "group" | "team" | "game";

const KIND_LABELS: Record<InviteKind, InviteHostLabel> = {
  community: "Community",
  group: "Group",
  team: "Team",
  game: "Game",
};

export function inviteKindLabel(kind: InviteKind): InviteHostLabel {
  return KIND_LABELS[kind];
}

export function inviteRowMeta(kind: InviteKind, inviterName: string | null) {
  return `${inviteKindLabel(kind)} invite from ${inviterName ?? "Someone"}`;
}

export const INVITES_EMPTY_COPY = {
  title: "Nothing waiting",
  description: "Invites to Games, Groups, Teams and Communities show up here.",
};

export const INVITES_ERROR_TITLE = "Invites could not be loaded";
export const INVITE_ACCEPT_LABEL = "Accept";
export const INVITE_SIT_HERE_LABEL = "Sit here";
export const INVITE_JOIN_WAITLIST_LABEL = "Join waitlist";
export const INVITE_LINK_COPIED_TOAST = "Invite link copied";
export const INVITE_LINK_COPY_FAILED_TOAST = "Couldn't copy the link";
export const LOOKUP_INVITE_REVOKED_TOAST = "Lookup invite revoked";

export const GROUP_LOOSE_LOOKUP_NOTE =
  "Only you can invite people here. Invites don't expire.";
export const GROUP_CLUB_LOOKUP_NOTE =
  "Owners and Admins can invite anyone, who then joins the Community too. The Group's creator can invite Community Members.";

export function groupLookupNote(isLoose: boolean) {
  return isLoose ? GROUP_LOOSE_LOOKUP_NOTE : GROUP_CLUB_LOOKUP_NOTE;
}

export type InviteInviter = {
  name: string | null;
  image: string | null;
};

type InviteRowBase = {
  id: string;
  createdAt: Date | string;
  invitedBy: InviteInviter;
};

export type InviteSeat = { name: string } | null;

export type InviteSide = {
  sideIndex: number;
  left: InviteSeat;
  right: InviteSeat;
};

export type InviteInboxSources<Side extends InviteSide = InviteSide> = {
  community: (InviteRowBase & { communityName: string })[];
  group: (InviteRowBase & { groupName: string | null })[];
  team: (InviteRowBase & { displayName: string })[];
  game: (InviteRowBase & {
    gameName: string;
    needsSeatPick: boolean;
    registrationStatus: string;
    sides: Side[];
    vacantSeats: readonly unknown[];
  })[];
};

export type InviteInboxSeatPick<Side extends InviteSide = InviteSide> = {
  sides: Side[];
  joinFrozen: boolean;
  waitlistOnly: boolean;
};

export type InviteInboxItem<Side extends InviteSide = InviteSide> = {
  key: string;
  kind: InviteKind;
  id: string;
  title: string;
  meta: string;
  inviterName: string;
  inviterImage: string | null;
  createdAt: Date | string;
  seatPick: InviteInboxSeatPick<Side> | null;
};

export type GameInviteSeatState = {
  joinFrozen: boolean;
  waitlistOnly: boolean;
};

export function gameInviteSeatState(game: {
  registrationStatus: string;
  vacantSeatCount: number;
}): GameInviteSeatState {
  const joinFrozen =
    game.registrationStatus === "closed" ||
    game.registrationStatus === "cancelled";
  const waitlistOnly =
    !joinFrozen &&
    (game.registrationStatus === "full" || game.vacantSeatCount === 0);
  return { joinFrozen, waitlistOnly };
}

function inboxItem<Side extends InviteSide>(
  kind: InviteKind,
  row: InviteRowBase,
  title: string,
  seatPick: InviteInboxSeatPick<Side> | null = null,
): InviteInboxItem<Side> {
  const inviterName = row.invitedBy.name ?? "Someone";
  return {
    key: `${kind}-${row.id}`,
    kind,
    id: row.id,
    title,
    meta: inviteRowMeta(kind, inviterName),
    inviterName,
    inviterImage: row.invitedBy.image,
    createdAt: row.createdAt,
    seatPick,
  };
}

export function mergeInviteInbox<Side extends InviteSide = InviteSide>(
  sources: Partial<InviteInboxSources<Side>>,
): InviteInboxItem<Side>[] {
  const items: InviteInboxItem<Side>[] = [
    ...(sources.community ?? []).map((row) =>
      inboxItem<Side>("community", row, row.communityName),
    ),
    ...(sources.group ?? []).map((row) =>
      inboxItem<Side>("group", row, row.groupName ?? "Untitled Group"),
    ),
    ...(sources.team ?? []).map((row) =>
      inboxItem<Side>("team", row, row.displayName),
    ),
    ...(sources.game ?? []).map((row) =>
      inboxItem<Side>(
        "game",
        row,
        row.gameName,
        row.needsSeatPick
          ? {
              sides: row.sides,
              ...gameInviteSeatState({
                registrationStatus: row.registrationStatus,
                vacantSeatCount: row.vacantSeats.length,
              }),
            }
          : null,
      ),
    ),
  ];
  return items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export type GameInviteSeatCopyMode = "inbox" | "link" | "link-signed-out";

const OCCUPIED_SEATS = "Occupied seats show who is already registered.";

export function gameInviteSeatCopy(
  state: GameInviteSeatState,
  mode: GameInviteSeatCopyMode,
) {
  if (state.joinFrozen) {
    return `${OCCUPIED_SEATS} This Game is not open for registration.`;
  }
  if (mode === "link-signed-out") {
    return `${OCCUPIED_SEATS} Sign in or create an account to pick a vacant Position.`;
  }
  if (state.waitlistOnly) {
    return mode === "link"
      ? `No vacant Position. ${OCCUPIED_SEATS} Accept to join the waitlist.`
      : `No vacant Position. ${OCCUPIED_SEATS}`;
  }
  return `${OCCUPIED_SEATS} Pick a vacant Position to sit.`;
}

export function lookupInviteAcceptToast(
  kind: InviteKind,
  result: { waitlisted?: boolean } = {},
) {
  if (kind === "game") {
    return gameJoinToast(result.waitlisted ?? false);
  }
  return `Joined ${inviteKindLabel(kind)}`;
}

export type GameInviteLinkOutcome =
  | "registered"
  | "waitlisted"
  | "already"
  | "waiting_for_partner";

export function inviteLinkAcceptToast(
  kind: InviteKind,
  outcome?: GameInviteLinkOutcome,
) {
  if (kind !== "game") {
    return `Joined ${inviteKindLabel(kind)}`;
  }
  if (outcome === "waiting_for_partner") {
    return "Waiting for your Team partner to accept";
  }
  if (outcome === "waitlisted") {
    return GAME_TOAST.joinedWaitlist;
  }
  if (outcome === "already") {
    return "Already on this Game";
  }
  return GAME_TOAST.joined;
}

export function lookupInviteSentToast(sentCount: number) {
  return sentCount === 1
    ? "Lookup invite sent"
    : `${sentCount} Lookup invites sent`;
}

export function gameInviteAccess(game: {
  friendlyChrome: boolean;
  isOrganizer: boolean;
  registrationStatus: string;
  cancelledAt: Date | string | null;
  joinFrozen: boolean;
  registrationMode: string;
  partnerRequired: boolean;
}) {
  const canManage = game.friendlyChrome
    ? friendlyGameCanMintInvite(game)
    : Boolean(game.isOrganizer && !game.cancelledAt && !game.joinFrozen);
  const canSendLookup =
    canManage && game.registrationMode !== "team_only" && !game.partnerRequired;
  return { canManage, canSendLookup };
}

export type GameInviteLinkReady = {
  gameId: string;
  gameName: string | null;
  registrationStatus: string;
  needsSeatPick: boolean;
  partnerRequiredJoin: boolean;
  sides: InviteSide[];
  vacantSeats: readonly unknown[];
  levelMinTenths: number | null;
  levelMaxTenths: number | null;
  viewerLevelTenths: number | null;
  viewerPassesLevelRange: boolean | null;
  levelRangeRequest: { status: string } | null;
  canRequestLevelRange: boolean;
};

export type InviteLinkPreview =
  | { status: "invalid" | "unavailable" }
  | { status: "ready"; kind: "community" | "group" | "team"; name: string }
  | { status: "ready"; kind: "game"; game: GameInviteLinkReady };

export const LEVEL_RANGE_REQUEST_PENDING_NOTE =
  "Request pending. Organizers have not decided yet.";

export function levelRangeGateAction(args: {
  requestStatus: string | null;
  canRequest: boolean;
  requesting: boolean;
}):
  | { kind: "pending-note"; text: string }
  | { kind: "button"; label: string; disabled: boolean } {
  if (args.requestStatus === "pending") {
    return { kind: "pending-note", text: LEVEL_RANGE_REQUEST_PENDING_NOTE };
  }
  const label = args.requesting
    ? "Requesting…"
    : args.requestStatus === "rejected"
      ? "Request again"
      : "Request to play";
  return {
    kind: "button",
    label,
    disabled: args.requesting || !args.canRequest,
  };
}

export type GameInviteLinkStage =
  | "level_range"
  | "partner"
  | "seat_pick"
  | "accept";

export function gameInviteLinkStage(
  preview: {
    viewerPassesLevelRange: boolean | null;
    partnerRequiredJoin: boolean;
    needsSeatPick: boolean;
  },
  isSignedIn: boolean,
): GameInviteLinkStage {
  const blockedByLevelRange =
    isSignedIn && preview.viewerPassesLevelRange === false;
  if (blockedByLevelRange) {
    return "level_range";
  }
  if (preview.partnerRequiredJoin) {
    return "partner";
  }
  if (preview.needsSeatPick) {
    return "seat_pick";
  }
  return "accept";
}

export type InviteLinkPath =
  | { kind: InviteKind; token: string }
  | { kind: "game-short" | "group-short"; code: string };

const TOKEN_PATH = /^\/invites\/(community|group|team|game)\/link\/([^/]+)$/;
const GAME_SHORT_PATH = /^\/g\/([^/]+)$/;
const GROUP_SHORT_PATH = /^\/gr\/([^/]+)$/;

export function parseInviteLink(input: string): InviteLinkPath | null {
  const pathname = pathnameOf(input.trim());
  if (!pathname) {
    return null;
  }
  const token = TOKEN_PATH.exec(pathname);
  if (token) {
    return {
      kind: token[1] as InviteKind,
      token: decodeURIComponent(token[2]!),
    };
  }
  const gameShort = GAME_SHORT_PATH.exec(pathname);
  if (gameShort) {
    return { kind: "game-short", code: decodeURIComponent(gameShort[1]!) };
  }
  const groupShort = GROUP_SHORT_PATH.exec(pathname);
  if (groupShort) {
    return { kind: "group-short", code: decodeURIComponent(groupShort[1]!) };
  }
  return null;
}

function pathnameOf(value: string) {
  if (value.startsWith("/")) {
    return value.split(/[?#]/)[0] ?? null;
  }
  const match = /^https?:\/\/[^/\s?#]+(\/[^?#\s]*)?/i.exec(value);
  if (!match) {
    return null;
  }
  const path = match[1] ?? "/";
  return path.length > 1 ? path.replace(/\/+$/, "") : path;
}
