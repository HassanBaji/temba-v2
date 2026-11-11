import {
  fishGlyphs,
  fishSizes,
  type FishBand,
  type FishSize,
} from "@repo/design-tokens/fish";
import type { GroupMemberTierCell } from "@repo/domain/group-members-table";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { Hatch } from "../primitives/hatch";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";

/** A Tier band's fish. `cutout` is the colour behind it, for the Shark's eye. */
export function TierFish({
  band,
  label,
  size = "row",
  cutout,
}: {
  band: FishBand;
  label: string;
  size?: FishSize;
  cutout?: string;
}) {
  const colors = useColors();
  const glyph = fishGlyphs[band];
  const { width, height } = fishSizes[size];
  const behind = cutout ?? colors.paper;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label}>
      <Svg width={width} height={height} viewBox={glyph.viewBox}>
        <Path d={glyph.body} fill={colors.ink} />
        {glyph.cutouts.map((part) =>
          part.paint === "fill" ? (
            <Path key={part.d} d={part.d} fill={behind} />
          ) : (
            <Path
              key={part.d}
              d={part.d}
              fill="none"
              stroke={behind}
              strokeWidth={part.strokeWidth}
              strokeLinecap="round"
            />
          ),
        )}
      </Svg>
    </View>
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
      <Text size="meta" weight="semibold" mono>
        {cell.label}
      </Text>
    );
  }
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={cell.label}
      style={{ width, height }}
    >
      <Hatch />
    </View>
  );
}
