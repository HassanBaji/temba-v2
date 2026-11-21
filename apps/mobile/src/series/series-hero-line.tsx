import { View, type StyleProp, type ViewStyle } from "react-native";

import { useMessages } from "../i18n/locale-provider";
import { useSurfaceTone } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import type { SeriesAttachOption } from "./series-attach";
import { SeriesBadge } from "./series-badge";

export type SeriesHeroLineSeries = Pick<
  SeriesAttachOption,
  "name" | "emblem" | "colour" | "edition"
>;

/** A Game as `games.byId` returns it: its Series, or none. */
export type WithGameSeries = { series?: SeriesHeroLineSeries | null };

/**
 * The Game's Series and Edition on its lifted card (designs 2b and 2c). Its
 * muted text follows the surface it sits on.
 */
export function SeriesHeroLine({
  series,
  style,
}: {
  series: SeriesHeroLineSeries;
  style?: StyleProp<ViewStyle>;
}) {
  const m = useMessages().series.game;
  const tone = useSurfaceTone();
  return (
    <View
      accessible
      accessibilityLabel={m.facts(series.name, series.edition)}
      style={[
        { flexDirection: "row", alignItems: "center", gap: 8, minWidth: 0 },
        style,
      ]}
    >
      <SeriesBadge
        emblem={series.emblem}
        colour={series.colour}
        size="line"
        surface={tone === "ink" ? "focus" : "paper"}
      />
      <Text
        size="meta"
        weight="semibold"
        numberOfLines={1}
        style={{ flexShrink: 1 }}
      >
        {series.name}
      </Text>
      <Text size="meta" tone="muted" style={{ flexShrink: 0 }}>
        {m.heroEdition(series.edition)}
      </Text>
    </View>
  );
}
