import { sizes } from "@repo/design-tokens";
import { resultMarkVariant } from "@repo/domain/result-mark";
import {
  matchTrailing,
  poolRoundGroups,
  viewerRoundSubtitle,
  type MatchTrailing,
  type TournamentDetails,
  type TournamentStandingsView,
} from "@repo/domain/tournament-details";
import {
  POOLS_SEGMENT_LABEL,
  defaultStandingsPoolIndex,
  otherPoolsPlayedSummary,
  roundResultsHeading,
} from "@repo/domain/tournament-home";
import { KNOCKOUT_NOT_THROUGH_COPY } from "@repo/domain/tournament-knockout-view";
import {
  POOL_WINNER_LABEL,
  TOURNAMENT_FINISHED_COPY,
  YOUR_ROUNDS_HEADING,
  poolRecordDisplay,
} from "@repo/domain/tournament-pool-table";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { Card } from "../home/card";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { ResultMark } from "../primitives/result-mark";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { KnockoutTree } from "./knockout-tree";
import { OpenSlot } from "./open-slot";

type PoolTables = NonNullable<TournamentDetails["poolTables"]>;
type Pool = PoolTables["pools"][number];

const STAT_WIDTH = 34;

function Trailing({ trailing }: { trailing: MatchTrailing }) {
  if (trailing.kind === "open") {
    return <OpenSlot label={trailing.label} />;
  }
  if (trailing.kind === "not_played") {
    return (
      <Text size="meta" tone="muted">
        {trailing.label}
      </Text>
    );
  }
  return (
    <Text size="lead" width="expanded" weight="semibold">
      {trailing.label}
    </Text>
  );
}

function RecordTable({
  rows,
  finished,
}: {
  rows: Pool["rows"];
  finished: boolean;
}) {
  const palette = useTonePalette();
  const heads = ["P", "W", "D", "L"];
  return (
    <Card>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          gap: 8,
        }}
      >
        <Text size="eyebrow" tone="muted" style={{ width: 20 }}>
          #
        </Text>
        <Text size="eyebrow" tone="muted" style={{ flex: 1 }}>
          Game team
        </Text>
        {heads.map((head) => (
          <Text
            key={head}
            size="eyebrow"
            tone="muted"
            style={{ width: STAT_WIDTH, textAlign: "center" }}
          >
            {head}
          </Text>
        ))}
      </View>
      {rows.map((row) => {
        const stats = [row.played, row.won, row.drawn, row.lost];
        return (
          <View key={row.gameTeamId}>
            <Hairline />
            <View
              accessible
              accessibilityLabel={`${row.position}. ${row.name}. Played ${poolRecordDisplay(row.played)}, won ${poolRecordDisplay(row.won)}, drawn ${poolRecordDisplay(row.drawn)}, lost ${poolRecordDisplay(row.lost)}${finished && row.isWinner ? `. ${POOL_WINNER_LABEL}` : ""}`}
              style={{
                minHeight: sizes.touchTarget,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingHorizontal: 16,
                paddingVertical: 10,
                backgroundColor: row.isViewer ? palette.wash : undefined,
              }}
            >
              <Text
                size="body"
                width="expanded"
                style={{ width: 20 }}
                accessibilityElementsHidden
                importantForAccessibility="no"
              >
                {row.position}
              </Text>
              <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                <Text
                  size="body"
                  weight={row.isViewer ? "semibold" : "regular"}
                  numberOfLines={1}
                >
                  {row.name}
                </Text>
                {finished && row.isWinner ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <ResultMark variant="won" size={16} decorative />
                    <Text size="eyebrow" tone="muted">
                      {POOL_WINNER_LABEL}
                    </Text>
                  </View>
                ) : null}
              </View>
              {stats.map((value, index) => (
                <Text
                  key={heads[index]}
                  size="lead"
                  width="expanded"
                  style={{ width: STAT_WIDTH, textAlign: "center" }}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                >
                  {poolRecordDisplay(value)}
                </Text>
              ))}
            </View>
          </View>
        );
      })}
    </Card>
  );
}

function ViewerRounds({ rounds }: { rounds: Pool["viewerRounds"] }) {
  if (rounds.length === 0) {
    return null;
  }
  return (
    <Card title={YOUR_ROUNDS_HEADING} flush>
      {rounds.map((round) => {
        const trailing = matchTrailing({
          cancelled: round.cancelled,
          scoreLabel: round.scoreLabel,
          viewerOutcome: round.viewerOutcome,
        });
        return (
          <View key={round.matchId}>
            <Hairline />
            <View
              style={{
                minHeight: sizes.touchTarget,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingHorizontal: 16,
                paddingVertical: 8,
              }}
            >
              <ResultMark
                variant={
                  round.cancelled
                    ? "not-played"
                    : resultMarkVariant(round.viewerOutcome)
                }
                size={22}
              />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text size="body" numberOfLines={1}>
                  {round.opponentName}
                </Text>
                <Text size="meta" tone="muted">
                  {viewerRoundSubtitle(round.roundNumber, round.startTime)}
                </Text>
              </View>
              <Trailing trailing={trailing} />
            </View>
          </View>
        );
      })}
    </Card>
  );
}

function RoundResults({
  matches,
  otherPools,
  onSelectPool,
}: {
  matches: Pool["matches"];
  otherPools: ReturnType<typeof otherPoolsPlayedSummary>;
  onSelectPool: (poolIndex: number) => void;
}) {
  const groups = poolRoundGroups(matches);
  const others = otherPools ? (
    <Pressable
      accessibilityRole="button"
      onPress={() => onSelectPool(otherPools.nextPoolIndex)}
      style={{
        minHeight: sizes.touchTarget,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 8,
      }}
    >
      <Text size="body" tone="muted" numberOfLines={1} style={{ flex: 1 }}>
        {otherPools.namesLine}
      </Text>
      <Text size="meta" tone="muted">
        {otherPools.playedLabel}
      </Text>
    </Pressable>
  ) : null;

  return (
    <View style={{ gap: 20 }}>
      {groups.map(({ roundNumber, matches: roundMatches }, index) => (
        <Card key={roundNumber} title={roundResultsHeading(roundNumber)} flush>
          {roundMatches.map((match) => (
            <View key={match.matchId}>
              <Hairline />
              <View
                style={{
                  minHeight: sizes.touchTarget,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                }}
              >
                <Text size="body" numberOfLines={1} style={{ flex: 1 }}>
                  {match.slot1Name}
                </Text>
                <Trailing
                  trailing={matchTrailing({
                    cancelled: match.cancelled,
                    scoreLabel: match.scoreLabel,
                  })}
                />
                <Text
                  size="body"
                  tone="muted"
                  numberOfLines={1}
                  style={{ flex: 1, textAlign: "right" }}
                >
                  {match.slot2Name}
                </Text>
              </View>
            </View>
          ))}
          {index === groups.length - 1 && others ? (
            <View>
              <Hairline />
              {others}
            </View>
          ) : null}
        </Card>
      ))}
      {groups.length === 0 && others ? <Card>{others}</Card> : null}
    </View>
  );
}

function PoolTablesSection({ poolTables }: { poolTables: PoolTables }) {
  const [selected, setSelected] = useState(
    defaultStandingsPoolIndex(poolTables.viewerPoolIndex, poolTables.pools),
  );
  const pool =
    poolTables.pools.find((entry) => entry.poolIndex === selected) ??
    poolTables.pools[0];
  if (!pool) {
    return null;
  }
  const viewerRounds =
    poolTables.pools.find(
      (entry) => entry.poolIndex === poolTables.viewerPoolIndex,
    )?.viewerRounds ?? [];
  return (
    <View style={{ gap: 16 }}>
      <View
        accessibilityRole="tablist"
        accessibilityLabel={POOLS_SEGMENT_LABEL}
        style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
      >
        {poolTables.pools.map((entry) => (
          <Button
            key={entry.poolIndex}
            label={entry.label}
            size="sm"
            variant={entry.poolIndex === pool.poolIndex ? "default" : "outline"}
            selected={entry.poolIndex === pool.poolIndex}
            onPress={() => setSelected(entry.poolIndex)}
          />
        ))}
      </View>
      <RecordTable rows={pool.rows} finished={pool.finished} />
      <ViewerRounds rounds={viewerRounds} />
      <RoundResults
        matches={pool.matches}
        otherPools={otherPoolsPlayedSummary(pool.poolIndex, poolTables.pools)}
        onSelectPool={setSelected}
      />
    </View>
  );
}

export function StandingsHeader({
  standings,
}: {
  standings: TournamentStandingsView;
}) {
  return (
    <View style={{ gap: 6 }}>
      {standings.roundsPlayed ? (
        <Text size="meta" tone="muted">
          {standings.roundsPlayed}
        </Text>
      ) : null}
      <Text
        size="h1Lg"
        width="expanded"
        weight="bold"
        accessibilityRole="header"
      >
        {standings.heading}
      </Text>
      <Text size="body">{standings.name}</Text>
      <Text size="meta" tone="muted">
        {standings.lead}
      </Text>
      {standings.finished ? (
        <Text size="meta" tone="muted">
          {TOURNAMENT_FINISHED_COPY}
        </Text>
      ) : null}
      {standings.championLine ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingTop: 4,
          }}
        >
          <ResultMark variant="won" size={24} decorative />
          <Text size="lead" weight="semibold">
            {standings.championLine}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export function StandingsView({
  game,
  standings,
}: {
  game: TournamentDetails;
  standings: TournamentStandingsView;
}) {
  const { poolTables, knockout } = game;
  return (
    <View style={{ gap: 24 }}>
      <StandingsHeader standings={standings} />
      {standings.showKnockoutTree && knockout ? (
        <KnockoutTree rounds={knockout} />
      ) : null}
      {standings.showPoolTables && poolTables ? (
        <PoolTablesSection poolTables={poolTables} />
      ) : null}
      {standings.knockoutSectionTitle && knockout ? (
        <View style={{ gap: 12 }}>
          <Text
            size="h2"
            width="expanded"
            weight="bold"
            accessibilityRole="header"
          >
            {standings.knockoutSectionTitle}
          </Text>
          {standings.notThrough ? (
            <Text size="meta" tone="muted">
              {KNOCKOUT_NOT_THROUGH_COPY}
            </Text>
          ) : null}
          <KnockoutTree rounds={knockout} />
        </View>
      ) : null}
    </View>
  );
}
