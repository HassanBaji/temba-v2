import { displayLabelFromStoredBand, type LevelBand } from "~/lib/level-bands";
import { cn } from "~/lib/utils";

/**
 * The Level column on the Standing and Members tabs: the member's Level band
 * label, or a hatched block when there is no settled band to show.
 *
 * Hatched means the Rating is still **Provisional** (`isProvisional(phi)`,
 * ADR-0009), or the member has no `ratings` row for the Group's sport. It is
 * not a match-count rule.
 *
 * Distinct from `LevelBandBadge`, which is the badge form used elsewhere.
 */
export function LevelCell({
  band,
  provisional = false,
  className,
}: {
  /** `null` when the member has no Rating for the Group's sport. */
  band: LevelBand | null | undefined;
  provisional?: boolean;
  className?: string;
}) {
  if (!band || provisional) {
    return (
      <span
        data-slot="level-cell"
        data-provisional="true"
        className={cn("flex items-center justify-end", className)}
      >
        <span aria-hidden="true" className="hatch h-5 w-11 rounded-[4px]" />
        <span className="sr-only">Level still Provisional</span>
      </span>
    );
  }

  return (
    <span
      data-slot="level-cell"
      className={cn("font-expanded block text-right text-[17px]", className)}
    >
      {displayLabelFromStoredBand(band)}
    </span>
  );
}
