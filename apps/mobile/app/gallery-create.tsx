import { createCreateGameFixtures } from "@repo/domain/create-game-fixtures";
import type { CreateGameFixtureKey } from "@repo/domain/create-game-fixtures";
import { Redirect } from "expo-router";
import { useMemo, useState } from "react";
import { View } from "react-native";

import { CreateView } from "../src/create-game/create-view";
import {
  submitRequest,
  type CreateState,
} from "../src/create-game/create-model";
import type { Slot } from "../src/home/home-model";
import { Button } from "../src/primitives/button";
import { Text } from "../src/primitives/text";

type Picker =
  | "loose"
  | "club"
  | "clubUnlinked"
  | "archivedClub"
  | "emptyCatalog";

const STATES: readonly {
  key: string;
  label: string;
  type: CreateState["type"];
  step: CreateState["step"];
  draft: CreateGameFixtureKey;
  picker: Picker;
  failing?: boolean;
  pending?: boolean;
}[] = [
  {
    key: "type",
    label: "Type",
    type: null,
    step: 1,
    draft: "emptyGame",
    picker: "loose",
  },
  {
    key: "typePicked",
    label: "Type: picked",
    type: "friendly_tournament",
    step: 1,
    draft: "emptyGame",
    picker: "loose",
  },
  {
    key: "gameWhereEmpty",
    label: "Game: no Group",
    type: "friendly_game",
    step: 2,
    draft: "emptyGame",
    picker: "loose",
  },
  {
    key: "gameWhere",
    label: "Game: where",
    type: "friendly_game",
    step: 2,
    draft: "gameWhereFilled",
    picker: "loose",
  },
  {
    key: "clubLocked",
    label: "Club: linked Venue",
    type: "friendly_game",
    step: 2,
    draft: "gameWhereFilled",
    picker: "club",
  },
  {
    key: "clubUnlinked",
    label: "Club: no link",
    type: "friendly_game",
    step: 2,
    draft: "gameWhereFilled",
    picker: "clubUnlinked",
  },
  {
    key: "archivedClub",
    label: "Club: Venue archived",
    type: "friendly_game",
    step: 2,
    draft: "gameWhereFilled",
    picker: "archivedClub",
  },
  {
    key: "emptyCatalog",
    label: "No live Venues",
    type: "friendly_game",
    step: 2,
    draft: "gameWhereFilled",
    picker: "emptyCatalog",
  },
  {
    key: "gameWhen",
    label: "Game: when",
    type: "friendly_game",
    step: 3,
    draft: "gameWhenFilled",
    picker: "loose",
  },
  {
    key: "gameReview",
    label: "Game: review",
    type: "friendly_game",
    step: 4,
    draft: "gameReview",
    picker: "loose",
  },
  {
    key: "gameCreating",
    label: "Game: creating",
    type: "friendly_game",
    step: 4,
    draft: "gameReview",
    picker: "loose",
    pending: true,
  },
  {
    key: "invertedLevel",
    label: "Inverted Level range",
    type: "friendly_game",
    step: 4,
    draft: "invertedLevelRange",
    picker: "loose",
    failing: true,
  },
  {
    key: "badPrice",
    label: "Bad price",
    type: "friendly_game",
    step: 4,
    draft: "badPrice",
    picker: "loose",
    failing: true,
  },
  {
    key: "tournamentWhere",
    label: "Tournament: where",
    type: "friendly_tournament",
    step: 2,
    draft: "tournamentWhere",
    picker: "loose",
  },
  {
    key: "groupsOnly",
    label: "Groups only",
    type: "friendly_tournament",
    step: 3,
    draft: "tournamentGroupsOnly",
    picker: "loose",
  },
  {
    key: "knockoutOnly",
    label: "Knockout only",
    type: "friendly_tournament",
    step: 3,
    draft: "tournamentKnockoutOnly",
    picker: "loose",
  },
  {
    key: "groupsThenKnockout",
    label: "Groups, then knockout",
    type: "friendly_tournament",
    step: 3,
    draft: "tournamentGroupsThenKnockout",
    picker: "loose",
  },
  {
    key: "teamCount",
    label: "Team count does not fit",
    type: "friendly_tournament",
    step: 3,
    draft: "teamCountDoesNotFit",
    picker: "loose",
  },
  {
    key: "tournamentReview",
    label: "Tournament: review",
    type: "friendly_tournament",
    step: 4,
    draft: "tournamentReview",
    picker: "loose",
  },
];

const LOADERS = [
  { key: "ready", label: "Ready" },
  { key: "loading", label: "Loading" },
  { key: "error", label: "Error" },
  { key: "noGroups", label: "No Groups" },
] as const;

export default function GalleryCreate() {
  const fixtures = useMemo(() => createCreateGameFixtures(), []);
  const [stateKey, setStateKey] = useState<string>(STATES[0]?.key ?? "type");
  const [loader, setLoader] =
    useState<(typeof LOADERS)[number]["key"]>("ready");

  if (!__DEV__) {
    return <Redirect href="/" />;
  }

  const entry = STATES.find((item) => item.key === stateKey) ?? STATES[0];
  if (!entry) {
    return null;
  }
  const draft = { ...fixtures.drafts[entry.draft] };
  const state: CreateState = { type: entry.type, step: entry.step, draft };
  const errors = entry.failing
    ? (() => {
        const result = submitRequest(state, fixtures.now);
        return result.ok ? {} : result.errors;
      })()
    : {};
  const groups: Slot<typeof fixtures.groups> =
    loader === "loading"
      ? { status: "loading" }
      : loader === "error"
        ? { status: "error", message: "Network request failed" }
        : {
            status: "ready",
            value: loader === "noGroups" ? [] : fixtures.groups,
          };
  const picker: Slot<(typeof fixtures.pickers)["loose"]> | null =
    entry.step === 1 || !draft.groupId
      ? null
      : { status: "ready", value: fixtures.pickers[entry.picker] };
  const noop = () => undefined;

  return (
    <CreateView
      state={state}
      now={fixtures.now}
      errors={errors}
      formMessage={null}
      groups={groups}
      picker={picker}
      pending={entry.pending ?? false}
      dispatch={noop}
      onBack={noop}
      onContinue={noop}
      onCancel={noop}
      onRetry={noop}
    >
      <View style={{ gap: 12 }}>
        <Text size="h2" weight="semibold">
          Create states
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {STATES.map((item) => (
            <Button
              key={item.key}
              label={item.label}
              size="sm"
              variant={item.key === stateKey ? "default" : "outline"}
              selected={item.key === stateKey}
              onPress={() => setStateKey(item.key)}
            />
          ))}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {LOADERS.map((item) => (
            <Button
              key={item.key}
              label={item.label}
              size="sm"
              variant={item.key === loader ? "default" : "outline"}
              selected={item.key === loader}
              onPress={() => setLoader(item.key)}
            />
          ))}
        </View>
      </View>
    </CreateView>
  );
}
