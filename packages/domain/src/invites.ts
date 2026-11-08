import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { shortName } from "./football-board";
import type { FootballPosition, FootballRole } from "./football-lineup";
import { friendlyGameCanMintInvite } from "./friendly-game-cta";
import { sportLabel } from "./sport";
import { gameDisplayName, type GameDisplayNameInput } from "./game-custom-name";
import { gameJoinToast } from "./game-copy";
import type { GameInviteHero } from "./game-invite-hero";
import type { InviteHostLabel } from "./invite-outcome-copy";

export type InviteKind = "group" | "team" | "game";

const KIND_HOST_LABELS: Record<InviteKind, InviteHostLabel> = {
  group: "Group",
  team: "Team",
  game: "Game",
};

/** The host kind as `inviteOutcomeCopy` names it; an id, not copy. */
export function inviteKindLabel(kind: InviteKind): InviteHostLabel {
  return KIND_HOST_LABELS[kind];
}

export function inviteRowMeta(
  kind: InviteKind,
  inviterName: string | null,
  locale: Locale,
) {
  const m = messagesFor(locale);
  return m.invite.inbox.rowMeta[kind](inviterName ?? m.common.someone);
}

export function groupLookupNote(locale: Locale) {
  return messagesFor(locale).invite.inbox.groupLookupNote;
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
  group: (InviteRowBase & { groupName: string | null })[];
  team: (InviteRowBase & { displayName: string })[];
  game: (InviteRowBase & {
    gameName: string;
    game: GameDisplayNameInput;
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
  locale: Locale,
  seatPick: InviteInboxSeatPick<Side> | null = null,
): InviteInboxItem<Side> {
  const inviterName = row.invitedBy.name ?? messagesFor(locale).common.someone;
  return {
    key: `${kind}-${row.id}`,
    kind,
    id: row.id,
    title,
    meta: inviteRowMeta(kind, inviterName, locale),
    inviterName,
    inviterImage: row.invitedBy.image,
    createdAt: row.createdAt,
    seatPick,
  };
}

export function mergeInviteInbox<Side extends InviteSide = InviteSide>(
  sources: Partial<InviteInboxSources<Side>>,
  locale: Locale,
): InviteInboxItem<Side>[] {
  const untitledGroup = messagesFor(locale).group.untitled;
  const items: InviteInboxItem<Side>[] = [
    ...(sources.group ?? []).map((row) =>
      inboxItem<Side>("group", row, row.groupName ?? untitledGroup, locale),
    ),
    ...(sources.team ?? []).map((row) =>
      inboxItem<Side>("team", row, row.displayName, locale),
    ),
    ...(sources.game ?? []).map((row) =>
      inboxItem<Side>(
        "game",
        row,
        gameDisplayName(row.game, locale),
        locale,
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

export function gameInviteSeatCopy(
  state: GameInviteSeatState,
  mode: GameInviteSeatCopyMode,
  locale: Locale,
) {
  const m = messagesFor(locale).invite.inbox.seatCopy;
  if (state.joinFrozen) {
    return m.frozen;
  }
  if (mode === "link-signed-out") {
    return m.signedOut;
  }
  if (state.waitlistOnly) {
    return mode === "link" ? m.waitlistLink : m.waitlistInbox;
  }
  return m.pick;
}

export function lookupInviteAcceptToast(
  kind: InviteKind,
  locale: Locale,
  result: { waitlisted?: boolean } = {},
) {
  if (kind === "game") {
    return gameJoinToast(result.waitlisted ?? false, locale);
  }
  return messagesFor(locale).invite.inbox.joinedToast[kind];
}

export type GameInviteLinkOutcome =
  | "registered"
  | "waitlisted"
  | "already"
  | "waiting_for_partner";

export function inviteLinkJoinLabel(
  name: string,
  locale: Locale,
  requiresApproval = false,
) {
  const m = messagesFor(locale).invite.link;
  return requiresApproval ? m.requestJoinLabel(name) : m.joinLabel(name);
}

export function inviteLinkAcceptToast(
  kind: InviteKind,
  locale: Locale,
  outcome?: GameInviteLinkOutcome,
  joinedGroup = false,
) {
  const m = messagesFor(locale).invite;
  if (kind !== "game") {
    return m.inbox.joinedToast[kind];
  }
  if (outcome === "waiting_for_partner") {
    return m.link.waitingForPartnerToast;
  }
  if (outcome === "waitlisted") {
    return joinedGroup
      ? m.link.joinedWaitlistAndGroupToast
      : gameJoinToast(true, locale);
  }
  if (outcome === "already") {
    return m.link.alreadyOnGameToast;
  }
  return joinedGroup
    ? m.link.joinedGameAndGroupToast
    : gameJoinToast(false, locale);
}

export function lookupInviteSentToast(sentCount: number, locale: Locale) {
  return messagesFor(locale).invite.inbox.lookupSent(sentCount);
}

export function gameInviteAccess(game: {
  friendlyChrome: boolean;
  isOrganizer: boolean;
  registrationStatus: string;
  cancelledAt: Date | string | null;
  registrationMode: string;
  partnerRequired: boolean;
}) {
  const canManage = game.friendlyChrome
    ? friendlyGameCanMintInvite(game)
    : Boolean(game.isOrganizer && !game.cancelledAt);
  const canSendLookup =
    canManage && game.registrationMode !== "team_only" && !game.partnerRequired;
  return { canManage, canSendLookup };
}

export type GameInviteFootball = {
  players: {
    name: string;
    role: FootballRole | null;
    position: FootballPosition | null;
  }[];
  sideSize: number | null;
  playersAllowed: number | null;
  pricePerPlayerFils: number | null;
  teamsSet: boolean;
  preferred: { role: FootballRole | null; position: FootballPosition | null };
};

export type GameInviteLinkReady = {
  gameId: string;
  gameName: string | null;
  game: GameDisplayNameInput;
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
  /** Set for a signed-in viewer who can still join a football Game. */
  football: GameInviteFootball | null;
  /** The Game's Group as the signed-in viewer stands to it; null off a Group. */
  group?: GameInviteGroup | null;
  /** When, where and who is in, for the head of the link screen. */
  hero?: GameInviteHero | null;
  /** A public Game seats a non-member as a guest, without the Group. */
  isPublic?: boolean;
};

export type GameInviteGroupJoinMode =
  | "member"
  | "join"
  | "request"
  | "requested"
  | "blocked";

export type GameInviteGroup = {
  id: string;
  name: string | null;
  sport: string | null;
  imageUrl: string | null;
  memberCount: number;
  /** A few member names for the stack line, longest-standing first. */
  memberNames: string[];
  joinMode: GameInviteGroupJoinMode;
  sharedBy: { name: string | null } | null;
  pendingRequest: {
    id: string;
    seatHeldUntil: Date | string | null;
  } | null;
};

/** How long a Seat hold lasts while the Group decides (ADR-0057). */
export const GAME_INVITE_SEAT_HOLD_HOURS = 24;

export function seatHoldExpiry(now: Date) {
  return new Date(now.getTime() + GAME_INVITE_SEAT_HOLD_HOURS * 60 * 60 * 1000);
}

export function isSeatHoldLive(
  seatHeldUntil: Date | string | null | undefined,
  now: Date,
) {
  return (
    seatHeldUntil != null && new Date(seatHeldUntil).getTime() > now.getTime()
  );
}

/**
 * What stands between a link holder and the seat: nothing, the Group's open
 * door, its approval queue, or a request they already sent.
 */
export type GameInviteGroupGate = "none" | "open" | "approval" | "requested";

export function gameInviteGroupGate(
  group: GameInviteGroup | null | undefined,
): GameInviteGroupGate {
  switch (group?.joinMode) {
    case "join":
      return "open";
    case "request":
      return "approval";
    case "requested":
      return "requested";
    default:
      return "none";
  }
}

export type GameInviteGroupChoice = "with_seat" | "group_only";

function groupNameOf(group: GameInviteGroup, locale: Locale) {
  return group.name ?? messagesFor(locale).group.untitled;
}

function sharerNameOf(group: GameInviteGroup) {
  return group.sharedBy?.name ? shortName(group.sharedBy.name) : null;
}

export function gameInviteGroupCard(group: GameInviteGroup, locale: Locale) {
  const m = messagesFor(locale).mobileInvite.link.group;
  const members = m.members(group.memberCount);
  const names = group.memberNames.slice(0, 3).map(shortName);
  return {
    name: groupNameOf(group, locale),
    sport: sportLabel(group.sport, locale),
    meta: m.groupMeta(sportLabel(group.sport, locale), members),
    memberLine:
      names.length > 0
        ? m.memberNames(names, group.memberCount - names.length)
        : members,
  };
}

export function gameInviteGroupSheetCopy(
  group: GameInviteGroup,
  locale: Locale,
) {
  const m = messagesFor(locale).mobileInvite.link.group;
  const name = groupNameOf(group, locale);
  const sharer = sharerNameOf(group);
  const approval = gameInviteGroupGate(group) === "approval";
  return {
    title: m.sheetTitle,
    lead: approval ? m.approvalLead(name, sharer) : m.openLead(name),
    options: [
      {
        choice: "with_seat" as const,
        title: approval ? m.requestBoth.title : m.joinBoth.title,
        description: approval
          ? m.requestBoth.description(GAME_INVITE_SEAT_HOLD_HOURS)
          : m.joinBoth.description(name),
      },
      {
        choice: "group_only" as const,
        title: approval ? m.requestGroupOnly.title : m.joinGroupOnly.title,
        description: approval
          ? m.requestGroupOnly.description
          : m.joinGroupOnly.description,
      },
    ],
    dismissLabel: approval ? null : m.justLooking,
    note: approval ? m.approvalNote(sharer) : null,
  };
}

export function gameInviteGroupLandingCopy(
  group: GameInviteGroup,
  openSeats: number,
  locale: Locale,
) {
  const m = messagesFor(locale).mobileInvite.link.group;
  const name = groupNameOf(group, locale);
  const sharer = sharerNameOf(group);
  return {
    heroNote: [sharer ? m.sharedBy(sharer) : null, m.notInYet(name)]
      .filter(Boolean)
      .join(" "),
    note: m.landingNote(name),
    joinGroupLabel: m.joinGroup,
    joinGameLabel: m.joinGame,
    barTitle: openSeats > 0 ? m.seatsOpen(openSeats) : null,
    barSubline: m.asksFirst,
  };
}

export function gameInviteGroupJoinedCopy(
  group: GameInviteGroup,
  openSeats: number,
  locale: Locale,
) {
  const m = messagesFor(locale).mobileInvite.link.group;
  const name = groupNameOf(group, locale);
  return {
    title: m.joinedTitle(name),
    description: m.joinedDescription(
      openSeats > 0 ? m.seatsOpen(openSeats) : null,
    ),
    openGroupLabel: m.openGroup,
    barTitle: openSeats > 0 ? m.seatsOpen(openSeats) : null,
    barSubline: m.oneTap,
  };
}

export function gameInviteGroupRequestCard(
  group: GameInviteGroup,
  heldUntilLabel: string | null,
  locale: Locale,
) {
  const m = messagesFor(locale).mobileInvite.link.group;
  const sharerName = group.sharedBy?.name ?? null;
  return {
    title: m.requestSentTitle(groupNameOf(group, locale)),
    description: heldUntilLabel
      ? m.seatHeldUntil(heldUntilLabel)
      : m.noSeatHeld,
    sharedByLabel: m.sharedByLabel,
    sharedByValue: sharerName ? m.sharedByOrganizer(sharerName) : null,
    withdrawLabel: m.withdraw,
    barTitle: m.waitingTitle,
    barSubline: m.waitingSubline,
  };
}

export type InviteLinkPreview =
  | { status: "invalid" | "unavailable" }
  | {
      status: "ready";
      kind: "group" | "team";
      name: string;
      /** A Group whose Organizers approve new members: accepting sends a request. */
      requiresApproval?: boolean;
    }
  | { status: "ready"; kind: "game"; game: GameInviteLinkReady };

export function levelRangeGateAction(args: {
  requestStatus: string | null;
  canRequest: boolean;
  requesting: boolean;
  locale: Locale;
}):
  | { kind: "pending-note"; text: string }
  | { kind: "button"; label: string; disabled: boolean } {
  const m = messagesFor(args.locale).invite.link;
  if (args.requestStatus === "pending") {
    return { kind: "pending-note", text: m.levelRangePendingNote };
  }
  const label = args.requesting
    ? m.requesting
    : args.requestStatus === "rejected"
      ? m.requestAgain
      : m.requestToPlay;
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
  | "football"
  | "accept";

export function gameInviteLinkStage(
  preview: {
    viewerPassesLevelRange: boolean | null;
    partnerRequiredJoin: boolean;
    needsSeatPick: boolean;
    football?: GameInviteFootball | null;
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
  if (isSignedIn && preview.football) {
    return "football";
  }
  return "accept";
}

export type InviteLinkPath =
  | { kind: InviteKind; token: string }
  | { kind: "game-short" | "group-short"; code: string };

const TOKEN_PATH = /^\/invites\/(group|team|game)\/link\/([^/]+)$/;
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
