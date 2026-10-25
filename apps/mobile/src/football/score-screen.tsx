import { colors, radii, spacing } from "@repo/design-tokens";
import {
  formatDayMonth,
  formatGameClock,
  formatWindowDuration,
} from "@repo/domain/format-game-start";
import {
  footballResultLine,
  stepFootballGoals,
} from "@repo/domain/football-lineup";
import { sideSizeLabel } from "@repo/domain/game-shape";
import { useRouter, type Href } from "expo-router";
import { Minus, Plus } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";

import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";
import { BibChip } from "./bib-picker";
import {
  addGoal,
  bibNames,
  byKeeperThenLevel,
  removeGoal,
  scorersNote,
  scorersPayload,
  shortName,
  sideAverage,
  type Bibs,
  type BoardPlayer,
  type ScoreDraft,
  type Side,
} from "./football-model";

const STEP = 44;

function StepButton({
  kind,
  label,
  onPress,
}: {
  kind: "down" | "up";
  label: string;
  onPress: () => void;
}) {
  const up = kind === "up";
  const Icon = up ? Plus : Minus;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        width: STEP,
        height: STEP,
        borderRadius: radii.md,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: up ? colors.ink : colors.paper,
        borderWidth: up ? 0 : hairline,
        borderColor: colors.inputBorder,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Icon size={18} color={up ? colors.paper : colors.ink} />
    </Pressable>
  );
}

function SideStepper({
  bib,
  name,
  goals,
  members,
  onStep,
}: {
  bib: Bibs["slot1"];
  name: string;
  goals: number;
  members: readonly BoardPlayer[];
  onStep: (delta: -1 | 1) => void;
}) {
  return (
    <View
      style={{ flex: 1, alignItems: "center", gap: 10, paddingVertical: 18 }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <BibChip bib={bib} size={14} />
        <Text size="meta" weight="semibold">
          {name}
        </Text>
      </View>
      <Text
        size="heroTime"
        width="expanded"
        weight="bold"
        accessibilityLabel={`${name} ${goals}`}
      >
        {String(goals)}
      </Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <StepButton
          kind="down"
          label={`One goal fewer for ${name}`}
          onPress={() => onStep(-1)}
        />
        <StepButton
          kind="up"
          label={`One goal more for ${name}`}
          onPress={() => onStep(1)}
        />
      </View>
      <Text size="meta" tone="muted">
        avg {sideAverage(members)}
      </Text>
    </View>
  );
}

function ScorerChip({
  player,
  goals,
  team,
  onAdd,
  onRemove,
}: {
  player: BoardPlayer;
  goals: number;
  team: string;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const scored = goals > 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${player.name}, ${team}, ${goals} goals`}
      accessibilityHint="Tap to add a goal, hold to take one away"
      accessibilityActions={[
        { name: "increment", label: "Add a goal" },
        { name: "decrement", label: "Take a goal away" },
      ]}
      onAccessibilityAction={(event) =>
        event.nativeEvent.actionName === "decrement" ? onRemove() : onAdd()
      }
      onPress={onAdd}
      onLongPress={onRemove}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingVertical: 4,
        paddingLeft: 4,
        paddingRight: 10,
        borderRadius: radii.lg,
        borderWidth: hairline,
        borderColor: scored ? colors.ink : colors.rule,
        backgroundColor: scored ? colors.ink : colors.paper,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Avatar name={player.name} uri={player.image} size="sm" />
      <Text
        size="meta"
        weight="semibold"
        style={{ color: scored ? colors.paper : colors.ink }}
      >
        {player.isViewer ? "You" : shortName(player.name)}
      </Text>
      <Text
        size="eyebrow"
        style={{ color: scored ? colors.dim : colors.muted }}
      >
        {scored ? `${goals} ${goals === 1 ? "goal" : "goals"}` : team}
      </Text>
    </Pressable>
  );
}

/**
 * Either side, or an Organizer, enters the goals after the game and may name
 * who scored. The other side confirms the Score from the Game.
 */
export function FootballScoreScreen({ gameId }: { gameId: string }) {
  const router = useRouter();
  const toast = useToast();
  const utils = api.useUtils();
  const game = api.games.byId.useQuery({ id: gameId });
  const board = api.games.footballBoard.useQuery({ gameId });
  const [draft, setDraft] = useState<ScoreDraft | null>(null);

  useEffect(() => {
    if (board.data && draft == null) {
      const goals: Record<string, number> = {};
      for (const player of board.data.players) {
        if (player.goals > 0) {
          goals[player.userId] = player.goals;
        }
      }
      setDraft({
        slot1: board.data.match?.score?.slot1 ?? 0,
        slot2: board.data.match?.score?.slot2 ?? 0,
        goals,
      });
    }
  }, [board.data, draft]);

  const save = api.games.saveFootballScore.useMutation({
    onSuccess: async () => {
      toast.show("Score saved");
      await Promise.all([
        utils.games.footballBoard.invalidate({ gameId }),
        utils.games.byId.invalidate({ id: gameId }),
        utils.games.listMyGames.invalidate(),
      ]);
      router.back();
    },
  });

  const fallback = `/games/${gameId}` as Href;
  const teams = board.data?.teams ?? null;
  if (
    board.error ||
    (board.data && (!teams || !board.data.viewer.canEnterScore))
  ) {
    return (
      <Screen>
        <ScreenHeader nav="back" fallback={fallback} title="Score" />
        <Surface style={{ gap: 4 }}>
          <Text weight="semibold">
            {board.error
              ? "The game could not be loaded"
              : "The score is closed"}
          </Text>
          <Text size="meta" tone="muted">
            {board.error?.message ??
              "The score opens at kick-off for players on the teams and the organizer, until both sides confirm it."}
          </Text>
        </Surface>
      </Screen>
    );
  }
  if (!board.data || !teams || !draft) {
    return (
      <Screen>
        <ScreenHeader nav="back" fallback={fallback} title="Score" />
        <Skeleton height={320} radius={16} />
      </Screen>
    );
  }

  const players = board.data.players;
  const names = bibNames(teams.bibs);
  const members = (side: Side) =>
    players
      .filter((player) => player.sideIndex === side)
      .sort(byKeeperThenLevel);
  const viewerSide = board.data.viewer.sideIndex;
  const otherName =
    viewerSide === 1 ? names.slot2 : viewerSide === 2 ? names.slot1 : null;
  const step = (side: Side, delta: -1 | 1) =>
    setDraft({
      ...draft,
      [side === 1 ? "slot1" : "slot2"]: stepFootballGoals(
        side === 1 ? draft.slot1 : draft.slot2,
        delta,
      ),
    });
  const start = game.data?.windowStart ?? null;
  const detail = [
    start ? formatGameClock(start) : null,
    formatWindowDuration(game.data?.windowStart, game.data?.windowEnd),
    game.data?.sideSize ? sideSizeLabel(game.data.sideSize) : null,
  ]
    .filter(Boolean)
    .join(", ");
  const scorers = [...members(1), ...members(2)].filter(
    (player) => player.role !== "keeper",
  );
  const confirmLine = otherName
    ? `One player from ${otherName} confirms the score.`
    : "One player from each side confirms the score.";

  return (
    <Screen
      footer={
        <View style={{ flex: 1, gap: 6 }}>
          <Button
            label="Save score"
            size="lg"
            pending={save.isPending}
            onPress={() =>
              save.mutate({
                gameId,
                slot1Goals: draft.slot1,
                slot2Goals: draft.slot2,
                scorers: scorersPayload(draft),
              })
            }
          />
          <Text size="meta" tone="muted" style={{ textAlign: "center" }}>
            {confirmLine}
          </Text>
        </View>
      }
    >
      <ScreenHeader
        nav="back"
        fallback={fallback}
        title={start ? formatDayMonth(start, { weekday: "short" }) : "Score"}
        actions={
          <Text size="meta" tone="muted">
            {board.data.match?.score ? "Edit score" : "Score missing"}
          </Text>
        }
      >
        <View>
          <Text weight="semibold">
            {[game.data?.venue?.name, game.data?.recordedCourts[0]?.name]
              .filter(Boolean)
              .join(", ")}
          </Text>
          {detail ? (
            <Text size="meta" tone="muted">
              {detail}
            </Text>
          ) : null}
        </View>
      </ScreenHeader>

      <Surface padded={false} style={{ overflow: "hidden" }}>
        <View style={{ flexDirection: "row" }}>
          <SideStepper
            bib={teams.bibs.slot1}
            name={names.slot1}
            goals={draft.slot1}
            members={members(1)}
            onStep={(delta) => step(1, delta)}
          />
          <View style={{ width: hairline, backgroundColor: colors.rule }} />
          <SideStepper
            bib={teams.bibs.slot2}
            name={names.slot2}
            goals={draft.slot2}
            members={members(2)}
            onStep={(delta) => step(2, delta)}
          />
        </View>
        <Hairline />
        <View style={{ padding: spacing.surface }}>
          <Text accessibilityLiveRegion="polite">
            {footballResultLine(draft, names)}
          </Text>
        </View>
      </Surface>

      <Surface padded={false} style={{ overflow: "hidden" }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            padding: spacing.surface,
            paddingBottom: 12,
          }}
        >
          <Text tone="muted">Scorers, optional</Text>
          <Text size="meta" tone="muted">
            tap to add a goal
          </Text>
        </View>
        <Hairline />
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            padding: spacing.surface,
          }}
        >
          {scorers.map((player) => (
            <ScorerChip
              key={player.userId}
              player={player}
              goals={draft.goals[player.userId] ?? 0}
              team={player.sideIndex === 1 ? names.slot1 : names.slot2}
              onAdd={() => setDraft(addGoal(draft, player, players))}
              onRemove={() => setDraft(removeGoal(draft, player.userId))}
            />
          ))}
        </View>
        <Hairline />
        <View style={{ padding: spacing.surface }}>
          <Text size="meta" tone="muted">
            {scorersNote(draft, players, names)} Hold a name to take a goal
            away.
          </Text>
        </View>
      </Surface>

      {save.error ? (
        <Text size="meta" accessibilityRole="alert">
          {save.error.message}
        </Text>
      ) : null}
    </Screen>
  );
}
