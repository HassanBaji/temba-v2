import { radii, sizes } from "@repo/design-tokens";
import {
  firstName,
  sideJoinAccessibleName,
  type CardSeatPosition,
} from "@repo/domain/game-card";
import { nextJoinPosition } from "@repo/domain/game-card-side-join";
import type { HubGameOccupant, HubGameSide } from "@repo/domain/hub-game-row";
import { Fragment } from "react";
import { Pressable, View } from "react-native";

import { Avatar } from "../primitives/avatar";
import { Hatch } from "../primitives/hatch";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";

const CHIP_HEIGHT = 56;

function FilledChip({ occupant }: { occupant: HubGameOccupant }) {
  const palette = useTonePalette();
  return (
    <View
      accessible
      accessibilityLabel={occupant.isViewer ? "You" : occupant.name}
      style={{
        flex: 1,
        minWidth: 0,
        height: CHIP_HEIGHT,
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        borderRadius: radii.slot,
        backgroundColor: palette.wash,
      }}
    >
      <Avatar name={occupant.name} uri={occupant.image} size="sm" />
      <Text
        size="eyebrow"
        weight={occupant.isViewer ? "semibold" : "regular"}
        numberOfLines={1}
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={{ paddingHorizontal: 4 }}
      >
        {occupant.isViewer ? "You" : firstName(occupant.name)}
      </Text>
    </View>
  );
}

function OpenChip({
  caption,
  accessibilityLabel,
}: {
  caption: string;
  accessibilityLabel: string;
}) {
  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      style={{
        flex: 1,
        minWidth: 0,
        height: CHIP_HEIGHT,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Hatch radius={radii.slot} />
      <Text
        size="eyebrow"
        tone="muted"
        numberOfLines={1}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        {caption}
      </Text>
    </View>
  );
}

function JoinChip({
  side,
  position,
  pending,
  onJoin,
}: {
  side: HubGameSide;
  position: CardSeatPosition;
  pending: boolean;
  onJoin: (sideIndex: number, position: CardSeatPosition) => void;
}) {
  const partner = position === "left" ? side.right : side.left;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={sideJoinAccessibleName(
        side.sideIndex,
        position,
        partner?.name ?? null,
      )}
      accessibilityState={{ disabled: pending, busy: pending }}
      disabled={pending}
      onPress={() => onJoin(side.sideIndex, position)}
      style={({ pressed }) => ({
        flex: 1,
        minWidth: 0,
        height: Math.max(CHIP_HEIGHT, sizes.touchTarget),
        alignItems: "center",
        justifyContent: "center",
        opacity: pending ? 0.5 : pressed ? 0.7 : 1,
      })}
    >
      <Hatch radius={radii.slot} />
      <Text
        size="eyebrow"
        weight="semibold"
        numberOfLines={1}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        Join {position === "left" ? "Left" : "Right"}
      </Text>
    </Pressable>
  );
}

function SideSeat({
  side,
  position,
  joinPosition,
  pending,
  onJoin,
}: {
  side: HubGameSide;
  position: CardSeatPosition;
  joinPosition: CardSeatPosition | null;
  pending: boolean;
  onJoin?: (sideIndex: number, position: CardSeatPosition) => void;
}) {
  const occupant = position === "left" ? side.left : side.right;
  if (occupant) {
    return <FilledChip occupant={occupant} />;
  }
  const joinable = joinPosition != null && onJoin != null;
  const emptySide = side.left == null && side.right == null;
  if (joinable && (emptySide || joinPosition === position)) {
    return (
      <JoinChip
        side={side}
        position={position}
        pending={pending}
        onJoin={onJoin}
      />
    );
  }
  return <OpenChip caption="Open" accessibilityLabel="Open seat" />;
}

export function FriendlyRoster({
  sides,
  joinable,
  pending,
  onJoin,
}: {
  sides: readonly HubGameSide[];
  joinable: boolean;
  pending: boolean;
  onJoin?: (sideIndex: number, position: CardSeatPosition) => void;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      {sides.map((side, index) => {
        const joinPosition = joinable ? nextJoinPosition(side) : null;
        return (
          <Fragment key={side.sideIndex}>
            {index > 0 ? (
              <Text
                size="eyebrow"
                tone="muted"
                weight="semibold"
                accessibilityElementsHidden
                importantForAccessibility="no"
              >
                vs
              </Text>
            ) : null}
            <View
              style={{ flex: 1, flexDirection: "row", gap: 4, minWidth: 0 }}
            >
              <SideSeat
                side={side}
                position="left"
                joinPosition={joinPosition}
                pending={pending}
                onJoin={onJoin}
              />
              <SideSeat
                side={side}
                position="right"
                joinPosition={joinPosition}
                pending={pending}
                onJoin={onJoin}
              />
            </View>
          </Fragment>
        );
      })}
    </View>
  );
}
