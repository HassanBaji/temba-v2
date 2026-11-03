import { colors, sizes, spacing } from "@repo/design-tokens";
import type {
  LastTenSummary,
  PlayerMatchRowView,
} from "@repo/domain/player-profile-matches";
import { ChevronRight } from "lucide-react-native";
import { View } from "react-native";

import { Card } from "../home/card";
import { useMessages } from "../i18n/locale-provider";
import { mirrorInRtl } from "../i18n/rtl";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { ResultMark } from "../primitives/result-mark";
import { Text } from "../primitives/text";
import { PlayerMatchRow } from "./match-row";

export function LastTenMarks({ summary }: { summary: LastTenSummary }) {
  const m = useMessages();
  return (
    <View
      accessible
      accessibilityLabel={m.mobilePlayer.profile.lastTenSpoken(summary.record)}
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
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text size="meta" tone="muted">
            {summary.ends.newest}
          </Text>
          <Text size="meta" tone="muted">
            {summary.ends.oldest}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

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
  const m = useMessages();
  return (
    <Card title={m.mobilePlayer.profile.lastTenTitle} meta={summary.record}>
      <LastTenMarks summary={summary} />
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
              icon={
                <ChevronRight
                  size={sizes.iconAction}
                  color={colors.ink}
                  style={mirrorInRtl}
                />
              }
              iconPlacement="trailing"
              onPress={onSeeAll}
            />
          </View>
        </View>
      ) : null}
    </Card>
  );
}
