import { spacing } from "@repo/design-tokens";
import type { CardSeatPosition } from "@repo/domain/game-card";
import type { HubGameRow, HubHistoryRow } from "@repo/domain/hub-game-row";
import { View } from "react-native";

import { Button } from "../primitives/button";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import type { Slot } from "../home/home-model";
import { GameCard, type GameCardActions } from "./game-card";
import {
  hubItems,
  historyEmptyCopy,
  myGamesEmptyCopy,
  tabCount,
  type GamesTab,
} from "./games-model";
import { HistoryCard } from "./history-card";
import { SeatPickerSheet } from "./seat-picker-sheet";
import { TournamentCard, TournamentMatchCard } from "./tournament-cards";

const LIST_GAP = 12;

export type GamesViewProps = {
  tab: GamesTab;
  onTabChange: (tab: GamesTab) => void;
  myGames: Slot<HubGameRow[]>;
  history: Slot<HubHistoryRow[]>;
  historyHasMore: boolean;
  historyLoadingMore: boolean;
  historyLoadMoreFailed?: string | null;
  pendingGameId: string | null;
  pickerGame: HubGameRow | null;
  hasCreateAccess: boolean;
  onOpenPicker: (game: HubGameRow | null) => void;
  onOpen: (gameId: string) => void;
  onJoinSeat: (
    gameId: string,
    sideIndex: number,
    position: CardSeatPosition,
  ) => void;
  onJoinWaitlist: (game: HubGameRow) => void;
  onRegister: (gameId: string) => void;
  onLoadMore: () => void;
  onCreate: () => void;
  onRetry: () => void;
};

function Failure({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <Surface accessibilityRole="alert" style={{ gap: 8 }}>
      <Text size="lead" weight="semibold">
        Games could not be loaded
      </Text>
      <Text size="meta" tone="muted">
        {message}
      </Text>
      <View style={{ flexDirection: "row", marginTop: 4 }}>
        <Button label="Try again" variant="outline" onPress={onRetry} />
      </View>
    </Surface>
  );
}

function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Surface style={{ gap: 4 }}>
      <Text size="lead" weight="semibold">
        {title}
      </Text>
      <Text size="meta" tone="muted">
        {description}
      </Text>
      {action ? (
        <View style={{ flexDirection: "row", marginTop: 12 }}>{action}</View>
      ) : null}
    </Surface>
  );
}

function ListSkeleton() {
  return (
    <View style={{ gap: LIST_GAP }} accessibilityLabel="Loading Games">
      {[0, 1, 2].map((key) => (
        <Skeleton key={key} height={220} radius={16} />
      ))}
    </View>
  );
}

function TabButtons({
  tab,
  onTabChange,
  myGamesCount,
  historyCount,
}: {
  tab: GamesTab;
  onTabChange: (tab: GamesTab) => void;
  myGamesCount: number | null;
  historyCount: number | null;
}) {
  const tabs = [
    { key: "my-games", label: "My Games", count: myGamesCount },
    { key: "history", label: "History", count: historyCount },
  ] as const;
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {tabs.map((entry) => (
        <Button
          key={entry.key}
          label={entry.count ? `${entry.label} ${entry.count}` : entry.label}
          size="sm"
          variant={entry.key === tab ? "default" : "outline"}
          selected={entry.key === tab}
          onPress={() => onTabChange(entry.key)}
        />
      ))}
    </View>
  );
}

export function GamesView(props: GamesViewProps) {
  const { tab, myGames, history } = props;
  const actions: GameCardActions = {
    onOpen: props.onOpen,
    onJoinSeat: props.onJoinSeat,
    onJoinWaitlist: props.onJoinWaitlist,
    onRegister: props.onRegister,
  };
  const myGamesCount =
    myGames.status === "ready" ? tabCount(myGames.value.length) : null;
  const historyCount =
    history.status === "ready" && !props.historyHasMore
      ? tabCount(history.value.length)
      : null;

  return (
    <View style={{ gap: spacing.compact }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Text size="h1" weight="bold" accessibilityRole="header">
          Games
        </Text>
        {props.hasCreateAccess ? (
          <Button
            label="Create Game"
            size="sm"
            variant="outline"
            onPress={props.onCreate}
          />
        ) : null}
      </View>
      <TabButtons
        tab={tab}
        onTabChange={props.onTabChange}
        myGamesCount={myGamesCount}
        historyCount={historyCount}
      />
      {tab === "my-games" ? (
        <MyGamesList {...props} actions={actions} />
      ) : (
        <HistoryList {...props} />
      )}
      <SeatPickerSheet
        game={props.pickerGame}
        pending={props.pendingGameId != null}
        onClose={() => props.onOpenPicker(null)}
        onPick={(gameId, sideIndex, position) => {
          props.onOpenPicker(null);
          props.onJoinSeat(gameId, sideIndex, position);
        }}
      />
    </View>
  );
}

function MyGamesList(props: GamesViewProps & { actions: GameCardActions }) {
  const { myGames, actions } = props;
  if (myGames.status === "loading") {
    return <ListSkeleton />;
  }
  if (myGames.status === "error") {
    return <Failure message={myGames.message} onRetry={props.onRetry} />;
  }
  if (myGames.value.length === 0) {
    return (
      <Empty
        {...myGamesEmptyCopy()}
        action={
          props.hasCreateAccess ? (
            <Button label="Create Game" onPress={props.onCreate} />
          ) : undefined
        }
      />
    );
  }
  return (
    <View style={{ gap: LIST_GAP }}>
      {hubItems(myGames.value).map((item) => {
        const pending = props.pendingGameId === item.game.id;
        if (item.kind === "match") {
          return (
            <TournamentMatchCard
              key={item.key}
              game={item.game}
              actions={actions}
            />
          );
        }
        if (item.kind === "tournament") {
          return (
            <TournamentCard
              key={item.key}
              game={item.game}
              pending={pending}
              actions={actions}
              onPickSeat={props.onOpenPicker}
            />
          );
        }
        return (
          <GameCard
            key={item.key}
            item={item}
            pending={pending}
            actions={actions}
          />
        );
      })}
    </View>
  );
}

function HistoryList(props: GamesViewProps) {
  const { history } = props;
  if (history.status === "loading") {
    return <ListSkeleton />;
  }
  if (history.status === "error") {
    return <Failure message={history.message} onRetry={props.onRetry} />;
  }
  if (history.value.length === 0) {
    return <Empty {...historyEmptyCopy()} />;
  }
  return (
    <View style={{ gap: LIST_GAP }}>
      {history.value.map((row) => (
        <HistoryCard key={row.matchId} row={row} onOpen={props.onOpen} />
      ))}
      {props.historyLoadMoreFailed ? (
        <Failure
          message={props.historyLoadMoreFailed}
          onRetry={props.onLoadMore}
        />
      ) : props.historyHasMore ? (
        <View style={{ alignItems: "center" }}>
          <Button
            label="Load more"
            variant="outline"
            pending={props.historyLoadingMore}
            onPress={props.onLoadMore}
          />
        </View>
      ) : null}
    </View>
  );
}
