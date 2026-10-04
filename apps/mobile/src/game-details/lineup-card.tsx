import { sizes } from "@repo/design-tokens";
import {
  friendlyGameLineupVacantAction,
  friendlyGameOpenSeatLabel,
  friendlyGameSeatSubline,
  friendlyGameVacantSeatLabel,
} from "@repo/domain/friendly-game-players";
import type {
  FriendlyGameDetailsSeat,
  FriendlyGameDetailsSide,
} from "@repo/domain/friendly-game-details";
import { vacantJoinSeats } from "@repo/domain/friendly-game-cta";
import { KICK_ACTION } from "@repo/domain/game-copy";
import { formatGameSideLabel } from "@repo/domain/game-side-label";
import { Fragment } from "react";
import { Pressable, View } from "react-native";

import { Card } from "../home/card";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { FormSlot } from "../primitives/form-slot";
import { Hatch } from "../primitives/hatch";
import { Text } from "../primitives/text";
import { spacing } from "@repo/design-tokens";

type Position = "left" | "right";

const SEAT_ICON = 40;

function OpenSeatMark() {
  return (
    <View
      style={{
        width: SEAT_ICON,
        height: SEAT_ICON,
        borderRadius: SEAT_ICON / 2,
      }}
    >
      <Hatch radius={SEAT_ICON / 2} />
    </View>
  );
}

function VacantRow({
  position,
  sideLabel,
  canMove,
  moving,
  onMove,
}: {
  position: Position;
  sideLabel: string;
  canMove: boolean;
  moving: boolean;
  onMove: () => void;
}) {
  const action = friendlyGameLineupVacantAction(canMove);
  const moveLabel = friendlyGameVacantSeatLabel(
    action,
    sideLabel,
    position === "left" ? "Left" : "Right",
  );

  if (action === "move" && moveLabel) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={moveLabel}
        accessibilityState={{ disabled: moving, busy: moving }}
        disabled={moving}
        onPress={onMove}
        style={({ pressed }) => ({
          minHeight: sizes.touchTarget,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          opacity: moving ? 0.5 : pressed ? 0.7 : 1,
        })}
      >
        <OpenSeatMark />
        <Text
          size="meta"
          weight="medium"
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          Move here
        </Text>
      </Pressable>
    );
  }

  return (
    <View
      accessible
      accessibilityLabel={friendlyGameOpenSeatLabel(position)}
      style={{
        minHeight: sizes.touchTarget,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      }}
    >
      <OpenSeatMark />
      <Text
        size="meta"
        tone="muted"
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        Open
      </Text>
    </View>
  );
}

function SeatRow({
  seat,
  position,
  isViewer,
  onKick,
}: {
  seat: FriendlyGameDetailsSeat;
  position: Position;
  isViewer: boolean;
  onKick: (() => void) | null;
}) {
  return (
    <View
      style={{
        minHeight: sizes.touchTarget,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      }}
    >
      <Avatar name={seat.name} uri={seat.image} size="lg" />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text size="body" weight="medium" numberOfLines={1}>
          {seat.name}
          {isViewer ? " (You)" : ""}
        </Text>
        <Text size="meta" tone="muted" numberOfLines={1}>
          {friendlyGameSeatSubline(position, seat.levelBand)}
        </Text>
      </View>
      {onKick ? (
        <Button
          label={KICK_ACTION}
          accessibilityLabel={`${KICK_ACTION} ${seat.name}`}
          variant="outline"
          size="sm"
          onPress={onKick}
        />
      ) : null}
    </View>
  );
}

function SideColumn({
  side,
  viewerUserId,
  isWinner,
  showWonTag,
  isVacant,
  canMove,
  moving,
  onMove,
  kickableUserIds,
  onKick,
}: {
  side: FriendlyGameDetailsSide;
  viewerUserId: string;
  isWinner: boolean;
  showWonTag: boolean;
  isVacant: (position: Position) => boolean;
  canMove: boolean;
  moving: boolean;
  onMove: (position: Position) => void;
  kickableUserIds: readonly string[];
  onKick: ((userId: string) => void) | undefined;
}) {
  const sideLabel = formatGameSideLabel("friendly_game", side.sideIndex);
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text size="eyebrow" weight="medium" tone="muted" uppercase>
          {sideLabel}
        </Text>
        {showWonTag && isWinner ? (
          <View style={{ width: 44 }}>
            <FormSlot variant="won" label="Won" compact />
          </View>
        ) : null}
      </View>
      {(["left", "right"] as const).map((position) => {
        const seat = side[position];
        return seat && !isVacant(position) ? (
          <SeatRow
            key={position}
            seat={seat}
            position={position}
            isViewer={seat.userId === viewerUserId}
            onKick={
              onKick && kickableUserIds.includes(seat.userId)
                ? () => onKick(seat.userId)
                : null
            }
          />
        ) : (
          <VacantRow
            key={position}
            position={position}
            sideLabel={sideLabel}
            canMove={canMove}
            moving={moving}
            onMove={() => onMove(position)}
          />
        );
      })}
    </View>
  );
}

export function LineupCard({
  sides,
  viewerUserId,
  isFinal,
  winningGameTeamId,
  canMove,
  moving,
  onMove,
  kickableUserIds = [],
  onKick,
}: {
  sides: FriendlyGameDetailsSide[];
  viewerUserId: string;
  isFinal: boolean;
  winningGameTeamId: string | null;
  canMove: boolean;
  moving: boolean;
  onMove: (sideIndex: number, position: Position) => void;
  kickableUserIds?: readonly string[];
  onKick?: (userId: string) => void;
}) {
  const vacant = vacantJoinSeats(sides);
  const isVacant = (sideIndex: number, position: Position) =>
    vacant.some(
      (seat) => seat.sideIndex === sideIndex && seat.position === position,
    );

  return (
    <Card title="Line-up">
      <View
        style={{
          paddingHorizontal: spacing.surface,
          paddingBottom: spacing.surface,
          gap: 12,
        }}
      >
        {sides.map((side, index) => (
          <Fragment key={side.sideIndex}>
            {index > 0 ? (
              <Text
                size="meta"
                tone="muted"
                weight="semibold"
                accessibilityElementsHidden
                importantForAccessibility="no"
              >
                vs
              </Text>
            ) : null}
            <SideColumn
              side={side}
              viewerUserId={viewerUserId}
              isWinner={
                side.gameTeamId != null && side.gameTeamId === winningGameTeamId
              }
              showWonTag={isFinal}
              isVacant={(position) => isVacant(side.sideIndex, position)}
              canMove={canMove}
              moving={moving}
              onMove={(position) => onMove(side.sideIndex, position)}
              kickableUserIds={kickableUserIds}
              onKick={onKick}
            />
          </Fragment>
        ))}
      </View>
    </Card>
  );
}
