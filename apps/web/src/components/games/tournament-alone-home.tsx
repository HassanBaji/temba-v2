"use client";

import * as React from "react";
import { toast } from "sonner";

import { hubRegisterToast } from "@repo/domain/game-card";
import { gamePaymentsTracked } from "@repo/domain/game-payments";
import {
  tournamentHomeView,
  type TournamentDetails,
} from "@repo/domain/tournament-details";

import { GameTvCardSlot } from "~/components/live-board/game-tv";
import { GamePaymentsSection } from "~/components/game-payments/game-payments-section";
import { GameLevelRangePanel } from "~/components/games/game-level-range-panel";
import { useLocale, useMessages } from "~/components/locale-provider";
import { withSeriesFactRow } from "@repo/domain/series-fact-row";
import { SeriesGameCard } from "~/components/series/series-game-card";
import type { WithGameSeries } from "~/components/series/series-hero-line";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

import {
  AloneJoinBar,
  AloneJoinSheet,
  AloneOrganizerCard,
  AloneWaitingCard,
} from "./tournament-alone-parts";
import {
  AmericanoPlayersGrid,
  AmericanoScheduleStrip,
} from "./tournament-americano-parts";
import { TournamentDetailRows } from "./tournament-detail-rows";
import { TournamentHero } from "./tournament-hero";
import {
  TournamentPlayerDialog,
  type TournamentPlayer,
} from "./tournament-player-dialog";
import { ROUND_CARD } from "./tournament-round-parts";

type AloneOnlyDetails = TournamentDetails & {
  canMakeTeamsAlone?: boolean;
  aloneTeamsMinPlayers?: number;
  roster?: {
    users: readonly { id: string; name: string; image: string | null }[];
    count: number;
    cap: number | null;
  } | null;
} & WithGameSeries;

/**
 * An Alone-only Social before its teams are posted (ADR-0096): one list of
 * players where the team cards would be, and Make teams for the Organizer.
 */
export function TournamentAloneHome({
  data,
  backHref,
  tags,
  actions,
  sharePending,
  leavePending,
  onShare,
  onInvite,
  onLeaveWaitlist,
  onKick,
  kickPending = false,
  linkToPlayers = false,
}: {
  data: AloneOnlyDetails;
  backHref: string;
  tags?: React.ReactNode;
  actions?: React.ReactNode;
  sharePending: boolean;
  leavePending: boolean;
  onShare?: () => void;
  onInvite?: () => void;
  onLeaveWaitlist?: () => void;
  onKick?: (userId: string) => void;
  kickPending?: boolean;
  /** The viewer may open the players' profiles. */
  linkToPlayers?: boolean;
}) {
  const messages = useMessages();
  const m = messages.aloneTeams;
  const locale = useLocale();
  const utils = api.useUtils();
  const view = tournamentHomeView(data, locale);
  const [joinOpen, setJoinOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<TournamentPlayer | null>(null);

  const register = api.games.register.useMutation({
    onSuccess: async (result) => {
      toast.success(hubRegisterToast(result.waitlisted, locale));
      setJoinOpen(false);
      await Promise.all([
        utils.games.byId.invalidate({ id: data.id }),
        utils.games.listMyGames.invalidate(),
        utils.users.home.invalidate(),
      ]);
    },
    onError: (error) => {
      if (!joinOpen) {
        toast.error(error.message);
      }
    },
  });

  const players = (data.roster?.users ?? data.registeredPlayers).map(
    (player) => ({
      userId: player.id,
      name: player.name,
      image: player.image,
    }),
  );
  const teamCount = data.teamsAllowed ?? 0;
  const cap = data.roster?.cap ?? data.playersAllowed ?? teamCount * 2;
  const taken = data.roster?.count ?? players.length;
  const full = cap > 0 && taken >= cap;
  const organizer = data.isOrganizer && !data.cancelledAt;
  const seatsLeft = Math.max(0, cap - taken);
  const joinBar =
    (data.canRegister || data.canWaitlist) &&
    !data.isRegistered &&
    !data.isWaitlisted;

  function openPlayer(userId: string) {
    const registered = data.registeredPlayers.find(
      (player) => player.id === userId,
    );
    const listed = players.find((player) => player.userId === userId);
    if (!registered && !listed) {
      return;
    }
    setSelected({
      userId,
      name: registered?.name ?? listed?.name ?? "",
      image: registered?.image ?? listed?.image ?? null,
      guest: registered?.guest,
      phoneNumber: registered?.phoneNumber,
    });
  }

  function openJoin() {
    if (data.canRegister) {
      register.reset();
      setJoinOpen(true);
      return;
    }
    register.mutate({ gameId: data.id });
  }

  return (
    <div className={cn("space-y-6", joinBar && "max-lg:pb-20")}>
      <TournamentHero
        name={view.hero.name}
        eyebrow={view.hero.eyebrow}
        genderTag={view.hero.genderTag}
        startLine={view.hero.startLine}
        sizeLine={view.hero.sizeLine}
        statusLine={`${messages.webTournament.aloneTeams.seats(taken, cap)}, ${
          full ? m.hero.seatsReady : m.hero.seatsWaiting
        }`}
        stats={[{ value: String(teamCount), label: m.hero.teamsLater }]}
        series={data.series}
        viewerUserId={data.viewerUserId}
        left={null}
        right={null}
        showYourTeam={false}
        backHref={backHref}
        onShare={onShare}
        sharePending={sharePending}
        onInvite={organizer ? onInvite : undefined}
        tags={tags}
        actions={actions}
      />
      {data.series ? <SeriesGameCard gameId={data.id} game="social" /> : null}
      <GameTvCardSlot />

      {organizer ? (
        <AloneOrganizerCard
          gameId={data.id}
          taken={taken}
          cap={cap}
          canMakeTeams={data.canMakeTeamsAlone === true}
          minPlayers={data.aloneTeamsMinPlayers ?? 0}
        />
      ) : (
        <AloneWaitingCard cap={cap} />
      )}

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-expanded text-title tracking-[-0.03em]">
            {m.players.title}
          </h2>
          <p className="text-muted-foreground text-meta">
            {m.players.count(taken, cap)}
          </p>
        </div>
        <AmericanoPlayersGrid
          players={players}
          seatCount={cap}
          viewerUserId={data.viewerUserId}
          onOpenSeat={
            data.canRegister && !data.isRegistered ? openJoin : undefined
          }
          onPlayer={organizer && onKick ? openPlayer : undefined}
          playerLabel={
            organizer && onKick
              ? messages.webTournament.player.openActions
              : undefined
          }
        />
        <p className="text-muted-foreground text-meta leading-relaxed">
          {organizer ? m.players.organizerNote : m.players.note}
        </p>
      </section>

      {view.schedule.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-expanded text-title tracking-[-0.03em]">
              {messages.tournamentAmericano.schedule.title}
            </h2>
            <p className="text-muted-foreground text-meta">
              {m.waiting.scheduleAfter}
            </p>
          </div>
          <div className={cn(ROUND_CARD, "p-4")}>
            <AmericanoScheduleStrip starts={view.schedule} />
          </div>
        </section>
      ) : null}

      <TournamentDetailRows
        rows={withSeriesFactRow(
          view.detailRows,
          messages.tournament.home.groupRow,
          data.series,
          messages,
        )}
      />

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

      {joinBar ? (
        <AloneJoinBar
          seatsLeft={seatsLeft}
          canRegister={data.canRegister}
          pending={register.isPending}
          onJoin={openJoin}
        />
      ) : null}

      <AloneJoinSheet
        open={joinOpen}
        onOpenChange={setJoinOpen}
        pending={register.isPending}
        error={register.error}
        onSubmit={(preferredSide) =>
          register.mutate({ gameId: data.id, preferredSide })
        }
      />
      <TournamentPlayerDialog
        player={selected}
        canOpenProfile={linkToPlayers}
        kickPending={kickPending}
        onClose={() => setSelected(null)}
        onKick={
          onKick
            ? (userId) => {
                setSelected(null);
                onKick(userId);
              }
            : undefined
        }
      />
    </div>
  );
}
