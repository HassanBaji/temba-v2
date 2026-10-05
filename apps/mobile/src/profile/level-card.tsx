import { spacing } from "@repo/design-tokens";
import {
  profileLevelView,
  type ProfileLevelInput,
} from "@repo/domain/profile-level";
import { View } from "react-native";

import { Card } from "../home/card";
import { Hairline } from "../primitives/hairline";
import { MountFill } from "../primitives/mount-fill";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";

const MOVEMENT_WORD = { up: "Up", down: "Down", held: "Held" } as const;

export function ProfileLevelCard({ input }: { input: ProfileLevelInput }) {
  const palette = useTonePalette();
  const view = profileLevelView(input);

  return (
    <Card title="Level" meta="Padel">
      <View
        style={{
          flexDirection: "row",
          alignItems: "stretch",
          gap: 16,
          paddingHorizontal: spacing.surface,
          paddingBottom: spacing.surface,
        }}
      >
        <Text
          size="levelBand"
          width="expanded"
          weight="bold"
          accessibilityLabel={`Level band ${view.displayBand}, Level ${view.level}`}
        >
          {view.displayBand}
        </Text>
        <View style={{ width: 1, backgroundColor: palette.rule }} />
        <View
          style={{ flex: 1, minWidth: 0, justifyContent: "center", gap: 4 }}
        >
          <View
            style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}
          >
            <Text size="h2" width="expanded" weight="bold">
              {view.level}
            </Text>
            <Text size="meta" tone="muted">
              Level
            </Text>
          </View>
          {view.movement ? (
            <Text size="meta" tone="muted">
              {MOVEMENT_WORD[view.movement]} since the last match
            </Text>
          ) : null}
        </View>
      </View>
      <Hairline />
      <View style={{ padding: spacing.surface, gap: 8 }}>
        <Text size="meta" tone="muted">
          {view.caption}
        </Text>
        {view.atTopBand ? null : (
          <MountFill percent={view.fillPercent} hatched={view.provisional} />
        )}
      </View>
    </Card>
  );
}
