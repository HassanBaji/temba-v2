import { radii, sizes, spacing } from "@repo/design-tokens";
import { formatGameClock, formatWeekday } from "@repo/domain/format-game-start";
import {
  homeComingUpSeatBars,
  type HomeComingUpGameRow,
  type HomeComingUpRow,
  type HomeComingUpTournamentMatchRow,
  type HomeComingUpTournamentRow,
} from "@repo/domain/home-coming-up";
import { zonedParts } from "@repo/domain/product-timezone";
import { Trophy } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { Hatch } from "../primitives/hatch";
import { hairline } from "../primitives/hairline-width";
import { Hairline } from "../primitives/hairline";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { Card } from "./card";
import type { HomeNavTarget } from "./home-target";

const BAR_WIDTH = 4;
const BAR_HEIGHT = 24;

function DayBox({ startsAt }: { startsAt: Date }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: 44, alignItems: "center", justifyContent: "center" }}
    >
      <Text size="title" width="expanded" weight="bold">
        {zonedParts(startsAt).day}
      </Text>
      <Text size="eyebrow" tone="muted">
        {formatWeekday(startsAt, "short")}
      </Text>
    </View>
  );
}

function SeatBars({ game }: { game: HomeComingUpGameRow }) {
  const palette = useTonePalette();
  const { bars } = homeComingUpSeatBars(game);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ flexDirection: "row", gap: 2, height: BAR_HEIGHT }}
    >
      {bars.map((kind, index) =>
        kind === "taken" ? (
          <View
            key={index}
            style={{
              width: BAR_WIDTH,
              borderRadius: radii.slot / 2,
              backgroundColor: palette.foreground,
            }}
          />
        ) : (
          <View key={index} style={{ width: BAR_WIDTH }}>
            <Hatch radius={radii.slot / 2} bordered={false} />
          </View>
        ),
      )}
    </View>
  );
}

function Tag({ label }: { label: string }) {
  const palette = useTonePalette();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        borderWidth: hairline,
        borderColor: palette.foreground,
        borderRadius: radii.sm,
        paddingHorizontal: 10,
        paddingVertical: 6,
      }}
    >
      <Text size="eyebrow" weight="semibold" mono uppercase>
        {label}
      </Text>
    </View>
  );
}

function RowShell({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: sizes.touchTarget + 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: spacing.surface,
        paddingVertical: 12,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {children}
    </Pressable>
  );
}

function TournamentTitle({ title }: { title: string }) {
  const palette = useTonePalette();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <Trophy size={sizes.iconRow} color={palette.foreground} />
      <Text weight="medium" numberOfLines={1} style={{ flexShrink: 1 }}>
        {title}
      </Text>
    </View>
  );
}

function GameRow({
  game,
  onNavigate,
}: {
  game: HomeComingUpGameRow;
  onNavigate: (target: HomeNavTarget) => void;
}) {
  const clock = formatGameClock(game.startsAt);
  const { spokenLabel } = homeComingUpSeatBars(game);
  return (
    <RowShell
      label={`${game.venueName}, ${clock}, ${spokenLabel}`}
      onPress={() => onNavigate({ kind: "game", gameId: game.id })}
    >
      <DayBox startsAt={game.startsAt} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text weight="medium" numberOfLines={1}>
          {game.venueName}
        </Text>
        <Text size="meta" tone="muted">
          {clock}
        </Text>
      </View>
      <SeatBars game={game} />
    </RowShell>
  );
}

function TournamentRow({
  game,
  onNavigate,
}: {
  game: HomeComingUpTournamentRow;
  onNavigate: (target: HomeNavTarget) => void;
}) {
  return (
    <RowShell
      label={[game.title, game.teamsLine, game.actionLabel]
        .filter(Boolean)
        .join(", ")}
      onPress={() => onNavigate({ kind: "game", gameId: game.id })}
    >
      <DayBox startsAt={game.startsAt} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <TournamentTitle title={game.title} />
        <Text size="meta" tone="muted" numberOfLines={1}>
          {game.teamsLine}
        </Text>
      </View>
      {game.actionLabel ? <Tag label={game.actionLabel} /> : null}
    </RowShell>
  );
}

function TournamentMatchRow({
  game,
  onNavigate,
}: {
  game: HomeComingUpTournamentMatchRow;
  onNavigate: (target: HomeNavTarget) => void;
}) {
  const meta = [formatGameClock(game.startsAt), game.opponentLine]
    .filter(Boolean)
    .join(", ");
  return (
    <RowShell
      label={[game.title, meta, game.roundTag].filter(Boolean).join(", ")}
      onPress={() => onNavigate({ kind: "game", gameId: game.id })}
    >
      <DayBox startsAt={game.startsAt} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <TournamentTitle title={game.title} />
        <Text size="meta" tone="muted" numberOfLines={1}>
          {meta}
        </Text>
      </View>
      {game.roundTag ? <Tag label={game.roundTag} /> : null}
    </RowShell>
  );
}

export function ComingUp({
  games,
  onNavigate,
}: {
  games: HomeComingUpRow[];
  onNavigate: (target: HomeNavTarget) => void;
}) {
  if (games.length === 0) {
    return null;
  }

  return (
    <Card title="Coming up" flush>
      {games.map((game) => (
        <View key={game.rowKey}>
          <Hairline />
          {game.kind === "tournament_match" ? (
            <TournamentMatchRow game={game} onNavigate={onNavigate} />
          ) : game.kind === "tournament" ? (
            <TournamentRow game={game} onNavigate={onNavigate} />
          ) : (
            <GameRow game={game} onNavigate={onNavigate} />
          )}
        </View>
      ))}
    </Card>
  );
}
