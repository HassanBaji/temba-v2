import { radii, sizes, spacing } from "@repo/design-tokens";
import { formatGameClock } from "@repo/domain/format-game-start";
import { formatHomeKickoff } from "@repo/domain/home-countdown";
import { formatBookingPriceFils } from "@repo/domain/price-per-player";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";
import { useRouter } from "expo-router";
import {
  Check,
  MapPin,
  Navigation,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react-native";
import { Linking, Platform, Pressable, Share, View } from "react-native";

import { gamePath } from "../games/games-model";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { hairline } from "../primitives/hairline-width";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import type { RouterOutputs } from "../trpc/react";
import {
  bookingGamePath,
  bookingPath,
  bookingShareMessage,
  directionsUrl,
  minutesBetween,
  relativeDay,
  untilLabel,
} from "./booking-model";
import {
  dayBlock,
  nextBookingAction,
  priceParts,
  rowBadge,
  rowDetail,
  rowTitle,
  startsInLabel,
  type NextBookingAction,
} from "./my-bookings-model";

export type BookingItem =
  RouterOutputs["bookings"]["listMine"]["items"][number];

const DATE_BLOCK_WIDTH = 40;
const ACTION_HEIGHT = 36;
const ACTION_ICON = 14;
const BADGE_ICON = 11;
const PIN_ICON = 14;

export function NextBooking({
  item,
  now,
  onPress,
}: {
  item: BookingItem;
  now: Date;
  onPress: () => void;
}) {
  const router = useRouter();
  const m = useMessages();
  const colors = useColors();
  const locale = useLocale();
  const minutes = minutesBetween(item.startsAt, item.endsAt);
  const kickoff = formatHomeKickoff(item.startsAt, locale);
  const startsIn = startsInLabel(item.startsAt, item.endsAt, now, locale);
  const price = priceParts(formatBookingPriceFils(item.priceFils, locale));
  const badge = rowBadge(item, now, locale);
  const paid = item.status === "confirmed" && item.paymentStatus === "paid";
  const action = nextBookingAction(item);

  return (
    <Surface tone="ink" padded={false} style={{ padding: spacing.compact }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={m.mobileBooking.cards.nextBookingLabel(
          relativeDay(item.startsAt, now, locale),
          formatGameClock(item.startsAt, locale),
          item.court.name,
          item.venue.name,
          badge,
        )}
        onPress={onPress}
        style={({ pressed }) => ({ gap: 14, opacity: pressed ? 0.9 : 1 })}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Text
            size="meta"
            tone="muted"
            numberOfLines={1}
            style={{ flexShrink: 1 }}
          >
            {relativeDay(item.startsAt, now, locale)}
            {startsIn ? (
              <>
                {", "}
                <Text size="meta">{startsIn}</Text>
              </>
            ) : null}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text size="meta" weight="semibold">
              {price.amount}
              {price.currency ? (
                <Text size="meta" tone="muted">{` ${price.currency}`}</Text>
              ) : null}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                paddingHorizontal: 7,
                paddingVertical: 3,
                borderRadius: radii.slot,
                borderWidth: hairline,
                borderColor: colors.dimrule,
              }}
            >
              {paid ? <Check size={BADGE_ICON} color={colors.onFocus} /> : null}
              <Text size="eyebrow" mono uppercase>
                {badge}
              </Text>
            </View>
          </View>
        </View>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "baseline",
            columnGap: 10,
          }}
        >
          <View
            style={{ flexDirection: "row", alignItems: "baseline", gap: 5 }}
          >
            <Text size="record" width="expanded" weight="bold">
              {kickoff.time}
            </Text>
            {kickoff.meridiem ? (
              <Text size="figure" width="expanded" weight="bold">
                {kickoff.meridiem}
              </Text>
            ) : null}
          </View>
          <Text size="meta" tone="muted">
            {untilLabel(item.endsAt, locale)}
            <Text size="meta" style={{ color: colors.dimrule }}>
              {" / "}
            </Text>
            {m.dates.minutes(minutes)}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <MapPin size={PIN_ICON} color={colors.dim} />
          <Text numberOfLines={1} style={{ flexShrink: 1 }}>
            <Text weight="semibold">{item.venue.name}</Text>
            <Text tone="muted">{`  ${item.court.name}`}</Text>
          </Text>
        </View>
      </Pressable>
      <View
        style={{
          flexDirection: "row",
          gap: 6,
          marginTop: 14,
          paddingTop: 14,
          borderTopWidth: hairline,
          borderTopColor: colors.dimrule,
        }}
      >
        <CardAction
          label={m.mobileBooking.cards.directionsTo(item.venue.name)}
          icon={Navigation}
          iconOnly
          onPress={() =>
            void Linking.openURL(directionsUrl(item.venue, Platform.OS, locale))
          }
        />
        <CardAction
          label={m.mobileBooking.cards.invite}
          icon={UserPlus}
          onPress={() =>
            void Share.share({ message: bookingShareMessage(item, locale) })
          }
        />
        {action ? (
          <View style={{ flex: 1 }}>
            <CardAction
              primary
              {...nextActionButton(action, locale)}
              onPress={() => {
                if (action === "finish_payment") {
                  router.push(`${bookingPath(item.id)}/payment`);
                } else if (action === "open_game" && item.gameId) {
                  router.push(gamePath(item.gameId));
                } else {
                  router.push(bookingGamePath(item.id));
                }
              }}
            />
          </View>
        ) : null}
      </View>
    </Surface>
  );
}

export function nextActionButton(
  action: NextBookingAction,
  locale: Locale,
): {
  label: string;
  icon?: LucideIcon;
} {
  const m = messagesFor(locale).mobileBooking;
  switch (action) {
    case "finish_payment":
      return { label: m.finishPayment };
    case "open_game":
      return { label: m.openGame, icon: Users };
    case "make_game":
      return { label: m.cards.makeItAGame, icon: Users };
  }
}

/** A compact button on the ink card, so three fit on one row. */
export function CardAction({
  label,
  icon: Icon,
  iconOnly = false,
  primary = false,
  onPress,
}: {
  label: string;
  icon?: LucideIcon;
  iconOnly?: boolean;
  primary?: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const foreground = primary ? colors.onFocusControl : colors.onFocus;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={(sizes.touchTarget - ACTION_HEIGHT) / 2}
      onPress={onPress}
      style={({ pressed }) => ({
        height: ACTION_HEIGHT,
        width: iconOnly ? ACTION_HEIGHT : undefined,
        paddingHorizontal: iconOnly ? 0 : 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        borderRadius: radii.md,
        borderWidth: hairline,
        borderColor: primary ? colors.focusControl : colors.dimrule,
        backgroundColor: primary ? colors.focusControl : "transparent",
        opacity: pressed ? 0.85 : 1,
      })}
    >
      {Icon ? <Icon size={ACTION_ICON} color={foreground} /> : null}
      {iconOnly ? null : (
        <Text
          size="meta"
          weight={primary ? "semibold" : "regular"}
          numberOfLines={1}
          style={{ color: foreground }}
        >
          {label}
        </Text>
      )}
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
  const m = useMessages();
  const colors = useColors();
  const locale = useLocale();
  const block = dayBlock(item.startsAt, locale);
  const badge = rowBadge(item, now, locale);
  const muted = item.status === "cancelled" || item.status === "no_show";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={m.mobileBooking.cards.rowLabel(
        block.weekday,
        block.day,
        rowTitle(item, locale),
        rowDetail(item, locale),
        badge,
      )}
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
            {rowTitle(item, locale)}
          </Text>
          <Text size="meta" tone="muted" numberOfLines={1}>
            {rowDetail(item, locale)}
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
