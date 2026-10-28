import { formatBookingPriceFils } from "@repo/domain/price-per-player";

import type { ScheduleStats } from "./booking-model";

export function ScheduleStatLine({
  stats,
  takenLabel,
}: {
  stats: ScheduleStats;
  takenLabel: string;
}) {
  return (
    <p className="text-muted-foreground flex items-center gap-7 text-[13px]">
      <span>
        <Figure>{stats.bookings}</Figure>{" "}
        {stats.bookings === 1 ? "booking" : "bookings"}
      </span>
      {stats.occupiedPercent !== null ? (
        <span>
          <Figure>{stats.occupiedPercent}%</Figure> occupied
        </span>
      ) : null}
      <span>
        <Figure>{formatBookingPriceFils(stats.takenFils)}</Figure> {takenLabel}
      </span>
    </p>
  );
}

function Figure({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-ink font-semibold tabular-nums">{children}</span>
  );
}
