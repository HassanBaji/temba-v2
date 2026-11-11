import { spacing } from "@repo/design-tokens";
import type { FriendlyGameDetailsRatingImpact } from "@repo/domain/friendly-game-details";
import {
  ratingImpactView,
  ratingScopeNotice,
} from "@repo/domain/game-rating-impact";
import type { GameRatingScope } from "@repo/domain/game-rating-scope";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react-native";
import { View } from "react-native";

import { Card } from "../home/card";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { mirrorInRtl } from "../i18n/rtl";
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
  const m = useMessages();
  const locale = useLocale();
  const copy = m.mobileGameDetails.rating;
  const { direction, magnitude, newLevelLabel, sentence, directionText } =
    ratingImpactView(ratingImpact, locale);
  const Icon = ICONS[direction];

  return (
    <Card title={copy.title}>
      <Hairline />
      <View style={{ padding: spacing.surface, gap: 16 }}>
        <View style={{ flexDirection: "row", gap: 24 }}>
          <View
            accessible
            accessibilityLabel={copy.changeLabel(directionText)}
            style={{ gap: 4 }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <Icon size={20} color={palette.foreground} style={mirrorInRtl} />
              <Text size="figure" width="expanded" weight="bold">
                {magnitude}
              </Text>
            </View>
            <Text size="meta" tone="muted">
              {copy.change}
            </Text>
          </View>
          <View
            accessible
            accessibilityLabel={copy.newLevelLabel(newLevelLabel)}
            style={{ gap: 4 }}
          >
            <Text size="figure" width="expanded" weight="bold">
              {newLevelLabel}
            </Text>
            <Text size="meta" tone="muted">
              {copy.newLevel}
            </Text>
          </View>
        </View>
        <Text size="meta">{sentence}</Text>
      </View>
    </Card>
  );
}

export function RatingScopeCard({
  scope,
  sport,
}: {
  scope: GameRatingScope;
  sport?: string | null;
}) {
  const locale = useLocale();
  const notice = ratingScopeNotice(scope, locale, sport);
  if (!notice) {
    return null;
  }
  return (
    <Card title={notice.title}>
      <View
        style={{
          paddingHorizontal: spacing.surface,
          paddingBottom: spacing.surface,
        }}
      >
        <Text size="meta" tone="muted">
          {notice.line}
        </Text>
      </View>
    </Card>
  );
}
