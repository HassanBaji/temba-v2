import Link from "next/link";

import { formatGameClock } from "~/lib/format-game-start";
import { cn } from "~/lib/utils";

export type HomeComingUpRow = {
  id: string;
  venueName: string;
  startsAt: Date;
  seatsTaken: number;
  seatsTotal: number;
};

function weekdayAbbrev(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

export function HomeComingUp({ games }: { games: HomeComingUpRow[] }) {
  if (games.length === 0) {
    return null;
  }

  return (
    <section className="border-rule bg-paper overflow-hidden rounded-xl border">
      <h2 className="text-muted-foreground text-meta px-[22px] pb-3 pt-[22px]">
        Coming up
      </h2>
      <ul className="divide-rule divide-y">
        {games.map((game) => {
          const open = Math.max(0, game.seatsTotal - game.seatsTaken);
          const bars = [
            ...Array.from({ length: game.seatsTaken }, () => "taken" as const),
            ...Array.from({ length: open }, () => "open" as const),
          ];
          return (
            <li key={game.id}>
              <Link
                href={`/dashboard/games/${game.id}`}
                className="focus-visible:ring-ring/50 flex items-center gap-3 px-[22px] py-3 outline-none focus-visible:ring-[3px]"
              >
                <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center">
                  <span className="font-expanded text-title leading-none">
                    {game.startsAt.getDate()}
                  </span>
                  <span className="text-muted-foreground text-meta leading-none">
                    {weekdayAbbrev(game.startsAt)}
                  </span>
                </div>
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
            </li>
          );
        })}
      </ul>
    </section>
  );
}
