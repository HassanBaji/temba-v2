import { spacing } from "@repo/design-tokens";
import type { SurfaceTone } from "@repo/domain/surface-tone";
import { View } from "react-native";

import { useLightStatusBar } from "../create-game/step-shell";
import type { footballHeroLines } from "@repo/domain/football-board";
import { useMessages } from "../i18n/locale-provider";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { ScreenHeader } from "../primitives/screen-header";
import { Surface } from "../primitives/surface";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { ChallengeTag } from "./challenge-tag";
import { HeroTopLine } from "./hero-top-line";

const HERO_PADDING_BOTTOM = 22;
const SEAT_HEIGHT = 24;
const NAV_TO_STATUS_GAP = 24;
const GAMES_FALLBACK = "/games";

function LightStatusBar() {
  useLightStatusBar();
  return null;
}

/** One square per side seat: filled when taken, hatched while open. */
export function SeatBar({ seats, filled }: { seats: number; filled: number }) {
  const palette = useTonePalette();
  const m = useMessages();
  return (
    <View
      accessible
      accessibilityLabel={m.mobileGameDetails.football.seatsTaken(
        Math.min(filled, seats),
        seats,
      )}
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
  tag,
  actions,
  children,
}: {
  tone: SurfaceTone;
  lines: ReturnType<typeof footballHeroLines>;
  /** "Challenge" on a Challenge Game: beside share, its format moved to the sub line. */
  tag?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const m = useMessages();
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
      <View style={{ gap: spacing.compact }}>
        <View style={{ gap: NAV_TO_STATUS_GAP }}>
          <ScreenHeader
            nav="back"
            fallback={GAMES_FALLBACK}
            actions={
              tag ? (
                <>
                  <ChallengeTag label={tag} />
                  {actions}
                </>
              ) : (
                actions
              )
            }
          />
          <View style={{ gap: 6 }}>
            <HeroTopLine
              left={lines.status}
              right={
                !tag && lines.sizeTag ? (
                  <Text size="eyebrow" tone="muted" mono>
                    {lines.sizeTag}
                  </Text>
                ) : null
              }
            />
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
                {m.mobileGameDetails.hero.timeUnset}
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
        </View>
        {children}
      </View>
    </Surface>
  );
}
