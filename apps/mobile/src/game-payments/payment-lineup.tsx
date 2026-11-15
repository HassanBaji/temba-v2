import {
  paymentLineupGroups,
  type PaymentLineupGroup,
  type PaymentMark,
} from "@repo/domain/game-payments";
import { ChevronDown, ChevronRight } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { mirrorInRtl } from "../i18n/rtl";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { hairline } from "../primitives/hairline-width";
import { InitialsTile } from "../primitives/initials-tile";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import { PaymentBox, PaymentSectionHead } from "./payment-card";
import { PaymentLegend, PaymentMarkIcon } from "./payment-mark";
import type { TrackedGamePayments } from "./use-game-payments";

const COLLAPSED_ROWS = 5;
const LEGEND_ORDER: readonly PaymentMark[] = ["paid", "claimed", "due", "free"];
const FOOTER_ROW = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: 16,
  paddingVertical: 12,
} as const;

function LineupGroup({ group }: { group: PaymentLineupGroup }) {
  const colors = useColors();
  const m = useMessages().gamePayments;
  const [expanded, setExpanded] = useState(false);
  const rows = expanded ? group.rows : group.rows.slice(0, COLLAPSED_ROWS);
  const hidden = group.rows.length - rows.length;
  return (
    <View style={{ gap: 10 }}>
      <PaymentSectionHead title={group.title} meta={group.paidLine} />
      <PaymentBox>
        {rows.map((row, index) => (
          <View
            key={row.userId}
            accessible
            accessibilityLabel={`${row.displayName}, ${row.subline}`}
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
            <InitialsTile
              name={row.name}
              uri={row.image}
              size="xs"
              tone={row.isViewer ? "control" : "inverse"}
            />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text weight="semibold" numberOfLines={1}>
                {row.displayName}
              </Text>
              <Text size="eyebrow" tone="muted">
                {row.subline}
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
              ...FOOTER_ROW,
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
      </PaymentBox>
    </View>
  );
}

/**
 * What everyone sees on the Game: each side's players with the mark next to
 * each name, no amounts or notes (design Payments 2c). The Organizer gets a
 * way into the full list.
 */
export function PaymentLineup({
  payments,
  onManage,
}: {
  payments: TrackedGamePayments;
  onManage?: () => void;
}) {
  const colors = useColors();
  const locale = useLocale();
  const m = useMessages().gamePayments;
  const groups = paymentLineupGroups(payments, locale);
  const present = new Set(payments.players.map((row) => row.mark));

  if (groups.length === 0) {
    return null;
  }

  return (
    <View style={{ gap: 16 }}>
      {groups.map((group) => (
        <LineupGroup key={group.key} group={group} />
      ))}
      <PaymentLegend marks={LEGEND_ORDER.filter((mark) => present.has(mark))} />
      {onManage ? (
        <PaymentBox>
          <Pressable
            accessibilityRole="button"
            onPress={onManage}
            style={FOOTER_ROW}
          >
            <Text size="meta" weight="semibold">
              {m.lineup.manage}
            </Text>
            <ChevronRight size={16} color={colors.ink} style={mirrorInRtl} />
          </Pressable>
        </PaymentBox>
      ) : null}
    </View>
  );
}
