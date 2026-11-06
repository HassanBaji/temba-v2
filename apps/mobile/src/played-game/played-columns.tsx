import {
  bibColors,
  radii,
  type ColorScheme,
  type Palette,
} from "@repo/design-tokens";
import type { FootballBib } from "@repo/domain/football-lineup";
import {
  playedWordLabel,
  type PlayedColumn,
  type PlayedRow,
} from "@repo/domain/played-game";
import { Pressable, View } from "react-native";

import { bibEdge } from "../football/bib-edge";
import { BibChip } from "../football/bib-picker";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Avatar } from "../primitives/avatar";
import { hairline } from "../primitives/hairline-width";
import { ResultMark } from "../primitives/result-mark";
import { Text } from "../primitives/text";
import { useColors, useColorSchemeName } from "../theme/theme-provider";

const ROW_HEIGHT = 48;
const YOU_RING = 2;
const SWATCH = 14;

type Fill = PlayedColumn["fill"] | FootballBib;

function rowColors(
  row: PlayedRow,
  fill: Fill,
  colors: Palette,
  scheme: ColorScheme,
) {
  if (row.isYou) {
    return {
      background: colors.paper,
      foreground: colors.ink,
      border: colors.ink,
      borderWidth: YOU_RING,
    };
  }
  if (fill === "ink") {
    return {
      background: colors.control,
      foreground: colors.onControl,
      border: colors.controlEdge,
      borderWidth: hairline,
    };
  }
  if (fill === "paper") {
    return {
      background: colors.paper,
      foreground: colors.ink,
      border: colors.inputBorder,
      borderWidth: hairline,
    };
  }
  const { fill: background, on } = bibColors[fill];
  return {
    background,
    foreground: on,
    border: bibEdge(background, colors, scheme),
    borderWidth: hairline,
  };
}

function PlayerRow({
  row,
  fill,
  onPress,
}: {
  row: PlayedRow;
  fill: Fill;
  onPress?: () => void;
}) {
  const colors = useColors();
  const scheme = useColorSchemeName();
  const m = useMessages();
  const { background, foreground, border, borderWidth } = rowColors(
    row,
    fill,
    colors,
    scheme,
  );
  const label = m.profile.matches.spokenParts(
    [
      row.isYou ? m.game.score.youSuffix(row.fullName) : row.fullName,
      row.meta,
      m.mobilePlayer.played.levelLine(row.level),
      row.trailing,
    ].filter((part): part is string => Boolean(part)),
  );
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={label}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({
        height: ROW_HEIGHT,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 8,
        borderRadius: radii.md,
        backgroundColor: background,
        borderWidth,
        borderColor: border,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Avatar name={row.fullName} uri={row.image} size="sm" />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          size="meta"
          weight={row.isYou ? "semibold" : "regular"}
          numberOfLines={1}
          style={{ color: foreground }}
        >
          {row.name}
        </Text>
        {row.meta ? (
          <Text
            size="eyebrow"
            mono
            numberOfLines={1}
            style={{ color: foreground, opacity: 0.7 }}
          >
            {row.meta}
          </Text>
        ) : null}
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text
          size="meta"
          width="expanded"
          weight="bold"
          style={{ color: foreground }}
        >
          {row.level}
        </Text>
        {row.trailing ? (
          <Text
            size="eyebrow"
            mono
            numberOfLines={1}
            style={{ color: foreground, opacity: 0.7 }}
          >
            {row.trailing}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function Swatch({ fill }: { fill: Fill }) {
  const colors = useColors();
  if (fill !== "ink" && fill !== "paper") {
    return <BibChip bib={fill} size={SWATCH} />;
  }
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: SWATCH,
        height: SWATCH,
        borderRadius: radii.slot - 1,
        backgroundColor: fill === "ink" ? colors.ink : colors.paper,
        borderWidth: hairline,
        borderColor: fill === "ink" ? colors.ink : colors.inputBorder,
      }}
    />
  );
}

function Column({
  column,
  onPressPlayer,
}: {
  column: PlayedColumn;
  onPressPlayer?: (row: PlayedRow) => void;
}) {
  const locale = useLocale();
  const m = useMessages();
  const fill: Fill = column.bib ?? column.fill;
  const word = playedWordLabel(column.word, locale);
  return (
    <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
      <View
        accessible
        accessibilityRole="header"
        accessibilityLabel={m.mobilePlayer.played.columnSpoken(
          column.title,
          word,
        )}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          paddingHorizontal: 2,
          paddingBottom: 6,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            flexShrink: 1,
          }}
        >
          <Swatch fill={fill} />
          <Text size="meta" weight="semibold" numberOfLines={1}>
            {column.title}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {column.won ? (
            <ResultMark variant="won" size={14} decorative />
          ) : null}
          <Text size="eyebrow" tone="muted">
            {word}
          </Text>
        </View>
      </View>
      {column.players.map((row) => (
        <PlayerRow
          key={row.userId}
          row={row}
          fill={fill}
          onPress={onPressPlayer ? () => onPressPlayer(row) : undefined}
        />
      ))}
    </View>
  );
}

/** The two rosters side by side, then anyone on neither. */
export function PlayedColumns({
  columns,
  unplaced = [],
  onPressPlayer,
}: {
  columns: [PlayedColumn, PlayedColumn];
  unplaced?: PlayedRow[];
  onPressPlayer?: (row: PlayedRow) => void;
}) {
  const m = useMessages();
  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
        <Column column={columns[0]} onPressPlayer={onPressPlayer} />
        <Column column={columns[1]} onPressPlayer={onPressPlayer} />
      </View>
      {unplaced.length > 0 ? (
        <View style={{ gap: 6 }}>
          <Text size="eyebrow" tone="muted" accessibilityRole="header">
            {m.mobilePlayer.played.notOnATeam}
          </Text>
          {unplaced.map((row) => (
            <PlayerRow
              key={row.userId}
              row={row}
              fill="paper"
              onPress={onPressPlayer ? () => onPressPlayer(row) : undefined}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
