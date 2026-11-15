import { fishGlyphs } from "../../../packages/design-tokens/src/fish";
import type { Band } from "../tiers";
import { c } from "../theme";
import { Hatch } from "./hatch";

/** A Tier band's fish (`tier-fish.tsx`); `cutout` is the colour behind it, for the Shark's eye. */
export function TierFish({
  band,
  width = 40,
  height = 24,
  cutout = c.paper,
  ink = c.ink,
}: {
  band: Band;
  width?: number;
  height?: number;
  cutout?: string;
  ink?: string;
}) {
  const glyph = fishGlyphs[band];
  return (
    <svg width={width} height={height} viewBox={glyph.viewBox} style={{ display: "block", flexShrink: 0 }}>
      <path d={glyph.body} fill={ink} />
      {glyph.cutouts.map((part) =>
        part.paint === "fill" ? (
          <path key={part.d} d={part.d} fill={cutout} />
        ) : (
          <path key={part.d} d={part.d} fill="none" stroke={cutout} strokeWidth={part.strokeWidth} strokeLinecap="round" />
        ),
      )}
    </svg>
  );
}

/** The hatched slot a Provisional member shows in place of a fish. */
export function ProvisionalSlot({ width = 40, height = 24 }: { width?: number; height?: number }) {
  return (
    <div style={{ position: "relative", width, height }}>
      <Hatch />
    </div>
  );
}
