import { colors, radii, sizes, spacing } from "@repo/design-tokens";
import type {
  GroupLeaderboardEntryData,
  GroupPlayedGameData,
} from "@repo/domain/group-data";
import {
  groupGamePlayersNeeded,
  groupGamesEmptyLine,
} from "@repo/domain/group-empty-states";
import type {
  GroupPlayedCounts,
  GroupPlayedFilter,
} from "@repo/domain/group-played-filter";
import type { HubGameRow } from "@repo/domain/hub-game-row";
import { useRouter, type Href } from "expo-router";
import { UserPlus } from "lucide-react-native";
import { View } from "react-native";

import { FootballGameCard } from "../games/football-game-card";
import { GameCard, type GameCardActions } from "../games/game-card";
import {
  footballJoinPath,
  footballScorePath,
  hubItems,
} from "../games/games-model";
import { TournamentCard } from "../games/tournament-cards";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { mediaUrl } from "../lib/media-url";
import { NotSetCell } from "../lib/not-set-cell";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { Hatch } from "../primitives/hatch";
import { Section } from "../primitives/section";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { PlayedGames } from "./played-games";

export type GamesTabProps = {
  upcomingGames: HubGameRow[];
  playedGames: GroupPlayedGameData[];
  playedCounts: GroupPlayedCounts;
  playedFilter: GroupPlayedFilter;
  onPlayedFilterChange: (filter: GroupPlayedFilter) => void;
  filtering: boolean;
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
  const locale = useLocale();
  const m = useMessages();
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
              {m.mobileGroup.games.nextGame}
            </Text>
            <Text size="meta" tone="muted">
              {m.mobileGroup.games.notScheduled}
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
                name={member.name ?? m.mobileGroup.unnamedMember}
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
              {m.mobileGroup.games.emptyTitle}
            </Text>
            <Text tone="muted">
              {groupGamesEmptyLine({
                sport: props.sport,
                memberCount: props.members.length,
                isMember: props.isMember,
                locale,
              })}
            </Text>
          </View>
        </View>
        <Hairline />
        <View style={{ flexDirection: "row" }}>
          <NotSetCell label={m.mobileGroup.games.when} divided={false} />
          <NotSetCell label={m.mobileGroup.games.where} divided />
        </View>
      </Surface>
      {createGameHref || onInvite ? (
        <View style={{ gap: 8 }}>
          {createGameHref ? (
            <Button
              label={m.mobileGroup.standing.createFirstGame}
              size="lg"
              onPress={() => router.push(createGameHref)}
            />
          ) : null}
          {onInvite ? (
            <Button
              label={m.group.settings.menu.invite}
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

export function GamesTab(props: GamesTabProps) {
  const { upcomingGames, playedGames, actions } = props;
  const router = useRouter();
  const m = useMessages();
  const footballActions = {
    onOpen: actions.onOpen,
    onJoinWaitlist: actions.onJoinWaitlist,
    onJoin: (gameId: string) => router.push(footballJoinPath(gameId)),
    onEnterScore: (gameId: string) => router.push(footballScorePath(gameId)),
    onConfirm: (gameId: string) => actions.onOpen(gameId),
  };

  const noGames = upcomingGames.length === 0 && props.playedCounts.all === 0;

  if (noGames) {
    return <NoGamesYet {...props} />;
  }

  return (
    <View style={{ gap: spacing.section }}>
      <Section title={m.mobileGroup.games.scheduled}>
        {upcomingGames.length === 0 ? (
          <Text tone="muted">{m.mobileGroup.games.scheduledEmpty}</Text>
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

      <PlayedGames
        games={playedGames}
        counts={props.playedCounts}
        filter={props.playedFilter}
        onFilterChange={props.onPlayedFilterChange}
        filtering={props.filtering}
        sport={props.sport}
        canLoadMore={props.canLoadMore}
        loadingMore={props.loadingMore}
        loadMoreFailed={props.loadMoreFailed}
        onLoadMore={props.onLoadMore}
        onOpen={actions.onOpen}
        onEnterScore={(card) =>
          card.isFootball
            ? router.push(footballScorePath(card.id))
            : actions.onOpen(card.id)
        }
      />
    </View>
  );
}
