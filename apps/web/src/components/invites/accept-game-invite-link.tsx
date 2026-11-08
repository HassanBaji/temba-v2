"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { ErrorState } from "~/components/common/error-state";
import { FootballJoinDialog } from "~/components/games/football-join-dialog";
import { GameSeatGrid } from "~/components/games/game-seat-grid";
import {
  GameInviteBar,
  GameInviteCard,
  GameInviteGroupCard,
  GameInviteLevelCard,
  GameInviteNotice,
  GameInviteRequestCard,
  GameInviteRows,
} from "~/components/invites/game-invite-landing";
import { GroupJoinDialog } from "~/components/invites/game-link-group";
import {
  InviteOutcome,
  InvitePreviewError,
} from "~/components/invites/invite-outcome";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { Surface } from "~/components/ui/surface";
import { footballInviteJoinSubtitle } from "@repo/domain/football-board";
import {
  type FootballPosition,
  type FootballRole,
} from "@repo/domain/football-lineup";
import { formatGameStart } from "@repo/domain/format-game-start";
import { gameDisplayName } from "@repo/domain/game-custom-name";
import {
  gameInviteHeroModel,
  gameInviteLevelCard,
  gameInviteLevelFit,
  gameInviteSharerName,
  gameInviteWebRows,
} from "@repo/domain/game-invite-hero";
import { groupDisplayName } from "@repo/domain/group-join";
import {
  gameInviteGroupGate,
  gameInviteGroupJoinedCopy,
  gameInviteGroupLandingCopy,
  gameInviteGroupRequestCard,
  gameInviteSeatCopy,
  gameInviteLinkStage,
  gameInviteSeatState,
  inviteLinkAcceptToast,
  levelRangeGateAction,
  type GameInviteGroupChoice,
} from "@repo/domain/invites";
import { formatLevelRangeLabel } from "@repo/domain/level-range";
import { formatPricePerPlayerFils } from "@repo/domain/price-per-player";
import { authCrossLinkUrl } from "~/lib/auth-redirect";
import { toastGlobalFormError } from "~/lib/form-mutation-error";
import { tournamentPartnerInviteLandingHref } from "@repo/domain/tournament-join";
import { api } from "~/trpc/react";

export function AcceptGameInviteLink({
  token,
  isSignedIn,
  returnPath,
}: {
  token: string;
  isSignedIn: boolean;
  returnPath: string;
}) {
  const router = useRouter();
  const m = useMessages();
  const locale = useLocale();
  const [footballOpen, setFootballOpen] = React.useState(true);
  const [groupDialogOpen, setGroupDialogOpen] = React.useState(false);
  const [groupDecided, setGroupDecided] = React.useState(false);
  const [holdSeat, setHoldSeat] = React.useState(false);
  const [justJoinedGroup, setJustJoinedGroup] = React.useState(false);
  const preview = api.games.previewInviteLink.useQuery({ token });
  const requestLevelRange = api.games.requestLevelRange.useMutation({
    onSuccess: async () => {
      toast.success(m.webAuth.invites.requestSent);
      await preview.refetch();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });
  const accept = api.games.acceptInviteLink.useMutation({
    onSuccess: (result) => {
      toast.success(
        inviteLinkAcceptToast(
          "game",
          locale,
          result.outcome,
          result.joinedGroup,
        ),
      );
      if (result.outcome === "waiting_for_partner") {
        return;
      }
      router.replace(`/dashboard/games/${result.gameId}`);
    },
    onError: (error, variables) => {
      if (!variables.football) {
        toast.error(error.message);
      }
      void preview.refetch();
    },
  });

  const ready = preview.data?.status === "ready" ? preview.data : undefined;
  const stage = ready ? gameInviteLinkStage(ready, isSignedIn) : "accept";
  const group = ready?.group ?? null;
  const groupGate = gameInviteGroupGate(group);
  const groupName = group ? groupDisplayName(group.name, locale) : null;
  const joinGroup = api.games.joinGroupFromInviteLink.useMutation({
    onSuccess: async (result) => {
      setGroupDialogOpen(false);
      setGroupDecided(false);
      setHoldSeat(false);
      if (result.outcome === "joined") {
        toast.success(
          m.mobileInvite.link.group.joinedToast(groupName ?? m.group.untitled),
        );
        setJustJoinedGroup(true);
      } else if (result.outcome === "requested") {
        toast.success(m.mobileInvite.link.group.requestedToast);
      }
      await preview.refetch();
    },
    onError: (error, variables) => {
      if (!variables.football) {
        toast.error(error.message);
      }
      void preview.refetch();
    },
  });
  const withdraw = api.groups.withdrawJoinRequest.useMutation({
    onSuccess: async () => {
      toast.success(m.mobileInvite.link.group.withdrawnToast);
      await preview.refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  // The Group question stands between a signed-in non-member and the seat
  // on every join stage; Level range and partner stages keep their own gate.
  const groupStage =
    stage === "seat_pick" || stage === "football" || stage === "accept";
  const groupAsks =
    isSignedIn && group != null && groupStage && groupGate !== "none";
  const groupBlocks = groupAsks && (groupGate === "requested" || !groupDecided);
  const openSeats = ready?.football
    ? Math.max(
        0,
        (ready.football.playersAllowed ?? 0) - ready.football.players.length,
      )
    : (ready?.vacantSeats.length ?? 0);
  const blockedByLevelRange = stage === "level_range";
  const partnerRequiredJoin = stage === "partner";
  const needsSeatPick = stage === "seat_pick";
  const footballJoin = stage === "football";
  const football = ready?.football ?? null;
  const sides = ready?.sides ?? [];
  const vacantSeats = ready?.vacantSeats ?? [];
  const seatState = gameInviteSeatState({
    registrationStatus: ready?.registrationStatus ?? "open",
    vacantSeatCount: vacantSeats.length,
  });
  const joinFrozen = seatState.joinFrozen;
  const waitlistOnly = needsSeatPick && seatState.waitlistOnly;
  const canJoinVacant = isSignedIn && !joinFrozen && !waitlistOnly;
  const seatRaceError =
    needsSeatPick && accept.isError && accept.error.data?.code === "CONFLICT";
  const footballJoinError = footballJoin && accept.isError;
  const sideNoun = "Team";
  const rangeLabel = formatLevelRangeLabel(
    ready?.levelMinTenths,
    ready?.levelMaxTenths,
    locale,
  );
  const levelAction = levelRangeGateAction({
    requestStatus: ready?.levelRangeRequest?.status ?? null,
    canRequest: ready?.canRequestLevelRange ?? false,
    requesting: requestLevelRange.isPending,
    locale,
  });
  const gameName = ready
    ? gameDisplayName(ready.game, locale)
    : m.invite.kind.game;

  React.useEffect(() => {
    if (!isSignedIn) {
      return;
    }
    if (preview.data?.status !== "ready") {
      return;
    }
    if (preview.data.viewerPassesLevelRange === false) {
      return;
    }
    if (accept.isPending || accept.isSuccess || accept.isError) {
      return;
    }
    if (
      preview.data.partnerRequiredJoin ||
      preview.data.needsSeatPick ||
      preview.data.football
    ) {
      return;
    }
    if (groupBlocks || holdSeat) {
      return;
    }
    accept.mutate({ token });
  }, [accept, groupBlocks, holdSeat, isSignedIn, preview.data, token]);

  const joinPending = accept.isPending || joinGroup.isPending;

  function onJoinSeat(sideIndex: number, position: "left" | "right") {
    if (joinPending) {
      return;
    }
    if (holdSeat) {
      joinGroup.mutate({ token, holdSeat: true, sideIndex, position });
      return;
    }
    accept.mutate({
      token,
      sideIndex,
      position,
    });
  }

  function onJoinFootball(role: FootballRole, position: FootballPosition) {
    if (joinPending) {
      return;
    }
    if (holdSeat) {
      joinGroup.mutate({ token, holdSeat: true, football: { role, position } });
      return;
    }
    accept.mutate({ token, football: { role, position } });
  }

  function onJoinWaitlist() {
    if (joinPending) {
      return;
    }
    if (holdSeat) {
      joinGroup.mutate({ token, holdSeat: true });
      return;
    }
    accept.mutate({ token });
  }

  function onChooseGroup(choice: GameInviteGroupChoice) {
    if (joinPending) {
      return;
    }
    if (choice === "group_only") {
      joinGroup.mutate({ token });
      return;
    }
    const hold = groupGate === "approval";
    setGroupDialogOpen(false);
    setGroupDecided(true);
    setHoldSeat(hold);
    setFootballOpen(true);
    // Without a hold, the auto-join effect takes the seat once the gate lifts.
    if (stage === "accept" && hold) {
      joinGroup.mutate({ token, holdSeat: true });
    }
  }

  const groupChoicePending: GameInviteGroupChoice | null = joinGroup.isPending
    ? joinGroup.variables?.holdSeat
      ? "with_seat"
      : "group_only"
    : null;
  const joinedCopy =
    group && justJoinedGroup
      ? gameInviteGroupJoinedCopy(group, openSeats, locale)
      : null;
  const joinedNotice =
    group && joinedCopy ? (
      <GameInviteNotice
        title={joinedCopy.title}
        description={joinedCopy.description}
        action={
          <Button variant="outline-inverse" size="sm" asChild>
            <Link href={`/dashboard/groups/${group.id}`}>
              {joinedCopy.openGroupLabel}
            </Link>
          </Button>
        }
      />
    ) : null;

  if (preview.isLoading || (preview.isError && preview.isFetching)) {
    return (
      <div aria-busy="true" className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-full" />
      </div>
    );
  }

  if (preview.isError) {
    return <InvitePreviewError onRetry={() => void preview.refetch()} />;
  }

  if (
    preview.data?.status === "invalid" ||
    preview.data?.status === "unavailable"
  ) {
    return (
      <InviteOutcome
        outcome={preview.data.status}
        hostLabel="Game"
        isSignedIn={isSignedIn}
      />
    );
  }

  if (accept.data?.outcome === "waiting_for_partner") {
    return (
      <InviteOutcome
        outcome="waiting_for_partner"
        hostLabel="Game"
        isSignedIn={isSignedIn}
      />
    );
  }

  if (accept.isError && !seatRaceError && !footballJoinError) {
    return (
      <ErrorState
        title={m.webAuth.invites.couldNotJoin}
        message={accept.error.message}
        onRetry={() => accept.mutate(accept.variables ?? { token })}
        headingLevel={1}
      />
    );
  }

  if (!ready) {
    return (
      <div aria-busy="true" className="space-y-3">
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    );
  }

  const hero = ready.hero;
  const heroModel = gameInviteHeroModel(hero, new Date(), locale);
  const sharer = gameInviteSharerName(hero);
  const heroCopy = m.mobileInvite.link.hero;
  const groupCopy = m.mobileInvite.link.group;
  const fit = gameInviteLevelFit({
    isSignedIn,
    viewerLevelTenths: ready.viewerLevelTenths,
    viewerPassesLevelRange: ready.viewerPassesLevelRange,
  });
  const levelCard = gameInviteLevelCard({
    levelMinTenths: ready.levelMinTenths,
    levelMaxTenths: ready.levelMaxTenths,
    viewerLevelTenths: ready.viewerLevelTenths,
    fit,
    asksAboutGroup: groupBlocks && groupGate !== "requested",
    locale,
  });
  const barOpenSeats =
    ready.football || ready.vacantSeats.length > 0
      ? openSeats
      : (heroModel.openSeats ?? 0);
  const seatsTitle =
    barOpenSeats > 0 ? groupCopy.seatsOpen(barOpenSeats) : null;
  const signInHref = authCrossLinkUrl("/login", returnPath);
  const groupLine =
    group && justJoinedGroup && groupName
      ? heroCopy.joinedNote(groupName)
      : group && groupGate === "none" && groupName
        ? heroCopy.memberNote(groupName)
        : heroCopy.notMemberYet(sharer);
  const groupAction = !isSignedIn ? (
    <Button variant="outline-inverse" size="sm" asChild>
      <Link href={signInHref}>{groupCopy.joinGroup}</Link>
    </Button>
  ) : group && groupBlocks && groupGate !== "requested" ? (
    <Button
      variant="outline-inverse"
      size="sm"
      disabled={groupChoicePending != null}
      pending={groupChoicePending === "group_only"}
      onClick={() => onChooseGroup("group_only")}
    >
      {groupCopy.joinGroup}
    </Button>
  ) : null;
  const signInBar = (
    <GameInviteBar
      title={seatsTitle}
      subline={heroCopy.signInSubline}
      action={
        <Button variant="inverse" size="lg" asChild>
          <Link href={signInHref}>{heroCopy.signInToJoin}</Link>
        </Button>
      }
    />
  );

  function page(args: {
    content?: React.ReactNode;
    seats?: React.ReactNode;
    bar: React.ReactNode;
  }) {
    return (
      <div className="flex flex-1 flex-col gap-3">
        <GameInviteCard model={heroModel} seats={args.seats} />
        {args.content}
        {levelCard ? <GameInviteLevelCard card={levelCard} /> : null}
        {hero.groupCard ? (
          <GameInviteGroupCard
            group={hero.groupCard}
            line={groupLine}
            action={groupAction}
          />
        ) : null}
        <GameInviteRows rows={gameInviteWebRows(hero, locale)} />
        {args.bar}
      </div>
    );
  }

  if (blockedByLevelRange && !accept.isSuccess) {
    return page({
      bar:
        levelAction.kind === "pending-note" ? (
          <GameInviteBar title={null} subline={levelAction.text} />
        ) : (
          <GameInviteBar
            title={rangeLabel}
            subline={null}
            action={
              <Button
                variant="inverse"
                size="lg"
                disabled={levelAction.disabled}
                onClick={() =>
                  requestLevelRange.mutate({
                    gameId: ready.gameId,
                    inviteToken: token,
                  })
                }
              >
                {levelAction.label}
              </Button>
            }
          />
        ),
    });
  }

  if (partnerRequiredJoin && !accept.isSuccess) {
    return page({
      content: (
        <p className="text-body text-dim">
          {m.tournament.join.partnerInviteLanding}
        </p>
      ),
      bar: isSignedIn ? (
        <GameInviteBar
          title={seatsTitle}
          subline={null}
          action={
            <Button variant="inverse" size="lg" asChild>
              <Link href={tournamentPartnerInviteLandingHref(ready.gameId)}>
                {m.tournament.join.pickAPartner}
              </Link>
            </Button>
          }
        />
      ) : (
        signInBar
      ),
    });
  }

  if (group && groupAsks && groupGate === "requested") {
    const request = group.pendingRequest;
    const heldLabel = request?.seatHeldUntil
      ? formatGameStart(request.seatHeldUntil, locale)
      : null;
    const copy = gameInviteGroupRequestCard(group, heldLabel, locale);
    return page({
      content: (
        <GameInviteRequestCard
          title={copy.title}
          description={copy.description}
          sharedBy={
            copy.sharedByValue
              ? { label: copy.sharedByLabel, value: copy.sharedByValue }
              : null
          }
          withdraw={
            request ? (
              <button
                type="button"
                className="text-meta text-dim hover:text-on-focus min-h-11 w-full py-3 disabled:opacity-60"
                disabled={withdraw.isPending}
                onClick={() => withdraw.mutate({ requestId: request.id })}
              >
                {copy.withdrawLabel}
              </button>
            ) : null
          }
        />
      ),
      bar: <GameInviteBar title={copy.barTitle} subline={copy.barSubline} />,
    });
  }

  if (group && groupBlocks) {
    const copy = gameInviteGroupLandingCopy(group, openSeats, locale);
    return page({
      content: (
        <GroupJoinDialog
          open={groupDialogOpen}
          group={group}
          pending={groupChoicePending}
          onChoose={onChooseGroup}
          onOpenChange={setGroupDialogOpen}
        />
      ),
      bar: (
        <GameInviteBar
          title={copy.barTitle}
          subline={copy.barSubline}
          action={
            <Button
              variant="inverse"
              size="lg"
              disabled={groupChoicePending != null}
              onClick={() => setGroupDialogOpen(true)}
            >
              {copy.joinGameLabel}
            </Button>
          }
        />
      ),
    });
  }

  const memberSubline = group && justJoinedGroup ? groupCopy.oneTap : null;

  if (needsSeatPick && !accept.isSuccess) {
    return page({
      content: (
        <>
          {joinedNotice}
          <p className="text-meta text-dim">
            {gameInviteSeatCopy(
              { joinFrozen, waitlistOnly },
              isSignedIn ? "link" : "link-signed-out",
              locale,
            )}
          </p>
        </>
      ),
      seats: (
        <Surface tone="paper" radius="lg" className="p-3">
          <GameSeatGrid
            sides={sides}
            canJoinVacant={canJoinVacant}
            joinLabel={m.invite.inbox.sitHereLabel}
            joining={joinPending}
            canMove={false}
            moving={false}
            isOrganizer={false}
            cancelled={joinFrozen}
            kickPending={false}
            onJoin={onJoinSeat}
            onMove={() => undefined}
            onKick={() => undefined}
            sideNoun={sideNoun}
          />
        </Surface>
      ),
      bar: !isSignedIn ? (
        signInBar
      ) : waitlistOnly ? (
        <GameInviteBar
          title={null}
          subline={null}
          action={
            <Button
              variant="inverse"
              size="lg"
              className="w-full"
              onClick={onJoinWaitlist}
              disabled={joinPending}
            >
              {joinPending
                ? m.webAuth.invites.joiningShort
                : m.invite.inbox.joinWaitlistLabel}
            </Button>
          }
        />
      ) : (
        <GameInviteBar title={seatsTitle} subline={memberSubline} />
      ),
    });
  }

  if (footballJoin && football && !accept.isSuccess) {
    const subtitle = footballInviteJoinSubtitle(football, locale);
    return page({
      content: (
        <>
          {joinedNotice}
          <FootballJoinDialog
            open={footballOpen}
            onOpenChange={setFootballOpen}
            mode="join"
            subtitle={subtitle}
            players={football.players}
            viewer={football.preferred}
            price={formatPricePerPlayerFils(
              football.pricePerPlayerFils,
              locale,
            )}
            teamsLine={
              football.teamsSet
                ? m.webAuth.invites.football.teamsSet
                : m.webAuth.invites.football.teamsByOrganizer
            }
            pending={joinPending}
            error={accept.error?.message ?? joinGroup.error?.message ?? null}
            onSubmit={onJoinFootball}
          />
        </>
      ),
      bar: (
        <GameInviteBar
          title={seatsTitle}
          subline={memberSubline ?? m.webAuth.invites.football.pickRole}
          action={
            <Button
              variant="inverse"
              size="lg"
              onClick={() => setFootballOpen(true)}
            >
              {m.webAuth.invites.football.chooseHowYouPlay}
            </Button>
          }
        />
      ),
    });
  }

  if (!isSignedIn) {
    return page({ bar: signInBar });
  }

  return page({
    content: joinedNotice,
    bar: (
      <GameInviteBar
        title={seatsTitle}
        subline={null}
        action={
          <Button variant="inverse" size="lg" disabled pending>
            {m.webAuth.invites.joining(gameName)}
          </Button>
        }
      />
    ),
  });
}
