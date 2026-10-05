import { Redirect } from "expo-router";
import { useMemo, useState } from "react";
import { View } from "react-native";
import { createProfileFixtures } from "@repo/domain/profile-fixtures";

import { Button } from "../src/primitives/button";
import { Screen } from "../src/primitives/screen";
import { Text } from "../src/primitives/text";
import { profileModelFromFixture } from "../src/profile/profile-model";
import { ProfileView } from "../src/profile/profile-view";

const STATES = [
  { key: "provisional", label: "Provisional" },
  { key: "confirmed", label: "Confirmed" },
  { key: "topBand", label: "Top band" },
  { key: "newPlayer", label: "New player" },
] as const;

type StateKey = (typeof STATES)[number]["key"];

export default function GalleryProfile() {
  const [state, setState] = useState<StateKey>("provisional");
  const fixtures = useMemo(() => createProfileFixtures(), []);
  const model = useMemo(
    () => profileModelFromFixture(fixtures[state]),
    [fixtures, state],
  );
  const selectedPosition =
    model.position.status === "ready" ? model.position.value.position : null;

  if (!__DEV__) {
    return <Redirect href="/" />;
  }

  return (
    <Screen>
      <Text size="h2" weight="semibold">
        Profile states
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
      <ProfileView
        key={state}
        model={model}
        selectedPosition={selectedPosition}
        savingPosition={false}
        changingPhoto={false}
        signingOut={false}
        onChangePhoto={() => undefined}
        onSelectPosition={() => undefined}
        onOpen={() => undefined}
        onSignOut={() => undefined}
        onRetry={() => undefined}
      />
    </Screen>
  );
}
