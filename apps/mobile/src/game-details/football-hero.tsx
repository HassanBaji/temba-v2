import { spacing } from "@repo/design-tokens";
import type { SurfaceTone } from "@repo/domain/surface-tone";
import type { Href } from "expo-router";
import { View } from "react-native";

import { useLightStatusBar } from "../create-game/step-shell";
import type { footballHeroLines } from "@repo/domain/football-board";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { ScreenHeader } from "../primitives/screen-header";
import { Surface } from "../primitives/surface";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";

const HERO_PADDING_BOTTOM = 22;
const SEAT_HEIGHT = 24;

function LightStatusBar() {
  useLightStatusBar();
  return null;
}

/** One square per side seat: filled when taken, hatched while open. */
export function SeatBar({ seats, filled }: { seats: number; filled: number }) {
  const palette = useTonePalette();
  return (
    <View
      accessible
      accessibilityLabel={`${Math.min(filled, seats)} of ${seats} seats taken`}
      style={{ flexDirection: "row", gap: 3 }}
    >
      {Array.from({ length: seats }, (_, index) => (
        <View key={index} style={{ flex: 1, height: SEAT_HEIGHT }}>
          {index < filled ? (
            <View
              style={{
                flex: 1,
                borderRadius: 3,
                backgroundColor: palette.foreground,
              }}
            />
          ) : (
            <Hatch radius={3} />
          )}
        </View>
      ))}
    </View>
  );
}

/**
 * The full-bleed head of a football Game: status, kick-off time, the day and
 * pitch, then whatever the Game shows next (the pool or the two teams).
 */
export function FootballHero({
  tone,
  lines,
  fallback,
  actions,
  children,
}: {
  tone: SurfaceTone;
  lines: ReturnType<typeof footballHeroLines>;
  fallback: Href;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <Surface
      tone={tone}
      style={{
        paddingTop: spacing.compact,
        paddingBottom: HERO_PADDING_BOTTOM,
        borderRadius: 0,
        borderWidth: 0,
        borderBottomWidth: tone === "paper" ? hairline : 0,
      }}
    >
      {tone === "ink" ? <LightStatusBar /> : null}
      <ScreenHeader nav="back" fallback={fallback} actions={actions}>
        <View style={{ gap: spacing.compact }}>
          <View style={{ gap: 6 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <Text
                size="meta"
                tone="muted"
                numberOfLines={1}
                style={{ flexShrink: 1 }}
              >
                {lines.status}
              </Text>
              {lines.sizeTag ? (
                <Text size="eyebrow" tone="muted" mono>
                  {lines.sizeTag}
                </Text>
              ) : null}
            </View>
            {lines.time ? (
              <View
                accessible
                accessibilityLabel={`${lines.time} ${lines.meridiem ?? ""}`}
                style={{
                  flexDirection: "row",
                  alignItems: "baseline",
                  columnGap: 8,
                }}
              >
                <Text size="heroTime" width="expanded" weight="bold">
                  {lines.time}
                </Text>
                {lines.meridiem ? (
                  <Text size="title" tone="muted">
                    {lines.meridiem}
                  </Text>
                ) : null}
              </View>
            ) : (
              <Text size="display" width="expanded" weight="bold">
                Time unset
              </Text>
            )}
            <View>
              {lines.dayLine ? (
                <Text size="lead" weight="semibold">
                  {lines.dayLine}
                </Text>
              ) : null}
              {lines.subLine ? (
                <Text size="meta" tone="muted">
                  {lines.subLine}
                </Text>
              ) : null}
            </View>
          </View>
          {children}
        </View>
      </ScreenHeader>
    </Surface>
  );
}
