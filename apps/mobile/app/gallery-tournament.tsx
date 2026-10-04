import {
  createKnockoutTournamentFixtures,
  createTournamentFixtures,
  type TournamentFixture,
} from "@repo/domain/tournament-details-fixtures";
import { isKnockoutOnly } from "@repo/domain/tournament-rounds";
import { Redirect } from "expo-router";
import { useMemo, useState } from "react";
import { View } from "react-native";

import { Button } from "../src/primitives/button";
import { Screen } from "../src/primitives/screen";
import { Text } from "../src/primitives/text";
import { TournamentBar } from "../src/tournament/tournament-bar";
import { OrganizerSheets } from "../src/tournament/organizer-sheets";
import {
  TournamentContent,
  type TournamentHandlers,
} from "../src/tournament/tournament-content";
import type { TournamentSheet } from "../src/tournament/use-tournament-organizer";

const STATES = [
  { key: "preDrawWithoutSeat", label: "Before the draw" },
  { key: "preDrawSeatedHalfOpen", label: "Half team" },
  { key: "organizerTwoHalfTeams", label: "Organizer: merge" },
  { key: "organizerDraftedDraw", label: "Organizer: drafted" },
  { key: "organizerPosted", label: "Organizer: posted" },
  { key: "organizerKnockoutDraft", label: "Organizer: Knockout draft" },
  { key: "organizerKnockoutPosted", label: "Organizer: Knockout posted" },
  {
    key: "organizerGroupsThenKnockout",
    label: "Organizer: groups then knockout",
  },
  { key: "postedMid", label: "Posted" },
  { key: "finished", label: "Finished" },
  { key: "knockoutOnlyMid", label: "Knockout" },
  { key: "knockoutOnlyChampion", label: "Champion" },
  { key: "groupsThenKnockout", label: "Groups then knockout" },
  { key: "groupsThenKnockoutNotThrough", label: "Not through" },
] as const;

type StateKey = (typeof STATES)[number]["key"];

const noop = () => undefined;

const handlers: TournamentHandlers = {
  levelRequestPending: false,
  registerTeamPending: false,
  leavePending: false,
  teamId: "",
  onTeamIdChange: noop,
  onTakeSeat: noop,
  onRegisterTeam: noop,
  onRequestLevel: noop,
  onLeave: noop,
  scorePending: false,
  addSetPending: false,
  completePending: false,
  onSave: noop,
  onAddSet: noop,
  onComplete: noop,
};

export default function GalleryTournament() {
  const [key, setKey] = useState<StateKey>("preDrawWithoutSeat");
  const [sheet, setSheet] = useState<TournamentSheet>(null);
  const [roundCount, setRoundCount] = useState<number | null>(null);
  const fixtures = useMemo<Record<StateKey, TournamentFixture>>(() => {
    const now = new Date();
    return {
      ...createTournamentFixtures(now),
      ...createKnockoutTournamentFixtures(now),
    };
  }, []);

  if (!__DEV__) {
    return <Redirect href="/" />;
  }

  const game = fixtures[key];

  return (
    <Screen>
      <Text size="h2" weight="semibold">
        Friendly tournament states
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {STATES.map((entry) => (
          <Button
            key={entry.key}
            label={entry.label}
            size="sm"
            variant={entry.key === key ? "default" : "outline"}
            selected={entry.key === key}
            onPress={() => {
              setKey(entry.key);
              setSheet(null);
            }}
          />
        ))}
      </View>
      <TournamentContent
        game={game}
        handlers={handlers}
        organizer={{
          card: {
            knockoutOnly: isKnockoutOnly(game.format, game.tournamentShape),
            undoPending: false,
            kickPending: false,
            onOpenMerge: () => setSheet("merge"),
            onOpenDraw: () => setSheet("draw"),
            onOpenRounds: () => setSheet("rounds"),
            onUndo: noop,
            onKickPlayer: noop,
            onKickWaitlist: noop,
          },
          onCancelMatch: (place) => setSheet({ walkover: place }),
        }}
      />
      <OrganizerSheets
        game={game}
        knockoutOnly={isKnockoutOnly(game.format, game.tournamentShape)}
        sheet={sheet}
        onClose={() => setSheet(null)}
        roundCount={roundCount}
        onRoundCountChange={setRoundCount}
        pending={{
          merge: false,
          draw: false,
          post: false,
          rounds: false,
          walkover: false,
        }}
        errors={{ merge: null, draw: null, rounds: null, walkover: null }}
        onMerge={noop}
        onDraw={noop}
        onPost={noop}
        onSaveRounds={noop}
        onWalkover={noop}
      />
      <TournamentBar
        game={game}
        inset={false}
        handlers={{
          joinPending: false,
          leaveWaitlistPending: false,
          onJoin: noop,
          onJoinWaitlist: noop,
          onLeaveWaitlist: noop,
        }}
      />
    </Screen>
  );
}
