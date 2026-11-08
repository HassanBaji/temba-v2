import { radii } from "@repo/design-tokens";
import type {
  InviteSeatCourt as InviteSeatCourtModel,
  InviteSeatTile,
} from "@repo/domain/game-invite-join-sheet";
import { Pressable, View } from "react-native";

import { useMessages } from "../i18n/locale-provider";
import { Avatar } from "../primitives/avatar";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";

const TILE_HEIGHT = 64;
const TILE_RADIUS = 10;
const TILE_GAP = 8;

function TileBody({ title, sub }: { title: string; sub: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text size="meta" weight="semibold" numberOfLines={1}>
        {title}
      </Text>
      <Text size="eyebrow" tone="muted" numberOfLines={1}>
        {sub}
      </Text>
    </View>
  );
}

function SeatTile({
  seat,
  onSit,
}: {
  seat: InviteSeatTile;
  onSit: ((seat: InviteSeatTile) => void) | null;
}) {
  const m = useMessages();
  const palette = useTonePalette();
  if (seat.occupant) {
    return (
      <View
        style={{
          flex: 1,
          minHeight: TILE_HEIGHT,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingHorizontal: 12,
          borderRadius: TILE_RADIUS,
          backgroundColor: palette.wash,
        }}
      >
        <Avatar name={seat.occupant.name} size="default" radius={radii.sm} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <TileBody title={seat.occupant.name} sub={seat.sub} />
        </View>
      </View>
    );
  }
  const label = m.mobileInvite.link.hero.sitHere;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${seat.sub}`}
      accessibilityState={{ disabled: onSit == null }}
      disabled={onSit == null}
      onPress={() => onSit?.(seat)}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: TILE_HEIGHT,
        justifyContent: "center",
        paddingHorizontal: 12,
        borderRadius: TILE_RADIUS,
        borderWidth: hairline,
        borderStyle: "dashed",
        borderColor: pressed ? palette.foreground : palette.rule,
        overflow: "hidden",
      })}
    >
      <Hatch radius={TILE_RADIUS} bordered={false} />
      <TileBody title={label} sub={seat.sub} />
    </Pressable>
  );
}

/** Design 3a on the ink head: the court, the open seats as Sit here tiles. */
export function InviteSeatCourt({
  court,
  onSit,
}: {
  court: InviteSeatCourtModel[];
  onSit: ((seat: InviteSeatTile) => void) | null;
}) {
  const palette = useTonePalette();
  return (
    <View style={{ gap: TILE_GAP }}>
      {court.map((side, index) => (
        <View key={side.sideIndex} style={{ gap: TILE_GAP }}>
          {index > 0 ? (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <View
                style={{
                  flex: 1,
                  height: hairline,
                  backgroundColor: palette.rule,
                }}
              />
              <Text size="eyebrow" tone="muted" mono>
                VS
              </Text>
              <View
                style={{
                  flex: 1,
                  height: hairline,
                  backgroundColor: palette.rule,
                }}
              />
            </View>
          ) : null}
          <View style={{ flexDirection: "row", gap: TILE_GAP }}>
            {side.seats.map((seat) => (
              <SeatTile key={seat.position} seat={seat} onSit={onSit} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

/** Design 3e: one Sit here tile under the football pool. */
export function InviteSitHereTile({
  sub,
  onSit,
}: {
  sub: string;
  onSit: (() => void) | null;
}) {
  const m = useMessages();
  const palette = useTonePalette();
  const label = m.mobileInvite.link.hero.sitHere;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${sub}`}
      accessibilityState={{ disabled: onSit == null }}
      disabled={onSit == null}
      onPress={() => onSit?.()}
      style={({ pressed }) => ({
        minHeight: TILE_HEIGHT,
        justifyContent: "center",
        paddingHorizontal: 12,
        borderRadius: TILE_RADIUS,
        borderWidth: hairline,
        borderStyle: "dashed",
        borderColor: pressed ? palette.foreground : palette.rule,
        overflow: "hidden",
      })}
    >
      <Hatch radius={TILE_RADIUS} bordered={false} />
      <TileBody title={label} sub={sub} />
    </Pressable>
  );
}
