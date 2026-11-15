import {
  tournamentHomeView,
  tournamentStandingsView,
  type TournamentDetails,
} from "@repo/domain/tournament-details";
import { tournamentOrganizerView } from "@repo/domain/tournament-organizer";
import type { KnockoutMatchPlace } from "@repo/domain/tournament-knockout-view";
import type { ReactNode } from "react";
import { View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { KingView } from "./king-view";
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
  album,
}: {
  game: TournamentDetails;
  handlers: TournamentHandlers;
  organizer?: TournamentOrganizerHandlers;
  /** Album and Notes, under the scores and above the details. */
  album?: ReactNode;
}) {
  const locale = useLocale();
  const m = useMessages().mobileTournament.content;
  const view = tournamentHomeView(game, locale);
  const matches = scorableMatches(game, locale);
  const organizerView = organizer ? tournamentOrganizerView(game, view) : null;

  return (
    <View style={{ gap: SECTION_GAP }}>
      {game.cancelledAt ? (
        <Surface accessibilityRole="alert">
          <Text size="title" weight="semibold">
            {m.gameCancelled}
          </Text>
        </Surface>
      ) : null}
      {view.drawn && view.kingOfTheCourt ? (
        <KingView game={game} />
      ) : view.drawn ? (
        <StandingsView
          game={game}
          standings={tournamentStandingsView(game, locale)}
          onCancelMatch={
            organizerView?.active ? organizer?.onCancelMatch : undefined
          }
          onOpenPlayer={handlers.onOpenPlayer}
          playerOpensActions={handlers.playerOpensActions}
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
      {album}
      <TournamentTail
        view={view}
        leavePending={handlers.leavePending}
        onLeave={handlers.onLeave}
      />
    </View>
  );
}
