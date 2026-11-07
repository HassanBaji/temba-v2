import { bibColors, radii, spacing } from "@repo/design-tokens";
import type { GroupPlayedGameData } from "@repo/domain/group-data";
import {
  groupPlayedFilterChips,
  groupPlayedListItems,
  groupPlayedRecordLine,
  type GroupPlayedCard,
  type GroupPlayedFilterChip,
  type GroupPlayedSide,
} from "@repo/domain/group-played-card";
import type {
  GroupPlayedCounts,
  GroupPlayedFilter,
} from "@repo/domain/group-played-filter";
import { Pressable, ScrollView, View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { hairline } from "../primitives/hairline-width";
import { ResultMark } from "../primitives/result-mark";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";

const CHIP_HEIGHT = 40;
const CARD_PADDING_X = 16;
const CARD_PADDING_Y = 14;
const SWATCH = 10;
const CELL_MIN_WIDTH = 20;
const DOT = 6;

export type PlayedGamesProps = {
  games: GroupPlayedGameData[];
  counts: GroupPlayedCounts;
  filter: GroupPlayedFilter;
  onFilterChange: (filter: GroupPlayedFilter) => void;
  /** The list still shows the previous filter while the new one loads. */
  filtering: boolean;
  sport: string | null;
  canLoadMore: boolean;
  loadingMore: boolean;
  loadMoreFailed: boolean;
  onLoadMore: () => void;
  onOpen: (gameId: string) => void;
  onEnterScore: (card: GroupPlayedCard) => void;
};

function FilterChip({
  chip,
  onPress,
}: {
  chip: GroupPlayedFilterChip;
  onPress: () => void;
}) {
  const colors = useColors();
  const { selected } = chip;
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={chip.accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => ({
        height: CHIP_HEIGHT,
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        borderRadius: radii.md,
        borderWidth: hairline,
        borderColor: selected ? colors.ink : colors.rule,
        backgroundColor: selected ? colors.control : colors.paper,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      {chip.dot ? (
        <View
          style={{
            width: DOT,
            height: DOT,
            borderRadius: DOT / 2,
            backgroundColor: colors.ink,
          }}
        />
      ) : null}
      <Text
        weight={selected ? "semibold" : "regular"}
        style={selected ? { color: colors.onControl } : undefined}
      >
        {chip.label}
      </Text>
      <Text
        size="eyebrow"
        mono
        tone="muted"
        style={selected ? { color: colors.dim } : undefined}
      >
        {chip.count}
      </Text>
    </Pressable>
  );
}

function SideRow({
  side,
  isFootball,
}: {
  side: GroupPlayedSide;
  isFootball: boolean;
}) {
  const m = useMessages();
  const colors = useColors();
  const weakCell = isFootball ? colors.muted : colors.dim;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      {side.bib ? (
        <View
          style={{
            width: SWATCH,
            height: SWATCH,
            borderRadius: 3,
            backgroundColor: bibColors[side.bib].fill,
            borderWidth: hairline,
            borderColor:
              side.bib === "white"
                ? colors.inputBorder
                : bibColors[side.bib].fill,
          }}
        />
      ) : null}
      <Text
        numberOfLines={1}
        tone={side.strong ? "default" : "muted"}
        style={{ flex: 1, minWidth: 0 }}
      >
        {side.name}
        {isFootball && side.isViewerSide ? (
          <Text style={{ color: colors.dim }}>{`  ${m.group.played.you}`}</Text>
        ) : null}
      </Text>
      <View style={{ flexDirection: "row", gap: 4, direction: "ltr" }}>
        {side.cells.map((cell, index) => (
          <Text
            key={index}
            size="lead"
            width="expanded"
            weight="bold"
            style={{
              minWidth: CELL_MIN_WIDTH,
              textAlign: "center",
              color: cell.strong ? colors.ink : weakCell,
            }}
          >
            {cell.value}
          </Text>
        ))}
      </View>
    </View>
  );
}

function PlayedCard({
  card,
  onOpen,
  onEnterScore,
}: {
  card: GroupPlayedCard;
  onOpen: (gameId: string) => void;
  onEnterScore: (card: GroupPlayedCard) => void;
}) {
  const m = useMessages();
  const colors = useColors();
  const cancelled = card.status === "cancelled";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={card.accessibilityLabel}
      onPress={() => onOpen(card.id)}
      style={({ pressed }) => ({
        borderWidth: hairline,
        borderColor: pressed ? colors.ink : colors.rule,
        borderRadius: radii.card,
        paddingHorizontal: CARD_PADDING_X,
        paddingVertical: CARD_PADDING_Y,
        gap: 12,
        backgroundColor: colors.paper,
      })}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}
      >
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <Text
            weight="semibold"
            numberOfLines={1}
            tone={cancelled ? "muted" : "default"}
          >
            {card.title}
          </Text>
          <Text size="meta" tone="muted" numberOfLines={1}>
            {card.whenLine}
          </Text>
        </View>
        {card.result ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingTop: 2,
            }}
          >
            <ResultMark variant={card.result.mark} size={14} decorative />
            <Text size="eyebrow" tone="muted">
              {card.result.label}
            </Text>
          </View>
        ) : null}
        {cancelled ? (
          <View
            style={{
              marginTop: 2,
              paddingHorizontal: 5,
              paddingVertical: 2,
              borderRadius: 4,
              borderWidth: 1,
              borderStyle: "dashed",
              borderColor: colors.dim,
            }}
          >
            <Text size="eyebrow" mono tone="muted" uppercase>
              {m.group.played.cancelled}
            </Text>
          </View>
        ) : null}
      </View>
      {card.sides ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{ flex: 1, minWidth: 0, gap: 6 }}
          >
            {card.sides.map((side) => (
              <SideRow
                key={side.key}
                side={side}
                isFootball={card.isFootball}
              />
            ))}
          </View>
          {card.status === "needs_score" ? (
            <Button
              label={m.group.played.enterScore}
              onPress={() => onEnterScore(card)}
            />
          ) : null}
        </View>
      ) : null}
      {card.cancelledLine ? (
        <Text
          size="meta"
          tone="muted"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {card.cancelledLine}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function PlayedGames(props: PlayedGamesProps) {
  const locale = useLocale();
  const m = useMessages();
  const colors = useColors();
  const copy = m.mobileGroup.games;
  const played = m.group.played;
  const record = groupPlayedRecordLine(props.counts, props.sport, locale);
  const chips = groupPlayedFilterChips(props.counts, props.filter, locale);
  const items = groupPlayedListItems(props.games, locale);

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
          {copy.played}
        </Text>
        {record ? (
          <Text
            size="eyebrow"
            mono
            tone="muted"
            accessibilityLabel={record.accessibilityLabel}
          >
            {record.text}
          </Text>
        ) : null}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityRole="tablist"
        accessibilityLabel={played.filtersLabel}
        style={{ marginHorizontal: -spacing.surface }}
        contentContainerStyle={{
          gap: 8,
          paddingHorizontal: spacing.surface,
        }}
      >
        {chips.map((chip) => (
          <FilterChip
            key={chip.filter}
            chip={chip}
            onPress={() => props.onFilterChange(chip.filter)}
          />
        ))}
      </ScrollView>
      <View
        accessibilityState={{ busy: props.filtering }}
        style={{ gap: 8, opacity: props.filtering ? 0.5 : 1 }}
      >
        {items.map((item) =>
          item.kind === "month" ? (
            <View
              key={item.key}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingTop: 10,
                paddingHorizontal: 2,
                paddingBottom: 2,
              }}
            >
              <Text size="eyebrow" mono tone="muted" uppercase>
                {item.label}
              </Text>
              <Text size="eyebrow" mono tone="muted">
                {item.count}
              </Text>
            </View>
          ) : (
            <PlayedCard
              key={item.key}
              card={item.card}
              onOpen={props.onOpen}
              onEnterScore={props.onEnterScore}
            />
          ),
        )}
        {items.length === 0 ? (
          <View
            style={{
              borderWidth: hairline,
              borderColor: colors.rule,
              borderRadius: radii.card,
              paddingHorizontal: CARD_PADDING_X + 2,
              paddingVertical: spacing.surface,
              alignItems: "flex-start",
              gap: 14,
            }}
          >
            <Text tone="muted">{played.filterEmpty[props.filter]}</Text>
            {props.filter !== "all" ? (
              <Button
                label={played.showAll}
                variant="outline"
                onPress={() => props.onFilterChange("all")}
              />
            ) : null}
          </View>
        ) : null}
      </View>
      {props.loadMoreFailed ? (
        <Text tone="muted" accessibilityRole="alert">
          {m.mobileGroup.loadFailed.moreGames}
        </Text>
      ) : null}
      {props.canLoadMore ? (
        <View style={{ alignItems: "center" }}>
          <Button
            label={copy.loadMore}
            variant="outline"
            pending={props.loadingMore}
            onPress={props.onLoadMore}
          />
        </View>
      ) : null}
    </View>
  );
}
