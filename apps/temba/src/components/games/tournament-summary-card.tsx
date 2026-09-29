"use client";

import { Plus, Trophy } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { UserAvatar } from "~/components/common/user-avatar";
import { FriendlyGameJoinSheet } from "~/components/games/friendly-game-join-sheet";
import { GameStatusBadge } from "~/components/temba/game-status-badge";
import { Button } from "~/components/ui/button";
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

const SURFACE_CHROME = {
  list: { radius: "rounded-2xl", inset: "px-[18px]" },
  home: { radius: "rounded-[14px]", inset: "px-5" },
} as const;

type CardSurface = keyof typeof SURFACE_CHROME;

function CardFrame({
  href,
  linkLabel,
  surface,
  children,
}: {
  href: string;
  linkLabel: string;
  surface: CardSurface;
  children: React.ReactNode;
}) {
  const { radius } = SURFACE_CHROME[surface];
  return (
    <div
      className={cn(
        "border-ink bg-paper relative overflow-hidden border",
        radius,
      )}
    >
      <Link
        href={href}
        aria-label={linkLabel}
        className={cn(
          "focus-visible:ring-ring/50 absolute inset-0 z-0 outline-none focus-visible:ring-[3px]",
          radius,
        )}
      />
      {children}
    </div>
  );
}

function CardBand({
  label,
  meta,
  surface = "list",
}: {
  label: string;
  meta: string | null;
  surface?: CardSurface;
}) {
  return (
    <div
      className={cn(
        "bg-ink text-paper pointer-events-none relative z-10 flex items-center justify-between gap-2.5 py-3",
        SURFACE_CHROME[surface].inset,
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
    return <span className="text-dim shrink-0">{label}</span>;
  }
  return (
    <span className="text-ink inline-flex shrink-0 items-center gap-1.5 font-semibold">
      <i
        aria-hidden="true"
        className="hatch inline-block size-[13px] shrink-0 rounded-[3px]"
      />
      {label}
    </span>
  );
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
    large ? "size-9 rounded-[10px]" : "size-8 rounded-[9px]",
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
          ? "*:data-[slot=avatar-fallback]:text-[12px]"
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

function PlaceholderSquare({ overlap }: { overlap: boolean }) {
  return (
    <span
      className={cn(
        "border-dim/60 bg-paper text-dim flex size-8 shrink-0 items-center justify-center rounded-[9px] border border-dashed",
        overlap ? "-ml-2" : null,
      )}
    >
      <Plus className="size-3.5" strokeWidth={1.5} />
    </span>
  );
}

function PlaceholderPair() {
  return (
    <span aria-hidden="true" className="flex flex-none items-center">
      <PlaceholderSquare overlap={false} />
      <PlaceholderSquare overlap />
    </span>
  );
}

function TeamPairs({
  teams,
  teamsAllowed,
  registrationOpen,
}: {
  teams: readonly TournamentCardTeam[];
  teamsAllowed: number | null;
  registrationOpen: boolean;
}) {
  const { shown, remaining, placeholders } = tournamentCardPairs(teams, {
    teamsAllowed,
    registrationOpen,
  });
  if (shown.length === 0 && placeholders === 0) {
    return (
      <p className="text-muted-foreground text-[13px]">{NO_TEAMS_YET_COPY}</p>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {shown.map((team) => (
        <TeamPair key={team.gameTeamId} team={team} />
      ))}
      {Array.from({ length: placeholders }, (_, index) => (
        <PlaceholderPair key={index} />
      ))}
      {remaining > 0 ? (
        <span className="text-muted-foreground text-[13px]">+{remaining}</span>
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
      <b className="text-[17px] font-bold tracking-[-0.03em]">{amount}</b>
      {amount === "Free" ? null : (
        <span className="text-muted-foreground truncate text-[13px]">
          per player
        </span>
      )}
    </span>
  );
}

const ACTION_CLASS =
  "inline-flex min-h-11 flex-none items-center justify-center rounded-[11px] px-[22px] text-sm font-semibold";

export function TournamentSummaryCard({
  game,
  href,
  groupName,
  actionPending = false,
  onJoinSeat,
  onJoinWaitlist,
}: {
  game: TournamentCardGame;
  href: string;
  groupName?: string | null;
  actionPending?: boolean;
  onJoinSeat: (sideIndex: number, position: "left" | "right") => void;
  onJoinWaitlist: () => void;
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
    <li data-slot="tournament-summary-card">
      <CardFrame
        href={href}
        surface="list"
        linkLabel={[title, TOURNAMENT_CARD_BAND_LABEL, dateLine]
          .filter(Boolean)
          .join(", ")}
      >
        <CardBand
          label={TOURNAMENT_CARD_BAND_LABEL}
          meta={tournamentCardBandMeta(tournament?.roundCount)}
        />

        <div className="pointer-events-none relative z-10 min-w-0 px-[18px] pb-5 pt-[18px]">
          <div className="flex items-center justify-between gap-2.5 text-sm">
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

          <h3 className="font-expanded mt-4 line-clamp-2 text-[32px] leading-none tracking-[-0.035em]">
            {title}
          </h3>
          {dateLine ? <p className="mt-2.5 text-[15px]">{dateLine}</p> : null}
          {subLine ? (
            <p className="text-muted-foreground mt-0.5 truncate text-[13px]">
              {subLine}
            </p>
          ) : null}

          <div className="border-rule my-4 border-t" />

          <p className="text-muted-foreground pb-2.5 text-[13px]">
            {tournamentTeamsLine(game)}
          </p>
          <TeamPairs
            teams={teams}
            teamsAllowed={game.teamsAllowed}
            registrationOpen={showsTournamentOpenFlag(game)}
          />
        </div>

        <div className="border-rule pointer-events-none relative z-10 flex min-w-0 items-center justify-between gap-2.5 border-t bg-[#fafafa] px-[18px] py-3.5">
          <PriceLine cents={game.pricePerPlayerCents} />
          {interactive ? (
            <Button
              type="button"
              variant={"default"}
              className={cn(ACTION_CLASS, "pointer-events-auto h-auto")}
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
                ACTION_CLASS,
                action === "invite_partner"
                  ? "bg-ink text-paper"
                  : "border-rule bg-paper text-ink border",
              )}
            >
              {actionLabel}
            </span>
          )}
        </div>
      </CardFrame>

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
    </li>
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
            "max-w-full truncate text-[13px]",
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
      <span className="text-dim flex-none text-xs">vs</span>
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
      <CardFrame
        href={href}
        surface="list"
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

        <div className="pointer-events-none relative z-10 min-w-0 px-[18px] pb-5 pt-[18px]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-px">
              <p className="truncate text-sm font-semibold">{title}</p>
              {roundLine ? (
                <p className="text-muted-foreground truncate text-xs">
                  {roundLine}
                </p>
              ) : null}
            </div>
            {status ? (
              <span className="text-dim shrink-0 text-[13px] tabular-nums">
                {status}
              </span>
            ) : null}
          </div>

          <p className="mt-3.5 flex flex-wrap items-baseline gap-x-[9px]">
            <span className="font-expanded text-[46px] tabular-nums leading-none tracking-[-0.045em]">
              {kickoff.time}
            </span>
            {kickoff.meridiem ? (
              <span className="text-dim text-[19px] font-medium leading-none">
                {kickoff.meridiem}
              </span>
            ) : null}
            <span className="text-[15px] font-medium">{day}</span>
          </p>
          {venueLine ? (
            <p className="text-muted-foreground mt-2 truncate text-sm">
              {venueLine}
            </p>
          ) : null}

          <div className="border-rule my-4 border-t" />

          <Matchup sides={game.sides} />

          {standingLine ? (
            <>
              <div className="border-rule my-4 border-t" />
              <p className="text-muted-foreground text-[13px]">
                {standingLine}
              </p>
            </>
          ) : null}
        </div>

        <div className="border-rule pointer-events-none relative z-10 flex min-w-0 items-center justify-between gap-2.5 border-t bg-[#fafafa] px-[18px] py-3.5">
          <span className="text-muted-foreground min-w-0 flex-1 truncate text-sm">
            {lastResultLine}
          </span>
          <span
            className={cn(ACTION_CLASS, "border-rule bg-paper text-ink border")}
          >
            {tournamentMatchActionLabel("view")}
          </span>
        </div>
      </CardFrame>
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
      <CardFrame
        href={href}
        surface="home"
        linkLabel={[title, headline, kickoffLine].filter(Boolean).join(", ")}
      >
        <CardBand
          label={TOURNAMENT_MATCH_CARD_BAND_LABEL}
          meta={poolRoundLabel(game.roundNumber, game.roundCount)}
          surface="home"
        />

        <div className="pointer-events-none relative z-10 min-w-0 px-5 pb-5 pt-[18px]">
          <div className="text-muted-foreground flex items-center justify-between gap-3 text-[13px]">
            <span className="min-w-0 truncate">{title}</span>
            {status ? (
              <span className="shrink-0 tabular-nums">{status}</span>
            ) : null}
          </div>

          <p className="font-expanded mt-2.5 text-[30px] leading-none tracking-[-0.035em]">
            {headline}
          </p>
          <p className="mt-2 truncate text-sm">{kickoffLine}</p>
          {game.courtName ? (
            <p className="text-muted-foreground truncate text-[13px]">
              {game.courtName}
            </p>
          ) : null}

          <div className="border-rule my-4 border-t" />

          <Matchup sides={game.sides} />

          {groupLabel ? (
            <>
              <div className="border-rule my-4 border-t" />
              <div className="flex items-center justify-between gap-2.5 text-[13px]">
                <span className="text-muted-foreground shrink-0">
                  {groupLabel}
                </span>
                <span className="min-w-0 truncate font-semibold">
                  {groupStanding}
                </span>
              </div>
            </>
          ) : null}
        </div>

        <div className="border-rule pointer-events-none relative z-10 flex min-w-0 items-center justify-between gap-2.5 border-t bg-[#fafafa] px-5 py-3.5">
          <span className="text-muted-foreground min-w-0 flex-1 truncate text-sm">
            {roundsLeftLine}
          </span>
          <span
            className={cn(
              ACTION_CLASS,
              "px-[18px]",
              action === "add_results"
                ? "bg-ink text-paper"
                : "border-ink bg-paper text-ink border",
            )}
          >
            {homeTournamentMatchActionLabel(action)}
          </span>
        </div>
      </CardFrame>
    </article>
  );
}
