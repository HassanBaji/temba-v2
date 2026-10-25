import { CircleDot, Goal } from "lucide-react";

import { COURT_SPORT_LABELS } from "@repo/domain/court-sport-copy";
import type { Sport } from "@repo/domain/sport";

import { cn } from "~/lib/utils";

export function CourtSportBadge({
  sport,
  className,
}: {
  sport: Sport;
  className?: string;
}) {
  const Glyph = sport === "football" ? Goal : CircleDot;
  return (
    <span
      className={cn(
        "border-border text-muted-foreground rounded-xs inline-flex shrink-0 items-center gap-1 border px-[7px] py-0.5 text-[11px]",
        className,
      )}
    >
      <Glyph aria-hidden="true" className="size-3" />
      {COURT_SPORT_LABELS[sport]}
    </span>
  );
}
