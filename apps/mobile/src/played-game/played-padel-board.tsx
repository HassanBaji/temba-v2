import {
  playedWordLabel,
  type PlayedPadelBoardRow,
} from "@repo/domain/played-game";
import { View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Hairline } from "../primitives/hairline";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";

const SET_CELL = 34;
const SET_GAP = 14;

function SetCells({ sets }: { sets: PlayedPadelBoardRow["sets"] }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", gap: SET_GAP }}>
      {sets.map((set) => (
        <Text
          key={set.id}
          size="statTotal"
          width="expanded"
          weight="bold"
          style={{
            width: SET_CELL,
            textAlign: "center",
            color: set.won ? colors.onFocus : colors.muted,
          }}
        >
          {String(set.value)}
        </Text>
      ))}
    </View>
  );
}

function PairRow({ row }: { row: PlayedPadelBoardRow }) {
  const colors = useColors();
  const locale = useLocale();
  const m = useMessages();
  const word = playedWordLabel(row.word, locale);
  return (
    <View
      accessible
      accessibilityLabel={m.mobilePlayer.played.pairRowSpoken(
        row.line,
        word,
        row.sets.map((set) => String(set.value)),
      )}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
      }}
    >
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text
          weight="semibold"
          numberOfLines={1}
          style={{ color: row.won ? colors.onFocus : colors.dim }}
        >
          {row.line}
        </Text>
        <Text size="meta" tone="muted">
          {word}
        </Text>
      </View>
      <SetCells sets={row.sets} />
    </View>
  );
}

/** Sets won read across; the side that took each Set is full ink. */
export function PlayedPadelBoard({
  setLabels,
  rows,
}: {
  setLabels: string[];
  rows: [PlayedPadelBoardRow, PlayedPadelBoardRow];
}) {
  return (
    <View style={{ gap: 10 }}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          flexDirection: "row",
          justifyContent: "flex-end",
          gap: SET_GAP,
        }}
      >
        {setLabels.map((label) => (
          <Text
            key={label}
            size="eyebrow"
            tone="muted"
            mono
            style={{ width: SET_CELL, textAlign: "center" }}
          >
            {label}
          </Text>
        ))}
      </View>
      <PairRow row={rows[0]} />
      <Hairline />
      <PairRow row={rows[1]} />
    </View>
  );
}
