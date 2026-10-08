import { spacing } from "@repo/design-tokens";
import type { PlayerStreaksView } from "@repo/domain/player-profile";
import { View } from "react-native";

import { Card } from "../home/card";
import { hairline } from "../primitives/hairline-width";
import { ResultMark } from "../primitives/result-mark";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";

function Column({
  label,
  headline,
  children,
}: {
  label: string;
  headline: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={{ flex: 1, padding: spacing.surface, gap: 6 }}>
      <Text size="meta" tone="muted">
        {label}
      </Text>
      <Text size="lead" weight="semibold">
        {headline}
      </Text>
      {children}
    </View>
  );
}

export function PlayerStreaksCard({ view }: { view: PlayerStreaksView }) {
  const palette = useTonePalette();
  const best = [view.best.headline, view.best.reachedIn]
    .filter(Boolean)
    .join(", ");

  return (
    <Card title="Streaks" flush>
      <View style={{ flexDirection: "row" }}>
        <View
          accessible
          accessibilityLabel={`Current streak. ${view.current.headline}`}
          style={{ flex: 1 }}
        >
          <Column label="Current streak" headline={view.current.headline}>
            {view.current.wonMarks > 0 ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                {Array.from({ length: view.current.wonMarks }, (_, index) => (
                  <ResultMark key={index} variant="won" size={16} decorative />
                ))}
              </View>
            ) : null}
          </Column>
        </View>
        <View style={{ width: hairline, backgroundColor: palette.rule }} />
        <View
          accessible
          accessibilityLabel={`Best streak. ${best}`}
          style={{ flex: 1 }}
        >
          <Column label="Best streak" headline={view.best.headline}>
            {view.best.reachedIn ? (
              <Text size="meta" tone="muted">
                {view.best.reachedIn}
              </Text>
            ) : null}
          </Column>
        </View>
      </View>
    </Card>
  );
}
