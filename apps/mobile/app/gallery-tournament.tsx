import {
  createKnockoutTournamentFixtures,
  createTournamentFixtures,
  type TournamentFixture,
} from "@repo/domain/tournament-details-fixtures";
import { Redirect } from "expo-router";
import { useMemo, useState } from "react";
import { View } from "react-native";

import { Button } from "../src/primitives/button";
import { Screen } from "../src/primitives/screen";
import { Text } from "../src/primitives/text";
import { TournamentBar } from "../src/tournament/tournament-bar";
import {
  TournamentContent,
  type TournamentHandlers,
} from "../src/tournament/tournament-content";

const STATES = [
  { key: "preDrawWithoutSeat", label: "Before the draw" },
  { key: "preDrawSeatedHalfOpen", label: "Half team" },
  { key: "organizerDraftedDraw", label: "Drafted" },
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
            onPress={() => setKey(entry.key)}
          />
        ))}
      </View>
      <TournamentContent game={game} handlers={handlers} />
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
