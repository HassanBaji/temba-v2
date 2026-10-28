import { colors, radii, sizes } from "@repo/design-tokens";
import type { BookingPaymentMethod } from "@repo/domain/booking-payment";
import { Check, CreditCard, Store } from "lucide-react-native";
import { Image, Pressable, View } from "react-native";

import applePayMark from "../../assets/payment/apple-pay.png";
import benefitMark from "../../assets/payment/benefit.png";
import benefitPayMark from "../../assets/payment/benefitpay.png";
import { hairline } from "../primitives/hairline-width";
import { Text } from "../primitives/text";

const MARK_HEIGHT = 18;
const TILE_SIZE = 40;
const RADIO_SIZE = 20;
const SELECTED_BORDER = 2;
const PADDING = { vertical: 12, horizontal: 14 } as const;

// Brand marks keep their own colours: they are the payment networks' logos,
// not part of the black and white palette.
const BRAND_MARKS: Partial<
  Record<BookingPaymentMethod, { source: number; width: number }>
> = {
  apple_pay: { source: applePayMark, width: 34 },
  benefit: { source: benefitMark, width: MARK_HEIGHT },
  benefitpay: { source: benefitPayMark, width: MARK_HEIGHT },
};

function PaymentMethodMark({ method }: { method: BookingPaymentMethod }) {
  const brand = BRAND_MARKS[method];
  if (brand) {
    return (
      <Image
        source={brand.source}
        resizeMode="contain"
        style={{ width: brand.width, height: MARK_HEIGHT }}
      />
    );
  }
  const Icon = method === "at_venue" ? Store : CreditCard;
  return <Icon size={MARK_HEIGHT} color={colors.ink} />;
}

/** A way to pay at checkout: the method's mark, its name and a radio. */
export function PaymentMethodCard({
  method,
  title,
  description,
  selected,
  onPress,
}: {
  method: BookingPaymentMethod;
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}) {
  const border = selected ? SELECTED_BORDER : hairline;
  const inset = border - hairline;

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={`${title}, ${description}`}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: sizes.touchTarget,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: PADDING.vertical - inset,
        paddingHorizontal: PADDING.horizontal - inset,
        borderRadius: radii.card,
        borderWidth: border,
        borderColor: selected ? colors.ink : colors.rule,
        backgroundColor: pressed ? colors.surfaceRaised : colors.paper,
      })}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        aria-hidden
        style={{
          width: TILE_SIZE,
          height: TILE_SIZE,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <PaymentMethodMark method={method} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text weight="semibold">{title}</Text>
        <Text size="eyebrow" tone="muted">
          {description}
        </Text>
      </View>
      <View
        style={{
          width: RADIO_SIZE,
          height: RADIO_SIZE,
          borderRadius: RADIO_SIZE / 2,
          borderWidth: 1,
          borderColor: selected ? colors.ink : colors.inputBorder,
          backgroundColor: selected ? colors.ink : colors.paper,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {selected ? (
          <Check size={12} strokeWidth={3} color={colors.paper} />
        ) : null}
      </View>
    </Pressable>
  );
}
