import { spacing } from "@repo/design-tokens";
import type { PlayerStreaksView } from "@repo/domain/player-profile";
import { View } from "react-native";

import { Card } from "../home/card";
import { useMessages } from "../i18n/locale-provider";
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
  const m = useMessages().mobilePlayer.profile;
  const palette = useTonePalette();

  return (
    <Card title={m.streaks} flush>
      <View style={{ flexDirection: "row" }}>
        <View
          accessible
          accessibilityLabel={m.currentStreakSpoken(view.current.headline)}
          style={{ flex: 1 }}
        >
          <Column label={m.currentStreak} headline={view.current.headline}>
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
          accessibilityLabel={m.bestStreakSpoken(
            view.best.headline,
            view.best.reachedIn,
          )}
          style={{ flex: 1 }}
        >
          <Column label={m.bestStreak} headline={view.best.headline}>
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
