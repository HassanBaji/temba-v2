import { spacing } from "@repo/design-tokens";
import type { RecentFormView } from "@repo/domain/home-recent-form";
import { View } from "react-native";

import { Card } from "../home/card";
import { FormSlot } from "../primitives/form-slot";

export function ProfileFormCard({ form }: { form: RecentFormView }) {
  return (
    <Card title="Recent form" meta="Last 10 matches">
      <View
        style={{
          flexDirection: "row",
          gap: 6,
          paddingHorizontal: spacing.surface,
          paddingBottom: spacing.surface,
        }}
      >
        {form.bars.map((bar, index) =>
          bar.kind === "empty" ? (
            <FormSlot key={`empty-${index}`} variant="not-played" compact />
          ) : (
            <FormSlot
              key={`${bar.label}-${index}`}
              variant={bar.outcome}
              label={bar.label}
              compact
            />
          ),
        )}
      </View>
    </Card>
  );
}
