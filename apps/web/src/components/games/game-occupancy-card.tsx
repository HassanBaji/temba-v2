import {
  AvatarStack,
  type AvatarStackPerson,
} from "~/components/common/avatar-stack";
import { HatchFlag } from "~/components/temba/seat";
import { Card } from "~/components/ui/card";
import {
  gameOccupancy,
  seatsLeftLabel,
  type GameOccupancyTone,
} from "@repo/domain/game-occupancy";
import { useLocale, useMessages } from "~/components/locale-provider";
import { cn } from "~/lib/utils";

const BAR_TONE: Record<GameOccupancyTone, string> = {
  open: "bg-foreground",
  filling: "bg-warning",
  full: "bg-success",
};

const LABEL_TONE: Record<Exclude<GameOccupancyTone, "open">, string> = {
  filling: "text-warning font-semibold",
  full: "text-success font-semibold",
};

export function GameOccupancyCard({
  unit,
  registeredCount,
  allowed,
  waitlistCount,
  people,
}: {
  unit: "player" | "team";
  registeredCount: number;
  allowed: number;
  waitlistCount: number;
  people: AvatarStackPerson[];
}) {
  const locale = useLocale();
  const m = useMessages();
  const occupancy = gameOccupancy(registeredCount, allowed);

  function remainingLabel(remaining: number) {
    if (unit === "player") {
      return seatsLeftLabel(remaining, locale);
    }
    return m.webGame.occupancy.teamsToGo(remaining);
  }

  if (!occupancy) {
    return null;
  }

  const filledPercent =
    allowed > 0 ? Math.min(100, (registeredCount / allowed) * 100) : 0;

  return (
    <Card variant="raised" className="gap-3">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-eyebrow text-muted-foreground font-medium uppercase tracking-[0.06em]">
            {unit === "player" ? m.common.players : m.webGame.occupancy.teams}
          </p>
          <p className="text-h2 font-bold tabular-nums">
            {registeredCount}
            <span className="text-muted-foreground text-lead font-semibold">
              {" / "}
              {allowed}
            </span>
          </p>
        </div>
        {people.length > 0 ? (
          <AvatarStack people={people} surface="raised" />
        ) : null}
      </div>

      <div
        aria-hidden="true"
        className="bg-muted h-1.5 w-full overflow-hidden rounded-full"
      >
        <div
          className={cn("h-full rounded-full", BAR_TONE[occupancy.tone])}
          style={{ width: `${filledPercent}%` }}
        />
      </div>

      <p className="text-meta">
        {occupancy.tone === "open" ? (
          <HatchFlag>{remainingLabel(occupancy.seatsLeft)}</HatchFlag>
        ) : (
          <span className={LABEL_TONE[occupancy.tone]}>
            {occupancy.tone === "full"
              ? m.game.occupancy.full
              : remainingLabel(occupancy.seatsLeft)}
          </span>
        )}
        {waitlistCount > 0 ? (
          <span className="text-muted-foreground">
            {" · "}
            {m.webGame.occupancy.onWaitlist(waitlistCount)}
          </span>
        ) : null}
      </p>
    </Card>
  );
}
