import { spacing } from "@repo/design-tokens";
import type { FriendlyGameDetailsRatingImpact } from "@repo/domain/friendly-game-details";
import { ratingImpactView } from "@repo/domain/game-rating-impact";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react-native";
import { View } from "react-native";

import { Card } from "../home/card";
import { Hairline } from "../primitives/hairline";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";

const ICONS = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  flat: ArrowRight,
} as const;

export function RatingImpactCard({
  ratingImpact,
}: {
  ratingImpact: FriendlyGameDetailsRatingImpact;
}) {
  const palette = useTonePalette();
  const { direction, magnitude, newLevelLabel, sentence, directionText } =
    ratingImpactView(ratingImpact);
  const Icon = ICONS[direction];

  return (
    <Card title="Rating impact">
      <Hairline />
      <View style={{ padding: spacing.surface, gap: 16 }}>
        <View style={{ flexDirection: "row", gap: 24 }}>
          <View
            accessible
            accessibilityLabel={`${directionText}. Change`}
            style={{ gap: 4 }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <Icon size={20} color={palette.foreground} />
              <Text size="figure" width="expanded" weight="bold">
                {magnitude}
              </Text>
            </View>
            <Text size="meta" tone="muted">
              Change
            </Text>
          </View>
          <View
            accessible
            accessibilityLabel={`New level ${newLevelLabel}`}
            style={{ gap: 4 }}
          >
            <Text size="figure" width="expanded" weight="bold">
              {newLevelLabel}
            </Text>
            <Text size="meta" tone="muted">
              New level
            </Text>
          </View>
        </View>
        <Text size="meta">{sentence}</Text>
      </View>
    </Card>
  );
}
