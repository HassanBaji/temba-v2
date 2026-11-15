"use client";

import { levelCellView } from "@repo/domain/group-home-chrome";
import type { LevelBand } from "@repo/domain/level-bands";
import { useMessages } from "~/components/locale-provider";
import { cn } from "~/lib/utils";

/**
 * The Level column on the Standing and Members tabs: the member's Level band
 * label, or a hatched block when there is no settled band to show.
 *
 * With a `level`, the label reads "C+ 3.8", and a Provisional member shows it
 * on the hatch. Without one (the Standing tab), a Provisional member is a bare
 * hatch. With an `ovr`, the label is the football face, the bare whole OVR
 * "72" with no band (ADR-0087), and a `level` only marks that a Provisional
 * member shows it on the hatch. Hatched means the Level is still **Provisional** (`tembaLevelView`:
 * fewer than five Rated Matches in a Verified Group on padel, five counting
 * Matches on football, and no Level override), or the member has no `ratings`
 * row for the Group's sport.
 *
 * Distinct from `LevelBandBadge`, which is the badge form used elsewhere.
 */
export function LevelCell({
  band,
  level,
  ovr,
  provisional = false,
  onInk = false,
  className,
}: {
  /** `null` when the member has no Rating for the Group's sport. */
  band: LevelBand | null | undefined;
  /** The one-decimal Level. Shown beside the letter when given. */
  level?: string | null;
  /** The football face: the label reads `72`, with no band. */
  ovr?: number | null;
  provisional?: boolean;
  /** Set on an inverted (`bg-ink`) row so the hatch reads on black. */
  onInk?: boolean;
  className?: string;
}) {
  const m = useMessages();
  const view = levelCellView(band, provisional, ovr);
  const football = ovr != null;
  const text =
    !football && view.label && level
      ? `${view.label} ${level}`
      : (view.label ?? null);

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
          dir="ltr"
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
            ? football
              ? m.rating.ovr.valueProvisional(hatchText)
              : m.webUi.levelCell.provisionalWithLevel(hatchText)
            : m.webUi.levelCell.provisional}
        </span>
      </span>
    );
  }

  return (
    <span
      data-slot="level-cell"
      className={cn("font-expanded text-lead block text-end", className)}
    >
      {football && text ? (
        <>
          <bdi dir="ltr" aria-hidden="true">
            {text}
          </bdi>
          <span className="sr-only">{m.rating.ovr.value(text)}</span>
        </>
      ) : (
        <bdi dir="ltr">{text}</bdi>
      )}
    </span>
  );
}
