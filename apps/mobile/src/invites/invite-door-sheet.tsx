import {
  INVITE_LINK_COPIED_TOAST,
  INVITE_LINK_COPY_FAILED_TOAST,
  LOOKUP_INVITE_REVOKED_TOAST,
  lookupInviteSentToast,
} from "@repo/domain/invites";
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
import { InviteSheetView, type LookupSectionProps } from "./invite-sheet-view";
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
    };

type LinkResult = { shortUrl: string | null; inviteUrl: string };

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
  const groupId = door.kind === "group" ? door.groupId : "";
  const gameId = door.kind === "game" ? door.gameId : "";
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
    { enabled: lookupOn && !isGroup, placeholderData: keepPrevious },
  );
  const groupPending = api.groups.listLookupInvites.useQuery(
    { groupId },
    { enabled: lookupOn && isGroup },
  );
  const gamePending = api.games.listLookupInvites.useQuery(
    { gameId },
    { enabled: lookupOn && !isGroup },
  );
  const groupLink = api.groups.getInviteLink.useQuery(
    { groupId },
    { enabled: linkOn && isGroup },
  );
  const gameLink = api.games.getInviteLink.useQuery(
    { gameId },
    { enabled: linkOn && !isGroup },
  );

  const search = isGroup ? groupSearch : gameSearch;
  const pendingInvites = isGroup ? groupPending : gamePending;
  const currentLink = (isGroup ? groupLink : gameLink).data;

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
    if (isGroup) {
      void utils.groups.listLookupInvites.invalidate({ groupId });
      void utils.groups.searchLookupUsers.invalidate({ groupId });
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

  function messageFor(link: LinkResult) {
    return door.kind === "group"
      ? groupShareMessage({ name: door.name, sport: door.sport, link })
      : gameShareMessage(door.share, link);
  }

  async function mintLink(): Promise<LinkResult | null> {
    try {
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
    if (door.kind === "group") {
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
    (revokeGroup.isPending ? revokeGroup.variables?.inviteId : null) ??
    (revokeGame.isPending ? revokeGame.variables?.inviteId : null) ??
    null;

  const lookup: LookupSectionProps | null = door.canLookup
    ? {
        note: door.kind === "group" ? door.note : null,
        query,
        onQueryChange: setQuery,
        results: slotOf(search),
        selected,
        onToggle: (row) =>
          setSelected((current) => toggleSelection(current, row, "multiple")),
        sendPending: sendGroup.isPending || sendGame.isPending,
        onSend: send,
        refused,
        formError,
        pendingInvites: slotOf(pendingInvites),
        revokePendingId,
        onRevoke: (inviteId) =>
          door.kind === "group"
            ? revokeGroup.mutate({ inviteId })
            : revokeGame.mutate({ inviteId }),
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
                ? (currentLink.shortUrl ?? currentLink.inviteUrl)
                : null,
              pending: createGroupLink.isPending || createGameLink.isPending,
              onShare: () => void shareLink(),
              onCopy: () => void copyLink(),
            }
          : null
      }
    />
  );
}
