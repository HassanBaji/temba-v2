import {
  inviteLinkAcceptToast,
  type InviteKind,
  type InviteLinkPath,
  type InviteLinkPreview,
} from "@repo/domain/invites";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useCallback, useState } from "react";

import type { Slot } from "../home/home-model";
import { Notice } from "../groups/notice";
import { Screen } from "../primitives/screen";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";
import {
  communityPreview,
  gamePreview,
  groupPreview,
  inviteLandingPath,
  inviteLinkFromParams,
  teamPreview,
  type InviteLinkParams,
} from "./invites-model";
import { InviteLinkView } from "./invite-link-view";

const REFETCH_ON_FOREGROUND = { refetchOnWindowFocus: "always" as const };

type Seat = { sideIndex: number; position: "left" | "right" };

function kindOf(link: InviteLinkPath): InviteKind {
  if (link.kind === "game-short") {
    return "game";
  }
  if (link.kind === "group-short") {
    return "group";
  }
  return link.kind;
}

export function InviteLinkScreen() {
  const params = useLocalSearchParams<InviteLinkParams>();
  const link = inviteLinkFromParams(params);
  if (!link) {
    return (
      <Screen>
        <Notice
          title="Couldn't open this invite"
          description="The link is incomplete. Go back and paste it again."
        />
      </Screen>
    );
  }
  return <InviteLink link={link} />;
}

function InviteLink({ link }: { link: InviteLinkPath }) {
  const router = useRouter();
  const toast = useToast();
  const utils = api.useUtils();
  const kind = kindOf(link);
  const [refreshing, setRefreshing] = useState(false);
  const [waitingForPartner, setWaitingForPartner] = useState(false);

  const gameCode = api.games.inviteLinkByShortCode.useQuery(
    { code: "code" in link ? link.code : "" },
    { enabled: link.kind === "game-short" },
  );
  const groupCode = api.groups.inviteLinkByShortCode.useQuery(
    { code: "code" in link ? link.code : "" },
    { enabled: link.kind === "group-short" },
  );

  const shortCode =
    link.kind === "game-short"
      ? gameCode
      : link.kind === "group-short"
        ? groupCode
        : null;
  const token = shortCode
    ? (shortCode.data?.token ?? undefined)
    : "token" in link
      ? link.token
      : undefined;
  const expiredShortCode = shortCode?.data?.token === null;
  const enabled = Boolean(token);
  const input = { token: token ?? "" };

  const community = api.communities.previewInviteLink.useQuery(input, {
    enabled: enabled && kind === "community",
    ...REFETCH_ON_FOREGROUND,
  });
  const group = api.groups.previewInviteLink.useQuery(input, {
    enabled: enabled && kind === "group",
    ...REFETCH_ON_FOREGROUND,
  });
  const team = api.teams.previewInviteLink.useQuery(input, {
    enabled: enabled && kind === "team",
    ...REFETCH_ON_FOREGROUND,
  });
  const game = api.games.previewInviteLink.useQuery(input, {
    enabled: enabled && kind === "game",
    ...REFETCH_ON_FOREGROUND,
  });

  const active = { community, group, team, game }[kind];

  function previewOf(): InviteLinkPreview | undefined {
    if (kind === "community" && community.data) {
      return communityPreview(community.data);
    }
    if (kind === "group" && group.data) {
      return groupPreview(group.data);
    }
    if (kind === "team" && team.data) {
      return teamPreview(team.data);
    }
    if (kind === "game" && game.data) {
      return gamePreview(game.data);
    }
    return undefined;
  }
  const lookupFailed = shortCode?.error ?? null;
  const error = lookupFailed ?? active.error ?? null;

  const normalised: InviteLinkPreview | undefined = expiredShortCode
    ? { status: "invalid" }
    : previewOf();

  const preview: Slot<InviteLinkPreview> = error
    ? { status: "error", message: error.message }
    : normalised
      ? { status: "ready", value: normalised }
      : { status: "loading" };

  const refetch = useCallback(async () => {
    await Promise.all([
      shortCode?.refetch(),
      enabled ? active.refetch() : undefined,
    ]);
  }, [shortCode, enabled, active]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  function land(id: string) {
    router.replace(inviteLandingPath(kind, id));
  }

  const acceptCommunity = api.communities.acceptInviteLink.useMutation({
    onSuccess: async (result) => {
      toast.show(inviteLinkAcceptToast("community"));
      await utils.communities.mine.invalidate();
      land(result.communityId);
    },
    onError: (e) => toast.show(e.message),
  });
  const acceptGroup = api.groups.acceptInviteLink.useMutation({
    onSuccess: async (result) => {
      toast.show(inviteLinkAcceptToast("group"));
      await Promise.all([
        utils.groups.mine.invalidate(),
        utils.communities.mine.invalidate(),
      ]);
      land(result.groupId);
    },
    onError: (e) => toast.show(e.message),
  });
  const acceptTeam = api.teams.acceptInviteLink.useMutation({
    onSuccess: async (result) => {
      toast.show(inviteLinkAcceptToast("team"));
      await utils.teams.mine.invalidate();
      land(result.teamId);
    },
    onError: (e) => toast.show(e.message),
  });
  const acceptGame = api.games.acceptInviteLink.useMutation({
    onSuccess: async (result) => {
      toast.show(inviteLinkAcceptToast("game", result.outcome));
      if (result.outcome === "waiting_for_partner") {
        setWaitingForPartner(true);
        return;
      }
      await Promise.all([
        utils.games.byId.invalidate({ id: result.gameId }),
        utils.games.listMyGames.invalidate(),
        utils.users.home.invalidate(),
      ]);
      land(result.gameId);
    },
    onError: (e) => {
      toast.show(e.message);
      void game.refetch();
    },
  });
  const requestLevel = api.games.requestLevelRange.useMutation({
    onSuccess: async () => {
      toast.show("Request sent");
      await game.refetch();
    },
    onError: (e) => toast.show(e.message),
  });

  function accept(seat?: Seat) {
    if (!token) {
      return;
    }
    if (kind === "community") {
      acceptCommunity.mutate({ token });
    } else if (kind === "group") {
      acceptGroup.mutate({ token });
    } else if (kind === "team") {
      acceptTeam.mutate({ token });
    } else {
      acceptGame.mutate({ token, ...seat });
    }
  }

  const acceptPending =
    acceptCommunity.isPending ||
    acceptGroup.isPending ||
    acceptTeam.isPending ||
    acceptGame.isPending;

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <InviteLinkView
        kind={kind}
        preview={preview}
        acceptPending={acceptPending}
        requestPending={requestLevel.isPending}
        waitingForPartner={waitingForPartner}
        onAccept={accept}
        onRequestLevel={(gameId) =>
          token && requestLevel.mutate({ gameId, inviteToken: token })
        }
        onPickPartner={(gameId) => router.replace(`/games/${gameId}` as Href)}
        onGoHome={() => router.replace("/")}
        onRetry={() => void refetch()}
      />
    </Screen>
  );
}
