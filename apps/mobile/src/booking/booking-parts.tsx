import { colors, radii, spacing } from "@repo/design-tokens";
import type { BookingPaymentMethod } from "@repo/domain/booking-payment";
import type { Href } from "expo-router";
import {
  CreditCard,
  Smartphone,
  Store,
  Wallet,
  type LucideIcon,
} from "lucide-react-native";
import { View } from "react-native";

import { useLightStatusBar } from "../create-game/step-shell";
import { Button } from "../primitives/button";
import { hairline } from "../primitives/hairline-width";
import { ScreenHeader } from "../primitives/screen-header";
import { Surface } from "../primitives/surface";
import { Text, type TextSize } from "../primitives/text";

const HERO_PADDING_BOTTOM = 22;

export const PAYMENT_METHOD_ICONS = {
  card: CreditCard,
  benefit: CreditCard,
  benefitpay: Smartphone,
  apple_pay: Wallet,
  at_venue: Store,
} satisfies Record<BookingPaymentMethod, unknown>;

/** The ink header of Checkout and Booking details: a start time and where. */
export function BookingHero({
  eyebrow,
  time,
  until,
  titleSize = "hero",
  subtitle,
  aside,
  nav = "back",
  fallback,
  onNav,
  children,
}: {
  eyebrow: string;
  time: string;
  until?: string;
  titleSize?: TextSize;
  subtitle: string;
  /** Under the eyebrow, beside the nav button: a live line such as a hold. */
  aside?: React.ReactNode;
  nav?: "back" | "close";
  fallback: Href;
  onNav?: () => void;
  children?: React.ReactNode;
}) {
  useLightStatusBar();

  return (
    <Surface
      tone="ink"
      style={{
        paddingTop: spacing.compact,
        paddingBottom: HERO_PADDING_BOTTOM,
        borderRadius: 0,
      }}
    >
      <ScreenHeader
        nav={nav}
        fallback={fallback}
        onNav={onNav}
        actions={
          aside ? (
            <View style={{ alignItems: "flex-end", gap: 4, flexShrink: 1 }}>
              <Text
                size="eyebrow"
                mono
                uppercase
                tone="muted"
                numberOfLines={1}
              >
                {eyebrow}
              </Text>
              {aside}
            </View>
          ) : (
            <Text size="eyebrow" mono uppercase tone="muted" numberOfLines={1}>
              {eyebrow}
            </Text>
          )
        }
      >
        <View style={{ gap: 6 }}>
          <View
            accessible
            accessibilityRole="header"
            accessibilityLabel={until ? `${time} ${until}` : time}
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              alignItems: "baseline",
              columnGap: 10,
            }}
          >
            <Text size={titleSize} width="expanded">
              {time}
            </Text>
            {until ? <Text tone="muted">{until}</Text> : null}
          </View>
          <Text size="meta" tone="muted">
            {subtitle}
          </Text>
        </View>
        {children}
      </ScreenHeader>
    </Surface>
  );
}

export function SectionHeading({
  title,
  meta,
  metaIcon: MetaIcon,
}: {
  title: string;
  meta?: string | null;
  metaIcon?: LucideIcon;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <Text
        size="title"
        weight="bold"
        width="expanded"
        accessibilityRole="header"
      >
        {title}
      </Text>
      {meta && MetaIcon ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            flexShrink: 1,
          }}
        >
          <MetaIcon size={12} color={colors.muted} aria-hidden />
          <Text size="eyebrow" tone="muted" numberOfLines={1}>
            {meta}
          </Text>
        </View>
      ) : meta ? (
        <Text
          size="meta"
          tone="muted"
          numberOfLines={1}
          style={{ flexShrink: 1 }}
        >
          {meta}
        </Text>
      ) : null}
    </View>
  );
}

/** A label on the left, a value on the right, over a hairline. */
export function DetailRow({
  label,
  children,
  first = false,
}: {
  label: string;
  children: React.ReactNode;
  first?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 16,
        paddingVertical: 14,
        borderTopWidth: first ? 0 : hairline,
        borderTopColor: colors.rule,
      }}
    >
      <Text tone="muted">{label}</Text>
      <View style={{ flexShrink: 1, alignItems: "flex-end", gap: 2 }}>
        {children}
      </View>
    </View>
  );
}

export function Notice({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Surface accessibilityRole="alert" style={{ gap: 8 }}>
      <Text size="lead" weight="semibold">
        {title}
      </Text>
      {description ? (
        <Text size="meta" tone="muted">
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <View style={{ flexDirection: "row", marginTop: 4 }}>
          <Button label={actionLabel} variant="outline" onPress={onAction} />
        </View>
      ) : null}
    </Surface>
  );
}

/** A small outlined pill: "4 courts", "Open to 11 PM". */
export function Pill({ label }: { label: string }) {
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: radii.sm,
        borderWidth: hairline,
        borderColor: colors.rule,
      }}
    >
      <Text size="meta">{label}</Text>
    </View>
  );
}
