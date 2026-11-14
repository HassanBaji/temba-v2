import type { PaymentMark } from "@repo/domain/game-payments";
import { ChevronDown, ChevronRight } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { mirrorInRtl } from "../i18n/rtl";
import { useMessages } from "../i18n/locale-provider";
import { hairline } from "../primitives/hairline-width";
import { InitialsTile } from "../primitives/initials-tile";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import { PaymentBox, PaymentSectionHead } from "./payment-card";
import { PaymentLegend, PaymentMarkIcon } from "./payment-mark";
import type { TrackedGamePayments } from "./use-game-payments";

const COLLAPSED_ROWS = 5;

/**
 * What everyone sees on the Game: the mark next to each name, no amounts or
 * notes (design Payments 2c). The Organizer gets a way into the full list.
 */
export function PaymentLineup({
  payments,
  onManage,
}: {
  payments: TrackedGamePayments;
  onManage?: () => void;
}) {
  const colors = useColors();
  const m = useMessages().gamePayments;
  const [expanded, setExpanded] = useState(false);
  const rows = expanded
    ? payments.players
    : payments.players.slice(0, COLLAPSED_ROWS);
  const hidden = payments.players.length - rows.length;
  const marks = new Set<PaymentMark>(payments.players.map((row) => row.mark));

  if (payments.players.length === 0) {
    return null;
  }

  return (
    <View style={{ gap: 10 }}>
      <PaymentSectionHead
        title={m.organizer.title}
        meta={m.lineup.paidCount(payments.tally.paid, payments.tally.payers)}
      />
      <PaymentBox>
        {rows.map((row, index) => (
          <View
            key={row.userId}
            accessible
            accessibilityLabel={`${row.isViewer ? m.organizer.you : row.name}, ${m.mark[row.mark]}`}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 11,
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderTopWidth: index === 0 ? 0 : hairline,
              borderTopColor: colors.rule,
            }}
          >
            <InitialsTile name={row.name} uri={row.image} size="xs" />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text weight="semibold" numberOfLines={1}>
                {row.isViewer ? m.organizer.you : row.name}
              </Text>
              <Text size="eyebrow" tone="muted">
                {m.mark[row.mark]}
              </Text>
            </View>
            <PaymentMarkIcon mark={row.mark} />
          </View>
        ))}
        {hidden > 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setExpanded(true)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderTopWidth: hairline,
              borderTopColor: colors.rule,
            }}
          >
            <Text size="meta" weight="semibold">
              {m.lineup.more(hidden)}
            </Text>
            <ChevronDown size={16} color={colors.ink} />
          </Pressable>
        ) : null}
        {onManage ? (
          <Pressable
            accessibilityRole="button"
            onPress={onManage}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderTopWidth: hairline,
              borderTopColor: colors.rule,
            }}
          >
            <Text size="meta" weight="semibold">
              {m.lineup.manage}
            </Text>
            <ChevronRight size={16} color={colors.ink} style={mirrorInRtl} />
          </Pressable>
        ) : null}
      </PaymentBox>
      <PaymentLegend
        marks={(["paid", "claimed", "due", "free"] as const).filter((mark) =>
          marks.has(mark),
        )}
      />
    </View>
  );
}
