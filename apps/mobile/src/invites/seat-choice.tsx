import { sideJoinAccessibleName } from "@repo/domain/game-card";
import { formatGameSideLabel } from "@repo/domain/game-side-label";
import type { InviteSide } from "@repo/domain/invites";
import { View } from "react-native";

import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { Text } from "../primitives/text";

const POSITIONS = ["left", "right"] as const;

type Position = (typeof POSITIONS)[number];

export function SeatChoice({
  sides,
  canPick,
  pending,
  onPick,
}: {
  sides: InviteSide[];
  canPick: boolean;
  pending: boolean;
  onPick: (sideIndex: number, position: Position) => void;
}) {
  return (
    <View>
      {sides.map((side, index) => {
        const label = formatGameSideLabel("friendly_game", side.sideIndex);
        return (
          <View key={side.sideIndex}>
            {index > 0 ? <Hairline /> : null}
            <View style={{ paddingVertical: 10, gap: 8 }}>
              <Text size="meta" tone="muted">
                {label}
              </Text>
              <View style={{ gap: 8 }}>
                {POSITIONS.map((position) => {
                  const occupant = side[position];
                  const other = side[position === "left" ? "right" : "left"];
                  if (occupant) {
                    return (
                      <View
                        key={position}
                        accessible
                        accessibilityLabel={`${label} ${position} seat, ${occupant.name}`}
                        style={{ minHeight: 44, justifyContent: "center" }}
                      >
                        <Text numberOfLines={1}>{occupant.name}</Text>
                      </View>
                    );
                  }
                  return (
                    <View key={position} style={{ flexDirection: "row" }}>
                      <Button
                        label={position === "left" ? "Sit left" : "Sit right"}
                        accessibilityLabel={sideJoinAccessibleName(
                          side.sideIndex,
                          position,
                          other?.name ?? null,
                        )}
                        variant="outline"
                        disabled={!canPick || pending}
                        onPress={() => onPick(side.sideIndex, position)}
                      />
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}
