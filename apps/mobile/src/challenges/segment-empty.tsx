import { radii, spacing } from "@repo/design-tokens";
import { View } from "react-native";

import { useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { Hatch } from "../primitives/hatch";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";

const CREST = 40;

/** Open and Mine before anything can be posted: a hatched card where Challenges will list. */
export function SegmentEmpty({
  segment,
  onGoToTeams,
}: {
  segment: "open" | "mine";
  onGoToTeams: () => void;
}) {
  const m = useMessages();
  const copy = m.challenge[segment];
  return (
    <View style={{ gap: spacing.compact }}>
      <Surface style={{ gap: spacing.compact }}>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
        >
          <View style={{ width: CREST, height: CREST }}>
            <Hatch radius={radii.md} />
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <View style={{ height: 12 }}>
              <Hatch />
            </View>
            <View style={{ height: 12, width: "60%" }}>
              <Hatch />
            </View>
          </View>
        </View>
        <View style={{ gap: 8 }}>
          <Text size="title" weight="semibold" accessibilityRole="header">
            {copy.emptyTitle}
          </Text>
          <Text tone="muted">{copy.emptyCopy}</Text>
          <Text tone="muted">{copy.untilThen}</Text>
        </View>
      </Surface>
      <Button
        label={m.challenge.goToTeams}
        size="lg"
        variant="outline"
        onPress={onGoToTeams}
      />
    </View>
  );
}
