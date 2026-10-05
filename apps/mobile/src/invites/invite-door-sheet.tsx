import {
  INVITE_LINK_COPIED_TOAST,
  INVITE_LINK_COPY_FAILED_TOAST,
  LOOKUP_INVITE_REVOKED_TOAST,
  lookupInviteSentToast,
} from "@repo/domain/invites";
import { TEAM_LOOKUP_NOTE } from "@repo/domain/teams";
import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import { Share } from "react-native";

import { splitTrpcFormError } from "../lib/form-error";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";
import {
  gameShareMessage,
  groupShareMessage,
  toggleSelection,
  type GameShareContext,
  type LookupResultRow,
} from "./invites-model";
import {
  InviteSheetView,
  type LookupSectionProps,
  type PendingLookupRow,
} from "./invite-sheet-view";
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
      unusedInvite: PendingLookupRow | null;
      canLookup: boolean;
      canLink: boolean;
    };

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
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<LookupResultRow[]>([]);
  const [refused, setRefused] = useState<
    { name: string; message: string }[] | null
  >(null);
  const [formError, setFormError] = useState<string | null>(null);

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
  const pendingInvites: Slot<PendingLookupRow[]> =
    door.kind === "team"
      ? {
          status: "ready",
          value: door.unusedInvite ? [door.unusedInvite] : [],
        }
      : slotOf(
          isCommunity ? communityPending : isGroup ? groupPending : gamePending,
        );

  function afterSend(result: {
    sent: unknown[];
    refused: { name: string; message: string }[];
  }) {
    setRefused(result.refused);
    setFormError(null);
    setSelected([]);
    if (result.sent.length > 0) {
      toast.show(lookupInviteSentToast(result.sent.length));
    }
    if (isCommunity) {
      void utils.communities.listLookupInvites.invalidate({ communityId });
      void utils.communities.searchLookupUsers.invalidate({ communityId });
    } else if (isGroup) {
      void utils.groups.listLookupInvites.invalidate({ groupId });
      void utils.groups.searchLookupUsers.invalidate({ groupId });
    } else if (isTeam) {
      void utils.teams.byId.invalidate({ id: teamId });
      void utils.teams.searchLookupUsers.invalidate({ teamId });
    } else {
      void utils.games.listLookupInvites.invalidate({ gameId });
      void utils.games.searchLookupUsers.invalidate({ gameId });
    }
  }

  function onSendError(error: { message: string; data?: unknown }) {
    const split = splitTrpcFormError(
      error as Parameters<typeof splitTrpcFormError>[0],
    );
    const message =
      split.globalMessage ?? Object.values(split.fieldErrors)[0] ?? null;
    setFormError(message ?? error.message);
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
    } catch {
      toast.show(INVITE_LINK_COPY_FAILED_TOAST);
    }
  }

  async function shareLink() {
    const link = await mintLink();
    if (!link) {
      return;
    }
    const message = messageFor(link);
    try {
      await Share.share({ message });
    } catch {
      await copyMessage(message);
    }
  }

  async function copyLink() {
    const link = await mintLink();
    if (link) {
      await copyMessage(messageFor(link));
    }
  }

  function send() {
    const userIds = selected.map((row) => row.id);
    setRefused(null);
    setFormError(null);
    if (door.kind === "team") {
      const userId = userIds[0];
      if (userId) {
        sendTeam.mutate({ teamId: door.teamId, userId });
      }
    } else if (door.kind === "community") {
      sendCommunity.mutate({ communityId: door.communityId, userIds });
    } else if (door.kind === "group") {
      sendGroup.mutate({ groupId: door.groupId, userIds });
    } else {
      sendGame.mutate({ gameId: door.gameId, userIds });
    }
  }

  function close() {
    setQuery("");
    setSelected([]);
    setRefused(null);
    setFormError(null);
    onClose();
  }

  const revokePendingId =
    (revokeCommunity.isPending ? revokeCommunity.variables?.inviteId : null) ??
    (revokeGroup.isPending ? revokeGroup.variables?.inviteId : null) ??
    (revokeGame.isPending ? revokeGame.variables?.inviteId : null) ??
    (revokeTeam.isPending ? revokeTeam.variables?.inviteId : null) ??
    null;

  const lookup: LookupSectionProps | null = door.canLookup
    ? {
        note:
          door.kind === "group" || door.kind === "community"
            ? door.note
            : door.kind === "team"
              ? TEAM_LOOKUP_NOTE
              : null,
        query,
        onQueryChange: setQuery,
        results: slotOf(search),
        selected,
        onToggle: (row) =>
          setSelected((current) =>
            toggleSelection(current, row, isTeam ? "single" : "multiple"),
          ),
        sendPending:
          sendCommunity.isPending ||
          sendGroup.isPending ||
          sendGame.isPending ||
          sendTeam.isPending,
        onSend: send,
        refused,
        formError,
        pendingInvites,
        revokePendingId,
        onRevoke: (inviteId) => {
          if (door.kind === "team") {
            revokeTeam.mutate({ inviteId });
          } else if (door.kind === "community") {
            revokeCommunity.mutate({ inviteId });
          } else if (door.kind === "group") {
            revokeGroup.mutate({ inviteId });
          } else {
            revokeGame.mutate({ inviteId });
          }
        },
      }
    : null;

  return (
    <InviteSheetView
      visible={visible}
      onClose={close}
      lookup={lookup}
      link={
        door.canLink
          ? {
              currentUrl: currentLink
                ? "shortUrl" in currentLink
                  ? (currentLink.shortUrl ?? currentLink.inviteUrl)
                  : currentLink.inviteUrl
                : null,
              pending:
                createCommunityLink.isPending ||
                createGroupLink.isPending ||
                createGameLink.isPending ||
                createTeamLink.isPending,
              onShare: () => void shareLink(),
              onCopy: () => void copyLink(),
            }
          : null
      }
    />
  );
}
