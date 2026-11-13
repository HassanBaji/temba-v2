import { formatAbsoluteDay } from "@repo/domain/format-game-start";
import { Pressable, View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Hairline } from "../primitives/hairline";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { type RouterOutputs } from "../trpc/react";
import { SectionHead } from "./profile-parts";

type MatchToStamp = RouterOutputs["games"]["listMatchesToStamp"][number];

/**
 * The Matches a Verifier may stamp now, each opening its Game (ADR-0072).
 * Nothing shows for a User who is no Verifier or has nothing to stamp.
 */
export function MatchesToStamp({
  rows,
  onOpenGame,
}: {
  rows: readonly MatchToStamp[];
  onOpenGame: (gameId: string) => void;
}) {
  const m = useMessages().rating.verifier.toStamp;
  const locale = useLocale();
  if (rows.length === 0) {
    return null;
  }
  return (
    <View style={{ gap: 12 }}>
      <View style={{ gap: 4 }}>
        <SectionHead title={m.title} />
        <Text size="meta" tone="muted">
          {m.note}
        </Text>
      </View>
      <Surface padded={false} radius="card" style={{ overflow: "hidden" }}>
        {rows.map((row, index) => {
          const line = m.line(
            row.venueName,
            row.startsAt ? formatAbsoluteDay(row.startsAt, locale) : null,
          );
          return (
            <View key={row.matchId}>
              {index > 0 ? <Hairline /> : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${row.gameName}. ${line}`}
                onPress={() => onOpenGame(row.gameId)}
                style={({ pressed }) => ({
                  gap: 2,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Text size="meta" numberOfLines={1}>
                  {row.gameName}
                </Text>
                <Text size="eyebrow" tone="muted" numberOfLines={1}>
                  {line}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </Surface>
    </View>
  );
}
