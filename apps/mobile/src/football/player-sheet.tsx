import { KICK_ACTION } from "@repo/domain/game-copy";
import { FOOTBALL_POSITION_CHOICES } from "@repo/domain/football-lineup";
import { View } from "react-native";

import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { Sheet } from "../primitives/sheet";
import { Text } from "../primitives/text";
import { levelLabel, type BoardPlayer } from "@repo/domain/football-board";

function roleLine(player: BoardPlayer) {
  if (player.role === "keeper") {
    return "Keeper";
  }
  const position = FOOTBALL_POSITION_CHOICES.find(
    (choice) => choice.value === player.position,
  );
  return position
    ? `Prefers ${position.label.toLowerCase()}`
    : "No position yet";
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
  return (
    <Sheet visible={player != null} onClose={onClose}>
      {player ? (
        <View style={{ gap: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Avatar name={player.name} uri={player.image} size="lg" />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text size="lead" weight="semibold" numberOfLines={1}>
                {player.name}
              </Text>
              <Text size="meta" tone="muted">
                {roleLine(player)}, Level {levelLabel(player.levelBand)}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {canOpenProfile ? (
              <Button
                label="View profile"
                variant="outline"
                onPress={() => onOpenProfile(player.userId)}
              />
            ) : null}
            <Button
              label={KICK_ACTION}
              accessibilityLabel={`${KICK_ACTION} ${player.name}`}
              variant="outline"
              onPress={() => onRemove(player.userId)}
            />
          </View>
        </View>
      ) : null}
    </Sheet>
  );
}
