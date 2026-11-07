import {
  gameInviteGroupGate,
  gameInviteLinkStage,
  inviteLinkAcceptToast,
  type GameInviteGroupChoice,
  type InviteKind,
  type InviteLinkPath,
  type InviteLinkPreview,
} from "@repo/domain/invites";
import { groupDisplayName } from "@repo/domain/group-join";
import { groupJoinToast } from "@repo/domain/group-join";
import {
  type FootballPosition,
  type FootballRole,
} from "@repo/domain/football-lineup";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useCallback, useState } from "react";

import type { Slot } from "../home/home-model";
import { Notice } from "../groups/notice";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";
import {
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

function InviteLinkHeader() {
  const m = useMessages();
  return (
    <ScreenHeader
      nav="back"
      fallback="/profile"
      title={m.mobileInvite.link.title}
    />
  );
}

export function InviteLinkScreen() {
  const params = useLocalSearchParams<InviteLinkParams>();
  const m = useMessages();
  const link = inviteLinkFromParams(params);
  if (!link) {
    return (
      <Screen>
        <InviteLinkHeader />
        <Notice
          title={m.mobileInvite.link.incompleteTitle}
          description={m.mobileInvite.link.incompleteDescription}
        />
      </Screen>
    );
  }
  return <InviteLink link={link} />;
}

function InviteLink({ link }: { link: InviteLinkPath }) {
  const router = useRouter();
  const toast = useToast();
  const m = useMessages();
  const locale = useLocale();
  const utils = api.useUtils();
  const kind = kindOf(link);
  const [refreshing, setRefreshing] = useState(false);
  const [waitingForPartner, setWaitingForPartner] = useState(false);
  const [groupSheetOpen, setGroupSheetOpen] = useState(false);
  const [groupDecided, setGroupDecided] = useState(false);
  const [holdSeat, setHoldSeat] = useState(false);
  const [justJoinedGroup, setJustJoinedGroup] = useState(false);

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

  const active = { group, team, game }[kind];

  function previewOf(): InviteLinkPreview | undefined {
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
  const readyGame =
    normalised?.status === "ready" && normalised.kind === "game"
      ? normalised.game
      : null;
  const groupGate = gameInviteGroupGate(readyGame?.group);
  const groupName = readyGame?.group
    ? groupDisplayName(readyGame.group.name, locale)
    : null;

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

  const acceptGroup = api.groups.acceptInviteLink.useMutation({
    onSuccess: async (result) => {
      toast.show(
        result.requested
          ? groupJoinToast("requestJoin", locale)
          : inviteLinkAcceptToast("group", locale),
      );
      await utils.groups.mine.invalidate();
      land(result.groupId);
    },
    onError: (e) => toast.show(e.message),
  });
  const acceptTeam = api.teams.acceptInviteLink.useMutation({
    onSuccess: async (result) => {
      toast.show(inviteLinkAcceptToast("team", locale));
      await utils.teams.mine.invalidate();
      land(result.teamId);
    },
    onError: (e) => toast.show(e.message),
  });
  const acceptGame = api.games.acceptInviteLink.useMutation({
    onSuccess: async (result) => {
      toast.show(
        inviteLinkAcceptToast(
          "game",
          locale,
          result.outcome,
          result.joinedGroup,
        ),
      );
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
    onError: (e, variables) => {
      if (!variables.football) {
        toast.show(e.message);
      }
      void game.refetch();
    },
  });
  const requestLevel = api.games.requestLevelRange.useMutation({
    onSuccess: async () => {
      toast.show(m.level.request.sent);
      await game.refetch();
    },
    onError: (e) => toast.show(e.message),
  });
  const joinGroup = api.games.joinGroupFromInviteLink.useMutation({
    onSuccess: async (result) => {
      setGroupSheetOpen(false);
      setGroupDecided(false);
      setHoldSeat(false);
      if (result.outcome === "joined") {
        toast.show(
          m.mobileInvite.link.group.joinedToast(groupName ?? m.group.untitled),
        );
        setJustJoinedGroup(true);
        await utils.groups.mine.invalidate();
      } else if (result.outcome === "requested") {
        toast.show(m.mobileInvite.link.group.requestedToast);
      }
      await game.refetch();
    },
    onError: (e, variables) => {
      if (!variables.football) {
        toast.show(e.message);
      }
      void game.refetch();
    },
  });
  const withdraw = api.groups.withdrawJoinRequest.useMutation({
    onSuccess: async () => {
      toast.show(m.mobileInvite.link.group.withdrawnToast);
      await game.refetch();
    },
    onError: (e) => toast.show(e.message),
  });

  function accept(seat?: Seat) {
    if (!token) {
      return;
    }
    if (kind === "group") {
      acceptGroup.mutate({ token });
    } else if (kind === "team") {
      acceptTeam.mutate({ token });
    } else if (holdSeat) {
      joinGroup.mutate({ token, holdSeat: true, ...seat });
    } else {
      acceptGame.mutate({ token, ...seat });
    }
  }

  function acceptFootball(role: FootballRole, position: FootballPosition) {
    if (!token) {
      return;
    }
    if (holdSeat) {
      joinGroup.mutate({ token, holdSeat: true, football: { role, position } });
    } else {
      acceptGame.mutate({ token, football: { role, position } });
    }
  }

  function chooseGroup(choice: GameInviteGroupChoice) {
    if (!token || !readyGame) {
      return;
    }
    if (choice === "group_only") {
      joinGroup.mutate({ token });
      return;
    }
    const hold = groupGate === "approval";
    setGroupSheetOpen(false);
    setGroupDecided(true);
    setHoldSeat(hold);
    if (gameInviteLinkStage(readyGame, true) === "accept") {
      if (hold) {
        joinGroup.mutate({ token, holdSeat: true });
      } else {
        acceptGame.mutate({ token });
      }
    }
  }

  const groupChoicePending: GameInviteGroupChoice | null = joinGroup.isPending
    ? joinGroup.variables?.holdSeat
      ? "with_seat"
      : "group_only"
    : acceptGame.isPending && groupDecided && !acceptGame.variables?.football
      ? "with_seat"
      : null;

  const acceptPending =
    acceptGroup.isPending ||
    acceptTeam.isPending ||
    acceptGame.isPending ||
    joinGroup.isPending;

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <InviteLinkHeader />
      <InviteLinkView
        kind={kind}
        preview={preview}
        acceptPending={acceptPending}
        acceptError={
          acceptGame.error?.message ?? joinGroup.error?.message ?? null
        }
        requestPending={requestLevel.isPending}
        waitingForPartner={waitingForPartner}
        onAccept={accept}
        onAcceptFootball={acceptFootball}
        onRequestLevel={(gameId) =>
          token && requestLevel.mutate({ gameId, inviteToken: token })
        }
        onPickPartner={(gameId) => router.replace(`/games/${gameId}` as Href)}
        onGoHome={() => router.replace("/")}
        onRetry={() => void refetch()}
        groupSheetOpen={groupSheetOpen}
        groupChoicePending={groupChoicePending}
        groupDecided={groupDecided}
        justJoinedGroup={justJoinedGroup}
        withdrawPending={withdraw.isPending}
        onOpenGroupSheet={() => setGroupSheetOpen(true)}
        onCloseGroupSheet={() => setGroupSheetOpen(false)}
        onChooseGroup={chooseGroup}
        onWithdraw={(requestId) => withdraw.mutate({ requestId })}
        onOpenGroup={(groupId) => router.push(`/groups/${groupId}` as Href)}
      />
    </Screen>
  );
}
