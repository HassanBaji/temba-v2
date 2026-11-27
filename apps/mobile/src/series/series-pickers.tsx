import { radii } from "@repo/design-tokens";
import {
  seriesBadgeColours,
  seriesBadgeViewBox,
  seriesEmblems,
} from "@repo/design-tokens/series";
import {
  SERIES_COLOURS,
  SERIES_EMBLEMS,
  type SeriesColour,
  type SeriesEmblem,
} from "@repo/domain/series";
import { Pressable, View } from "react-native";
import Svg from "react-native-svg";

import { useMessages } from "../i18n/locale-provider";
import { CoinShape } from "../marks/mark-coin";
import { hairline } from "../primitives/hairline-width";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";

const EMBLEM_GLYPH = 28;
const EMBLEM_CHIP_HEIGHT = 48;
const COLOUR_DOT = 24;
const COLOUR_CHIP_HEIGHT = 44;
const CHIP_GAP = 6;
const SELECTED_BORDER = 2;

/** The emblem alone, in ink: its body and accents, without the badge's shadow. */
function EmblemGlyph({ emblem }: { emblem: SeriesEmblem }) {
  const colors = useColors();
  return (
    <Svg
      width={EMBLEM_GLYPH}
      height={EMBLEM_GLYPH}
      viewBox={`0 0 ${seriesBadgeViewBox} ${seriesBadgeViewBox}`}
    >
      {seriesEmblems[emblem]
        .filter((element) => element.tone !== "shade")
        .map((element, index) => (
          <CoinShape key={index} element={element} colour={colors.ink} />
        ))}
    </Svg>
  );
}

function Chip({
  label,
  selected,
  height,
  onSelect,
  children,
}: {
  label: string;
  selected: boolean;
  height: number;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onSelect}
      style={({ pressed }) => ({
        flex: 1,
        minWidth: 0,
        height,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radii.lg,
        borderWidth: selected ? SELECTED_BORDER : hairline,
        borderColor: selected ? colors.ink : colors.rule,
        backgroundColor: pressed && !selected ? colors.wash : colors.paper,
      })}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {children}
      </View>
    </Pressable>
  );
}

function Picker({
  title,
  picked,
  children,
}: {
  title: string;
  picked: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 12 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Text size="title" weight="semibold" accessibilityRole="header">
          {title}
        </Text>
        <Text size="meta" tone="muted" numberOfLines={1}>
          {picked}
        </Text>
      </View>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={title}
        style={{ flexDirection: "row", gap: CHIP_GAP }}
      >
        {children}
      </View>
    </View>
  );
}

export function SeriesEmblemPicker({
  value,
  onChange,
}: {
  value: SeriesEmblem;
  onChange: (emblem: SeriesEmblem) => void;
}) {
  const m = useMessages();
  return (
    <Picker title={m.series.create.emblem} picked={m.series.emblems[value]}>
      {SERIES_EMBLEMS.map((emblem) => (
        <Chip
          key={emblem}
          label={m.series.emblems[emblem]}
          selected={emblem === value}
          height={EMBLEM_CHIP_HEIGHT}
          onSelect={() => onChange(emblem)}
        >
          <EmblemGlyph emblem={emblem} />
        </Chip>
      ))}
    </Picker>
  );
}

export function SeriesColourPicker({
  value,
  onChange,
}: {
  value: SeriesColour;
  onChange: (colour: SeriesColour) => void;
}) {
  const m = useMessages();
  return (
    <Picker title={m.series.create.colour} picked={m.series.colours[value]}>
      {SERIES_COLOURS.map((colour) => (
        <Chip
          key={colour}
          label={m.series.colours[colour]}
          selected={colour === value}
          height={COLOUR_CHIP_HEIGHT}
          onSelect={() => onChange(colour)}
        >
          <View
            style={{
              width: COLOUR_DOT,
              height: COLOUR_DOT,
              borderRadius: COLOUR_DOT / 2,
              backgroundColor: seriesBadgeColours[colour].disc,
            }}
          />
        </Chip>
      ))}
    </Picker>
  );
}
