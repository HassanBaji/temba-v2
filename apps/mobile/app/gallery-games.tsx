import { createGamesHubFixtures } from "@repo/domain/games-hub-fixtures";
import { Redirect } from "expo-router";
import { useMemo, useState } from "react";
import { View } from "react-native";

import { GamesView } from "../src/games/games-view";
import type { GamesTab } from "../src/games/games-model";
import { Button } from "../src/primitives/button";
import { Screen } from "../src/primitives/screen";
import { Text } from "../src/primitives/text";

const STATES = [
  { key: "mixed", label: "My Games" },
  { key: "tournamentMatches", label: "Tournament rows" },
  { key: "empty", label: "Empty" },
] as const;

type StateKey = (typeof STATES)[number]["key"];

export default function GalleryGames() {
  const [state, setState] = useState<StateKey>("mixed");
  const [tab, setTab] = useState<GamesTab>("my-games");
  const fixtures = useMemo(() => createGamesHubFixtures(), []);
  const fixture = fixtures[state];

  if (!__DEV__) {
    return <Redirect href="/" />;
  }

  const noop = () => undefined;

  return (
    <Screen>
      <Text size="h2" weight="semibold">
        Games states
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {STATES.map((entry) => (
          <Button
            key={entry.key}
            label={entry.label}
            size="sm"
            variant={entry.key === state ? "default" : "outline"}
            selected={entry.key === state}
            onPress={() => setState(entry.key)}
          />
        ))}
      </View>
      <GamesView
        tab={tab}
        onTabChange={setTab}
        myGames={{ status: "ready", value: fixture.myGames }}
        history={{ status: "ready", value: fixture.history }}
        historyHasMore={false}
        historyLoadingMore={false}
        pendingGameId={null}
        pickerGame={null}
        hasCreateAccess
        onOpenPicker={noop}
        onOpen={noop}
        onJoinSeat={noop}
        onJoinWaitlist={noop}
        onRegister={noop}
        onLoadMore={noop}
        onCreate={noop}
        onRetry={noop}
      />
    </Screen>
  );
}
