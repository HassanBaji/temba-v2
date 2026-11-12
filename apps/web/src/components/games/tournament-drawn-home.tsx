"use client";

import * as React from "react";

import { formatAbsoluteDay } from "@repo/domain/format-game-start";
import {
  type TournamentDetails,
  type TournamentStandingsView,
} from "@repo/domain/tournament-details";
import {
  buildPoolKnockoutTree,
  groupsThenKnockoutReviewValue,
} from "@repo/domain/tournament-knockout";
import { type KnockoutMatchPlace } from "@repo/domain/tournament-knockout-view";
import {
  confirmedMatchCount,
  type TournamentFinishedView,
} from "@repo/domain/tournament-finished";
import { poolLabel } from "@repo/domain/tournament-pool-draw";

import { PageTitle } from "~/components/layout/page-title";
import { Surface } from "~/components/ui/surface";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useLocale, useMessages } from "~/components/locale-provider";
import { pageBleed } from "~/lib/page-layout";
import { cn } from "~/lib/utils";

import {
  FinishedScoresNote,
  FinishedShareLink,
  TournamentFinishedHeader,
} from "./tournament-finished-parts";
import { TournamentHeaderBar } from "./tournament-header-bar";
import { TournamentKnockoutTree } from "./tournament-knockout-tree";
import { TournamentPairDrawer } from "./tournament-pair-drawer";
import {
  RoundProgressStrip,
  type RoundsTeam,
  type TournamentRoundsData,
} from "./tournament-round-parts";
import { TournamentRoundsTab } from "./tournament-rounds-tab";
import {
  TournamentScoreDrawer,
  type ScoreSheetTarget,
} from "./tournament-score-drawer";
import {
  TournamentStandingsTab,
  TournamentTeamsTab,
} from "./tournament-standings-tab";
import {
  TournamentSwapDrawer,
  type SwapTarget,
} from "./tournament-swap-drawer";
import {
  useTournamentRounds,
  type TournamentRoundsActions,
} from "./use-tournament-rounds";

type GameDetail = TournamentDetails;
type Tab = "teams" | "rounds" | "standings" | "bracket";

function roundsLead(
  data: TournamentRoundsData | undefined,
  m: ReturnType<typeof useMessages>["tournamentRounds"],
) {
  if (!data) {
    return "";
  }
  if (!data.isOrganizer) {
    return m.lead.roundsPlayer;
  }
  const posted = data.rounds.some(
    (round) => round.state !== "draft" && round.state !== "not_made",
  );
  const drafted = data.rounds.filter((round) => round.state === "draft").length;
  if (posted) {
    return m.lead.roundsOrganizer;
  }
  if (drafted > 0) {
    return m.lead.roundsDrafted(drafted);
  }
  return m.lead.roundsEmpty(
    data.roundCount,
    data.rounds[0]?.expectedMatchCount ?? 0,
  );
}

export function TournamentDrawnHome({
  data,
  standings,
  finished,
  backHref,
  actions,
  album,
  details,
  gameTeams,
  onCancelMatch,
  preview,
}: {
  data: GameDetail;
  standings: TournamentStandingsView;
  /** The finished view once the day is over; null while it runs. */
  finished: TournamentFinishedView | null;
  backHref: string;
  actions?: React.ReactNode;
  /** Album and Notes, under the tabs and above Share. */
  album?: React.ReactNode;
  details?: React.ReactNode;
  gameTeams?: GameDetail["gameTeams"];
  onCancelMatch?: (place: KnockoutMatchPlace) => void;
  /** Fixture Rounds for the design preview, which has no API to call. */
  preview?: { rounds: TournamentRoundsData; actions: TournamentRoundsActions };
}) {
  const messages = useMessages();
  const m = messages.tournamentRounds;
  const locale = useLocale();
  const loaded = useTournamentRounds(data.id, preview == null);
  const rounds = preview?.rounds ?? loaded.rounds.data;
  const roundsActions = preview?.actions ?? loaded.actions;
  const [tab, setTab] = React.useState<Tab>(
    data.isOrganizer && !data.cancelledAt ? "rounds" : "standings",
  );
  const [scoreTarget, setScoreTarget] = React.useState<ScoreSheetTarget | null>(
    null,
  );
  const [swapTarget, setSwapTarget] = React.useState<SwapTarget | null>(null);
  const [pairRound, setPairRound] = React.useState<number | null>(null);

  const teams = React.useMemo(
    () =>
      new Map<string, RoundsTeam>(
        (rounds?.teams ?? []).map((team) => [team.gameTeamId, team]),
      ),
    [rounds?.teams],
  );
  const poolLabels = React.useMemo(
    () =>
      new Map(
        (rounds?.pools ?? []).map((pool) => [
          pool.poolIndex,
          poolLabel(pool.poolIndex, locale),
        ]),
      ),
    [rounds?.pools, locale],
  );
  const choosingWay =
    rounds?.isOrganizer === true &&
    rounds.rounds.every((round) => round.matches.length === 0);
  const showBracket = standings.groupsThenKnockout && data.knockout != null;
  const afterGroup = React.useMemo(() => {
    const { poolCount, qualifiersPerPool } = data;
    if (!standings.groupsThenKnockout || !poolCount || !qualifiersPerPool) {
      return null;
    }
    const tree = buildPoolKnockoutTree({ poolCount, qualifiersPerPool });
    return tree
      ? {
          label: m.ways.afterGroup(poolCount),
          value: groupsThenKnockoutReviewValue({
            tree,
            poolCount,
            qualifiersPerPool,
            locale,
          }),
        }
      : null;
  }, [data, standings.groupsThenKnockout, m, locale]);
  const viewerPool = data.poolTables?.viewerPoolIndex;
  const chip = data.isOrganizer
    ? m.organizerChip
    : viewerPool != null
      ? poolLabel(viewerPool, locale)
      : null;
  const eyebrow = [data.name, data.venue?.name].filter(Boolean).join(", ");

  const titles: Record<Tab, string> = {
    teams: m.tabs.teams,
    rounds: m.tabs.rounds,
    standings: m.tabs.standings,
    bracket: m.tabs.bracket,
  };
  const leads: Record<Tab, string> = {
    teams: m.lead.teams,
    rounds: roundsLead(rounds, m),
    standings: `${standings.lead} ${m.lead.points}`,
    bracket: messages.tournament.home.groupsThenKnockoutLead,
  };

  return (
    <div>
      {finished ? (
        <TournamentFinishedHeader
          view={finished}
          gameId={data.id}
          backHref={backHref}
          chip={chip}
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
          {standings.championLine ? (
            <p className="text-body mt-2 font-semibold">
              {standings.championLine}
            </p>
          ) : null}
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
          <TabsTrigger value="teams">{m.tabs.teams}</TabsTrigger>
          <TabsTrigger value="rounds">{m.tabs.rounds}</TabsTrigger>
          <TabsTrigger value="standings">{m.tabs.standings}</TabsTrigger>
          {showBracket ? (
            <TabsTrigger value="bracket">{m.tabs.bracket}</TabsTrigger>
          ) : null}
        </TabsList>

        {rounds &&
        !finished &&
        (tab === "standings" || (tab === "rounds" && !choosingWay)) ? (
          <div className="pt-[18px]">
            <RoundProgressStrip
              rounds={rounds.rounds}
              currentRoundNumber={rounds.currentRoundNumber}
            />
          </div>
        ) : null}
        {!preview && loaded.rounds.isError ? (
          <p role="alert" className="text-meta text-destructive pt-[18px]">
            {m.loadFailed}
          </p>
        ) : null}

        <TabsContent value="teams" className="pt-[22px]">
          {rounds ? (
            <TournamentTeamsTab
              data={rounds}
              poolLabels={poolLabels}
              teams={teams}
              viewerUserId={data.viewerUserId}
            />
          ) : null}
          {details ? <div className="pt-6">{details}</div> : null}
        </TabsContent>
        <TabsContent value="rounds" className="pt-[22px]">
          {finished && rounds?.isOrganizer ? (
            <div className="pb-[22px]">
              <FinishedScoresNote
                scoreCount={confirmedMatchCount(rounds.rounds)}
              />
            </div>
          ) : null}
          {rounds ? (
            <TournamentRoundsTab
              gameId={data.id}
              data={rounds}
              teams={teams}
              viewerUserId={data.viewerUserId}
              actions={roundsActions}
              details={details}
              afterGroup={afterGroup}
              onEnterScore={setScoreTarget}
              onSwap={setSwapTarget}
              onPair={setPairRound}
            />
          ) : null}
        </TabsContent>
        <TabsContent value="standings" className="pt-[22px]">
          {data.poolTables ? (
            <TournamentStandingsTab
              poolTables={data.poolTables}
              groupsThenKnockout={standings.groupsThenKnockout}
              qualifiersPerPool={data.qualifiersPerPool}
              data={rounds}
              teams={teams}
              viewerUserId={data.viewerUserId}
              onEnterScore={setScoreTarget}
              finished={finished}
            />
          ) : null}
        </TabsContent>
        {showBracket && data.knockout ? (
          <TabsContent value="bracket" className="pt-[22px]">
            {standings.notThrough ? (
              <p className="text-muted-foreground text-meta pb-4 leading-relaxed">
                {messages.tournament.knockoutView.notThrough}
              </p>
            ) : null}
            <TournamentKnockoutTree
              rounds={data.knockout}
              onCancelMatch={onCancelMatch}
              gameTeams={gameTeams}
            />
          </TabsContent>
        ) : null}
      </Tabs>

      {album ? <div className="pt-[26px] empty:hidden">{album}</div> : null}
      {finished ? (
        <div className="pt-6">
          <FinishedShareLink gameId={data.id} label={finished.share.label} />
        </div>
      ) : null}

      {rounds ? (
        <>
          <TournamentScoreDrawer
            gameId={data.id}
            target={scoreTarget}
            teams={teams}
            viewerUserId={data.viewerUserId}
            isOrganizer={rounds.isOrganizer}
            matchMinutes={rounds.matchMinutes}
            rated={data.rated}
            actions={roundsActions}
            onClose={() => setScoreTarget(null)}
            onCorrect={setScoreTarget}
          />
          <TournamentSwapDrawer
            gameId={data.id}
            data={rounds}
            target={swapTarget}
            teams={teams}
            viewerUserId={data.viewerUserId}
            actions={roundsActions}
            onClose={() => setSwapTarget(null)}
          />
          <TournamentPairDrawer
            gameId={data.id}
            data={rounds}
            roundNumber={pairRound}
            teams={teams}
            viewerUserId={data.viewerUserId}
            actions={roundsActions}
            onClose={() => setPairRound(null)}
          />
        </>
      ) : null}
    </div>
  );
}
