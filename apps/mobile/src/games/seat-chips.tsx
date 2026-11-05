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

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Avatar } from "../primitives/avatar";
import { Hatch } from "../primitives/hatch";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";

const CHIP_HEIGHT = 56;

function FilledChip({ occupant }: { occupant: HubGameOccupant }) {
  const palette = useTonePalette();
  const m = useMessages();
  return (
    <View
      accessible
      accessibilityLabel={occupant.isViewer ? m.common.you : occupant.name}
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
        {occupant.isViewer ? m.common.you : firstName(occupant.name)}
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
  const locale = useLocale();
  const m = useMessages().mobileTournament.card;
  const partner = position === "left" ? side.right : side.left;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={sideJoinAccessibleName(
        side.sideIndex,
        position,
        partner?.name ?? null,
        locale,
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
        {position === "left" ? m.joinLeft : m.joinRight}
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
  const m = useMessages();
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
  return (
    <OpenChip
      caption={m.game.court.open}
      accessibilityLabel={m.mobileTournament.card.openSeat}
    />
  );
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
  const m = useMessages().mobileTournament.card;
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
                {m.vs}
              </Text>
            ) : null}
            <View
              // Physical on purpose: Left and Right are court sides, not reading order.
              style={{
                flex: 1,
                flexDirection: "row",
                direction: "ltr",
                gap: 4,
                minWidth: 0,
              }}
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
