import { colors, radii, sizes, spacing } from "@repo/design-tokens";
import type { CardSeatPosition } from "@repo/domain/game-card";
import type { HubGameRow, HubHistoryRow } from "@repo/domain/hub-game-row";
import { Plus } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { Button } from "../primitives/button";
import { hairline } from "../primitives/hairline-width";
import { HeaderIconButton, ScreenHeader } from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import type { Slot } from "../home/home-model";
import { SportGlyph } from "../lib/sport-glyph";
import {
  FootballGameCard,
  type FootballCardActions,
} from "./football-game-card";
import { GameCard, type GameCardActions } from "./game-card";
import {
  filterBySport,
  footballSections,
  SPORT_FILTERS,
  type SportFilter,
} from "@repo/domain/football-hub";
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
import { useNow } from "./use-now";

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
  onOpenPicker: (game: HubGameRow | null) => void;
  onOpen: (gameId: string) => void;
  onJoinSeat: (
    gameId: string,
    sideIndex: number,
    position: CardSeatPosition,
  ) => void;
  onJoinWaitlist: (game: HubGameRow) => void;
  onRegister: (gameId: string) => void;
  sportFilter: SportFilter;
  onSportFilterChange: (filter: SportFilter) => void;
  football: Omit<FootballCardActions, "onOpen" | "onJoinWaitlist">;
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

const segmentBarStyle = {
  flexDirection: "row",
  borderRadius: radii.lg,
  borderWidth: hairline,
  borderColor: colors.rule,
  overflow: "hidden",
} as const;

function Segment({
  role,
  selected,
  first,
  onPress,
  children,
}: {
  role: "tab" | "radio";
  selected: boolean;
  first: boolean;
  onPress: () => void;
  children: (color: string) => React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityState={role === "tab" ? { selected } : { checked: selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: sizes.touchTarget,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        backgroundColor: selected ? colors.ink : colors.paper,
        borderLeftWidth: first ? 0 : hairline,
        borderLeftColor: colors.rule,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      {children(selected ? colors.paper : colors.muted)}
    </Pressable>
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
    { key: "my-games", label: "Upcoming", count: myGamesCount },
    { key: "history", label: "Played", count: historyCount },
  ] as const;
  return (
    <View accessibilityRole="tablist" style={segmentBarStyle}>
      {tabs.map((entry, index) => {
        const selected = entry.key === tab;
        return (
          <Segment
            key={entry.key}
            role="tab"
            selected={selected}
            first={index === 0}
            onPress={() => onTabChange(entry.key)}
          >
            {(color) => (
              <>
                <Text
                  weight={selected ? "semibold" : "regular"}
                  style={{ color }}
                >
                  {entry.label}
                </Text>
                {entry.count ? (
                  <Text style={{ color }}>{entry.count}</Text>
                ) : null}
              </>
            )}
          </Segment>
        );
      })}
    </View>
  );
}

function SportFilterRow({
  filter,
  onChange,
}: {
  filter: SportFilter;
  onChange: (filter: SportFilter) => void;
}) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="Sport"
      style={segmentBarStyle}
    >
      {SPORT_FILTERS.map((entry, index) => {
        const selected = entry.key === filter;
        return (
          <Segment
            key={entry.key}
            role="radio"
            selected={selected}
            first={index === 0}
            onPress={() => onChange(entry.key)}
          >
            {(color) => (
              <>
                <SportGlyph sport={entry.key} color={color} size={18} />
                <Text
                  weight={selected ? "semibold" : "regular"}
                  style={{ color }}
                >
                  {entry.label}
                </Text>
              </>
            )}
          </Segment>
        );
      })}
    </View>
  );
}

function SectionHead({ title, meta }: { title: string; meta: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
      <Text size="title" weight="semibold" accessibilityRole="header">
        {title}
      </Text>
      <Text size="meta" tone="muted">
        {meta}
      </Text>
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
      <ScreenHeader
        title="Games"
        actions={
          <HeaderIconButton
            icon={Plus}
            accessibilityLabel="Create Game"
            onPress={props.onCreate}
          />
        }
      />
      <TabButtons
        tab={tab}
        onTabChange={props.onTabChange}
        myGamesCount={myGamesCount}
        historyCount={historyCount}
      />
      {tab === "my-games" ? (
        <SportFilterRow
          filter={props.sportFilter}
          onChange={props.onSportFilterChange}
        />
      ) : null}
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
  const now = useNow();
  const footballActions: FootballCardActions = {
    ...props.football,
    onOpen: actions.onOpen,
    onJoinWaitlist: actions.onJoinWaitlist,
  };
  if (myGames.status === "loading") {
    return <ListSkeleton />;
  }
  if (myGames.status === "error") {
    return <Failure message={myGames.message} onRetry={props.onRetry} />;
  }
  const rows = filterBySport(myGames.value, props.sportFilter);
  if (rows.length === 0) {
    return (
      <Empty
        {...myGamesEmptyCopy()}
        action={<Button label="Create Game" onPress={props.onCreate} />}
      />
    );
  }
  if (props.sportFilter === "football") {
    return (
      <View style={{ gap: spacing.section }}>
        {footballSections(rows, now).map((section) => (
          <View key={section.key} style={{ gap: LIST_GAP }}>
            <SectionHead title={section.title} meta={section.meta} />
            {section.rows.map((game) => (
              <FootballGameCard
                key={game.id}
                game={game}
                pending={props.pendingGameId === game.id}
                actions={footballActions}
              />
            ))}
          </View>
        ))}
      </View>
    );
  }
  return (
    <View style={{ gap: LIST_GAP }}>
      {hubItems(rows).map((item) => {
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
