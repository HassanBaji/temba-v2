import {
  seriesBadgeCount,
  seriesBadgeHex,
  seriesBadgeSizes,
  seriesBadgeToneColors,
  seriesBadgeViewBox,
  seriesEmblems,
  type SeriesBadgeSize,
  type SeriesBadgeSurface,
} from "@repo/design-tokens/series";
import type { SeriesColour, SeriesEmblem } from "@repo/domain/series";
import { View } from "react-native";
import Svg, { Polygon } from "react-native-svg";

import { CoinShape } from "../marks/mark-coin";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";

export type SeriesBadgeProps = {
  emblem: SeriesEmblem;
  colour: SeriesColour;
  size: SeriesBadgeSize;
  /** The player's wins of this series, in a pill on the bottom trailing corner. */
  count?: number;
  /** The Color role of the surface under the badge; the count's ring takes it. */
  surface?: SeriesBadgeSurface;
};

/** A Series badge. Decorative: the text beside it names the series. */
export function SeriesBadge({
  emblem,
  colour,
  size,
  count,
  surface = "paper",
}: SeriesBadgeProps) {
  const colors = useColors();
  const px = seriesBadgeSizes[size];
  const tones = seriesBadgeToneColors(colour);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      style={{ width: px, height: px }}
    >
      <Svg
        width={px}
        height={px}
        viewBox={`0 0 ${seriesBadgeViewBox} ${seriesBadgeViewBox}`}
      >
        <Polygon {...seriesBadgeHex} fill={tones.disc} stroke={tones.disc} />
        {seriesEmblems[emblem].map((element, index) => (
          <CoinShape
            key={index}
            element={element}
            colour={tones[element.tone]}
          />
        ))}
      </Svg>
      {count === undefined ? null : (
        <View
          style={{
            position: "absolute",
            end: -seriesBadgeCount.offsetEnd,
            bottom: -seriesBadgeCount.offsetBottom,
            minWidth: seriesBadgeCount.minWidth,
            height: seriesBadgeCount.height,
            paddingHorizontal: seriesBadgeCount.paddingInline,
            borderRadius: seriesBadgeCount.radius,
            borderWidth: seriesBadgeCount.ring,
            borderColor: colors[surface],
            backgroundColor: colors.ink,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            size="eyebrow"
            weight="semibold"
            ltr
            style={{
              color: colors.paper,
              fontSize: seriesBadgeCount.fontSize,
              lineHeight: seriesBadgeCount.height - seriesBadgeCount.ring * 2,
            }}
          >
            {count}
          </Text>
        </View>
      )}
    </View>
  );
}
