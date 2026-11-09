"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { ErrorState } from "~/components/common/error-state";
import {
  GameInviteBar,
  GameInviteCard,
  GameInviteGroupCard,
  GameInviteLevelCard,
  GameInviteNotice,
  GameInviteRequestCard,
  GameInviteRows,
  InviteSeatCourt,
  InviteSitHereTile,
} from "~/components/invites/game-invite-landing";
import {
  InviteJoinSheet,
  type InviteJoinChoice,
} from "~/components/invites/invite-join-sheet";
import {
  InviteOutcome,
  InvitePreviewError,
} from "~/components/invites/invite-outcome";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { formatGameStart } from "@repo/domain/format-game-start";
import { gameDisplayName } from "@repo/domain/game-custom-name";
import {
  gameInviteHeroModel,
  gameInviteLevelCard,
  gameInviteLevelFit,
  gameInviteSharerName,
  gameInviteWebRows,
} from "@repo/domain/game-invite-hero";
import {
  gameInviteSeatCourt,
  inviteJoinDoor,
  type InviteSeatPick,
} from "@repo/domain/game-invite-join-sheet";
import { groupDisplayName } from "@repo/domain/group-join";
import {
  gameInviteGroupGate,
  gameInviteGroupJoinedCopy,
  gameInviteGroupRequestCard,
  gameInviteLinkStage,
  gameInviteSeatState,
  inviteLinkAcceptToast,
  levelRangeGateAction,
} from "@repo/domain/invites";
import { authCrossLinkUrl } from "~/lib/auth-redirect";
import { toastGlobalFormError } from "~/lib/form-mutation-error";
import { tournamentPartnerInviteLandingHref } from "@repo/domain/tournament-join";
import { api } from "~/trpc/react";

type SheetState = { open: boolean; picked: InviteSeatPick | null };

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
  const [sheet, setSheet] = React.useState<SheetState>({
    open: false,
    picked: null,
  });
  const [justJoinedGroup, setJustJoinedGroup] = React.useState(false);
  // A Level request that waits for the Group join to land first.
  const levelAfterJoin = React.useRef<InviteJoinChoice | null>(null);
  const preview = api.games.previewInviteLink.useQuery({ token });

  const ready = preview.data?.status === "ready" ? preview.data : undefined;
  const stage = ready ? gameInviteLinkStage(ready, isSignedIn) : "accept";
  const group = ready?.group ?? null;
  const groupGate = gameInviteGroupGate(group);
  const groupName = group ? groupDisplayName(group.name, locale) : null;

  const closeSheet = () => setSheet((current) => ({ ...current, open: false }));

  function levelRequestArgs(choice: InviteJoinChoice, gameId: string) {
    return {
      gameId,
      inviteToken: token,
      sideIndex: choice.seat?.sideIndex,
      position: choice.seat?.position,
      football: choice.football ?? undefined,
    };
  }

  const requestLevelRange = api.games.requestLevelRange.useMutation({
    onSuccess: async () => {
      toast.success(m.webAuth.invites.requestSent);
      closeSheet();
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
    onError: () => {
      void preview.refetch();
    },
  });
  const joinGroup = api.games.joinGroupFromInviteLink.useMutation({
    onSuccess: async (result) => {
      if (result.outcome === "joined") {
        toast.success(
          m.mobileInvite.link.group.joinedToast(groupName ?? m.group.untitled),
        );
        setJustJoinedGroup(true);
        const pendingLevel = levelAfterJoin.current;
        levelAfterJoin.current = null;
        if (pendingLevel && ready) {
          requestLevelRange.mutate(
            levelRequestArgs(pendingLevel, ready.gameId),
          );
        } else {
          closeSheet();
        }
      } else {
        if (result.outcome === "requested") {
          toast.success(m.mobileInvite.link.group.requestedToast);
        }
        closeSheet();
      }
      await preview.refetch();
    },
    onError: () => {
      levelAfterJoin.current = null;
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

  const levelBlocked = stage === "level_range";
  const levelPending =
    levelBlocked && ready?.levelRangeRequest?.status === "pending";
  const partnerRequiredJoin = stage === "partner";
  const football = ready?.football ?? null;
  const sides = ready?.sides ?? [];
  const seatGame = sides.length > 0;
  const openSeats = football
    ? Math.max(0, (football.playersAllowed ?? 0) - football.players.length)
    : (ready?.vacantSeats.length ?? 0);
  const seatState = gameInviteSeatState({
    registrationStatus: ready?.registrationStatus ?? "open",
    vacantSeatCount: ready?.vacantSeats.length ?? 0,
  });
  const joinFrozen = seatState.joinFrozen;
  const waitlistOnly = seatGame && seatState.waitlistOnly;
  const joinPending =
    accept.isPending || joinGroup.isPending || requestLevelRange.isPending;
  const gameName = ready
    ? gameDisplayName(ready.game, locale)
    : m.invite.kind.game;

  // A member inside the range on a Game with nothing to pick joins on open.
  React.useEffect(() => {
    if (!isSignedIn || preview.data?.status !== "ready") {
      return;
    }
    if (
      preview.data.viewerPassesLevelRange === false ||
      preview.data.partnerRequiredJoin ||
      preview.data.sides.length > 0 ||
      preview.data.football ||
      gameInviteGroupGate(preview.data.group) !== "none"
    ) {
      return;
    }
    if (accept.isPending || accept.isSuccess || accept.isError) {
      return;
    }
    accept.mutate({ token });
  }, [accept, isSignedIn, preview.data, token]);

  function submit(choice: InviteJoinChoice) {
    if (!ready || joinPending) {
      return;
    }
    const seat = choice.seat
      ? { sideIndex: choice.seat.sideIndex, position: choice.seat.position }
      : {};
    const footballPick = choice.football ?? undefined;
    const door = inviteJoinDoor({
      gate: groupGate,
      joinGroup: choice.joinGroup,
      levelBlocked,
    });
    if (door === "hold") {
      joinGroup.mutate({
        token,
        holdSeat: true,
        ...seat,
        football: footballPick,
      });
      return;
    }
    if (door === "level_request") {
      if (groupGate === "open" && choice.joinGroup) {
        levelAfterJoin.current = choice;
        joinGroup.mutate({ token });
        return;
      }
      requestLevelRange.mutate(levelRequestArgs(choice, ready.gameId));
      return;
    }
    accept.mutate({
      token,
      ...seat,
      football: footballPick,
      joinGroup: groupGate === "none" ? undefined : choice.joinGroup,
    });
  }

  function openSheet(picked: InviteSeatPick | null) {
    accept.reset();
    joinGroup.reset();
    requestLevelRange.reset();
    setSheet({ open: true, picked });
  }

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

  if (accept.isError && !sheet.open) {
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
  const asksAboutGroup =
    isSignedIn && (groupGate === "open" || groupGate === "approval");
  const levelCard = gameInviteLevelCard({
    levelMinTenths: ready.levelMinTenths,
    levelMaxTenths: ready.levelMaxTenths,
    viewerLevelTenths: ready.viewerLevelTenths,
    fit,
    asksAboutGroup,
    locale,
  });
  const barOpenSeats =
    football || ready.vacantSeats.length > 0
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
  const groupOnlyPending =
    joinGroup.isPending &&
    !joinGroup.variables?.holdSeat &&
    levelAfterJoin.current == null;
  const groupAction = !isSignedIn ? (
    <Button variant="outline-inverse" size="sm" asChild>
      <Link href={signInHref}>{groupCopy.joinGroup}</Link>
    </Button>
  ) : asksAboutGroup ? (
    <Button
      variant="outline-inverse"
      size="sm"
      disabled={joinPending}
      pending={groupOnlyPending}
      onClick={() => joinGroup.mutate({ token })}
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

  const requestedGate = isSignedIn && groupGate === "requested";
  const canSit =
    !partnerRequiredJoin && !joinFrozen && !requestedGate && !levelPending;
  const onSit = !canSit
    ? null
    : isSignedIn
      ? (picked: InviteSeatPick | null) => openSheet(picked)
      : () => router.push(signInHref);
  const court = seatGame ? gameInviteSeatCourt(sides, locale) : null;
  const seats = court ? (
    <InviteSeatCourt
      court={court}
      onSit={
        onSit && !waitlistOnly
          ? (seat) =>
              onSit({ sideIndex: seat.sideIndex, position: seat.position })
          : null
      }
    />
  ) : undefined;
  const footballTile =
    football && openSeats > 0 ? (
      <InviteSitHereTile
        sub={heroCopy.sitHereFootball(groupCopy.seatsOpen(openSeats))}
        onSit={onSit ? () => onSit(null) : null}
      />
    ) : null;
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
  const joinSheet =
    isSignedIn && (seatGame || football || groupGate !== "none") ? (
      <InviteJoinSheet
        open={sheet.open}
        onOpenChange={(open) => setSheet((current) => ({ ...current, open }))}
        input={{
          kind: football ? "football" : "padel",
          sides,
          picked: sheet.picked,
          usualSide: null,
          teamsMadeAt: null,
          group,
          gate: groupGate,
          gamePublic: ready.isPublic ?? false,
          levelBlocked,
          locale,
        }}
        football={
          football
            ? { players: football.players, preferred: football.preferred }
            : null
        }
        pending={joinPending}
        error={
          accept.error?.message ??
          joinGroup.error?.message ??
          requestLevelRange.error?.message ??
          null
        }
        onSubmit={submit}
      />
    ) : null;

  function page(args: { content?: React.ReactNode; bar: React.ReactNode }) {
    return (
      <div className="flex flex-1 flex-col gap-3">
        <GameInviteCard
          model={heroModel}
          seats={seats}
          countHint={court && canSit ? heroCopy.tapASeat : null}
          afterSeats={footballTile}
        />
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
        {joinSheet}
      </div>
    );
  }

  if (!isSignedIn) {
    return page({ bar: signInBar });
  }

  if (requestedGate && group) {
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

  if (partnerRequiredJoin) {
    return page({
      content: (
        <p className="text-body text-dim">
          {m.tournament.join.partnerInviteLanding}
        </p>
      ),
      bar: (
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
      ),
    });
  }

  if (levelPending) {
    const action = levelRangeGateAction({
      requestStatus: "pending",
      canRequest: false,
      requesting: false,
      locale,
    });
    return page({
      content: joinedNotice,
      bar: (
        <GameInviteBar
          title={null}
          subline={action.kind === "pending-note" ? action.text : null}
        />
      ),
    });
  }

  if (waitlistOnly && !levelBlocked && groupGate === "none") {
    return page({
      content: joinedNotice,
      bar: (
        <GameInviteBar
          title={null}
          subline={null}
          action={
            <Button
              variant="inverse"
              size="lg"
              className="w-full"
              onClick={() => accept.mutate({ token })}
              disabled={joinPending}
            >
              {joinPending
                ? m.webAuth.invites.joiningShort
                : m.invite.inbox.joinWaitlistLabel}
            </Button>
          }
        />
      ),
    });
  }

  const opensSheet = seatGame || football != null || groupGate !== "none";
  const sheetSubline = football
    ? heroCopy.barSheetFootball
    : seatGame
      ? heroCopy.barSheetPadel
      : groupGate !== "none"
        ? groupCopy.asksFirst
        : null;
  if (opensSheet && !joinFrozen) {
    return page({
      content: joinedNotice,
      bar: (
        <GameInviteBar
          title={seatsTitle}
          subline={group && justJoinedGroup ? groupCopy.oneTap : sheetSubline}
          action={
            <Button
              variant="inverse"
              size="lg"
              disabled={joinPending}
              onClick={() => openSheet(null)}
            >
              {groupCopy.joinGame}
            </Button>
          }
        />
      ),
    });
  }

  if (joinFrozen) {
    return page({
      bar: (
        <GameInviteBar title={null} subline={m.invite.inbox.seatCopy.frozen} />
      ),
    });
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
