import { spacing } from "@repo/design-tokens";
import type { RecentFormView } from "@repo/domain/home-recent-form";
import { View } from "react-native";

import { Card } from "../home/card";
import { useMessages } from "../i18n/locale-provider";
import { FormSlot } from "../primitives/form-slot";

export function ProfileFormCard({ form }: { form: RecentFormView }) {
  const m = useMessages();
  return (
    <Card
      title={m.mobileHome.recentForm.title}
      meta={m.mobileHome.recentForm.lastTen}
    >
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
              key={`${bar.outcome}-${index}`}
              variant={bar.outcome}
              compact
            />
          ),
        )}
      </View>
    </Card>
  );
}
