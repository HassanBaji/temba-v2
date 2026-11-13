import {
  ovrImpactView,
  type OvrImpactRow,
} from "@repo/domain/game-rating-impact";
import { View } from "react-native";

import { useLocale } from "../i18n/locale-provider";
import { Hairline } from "../primitives/hairline";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import { type RouterOutputs } from "../trpc/react";

type RatingImpact = RouterOutputs["games"]["byId"]["ratingImpact"];

/** "What moved your OVR" on a played football Game that counts for Temba Level. */
export function OvrImpactCard({
  ratingImpact,
}: {
  ratingImpact: RatingImpact;
}) {
  const locale = useLocale();
  if (!ratingImpact?.ovr) {
    return null;
  }
  const view = ovrImpactView(
    { ...ratingImpact, ovr: ratingImpact.ovr },
    locale,
  );

  return (
    <View style={{ gap: 10 }}>
      <Text size="eyebrow" weight="semibold">
        {view.tag}
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Text size="title" weight="semibold" accessibilityRole="header">
          {view.title}
        </Text>
        <Text size="meta" tone="muted">
          {view.aside}
        </Text>
      </View>
      <Surface padded={false} style={{ overflow: "hidden" }}>
        {view.rows.map((row, index) => (
          <View key={row.title}>
            {index > 0 ? <Hairline /> : null}
            <OvrRow row={row} />
          </View>
        ))}
        <Hairline />
        <OvrRow row={view.total} total />
      </Surface>
      {view.footnote ? (
        <Text size="meta" tone="muted">
          {view.footnote}
        </Text>
      ) : null}
    </View>
  );
}

function OvrRow({
  row,
  total = false,
}: {
  row: OvrImpactRow;
  total?: boolean;
}) {
  const colors = useColors();
  return (
    <View
      accessible
      accessibilityLabel={`${row.spoken}. ${row.detail}`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 13,
        backgroundColor: total ? colors.wash : undefined,
      }}
    >
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text weight="semibold">{row.title}</Text>
        <Text size="meta" tone="muted">
          {row.detail}
        </Text>
      </View>
      <Text size={total ? "h2" : "lead"} weight="bold" width="expanded">
        {row.delta}
      </Text>
    </View>
  );
}
