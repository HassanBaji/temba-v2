"use client";

import { ArrowLeftRight, ChevronDownIcon, ShuffleIcon } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { gamePaymentsTracked } from "@repo/domain/game-payments";
import {
  formatAbsoluteDay,
  formatGameClock,
} from "@repo/domain/format-game-start";
import { shortPlayerName } from "@repo/domain/player-name";
import { filsToMajorInput } from "@repo/domain/price-per-player";
import { hubRegisterToast } from "@repo/domain/game-card";
import {
  AMERICANO_PLAYER_MIN,
  americanoCourtCount,
} from "@repo/domain/tournament-americano";
import {
  americanoHeroStats,
  americanoResultMark,
  americanoRoundStarts,
  viewerAmericanoFocus,
  viewerAmericanoMatches,
} from "@repo/domain/tournament-americano-view";
import { type TournamentDetails } from "@repo/domain/tournament-details";
import { tournamentHomeView } from "@repo/domain/tournament-details";
import { tournamentOrganizerName } from "@repo/domain/tournament-home";

import { ConfirmDialog } from "~/components/common/confirm-dialog";
import { GamePaymentsSection } from "~/components/game-payments/game-payments-section";
import { GameLevelRangePanel } from "~/components/games/game-level-range-panel";
import { PageTitle } from "~/components/layout/page-title";
import { ResultMark } from "~/components/temba/result-mark";
import { Button } from "~/components/ui/button";
import { ShareButton } from "~/components/ui/nav-icon-button";
import { Surface } from "~/components/ui/surface";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useLocale, useMessages } from "~/components/locale-provider";
import { pageBleed } from "~/lib/page-layout";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

import { shareResultHref } from "./played/played-game-view";
import {
  AmericanoDrawSheet,
  AmericanoGameRow,
  AmericanoPlayersGrid,
  AmericanoScheduleStrip,
  AmericanoTableCard,
  AmericanoYourRounds,
  type AmericanoBoard,
  type AmericanoBoardMatch,
  type AmericanoBoardRound,
  type AmericanoNames,
} from "./tournament-americano-parts";
import { TournamentDetailRows } from "./tournament-detail-rows";
import { FinishedShareLink, PlaceChip } from "./tournament-finished-parts";
import { TournamentHero } from "./tournament-hero";
import { TournamentHeaderBar } from "./tournament-header-bar";
import { InitialsMark, ROUND_CARD } from "./tournament-round-parts";
import {
  TournamentScoreDrawer,
  type ScoreSheetTarget,
} from "./tournament-score-drawer";
import { useTournamentRounds } from "./use-tournament-rounds";

type Tab = "players" | "rounds" | "table";

export function TournamentAmericanoHome({
  data,
  backHref,
  actions,
  album,
  sharePending,
  leavePending,
  kickPending,
  onShare,
  onInvite,
  onLeaveWaitlist,
  onKick,
  preview,
}: {
  data: TournamentDetails;
  /** Design preview data: the board is given instead of read from the API. */
  preview?: { board: AmericanoBoard; drawOpen?: boolean };
  backHref: string;
  actions?: React.ReactNode;
  album?: React.ReactNode;
  sharePending: boolean;
  leavePending: boolean;
  kickPending: boolean;
  onShare?: () => void;
  onInvite?: () => void;
  onLeaveWaitlist?: () => void;
  onKick?: (userId: string) => void;
}) {
  const messages = useMessages();
  const m = messages.tournamentAmericano;
  const locale = useLocale();
  const utils = api.useUtils();
  const drawn = data.drawPostedAt != null;
  const query = api.games.americanoBoard.useQuery(
    { gameId: data.id },
    { enabled: preview == null, refetchInterval: drawn ? 30_000 : false },
  );
  const board = preview ? { data: preview.board } : query;
  const [drawOpen, setDrawOpen] = React.useState(preview?.drawOpen ?? false);

  async function refresh() {
    await Promise.all([
      utils.games.americanoBoard.invalidate({ gameId: data.id }),
      utils.games.byId.invalidate({ id: data.id }),
    ]);
  }
  const register = api.games.register.useMutation({
    onSuccess: async (result) => {
      toast.success(hubRegisterToast(result.waitlisted, locale));
      await refresh();
    },
    onError: (error) => toast.error(error.message),
  });
  const post = api.games.postAmericanoRounds.useMutation({
    onSuccess: async () => {
      toast.success(m.draw.posted);
      await refresh();
    },
  });

  const organizerName = tournamentOrganizerName({
    createdBy: data.createdBy,
    people: data.registeredPlayers.map((player) => ({
      userId: player.id,
      name: player.name,
    })),
  });
  const detailRows = [
    ...(organizerName
      ? [{ label: m.details.organizer, value: organizerName }]
      : []),
    ...(data.groupName
      ? [{ label: m.details.group, value: data.groupName }]
      : []),
    {
      label: m.details.format,
      value: m.details.formatValue(data.roundCount ?? 0),
    },
    { label: m.details.scores, value: m.details.scoresValue },
    { label: m.details.rating, value: m.details.ratingValue },
  ];

  const players = board.data?.players ?? [];
  const firstStart = data.windowStart ? new Date(data.windowStart) : null;
  const drawSheet =
    data.isOrganizer && !data.cancelledAt && !drawn ? (
      <AmericanoDrawSheet
        open={drawOpen}
        onOpenChange={setDrawOpen}
        players={players}
        roundCount={data.roundCount ?? 1}
        viewerGamePlayerId={board.data?.viewerGamePlayerId ?? null}
        courtNames={data.recordedCourts.map((court) => court.name)}
        firstStart={firstStart}
        pending={post.isPending}
        error={post.error}
        onMake={async (gamePlayerIds) => {
          await post.mutateAsync({ gameId: data.id, gamePlayerIds });
        }}
      />
    ) : null;

  const joinBar =
    !drawn &&
    (data.canRegister || data.canWaitlist) &&
    !data.isRegistered &&
    !data.isWaitlisted;

  return (
    <div className={cn("space-y-6", joinBar && "max-lg:pb-20")}>
      {drawn && board.data ? (
        <AmericanoDrawnHome
          data={data}
          board={board.data}
          backHref={backHref}
          actions={actions}
          album={album}
          onRefresh={refresh}
        />
      ) : (
        <AmericanoPredraw
          data={data}
          backHref={backHref}
          actions={actions}
          sharePending={sharePending}
          kickPending={kickPending}
          joinPending={register.isPending}
          onShare={onShare}
          onInvite={onInvite}
          onKick={onKick}
          onJoin={() => register.mutate({ gameId: data.id })}
          onOpenDraw={() => setDrawOpen(true)}
        />
      )}

      <TournamentDetailRows rows={detailRows} />

      {data.isWaitlisted && onLeaveWaitlist ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full"
          disabled={leavePending}
          onClick={onLeaveWaitlist}
        >
          {messages.game.action.leaveWaitlist}
        </Button>
      ) : null}

      <GameLevelRangePanel game={data} />
      <GamePaymentsSection
        gameId={data.id}
        tracked={gamePaymentsTracked(data)}
      />
      {drawSheet}
    </div>
  );
}

function AmericanoPredraw({
  data,
  backHref,
  actions,
  sharePending,
  kickPending,
  joinPending,
  onShare,
  onInvite,
  onKick,
  onJoin,
  onOpenDraw,
}: {
  data: TournamentDetails;
  backHref: string;
  actions?: React.ReactNode;
  sharePending: boolean;
  kickPending: boolean;
  joinPending: boolean;
  onShare?: () => void;
  onInvite?: () => void;
  onKick?: (userId: string) => void;
  onJoin: () => void;
  onOpenDraw: () => void;
}) {
  const messages = useMessages();
  const m = messages.tournamentAmericano;
  const locale = useLocale();
  const view = tournamentHomeView(data, locale);
  const [removing, setRemoving] = React.useState<{
    userId: string;
    name: string;
  } | null>(null);
  const seatCount = data.playersAllowed ?? 0;
  const taken = data.registeredPlayers.length;
  const full = taken >= seatCount && seatCount > 0;
  const organizer = data.isOrganizer && !data.cancelledAt;
  const courts = americanoCourtCount(seatCount);
  const starts = americanoRoundStarts({
    windowStart: data.windowStart,
    roundCount: data.roundCount ?? 0,
    matchMinutes: data.matchMinutes,
    players: seatCount,
    recordedCourts: data.recordedCourts.length,
  });
  const sizeLine = [m.hero.courtsLine(courts), data.groupName]
    .filter(Boolean)
    .join(". ");
  const canJoin = data.canRegister || data.canWaitlist;
  const seatsLeft = Math.max(0, seatCount - taken);
  const price =
    data.pricePerPlayerFils != null && data.pricePerPlayerFils > 0
      ? filsToMajorInput(data.pricePerPlayerFils)
      : null;

  return (
    <>
      <TournamentHero
        name={view.hero.name}
        eyebrow={view.hero.eyebrow}
        startLine={view.hero.startLine}
        sizeLine={sizeLine}
        statusLine={`${m.hero.seats(taken, seatCount)}, ${
          full ? m.hero.seatsFull : m.hero.seatsOpen
        }`}
        stats={americanoHeroStats(data, locale)}
        viewerUserId={data.viewerUserId}
        left={null}
        right={null}
        showYourTeam={false}
        backHref={backHref}
        onShare={onShare}
        sharePending={sharePending}
        onInvite={organizer ? onInvite : undefined}
        actions={actions}
      />

      {organizer ? (
        <Surface
          tone="ink"
          className="rounded-card flex flex-wrap items-center gap-3 p-4"
        >
          <span className="bg-raised border-dimrule inline-flex size-10 shrink-0 items-center justify-center rounded-md border">
            <ShuffleIcon aria-hidden="true" className="size-[18px]" />
          </span>
          <div className="min-w-[10rem] flex-1">
            <p className="text-body font-semibold leading-snug">
              {full
                ? m.drawEntry.allIn(taken)
                : m.drawEntry.someIn(taken, seatCount)}
            </p>
            <p className="text-dim text-meta">{m.drawEntry.copy}</p>
          </div>
          <Button
            type="button"
            variant="outline-inverse"
            onClick={onOpenDraw}
            disabled={taken < AMERICANO_PLAYER_MIN}
          >
            {m.drawEntry.open}
          </Button>
        </Surface>
      ) : (
        <div className="border-rule rounded-card relative flex items-start gap-3 overflow-hidden border border-dashed p-4">
          <span
            aria-hidden="true"
            className="hatch absolute inset-0 opacity-40"
          />
          <span className="border-rule bg-paper relative inline-flex size-10 shrink-0 items-center justify-center rounded-md border">
            <ShuffleIcon aria-hidden="true" className="size-[18px]" />
          </span>
          <div className="relative min-w-0">
            <p className="text-body font-semibold">
              {m.drawEntry.waitingTitle}
            </p>
            <p className="text-muted-foreground text-meta leading-relaxed">
              {m.drawEntry.waitingCopy(seatCount)}
            </p>
          </div>
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-expanded text-title tracking-[-0.03em]">
            {m.players.title}
          </h2>
          <p className="text-muted-foreground text-meta">
            {m.players.count(taken, seatCount)}
          </p>
        </div>
        <AmericanoPlayersGrid
          players={data.registeredPlayers.map((player) => ({
            userId: player.id,
            name: player.name,
          }))}
          seatCount={seatCount}
          viewerUserId={data.viewerUserId}
          onOpenSeat={data.canRegister ? onJoin : undefined}
          onPlayer={organizer && onKick ? setRemoving : undefined}
        />
        <p className="text-muted-foreground text-meta leading-relaxed">
          {organizer ? m.players.footOrganizer : m.players.footPlayer}
        </p>
      </section>

      {starts.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-expanded text-title tracking-[-0.03em]">
              {m.schedule.title}
            </h2>
            <p className="text-muted-foreground text-meta">{m.schedule.meta}</p>
          </div>
          <div className={cn(ROUND_CARD, "space-y-3 p-4")}>
            <AmericanoScheduleStrip starts={starts} />
            <p className="text-muted-foreground text-meta leading-relaxed">
              {m.schedule.copy(starts.length, data.matchMinutes ?? 0, courts)}
            </p>
          </div>
        </section>
      ) : null}

      {canJoin && !data.isRegistered && !data.isWaitlisted ? (
        <div className="border-rule bg-paper lg:rounded-card fixed inset-x-0 bottom-0 z-30 border-t px-4 py-3 lg:static lg:border">
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-body font-semibold">
                {m.join.seatsLeft(seatsLeft)}
              </p>
              <p className="text-muted-foreground text-meta truncate">
                {price ? m.join.copyWithPrice(price) : m.join.copy}
              </p>
            </div>
            <Button
              type="button"
              size="lg"
              disabled={joinPending}
              aria-busy={joinPending}
              onClick={onJoin}
            >
              {joinPending
                ? m.join.taking
                : data.canRegister
                  ? m.join.takeSeat
                  : m.join.joinWaitlist}
            </Button>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={removing != null}
        onOpenChange={(open) => {
          if (!open) {
            setRemoving(null);
          }
        }}
        title={removing ? m.players.remove(removing.name) : ""}
        confirmLabel={
          removing ? m.players.remove(shortPlayerName(removing.name)) : ""
        }
        pending={kickPending}
        onConfirm={() => {
          if (removing && onKick) {
            onKick(removing.userId);
          }
          setRemoving(null);
        }}
      />
    </>
  );
}

function roundOpenByDefault(
  round: AmericanoBoardRound,
  current: number | null,
) {
  if (current == null) {
    return round.roundNumber === 1;
  }
  return round.roundNumber === current || round.roundNumber === current + 1;
}

function AmericanoDrawnHome({
  data,
  board,
  backHref,
  actions,
  album,
  onRefresh,
}: {
  data: TournamentDetails;
  board: AmericanoBoard;
  backHref: string;
  actions?: React.ReactNode;
  album?: React.ReactNode;
  onRefresh: () => Promise<void>;
}) {
  const messages = useMessages();
  const m = messages.tournamentAmericano;
  const locale = useLocale();
  const finished = board.finished;
  const [tab, setTab] = React.useState<Tab>(finished ? "table" : "rounds");
  const [scoreTarget, setScoreTarget] = React.useState<ScoreSheetTarget | null>(
    null,
  );
  const names: AmericanoNames = React.useMemo(
    () => new Map(board.players.map((player) => [player.gamePlayerId, player])),
    [board.players],
  );
  const scoreSheetTeams = React.useMemo(
    () => scoreSheetPairs(board.rounds, names),
    [board.rounds, names],
  );
  const { actions: roundActions } = useTournamentRounds(data.id, false);
  const scoreActions = React.useMemo(() => {
    function refreshed<
      Door extends {
        isPending: boolean;
        mutateAsync: (input: never) => Promise<unknown>;
      },
    >(door: Door): Door {
      return {
        ...door,
        mutateAsync: async (input: never) => {
          const result = await door.mutateAsync(input);
          await onRefresh();
          return result;
        },
      };
    }
    return {
      ...roundActions,
      enterScore: refreshed(roundActions.enterScore),
      confirm: refreshed(roundActions.confirm),
      notFinished: refreshed(roundActions.notFinished),
    };
  }, [roundActions, onRefresh]);

  const allMatches = board.rounds.flatMap((round) =>
    round.matches.map((match) => ({
      ...match,
      roundNumber: round.roundNumber,
    })),
  );
  const focus = finished
    ? null
    : viewerAmericanoFocus(
        viewerAmericanoMatches(allMatches, board.viewerGamePlayerId),
        board.currentRoundNumber,
      );
  const played = board.rounds.filter(
    (round) => round.state === "played",
  ).length;
  const chip = data.isOrganizer
    ? messages.tournamentRounds.organizerChip
    : m.chip;
  const eyebrow = [data.name, data.venue?.name].filter(Boolean).join(", ");
  const titles: Record<Tab, string> = {
    players: m.tabs.players,
    rounds: m.tabs.rounds,
    table: m.tabs.standings,
  };
  const leads: Record<Tab, string> = {
    players: m.lead.players,
    rounds: board.isOrganizer
      ? m.lead.roundsOrganizer(board.rounds.length)
      : m.lead.rounds,
    table: m.lead.standings,
  };

  function openScore(match: AmericanoBoardMatch, roundNumber: number) {
    setScoreTarget({
      roundNumber,
      match: scoreSheetMatch(match),
      mode: match.canConfirm ? "confirm" : "enter",
    });
  }

  const progress = (
    <div className="space-y-2">
      <div className="text-meta flex items-baseline justify-between gap-3">
        <p>
          {board.currentRoundNumber != null ? (
            <>
              <span className="font-semibold">
                {m.progress.roundOnCourt(
                  board.currentRoundNumber,
                  board.rounds.length,
                )}
              </span>{" "}
              <span className="text-muted-foreground">
                {finished ? m.progress.allPlayed : m.progress.onCourt}
              </span>
            </>
          ) : null}
        </p>
        <p className="text-muted-foreground">{m.progress.played(played)}</p>
      </div>
      <div className="flex gap-1" aria-hidden="true">
        {board.rounds.map((round) => (
          <span
            key={round.roundNumber}
            className={cn(
              "h-1 flex-1 rounded-full",
              round.state === "played" ? "bg-ink" : "bg-rule",
            )}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div>
      {finished ? (
        <AmericanoFinishedHeader
          data={data}
          board={board}
          names={names}
          chip={chip}
          backHref={backHref}
          actions={actions}
        />
      ) : (
        <Surface
          as="header"
          tone="ink"
          className={cn("pb-[22px] pt-[22px] md:-mt-6", pageBleed)}
        >
          <TournamentHeaderBar surface="ink" backHref={backHref} chip={chip}>
            {actions}
          </TournamentHeaderBar>
          <div className="text-dim text-meta mt-7 flex items-baseline justify-between gap-3">
            <p className="min-w-0 truncate">{eyebrow}</p>
            {data.windowStart ? (
              <p className="shrink-0">
                {formatAbsoluteDay(data.windowStart, locale)}
              </p>
            ) : null}
          </div>
          <PageTitle variant="hero" className="mt-1.5">
            {titles[tab]}
          </PageTitle>
          <p className="text-dim text-meta mt-2 leading-relaxed">
            {leads[tab]}
          </p>
        </Surface>
      )}

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as Tab)}
        className="gap-0"
      >
        <TabsList
          variant="line"
          aria-label={m.tabs.label}
          className="border-rule border-b"
        >
          <TabsTrigger value="players">{m.tabs.players}</TabsTrigger>
          <TabsTrigger value="rounds">{m.tabs.rounds}</TabsTrigger>
          <TabsTrigger value="table">{m.tabs.standings}</TabsTrigger>
        </TabsList>

        <TabsContent value="players" className="pt-[22px]">
          <AmericanoPlayersGrid
            players={board.players.flatMap((player) =>
              player.userId
                ? [{ userId: player.userId, name: player.name }]
                : [],
            )}
            seatCount={board.players.length}
            viewerUserId={data.viewerUserId}
          />
        </TabsContent>

        <TabsContent value="rounds" className="space-y-[22px] pt-[22px]">
          {progress}
          {focus ? (
            <AmericanoFocusCard
              match={focus.match}
              partnerName={
                focus.partnerId
                  ? shortPlayerName(names.get(focus.partnerId)?.name ?? "")
                  : ""
              }
              opponents={focus.opponentIds
                .map((id) => shortPlayerName(names.get(id)?.name ?? ""))
                .join(" & ")}
              roundCount={board.rounds.length}
              onScore={() => openScore(focus.match, focus.roundNumber)}
            />
          ) : null}
          <div className="space-y-2.5">
            {board.rounds.map((round) => (
              <AmericanoRoundCard
                key={`${round.roundNumber}-${board.currentRoundNumber}`}
                gameId={data.id}
                round={round}
                names={names}
                viewerGamePlayerId={board.viewerGamePlayerId}
                defaultOpen={roundOpenByDefault(
                  round,
                  board.currentRoundNumber,
                )}
                current={round.roundNumber === board.currentRoundNumber}
                next={
                  board.currentRoundNumber != null &&
                  round.roundNumber === board.currentRoundNumber + 1
                }
                onScore={(match) => openScore(match, round.roundNumber)}
                onRefresh={onRefresh}
              />
            ))}
          </div>
          {board.isOrganizer && !finished ? (
            <p className="text-muted-foreground text-meta leading-relaxed">
              {m.round.swapFoot}
            </p>
          ) : null}
        </TabsContent>

        <TabsContent value="table" className="space-y-[26px] pt-[22px]">
          {finished ? null : progress}
          <AmericanoTableCard
            table={board.table}
            names={names}
            viewerGamePlayerId={board.viewerGamePlayerId}
            final={finished}
          />
          <AmericanoYourRounds
            matches={allMatches}
            names={names}
            viewerGamePlayerId={board.viewerGamePlayerId}
            finished={finished}
            onEnter={openScore}
          />
        </TabsContent>
      </Tabs>

      {album ? <div className="pt-[26px] empty:hidden">{album}</div> : null}

      {finished ? (
        <div className="pt-6">
          <FinishedShareLink gameId={data.id} label={m.finished.share} />
        </div>
      ) : null}

      <TournamentScoreDrawer
        gameId={data.id}
        target={scoreTarget}
        teams={scoreSheetTeams}
        viewerUserId={data.viewerUserId}
        isOrganizer={board.isOrganizer}
        matchMinutes={board.matchMinutes}
        rated={false}
        actions={scoreActions}
        onClose={() => setScoreTarget(null)}
        onCorrect={setScoreTarget}
        describeOutcome={({ first, second, firstTeam, secondTeam }) => {
          const viewerFirst = scoreTarget?.match.viewerSlot != null;
          const pairName = (team: typeof firstTeam, mine: boolean) =>
            (team?.members ?? [])
              .map((member) =>
                mine && member.id === data.viewerUserId
                  ? messages.common.you
                  : shortPlayerName(member.name),
              )
              .join(" & ");
          return {
            title: m.score.gamesEach(pairName(firstTeam, viewerFirst), first),
            subline: m.score.otherGets(pairName(secondTeam, false), second),
          };
        }}
      />
    </div>
  );
}

type ScoreSheetTeam =
  ScoreSheetTeams extends ReadonlyMap<string, infer Team> ? Team : never;
type ScoreSheetTeams = React.ComponentProps<
  typeof TournamentScoreDrawer
>["teams"];

function pairKey(matchId: string, slot: 1 | 2) {
  return `${matchId}:${slot}`;
}

/**
 * The Social's score sheet reads each side as a Rounds team by id. An
 * Americano pair lives for one Match, so each side is keyed by its Match and
 * slot here, on the web, and never stored or sent as a Game team.
 */
function scoreSheetPairs(
  rounds: readonly AmericanoBoardRound[],
  names: AmericanoNames,
): ScoreSheetTeams {
  const teams = new Map<string, ScoreSheetTeam>();
  const membersOf = (ids: readonly string[]) =>
    ids.flatMap((id) => {
      const player = names.get(id);
      return player?.userId
        ? [{ id: player.userId, name: player.name, image: player.image }]
        : [];
    });
  for (const match of rounds.flatMap((round) => round.matches)) {
    for (const slot of [1, 2] as const) {
      const ids = slot === 1 ? match.slot1PlayerIds : match.slot2PlayerIds;
      teams.set(pairKey(match.matchId, slot), {
        gameTeamId: pairKey(match.matchId, slot),
        poolIndex: 0,
        members: membersOf(ids),
        points: 0,
      });
    }
  }
  return teams;
}

function scoreSheetMatch(
  match: AmericanoBoardMatch,
): ScoreSheetTarget["match"] {
  return {
    ...match,
    poolIndex: null,
    slot1GameTeamId: pairKey(match.matchId, 1),
    slot2GameTeamId: pairKey(match.matchId, 2),
    canSwap: false,
  };
}

/** 3a: the viewer's Match in the Round on court, with the score button. */
function AmericanoFocusCard({
  match,
  partnerName,
  opponents,
  roundCount,
  onScore,
}: {
  match: AmericanoBoardMatch & { roundNumber: number };
  partnerName: string;
  opponents: string;
  roundCount: number;
  onScore: () => void;
}) {
  const m = useMessages().tournamentAmericano;
  const onCourt = match.state !== "scheduled";
  return (
    <div className="border-ink rounded-card border p-4">
      <div className="text-muted-foreground text-meta flex items-baseline justify-between gap-3">
        <p>
          {onCourt
            ? m.yourGame.onCourt(match.roundNumber, roundCount)
            : m.yourGame.next(match.roundNumber, roundCount)}
        </p>
        <p>{match.courtName}</p>
      </div>
      <p className="font-expanded text-h2 mt-1 leading-tight tracking-[-0.03em]">
        {m.yourGame.you(partnerName)}
      </p>
      <p className="text-meta mt-1">
        {m.yourGame.against}{" "}
        <span dir="auto" className="font-semibold">
          {opponents}
        </span>
      </p>
      {match.canConfirm ||
      (match.canEnterScore && match.state === "on_court") ? (
        <Button
          type="button"
          size="lg"
          className="mt-4 w-full font-semibold"
          onClick={onScore}
        >
          {match.canConfirm ? m.round.confirm : m.round.enterScore}
        </Button>
      ) : null}
    </div>
  );
}

function AmericanoRoundCard({
  gameId,
  round,
  names,
  viewerGamePlayerId,
  defaultOpen,
  current,
  next,
  onScore,
  onRefresh,
}: {
  gameId: string;
  round: AmericanoBoardRound;
  names: AmericanoNames;
  viewerGamePlayerId: string | null;
  defaultOpen: boolean;
  current: boolean;
  next: boolean;
  onScore: (match: AmericanoBoardMatch) => void;
  onRefresh: () => Promise<void>;
}) {
  const messages = useMessages();
  const m = messages.tournamentAmericano;
  const locale = useLocale();
  const [open, setOpen] = React.useState(defaultOpen);
  const [swapping, setSwapping] = React.useState(false);
  const [picked, setPicked] = React.useState<string | null>(null);
  const swap = api.games.swapAmericanoPlayers.useMutation({
    onSuccess: async () => {
      toast.success(m.round.swapped);
      await onRefresh();
    },
    onError: (error) => toast.error(error.message),
  });
  const time = round.startTime ? formatGameClock(round.startTime, locale) : "";
  const scored = round.matches.filter(
    (match) => match.slot1GamesWon != null,
  ).length;
  const status =
    round.state === "played"
      ? m.round.played(time)
      : round.state === "on_court"
        ? m.round.onCourt(time, scored, round.matches.length)
        : next
          ? m.round.next(time)
          : m.round.later(time, round.matches.length);
  const panelId = `americano-round-${round.roundNumber}`;

  function pick(id: string) {
    if (picked == null) {
      setPicked(id);
      return;
    }
    if (picked === id) {
      setPicked(null);
      return;
    }
    const first = picked;
    setPicked(null);
    swap.mutate({
      gameId,
      roundNumber: round.roundNumber,
      firstGamePlayerId: first,
      secondGamePlayerId: id,
    });
  }

  return (
    <section className={cn(ROUND_CARD, current && "border-ink")}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="focus-visible:ring-ring/50 flex min-h-14 w-full items-center gap-3 px-4 py-3 text-start outline-none focus-visible:ring-[3px]"
      >
        <span className="font-expanded w-8 shrink-0 text-[19px] tracking-[-0.03em]">
          {m.round.short(round.roundNumber)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-body block font-semibold">
            {m.round.title(round.roundNumber)}
          </span>
          <span className="text-muted-foreground text-meta block">
            {status}
          </span>
        </span>
        <ChevronDownIcon
          aria-hidden="true"
          className={cn(
            "text-muted-foreground size-4 shrink-0 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div id={panelId}>
          {swapping ? (
            <p className="text-muted-foreground text-meta border-rule border-t px-4 py-2.5">
              {m.round.swapHint(round.roundNumber)}
            </p>
          ) : null}
          <ol className="divide-rule border-rule divide-y border-t">
            {round.matches.map((match) => (
              <AmericanoGameRow
                key={match.matchId}
                match={match}
                names={names}
                viewerGamePlayerId={viewerGamePlayerId}
                onEnter={() => onScore(match)}
                onConfirm={() => onScore(match)}
                swap={
                  swapping
                    ? {
                        selected: new Set(picked ? [picked] : []),
                        onPick: pick,
                      }
                    : undefined
                }
              />
            ))}
          </ol>
          {round.canSwap ? (
            <div className="border-rule border-t px-4 py-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={swap.isPending}
                onClick={() => {
                  setSwapping((value) => !value);
                  setPicked(null);
                }}
              >
                <ArrowLeftRight aria-hidden="true" />
                {swapping ? m.round.swapDone : m.round.swap}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

/** 4a: the white finished screen: the winner first, then the viewer's day. */
function AmericanoFinishedHeader({
  data,
  board,
  names,
  chip,
  backHref,
  actions,
}: {
  data: TournamentDetails;
  board: AmericanoBoard;
  names: AmericanoNames;
  chip: string;
  backHref: string;
  actions?: React.ReactNode;
}) {
  const messages = useMessages();
  const m = messages.tournamentAmericano;
  const locale = useLocale();
  const winner = board.table[0];
  const viewer = board.table.find(
    (row) => row.playerId === board.viewerGamePlayerId,
  );
  const allMatches = board.rounds.flatMap((round) =>
    round.matches.map((match) => ({
      ...match,
      roundNumber: round.roundNumber,
    })),
  );
  const results = viewerAmericanoMatches(
    allMatches,
    board.viewerGamePlayerId,
  ).map((game) => game.outcome);
  const winnerName = winner ? (names.get(winner.playerId)?.name ?? "") : "";
  return (
    <Surface
      as="header"
      tone="paper"
      className={cn("pb-[22px] pt-[22px] md:-mt-6", pageBleed)}
    >
      <TournamentHeaderBar surface="paper" backHref={backHref} chip={chip}>
        <ShareButton
          variant="boxed"
          surface="paper"
          href={shareResultHref(data.id)}
          label={m.finished.share}
        />
        {actions}
      </TournamentHeaderBar>
      {data.windowStart ? (
        <p className="text-muted-foreground text-meta mt-7">
          {m.finished.eyebrow(formatAbsoluteDay(data.windowStart, locale))}
        </p>
      ) : null}
      <PageTitle variant="hero" className="mt-1.5">
        {data.name ?? m.shape.title}
      </PageTitle>
      <p className="text-muted-foreground text-meta mt-2 leading-relaxed">
        {m.finished.sub(
          data.venue?.name ?? null,
          board.players.length,
          board.rounds.length,
          data.groupName,
        )}
      </p>
      <ol className={cn(ROUND_CARD, "divide-rule bg-paper mt-5 divide-y")}>
        {winner ? (
          <li
            className={cn(
              "flex items-center gap-3 px-4 py-3.5",
              winner.playerId === board.viewerGamePlayerId && "bg-wash",
            )}
          >
            <PlaceChip place={1} />
            <InitialsMark
              name={winnerName}
              isViewer={winner.playerId === board.viewerGamePlayerId}
              className="text-meta size-11"
            />
            <div className="min-w-0 flex-1">
              <p className="text-muted-foreground text-meta">
                {m.finished.wonTheDay}
              </p>
              <p
                dir="auto"
                className="text-[16px] font-semibold leading-snug tracking-[-0.01em]"
              >
                {winnerName}
              </p>
              <p className="text-muted-foreground text-meta">
                {m.finished.winnerLine(
                  winner.gamesWon,
                  winner.won,
                  winner.drawn,
                  winner.lost,
                )}
              </p>
            </div>
          </li>
        ) : null}
        {viewer && viewer.place !== 1 ? (
          <li className="bg-wash flex items-center gap-3 px-4 py-3.5">
            <PlaceChip place={viewer.place} />
            <InitialsMark
              name={names.get(viewer.playerId)?.name ?? ""}
              isViewer
              className="text-meta size-11"
            />
            <div className="min-w-0 flex-1">
              <p className="text-muted-foreground text-meta">
                {m.finished.you}
              </p>
              <p className="text-[16px] font-semibold leading-snug tracking-[-0.01em]">
                {m.finished.yourPlace(viewer.place, viewer.gamesWon)}
              </p>
              <p className="text-muted-foreground text-meta">
                {m.finished.yourRecord(
                  viewer.won,
                  viewer.drawn,
                  viewer.lost,
                  (winner?.gamesWon ?? 0) - viewer.gamesWon,
                )}
              </p>
              <span className="mt-1.5 flex gap-1" aria-hidden="true">
                {results.map((result, index) => (
                  <ResultMark
                    key={index}
                    variant={americanoResultMark(result)}
                    decorative
                    className="size-3.5"
                  />
                ))}
              </span>
            </div>
          </li>
        ) : null}
      </ol>
    </Surface>
  );
}
