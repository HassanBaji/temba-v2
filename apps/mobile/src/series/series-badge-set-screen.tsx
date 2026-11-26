import {
  seriesBadgeSizes,
  type SeriesBadgeSize,
} from "@repo/design-tokens/series";
import {
  DEFAULT_SERIES_COLOUR,
  DEFAULT_SERIES_EMBLEM,
  SERIES_COLOURS,
  SERIES_EMBLEMS,
} from "@repo/domain/series";
import { View } from "react-native";

import { useMessages } from "../i18n/locale-provider";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { SeriesBadge } from "./series-badge";

const SIZES = Object.keys(seriesBadgeSizes) as SeriesBadgeSize[];
const LIFTED_COUNTS = [1, 2, 9, 12, 30, 120];
const BADGE_GAP = 16;
const ROW_GAP = 20;
const LABEL_GAP = 8;

/** Development only: every size with and without a count, then all 42 badges. */
export function SeriesBadgeSetScreen() {
  const m = useMessages();

  return (
    <Screen>
      <ScreenHeader
        nav="back"
        fallback="/profile"
        title={m.series.gallery.title}
      />
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "flex-end",
          columnGap: BADGE_GAP * 2,
          rowGap: ROW_GAP,
        }}
      >
        {SIZES.map((size, index) => (
          <View key={size} style={{ alignItems: "center", gap: LABEL_GAP }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-end",
                gap: BADGE_GAP,
              }}
            >
              <SeriesBadge
                emblem={DEFAULT_SERIES_EMBLEM}
                colour={DEFAULT_SERIES_COLOUR}
                size={size}
              />
              <SeriesBadge
                emblem={DEFAULT_SERIES_EMBLEM}
                colour={DEFAULT_SERIES_COLOUR}
                size={size}
                count={index + 1}
              />
            </View>
            <Text size="meta" tone="muted" mono ltr>
              {seriesBadgeSizes[size]}
            </Text>
          </View>
        ))}
      </View>
      <Surface tone="ink">
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            columnGap: BADGE_GAP * 2,
            rowGap: ROW_GAP,
          }}
        >
          {SERIES_COLOURS.map((colour, index) => (
            <SeriesBadge
              key={colour}
              emblem={DEFAULT_SERIES_EMBLEM}
              colour={colour}
              size="card"
              count={LIFTED_COUNTS[index]}
              surface="focus"
            />
          ))}
        </View>
      </Surface>
      <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: ROW_GAP }}>
        {SERIES_EMBLEMS.flatMap((emblem) =>
          SERIES_COLOURS.map((colour) => (
            <View
              key={`${emblem}-${colour}`}
              style={{ width: "33.333%", alignItems: "center", gap: LABEL_GAP }}
            >
              <SeriesBadge emblem={emblem} colour={colour} size="card" />
              <View style={{ alignItems: "center" }}>
                <Text size="meta" weight="semibold">
                  {m.series.emblems[emblem]}
                </Text>
                <Text size="eyebrow" tone="muted">
                  {m.series.colours[colour]}
                </Text>
              </View>
            </View>
          )),
        )}
      </View>
    </Screen>
  );
}
