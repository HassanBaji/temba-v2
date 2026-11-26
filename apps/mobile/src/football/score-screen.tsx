import { spacing } from "@repo/design-tokens";
import {
  formatGameDay,
  formatGameClock,
  formatWindowDuration,
} from "@repo/domain/format-game-start";
import { footballResultLine } from "@repo/domain/football-lineup";
import {
  logPayload,
  logScore,
  logScorers,
  seedLogFromScore,
} from "@repo/domain/football-match-log";
import { sideSizeLabel } from "@repo/domain/game-shape";
import { useRouter, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useToast } from "../primitives/toast";
import { useColors } from "../theme/theme-provider";
import { invalidateRatingReads } from "../trpc/invalidate-rating-reads";
import { api } from "../trpc/react";
import { LogLineSheet } from "./log-line-sheet";
import { WhatHappenedSurface } from "./log-player-chips";
import { MatchLogSurface } from "./match-log-surface";
import { RedCardSheet } from "./red-card-sheet";
import { SideStepper } from "./score-steppers";
import { useMatchLog } from "./use-match-log";
import {
  bibNames,
  byKeeperThenLevel,
  ofSide,
  type Side,
} from "@repo/domain/football-board";

/**
 * Either side, or an Organizer, enters the goals after the game and may log
 * who scored, own goals and cards. The other side confirms the Score and its
 * Match log from the Game.
 */
export function FootballScoreScreen({ gameId }: { gameId: string }) {
  const colors = useColors();
  const locale = useLocale();
  const messages = useMessages();
  const m = messages.mobileTournament.scoreScreen;
  const router = useRouter();
  const toast = useToast();
  const utils = api.useUtils();
  const game = api.games.byId.useQuery({ id: gameId });
  const board = api.games.footballBoard.useQuery({ gameId });
  const kickoff = game.data?.windowStart ?? null;
  const end = game.data?.windowEnd ?? null;
  const log = useMatchLog({ kickoff, end });
  const [editingId, setEditingId] = useState<string | null>(null);
  const gameSettled = game.data != null || game.error != null;

  useEffect(() => {
    if (!board.data || !gameSettled || log.lines != null) {
      return;
    }
    const match = board.data.match;
    log.start(
      match?.log.length
        ? match.log
        : seedLogFromScore(match?.score ?? null, board.data.players, {
            at: new Date(),
            kickoff,
            end,
          }),
      board.data.players,
    );
  }, [board.data, gameSettled, kickoff, end, log]);

  const save = api.games.saveFootballScore.useMutation({
    onSuccess: async () => {
      toast.show(m.saved);
      await Promise.all([
        utils.games.footballBoard.invalidate({ gameId }),
        utils.games.byId.invalidate({ id: gameId }),
        utils.games.listMyGames.invalidate(),
        invalidateRatingReads(utils),
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
        <ScreenHeader nav="back" fallback={fallback} title={m.title} />
        <Surface style={{ gap: 4 }}>
          <Text weight="semibold">{board.error ? m.loadFailed : m.closed}</Text>
          <Text size="meta" tone="muted">
            {board.error?.message ?? m.closedLine}
          </Text>
        </Surface>
      </Screen>
    );
  }
  if (!board.data || !teams || !log.lines) {
    return (
      <Screen>
        <ScreenHeader nav="back" fallback={fallback} title={m.title} />
        <Skeleton height={320} radius={16} />
      </Screen>
    );
  }

  const lines = log.lines;
  const players = board.data.players;
  const names = bibNames(teams.bibs, locale);
  const members = (side: Side) =>
    players
      .filter((player) => player.sideIndex === side)
      .sort(byKeeperThenLevel);
  const everyone = [...members(1), ...members(2)];
  const score = logScore(lines);
  const viewerSide = board.data.viewer.sideIndex;
  const otherName =
    viewerSide === 1 ? names.slot2 : viewerSide === 2 ? names.slot1 : null;
  const step = (side: Side, delta: -1 | 1) =>
    delta > 0 ? log.addUnknownGoal(side) : log.removeLatestGoal(side);
  const redFor =
    players.find((player) => player.userId === log.redCardFor?.userId) ?? null;
  const start = game.data?.windowStart ?? null;
  const detail = [
    start ? formatGameClock(start, locale) : null,
    formatWindowDuration(game.data?.windowStart, game.data?.windowEnd, locale),
    game.data?.sideSize ? sideSizeLabel(game.data.sideSize, locale) : null,
  ]
    .filter(Boolean)
    .join(messages.tournament.listSeparator);
  const confirmLine = otherName
    ? m.oneFromConfirms(otherName)
    : m.oneFromEachConfirms;
  const editing = lines.find((line) => line.id === editingId) ?? null;

  return (
    <Screen
      footer={
        <View style={{ flex: 1, gap: 6 }}>
          <Button
            label={m.saveScore}
            size="lg"
            pending={save.isPending}
            onPress={() =>
              save.mutate({
                gameId,
                slot1Goals: score.slot1,
                slot2Goals: score.slot2,
                scorers: logScorers(lines),
                log: logPayload(lines),
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
        title={
          start ? formatGameDay(start, locale, { weekday: "short" }) : m.title
        }
        actions={
          <Text size="meta" tone="muted">
            {board.data.match?.score ? m.editScore : m.scoreMissing}
          </Text>
        }
      >
        <View>
          <Text weight="semibold">
            {[game.data?.venue?.name, game.data?.recordedCourts[0]?.name]
              .filter(Boolean)
              .join(messages.tournament.listSeparator)}
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
            goals={score.slot1}
            members={members(1)}
            onStep={(delta) => step(1, delta)}
          />
          <View style={{ width: hairline, backgroundColor: colors.rule }} />
          <SideStepper
            bib={teams.bibs.slot2}
            name={names.slot2}
            goals={score.slot2}
            members={members(2)}
            onStep={(delta) => step(2, delta)}
          />
        </View>
        <Hairline />
        <View style={{ padding: spacing.surface }}>
          <Text accessibilityLiveRegion="polite">
            {footballResultLine(score, names, locale)}
          </Text>
        </View>
      </Surface>

      <WhatHappenedSurface
        mode={log.mode}
        players={everyone}
        names={names}
        lines={lines}
        onMode={log.setMode}
        onTapPlayer={log.tapPlayer}
      />

      <MatchLogSurface
        lines={lines}
        removed={log.removed}
        players={players}
        names={names}
        onOpen={setEditingId}
        onRemove={log.remove}
        onUndo={log.undo}
      />

      {save.error ? (
        <Text size="meta" accessibilityRole="alert">
          {save.error.message}
        </Text>
      ) : null}

      <RedCardSheet
        player={redFor}
        team={ofSide(names, redFor?.sideIndex ?? 1)}
        onCancel={log.cancelRedCard}
        onGive={log.giveRedCard}
      />
      <LogLineSheet
        line={editing}
        players={everyone}
        names={names}
        onClose={() => setEditingId(null)}
        onChangePlayer={log.changePlayer}
        onChangeMinute={log.changeMinute}
        onChangeReason={log.changeReason}
        onRemove={(id) => {
          log.remove(id);
          setEditingId(null);
        }}
      />
    </Screen>
  );
}
