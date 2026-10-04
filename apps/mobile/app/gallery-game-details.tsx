import {
  FRIENDLY_GAME_DETAILS_FIXTURE_LABELS,
  PARTNER_SUGGESTION_FIXTURES,
  createFriendlyGameDetailsFixtures,
  type FriendlyGameDetailsFixtureKey,
} from "@repo/domain/friendly-game-details-fixtures";
import { offersPartnerJoin } from "@repo/domain/friendly-game-partner";
import { Redirect } from "expo-router";
import { useMemo, useState } from "react";
import { View } from "react-native";

import {
  GameDetailsBar,
  GameDetailsContent,
  type DetailsHandlers,
} from "../src/game-details/details-content";
import { JoinSheet } from "../src/game-details/join-sheet";
import { Button } from "../src/primitives/button";
import { Screen } from "../src/primitives/screen";
import { Text } from "../src/primitives/text";

const KEYS = Object.keys(
  FRIENDLY_GAME_DETAILS_FIXTURE_LABELS,
) as FriendlyGameDetailsFixtureKey[];

const noop = () => undefined;

const handlers: DetailsHandlers = {
  movePending: false,
  scorePending: false,
  confirmPending: false,
  levelRequestPending: false,
  footerPendingKind: null,
  onMove: noop,
  onSaveSets: noop,
  onConfirm: noop,
  onRequestLevel: noop,
  onFooterAction: noop,
};

export default function GalleryGameDetails() {
  const [key, setKey] = useState<FriendlyGameDetailsFixtureKey>("registered");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [query, setQuery] = useState("");
  const fixtures = useMemo(() => createFriendlyGameDetailsFixtures(), []);
  const game = fixtures[key];

  if (!__DEV__) {
    return <Redirect href="/" />;
  }

  const offersPartner = offersPartnerJoin({
    canRegister: game.canRegister,
    format: game.format,
    registrationMode: game.registrationMode,
    sides: game.sides,
  });

  return (
    <Screen>
      <Text size="h2" weight="semibold">
        Game details states
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {KEYS.map((entry) => (
          <Button
            key={entry}
            label={FRIENDLY_GAME_DETAILS_FIXTURE_LABELS[entry]}
            size="sm"
            variant={entry === key ? "default" : "outline"}
            selected={entry === key}
            onPress={() => setKey(entry)}
          />
        ))}
      </View>
      <GameDetailsContent game={game} handlers={handlers} />
      <GameDetailsBar
        game={game}
        inset={false}
        handlers={{
          joinPending: false,
          leaveWaitlistPending: false,
          onJoin: () => setSheetOpen(true),
          onJoinWaitlist: noop,
          onLeaveWaitlist: noop,
          onBrowse: noop,
        }}
      />
      <JoinSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        game={{
          title: "Padel with Bromma",
          sides: game.sides,
          pricePerPlayerFils: game.pricePerPlayerFils,
          windowStart: game.windowStart,
          venueName: game.venue?.name ?? null,
          isOrganizer: game.isOrganizer,
          levelMinTenths: game.levelMinTenths,
          levelMaxTenths: game.levelMaxTenths,
          offersPartner,
        }}
        preferredPosition="right"
        seatPending={false}
        partnerPending={false}
        error={null}
        suggestions={{ status: "ready", value: PARTNER_SUGGESTION_FIXTURES }}
        searchResults={{ status: "ready", value: [] }}
        query={query}
        onQueryChange={setQuery}
        onJoinSeat={noop}
        onRegisterWithPartner={noop}
      />
    </Screen>
  );
}
