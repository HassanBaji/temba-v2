import { GameDetailTiles } from "~/components/games/game-detail-tiles";
import { GameLevelRangePanel } from "~/components/games/game-level-range-panel";
import { GameOccupancyCard } from "~/components/games/game-occupancy-card";
import { GameVenueCard } from "~/components/games/game-venue-card";
import { Card } from "~/components/ui/card";
import { tournamentRoundSummary } from "~/lib/tournament-rounds";
import { type RouterOutputs } from "~/trpc/react";

type GameDetail = RouterOutputs["games"]["byId"];

export function GameOverviewPanel({ game }: { game: GameDetail }) {
  const firstMatch = game.matches[0];
  const courtNames = [
    ...new Set(
      game.matches.flatMap((match) =>
        match.courtName ? [match.courtName] : [],
      ),
    ),
  ];
  const teamOnly = game.registrationMode === "team_only";
  const registeredCount = teamOnly
    ? game.registeredTeamCount
    : game.registeredUserCount;
  const allowed = teamOnly
    ? (game.teamsAllowed ?? 2)
    : (game.playersAllowed ?? 4);

  const rounds = tournamentRoundSummary({
    poolCount: game.poolCount,
    teamCount: game.teamsAllowed,
    windowStart: game.windowStart,
    windowEnd: game.windowEnd,
  });

  return (
    <div className="space-y-6">
      <GameDetailTiles
        windowStart={game.windowStart}
        windowEnd={game.windowEnd}
        durationInMinutes={firstMatch?.durationInMinutes}
        pricePerPlayerCents={game.pricePerPlayerCents}
        levelMinTenths={game.levelMinTenths}
        levelMaxTenths={game.levelMaxTenths}
      />

      <GameOccupancyCard
        unit={teamOnly ? "team" : "player"}
        registeredCount={registeredCount}
        allowed={allowed}
        waitlistCount={game.waitlist.length}
        people={game.registeredPlayers}
      />

      {rounds ? (
        <Card variant="raised" className="gap-2">
          <p className="text-eyebrow text-muted-foreground font-medium uppercase tracking-[0.06em]">
            Rounds
          </p>
          <p className="text-h2 font-bold tabular-nums">
            {rounds.roundCount}
            <span className="text-muted-foreground text-lead font-semibold">
              {rounds.roundCount === 1 ? " Round" : " Rounds"}
            </span>
          </p>
          {rounds.dateLines.length > 0 ? (
            <ul className="text-meta text-muted-foreground">
              {rounds.dateLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
        </Card>
      ) : null}

      <GameVenueCard venue={game.venue} courtNames={courtNames} />

      <GameLevelRangePanel game={game} />
    </div>
  );
}
