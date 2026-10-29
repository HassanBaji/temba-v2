import { colors, radii, sizes, spacing } from "@repo/design-tokens";
import type {
  GroupLeaderboardEntryData,
  GroupPlayedGameData,
} from "@repo/domain/group-data";
import {
  groupGamePlayersNeeded,
  groupGamesEmptyLine,
} from "@repo/domain/group-empty-states";
import type { HubGameRow } from "@repo/domain/hub-game-row";
import {
  GROUP_ARCHIVE_GAMES_COPY,
  groupGamesEmptyDescription,
} from "@repo/domain/group-join";
import { useRouter, type Href } from "expo-router";
import { UserPlus } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { FootballGameCard } from "../games/football-game-card";
import { GameCard, type GameCardActions } from "../games/game-card";
import {
  footballJoinPath,
  footballScorePath,
  hubItems,
} from "../games/games-model";
import { TournamentCard } from "../games/tournament-cards";
import { mediaUrl } from "../lib/media-url";
import { NotSetCell } from "../lib/not-set-cell";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { Hatch } from "../primitives/hatch";
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
  sport: string | null;
  members: GroupLeaderboardEntryData[];
  isMember: boolean;
  apiOrigin: string;
  onInvite?: () => void;
  createGameHref?: Href;
};

const SEAT_SIZE = 32;

/**
 * Design "Group empty states" 02: the first Game drawn as a placeholder card,
 * its seats filled by the members so far and hatched for the rest.
 */
function NoGamesYet(props: GamesTabProps) {
  const router = useRouter();
  const { onInvite, createGameHref } = props;
  const needed = groupGamePlayersNeeded(props.sport);
  const seated = [...props.members]
    .sort((a, b) => Number(b.isViewer) - Number(a.isViewer))
    .slice(0, needed);

  return (
    <View style={{ gap: spacing.compact }}>
      <Surface padded={false} style={{ overflow: "hidden" }}>
        <View style={{ padding: spacing.surface, gap: spacing.compact }}>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Text size="meta" tone="muted">
              Next Game
            </Text>
            <Text size="meta" tone="muted">
              Not scheduled
            </Text>
          </View>
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}
          >
            {seated.map((member) => (
              <Avatar
                key={member.userId}
                name={member.name ?? "Member"}
                uri={mediaUrl(member.image, props.apiOrigin)}
                radius={radii.sm}
              />
            ))}
            {Array.from({ length: needed - seated.length }, (_, index) => (
              <View key={index} style={{ width: SEAT_SIZE, height: SEAT_SIZE }}>
                <Hatch radius={radii.sm} />
              </View>
            ))}
          </View>
          <View style={{ gap: 8 }}>
            <Text
              size="h1"
              width="expanded"
              weight="bold"
              accessibilityRole="header"
            >
              {GAMES_EMPTY_TITLE}
            </Text>
            <Text tone="muted">
              {groupGamesEmptyLine({
                sport: props.sport,
                memberCount: props.members.length,
                isMember: props.isMember,
              })}
            </Text>
          </View>
        </View>
        <Hairline />
        <View style={{ flexDirection: "row" }}>
          <NotSetCell label="When" divided={false} />
          <NotSetCell label="Where" divided />
        </View>
      </Surface>
      {createGameHref || onInvite ? (
        <View style={{ gap: 8 }}>
          {createGameHref ? (
            <Button
              label="Create the first Game"
              size="lg"
              onPress={() => router.push(createGameHref)}
            />
          ) : null}
          {onInvite ? (
            <Button
              label="Invite players"
              size="lg"
              variant={createGameHref ? "outline" : "default"}
              icon={
                <UserPlus
                  size={sizes.iconAction}
                  color={createGameHref ? colors.ink : colors.paper}
                />
              }
              onPress={onInvite}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

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
  const router = useRouter();
  const footballActions = {
    onOpen: actions.onOpen,
    onJoinWaitlist: actions.onJoinWaitlist,
    onJoin: (gameId: string) => router.push(footballJoinPath(gameId)),
    onEnterScore: (gameId: string) => router.push(footballScorePath(gameId)),
    onConfirm: (gameId: string) => actions.onOpen(gameId),
  };

  if (
    upcomingGames.length === 0 &&
    playedGames.length === 0 &&
    !props.isCommunityArchived
  ) {
    return <NoGamesYet {...props} />;
  }

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
              if (item.kind === "football") {
                return (
                  <FootballGameCard
                    key={item.key}
                    game={item.game}
                    pending={pending}
                    actions={footballActions}
                  />
                );
              }
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
