import { colors, radii, spacing } from "@repo/design-tokens";
import { formatGameClock } from "@repo/domain/format-game-start";
import { formatBookingPriceFils } from "@repo/domain/price-per-player";
import { Pressable, View } from "react-native";

import { hairline } from "../primitives/hairline-width";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import type { RouterOutputs } from "../trpc/react";
import { minutesBetween, relativeDay } from "./booking-model";
import { dayBlock, rowBadge, rowDetail, rowTitle } from "./my-bookings-model";

export type BookingItem =
  RouterOutputs["bookings"]["listMine"]["items"][number];

const DATE_BLOCK_WIDTH = 40;

export function NextBooking({
  item,
  now,
  onPress,
}: {
  item: BookingItem;
  now: Date;
  onPress: () => void;
}) {
  const minutes = minutesBetween(item.startsAt, item.endsAt);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Next booking, ${relativeDay(item.startsAt, now)} ${formatGameClock(item.startsAt)}, ${item.court.name}, ${item.venue.name}, ${rowBadge(item, now)}`}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
    >
      <Surface tone="ink" style={{ gap: 12 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <Text size="meta" tone="muted">
            {relativeDay(item.startsAt, now)}
          </Text>
          <Text
            size="meta"
            tone="muted"
            numberOfLines={1}
            style={{ flexShrink: 1 }}
          >
            {`${item.court.name}, ${item.venue.name}`}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
          <Text size="display" width="expanded">
            {formatGameClock(item.startsAt)}
          </Text>
          <Text tone="muted">{`${minutes} min`}</Text>
        </View>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: radii.slot,
              borderWidth: hairline,
              borderColor: colors.paper,
            }}
          >
            <Text size="eyebrow" mono uppercase>
              {rowBadge(item, now)}
            </Text>
          </View>
          <Text size="meta" weight="semibold">
            {formatBookingPriceFils(item.priceFils)}
          </Text>
        </View>
      </Surface>
    </Pressable>
  );
}

export function BookingRowCard({
  item,
  now,
  onPress,
}: {
  item: BookingItem;
  now: Date;
  onPress: () => void;
}) {
  const block = dayBlock(item.startsAt);
  const badge = rowBadge(item, now);
  const muted = item.status === "cancelled" || item.status === "no_show";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${block.weekday} ${block.day}, ${rowTitle(item)}, ${rowDetail(item)}, ${badge}`}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <Surface
        padded={false}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          paddingHorizontal: spacing.compact,
          paddingVertical: 16,
        }}
      >
        <View style={{ width: DATE_BLOCK_WIDTH, alignItems: "center" }}>
          <Text size="h2" weight="bold" tone={muted ? "muted" : "default"}>
            {block.day}
          </Text>
          <Text size="eyebrow" tone="muted">
            {block.weekday}
          </Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            weight="semibold"
            numberOfLines={1}
            tone={muted ? "muted" : "default"}
          >
            {rowTitle(item)}
          </Text>
          <Text size="meta" tone="muted" numberOfLines={1}>
            {rowDetail(item)}
          </Text>
        </View>
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: radii.slot,
            borderWidth: hairline,
            borderColor:
              item.status === "pending_payment" ? colors.ink : colors.rule,
          }}
        >
          <Text size="eyebrow">{badge}</Text>
        </View>
      </Surface>
    </Pressable>
  );
}
