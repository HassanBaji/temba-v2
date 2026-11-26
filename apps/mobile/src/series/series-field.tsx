import { radii, sizes } from "@repo/design-tokens";
import { seriesBadgeSizes } from "@repo/design-tokens/series";
import { Check } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { useMessages } from "../i18n/locale-provider";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { SurfaceToneContext } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { tonePalette } from "../primitives/tone-palette";
import { useColors } from "../theme/theme-provider";
import type { SeriesAttachOption } from "./series-attach";
import { SeriesBadge } from "./series-badge";

const ROW_GAP = 6;
const TILE = seriesBadgeSizes.list;

function OptionRow({
  selected,
  onSelect,
  leading,
  title,
  hint,
}: {
  selected: boolean;
  onSelect: () => void;
  leading: React.ReactNode;
  title: string;
  hint: string;
}) {
  const colors = useColors();
  const tone = selected ? "ink" : "paper";
  const palette = tonePalette(tone, colors);
  const copy = useMessages().series.attach;
  return (
    <SurfaceToneContext.Provider value={tone}>
      <Pressable
        accessibilityRole="radio"
        accessibilityLabel={copy.rowA11y(title, hint)}
        accessibilityState={{ checked: selected }}
        onPress={onSelect}
        style={({ pressed }) => ({
          minHeight: sizes.touchTarget,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingVertical: 12,
          paddingHorizontal: 14,
          borderRadius: radii.lg,
          borderWidth: hairline,
          borderColor: selected ? colors.controlEdge : colors.rule,
          backgroundColor: selected
            ? colors.control
            : pressed
              ? colors.wash
              : colors.paper,
        })}
      >
        {leading}
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text weight={selected ? "semibold" : "regular"}>{title}</Text>
          <Text size="eyebrow" tone="muted">
            {hint}
          </Text>
        </View>
        {selected ? (
          <Check size={sizes.iconRow} color={palette.foreground} />
        ) : null}
      </Pressable>
    </SurfaceToneContext.Provider>
  );
}

/** "Not part of a series": not yet, so hatched. */
export function SeriesNoneTile() {
  return (
    <View style={{ width: TILE, height: TILE }}>
      <Hatch radius={radii.md} />
    </View>
  );
}

/**
 * One choice of Series for a Game, used by Create and by Edit game (design
 * 2a): "Not part of a series" first, then each running Series with the
 * Edition the Game would be.
 */
export function SeriesField({
  label,
  options,
  value,
  onChange,
  groupName,
  showNote = true,
}: {
  label: string;
  options: readonly SeriesAttachOption[];
  value: string | null;
  onChange: (seriesId: string | null) => void;
  groupName: string;
  /** Off where the surrounding sheet already says whose series these are. */
  showNote?: boolean;
}) {
  const copy = useMessages().series.attach;
  return (
    <View style={{ gap: 10 }}>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={label}
        style={{ gap: ROW_GAP }}
      >
        <OptionRow
          selected={value === null}
          onSelect={() => onChange(null)}
          leading={<SeriesNoneTile />}
          title={copy.none}
          hint={copy.noneHint}
        />
        {options.map((option) => {
          const selected = option.id === value;
          return (
            <OptionRow
              key={option.id}
              selected={selected}
              onSelect={() => onChange(option.id)}
              leading={
                <SeriesBadge
                  emblem={option.emblem}
                  colour={option.colour}
                  size="list"
                />
              }
              title={option.name}
              hint={
                selected
                  ? copy.willBe(option.edition)
                  : copy.wouldBe(option.edition)
              }
            />
          );
        })}
      </View>
      {showNote ? (
        <Text size="eyebrow" tone="muted">
          {copy.note(groupName)}
        </Text>
      ) : null}
    </View>
  );
}
