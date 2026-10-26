import { bibColors, colors, radii } from "@repo/design-tokens";
import {
  footballBibName,
  MORE_FOOTBALL_BIBS,
  pickFootballBib,
  PRIMARY_FOOTBALL_BIBS,
  type FootballBib,
} from "@repo/domain/football-lineup";
import { Plus } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { hairline } from "../primitives/hairline-width";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import type { Bibs, Side } from "@repo/domain/football-board";

const SWATCH = 30;
const RING = 2;

/** A square chip in a team's bib colour, for headers and rows. */
export function BibChip({
  bib,
  size = 12,
}: {
  bib: FootballBib;
  size?: number;
}) {
  const { fill } = bibColors[bib];
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size / 4),
        backgroundColor: fill,
        borderWidth: hairline,
        borderColor: fill === colors.paper ? colors.inputBorder : fill,
      }}
    />
  );
}

function Swatch({
  bib,
  selected,
  label,
  onPress,
}: {
  bib: FootballBib;
  selected: boolean;
  label: string;
  onPress: () => void;
}) {
  const { fill } = bibColors[bib];
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={{
        width: SWATCH + RING * 4,
        height: SWATCH + RING * 4,
        borderRadius: SWATCH,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: RING,
        borderColor: selected ? colors.ink : "transparent",
      }}
    >
      <View
        style={{
          width: SWATCH,
          height: SWATCH,
          borderRadius: SWATCH / 2,
          backgroundColor: fill,
          borderWidth: hairline,
          borderColor: fill === colors.paper ? colors.inputBorder : fill,
        }}
      />
    </Pressable>
  );
}

function MoreSwatch({ open, onPress }: { open: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="More colours"
      accessibilityState={{ expanded: open }}
      onPress={onPress}
      style={{
        width: SWATCH + RING * 4,
        height: SWATCH + RING * 4,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          width: SWATCH,
          height: SWATCH,
          borderRadius: SWATCH / 2,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: hairline,
          borderColor: open ? colors.ink : colors.inputBorder,
        }}
      >
        <Plus size={16} color={colors.ink} />
      </View>
    </Pressable>
  );
}

function SideRow({
  side,
  bibs,
  onChange,
}: {
  side: Side;
  bibs: Bibs;
  onChange: (bibs: Bibs) => void;
}) {
  const current = side === 1 ? bibs.slot1 : bibs.slot2;
  const [more, setMore] = useState(MORE_FOOTBALL_BIBS.includes(current));
  const label = side === 1 ? "Team A" : "Team B";
  const swatch = (bib: FootballBib) => (
    <Swatch
      key={bib}
      bib={bib}
      selected={bib === current}
      label={`${label}, ${footballBibName(bib, side)}`}
      onPress={() => onChange(pickFootballBib(bibs, side, bib))}
    />
  );
  return (
    <View style={{ gap: 6 }}>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={`${label} bib colour`}
        style={{ flexDirection: "row", alignItems: "center", gap: 2 }}
      >
        <Text size="meta" tone="muted" style={{ width: 64 }}>
          {label}
        </Text>
        {PRIMARY_FOOTBALL_BIBS.map(swatch)}
        <MoreSwatch open={more} onPress={() => setMore((open) => !open)} />
      </View>
      {more ? (
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 2,
            paddingLeft: 64,
          }}
        >
          {MORE_FOOTBALL_BIBS.map(swatch)}
        </View>
      ) : null}
    </View>
  );
}

export function BibPicker({
  bibs,
  onChange,
}: {
  bibs: Bibs;
  onChange: (bibs: Bibs) => void;
}) {
  return (
    <Surface style={{ gap: 10, borderRadius: radii.surface }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text size="meta" tone="muted">
          Bib colours
        </Text>
        <Text size="meta" tone="muted">
          {footballBibName(bibs.slot1, 1)} vs {footballBibName(bibs.slot2, 2)}
        </Text>
      </View>
      <SideRow side={1} bibs={bibs} onChange={onChange} />
      <SideRow side={2} bibs={bibs} onChange={onChange} />
      <Text size="meta" tone="muted">
        The plus opens more colours. The organizer brings both sets of bibs.
      </Text>
    </Surface>
  );
}
