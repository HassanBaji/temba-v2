import type { LucideIcon } from "lucide-react";
import { CalendarDays, Clock, Coins, Gauge } from "lucide-react";

import { Card } from "~/components/ui/card";
import {
  formatGameDay,
  formatGameTimeWindow,
  formatRelativeDay,
  gameDayProximity,
} from "@repo/domain/format-game-start";
import { formatLevelRangeLabel } from "@repo/domain/level-range";
import { formatPricePerPlayerFils } from "@repo/domain/price-per-player";
import { useLocale, useMessages } from "~/components/locale-provider";
import { cn } from "~/lib/utils";

type TileTone = "neutral" | "warning" | "success";

const ICON_TONE: Record<TileTone, string> = {
  neutral: "bg-background text-muted-foreground",
  warning: "bg-warning-subtle text-warning",
  success: "bg-success-subtle text-success",
};

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
  pricePerPlayerFils,
  levelMinTenths,
  levelMaxTenths,
}: {
  windowStart: Date | string | null;
  windowEnd: Date | string | null | undefined;
  durationInMinutes: number | null | undefined;
  pricePerPlayerFils: number | null | undefined;
  levelMinTenths?: number | null;
  levelMaxTenths?: number | null;
}) {
  const locale = useLocale();
  const m = useMessages();
  const priceLabel = formatPricePerPlayerFils(pricePerPlayerFils, locale);
  const levelLabel = formatLevelRangeLabel(
    levelMinTenths,
    levelMaxTenths,
    locale,
  );
  const proximity = windowStart ? gameDayProximity(windowStart) : null;
  const imminent = proximity === "today";
  // A far-off date already spells out its weekday, so the detail line only
  // earns its space while the Game is near.
  const relativeDay =
    windowStart && proximity !== "later"
      ? formatRelativeDay(windowStart, locale)
      : null;
  const dateValue = windowStart
    ? formatGameDay(windowStart, locale, {
        weekday: "long",
        month: "long",
        year: true,
      })
    : m.common.notSet;
  const windowLabel = windowStart
    ? formatGameTimeWindow(windowStart, windowEnd, windowStart, locale)
    : m.common.notSet;

  return (
    <div className="flex flex-wrap gap-3">
      <DetailTile
        icon={CalendarDays}
        label={m.webGame.detailTiles.date}
        value={dateValue}
        detail={relativeDay}
        tone={imminent ? "warning" : "neutral"}
      />
      <DetailTile
        icon={Clock}
        label={m.webGame.detailTiles.time}
        value={windowLabel}
        detail={
          durationInMinutes == null ? null : m.dates.minutes(durationInMinutes)
        }
        tone={imminent ? "warning" : "neutral"}
      />
      {priceLabel ? (
        <DetailTile
          icon={Coins}
          label={m.game.partner.pricePerPlayer}
          value={priceLabel}
          tone={pricePerPlayerFils === 0 ? "success" : "neutral"}
        />
      ) : null}
      {levelLabel ? (
        <DetailTile
          icon={Gauge}
          label={m.webGame.detailTiles.levelRange}
          value={levelLabel}
          tone="neutral"
        />
      ) : null}
    </div>
  );
}
