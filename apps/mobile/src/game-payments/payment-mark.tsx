import type { PaymentMark } from "@repo/domain/game-payments";
import { Check } from "lucide-react-native";
import { View } from "react-native";

import { useMessages } from "../i18n/locale-provider";
import { Hatch } from "../primitives/hatch";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";

const RING_WIDTH = 1.5;

/**
 * Solid for paid, a ring for says paid, hatched for not yet and a dashed box
 * for a player who owes nothing.
 */
export function PaymentMarkIcon({
  mark,
  size = 18,
}: {
  mark: PaymentMark;
  size?: number;
}) {
  const colors = useColors();
  const radius = Math.round(size * 0.3);
  const box = {
    width: size,
    height: size,
    borderRadius: radius,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    flexShrink: 0,
  };
  if (mark === "paid") {
    return (
      <View style={[box, { backgroundColor: colors.control }]}>
        <Check size={Math.round(size * 0.72)} color={colors.onControl} />
      </View>
    );
  }
  if (mark === "claimed") {
    const inner = Math.max(2, Math.round(size * 0.45));
    return (
      <View style={[box, { borderWidth: RING_WIDTH, borderColor: colors.ink }]}>
        <View
          style={{
            width: inner,
            height: inner,
            borderRadius: 2,
            backgroundColor: colors.ink,
          }}
        />
      </View>
    );
  }
  if (mark === "free") {
    return (
      <View
        style={[
          box,
          { borderWidth: 1, borderStyle: "dashed", borderColor: colors.muted },
        ]}
      />
    );
  }
  return (
    <View style={box}>
      <Hatch radius={radius} />
    </View>
  );
}

const LEGEND: readonly PaymentMark[] = ["paid", "claimed", "due", "free"];

export function PaymentLegend({
  marks = LEGEND,
}: {
  marks?: readonly PaymentMark[];
}) {
  const copy = useMessages().gamePayments.mark;
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        columnGap: 14,
        rowGap: 6,
      }}
    >
      {marks.map((mark) => (
        <View
          key={mark}
          style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
        >
          <PaymentMarkIcon mark={mark} size={12} />
          <Text size="eyebrow" tone="muted">
            {copy[mark]}
          </Text>
        </View>
      ))}
    </View>
  );
}
