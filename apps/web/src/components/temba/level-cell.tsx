import { levelCellView } from "@repo/domain/group-home-chrome";
import type { LevelBand } from "@repo/domain/level-bands";
import { cn } from "~/lib/utils";

/**
 * The Level column on the Standing and Members tabs: the member's Level band
 * label, or a hatched block when there is no settled band to show.
 *
 * With a `level`, the label reads "C+ 3.8", and a Provisional member shows it
 * on the hatch. Without one (the Standing tab), a Provisional member is a bare
 * hatch. Hatched means the Rating is still **Provisional**
 * (`isProvisional(phi)`, ADR-0009), or the member has no `ratings` row for the
 * Group's sport. It is not a match-count rule.
 *
 * Distinct from `LevelBandBadge`, which is the badge form used elsewhere.
 */
export function LevelCell({
  band,
  level,
  provisional = false,
  onInk = false,
  className,
}: {
  /** `null` when the member has no Rating for the Group's sport. */
  band: LevelBand | null | undefined;
  /** The one-decimal Level. Shown beside the letter when given. */
  level?: string | null;
  provisional?: boolean;
  /** Set on an inverted (`bg-ink`) row so the hatch reads on black. */
  onInk?: boolean;
  className?: string;
}) {
  const view = levelCellView(band, provisional);
  const text =
    view.label && level ? `${view.label} ${level}` : (view.label ?? null);

  if (view.kind === "provisional") {
    const hatchText = level ? text : null;
    return (
      <span
        data-slot="level-cell"
        data-provisional="true"
        className={cn("flex items-center justify-end", className)}
      >
        <span
          aria-hidden="true"
          className={cn(
            "flex h-5 items-center justify-center rounded-[4px]",
            hatchText ? "text-meta px-1.5 font-semibold" : "w-11",
            onInk ? "hatch hatch-on-ink" : "hatch",
          )}
        >
          {hatchText}
        </span>
        <span className="sr-only">
          {hatchText
            ? `Level ${hatchText}, still Provisional`
            : "Level still Provisional"}
        </span>
      </span>
    );
  }

  return (
    <span
      data-slot="level-cell"
      className={cn("font-expanded text-lead block text-right", className)}
    >
      {text}
    </span>
  );
}
