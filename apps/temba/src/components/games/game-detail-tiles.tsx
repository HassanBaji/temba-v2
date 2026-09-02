import type { LucideIcon } from "lucide-react";
import { CalendarDays, Clock, Coins, Gauge } from "lucide-react";

import { Card } from "~/components/ui/card";
import {
  formatGameTimeWindow,
  formatRelativeDay,
  gameDayProximity,
} from "~/lib/format-game-start";
import { formatLevelRangeLabel } from "~/lib/level-range";
import { formatPricePerPlayerCents } from "~/lib/price-per-player";
import { cn } from "~/lib/utils";

type TileTone = "neutral" | "warning" | "success" | "volt";

const ICON_TONE: Record<TileTone, string> = {
  neutral: "bg-background text-muted-foreground",
  warning: "bg-warning-subtle text-warning",
  success: "bg-success-subtle text-success",
  volt: "bg-volt-soft text-volt-foreground",
};

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
  tone = "neutral",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail?: string | null;
  tone?: TileTone;
}) {
  return (
    <Card variant="raised" className="min-w-[9.75rem] flex-[1_1_9.75rem] gap-2">
      <div
        className={cn(
          "flex size-10 items-center justify-center rounded-lg",
          ICON_TONE[tone],
        )}
      >
        <Icon aria-hidden="true" className="size-5" strokeWidth={1.75} />
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
  pricePerPlayerCents,
  levelMinTenths,
  levelMaxTenths,
}: {
  windowStart: Date | string | null;
  windowEnd: Date | string | null | undefined;
  durationInMinutes: number | null | undefined;
  pricePerPlayerCents: number | null | undefined;
  levelMinTenths?: number | null;
  levelMaxTenths?: number | null;
}) {
  const priceLabel = formatPricePerPlayerCents(pricePerPlayerCents);
  const levelLabel = formatLevelRangeLabel(levelMinTenths, levelMaxTenths);
  const relativeDay = windowStart ? formatRelativeDay(windowStart) : null;
  const imminent = windowStart
    ? gameDayProximity(windowStart) === "today"
    : false;
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
        tone={imminent ? "warning" : "neutral"}
      />
      <DetailTile
        icon={Clock}
        label="Time"
        value={windowLabel}
        detail={durationLabel(durationInMinutes)}
        tone={imminent ? "warning" : "neutral"}
      />
      {priceLabel ? (
        <DetailTile
          icon={Coins}
          label="Price per player"
          value={priceLabel}
          tone={pricePerPlayerCents === 0 ? "success" : "neutral"}
        />
      ) : null}
      {levelLabel ? (
        <DetailTile
          icon={Gauge}
          label="Level range"
          value={levelLabel}
          tone="volt"
        />
      ) : null}
    </div>
  );
}
