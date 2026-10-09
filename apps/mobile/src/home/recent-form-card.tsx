import { spacing } from "@repo/design-tokens";
import {
  recentFormRecord,
  recentFormStatus,
  recentFormWinRateCopy,
  type RecentFormView,
} from "@repo/domain/home-recent-form";
import { View } from "react-native";

import { FormSlot } from "../primitives/form-slot";
import { Text } from "../primitives/text";
import { Card } from "./card";

export function RecentFormCard({ form }: { form: RecentFormView }) {
  const winRate = recentFormWinRateCopy(form);

  return (
    <Card title="Recent form" meta="Last 10 matches">
      <View
        style={{
          paddingHorizontal: spacing.surface,
          paddingBottom: spacing.surface,
          gap: 16,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <View style={{ gap: 4 }}>
            <Text size="record" width="expanded" weight="bold">
              {recentFormRecord(form)}
            </Text>
            <Text size="meta" tone="muted">
              {recentFormStatus(form)}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end", gap: 4 }}>
            <Text size="figure" width="expanded" weight="bold">
              {winRate.value}
            </Text>
            <Text size="meta" tone="muted">
              {winRate.caption}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 4 }}>
          {form.bars.map((bar, index) =>
            bar.kind === "empty" ? (
              <FormSlot key={`empty-${index}`} variant="not-played" />
            ) : (
              <FormSlot
                key={`${bar.label}-${index}`}
                variant={bar.outcome}
                label={bar.label}
              />
            ),
          )}
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text size="meta" tone="muted">
            Most recent
          </Text>
          <Text size="meta" tone="muted">
            Oldest
          </Text>
        </View>
      </View>
    </Card>
  );
}
