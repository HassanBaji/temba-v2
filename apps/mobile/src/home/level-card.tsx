import { sizes, spacing } from "@repo/design-tokens";
import { homeLevelView, type HomeLevelInput } from "@repo/domain/home-level";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react-native";
import { View } from "react-native";

import { Hairline } from "../primitives/hairline";
import { Hatch } from "../primitives/hatch";
import { MountFill } from "../primitives/mount-fill";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { Card } from "./card";

const CHANGE_ICONS = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  none: ArrowRight,
} as const;

const SWATCH = 12;

function Swatch({ provisional }: { provisional: boolean }) {
  const palette = useTonePalette();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: SWATCH,
        height: SWATCH,
        backgroundColor: provisional ? undefined : palette.foreground,
      }}
    >
      {provisional ? <Hatch radius={2} /> : null}
    </View>
  );
}

export function LevelCard({ input }: { input: HomeLevelInput }) {
  const palette = useTonePalette();
  const view = homeLevelView(input);
  const ChangeIcon = view.change ? CHANGE_ICONS[view.change.direction] : null;

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
          accessibilityLabel={`Level band ${view.displayBand}`}
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
          {view.change && ChangeIcon ? (
            <View
              accessible
              accessibilityLabel={`${view.change.spoken} ${view.change.amount}, ${view.change.windowLabel}`}
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <ChangeIcon size={sizes.iconAction} color={palette.foreground} />
              <Text size="h2" width="expanded" weight="bold">
                {view.change.amount}
              </Text>
              <Text size="meta" tone="muted" numberOfLines={1}>
                {view.change.windowLabel}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      <Hairline />
      {view.progress ? (
        <View style={{ padding: spacing.surface, gap: 8 }}>
          <Text size="meta" tone="muted">
            {view.progress.label}
          </Text>
          <MountFill
            percent={view.progress.percent}
            hatched={view.provisional}
          />
        </View>
      ) : (
        <View
          style={{ paddingHorizontal: spacing.surface, paddingVertical: 12 }}
        >
          <Text size="meta">Top Level band</Text>
        </View>
      )}
      <Hairline />
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 8,
          paddingHorizontal: spacing.surface,
          paddingVertical: 12,
        }}
      >
        <View style={{ paddingTop: 3 }}>
          <Swatch provisional={view.provisional} />
        </View>
        <Text size="meta" style={{ flex: 1 }}>
          <Text size="meta" weight="semibold">
            {view.legend.lead}
          </Text>
          {view.legend.rest}
        </Text>
      </View>
    </Card>
  );
}
