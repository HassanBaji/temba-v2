import { spacing } from "@repo/design-tokens";
import type { GroupPlayedGameData } from "@repo/domain/group-data";
import type { HubGameRow } from "@repo/domain/hub-game-row";
import {
  GROUP_ARCHIVE_GAMES_COPY,
  groupGamesEmptyDescription,
} from "@repo/domain/group-join";
import { Pressable, View } from "react-native";

import { GameCard, type GameCardActions } from "../games/game-card";
import { hubItems } from "../games/games-model";
import { TournamentCard } from "../games/tournament-cards";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { ResultMark } from "../primitives/result-mark";
import { Section } from "../primitives/section";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import {
  GAMES_EMPTY_TITLE,
  PLAYED_EMPTY_COPY,
  SCHEDULED_EMPTY_COPY,
  playedRowView,
  type PlayedRowView,
} from "./group-home-model";
import { Notice } from "./notice";

export type GamesTabProps = {
  upcomingGames: HubGameRow[];
  playedGames: GroupPlayedGameData[];
  isCommunityArchived: boolean;
  pendingGameId: string | null;
  canLoadMore: boolean;
  loadingMore: boolean;
  loadMoreFailed: boolean;
  actions: GameCardActions;
  onPickSeat: (game: HubGameRow) => void;
  onLoadMore: () => void;
};

function PlayedRow({
  row,
  onOpen,
}: {
  row: PlayedRowView;
  onOpen: (gameId: string) => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={row.accessibilityLabel}
      onPress={() => onOpen(row.id)}
      style={({ pressed }) => ({
        minHeight: 64,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: spacing.surface,
        paddingVertical: 14,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <ResultMark variant={row.mark} size={20} decorative />
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ flex: 1, minWidth: 0 }}
      >
        <Text numberOfLines={1}>{row.title}</Text>
        <Text size="meta" tone="muted" numberOfLines={1}>
          {row.subtitle}
        </Text>
      </View>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {row.trailing.kind === "cancelled" ? (
          <Text size="meta" tone="muted">
            Cancelled
          </Text>
        ) : row.trailing.kind === "score" ? (
          <Text width="expanded" weight="semibold">
            {row.trailing.text}
          </Text>
        ) : (
          <Text size="meta" weight="semibold">
            Enter
          </Text>
        )}
      </View>
    </Pressable>
  );
}

export function GamesTab(props: GamesTabProps) {
  const { upcomingGames, playedGames, actions } = props;

  if (upcomingGames.length === 0 && playedGames.length === 0) {
    return (
      <Notice
        title={GAMES_EMPTY_TITLE}
        description={groupGamesEmptyDescription(props.isCommunityArchived)}
      />
    );
  }

  return (
    <View style={{ gap: spacing.section }}>
      <Section title="Scheduled">
        {props.isCommunityArchived ? (
          <Text tone="muted">{GROUP_ARCHIVE_GAMES_COPY}</Text>
        ) : null}
        {upcomingGames.length === 0 ? (
          <Text tone="muted">{SCHEDULED_EMPTY_COPY}</Text>
        ) : (
          <View style={{ gap: 12 }}>
            {hubItems(upcomingGames).map((item) => {
              const pending = props.pendingGameId === item.game.id;
              return item.kind === "game" ? (
                <GameCard
                  key={item.key}
                  item={item}
                  pending={pending}
                  actions={actions}
                />
              ) : (
                <TournamentCard
                  key={item.key}
                  game={item.game}
                  pending={pending}
                  actions={actions}
                  onPickSeat={props.onPickSeat}
                />
              );
            })}
          </View>
        )}
      </Section>

      <Section title="Played">
        {playedGames.length === 0 ? (
          <Text tone="muted">{PLAYED_EMPTY_COPY}</Text>
        ) : (
          <>
            <Surface padded={false} style={{ overflow: "hidden" }}>
              {playedGames.map((game, index) => (
                <View key={game.id}>
                  {index > 0 ? <Hairline /> : null}
                  <PlayedRow
                    row={playedRowView(game)}
                    onOpen={actions.onOpen}
                  />
                </View>
              ))}
            </Surface>
            {props.loadMoreFailed ? (
              <Text tone="muted" accessibilityRole="alert">
                More Games could not be loaded.
              </Text>
            ) : null}
            {props.canLoadMore ? (
              <View style={{ alignItems: "center" }}>
                <Button
                  label="Load more"
                  variant="outline"
                  pending={props.loadingMore}
                  onPress={props.onLoadMore}
                />
              </View>
            ) : null}
          </>
        )}
      </Section>
    </View>
  );
}
