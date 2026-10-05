import type { LevelRangeRequestCard } from "@repo/domain/level-range-request";
import { View } from "react-native";

import { Button } from "../primitives/button";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";

export function LevelRequestCard({
  card,
  pending,
  onRequest,
}: {
  card: LevelRangeRequestCard;
  pending: boolean;
  onRequest: () => void;
}) {
  return (
    <Surface style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text size="lead" weight="semibold" accessibilityRole="header">
          {card.title}
        </Text>
        {card.badge ? (
          <Text size="eyebrow" weight="medium" tone="muted" uppercase>
            {card.badge}
          </Text>
        ) : null}
      </View>
      <Text size="meta" tone="muted">
        {card.copy}
      </Text>
      {card.actionLabel ? (
        <View style={{ flexDirection: "row" }}>
          <Button
            label={pending ? "Requesting…" : card.actionLabel}
            variant="outline"
            disabled={!card.actionEnabled}
            pending={pending}
            onPress={onRequest}
          />
        </View>
      ) : null}
    </Surface>
  );
}
