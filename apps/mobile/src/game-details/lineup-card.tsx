import { radii, sizes, spacing } from "@repo/design-tokens";
import {
  courtPositionLabel,
  courtSeatName,
  courtSeatRow,
  courtSeatSubline,
  courtSpotsLabel,
} from "@repo/domain/friendly-game-court";
import type {
  FriendlyGameDetailsSeat,
  FriendlyGameDetailsSide,
} from "@repo/domain/friendly-game-details";
import { friendlyGameOpenSeatLabel } from "@repo/domain/friendly-game-players";
import { formatGameSideLabel } from "@repo/domain/game-side-label";
import type { PlayedRow } from "@repo/domain/played-game";
import { Plus, UserPlus } from "lucide-react-native";
import { Fragment } from "react";
import { Pressable, View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { NotOnTembaMark } from "../primitives/not-on-temba-mark";
import { Surface } from "../primitives/surface";
import {
  SurfaceToneContext,
  useTonePalette,
} from "../primitives/surface-context";
import { Text } from "../primitives/text";

type Position = "left" | "right";

export type OpenSeatAction = {
  accessibilityLabel: string;
  onPress: () => void;
};

const SEAT_SIZE = 52;
const COURT_LINE = 1.5;
const NET_LABEL_OFFSET = 10;

function SeatLabels({
  title,
  subline,
  strong,
  unclaimed = false,
}: {
  title: string;
  subline: string;
  strong: boolean;
  unclaimed?: boolean;
}) {
  return (
    <View style={{ alignItems: "center", maxWidth: "100%", gap: 2 }}>
      <Text
        size="body"
        weight={strong ? "semibold" : "medium"}
        numberOfLines={1}
        style={{ textAlign: "center" }}
      >
        {title}
      </Text>
      {unclaimed ? <NotOnTembaMark /> : null}
      <Text size="meta" tone="muted" numberOfLines={1}>
        {subline}
      </Text>
    </View>
  );
}

function OpenSeat({
  position,
  action,
  busy,
}: {
  position: Position;
  action: OpenSeatAction | null;
  busy: boolean;
}) {
  const m = useMessages();
  const locale = useLocale();
  const palette = useTonePalette();
  const body = (
    <>
      <View
        style={{
          width: SEAT_SIZE,
          height: SEAT_SIZE,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Hatch radius={SEAT_SIZE / 2} />
        {action ? <Plus size={18} color={palette.muted} /> : null}
      </View>
      <SeatLabels
        title={m.game.court.open}
        subline={courtPositionLabel(position, locale)}
        strong={false}
      />
    </>
  );
  const cell = {
    flex: 1,
    minWidth: 0,
    minHeight: sizes.touchTarget,
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  } as const;

  if (!action) {
    return (
      <View
        accessible
        accessibilityLabel={friendlyGameOpenSeatLabel(position, locale)}
        style={cell}
      >
        {body}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={action.accessibilityLabel}
      accessibilityState={{ disabled: busy, busy }}
      disabled={busy}
      onPress={action.onPress}
      style={({ pressed }) => [
        cell,
        { opacity: busy ? 0.5 : pressed ? 0.6 : 1 },
      ]}
    >
      {body}
    </Pressable>
  );
}

function TakenSeat({
  seat,
  position,
  viewerUserId,
  onPress,
}: {
  seat: FriendlyGameDetailsSeat;
  position: Position;
  viewerUserId: string;
  onPress: ((row: PlayedRow) => void) | undefined;
}) {
  const m = useMessages();
  const locale = useLocale();
  const row = courtSeatRow(seat, position, viewerUserId, locale);
  const name = courtSeatName(row, locale);
  const subline = courtSeatSubline(position, seat.levelBand, locale);
  const avatar = <Avatar name={seat.name} uri={seat.image} size="court" />;
  const body = (
    <>
      {row.isYou ? (
        <SurfaceToneContext.Provider value="ink">
          {avatar}
        </SurfaceToneContext.Provider>
      ) : (
        avatar
      )}
      <SeatLabels
        title={name}
        subline={subline}
        strong={row.isYou}
        unclaimed={row.unclaimed}
      />
    </>
  );
  const cell = {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
  } as const;

  if (!onPress) {
    return <View style={cell}>{body}</View>;
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={m.mobileGameDetails.join.nameWithMeta(name, subline)}
      onPress={() => onPress(row)}
      style={({ pressed }) => [cell, { opacity: pressed ? 0.6 : 1 }]}
    >
      {body}
    </Pressable>
  );
}

function SideHalf({
  side,
  labelBelow,
  viewerUserId,
  busy,
  openSeatAction,
  onPressPlayer,
}: {
  side: FriendlyGameDetailsSide;
  labelBelow: boolean;
  viewerUserId: string;
  busy: boolean;
  openSeatAction: (
    sideIndex: number,
    position: Position,
  ) => OpenSeatAction | null;
  onPressPlayer: ((row: PlayedRow) => void) | undefined;
}) {
  const locale = useLocale();
  const palette = useTonePalette();
  const label = (
    <Text size="eyebrow" weight="semibold" tone="muted" uppercase>
      {formatGameSideLabel("friendly_game", side.sideIndex, locale)}
    </Text>
  );
  return (
    <View
      style={{
        paddingHorizontal: 12,
        paddingTop: labelBelow ? 16 : 12,
        paddingBottom: labelBelow ? 12 : 14,
        gap: 10,
      }}
    >
      {labelBelow ? null : label}
      <View
        // Physical on purpose: Left and Right are court sides, not reading order.
        style={{ flexDirection: "row", direction: "ltr" }}
      >
        {(["left", "right"] as const).map((position, index) => {
          const seat = side[position];
          return (
            <Fragment key={position}>
              {index > 0 ? (
                <View
                  style={{ width: hairline, backgroundColor: palette.rule }}
                />
              ) : null}
              {seat ? (
                <TakenSeat
                  seat={seat}
                  position={position}
                  viewerUserId={viewerUserId}
                  onPress={onPressPlayer}
                />
              ) : (
                <OpenSeat
                  position={position}
                  action={openSeatAction(side.sideIndex, position)}
                  busy={busy}
                />
              )}
            </Fragment>
          );
        })}
      </View>
      {labelBelow ? label : null}
    </View>
  );
}

function Net() {
  const m = useMessages();
  const palette = useTonePalette();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        borderTopWidth: COURT_LINE,
        borderTopColor: palette.foreground,
      }}
    >
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: -NET_LABEL_OFFSET,
          alignItems: "center",
        }}
      >
        <Text
          size="eyebrow"
          weight="bold"
          uppercase
          style={{
            backgroundColor: palette.background,
            paddingHorizontal: 8,
          }}
        >
          {m.mobileGameDetails.lineup.vs}
        </Text>
      </View>
    </View>
  );
}

/**
 * The padel court from above: Team A across the top, the net, Team B below,
 * each side's left and right spot. Open spots are hatched until filled.
 */
export function LineupCard({
  sides,
  viewerUserId,
  vacantSeatCount,
  hint,
  busy,
  openSeatAction,
  onInvite,
  onPressPlayer,
}: {
  sides: FriendlyGameDetailsSide[];
  viewerUserId: string;
  vacantSeatCount: number;
  hint: string | null;
  busy: boolean;
  openSeatAction: (
    sideIndex: number,
    position: Position,
  ) => OpenSeatAction | null;
  onInvite?: () => void;
  onPressPlayer?: (row: PlayedRow) => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const palette = useTonePalette();
  return (
    <Surface padded={false} style={{ overflow: "hidden" }}>
      <View
        style={{
          minHeight: sizes.touchTarget + 24,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          paddingHorizontal: spacing.compact,
          paddingVertical: 12,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "baseline",
            gap: 8,
            flexShrink: 1,
          }}
        >
          <Text size="lead" weight="semibold" accessibilityRole="header">
            {m.mobileGameDetails.lineup.title}
          </Text>
          <Text size="meta" tone="muted" numberOfLines={1}>
            {courtSpotsLabel(vacantSeatCount, locale)}
          </Text>
        </View>
        {onInvite ? (
          <Button
            label={m.mobileGameDetails.lineup.invite}
            variant="outline"
            size="sm"
            icon={<UserPlus size={15} color={palette.foreground} />}
            onPress={onInvite}
          />
        ) : null}
      </View>
      <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
        <View
          style={{
            borderWidth: COURT_LINE,
            borderColor: palette.foreground,
            borderRadius: radii.lg,
            overflow: "hidden",
          }}
        >
          {sides.map((side, index) => (
            <Fragment key={side.sideIndex}>
              {index > 0 ? <Net /> : null}
              <SideHalf
                side={side}
                labelBelow={index > 0}
                viewerUserId={viewerUserId}
                busy={busy}
                openSeatAction={openSeatAction}
                onPressPlayer={onPressPlayer}
              />
            </Fragment>
          ))}
        </View>
        {hint ? (
          <Text
            size="meta"
            tone="muted"
            style={{ paddingTop: 12, paddingHorizontal: 4 }}
          >
            {hint}
          </Text>
        ) : null}
      </View>
    </Surface>
  );
}
