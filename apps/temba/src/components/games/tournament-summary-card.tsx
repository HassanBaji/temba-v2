"use client";

import { Trophy } from "lucide-react";
import * as React from "react";

import { UserAvatar } from "~/components/common/user-avatar";
import { FriendlyGameJoinSheet } from "~/components/games/friendly-game-join-sheet";
import {
  SUMMARY_CARD_ACTION_CLASS,
  SUMMARY_CARD_INSET,
  SummaryCardBody,
  SummaryCardFooter,
  SummaryCardShell,
} from "~/components/games/summary-card-shell";
import { GameStatusBadge } from "~/components/temba/game-status-badge";
import { HatchFlag } from "~/components/temba/seat";
import { Button, buttonVariants } from "~/components/ui/button";
import { formatGameCardDay, formatRelativeDay } from "~/lib/format-game-start";
import { formatHomeCountdown, formatHomeKickoff } from "~/lib/home-countdown";
import { formatLevelRangeLabel } from "~/lib/level-range";
import { formatPricePerPlayerCents } from "~/lib/price-per-player";
import {
  NO_TEAMS_YET_COPY,
  showsTournamentOpenFlag,
  TOURNAMENT_CARD_BAND_LABEL,
  TOURNAMENT_MATCH_CARD_BAND_LABEL,
  tournamentCardAction,
  tournamentCardActionLabel,
  tournamentCardBandMeta,
  tournamentCardDateLine,
  tournamentCardPairs,
  homeTournamentMatchActionLabel,
  tournamentMatchAction,
  tournamentMatchActionLabel,
  tournamentMatchGroupLabel,
  tournamentMatchGroupStanding,
  tournamentMatchHeadline,
  tournamentMatchKickoffLine,
  tournamentMatchLastResultLine,
  tournamentMatchRoundLine,
  tournamentMatchRoundsLeftLine,
  tournamentMatchStandingLine,
  tournamentMatchStatus,
  tournamentMatchup,
  tournamentMatchupName,
  tournamentMatchVenueLine,
  tournamentOpenFlagLabel,
  tournamentOpenTeamCount,
  tournamentTeamPairLabel,
  tournamentTeamsLine,
  type TournamentMatchPhase,
} from "~/lib/tournament-card";
import { poolRoundLabel } from "~/lib/tournament-rounds";
import { cn } from "~/lib/utils";
import { type RouterOutputs } from "~/trpc/react";

type TournamentCardGame = RouterOutputs["games"]["listMyGames"][number];
type TournamentCardTeam = NonNullable<
  TournamentCardGame["tournament"]
>["teams"][number];
type TeamOccupant = TournamentCardTeam["left"];

function CardBand({ label, meta }: { label: string; meta: string | null }) {
  return (
    <div
      className={cn(
        "bg-ink text-paper pointer-events-none relative z-10 flex items-center justify-between gap-2.5 py-3",
        SUMMARY_CARD_INSET,
      )}
    >
      <span className="flex min-w-0 items-center gap-2 font-mono text-[11px] uppercase tracking-[0.04em]">
        <Trophy aria-hidden="true" className="size-3.5 shrink-0" />
        {label}
      </span>
      {meta ? (
        <span className="text-dim shrink-0 font-mono text-[10px] uppercase">
          {meta}
        </span>
      ) : null}
    </div>
  );
}

function OpenFlag({ openTeams }: { openTeams: number }) {
  const label = tournamentOpenFlagLabel(openTeams);
  if (openTeams <= 0) {
    return <span className="text-muted-foreground shrink-0">{label}</span>;
  }
  return <HatchFlag className="shrink-0 font-semibold">{label}</HatchFlag>;
}

function PairSquare({
  occupant,
  onInk,
  overlap,
  large = false,
}: {
  occupant: TeamOccupant;
  onInk: boolean;
  overlap: boolean;
  large?: boolean;
}) {
  const shape = cn(
    large ? "size-9 rounded-md" : "size-8 rounded-sm",
    "shrink-0",
    overlap ? "-ml-2" : null,
    overlap && onInk && occupant ? "ring-paper ring-2" : null,
  );
  if (!occupant) {
    return <span aria-hidden="true" className={cn("hatch", shape)} />;
  }
  return (
    <UserAvatar
      name={occupant.name}
      image={occupant.image}
      className={cn(
        shape,
        "*:data-[slot=avatar-fallback]:rounded-none",
        large
          ? "*:data-[slot=avatar-fallback]:text-eyebrow"
          : "*:data-[slot=avatar-fallback]:text-[11px]",
        onInk
          ? "*:data-[slot=avatar-fallback]:bg-ink *:data-[slot=avatar-fallback]:text-paper"
          : "border-rule *:data-[slot=avatar-fallback]:bg-paper *:data-[slot=avatar-fallback]:text-ink border",
      )}
    />
  );
}

function TeamPair({ team }: { team: TournamentCardTeam }) {
  return (
    <span className="flex flex-none items-center">
      <PairSquare
        occupant={team.left}
        onInk={team.isViewerTeam}
        overlap={false}
      />
      <PairSquare occupant={team.right} onInk={team.isViewerTeam} overlap />
      <span className="sr-only">{tournamentTeamPairLabel(team)}</span>
    </span>
  );
}

function TeamPairs({ teams }: { teams: readonly TournamentCardTeam[] }) {
  const { shown, remaining } = tournamentCardPairs(teams);
  if (shown.length === 0) {
    return (
      <p className="text-muted-foreground text-meta">{NO_TEAMS_YET_COPY}</p>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {shown.map((team) => (
        <TeamPair key={team.gameTeamId} team={team} />
      ))}
      {remaining > 0 ? (
        <span className="text-muted-foreground text-meta">+{remaining}</span>
      ) : null}
    </div>
  );
}

function PriceLine({ cents }: { cents: number | null }) {
  const amount = formatPricePerPlayerCents(cents);
  if (!amount) {
    return <span className="min-w-0 flex-1" />;
  }
  return (
    <span className="flex min-w-0 flex-1 items-baseline gap-1.5 truncate">
      <b className="text-lead font-bold tracking-[-0.03em]">{amount}</b>
      {amount === "Free" ? null : (
        <span className="text-muted-foreground text-meta truncate">
          per player
        </span>
      )}
    </span>
  );
}

export function TournamentSummaryCard({
  game,
  href,
  groupName,
  actionPending = false,
  onJoinSeat,
  onJoinWaitlist,
  as: Element = "li",
}: {
  game: TournamentCardGame;
  href: string;
  groupName?: string | null;
  actionPending?: boolean;
  onJoinSeat: (sideIndex: number, position: "left" | "right") => void;
  onJoinWaitlist: () => void;
  as?: "li" | "article";
}) {
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const tournament = game.tournament;
  const teams = tournament?.teams ?? [];
  const title = game.name ?? game.venue?.name ?? "Untitled Game";
  const dateLine = tournamentCardDateLine(game.windowStart, game.windowEnd);
  const levelLabel = formatLevelRangeLabel(
    game.levelMinTenths,
    game.levelMaxTenths,
  );
  const subLine = [game.venue?.name, levelLabel ? `level ${levelLabel}` : null]
    .filter(Boolean)
    .join(", ");
  const cancelled = game.registrationStatus === "cancelled";
  const action = tournamentCardAction(game);
  const actionLabel = tournamentCardActionLabel(action);
  const interactive = action === "join" || action === "join_waitlist";

  return (
    <Element data-slot="tournament-summary-card">
      <SummaryCardShell
        stacked
        emphasis
        href={href}
        linkLabel={[title, TOURNAMENT_CARD_BAND_LABEL, dateLine]
          .filter(Boolean)
          .join(", ")}
      >
        <CardBand
          label={TOURNAMENT_CARD_BAND_LABEL}
          meta={tournamentCardBandMeta(tournament?.roundCount)}
        />

        <SummaryCardBody>
          <div className="text-body flex items-center justify-between gap-2.5">
            <span className="text-muted-foreground min-w-0 truncate">
              {game.windowStart
                ? `Starts ${formatGameCardDay(game.windowStart)}`
                : null}
            </span>
            {cancelled ? (
              <GameStatusBadge status="cancelled" />
            ) : showsTournamentOpenFlag(game) ? (
              <OpenFlag
                openTeams={tournamentOpenTeamCount(game.teamsAllowed, teams)}
              />
            ) : null}
          </div>

          <h3 className="font-expanded text-h1-lg mt-4 line-clamp-2 leading-none tracking-[-0.035em]">
            {title}
          </h3>
          {dateLine ? <p className="text-body mt-2.5">{dateLine}</p> : null}
          {subLine ? (
            <p className="text-muted-foreground text-meta mt-0.5 truncate">
              {subLine}
            </p>
          ) : null}

          <div className="border-rule my-4 border-t" />

          <p className="text-muted-foreground text-meta pb-2.5">
            {tournamentTeamsLine(game)}
          </p>
          <TeamPairs teams={teams} />
        </SummaryCardBody>

        <SummaryCardFooter>
          <PriceLine cents={game.pricePerPlayerCents} />
          {interactive ? (
            <Button
              type="button"
              variant={"default"}
              className={cn(SUMMARY_CARD_ACTION_CLASS, "pointer-events-auto")}
              disabled={actionPending}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (action === "join") {
                  setSheetOpen(true);
                  return;
                }
                onJoinWaitlist();
              }}
            >
              {actionPending ? "Joining…" : actionLabel}
            </Button>
          ) : (
            <span
              className={cn(
                buttonVariants({
                  variant: action === "invite_partner" ? "default" : "outline",
                }),
                SUMMARY_CARD_ACTION_CLASS,
              )}
            >
              {actionLabel}
            </span>
          )}
        </SummaryCardFooter>
      </SummaryCardShell>

      {action === "join" && tournament ? (
        <FriendlyGameJoinSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          title={title}
          sides={tournament.joinSides}
          pending={actionPending}
          pricePerPlayerCents={game.pricePerPlayerCents}
          gameId={game.id}
          format={game.format}
          registrationMode={game.registrationMode}
          canRegister={game.canRegister}
          windowStart={game.windowStart}
          windowEnd={game.windowEnd}
          venueName={game.venue?.name ?? null}
          groupName={groupName ?? game.groupName}
          levelMinTenths={game.levelMinTenths}
          levelMaxTenths={game.levelMaxTenths}
          poolCount={game.poolCount}
          teamsAllowed={game.teamsAllowed}
          storedRoundCount={tournament.roundCount}
          allowSoloRegister={tournament.allowSoloRegister}
          onPickSeat={onJoinSeat}
        />
      ) : null}
    </Element>
  );
}

function MatchupColumn({
  side,
  isViewerSide,
}: {
  side: TournamentCardGame["sides"][number] | null;
  isViewerSide: boolean;
}) {
  const name = tournamentMatchupName(side);
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col gap-2",
        isViewerSide ? "items-start" : "items-end",
      )}
    >
      <span className="flex flex-none items-center">
        <PairSquare
          occupant={side?.left ?? null}
          onInk={isViewerSide}
          overlap={false}
          large
        />
        <PairSquare
          occupant={side?.right ?? null}
          onInk={isViewerSide}
          overlap
          large
        />
      </span>
      {name ? (
        <span
          className={cn(
            "text-meta max-w-full truncate",
            isViewerSide ? "font-semibold" : "text-muted-foreground text-right",
          )}
        >
          {name}
        </span>
      ) : null}
    </div>
  );
}

function useMatchStatus(startsAt: Date, phase?: TournamentMatchPhase) {
  const [now, setNow] = React.useState(() => new Date());

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  return tournamentMatchStatus(phase, formatHomeCountdown(startsAt, now));
}

function Matchup({ sides }: { sides: TournamentCardGame["sides"] }) {
  const { viewer, opponent } = tournamentMatchup(sides);
  return (
    <div className="flex items-center gap-2.5">
      <MatchupColumn side={viewer} isViewerSide={viewer != null} />
      <span className="text-muted-foreground text-eyebrow flex-none">vs</span>
      <MatchupColumn side={opponent} isViewerSide={false} />
    </div>
  );
}

export function TournamentMatchCard({
  game,
  href,
}: {
  game: TournamentCardGame;
  href: string;
}) {
  const startsAt = new Date(game.startTime);
  const kickoff = formatHomeKickoff(startsAt);
  const day = formatRelativeDay(startsAt, { sameDayLabel: "Tonight" });
  const status = useMatchStatus(startsAt);
  const title = game.name ?? game.venue?.name ?? "Untitled Game";
  const roundLine = tournamentMatchRoundLine(game.roundNumber, game.poolMatch);
  const venueLine = tournamentMatchVenueLine(game.venue?.name, game.courtName);
  const standingLine = tournamentMatchStandingLine(game.poolMatch);
  const lastResultLine = tournamentMatchLastResultLine(
    game.poolMatch?.lastResult,
  );

  return (
    <li data-slot="tournament-match-card">
      <SummaryCardShell
        stacked
        emphasis
        href={href}
        linkLabel={[
          title,
          roundLine,
          `${kickoff.time} ${kickoff.meridiem}`,
          day,
        ]
          .filter(Boolean)
          .join(", ")}
      >
        <CardBand
          label={TOURNAMENT_MATCH_CARD_BAND_LABEL}
          meta={poolRoundLabel(game.roundNumber, game.roundCount)}
        />

        <SummaryCardBody>
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-px">
              <h3 className="text-body truncate font-semibold">{title}</h3>
              {roundLine ? (
                <p className="text-muted-foreground text-eyebrow truncate">
                  {roundLine}
                </p>
              ) : null}
            </div>
            {status ? (
              <span className="text-muted-foreground text-meta shrink-0 tabular-nums">
                {status}
              </span>
            ) : null}
          </div>

          <p className="mt-3.5 flex flex-wrap items-baseline gap-x-[9px]">
            <span className="font-expanded text-[46px] tabular-nums leading-none tracking-[-0.045em]">
              {kickoff.time}
            </span>
            {kickoff.meridiem ? (
              <span className="text-muted-foreground text-title font-medium leading-none">
                {kickoff.meridiem}
              </span>
            ) : null}
            <span className="text-body font-medium">{day}</span>
          </p>
          {venueLine ? (
            <p className="text-muted-foreground text-meta mt-2 truncate">
              {venueLine}
            </p>
          ) : null}

          <div className="border-rule my-4 border-t" />

          <Matchup sides={game.sides} />

          {standingLine ? (
            <>
              <div className="border-rule my-4 border-t" />
              <p className="text-muted-foreground text-meta">{standingLine}</p>
            </>
          ) : null}
        </SummaryCardBody>

        <SummaryCardFooter>
          <span className="text-muted-foreground text-meta min-w-0 flex-1 truncate">
            {lastResultLine}
          </span>
          <span
            className={cn(
              buttonVariants({ variant: "outline" }),
              SUMMARY_CARD_ACTION_CLASS,
            )}
          >
            {tournamentMatchActionLabel("view")}
          </span>
        </SummaryCardFooter>
      </SummaryCardShell>
    </li>
  );
}

export function HomeTournamentMatchCard({
  game,
  href,
  phase,
  canAddResults = false,
}: {
  game: TournamentCardGame;
  href: string;
  phase: TournamentMatchPhase;
  canAddResults?: boolean;
}) {
  const startsAt = new Date(game.startTime);
  const kickoff = formatHomeKickoff(startsAt);
  const status = useMatchStatus(startsAt, phase);
  const action = tournamentMatchAction(phase, canAddResults);
  const title = game.name ?? game.venue?.name ?? "Untitled Game";
  const headline = tournamentMatchHeadline(
    game.roundNumber,
    kickoff.relativeDay,
  );
  const kickoffLine = tournamentMatchKickoffLine(kickoff, game.venue?.name);
  const groupLabel = tournamentMatchGroupLabel(game.poolMatch);
  const groupStanding = tournamentMatchGroupStanding(game.poolMatch);
  const roundsLeftLine = tournamentMatchRoundsLeftLine(
    game.roundNumber,
    game.roundCount,
  );

  return (
    <article data-slot="tournament-match-card">
      <SummaryCardShell
        emphasis
        href={href}
        linkLabel={[title, headline, kickoffLine].filter(Boolean).join(", ")}
      >
        <CardBand
          label={TOURNAMENT_MATCH_CARD_BAND_LABEL}
          meta={poolRoundLabel(game.roundNumber, game.roundCount)}
        />

        <SummaryCardBody>
          <div className="text-muted-foreground text-meta flex items-center justify-between gap-3">
            <h3 className="min-w-0 truncate">{title}</h3>
            {status ? (
              <span className="shrink-0 tabular-nums">{status}</span>
            ) : null}
          </div>

          <p className="font-expanded mt-2.5 text-[30px] leading-none tracking-[-0.035em]">
            {headline}
          </p>
          <p className="text-body mt-2 truncate">{kickoffLine}</p>
          {game.courtName ? (
            <p className="text-muted-foreground text-meta truncate">
              {game.courtName}
            </p>
          ) : null}

          <div className="border-rule my-4 border-t" />

          <Matchup sides={game.sides} />

          {groupLabel ? (
            <>
              <div className="border-rule my-4 border-t" />
              <div className="text-meta flex items-center justify-between gap-2.5">
                <span className="text-muted-foreground shrink-0">
                  {groupLabel}
                </span>
                <span className="min-w-0 truncate font-semibold">
                  {groupStanding}
                </span>
              </div>
            </>
          ) : null}
        </SummaryCardBody>

        <SummaryCardFooter>
          <span className="text-muted-foreground text-meta min-w-0 flex-1 truncate">
            {roundsLeftLine}
          </span>
          <span
            className={cn(
              buttonVariants({
                variant: action === "add_results" ? "default" : "outline",
              }),
              SUMMARY_CARD_ACTION_CLASS,
              "px-[18px]",
              action !== "add_results" && "border-ink",
            )}
          >
            {homeTournamentMatchActionLabel(action)}
          </span>
        </SummaryCardFooter>
      </SummaryCardShell>
    </article>
  );
}
