"use client";

import { formatBookingPriceFils } from "@repo/domain/price-per-player";
import { useLocale, useMessages } from "~/components/locale-provider";

import type { ScheduleStats } from "./booking-model";

export function ScheduleStatLine({
  stats,
  takenLabel,
}: {
  stats: ScheduleStats;
  takenLabel: string;
}) {
  const m = useMessages().consoleSchedule.stats;
  const locale = useLocale();
  return (
    <p className="text-muted-foreground flex items-center gap-7 text-[13px]">
      <span>
        <Figure>{stats.bookings}</Figure> {m.bookingsNoun(stats.bookings)}
      </span>
      {stats.occupiedPercent !== null ? (
        <span>
          <Figure>{stats.occupiedPercent}%</Figure> {m.occupied}
        </span>
      ) : null}
      <span>
        <Figure>{formatBookingPriceFils(stats.takenFils, locale)}</Figure>{" "}
        {takenLabel}
      </span>
    </p>
  );
}

function Figure({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-ink font-semibold tabular-nums">{children}</span>
  );
}
