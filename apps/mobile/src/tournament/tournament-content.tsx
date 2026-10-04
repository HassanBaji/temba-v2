import {
  tournamentHomeView,
  tournamentStandingsView,
  type TournamentDetails,
} from "@repo/domain/tournament-details";
import { View } from "react-native";

import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import {
  PreDrawView,
  TournamentTail,
  type PreDrawHandlers,
} from "./predraw-view";
import { ScoreMatchesCard, type ScoreHandlers } from "./score-matches-card";
import { StandingsView } from "./standings-view";
import { scorableMatches } from "./tournament-model";

const SECTION_GAP = 16;

export type TournamentHandlers = PreDrawHandlers &
  ScoreHandlers & {
    leavePending: boolean;
    onLeave: () => void;
  };

export function TournamentContent({
  game,
  handlers,
}: {
  game: TournamentDetails;
  handlers: TournamentHandlers;
}) {
  const view = tournamentHomeView(game);
  const matches = scorableMatches(game);

  return (
    <View style={{ gap: SECTION_GAP }}>
      {game.cancelledAt ? (
        <Surface accessibilityRole="alert">
          <Text size="title" weight="semibold">
            This Game is cancelled
          </Text>
        </Surface>
      ) : null}
      {game.joinFrozen && !game.cancelledAt ? (
        <Surface style={{ gap: 4 }}>
          <Text size="lead" weight="semibold" accessibilityRole="header">
            This Club Group&apos;s Community is Soft-archived
          </Text>
          <Text size="meta" tone="muted">
            Registration, the waitlist, and invites stay closed.
          </Text>
        </Surface>
      ) : null}
      {view.drawn ? (
        <StandingsView game={game} standings={tournamentStandingsView(game)} />
      ) : (
        <PreDrawView game={game} view={view} handlers={handlers} />
      )}
      <ScoreMatchesCard matches={matches} handlers={handlers} />
      <TournamentTail
        view={view}
        leavePending={handlers.leavePending}
        onLeave={handlers.onLeave}
      />
    </View>
  );
}
