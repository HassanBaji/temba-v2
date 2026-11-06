import { radii, spacing } from "@repo/design-tokens";
import type { ProfileLevelView } from "@repo/domain/player-profile-page";
import type { SportSwitchOption } from "@repo/domain/player-profile-page";
import type { Sport } from "@repo/domain/sport";
import type { Href } from "expo-router";
import { Pressable, View } from "react-native";

import { useLightStatusBar } from "../create-game/step-shell";
import { useMessages } from "../i18n/locale-provider";
import { Avatar } from "../primitives/avatar";
import { hairline } from "../primitives/hairline-width";
import { MountFill } from "../primitives/mount-fill";
import { ScreenHeader } from "../primitives/screen-header";
import { Surface } from "../primitives/surface";
import {
  SurfaceToneContext,
  useTonePalette,
} from "../primitives/surface-context";
import { Text } from "../primitives/text";

const SEGMENT_HEIGHT = 50;
const SWITCH_INSET = 3;

function LightStatusBar() {
  useLightStatusBar();
  return null;
}

function SportSwitch({
  options,
  onSelect,
}: {
  options: SportSwitchOption[];
  onSelect: (sport: Sport) => void;
}) {
  const m = useMessages();
  const palette = useTonePalette();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={m.mobilePlayer.lib.sport}
      style={{
        flexDirection: "row",
        gap: SWITCH_INSET,
        padding: SWITCH_INSET,
        borderRadius: radii.lg,
        borderWidth: hairline,
        borderColor: palette.rule,
      }}
    >
      {options.map((option) => (
        <SurfaceToneContext.Provider
          key={option.sport}
          value={option.selected ? "paper" : "ink"}
        >
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: option.selected }}
            accessibilityLabel={
              option.meta ? `${option.name}, ${option.meta}` : option.name
            }
            onPress={() => onSelect(option.sport)}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: SEGMENT_HEIGHT,
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              borderRadius: radii.lg - SWITCH_INSET,
              backgroundColor: option.selected
                ? palette.foreground
                : "transparent",
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text
              size="meta"
              weight="semibold"
              tone={option.selected ? "default" : "muted"}
            >
              {option.name}
            </Text>
            {option.meta ? (
              <Text size="eyebrow" tone="muted">
                {option.meta}
              </Text>
            ) : null}
          </Pressable>
        </SurfaceToneContext.Provider>
      ))}
    </View>
  );
}

function LevelBlock({ view }: { view: ProfileLevelView }) {
  const palette = useTonePalette();
  const frame = {
    borderRadius: radii.surface,
    borderWidth: hairline,
    borderColor: palette.rule,
    padding: spacing.compact,
  };

  if (view.kind === "none") {
    return (
      <View
        accessible
        accessibilityLabel={view.spoken}
        style={[frame, { gap: 6 }]}
      >
        <Text size="eyebrow" tone="muted">
          {view.label}
        </Text>
        <Text size="h2" width="expanded" weight="bold">
          {view.value}
        </Text>
      </View>
    );
  }

  return (
    <View accessible accessibilityLabel={view.spoken} style={frame}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Text size="eyebrow" tone="muted">
          {view.label}
        </Text>
        <View style={{ alignItems: "flex-end", gap: 2, flexShrink: 1 }}>
          <Text size="meta" weight="semibold">
            {view.status}
          </Text>
          <Text size="eyebrow" tone="muted" numberOfLines={1}>
            {view.statusDetail}
          </Text>
        </View>
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "baseline",
          gap: 14,
          marginTop: 6,
        }}
      >
        <Text size="record" width="expanded" weight="bold" ltr>
          {view.band}
        </Text>
        <Text size="h1" width="expanded" weight="bold">
          {view.level}
        </Text>
        {view.trend ? (
          <Text
            size="meta"
            weight="semibold"
            numberOfLines={1}
            style={{ marginStart: "auto", flexShrink: 1 }}
          >
            {view.trend}
          </Text>
        ) : null}
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 10,
          marginTop: 16,
          marginBottom: 10,
        }}
      >
        <Text size="meta" weight="semibold" style={{ flexShrink: 1 }}>
          {view.lead}
        </Text>
        {view.trail ? (
          <Text size="eyebrow" tone="muted">
            {view.trail}
          </Text>
        ) : null}
      </View>
      <MountFill percent={view.percent} hatched={view.hatched} />
    </View>
  );
}

/**
 * The black hero: who the player is, which sport the page reads, and their
 * Level in it. Edge to edge, under the status bar.
 */
export function ProfileHero({
  name,
  imageUri,
  subtitle,
  switchOptions,
  onSelectSport,
  level,
  fallback,
}: {
  name: string;
  imageUri: string | null;
  subtitle: string | null;
  switchOptions: SportSwitchOption[] | null;
  onSelectSport: (sport: Sport) => void;
  level: ProfileLevelView;
  fallback: Href;
}) {
  return (
    <Surface
      tone="ink"
      style={{
        borderRadius: 0,
        borderWidth: 0,
        paddingTop: spacing.compact,
        gap: 20,
      }}
    >
      <LightStatusBar />
      <ScreenHeader nav="back" fallback={fallback} />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        <SurfaceToneContext.Provider value="paper">
          <Avatar name={name} uri={imageUri} size="xl" radius={radii.surface} />
        </SurfaceToneContext.Provider>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Text
            size="h1"
            weight="bold"
            numberOfLines={2}
            accessibilityRole="header"
          >
            {name}
          </Text>
          {subtitle ? (
            <Text size="meta" tone="muted" numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {switchOptions ? (
        <SportSwitch options={switchOptions} onSelect={onSelectSport} />
      ) : null}
      <LevelBlock view={level} />
    </Surface>
  );
}
