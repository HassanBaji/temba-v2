import {
  INVITE_LINK_COPIED_TOAST,
  INVITE_LINK_COPY_FAILED_TOAST,
  LOOKUP_INVITE_REVOKED_TOAST,
  lookupInviteSentToast,
} from "@repo/domain/invites";
import {
  assembleE164,
  DEFAULT_CALLING_COUNTRY_ISO,
} from "@repo/domain/phone-number";
import {
  inviteModes,
  inviteSheetTitle,
  rowWithPhone,
  textMessageUrl,
  type InviteMode,
  type LookupResultRow,
} from "@repo/domain/invite-door";
import { teamLookupNote } from "@repo/domain/teams";
import * as Clipboard from "expo-clipboard";
import { useEffect, useRef, useState } from "react";
import { Linking, Platform, Share } from "react-native";

import { useNow } from "../games/use-now";
import { splitTrpcFormError } from "../lib/form-error";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";
import {
  gameInviteSubtitle,
  gameShareMessage,
  groupShareMessage,
  whatsAppUrl,
  type GameShareContext,
} from "./invites-model";
import { InviteSheetView, type PendingLookupRow } from "./invite-sheet-view";
import type { Slot } from "../home/home-model";

export type InviteDoor =
  | {
      kind: "group";
      groupId: string;
      name: string | null;
      sport: string | null;
      note: string;
      canLookup: boolean;
      canLink: boolean;
    }
  | {
      kind: "game";
      gameId: string;
      share: GameShareContext;
      canLookup: boolean;
      canLink: boolean;
    }
  | {
      kind: "community";
      communityId: string;
      note: string;
      canLookup: boolean;
      canLink: boolean;
    }
  | {
      kind: "team";
      teamId: string;
      squad: boolean;
      canLookup: boolean;
      canLink: boolean;
    };

const COPIED_MS = 1800;

type LinkResult = { shortUrl: string | null; inviteUrl: string };
type LinkResultLike = { shortUrl?: string | null; inviteUrl: string };

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

export function InviteDoorSheet({
  door,
  visible,
  onClose,
}: {
  door: InviteDoor;
  visible: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const utils = api.useUtils();
  const isGroup = door.kind === "group";
  const isTeam = door.kind === "team";
  const isCommunity = door.kind === "community";
  const communityId = door.kind === "community" ? door.communityId : "";
  const groupId = door.kind === "group" ? door.groupId : "";
  const gameId = door.kind === "game" ? door.gameId : "";
  const teamId = door.kind === "team" ? door.teamId : "";
  const now = useNow();
  const modes = inviteModes(door);
  const [mode, setMode] = useState<InviteMode>(modes[0] ?? "link");
  const [query, setQuery] = useState("");
  const [sendingUserId, setSendingUserId] = useState<string | null>(null);
  const [refused, setRefused] = useState<
    { name: string; message: string }[] | null
  >(null);
  const [countryIso, setCountryIso] = useState(DEFAULT_CALLING_COUNTRY_ISO);
  const [national, setNational] = useState("");
  const [phoneSending, setPhoneSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (copiedTimer.current) {
        clearTimeout(copiedTimer.current);
      }
    },
    [],
  );

  const lookupOn = visible && door.canLookup;
  const linkOn = visible && door.canLink;
  const keepPrevious = <T,>(previous: T | undefined) => previous;

  const groupSearch = api.groups.searchLookupUsers.useQuery(
    { groupId, query: query.trim() },
    { enabled: lookupOn && isGroup, placeholderData: keepPrevious },
  );
  const gameSearch = api.games.searchLookupUsers.useQuery(
    { gameId, query: query.trim() },
    {
      enabled: lookupOn && door.kind === "game",
      placeholderData: keepPrevious,
    },
  );
  const teamSearch = api.teams.searchLookupUsers.useQuery(
    { teamId, query: query.trim() },
    { enabled: lookupOn && isTeam, placeholderData: keepPrevious },
  );
  const communitySearch = api.communities.searchLookupUsers.useQuery(
    { communityId, query: query.trim() },
    { enabled: lookupOn && isCommunity, placeholderData: keepPrevious },
  );
  const communityPending = api.communities.listLookupInvites.useQuery(
    { communityId },
    { enabled: lookupOn && isCommunity },
  );
  const communityLink = api.communities.getInviteLink.useQuery(
    { communityId },
    { enabled: linkOn && isCommunity },
  );
  const teamPending = api.teams.listInAppInvites.useQuery(
    { teamId },
    { enabled: lookupOn && isTeam },
  );
  const groupPending = api.groups.listLookupInvites.useQuery(
    { groupId },
    { enabled: lookupOn && isGroup },
  );
  const gamePending = api.games.listLookupInvites.useQuery(
    { gameId },
    { enabled: lookupOn && door.kind === "game" },
  );
  const groupLink = api.groups.getInviteLink.useQuery(
    { groupId },
    { enabled: linkOn && isGroup },
  );
  const gameLink = api.games.getInviteLink.useQuery(
    { gameId },
    { enabled: linkOn && door.kind === "game" },
  );
  const teamLink = api.teams.getInviteLink.useQuery(
    { teamId },
    { enabled: linkOn && isTeam },
  );

  const search = isCommunity
    ? communitySearch
    : isGroup
      ? groupSearch
      : isTeam
        ? teamSearch
        : gameSearch;
  const currentLink: LinkResultLike | null | undefined = (
    isCommunity
      ? communityLink
      : isGroup
        ? groupLink
        : isTeam
          ? teamLink
          : gameLink
  ).data;
  const pendingInvites: Slot<PendingLookupRow[]> = slotOf(
    isCommunity
      ? communityPending
      : isGroup
        ? groupPending
        : isTeam
          ? teamPending
          : gamePending,
  );

  function afterSend(result: {
    sent: unknown[];
    refused: { name: string; message: string }[];
  }) {
    setRefused(result.refused.length > 0 ? result.refused : null);
    if (result.sent.length > 0) {
      toast.show(lookupInviteSentToast(result.sent.length));
    }
    // Search results are left cached on purpose: the row stays put and
    // flips to Invited once the pending list refetches.
    if (isCommunity) {
      void utils.communities.listLookupInvites.invalidate({ communityId });
    } else if (isGroup) {
      void utils.groups.listLookupInvites.invalidate({ groupId });
    } else if (isTeam) {
      void utils.teams.byId.invalidate({ id: teamId });
      void utils.teams.listInAppInvites.invalidate({ teamId });
    } else {
      void utils.games.listLookupInvites.invalidate({ gameId });
    }
  }

  function onSendError(error: { message: string; data?: unknown }) {
    const split = splitTrpcFormError(
      error as Parameters<typeof splitTrpcFormError>[0],
    );
    const message =
      split.globalMessage ?? Object.values(split.fieldErrors)[0] ?? null;
    toast.show(message ?? error.message);
  }

  const sendGroup = api.groups.sendLookupInvite.useMutation({
    onSuccess: afterSend,
    onError: onSendError,
  });
  const sendGame = api.games.sendLookupInvite.useMutation({
    onSuccess: afterSend,
    onError: onSendError,
  });
  const sendCommunity = api.communities.sendLookupInvite.useMutation({
    onSuccess: afterSend,
    onError: onSendError,
  });
  const revokeCommunity = api.communities.revokeLookupInvite.useMutation({
    onSuccess: () => {
      toast.show(LOOKUP_INVITE_REVOKED_TOAST);
      void utils.communities.listLookupInvites.invalidate({ communityId });
    },
    onError: (error) => toast.show(error.message),
  });
  const createCommunityLink = api.communities.createInviteLink.useMutation({
    onSuccess: () =>
      void utils.communities.getInviteLink.invalidate({ communityId }),
    onError: (error) => toast.show(error.message),
  });
  const sendTeam = api.teams.inviteInApp.useMutation({
    onSuccess: () => afterSend({ sent: [null], refused: [] }),
    onError: onSendError,
  });
  const revokeTeam = api.teams.revokeInAppInvite.useMutation({
    onSuccess: () => {
      toast.show(LOOKUP_INVITE_REVOKED_TOAST);
      void utils.teams.byId.invalidate({ id: teamId });
      void utils.teams.listInAppInvites.invalidate({ teamId });
      void utils.teams.searchLookupUsers.invalidate({ teamId });
    },
    onError: (error) => toast.show(error.message),
  });
  const revokeGroup = api.groups.revokeLookupInvite.useMutation({
    onSuccess: () => {
      toast.show(LOOKUP_INVITE_REVOKED_TOAST);
      void utils.groups.listLookupInvites.invalidate({ groupId });
    },
    onError: (error) => toast.show(error.message),
  });
  const revokeGame = api.games.revokeLookupInvite.useMutation({
    onSuccess: () => {
      toast.show(LOOKUP_INVITE_REVOKED_TOAST);
      void utils.games.listLookupInvites.invalidate({ gameId });
    },
    onError: (error) => toast.show(error.message),
  });
  const createGroupLink = api.groups.createInviteLink.useMutation({
    onSuccess: () => void utils.groups.getInviteLink.invalidate({ groupId }),
    onError: (error) => toast.show(error.message),
  });
  const createGameLink = api.games.createInviteLink.useMutation({
    onSuccess: () => void utils.games.getInviteLink.invalidate({ gameId }),
    onError: (error) => toast.show(error.message),
  });

  const createTeamLink = api.teams.createInviteLink.useMutation({
    onSuccess: () => void utils.teams.getInviteLink.invalidate({ teamId }),
    onError: (error) => toast.show(error.message),
  });

  function messageFor(link: LinkResult) {
    if (door.kind === "team" || door.kind === "community") {
      return link.shortUrl ?? link.inviteUrl;
    }
    return door.kind === "group"
      ? groupShareMessage({ name: door.name, sport: door.sport, link })
      : gameShareMessage(door.share, link);
  }

  async function mintLink(): Promise<LinkResult | null> {
    try {
      if (door.kind === "team") {
        const link = await createTeamLink.mutateAsync({ teamId });
        return { shortUrl: null, inviteUrl: link.inviteUrl };
      }
      if (door.kind === "community") {
        const link = await createCommunityLink.mutateAsync({ communityId });
        return { shortUrl: null, inviteUrl: link.inviteUrl };
      }
      return door.kind === "group"
        ? await createGroupLink.mutateAsync({ groupId })
        : await createGameLink.mutateAsync({ gameId });
    } catch {
      return null;
    }
  }

  async function copyMessage(message: string) {
    try {
      await Clipboard.setStringAsync(message);
      toast.show(INVITE_LINK_COPIED_TOAST);
      return true;
    } catch {
      toast.show(INVITE_LINK_COPY_FAILED_TOAST);
      return false;
    }
  }

  async function shareMessage(message: string) {
    try {
      await Share.share({ message });
    } catch {
      await copyMessage(message);
    }
  }

  async function shareLink() {
    const link = await mintLink();
    if (link) {
      await shareMessage(messageFor(link));
    }
  }

  async function copyLink() {
    const link = await mintLink();
    if (link && (await copyMessage(messageFor(link)))) {
      setCopied(true);
      if (copiedTimer.current) {
        clearTimeout(copiedTimer.current);
      }
      copiedTimer.current = setTimeout(() => setCopied(false), COPIED_MS);
    }
  }

  async function openWith(url: (message: string) => string) {
    const link = await mintLink();
    if (!link) {
      return;
    }
    const message = messageFor(link);
    try {
      await Linking.openURL(url(message));
    } catch {
      await shareMessage(message);
    }
  }

  function sendLookup(userIds: string[]) {
    if (door.kind === "team") {
      const userId = userIds[0];
      return userId
        ? sendTeam.mutateAsync({ teamId: door.teamId, userId })
        : Promise.resolve();
    }
    if (door.kind === "community") {
      return sendCommunity.mutateAsync({
        communityId: door.communityId,
        userIds,
      });
    }
    if (door.kind === "group") {
      return sendGroup.mutateAsync({ groupId: door.groupId, userIds });
    }
    return sendGame.mutateAsync({ gameId: door.gameId, userIds });
  }

  async function invite(row: LookupResultRow) {
    setRefused(null);
    setSendingUserId(row.id);
    try {
      await sendLookup([row.id]);
    } catch {
      // onSendError has already told the organizer.
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
      const link = await mintLink();
      if (!link) {
        return;
      }
      const message = messageFor(link);
      try {
        await Linking.openURL(
          textMessageUrl(Platform.OS, assembled.e164, message),
        );
      } catch {
        await shareMessage(message);
      }
      setNational("");
    } finally {
      setPhoneSending(false);
    }
  }

  function close() {
    setMode(modes[0] ?? "link");
    setQuery("");
    setRefused(null);
    setNational("");
    setCopied(false);
    onClose();
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
  const subtitle =
    door.kind === "game"
      ? gameInviteSubtitle(door.share, now)
      : door.kind === "team"
        ? teamLookupNote(door.squad)
        : door.note;

  return (
    <InviteSheetView
      visible={visible}
      onClose={close}
      title={inviteSheetTitle(door.kind, isTeam && door.squad)}
      subtitle={subtitle}
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
              singlePick: isTeam && !door.squad,
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
              onWhatsApp: () => void openWith(whatsAppUrl),
              onMessages: () =>
                void openWith((message) =>
                  textMessageUrl(Platform.OS, null, message),
                ),
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
