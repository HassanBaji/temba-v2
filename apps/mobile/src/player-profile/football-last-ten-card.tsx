import { sizes, spacing } from "@repo/design-tokens";
import type { FootballMatchRowView } from "@repo/domain/player-profile-football";
import type { LastTenSummary } from "@repo/domain/player-profile-matches";
import { Pressable, View, type ViewStyle } from "react-native";

import { Card } from "../home/card";
import { Hairline } from "../primitives/hairline";
import { ResultMark } from "../primitives/result-mark";
import { Text } from "../primitives/text";
import { LastTenMarks } from "./last-ten-card";

const ROW: ViewStyle = {
  minHeight: sizes.touchTarget,
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
  paddingHorizontal: spacing.surface,
  paddingVertical: 14,
};

function FootballMatchRow({
  row,
  onOpenGame,
}: {
  row: FootballMatchRowView;
  onOpenGame: (gameId: string) => void;
}) {
  const content = (
    <>
      <ResultMark variant={row.outcome} size={20} decorative />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text size="body" weight="semibold" numberOfLines={1}>
          {row.title}
        </Text>
        <Text size="meta" tone="muted" numberOfLines={1}>
          {row.meta}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 2 }}>
        {row.score ? (
          <Text size="body" weight="semibold">
            {row.score}
          </Text>
        ) : null}
        {row.goals ? (
          <Text size="meta" tone="muted">
            {row.goals}
          </Text>
        ) : null}
      </View>
    </>
  );

  if (!row.canOpenGame) {
    return (
      <View accessible accessibilityLabel={row.accessibilityLabel} style={ROW}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={row.accessibilityLabel}
      onPress={() => onOpenGame(row.gameId)}
      style={({ pressed }) => [ROW, { opacity: pressed ? 0.6 : 1 }]}
    >
      {content}
    </Pressable>
  );
}

export function PlayerFootballLastTenCard({
  summary,
  rows,
  onOpenGame,
}: {
  summary: LastTenSummary;
  rows: FootballMatchRowView[];
  onOpenGame: (gameId: string) => void;
}) {
  return (
    <Card title="Last 10 games" meta={summary.record}>
      <LastTenMarks summary={summary} />
      {rows.map((row) => (
        <View key={row.matchId}>
          <Hairline />
          <FootballMatchRow row={row} onOpenGame={onOpenGame} />
        </View>
      ))}
    </Card>
  );
}
