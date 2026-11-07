import { colors, radii, sizes } from "@repo/design-tokens";
import type { FootballBib } from "@repo/domain/football-lineup";
import type { MatchSlot } from "@repo/domain/marks";
import { Pressable, View } from "react-native";

import { BibChip } from "../football/bib-picker";
import { Avatar } from "../primitives/avatar";
import { hairline } from "../primitives/hairline-width";
import { Text } from "../primitives/text";
import { CoinStack } from "./coin-stack";
import type { RosterModel, RosterRow } from "./marks-model";

const SWATCH = 12;
const ROW_MIN_HEIGHT = 56;
const COUNT_WIDTH = 26;

function SideSwatch({
  slot,
  bib,
}: {
  slot: MatchSlot;
  bib: FootballBib | null;
}) {
  if (bib) {
    return <BibChip bib={bib} size={SWATCH} />;
  }
  const ink = slot === 1;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: SWATCH,
        height: SWATCH,
        borderRadius: radii.slot - 2,
        backgroundColor: ink ? colors.ink : colors.paper,
        borderWidth: hairline,
        borderColor: ink ? colors.ink : colors.inputBorder,
      }}
    />
  );
}

function Row({
  row,
  first,
  onPressCoins,
}: {
  row: RosterRow;
  first: boolean;
  onPressCoins: (userId: string) => void;
}) {
  return (
    <View
      style={{
        minHeight: ROW_MIN_HEIGHT,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderTopWidth: first ? 0 : hairline,
        borderColor: colors.rule,
      }}
    >
      <Avatar name={row.fullName} uri={row.image} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text size="meta" weight="semibold" numberOfLines={1}>
          {row.name}
        </Text>
        {row.sub ? (
          <Text size="eyebrow" tone="muted" numberOfLines={1}>
            {row.sub}
          </Text>
        ) : null}
      </View>
      {row.coinsSpoken ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={row.coinsSpoken}
          hitSlop={8}
          onPress={() => onPressCoins(row.userId)}
          style={({ pressed }) => ({
            minHeight: sizes.touchTarget - 8,
            justifyContent: "center",
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <CoinStack kinds={row.coins} size="roster" />
        </Pressable>
      ) : null}
      <View style={{ width: COUNT_WIDTH, alignItems: "flex-end" }}>
        {row.count ? (
          <Text size="eyebrow" tone="muted" mono ltr>
            {row.count}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** "Marks so far" (2a) and "Marks" (2f): each side's participants and their coins. */
export function MarksRoster({
  roster,
  onPressCoins,
}: {
  roster: RosterModel;
  onPressCoins: (userId: string) => void;
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
        <Text size="title" width="expanded" accessibilityRole="header">
          {roster.title}
        </Text>
        <Text size="meta" tone="muted">
          {roster.meta}
        </Text>
      </View>
      <View
        style={{
          borderWidth: hairline,
          borderColor: colors.rule,
          borderRadius: radii.card,
          overflow: "hidden",
        }}
      >
        {roster.sides.map((side, sideIndex) => (
          <View
            key={side.slot}
            style={{
              borderTopWidth: sideIndex === 0 ? 0 : hairline,
              borderColor: colors.rule,
            }}
          >
            <View
              accessibilityRole="header"
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingTop: sideIndex === 0 ? 10 : 14,
                paddingBottom: 6,
                paddingHorizontal: 16,
              }}
            >
              <SideSwatch slot={side.slot} bib={side.bib} />
              <Text size="eyebrow" tone="muted">
                {side.label}
              </Text>
            </View>
            {side.rows.map((row, index) => (
              <Row
                key={row.userId}
                row={row}
                first={index === 0}
                onPressCoins={onPressCoins}
              />
            ))}
          </View>
        ))}
      </View>
      {roster.footnote ? (
        <Text size="eyebrow" tone="muted">
          {roster.footnote}
        </Text>
      ) : null}
    </View>
  );
}
