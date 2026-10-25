import { spacing } from "@repo/design-tokens";
import type { FootballGameCta } from "@repo/domain/football-game-details";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { Text } from "../primitives/text";

export function FootballBar({
  cta,
  pending,
  onAction,
}: {
  cta: FootballGameCta;
  pending: boolean;
  onAction: () => void;
}) {
  const insets = useSafeAreaInsets();
  const leaving = cta.kind === "registered" || cta.kind === "waitlisted";
  return (
    <View>
      <Hairline />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingHorizontal: spacing.surface,
          paddingTop: 12,
          paddingBottom: insets.bottom + 12,
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text size="body" weight="semibold">
            {cta.title}
          </Text>
        </View>
        <Button
          label={cta.actionLabel}
          variant={leaving ? "outline" : "default"}
          pending={pending}
          onPress={onAction}
        />
      </View>
    </View>
  );
}
