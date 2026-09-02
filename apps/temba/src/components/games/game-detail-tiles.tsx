import type { LucideIcon } from "lucide-react";
import { CalendarDays, Clock, Coins, Trophy } from "lucide-react";

import { SPORT_LABELS, type SportValue } from "~/components/temba/sport-badge";
import { Card } from "~/components/ui/card";
import {
  formatGameTimeWindow,
  formatRelativeDay,
} from "~/lib/format-game-start";
import { formatPricePerPlayerCents } from "~/lib/price-per-player";

function sportLabel(sport: string | null) {
  if (!sport) {
    return "Not set";
  }
  return sport in SPORT_LABELS ? SPORT_LABELS[sport as SportValue] : sport;
}

function durationLabel(minutes: number | null | undefined) {
  if (minutes == null) {
    return null;
  }
  return `${minutes} min`;
}

function DetailTile({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail?: string | null;
}) {
  return (
    <Card variant="raised" className="min-w-[9.75rem] flex-[1_1_9.75rem] gap-2">
      <div className="bg-background flex size-10 items-center justify-center rounded-lg">
        <Icon
          aria-hidden="true"
          className="text-muted-foreground size-5"
          strokeWidth={1.75}
        />
      </div>
      <p className="text-eyebrow text-muted-foreground font-medium uppercase tracking-[0.06em]">
        {label}
      </p>
      <p className="text-lead font-semibold">{value}</p>
      {detail ? (
        <p className="text-meta text-muted-foreground">{detail}</p>
      ) : null}
    </Card>
  );
}

export function GameDetailTiles({
  windowStart,
  windowEnd,
  durationInMinutes,
  sport,
  pricePerPlayerCents,
}: {
  windowStart: Date | string | null;
  windowEnd: Date | string | null | undefined;
  durationInMinutes: number | null | undefined;
  sport: string | null;
  pricePerPlayerCents: number | null | undefined;
}) {
  const priceLabel = formatPricePerPlayerCents(pricePerPlayerCents);
  const relativeDay = windowStart ? formatRelativeDay(windowStart) : null;
  const dateValue = windowStart
    ? (windowStart instanceof Date
        ? windowStart
        : new Date(windowStart)
      ).toLocaleDateString(undefined, {
        weekday: "long",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Not set";
  const windowLabel = windowStart
    ? formatGameTimeWindow(windowStart, windowEnd, windowStart)
    : "Not set";

  return (
    <div className="flex flex-wrap gap-3">
      <DetailTile
        icon={CalendarDays}
        label="Date"
        value={dateValue}
        detail={relativeDay}
      />
      <DetailTile
        icon={Clock}
        label="Time"
        value={windowLabel}
        detail={durationLabel(durationInMinutes)}
      />
      <DetailTile icon={Trophy} label="Sport" value={sportLabel(sport)} />
      {priceLabel ? (
        <DetailTile icon={Coins} label="Price per player" value={priceLabel} />
      ) : null}
    </div>
  );
}
