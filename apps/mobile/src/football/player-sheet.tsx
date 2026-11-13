import type { Locale } from "@repo/i18n/locale";
import type { Messages } from "@repo/i18n/messages";
import { kickAction } from "@repo/domain/game-copy";
import { footballPositionChoices } from "@repo/domain/football-lineup";
import { View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { GuestMark } from "../primitives/guest-mark";
import { Sheet } from "../primitives/sheet";
import { Text } from "../primitives/text";
import { levelLabel, type BoardPlayer } from "@repo/domain/football-board";

function roleLine(player: BoardPlayer, locale: Locale, m: Messages) {
  if (player.role === "keeper") {
    return m.mobileTournament.join.keeper;
  }
  const position = footballPositionChoices(locale).find(
    (choice) => choice.value === player.position,
  );
  return position
    ? m.mobileTournament.playerSheet.prefers(position.label)
    : m.mobileTournament.playerSheet.noPositionYet;
}

/** What an Organizer can do with one player in the pool. */
export function PlayerSheet({
  player,
  canOpenProfile,
  onClose,
  onOpenProfile,
  onRemove,
}: {
  player: BoardPlayer | null;
  canOpenProfile: boolean;
  onClose: () => void;
  onOpenProfile: (userId: string) => void;
  onRemove: (userId: string) => void;
}) {
  const locale = useLocale();
  const messages = useMessages();
  const m = messages.mobileTournament;
  return (
    <Sheet visible={player != null} onClose={onClose}>
      {player ? (
        <View style={{ gap: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Avatar
              name={player.name}
              uri={player.image}
              size="lg"
              guest={player.guest}
            />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text size="lead" weight="semibold" numberOfLines={1}>
                {player.name}
              </Text>
              {player.guest ? <GuestMark /> : null}
              <Text size="meta" tone="muted">
                {m.playerSheet.roleAndLevel(
                  roleLine(player, locale, messages),
                  levelLabel(player.levelBand),
                )}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {canOpenProfile && !player.guest ? (
              <Button
                label={m.playerSheet.viewProfile}
                variant="outline"
                onPress={() => onOpenProfile(player.userId)}
              />
            ) : null}
            <Button
              label={kickAction(locale)}
              accessibilityLabel={m.organizer.kickSr(player.name)}
              variant="outline"
              onPress={() => onRemove(player.userId)}
            />
          </View>
        </View>
      ) : null}
    </Sheet>
  );
}
