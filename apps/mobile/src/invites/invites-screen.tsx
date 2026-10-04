import {
  lookupInviteAcceptToast,
  mergeInviteInbox,
  parseInviteLink,
  type InviteInboxItem,
  type InviteKind,
} from "@repo/domain/invites";
import * as Clipboard from "expo-clipboard";
import { Link, useRouter } from "expo-router";
import { useCallback, useState } from "react";

import type { Slot } from "../home/home-model";
import { Screen } from "../primitives/screen";
import { Text } from "../primitives/text";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";
import {
  PASTE_LINK_EMPTY_MESSAGE,
  PASTE_LINK_INVALID_MESSAGE,
  inviteLandingPath,
  inviteLinkHref,
} from "./invites-model";
import { InvitesView } from "./invites-view";

const REFETCH_ON_FOREGROUND = { refetchOnWindowFocus: "always" as const };

export function InvitesScreen() {
  const router = useRouter();
  const toast = useToast();
  const utils = api.useUtils();
  const [refreshing, setRefreshing] = useState(false);
  const [linkText, setLinkText] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);

  const community = api.communities.pendingLookupInvites.useQuery(
    undefined,
    REFETCH_ON_FOREGROUND,
  );
  const group = api.groups.pendingLookupInvites.useQuery(
    undefined,
    REFETCH_ON_FOREGROUND,
  );
  const team = api.teams.pendingInvites.useQuery(
    undefined,
    REFETCH_ON_FOREGROUND,
  );
  const game = api.games.pendingLookupInvites.useQuery(
    undefined,
    REFETCH_ON_FOREGROUND,
  );

  const refetchAll = useCallback(
    () =>
      Promise.all([
        community.refetch(),
        group.refetch(),
        team.refetch(),
        game.refetch(),
      ]),
    [community, group, team, game],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetchAll();
    } finally {
      setRefreshing(false);
    }
  }, [refetchAll]);

  function land(kind: InviteKind, id: string) {
    router.push(inviteLandingPath(kind, id));
  }

  const acceptCommunity = api.communities.acceptLookupInvite.useMutation({
    onSuccess: async (result) => {
      toast.show(lookupInviteAcceptToast("community"));
      await Promise.all([
        utils.communities.pendingLookupInvites.invalidate(),
        utils.communities.mine.invalidate(),
      ]);
      land("community", result.communityId);
    },
    onError: (error) => toast.show(error.message),
  });
  const acceptGroup = api.groups.acceptLookupInvite.useMutation({
    onSuccess: async (result) => {
      toast.show(lookupInviteAcceptToast("group"));
      await Promise.all([
        utils.groups.pendingLookupInvites.invalidate(),
        utils.groups.mine.invalidate(),
        utils.communities.mine.invalidate(),
      ]);
      land("group", result.groupId);
    },
    onError: (error) => toast.show(error.message),
  });
  const acceptTeam = api.teams.acceptInAppInvite.useMutation({
    onSuccess: async (result) => {
      toast.show(lookupInviteAcceptToast("team"));
      await Promise.all([
        utils.teams.pendingInvites.invalidate(),
        utils.teams.mine.invalidate(),
      ]);
      land("team", result.teamId);
    },
    onError: (error) => toast.show(error.message),
  });
  const acceptGame = api.games.acceptLookupInvite.useMutation({
    onSuccess: async (result) => {
      toast.show(lookupInviteAcceptToast("game", result));
      await Promise.all([
        utils.games.pendingLookupInvites.invalidate(),
        utils.games.byId.invalidate({ id: result.gameId }),
        utils.games.listMyGames.invalidate(),
        utils.users.home.invalidate(),
      ]);
      land("game", result.gameId);
    },
    onError: (error) => {
      toast.show(error.message);
      void game.refetch();
    },
  });

  function accept(item: InviteInboxItem) {
    const input = { inviteId: item.id };
    if (item.kind === "community") {
      acceptCommunity.mutate(input);
    } else if (item.kind === "group") {
      acceptGroup.mutate(input);
    } else if (item.kind === "team") {
      acceptTeam.mutate(input);
    } else {
      acceptGame.mutate(input);
    }
  }

  const pendingKey =
    (acceptCommunity.isPending
      ? `community-${acceptCommunity.variables?.inviteId}`
      : null) ??
    (acceptGroup.isPending
      ? `group-${acceptGroup.variables?.inviteId}`
      : null) ??
    (acceptTeam.isPending ? `team-${acceptTeam.variables?.inviteId}` : null) ??
    (acceptGame.isPending ? `game-${acceptGame.variables?.inviteId}` : null);

  const error =
    community.error ?? group.error ?? team.error ?? game.error ?? null;
  const loading =
    community.isLoading || group.isLoading || team.isLoading || game.isLoading;
  const inbox: Slot<InviteInboxItem[]> = error
    ? { status: "error", message: error.message }
    : loading
      ? { status: "loading" }
      : {
          status: "ready",
          value: mergeInviteInbox({
            community: community.data,
            group: group.data,
            team: team.data,
            game: game.data,
          }),
        };

  async function pasteLink() {
    const text = (await Clipboard.getStringAsync()).trim();
    setLinkError(text ? null : PASTE_LINK_EMPTY_MESSAGE);
    if (text) {
      setLinkText(text);
    }
  }

  function openLink() {
    const link = parseInviteLink(linkText);
    if (!link) {
      setLinkError(PASTE_LINK_INVALID_MESSAGE);
      return;
    }
    setLinkError(null);
    router.push(inviteLinkHref(link));
  }

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <InvitesView
        inbox={inbox}
        pendingKey={pendingKey}
        onAccept={accept}
        onPickSeat={(item, sideIndex, position) =>
          acceptGame.mutate({ inviteId: item.id, sideIndex, position })
        }
        onRetry={() => void refetchAll()}
        linkText={linkText}
        linkError={linkError}
        onLinkTextChange={(text) => {
          setLinkText(text);
          setLinkError(null);
        }}
        onPasteLink={() => void pasteLink()}
        onOpenLink={openLink}
      />
      {__DEV__ ? (
        <Link href="/gallery-invites">
          <Text size="meta" weight="medium">
            Open the Invites states gallery
          </Text>
        </Link>
      ) : null}
    </Screen>
  );
}
