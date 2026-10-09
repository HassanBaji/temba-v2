import {
  sideJoinAccessibleName,
  type CardSeatPosition,
} from "@repo/domain/game-card";
import { formatGameSideLabel } from "@repo/domain/game-side-label";
import type { HubGameRow } from "@repo/domain/hub-game-row";
import { ScrollView, View } from "react-native";

import { Button } from "../primitives/button";
import { Sheet } from "../primitives/sheet";
import { Text } from "../primitives/text";

const LIST_MAX_HEIGHT = 360;

export function SeatPickerSheet({
  game,
  pending,
  onClose,
  onPick,
}: {
  game: HubGameRow | null;
  pending: boolean;
  onClose: () => void;
  onPick: (
    gameId: string,
    sideIndex: number,
    position: CardSeatPosition,
  ) => void;
}) {
  const sides =
    game?.tournament?.joinSides.filter(
      (side) => side.left == null || side.right == null,
    ) ?? [];

  return (
    <Sheet visible={game != null} onClose={onClose} title="Pick a seat">
      <ScrollView style={{ maxHeight: LIST_MAX_HEIGHT }}>
        <View style={{ gap: 12 }}>
          {sides.map((side) => {
            const seats = (["left", "right"] as const).filter(
              (position) => side[position] == null,
            );
            return (
              <View key={side.sideIndex} style={{ gap: 6 }}>
                <Text size="meta" tone="muted">
                  {formatGameSideLabel("friendly_tournament", side.sideIndex)}
                </Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {seats.map((position) => (
                    <Button
                      key={position}
                      label={sideJoinAccessibleName(
                        side.sideIndex,
                        position,
                        (position === "left" ? side.right : side.left)?.name ??
                          null,
                      )}
                      variant="outline"
                      disabled={pending}
                      onPress={() =>
                        game && onPick(game.id, side.sideIndex, position)
                      }
                    />
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </Sheet>
  );
}
