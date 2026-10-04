import { Redirect } from "expo-router";
import { useMemo, useState } from "react";
import { View } from "react-native";
import { createHomeFixtures } from "@repo/domain/home-fixtures";

import { homeModelFromFixture } from "../src/home/home-model";
import { HomeView } from "../src/home/home-view";
import { Button } from "../src/primitives/button";
import { Screen } from "../src/primitives/screen";
import { Text } from "../src/primitives/text";

const STATES = [
  { key: "provisional", label: "Provisional" },
  { key: "confirmed", label: "Playing now" },
  { key: "needsResults", label: "Add results" },
  { key: "noGames", label: "No Games" },
  { key: "noGroup", label: "No Group" },
] as const;

type StateKey = (typeof STATES)[number]["key"];

export default function GalleryHome() {
  const [state, setState] = useState<StateKey>("provisional");
  const fixtures = useMemo(() => createHomeFixtures(), []);
  const model = useMemo(
    () => homeModelFromFixture(fixtures[state]),
    [fixtures, state],
  );

  if (!__DEV__) {
    return <Redirect href="/" />;
  }

  return (
    <Screen>
      <Text size="h2" weight="semibold">
        Home states
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
      <HomeView
        model={model}
        onNavigate={() => undefined}
        onRetry={() => undefined}
      />
    </Screen>
  );
}
