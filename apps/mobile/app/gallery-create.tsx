import { createCreateGameFixtures } from "@repo/domain/create-game-fixtures";
import type { CreateGameDraft } from "@repo/domain/create-game-draft";
import type { CreateGameFixtureKey } from "@repo/domain/create-game-fixtures";
import { Redirect } from "expo-router";
import { useMemo, useState } from "react";
import { View } from "react-native";

import { CreateView } from "../src/create-game/create-view";
import {
  advance,
  submitRequest,
  type CreateState,
  type FieldErrors,
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

const TOURNAMENT_DAY = "2026-10-09";

const STATES: readonly {
  key: string;
  label: string;
  type: CreateState["type"];
  step: CreateState["step"];
  draft: CreateGameFixtureKey;
  patch?: Partial<CreateGameDraft>;
  picker: Picker;
  failing?: boolean;
  pending?: boolean;
  pickerStatus?: "loading" | "error";
  venueSheetQuery?: string;
  server?: { message: string; errors: FieldErrors };
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
    key: "typeGame",
    label: "Type: Friendly game",
    type: "friendly_game",
    step: 1,
    draft: "emptyGame",
    picker: "loose",
  },
  {
    key: "typeTournament",
    label: "Type: Friendly tournament",
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
    key: "venueSheet",
    label: "Venue sheet",
    type: "friendly_game",
    step: 2,
    draft: "gameWhereFilled",
    picker: "loose",
    venueSheetQuery: "",
  },
  {
    key: "venueSheetQuery",
    label: "Venue sheet: query",
    type: "friendly_game",
    step: 2,
    draft: "gameWhereFilled",
    picker: "loose",
    venueSheetQuery: "riffa",
  },
  {
    key: "venueSheetEmpty",
    label: "Venue sheet: no results",
    type: "friendly_game",
    step: 2,
    draft: "gameWhereFilled",
    picker: "loose",
    venueSheetQuery: "Sitra",
  },
  {
    key: "gameVenuesLoading",
    label: "Game: Venues loading",
    type: "friendly_game",
    step: 2,
    draft: "gameWhereFilled",
    picker: "loose",
    pickerStatus: "loading",
  },
  {
    key: "gameVenuesError",
    label: "Game: Venues error",
    type: "friendly_game",
    step: 2,
    draft: "gameWhereFilled",
    picker: "loose",
    pickerStatus: "error",
  },
  {
    key: "gameWhereServerError",
    label: "Game: server error on where",
    type: "friendly_game",
    step: 2,
    draft: "gameWhereFilled",
    picker: "loose",
    server: {
      message: "Game could not be created.",
      errors: { venueId: "This Venue is no longer available." },
    },
  },
  {
    key: "gameWhenEmpty",
    label: "Game: when, empty",
    type: "friendly_game",
    step: 3,
    draft: "gameWhereFilled",
    picker: "loose",
  },
  {
    key: "gameWhenErrors",
    label: "Game: when, errors",
    type: "friendly_game",
    step: 3,
    draft: "gameWhereFilled",
    picker: "loose",
    failing: true,
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
    key: "gameWhenCustomFinish",
    label: "Game: when, custom finish",
    type: "friendly_game",
    step: 3,
    draft: "gameWhenFilled",
    patch: { finishTime: "22:30" },
    picker: "loose",
  },
  {
    key: "gameWhenLaterDate",
    label: "Game: when, later date",
    type: "friendly_game",
    step: 3,
    draft: "gameWhenFilled",
    patch: { day: "2026-10-20" },
    picker: "loose",
  },
  {
    key: "gameLevelPriceEmpty",
    label: "Game: Level and price, empty",
    type: "friendly_game",
    step: 4,
    draft: "gameWhenFilled",
    picker: "loose",
  },
  {
    key: "gameReview",
    label: "Game: Level and price, filled",
    type: "friendly_game",
    step: 4,
    draft: "gameReview",
    picker: "loose",
  },
  {
    key: "gameLevelPriceServerError",
    label: "Game: server error on Level and price",
    type: "friendly_game",
    step: 4,
    draft: "gameReview",
    picker: "loose",
    server: {
      message: "Game could not be created.",
      errors: { pricePerPlayerFils: "Price per player is too large" },
    },
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
    key: "tournamentWhereEmpty",
    label: "Tournament: where, empty",
    type: "friendly_tournament",
    step: 2,
    draft: "emptyGame",
    picker: "loose",
  },
  {
    key: "tournamentWhere",
    label: "Tournament: where, Courts picked",
    type: "friendly_tournament",
    step: 2,
    draft: "tournamentWhere",
    picker: "loose",
  },
  {
    key: "tournamentArchivedClub",
    label: "Tournament: Venue archived",
    type: "friendly_tournament",
    step: 2,
    draft: "tournamentWhere",
    patch: { venueId: "venue-riffa", courtIds: [] },
    picker: "archivedClub",
  },
  {
    key: "groupsOnly",
    label: "Groups only",
    type: "friendly_tournament",
    step: 3,
    draft: "tournamentGroupsOnly",
    patch: { day: TOURNAMENT_DAY },
    picker: "loose",
  },
  {
    key: "groupsUneven",
    label: "Groups only, uneven groups",
    type: "friendly_tournament",
    step: 3,
    draft: "tournamentGroupsOnly",
    patch: { day: TOURNAMENT_DAY, teamCount: 14, poolCount: 3 },
    picker: "loose",
  },
  {
    key: "groupsCustomRounds",
    label: "Groups only, custom Rounds",
    type: "friendly_tournament",
    step: 3,
    draft: "tournamentGroupsOnly",
    patch: { day: TOURNAMENT_DAY, roundCount: 2, matchMinutes: "25" },
    picker: "loose",
  },
  {
    key: "knockoutOnly",
    label: "Knockout only",
    type: "friendly_tournament",
    step: 3,
    draft: "tournamentKnockoutOnly",
    patch: { day: TOURNAMENT_DAY },
    picker: "loose",
  },
  {
    key: "knockoutOnlyByes",
    label: "Knockout only with Byes",
    type: "friendly_tournament",
    step: 3,
    draft: "tournamentKnockoutOnly",
    patch: { day: TOURNAMENT_DAY, teamCount: 12 },
    picker: "loose",
  },
  {
    key: "groupsThenKnockout",
    label: "Groups, then knockout",
    type: "friendly_tournament",
    step: 3,
    draft: "tournamentGroupsThenKnockout",
    patch: { day: TOURNAMENT_DAY },
    picker: "loose",
  },
  {
    key: "tournamentOverrun",
    label: "Tournament: schedule overruns",
    type: "friendly_tournament",
    step: 3,
    draft: "tournamentGroupsThenKnockout",
    patch: { day: TOURNAMENT_DAY, finishTime: "12:00" },
    picker: "loose",
  },
  {
    key: "tournamentNoCourts",
    label: "Tournament: no Courts",
    type: "friendly_tournament",
    step: 3,
    draft: "tournamentGroupsThenKnockout",
    patch: { day: TOURNAMENT_DAY, courtIds: [] },
    picker: "loose",
  },
  {
    key: "tournamentFormatErrors",
    label: "Tournament: format and day, errors",
    type: "friendly_tournament",
    step: 3,
    draft: "tournamentGroupsOnly",
    patch: { day: TOURNAMENT_DAY, matchMinutes: "7" },
    picker: "loose",
    failing: true,
  },
  {
    key: "tournamentFormatServerError",
    label: "Tournament: server error on format",
    type: "friendly_tournament",
    step: 3,
    draft: "tournamentGroupsThenKnockout",
    patch: { day: TOURNAMENT_DAY },
    picker: "loose",
    server: {
      message: "Tournament could not be created.",
      errors: {
        roundCount: "Pick a Round count in range",
        qualifiersPerPool: "Pick how many go through from each group",
      },
    },
  },
  {
    key: "teamCount",
    label: "Team count does not fit",
    type: "friendly_tournament",
    step: 3,
    draft: "teamCountDoesNotFit",
    patch: { day: TOURNAMENT_DAY },
    picker: "loose",
    failing: true,
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

function failingErrors(state: CreateState, now: Date): FieldErrors {
  if (state.step === 3) {
    const result = advance(state, {
      now,
      venuesPending: false,
      emptyCatalog: false,
    });
    return result.moved ? {} : result.errors;
  }
  const result = submitRequest(state, now);
  return result.ok ? {} : result.errors;
}

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
  const draft = { ...fixtures.drafts[entry.draft], ...entry.patch };
  const state: CreateState = { type: entry.type, step: entry.step, draft };
  const errors = entry.server
    ? entry.server.errors
    : entry.failing
      ? failingErrors(state, fixtures.now)
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
      : entry.pickerStatus === "loading"
        ? { status: "loading" }
        : entry.pickerStatus === "error"
          ? { status: "error", message: "Venues could not be loaded." }
          : { status: "ready", value: fixtures.pickers[entry.picker] };
  const noop = () => undefined;

  return (
    <CreateView
      key={entry.key}
      state={state}
      now={fixtures.now}
      errors={errors}
      formMessage={entry.server?.message ?? null}
      groups={groups}
      picker={picker}
      pending={entry.pending ?? false}
      dispatch={noop}
      onBack={noop}
      onContinue={noop}
      onCancel={noop}
      onRetry={noop}
      initialVenueSheetQuery={entry.venueSheetQuery}
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
