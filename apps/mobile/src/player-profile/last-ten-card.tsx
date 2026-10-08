import { colors, sizes, spacing } from "@repo/design-tokens";
import type {
  LastTenSummary,
  PlayerMatchRowView,
} from "@repo/domain/player-profile-matches";
import { ChevronRight } from "lucide-react-native";
import { View } from "react-native";

import { Card } from "../home/card";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { ResultMark } from "../primitives/result-mark";
import { Text } from "../primitives/text";
import { PlayerMatchRow } from "./match-row";

export function PlayerLastTenCard({
  summary,
  rows,
  onOpenMatch,
  onSeeAll,
}: {
  summary: LastTenSummary;
  rows: PlayerMatchRowView[];
  onOpenMatch: (matchId: string) => void;
  onSeeAll: () => void;
}) {
  return (
    <Card title="Last 10 games" meta={summary.record}>
      <View
        accessible
        accessibilityLabel={`Last 10 games. ${summary.record}`}
        style={{
          paddingHorizontal: spacing.surface,
          paddingBottom: spacing.surface,
          gap: 8,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          {summary.marks.map((mark, index) => (
            <ResultMark key={index} variant={mark} size={22} decorative />
          ))}
        </View>
        {summary.ends ? (
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Text size="meta" tone="muted">
              {summary.ends.newest}
            </Text>
            <Text size="meta" tone="muted">
              {summary.ends.oldest}
            </Text>
          </View>
        ) : null}
      </View>
      {rows.map((row) => (
        <View key={row.matchId}>
          <Hairline />
          <PlayerMatchRow row={row} onPress={() => onOpenMatch(row.matchId)} />
        </View>
      ))}
      {summary.seeAll ? (
        <View>
          <Hairline />
          <View style={{ padding: spacing.surface }}>
            <Button
              label={summary.seeAll}
              variant="outline"
              icon={<ChevronRight size={sizes.iconAction} color={colors.ink} />}
              iconPlacement="trailing"
              onPress={onSeeAll}
            />
          </View>
        </View>
      ) : null}
    </Card>
  );
}
