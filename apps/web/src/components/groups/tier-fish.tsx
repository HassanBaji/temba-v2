import {
  fishGlyphs,
  fishSizes,
  type FishBand,
  type FishSize,
} from "@repo/design-tokens/fish";
import type { GroupMemberTierCell } from "@repo/domain/group-members-table";

import { Hatch } from "~/components/ui/hatch";
import { cn } from "~/lib/utils";

/** A Tier band's fish. `cutout` is the colour behind it, for the Shark's eye. */
export function TierFish({
  band,
  label,
  size = "row",
  cutout = "var(--color-paper)",
  className,
}: {
  band: FishBand;
  label: string;
  size?: FishSize;
  cutout?: string;
  className?: string;
}) {
  const glyph = fishGlyphs[band];
  const { width, height } = fishSizes[size];
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={glyph.viewBox}
      width={width}
      height={height}
      className={cn("text-ink block shrink-0", className)}
    >
      <path d={glyph.body} fill="currentColor" />
      {glyph.cutouts.map((part) =>
        part.paint === "fill" ? (
          <path key={part.d} d={part.d} fill={cutout} />
        ) : (
          <path
            key={part.d}
            d={part.d}
            fill="none"
            stroke={cutout}
            strokeWidth={part.strokeWidth}
            strokeLinecap="round"
          />
        ),
      )}
    </svg>
  );
}

/** The Tier column of a Members row: a fish, a place, or "not yet". */
export function TierCell({ cell }: { cell: GroupMemberTierCell }) {
  const { width, height } = fishSizes.row;
  if (cell.kind === "fish") {
    return <TierFish band={cell.band} label={cell.label} />;
  }
  if (cell.kind === "place") {
    return (
      <span className="text-meta font-mono font-semibold">{cell.label}</span>
    );
  }
  return (
    <span role="img" aria-label={cell.label} className="block shrink-0">
      <Hatch radius="sm" className="block" style={{ width, height }} />
    </span>
  );
}
