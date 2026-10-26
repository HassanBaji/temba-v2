import { spacing } from "@repo/design-tokens";
import {
  recentFormRecord,
  type RecentFormView,
} from "@repo/domain/home-recent-form";
import { View } from "react-native";

import { Hairline } from "../primitives/hairline";
import { ResultMark } from "../primitives/result-mark";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { Card } from "./card";

const MARK = 16;
const MARKS_WIDTH = 150;

export function RecentFormCard({ form }: { form: RecentFormView }) {
  const palette = useTonePalette();
  const record = recentFormRecord(form);
  const figures = [
    { key: "played", label: "Played", value: form.playedCount },
    { key: "won", label: "Won", value: form.wins },
    { key: "lost", label: "Lost", value: form.losses },
  ];

  return (
    <Card title="Recent form" meta="Last 10 matches">
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          paddingHorizontal: spacing.surface,
          paddingBottom: spacing.compact,
        }}
      >
        <Text
          size="record"
          width="expanded"
          weight="bold"
          accessibilityLabel={`Record ${record}`}
        >
          {record}
        </Text>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "flex-end",
            gap: 5,
            maxWidth: MARKS_WIDTH,
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
      </View>
      <Hairline />
      <View style={{ flexDirection: "row" }}>
        {figures.map((figure, index) => (
          <View
            key={figure.key}
            accessible
            accessibilityLabel={`${figure.label} ${figure.value}`}
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
