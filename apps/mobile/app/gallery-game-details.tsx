import {
  FRIENDLY_GAME_DETAILS_FIXTURE_LABELS,
  FRIENDLY_GAME_ORGANIZER_FIXTURE_LABELS,
  createFriendlyGameOrganizerFixtures,
  type FriendlyGameOrganizerFixtureKey,
  PARTNER_SUGGESTION_FIXTURES,
  createFriendlyGameDetailsFixtures,
  type FriendlyGameDetailsFixtureKey,
} from "@repo/domain/friendly-game-details-fixtures";
import { friendlyGameOrganizerPlan } from "@repo/domain/friendly-game-organizer";
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
import {
  OrganizerSheets,
  type EditSection,
} from "../src/game-details/organizer-sheets";
import type { OrganizerHandlers } from "../src/game-details/organizer-card";
import { Button } from "../src/primitives/button";
import { Screen } from "../src/primitives/screen";
import { ScreenHeader } from "../src/primitives/screen-header";
import { Text } from "../src/primitives/text";

const KEYS = Object.keys(
  FRIENDLY_GAME_DETAILS_FIXTURE_LABELS,
) as FriendlyGameDetailsFixtureKey[];

const ORGANIZER_KEYS = Object.keys(
  FRIENDLY_GAME_ORGANIZER_FIXTURE_LABELS,
) as FriendlyGameOrganizerFixtureKey[];

const noop = () => undefined;

const organizerHandlers: OrganizerHandlers = {
  registrationPending: false,
  completePending: false,
  decidingRequestId: null,
  onToggleRegistration: noop,
  onChooseCourt: noop,
  onComplete: noop,
  onApprove: noop,
  onReject: noop,
  onKickWaitlist: noop,
  onKickPlayer: noop,
};

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
  const [organizerKey, setOrganizerKey] =
    useState<FriendlyGameOrganizerFixtureKey | null>(null);
  const [editSection, setEditSection] = useState<EditSection | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [query, setQuery] = useState("");
  const fixtures = useMemo(() => createFriendlyGameDetailsFixtures(), []);
  const organizerFixtures = useMemo(
    () => createFriendlyGameOrganizerFixtures(),
    [],
  );
  const organizerGame = organizerKey ? organizerFixtures[organizerKey] : null;
  const organizerPlan = organizerGame
    ? friendlyGameOrganizerPlan(organizerGame)
    : null;
  const game = organizerGame ?? fixtures[key];

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
            selected={organizerKey == null && entry === key}
            onPress={() => {
              setOrganizerKey(null);
              setKey(entry);
            }}
          />
        ))}
      </View>
      <Text size="h2" weight="semibold">
        Organizer states
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {ORGANIZER_KEYS.map((entry) => (
          <Button
            key={entry}
            label={FRIENDLY_GAME_ORGANIZER_FIXTURE_LABELS[entry]}
            size="sm"
            variant={entry === organizerKey ? "default" : "outline"}
            selected={entry === organizerKey}
            onPress={() => setOrganizerKey(entry)}
          />
        ))}
      </View>
      {organizerPlan ? (
        <Button
          label="Edit Game sheets"
          variant="outline"
          onPress={() => setEditSection("menu")}
        />
      ) : null}
      <ScreenHeader nav="back" fallback="/games" />
      <GameDetailsContent
        game={game}
        handlers={handlers}
        organizer={
          organizerPlan
            ? { plan: organizerPlan, handlers: organizerHandlers }
            : null
        }
      />
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
      {organizerGame ? (
        <OrganizerSheets
          section={editSection}
          onSection={setEditSection}
          game={organizerGame}
          courtId="court-1"
          courts={{
            status: "ready",
            value: [
              { id: "court-1", name: "Court 1", venueName: "Riverside Padel" },
              { id: "court-2", name: "Court 2", venueName: "Riverside Padel" },
            ],
          }}
          now={new Date()}
          pending={{ window: false, price: false, level: false, court: false }}
          errors={{ window: null, price: null, level: null, court: null }}
          onSaveWindow={noop}
          onSavePrice={noop}
          onSaveLevel={noop}
          onChooseCourt={noop}
        />
      ) : null}
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
