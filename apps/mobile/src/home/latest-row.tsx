import { radii, sizes } from "@repo/design-tokens";
import { ArrowRight } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { mirrorInRtl } from "../i18n/rtl";
import { MarkCoin } from "../marks/mark-coin";
import { hairline } from "../primitives/hairline-width";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import type { LatestMark } from "./latest-model";

const ARROW_ICON = 16;

/** The newest thing that happened to the User; it opens Latest on the profile. */
export function LatestRow({
  latest,
  onPress,
}: {
  latest: LatestMark;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${latest.title}. ${latest.line}`}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: sizes.touchTarget + 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: radii.card,
        borderWidth: hairline,
        borderColor: colors.rule,
        backgroundColor: colors.paper,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <MarkCoin kind={latest.kind} size="cabinet" />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text weight="semibold" numberOfLines={1}>
          {latest.title}
        </Text>
        <Text size="eyebrow" tone="muted" numberOfLines={1}>
          {latest.line}
        </Text>
      </View>
      <ArrowRight size={ARROW_ICON} color={colors.ink} style={mirrorInRtl} />
    </Pressable>
  );
}
