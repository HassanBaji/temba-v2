import { radii, sizes, spacing } from "@repo/design-tokens";
import type { Sport } from "@repo/domain/sport";
import { ChevronRight } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { useMessages } from "../i18n/locale-provider";
import { mirrorInRtl } from "../i18n/rtl";
import { Hatch } from "../primitives/hatch";
import { hairline } from "../primitives/hairline-width";
import { Surface } from "../primitives/surface";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { LAST_TEN } from "./profile-model";

const SETUP_MINUTES: Record<Sport, number> = { padel: 2, football: 1 };

function SetupRow({
  title,
  sub,
  minutes,
  onPress,
}: {
  title: string;
  sub: string;
  minutes: string;
  onPress: () => void;
}) {
  const palette = useTonePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${sub}. ${minutes}`}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: sizes.touchTarget,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: radii.lg,
        borderWidth: hairline,
        borderColor: palette.rule,
        backgroundColor: pressed ? palette.wash : palette.background,
      })}
    >
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text size="lead" weight="semibold">
          {title}
        </Text>
        <Text size="eyebrow" tone="muted">
          {sub}
        </Text>
      </View>
      <Text size="eyebrow" tone="muted">
        {minutes}
      </Text>
      <ChevronRight
        size={sizes.iconRow}
        color={palette.foreground}
        style={mirrorInRtl}
      />
    </Pressable>
  );
}

function Preview() {
  const m = useMessages();
  return (
    <View
      style={{ gap: 10 }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text size="meta" tone="muted">
        {m.you.setup.preview}
      </Text>
      <Surface radius="card" style={{ gap: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View style={{ width: 52, height: 52 }}>
            <Hatch radius={26} />
          </View>
          <View style={{ flex: 1, gap: 8 }}>
            <View style={{ height: 10, width: "70%" }}>
              <Hatch radius={5} />
            </View>
            <View style={{ height: 8, width: "45%" }}>
              <Hatch radius={4} />
            </View>
          </View>
        </View>
        <View style={{ height: 48 }}>
          <Hatch radius={radii.sm} />
        </View>
        <View style={{ flexDirection: "row", gap: 4 }}>
          {Array.from({ length: LAST_TEN }, (_, index) => (
            <View key={index} style={{ flex: 1, height: 26 }}>
              <Hatch radius={4} />
            </View>
          ))}
        </View>
      </Surface>
    </View>
  );
}

/** No sport yet: the one ink focus asks the User to set one up. */
export function SetupSportCard({
  onSetUp,
}: {
  onSetUp: (sport: Sport) => void;
}) {
  const m = useMessages();
  const setup = m.you.setup;
  return (
    <View style={{ gap: spacing.section }}>
      <Surface tone="ink" style={{ gap: spacing.compact }}>
        <View style={{ gap: 8 }}>
          <Text size="h2" weight="bold" accessibilityRole="header">
            {setup.title}
          </Text>
          <Text size="meta" tone="muted">
            {setup.body}
          </Text>
        </View>
        <View style={{ gap: 8 }}>
          <SetupRow
            title={setup.padel}
            sub={setup.padelSub}
            minutes={setup.minutes(SETUP_MINUTES.padel)}
            onPress={() => onSetUp("padel")}
          />
          <SetupRow
            title={setup.football}
            sub={setup.footballSub}
            minutes={setup.minutes(SETUP_MINUTES.football)}
            onPress={() => onSetUp("football")}
          />
        </View>
      </Surface>
      <Preview />
    </View>
  );
}
