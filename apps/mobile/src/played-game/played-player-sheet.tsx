import {
  NOT_ON_TEMBA_YET_LABEL,
  RENAME_UNCLAIMED_PLAYER_ACTION,
} from "@repo/domain/add-player-by-phone";
import { KICK_ACTION } from "@repo/domain/game-copy";
import type { PlayedRow } from "@repo/domain/played-game";
import { View } from "react-native";

import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { Sheet } from "../primitives/sheet";
import { Text } from "../primitives/text";

/**
 * One player on a played Game: their profile for anyone who may open it,
 * and for the Organizer the doors that still change the record.
 */
export function PlayedPlayerSheet({
  player,
  canOpenProfile,
  canKick,
  canRename,
  onClose,
  onOpenProfile,
  onKick,
  onRename,
}: {
  player: PlayedRow | null;
  canOpenProfile: boolean;
  canKick: boolean;
  canRename: boolean;
  onClose: () => void;
  onOpenProfile: (userId: string) => void;
  onKick: (userId: string) => void;
  onRename: (player: { userId: string; name: string }) => void;
}) {
  const meta = player
    ? [
        player.unclaimed ? NOT_ON_TEMBA_YET_LABEL : null,
        player.phoneMasked,
        player.meta,
        `Level ${player.level}`,
        player.trailing,
      ]
        .filter(Boolean)
        .join(", ")
    : "";
  return (
    <Sheet visible={player != null} onClose={onClose}>
      {player ? (
        <View style={{ gap: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Avatar name={player.fullName} uri={player.image} size="lg" />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text size="lead" weight="semibold" numberOfLines={1}>
                {player.fullName}
              </Text>
              <Text size="meta" tone="muted" numberOfLines={2}>
                {meta}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {canOpenProfile ? (
              <Button
                label="View profile"
                variant="outline"
                onPress={() => onOpenProfile(player.userId)}
              />
            ) : null}
            {canRename && player.unclaimed ? (
              <Button
                label={RENAME_UNCLAIMED_PLAYER_ACTION}
                accessibilityLabel={`${RENAME_UNCLAIMED_PLAYER_ACTION}: ${player.fullName}`}
                variant="outline"
                onPress={() =>
                  onRename({ userId: player.userId, name: player.fullName })
                }
              />
            ) : null}
            {canKick ? (
              <Button
                label={KICK_ACTION}
                accessibilityLabel={`${KICK_ACTION} ${player.fullName}`}
                variant="outline"
                onPress={() => onKick(player.userId)}
              />
            ) : null}
          </View>
        </View>
      ) : null}
    </Sheet>
  );
}
