import {
  tournamentHomeView,
  tournamentStandingsView,
  type TournamentDetails,
} from "@repo/domain/tournament-details";
import { tournamentOrganizerView } from "@repo/domain/tournament-organizer";
import type { KnockoutMatchPlace } from "@repo/domain/tournament-knockout-view";
import { View } from "react-native";

import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { OrganizerCard, type OrganizerCardHandlers } from "./organizer-card";
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

export type TournamentOrganizerHandlers = {
  card: OrganizerCardHandlers;
  onCancelMatch: (place: KnockoutMatchPlace) => void;
};

export function TournamentContent({
  game,
  handlers,
  organizer,
}: {
  game: TournamentDetails;
  handlers: TournamentHandlers;
  organizer?: TournamentOrganizerHandlers;
}) {
  const view = tournamentHomeView(game);
  const matches = scorableMatches(game);
  const organizerView = organizer ? tournamentOrganizerView(game, view) : null;

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
        <StandingsView
          game={game}
          standings={tournamentStandingsView(game)}
          onCancelMatch={
            organizerView?.active ? organizer?.onCancelMatch : undefined
          }
          onOpenPlayer={handlers.onOpenPlayer}
        />
      ) : (
        <PreDrawView game={game} view={view} handlers={handlers} />
      )}
      {organizer && organizerView ? (
        <OrganizerCard
          game={game}
          home={view}
          organizer={organizerView}
          handlers={organizer.card}
        />
      ) : null}
      <ScoreMatchesCard matches={matches} handlers={handlers} />
      <TournamentTail
        view={view}
        leavePending={handlers.leavePending}
        onLeave={handlers.onLeave}
      />
    </View>
  );
}
