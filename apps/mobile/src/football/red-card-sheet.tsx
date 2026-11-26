import { radii } from "@repo/design-tokens";
import { shortName, type BoardPlayer } from "@repo/domain/football-board";
import {
  RED_CARD_REASONS,
  type RedCardReason,
} from "@repo/domain/football-match-log";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";

import { useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { hairline } from "../primitives/hairline-width";
import { Sheet } from "../primitives/sheet";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import { CardShape } from "./log-glyph";

const REASON_HEIGHT = 40;

/** Why a red card was given, optional: tapping the chosen reason again clears it. */
export function ReasonChips({
  reason,
  onChange,
}: {
  reason: RedCardReason | null;
  onChange: (reason: RedCardReason | null) => void;
}) {
  const colors = useColors();
  const m = useMessages().football.matchLog;
  return (
    <View style={{ gap: 8 }}>
      <Text size="meta" tone="muted">
        {m.redSheet.why}
      </Text>
      <View
        accessibilityRole="radiogroup"
        style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
      >
        {RED_CARD_REASONS.map((choice) => {
          const selected = reason === choice;
          return (
            <Pressable
              key={choice}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => onChange(selected ? null : choice)}
              style={({ pressed }) => ({
                height: REASON_HEIGHT,
                justifyContent: "center",
                paddingHorizontal: 14,
                borderRadius: radii.md,
                borderWidth: hairline,
                borderColor: selected ? colors.controlEdge : colors.rule,
                backgroundColor: selected ? colors.control : colors.sheet,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text
                size="meta"
                weight="medium"
                style={{ color: selected ? colors.onControl : colors.ink }}
              >
                {m.reasons[choice]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** The one line that asks first: who is sent off, and why if known. */
export function RedCardSheet({
  player,
  team,
  onCancel,
  onGive,
}: {
  player: BoardPlayer | null;
  team: string;
  onCancel: () => void;
  onGive: (reason: RedCardReason | null) => void;
}) {
  const messages = useMessages();
  const m = messages.football.matchLog;
  const [reason, setReason] = useState<RedCardReason | null>(null);
  const playerId = player?.userId ?? null;

  useEffect(() => {
    setReason(null);
  }, [playerId]);

  return (
    <Sheet visible={player != null} onClose={onCancel}>
      {player ? (
        <View style={{ gap: 18 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <CardShape kind="red_card" size="lg" />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text size="h2" width="expanded" accessibilityRole="header">
                {m.redSheet.title}
              </Text>
              <Text tone="muted">
                {m.playerOfTeam(
                  player.isViewer
                    ? messages.common.you
                    : shortName(player.name),
                  team,
                )}
              </Text>
            </View>
          </View>
          <ReasonChips reason={reason} onChange={setReason} />
          <Text size="meta" tone="muted">
            {m.redSheet.note}
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Button
                label={m.cancel}
                variant="outline"
                size="lg"
                onPress={onCancel}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label={m.redSheet.give}
                size="lg"
                onPress={() => onGive(reason)}
              />
            </View>
          </View>
        </View>
      ) : null}
    </Sheet>
  );
}
