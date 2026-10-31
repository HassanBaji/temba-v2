"use client";

import * as React from "react";
import { toast } from "sonner";

import {
  InviteDialogView,
  type PendingLookupRow,
  type Slot,
} from "~/components/invites/invite-dialog-view";
import { toastGlobalFormError } from "~/lib/form-mutation-error";
import { COPY_LINK_FAILED_MESSAGE, copyTextWhenReady } from "~/lib/share-link";
import { api } from "~/trpc/react";
import {
  formatGameClock,
  formatRelativeDay,
} from "@repo/domain/format-game-start";
import {
  inviteModes,
  inviteSheetTitle,
  openSeatCount,
  rowWithPhone,
  textMessageUrl,
  type InviteMode,
  type LookupResultRow,
} from "@repo/domain/invite-door";
import {
  INVITE_LINK_COPIED_TOAST,
  LOOKUP_INVITE_REVOKED_TOAST,
  lookupInviteSentToast,
} from "@repo/domain/invites";
import {
  assembleE164,
  DEFAULT_CALLING_COUNTRY_ISO,
} from "@repo/domain/phone-number";
import { teamInviteSeatsLeft, type TeamRosterInput } from "@repo/domain/teams";

type DoorRights = {
  canLookup: boolean;
  canLink: boolean;
  subtitle: string | null;
  /** What a share carries; the bare link when omitted. */
  shareMessage?: (url: string) => string;
};

export type InviteDoor = DoorRights &
  (
    | { kind: "group"; groupId: string }
    | { kind: "game"; gameId: string }
    | { kind: "community"; communityId: string }
    | { kind: "team"; teamId: string; squad: boolean; roster: TeamRosterInput }
  );

const COPIED_MS = 1800;

type Refused = { name: string; message: string }[];

function slotOf<T>(query: {
  data: T | undefined;
  error: { message: string } | null;
}): Slot<T> {
  if (query.error) {
    return { status: "error", message: query.error.message };
  }
  if (query.data === undefined) {
    return { status: "loading" };
  }
  return { status: "ready", value: query.data };
}

/** "Today 8:30 PM, Court 2. 2 seats open." */
export function gameInviteSubtitle(game: {
  windowStart: Date | string | null;
  courtName: string | null;
  venueName: string | null;
  sides: Parameters<typeof openSeatCount>[0];
}) {
  const when = game.windowStart
    ? `${formatRelativeDay(game.windowStart, { sameDayLabel: "Today" })} ${formatGameClock(game.windowStart)}`
    : null;
  const place = [when, game.courtName ?? game.venueName]
    .filter(Boolean)
    .join(", ");
  const open = openSeatCount(game.sides);
  const seats =
    open === 0 ? null : open === 1 ? "1 seat open." : `${open} seats open.`;
  return [place ? `${place}.` : null, seats].filter(Boolean).join(" ") || null;
}

function textPlatform() {
  return /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent)
    ? "ios"
    : "android";
}

function whatsAppWebUrl(body: string) {
  return `https://wa.me/?text=${encodeURIComponent(body)}`;
}

export function InviteDoorDialog({
  door,
  open,
  onOpenChange,
  restoreFocusRef,
}: {
  door: InviteDoor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restoreFocusRef?: React.RefObject<HTMLElement | null>;
}) {
  const utils = api.useUtils();
  const isGroup = door.kind === "group";
  const isTeam = door.kind === "team";
  const isCommunity = door.kind === "community";
  const isGame = door.kind === "game";
  const communityId = door.kind === "community" ? door.communityId : "";
  const groupId = door.kind === "group" ? door.groupId : "";
  const gameId = door.kind === "game" ? door.gameId : "";
  const teamId = door.kind === "team" ? door.teamId : "";
  const modes = inviteModes(door);
  const [mode, setMode] = React.useState<InviteMode>(modes[0] ?? "link");
  const [query, setQuery] = React.useState("");
  const [sendingUserId, setSendingUserId] = React.useState<string | null>(null);
  const [refused, setRefused] = React.useState<Refused | null>(null);
  const [countryIso, setCountryIso] = React.useState(
    DEFAULT_CALLING_COUNTRY_ISO,
  );
  const [national, setNational] = React.useState("");
  const [phoneSending, setPhoneSending] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const copiedTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(
    () => () => {
      if (copiedTimer.current) {
        clearTimeout(copiedTimer.current);
      }
    },
    [],
  );

  const lookupOn = open && door.canLookup;
  const linkOn = open && door.canLink;
  const keepPrevious = <T,>(previous: T | undefined) => previous;
  const trimmed = query.trim();

  const groupSearch = api.groups.searchLookupUsers.useQuery(
    { groupId, query: trimmed },
    { enabled: lookupOn && isGroup, placeholderData: keepPrevious },
  );
  const gameSearch = api.games.searchLookupUsers.useQuery(
    { gameId, query: trimmed },
    { enabled: lookupOn && isGame, placeholderData: keepPrevious },
  );
  const teamSearch = api.teams.searchLookupUsers.useQuery(
    { teamId, query: trimmed },
    { enabled: lookupOn && isTeam, placeholderData: keepPrevious },
  );
  const communitySearch = api.communities.searchLookupUsers.useQuery(
    { communityId, query: trimmed },
    { enabled: lookupOn && isCommunity, placeholderData: keepPrevious },
  );
  const groupPending = api.groups.listLookupInvites.useQuery(
    { groupId },
    { enabled: lookupOn && isGroup },
  );
  const gamePending = api.games.listLookupInvites.useQuery(
    { gameId },
    { enabled: lookupOn && isGame },
  );
  const teamPending = api.teams.listInAppInvites.useQuery(
    { teamId },
    { enabled: lookupOn && isTeam },
  );
  const communityPending = api.communities.listLookupInvites.useQuery(
    { communityId },
    { enabled: lookupOn && isCommunity },
  );
  const groupLink = api.groups.getInviteLink.useQuery(
    { groupId },
    { enabled: linkOn && isGroup },
  );
  const gameLink = api.games.getInviteLink.useQuery(
    { gameId },
    { enabled: linkOn && isGame },
  );
  const teamLink = api.teams.getInviteLink.useQuery(
    { teamId },
    { enabled: linkOn && isTeam },
  );
  const communityLink = api.communities.getInviteLink.useQuery(
    { communityId },
    { enabled: linkOn && isCommunity },
  );

  const search = isCommunity
    ? communitySearch
    : isGroup
      ? groupSearch
      : isTeam
        ? teamSearch
        : gameSearch;
  const currentLink: { shortUrl?: string | null; inviteUrl: string } | null =
    (isCommunity
      ? communityLink
      : isGroup
        ? groupLink
        : isTeam
          ? teamLink
          : gameLink
    ).data ?? null;
  const pendingInvites: Slot<PendingLookupRow[]> = slotOf(
    isCommunity
      ? communityPending
      : isGroup
        ? groupPending
        : isTeam
          ? teamPending
          : gamePending,
  );

  async function refreshPending() {
    if (door.kind === "community") {
      await utils.communities.listLookupInvites.invalidate({ communityId });
    } else if (door.kind === "group") {
      await utils.groups.listLookupInvites.invalidate({ groupId });
    } else if (door.kind === "team") {
      await Promise.all([
        utils.teams.byId.invalidate({ id: teamId }),
        utils.teams.listInAppInvites.invalidate({ teamId }),
      ]);
    } else {
      await utils.games.listLookupInvites.invalidate({ gameId });
    }
  }

  function afterSend(result: { sent: unknown[]; refused: Refused }) {
    setRefused(result.refused.length > 0 ? result.refused : null);
    if (result.sent.length > 0) {
      toast.success(lookupInviteSentToast(result.sent.length));
    }
    // Search results are left cached on purpose: the row stays put and
    // flips to Invited once the pending list refetches.
    void refreshPending();
  }

  const sendGroup = api.groups.sendLookupInvite.useMutation({
    onSuccess: afterSend,
    onError: toastGlobalFormError,
  });
  const sendGame = api.games.sendLookupInvite.useMutation({
    onSuccess: afterSend,
    onError: toastGlobalFormError,
  });
  const sendCommunity = api.communities.sendLookupInvite.useMutation({
    onSuccess: afterSend,
    onError: toastGlobalFormError,
  });
  const sendTeam = api.teams.inviteInApp.useMutation({
    onSuccess: () => afterSend({ sent: [null], refused: [] }),
    onError: toastGlobalFormError,
  });

  const afterRevoke = {
    onSuccess: () => {
      toast.success(LOOKUP_INVITE_REVOKED_TOAST);
      void refreshPending();
    },
    onError: (error: { message: string }) => {
      toast.error(error.message);
    },
  };
  const revokeGroup = api.groups.revokeLookupInvite.useMutation(afterRevoke);
  const revokeGame = api.games.revokeLookupInvite.useMutation(afterRevoke);
  const revokeCommunity =
    api.communities.revokeLookupInvite.useMutation(afterRevoke);
  const revokeTeam = api.teams.revokeInAppInvite.useMutation(afterRevoke);

  const linkError = (error: { message: string }) => {
    toast.error(error.message);
  };
  const createGroupLink = api.groups.createInviteLink.useMutation({
    onSuccess: () => void utils.groups.getInviteLink.invalidate({ groupId }),
    onError: linkError,
  });
  const createGameLink = api.games.createInviteLink.useMutation({
    onSuccess: () => void utils.games.getInviteLink.invalidate({ gameId }),
    onError: linkError,
  });
  const createCommunityLink = api.communities.createInviteLink.useMutation({
    onSuccess: () =>
      void utils.communities.getInviteLink.invalidate({ communityId }),
    onError: linkError,
  });
  const createTeamLink = api.teams.createInviteLink.useMutation({
    onSuccess: () => void utils.teams.getInviteLink.invalidate({ teamId }),
    onError: linkError,
  });

  async function mintMessage(): Promise<string | null> {
    try {
      const link: { shortUrl?: string | null; inviteUrl: string } =
        door.kind === "team"
          ? await createTeamLink.mutateAsync({ teamId })
          : door.kind === "community"
            ? await createCommunityLink.mutateAsync({ communityId })
            : door.kind === "group"
              ? await createGroupLink.mutateAsync({ groupId })
              : await createGameLink.mutateAsync({ gameId });
      const url = link.shortUrl ?? link.inviteUrl;
      return door.shareMessage ? door.shareMessage(url) : url;
    } catch {
      return null;
    }
  }

  async function copyMessage(message: string) {
    try {
      await navigator.clipboard.writeText(message);
      toast.success(INVITE_LINK_COPIED_TOAST);
      return true;
    } catch {
      toast.error(COPY_LINK_FAILED_MESSAGE);
      return false;
    }
  }

  async function shareLink() {
    if (typeof navigator.share !== "function") {
      await copyLink();
      return;
    }
    const message = await mintMessage();
    if (!message) {
      return;
    }
    try {
      await navigator.share({ text: message });
      return;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
    }
    await copyMessage(message);
  }

  async function copyLink() {
    let wrote: boolean;
    try {
      wrote = await copyTextWhenReady(mintMessage());
    } catch {
      toast.error(COPY_LINK_FAILED_MESSAGE);
      return;
    }
    if (wrote) {
      toast.success(INVITE_LINK_COPIED_TOAST);
      setCopied(true);
      if (copiedTimer.current) {
        clearTimeout(copiedTimer.current);
      }
      copiedTimer.current = setTimeout(() => setCopied(false), COPIED_MS);
    }
  }

  async function openWhatsApp() {
    // Opened before the link is minted: a window opened after an await is
    // treated as a popup and blocked.
    const tab = window.open("", "_blank");
    const message = await mintMessage();
    if (!message) {
      tab?.close();
      return;
    }
    if (tab) {
      tab.opener = null;
      tab.location.href = whatsAppWebUrl(message);
    } else {
      window.location.href = whatsAppWebUrl(message);
    }
  }

  async function openMessages() {
    const message = await mintMessage();
    if (message) {
      window.location.href = textMessageUrl(textPlatform(), null, message);
    }
  }

  function sendLookup(userIds: string[]) {
    if (door.kind === "team") {
      const userId = userIds[0];
      return userId
        ? sendTeam.mutateAsync({ teamId, userId })
        : Promise.resolve();
    }
    if (door.kind === "community") {
      return sendCommunity.mutateAsync({ communityId, userIds });
    }
    if (door.kind === "group") {
      return sendGroup.mutateAsync({ groupId, userIds });
    }
    return sendGame.mutateAsync({ gameId, userIds });
  }

  async function invite(row: LookupResultRow) {
    setRefused(null);
    setSendingUserId(row.id);
    try {
      await sendLookup([row.id]);
    } catch {
      // The mutation's onError has already told the organizer.
    } finally {
      setSendingUserId(null);
    }
  }

  function searchByPhone(phoneQuery: string) {
    if (door.kind === "team") {
      return utils.teams.searchLookupUsers.fetch({ teamId, query: phoneQuery });
    }
    if (door.kind === "community") {
      return utils.communities.searchLookupUsers.fetch({
        communityId,
        query: phoneQuery,
      });
    }
    if (door.kind === "group") {
      return utils.groups.searchLookupUsers.fetch({
        groupId,
        query: phoneQuery,
      });
    }
    return utils.games.searchLookupUsers.fetch({ gameId, query: phoneQuery });
  }

  async function sendByText() {
    const assembled = assembleE164(countryIso, national);
    if (!assembled.ok) {
      return;
    }
    setPhoneSending(true);
    try {
      if (door.canLookup) {
        try {
          const rows = await searchByPhone(assembled.e164.slice(1));
          const member = rowWithPhone(rows, assembled.e164);
          if (member) {
            await sendLookup([member.id]);
          }
        } catch {
          // Still text them; the link works without an account match.
        }
      }
      const message = await mintMessage();
      if (!message) {
        return;
      }
      window.location.href = textMessageUrl(
        textPlatform(),
        assembled.e164,
        message,
      );
      setNational("");
    } finally {
      setPhoneSending(false);
    }
  }

  function revoke(inviteId: string) {
    if (door.kind === "team") {
      revokeTeam.mutate({ inviteId });
    } else if (door.kind === "community") {
      revokeCommunity.mutate({ inviteId });
    } else if (door.kind === "group") {
      revokeGroup.mutate({ inviteId });
    } else {
      revokeGame.mutate({ inviteId });
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setMode(modes[0] ?? "link");
      setQuery("");
      setRefused(null);
      setNational("");
      setCopied(false);
    }
    onOpenChange(next);
  }

  const revokePendingId =
    (revokeCommunity.isPending ? revokeCommunity.variables?.inviteId : null) ??
    (revokeGroup.isPending ? revokeGroup.variables?.inviteId : null) ??
    (revokeGame.isPending ? revokeGame.variables?.inviteId : null) ??
    (revokeTeam.isPending ? revokeTeam.variables?.inviteId : null) ??
    null;

  const pendingRows =
    pendingInvites.status === "ready" ? pendingInvites.value : [];
  const invitedUserIds = new Set(pendingRows.map((row) => row.user.id));
  const linkPending =
    createCommunityLink.isPending ||
    createGroupLink.isPending ||
    createGameLink.isPending ||
    createTeamLink.isPending;
  const teamFull =
    door.kind === "team" && pendingInvites.status === "ready"
      ? teamInviteSeatsLeft(door.roster, pendingRows.length) === 0
      : false;

  return (
    <InviteDialogView
      open={open}
      onOpenChange={handleOpenChange}
      restoreFocusRef={restoreFocusRef}
      title={inviteSheetTitle(door.kind, door.kind === "team" && door.squad)}
      subtitle={door.subtitle}
      modes={modes}
      mode={mode}
      onModeChange={setMode}
      players={
        door.canLookup
          ? {
              query,
              onQueryChange: setQuery,
              results: slotOf(search),
              invitedUserIds,
              busyUserId: sendingUserId,
              singlePick: door.kind === "team" && !door.squad,
              full: teamFull,
              onInvite: (row) => void invite(row),
              onUninvite: (userId) => {
                const row = pendingRows.find(
                  (entry) => entry.user.id === userId,
                );
                if (row) {
                  revoke(row.id);
                }
              },
              refused,
              canLink: door.canLink,
            }
          : null
      }
      phone={
        door.canLink
          ? {
              countryIso,
              national,
              onCountryIsoChange: setCountryIso,
              onNationalChange: setNational,
              ready: assembleE164(countryIso, national).ok,
              sending: phoneSending,
              onSend: () => void sendByText(),
              canLookup: door.canLookup,
            }
          : null
      }
      link={
        door.canLink
          ? {
              kind: door.kind,
              currentUrl: currentLink
                ? (currentLink.shortUrl ?? currentLink.inviteUrl)
                : null,
              pending: linkPending,
              copied,
              onShare: () => void shareLink(),
              onCopy: () => void copyLink(),
              onWhatsApp: () => void openWhatsApp(),
              onMessages: () => void openMessages(),
            }
          : null
      }
      pending={
        door.canLookup
          ? {
              rows: pendingInvites,
              revokingId: revokePendingId,
              onRevoke: revoke,
            }
          : null
      }
    />
  );
}
