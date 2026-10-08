import { colors, radii, sizes, spacing } from "@repo/design-tokens";
import { OPEN_GAME_ACTION } from "@repo/domain/player-profile-matches";
import { ChevronRight } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { Sheet } from "../primitives/sheet";
import { SurfaceToneContext } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import type {
  PlayerMatchSheetModel,
  PlayerMatchSheetPlayerModel,
} from "./player-matches-model";

const SET_CHIP = 28;
const LEVEL_PLACEHOLDER = { width: 44, height: 20 };

function ResultBadge({ sheet }: { sheet: PlayerMatchSheetModel }) {
  const won = sheet.outcome === "won";
  return (
    <SurfaceToneContext.Provider value={won ? "ink" : "paper"}>
      <View
        style={{
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: radii.md,
          borderWidth: hairline,
          borderColor: colors.ink,
          backgroundColor: won ? colors.ink : colors.paper,
        }}
      >
        <Text size="meta" weight="semibold">
          {sheet.badge}
        </Text>
      </View>
    </SurfaceToneContext.Provider>
  );
}

function SetChip({ games, won }: { games: number; won: boolean }) {
  return (
    <SurfaceToneContext.Provider value={won ? "ink" : "paper"}>
      <View
        style={{
          width: SET_CHIP,
          height: SET_CHIP,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: radii.md,
          backgroundColor: won ? colors.ink : colors.wash,
        }}
      >
        <Text weight="semibold">{String(games)}</Text>
      </View>
    </SurfaceToneContext.Provider>
  );
}

function SheetPlayerRow({
  player,
  onOpen,
}: {
  player: PlayerMatchSheetPlayerModel;
  onOpen: (userId: string) => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={player.accessibilityLabel}
      accessibilityHint="Opens their Player profile"
      onPress={() => onOpen(player.userId)}
      style={({ pressed }) => ({
        minHeight: sizes.touchTarget,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Avatar name={player.name} uri={player.imageUri} />
      <Text numberOfLines={1} style={{ flexShrink: 1 }}>
        {player.name}
      </Text>
      {player.level ? (
        <Text size="meta" tone="muted">
          {player.level}
        </Text>
      ) : (
        <View style={LEVEL_PLACEHOLDER}>
          <Hatch />
        </View>
      )}
    </Pressable>
  );
}

export function PlayerMatchSheet({
  sheet,
  onClose,
  onOpenPlayer,
  onOpenGame,
}: {
  sheet: PlayerMatchSheetModel | null;
  onClose: () => void;
  onOpenPlayer: (userId: string) => void;
  onOpenGame: (gameId: string) => void;
}) {
  return (
    <Sheet
      visible={sheet != null}
      onClose={onClose}
      title={sheet?.title}
      action={sheet ? <ResultBadge sheet={sheet} /> : null}
    >
      {sheet ? (
        <View style={{ gap: spacing.surface }}>
          <Text size="meta" tone="muted">
            {sheet.subtitle}
          </Text>
          <View
            style={{
              borderRadius: radii.surface,
              borderWidth: hairline,
              borderColor: colors.rule,
              overflow: "hidden",
            }}
          >
            {sheet.teams.map((team, index) => (
              <View key={index}>
                {index > 0 ? <Hairline /> : null}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    paddingHorizontal: spacing.surface,
                    paddingVertical: 6,
                  }}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    {team.players.map((player) => (
                      <SheetPlayerRow
                        key={player.userId}
                        player={player}
                        onOpen={onOpenPlayer}
                      />
                    ))}
                  </View>
                  <View
                    accessible
                    accessibilityLabel={`Sets: ${team.sets.map((set) => set.games).join(", ")}`}
                    style={{ flexDirection: "row", gap: 6 }}
                  >
                    {team.sets.map((set, setIndex) => (
                      <SetChip key={setIndex} {...set} />
                    ))}
                  </View>
                </View>
              </View>
            ))}
          </View>
          {sheet.rating ? (
            <View
              accessible
              accessibilityLabel={sheet.rating.accessibilityLabel}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: spacing.surface,
                borderRadius: radii.surface,
                borderWidth: hairline,
                borderColor: colors.rule,
              }}
            >
              <View style={{ gap: 2, flexShrink: 1 }}>
                <Text size="meta" tone="muted">
                  {sheet.rating.label}
                </Text>
                <Text weight="semibold">
                  {`${sheet.rating.before} → ${sheet.rating.after}`}
                </Text>
              </View>
              <Text weight="semibold">{sheet.rating.delta}</Text>
            </View>
          ) : null}
          {sheet.canOpenGame ? (
            <Button
              label={OPEN_GAME_ACTION}
              variant="outline"
              icon={<ChevronRight size={sizes.iconAction} color={colors.ink} />}
              iconPlacement="trailing"
              onPress={() => onOpenGame(sheet.gameId)}
            />
          ) : null}
        </View>
      ) : null}
    </Sheet>
  );
}
