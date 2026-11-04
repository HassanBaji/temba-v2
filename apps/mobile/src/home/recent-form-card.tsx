import { spacing } from "@repo/design-tokens";
import type { RecentFormView } from "@repo/domain/home-recent-form";
import { View } from "react-native";

import { useMessages } from "../i18n/locale-provider";
import { Hairline } from "../primitives/hairline";
import { ResultMark } from "../primitives/result-mark";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { Card } from "./card";

const MARK = 16;

export function RecentFormCard({ form }: { form: RecentFormView }) {
  const m = useMessages();
  const palette = useTonePalette();
  const figures = [
    {
      key: "played",
      label: m.mobileHome.recentForm.played,
      value: form.playedCount,
    },
    { key: "won", label: m.mobileHome.recentForm.won, value: form.wins },
    { key: "lost", label: m.mobileHome.recentForm.lost, value: form.losses },
  ];

  return (
    <Card
      title={m.mobileHome.recentForm.title}
      meta={m.mobileHome.recentForm.lastTen}
    >
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 5,
          paddingHorizontal: spacing.surface,
          paddingBottom: spacing.compact,
        }}
      >
        {form.bars.map((bar, index) => (
          <ResultMark
            key={index}
            size={MARK}
            variant={bar.kind === "empty" ? "not-played" : bar.outcome}
          />
        ))}
      </View>
      <Hairline />
      <View style={{ flexDirection: "row" }}>
        {figures.map((figure, index) => (
          <View
            key={figure.key}
            accessible
            accessibilityLabel={m.mobileHome.join.labelValue(
              figure.label,
              String(figure.value),
            )}
            style={{
              flex: 1,
              minWidth: 0,
              alignItems: "center",
              gap: 4,
              paddingVertical: 16,
              borderLeftWidth: index === 0 ? 0 : 1,
              borderLeftColor: palette.rule,
            }}
          >
            <Text size="figure" width="expanded" weight="bold">
              {figure.value}
            </Text>
            <Text size="eyebrow" tone="muted">
              {figure.label}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}
