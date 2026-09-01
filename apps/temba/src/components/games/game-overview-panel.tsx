import { StatStrip } from "~/components/common/stat-strip";
import { GameDetailTiles } from "~/components/games/game-detail-tiles";
import { GameVenueCard } from "~/components/games/game-venue-card";
import { SoftArchiveBanner } from "~/components/temba/soft-archive-banner";
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
  const occupancy =
    game.registrationMode === "team_only"
      ? {
          label: "Teams",
          value: `${game.registeredTeamCount} / ${game.teamsAllowed ?? 2}`,
        }
      : {
          label: "Players",
          value: `${game.registeredUserCount} / ${game.playersAllowed ?? 4}`,
        };

  return (
    <div className="space-y-6">
      {game.joinFrozen && !game.cancelledAt ? (
        <SoftArchiveBanner heading="This Club Group's Community is Soft-archived">
          Register, waitlist, Lookup, and Invite link mint and accept stay
          closed. Reopen is refused.
        </SoftArchiveBanner>
      ) : null}

      <GameDetailTiles
        windowStart={game.windowStart}
        windowEnd={game.windowEnd}
        durationInMinutes={firstMatch?.durationInMinutes}
        sport={game.sport}
        format={game.format}
        pricePerPlayerCents={game.pricePerPlayerCents}
      />

      <GameVenueCard venue={game.venue} courtNames={courtNames} />

      <StatStrip
        items={[occupancy, { label: "Waitlist", value: game.waitlist.length }]}
      />

      {game.isRegistered ? (
        <p className="text-body text-muted-foreground">
          You are registered on this Game.
        </p>
      ) : null}
      {game.isWaitlisted ? (
        <p className="text-body text-muted-foreground">
          You are on the waitlist.
        </p>
      ) : null}
    </div>
  );
}
