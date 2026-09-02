import {
  AvatarStack,
  type AvatarStackPerson,
} from "~/components/common/avatar-stack";
import { Card } from "~/components/ui/card";
import {
  gameOccupancy,
  seatsLeftLabel,
  type GameOccupancyTone,
} from "~/lib/game-occupancy";
import { cn } from "~/lib/utils";

const BAR_TONE: Record<GameOccupancyTone, string> = {
  open: "bg-volt",
  filling: "bg-warning",
  full: "bg-success",
};

const LABEL_TONE: Record<GameOccupancyTone, string> = {
  open: "text-muted-foreground",
  filling: "text-warning font-semibold",
  full: "text-success font-semibold",
};

function waitlistLabel(count: number) {
  return count === 1 ? "1 on waitlist" : `${count} on waitlist`;
}

function remainingLabel(unit: "player" | "team", remaining: number) {
  if (unit === "player") {
    return seatsLeftLabel(remaining);
  }
  return remaining === 1 ? "1 Team to go" : `${remaining} Teams to go`;
}

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
  const occupancy = gameOccupancy(registeredCount, allowed);

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
            {unit === "player" ? "Players" : "Teams"}
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
        <span className={LABEL_TONE[occupancy.tone]}>
          {occupancy.tone === "full"
            ? "Full"
            : remainingLabel(unit, occupancy.seatsLeft)}
        </span>
        {waitlistCount > 0 ? (
          <span className="text-muted-foreground">
            {" · "}
            {waitlistLabel(waitlistCount)}
          </span>
        ) : null}
      </p>
    </Card>
  );
}
