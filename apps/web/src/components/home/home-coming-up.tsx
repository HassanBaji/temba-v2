import { Trophy } from "lucide-react";
import Link from "next/link";

import { SurfaceLabel } from "~/components/common/surface-label";
import { formatGameClock, formatWeekday } from "@repo/domain/format-game-start";
import {
  type HomeComingUpGameRow,
  type HomeComingUpRow,
  type HomeComingUpTournamentMatchRow,
  type HomeComingUpTournamentRow,
} from "~/lib/home-coming-up";
import { zonedParts } from "@repo/domain/product-timezone";
import { cn } from "~/lib/utils";

const ROW_CLASS =
  "focus-visible:ring-ring/50 flex items-center gap-3 px-[22px] py-3 outline-none focus-visible:ring-[3px]";

function weekdayAbbrev(date: Date): string {
  return formatWeekday(date, "short");
}

function DayBox({ startsAt }: { startsAt: Date }) {
  return (
    <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center">
      <span className="font-expanded text-title leading-none">
        {zonedParts(startsAt).day}
      </span>
      <span className="text-muted-foreground text-meta leading-none">
        {weekdayAbbrev(startsAt)}
      </span>
    </div>
  );
}

function GameRow({ game }: { game: HomeComingUpGameRow }) {
  const open = Math.max(0, game.seatsTotal - game.seatsTaken);
  const bars = [
    ...Array.from({ length: game.seatsTaken }, () => "taken" as const),
    ...Array.from({ length: open }, () => "open" as const),
  ];
  return (
    <Link href={`/dashboard/games/${game.id}`} className={ROW_CLASS}>
      <DayBox startsAt={game.startsAt} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{game.venueName}</p>
        <p className="text-muted-foreground text-meta">
          {formatGameClock(game.startsAt)}
        </p>
      </div>
      <div className="flex h-6 items-end gap-0.5" aria-hidden="true">
        {bars.map((kind, index) => (
          <span
            key={`${game.id}-${index}`}
            aria-hidden="true"
            className={cn(
              "h-full w-1 rounded-sm",
              kind === "taken" ? "bg-ink" : "hatch",
            )}
          />
        ))}
      </div>
      <span className="sr-only">
        {open === 0
          ? "All seats filled"
          : open === 1
            ? "Open seat"
            : `${open} open seats`}
      </span>
    </Link>
  );
}

function TournamentTitle({ title }: { title: string }) {
  return (
    <p className="flex min-w-0 items-center gap-1.5 font-medium">
      <Trophy aria-hidden="true" className="size-3.5 shrink-0" />
      <span className="truncate">{title}</span>
    </p>
  );
}

function TournamentRow({ game }: { game: HomeComingUpTournamentRow }) {
  return (
    <Link
      href={`/dashboard/games/${game.id}`}
      data-slot="home-coming-up-tournament"
      className={ROW_CLASS}
    >
      <DayBox startsAt={game.startsAt} />
      <div className="min-w-0 flex-1">
        <TournamentTitle title={game.title} />
        <p className="text-muted-foreground text-meta truncate">
          {game.teamsLine}
        </p>
      </div>
      {game.actionLabel ? (
        <span className="bg-ink text-paper text-meta shrink-0 rounded-sm px-3 py-1.5 font-semibold">
          {game.actionLabel}
        </span>
      ) : null}
    </Link>
  );
}

function TournamentMatchRow({
  game,
}: {
  game: HomeComingUpTournamentMatchRow;
}) {
  const meta = [formatGameClock(game.startsAt), game.opponentLine]
    .filter(Boolean)
    .join(", ");
  return (
    <Link
      href={`/dashboard/games/${game.id}`}
      data-slot="home-coming-up-tournament-match"
      className={ROW_CLASS}
    >
      <DayBox startsAt={game.startsAt} />
      <div className="min-w-0 flex-1">
        <TournamentTitle title={game.title} />
        <p className="text-muted-foreground text-meta truncate">{meta}</p>
      </div>
      {game.roundTag ? (
        <span className="bg-ink text-paper shrink-0 rounded-md px-2 py-1 font-mono text-[10px] uppercase">
          {game.roundTag}
        </span>
      ) : null}
    </Link>
  );
}

export function HomeComingUp({ games }: { games: HomeComingUpRow[] }) {
  if (games.length === 0) {
    return null;
  }

  return (
    <section className="border-rule bg-paper overflow-hidden rounded-xl border">
      <SurfaceLabel>Coming up</SurfaceLabel>
      <ul className="divide-rule divide-y">
        {games.map((game) => (
          <li key={game.rowKey}>
            {game.kind === "tournament_match" ? (
              <TournamentMatchRow game={game} />
            ) : game.kind === "tournament" ? (
              <TournamentRow game={game} />
            ) : (
              <GameRow game={game} />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
