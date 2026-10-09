import { sizes } from "@repo/design-tokens";
import { Pressable, View } from "react-native";

import type {
  GameTeamPlayer,
  gameTeamPlayers,
} from "../player-profile/game-player-links";
import { Avatar } from "../primitives/avatar";
import { Hairline } from "../primitives/hairline";
import { Sheet } from "../primitives/sheet";
import { Text } from "../primitives/text";

export type GameTeamSheetTeam = { name: string; players: GameTeamPlayer[] };

/** Given when the viewer may open Player profiles from Game team cells. */
export type GameTeamLinks = {
  gameTeams: Parameters<typeof gameTeamPlayers>[0];
  onOpenTeam: (team: GameTeamSheetTeam) => void;
};

export function GameTeamSheet({
  team,
  onClose,
  onOpenPlayer,
}: {
  team: GameTeamSheetTeam | null;
  onClose: () => void;
  onOpenPlayer: (userId: string) => void;
}) {
  return (
    <Sheet visible={team != null} onClose={onClose} title={team?.name}>
      {team ? (
        <View>
          {team.players.map((player, index) => (
            <View key={player.id}>
              {index > 0 ? <Hairline /> : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={player.name}
                accessibilityHint="Opens their Player profile"
                onPress={() => {
                  onClose();
                  onOpenPlayer(player.id);
                }}
                style={({ pressed }) => ({
                  minHeight: sizes.touchTarget,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  paddingVertical: 6,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Avatar name={player.name} uri={player.image} />
                <Text numberOfLines={1} style={{ flexShrink: 1 }}>
                  {player.name}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
    </Sheet>
  );
}
