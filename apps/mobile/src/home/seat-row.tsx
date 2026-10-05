import { radii } from "@repo/design-tokens";
import {
  homeSeatCaption,
  homeSeatRowSummary,
  homeSeatsBySide,
  type HomeSeatView,
} from "@repo/domain/home-seats";
import { Fragment } from "react";
import { View } from "react-native";

import { Avatar } from "../primitives/avatar";
import { Hatch } from "../primitives/hatch";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";

const SEAT_HEIGHT = 60;

function Seat({
  seat,
  useInitials,
}: {
  seat: HomeSeatView;
  useInitials: boolean;
}) {
  const palette = useTonePalette();
  const caption = homeSeatCaption(seat, useInitials);

  if (!seat.filled) {
    return (
      <View
        accessible
        accessibilityLabel="Open seat"
        style={{
          flex: 1,
          minWidth: 0,
          height: SEAT_HEIGHT,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Hatch radius={radii.slot} bordered={false} />
        <Text size="lead" accessibilityElementsHidden>
          +
        </Text>
      </View>
    );
  }

  return (
    <View
      accessible
      accessibilityLabel={seat.name ?? "Filled seat"}
      style={{
        flex: 1,
        minWidth: 0,
        height: SEAT_HEIGHT,
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        borderRadius: radii.slot,
        backgroundColor: palette.wash,
      }}
    >
      <Avatar name={seat.name ?? ""} uri={seat.image} size="sm" />
      <Text
        size="eyebrow"
        weight="medium"
        numberOfLines={1}
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={{ paddingHorizontal: 4 }}
      >
        {caption}
      </Text>
    </View>
  );
}

export function SeatRow({ seats }: { seats: HomeSeatView[] }) {
  const { filled, total, useInitials, spotsLabel } = homeSeatRowSummary(seats);
  const sides = homeSeatsBySide(seats);

  return (
    <View style={{ gap: 8 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <Text size="meta" tone="muted">
          {filled} of {total} players in
        </Text>
        {spotsLabel ? (
          <Text size="meta" tone="muted">
            {spotsLabel}
          </Text>
        ) : null}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        {sides.map((sideSeats, index) => (
          <Fragment key={sideSeats[0]?.id ?? index}>
            {index > 0 ? (
              <Text
                size="meta"
                tone="muted"
                weight="medium"
                style={{ paddingHorizontal: 6 }}
              >
                vs
              </Text>
            ) : null}
            <View
              style={{ flex: 1, flexDirection: "row", gap: 4, minWidth: 0 }}
            >
              {sideSeats.map((seat) => (
                <Seat key={seat.id} seat={seat} useInitials={useInitials} />
              ))}
            </View>
          </Fragment>
        ))}
      </View>
    </View>
  );
}
