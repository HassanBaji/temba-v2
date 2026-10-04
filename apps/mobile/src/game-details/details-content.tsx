import {
  friendlyGameDetailsPlan,
  type FriendlyGameDetails,
} from "@repo/domain/friendly-game-details";
import {
  friendlyGameFooterActions,
  type FriendlyGameFooterAction,
} from "@repo/domain/friendly-game-actions";
import type { FriendlyGameOrganizerPlan } from "@repo/domain/friendly-game-organizer";
import { friendlyGameHeroInput } from "@repo/domain/friendly-game-hero";
import { occupiedFriendlyPositions } from "@repo/domain/game-invite-open-graph";
import { levelRangeRequestCard } from "@repo/domain/level-range-request";
import { View } from "react-native";

import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useNow } from "../games/use-now";
import { ActionsFooter } from "./actions-footer";
import { BottomBar, type BottomBarHandlers } from "./bottom-bar";
import type { setsToSave } from "./details-model";
import { HeroCard } from "./hero-card";
import { LevelRequestCard } from "./level-request-card";
import { LineupCard } from "./lineup-card";
import { OrganizerCard, type OrganizerHandlers } from "./organizer-card";
import { RatingImpactCard } from "./rating-impact-card";
import { ScoreCard } from "./score-card";

const SECTION_GAP = 16;

export type DetailsHandlers = {
  movePending: boolean;
  scorePending: boolean;
  confirmPending: boolean;
  levelRequestPending: boolean;
  footerPendingKind: FriendlyGameFooterAction["kind"] | null;
  onMove: (sideIndex: number, position: "left" | "right") => void;
  onSaveSets: (payloads: ReturnType<typeof setsToSave>) => void;
  onConfirm: () => void;
  onRequestLevel: () => void;
  onFooterAction: (kind: FriendlyGameFooterAction["kind"]) => void;
};

export type DetailsOrganizer = {
  plan: FriendlyGameOrganizerPlan;
  handlers: OrganizerHandlers;
};

export function GameDetailsContent({
  game,
  handlers,
  organizer = null,
}: {
  game: FriendlyGameDetails;
  handlers: DetailsHandlers;
  organizer?: DetailsOrganizer | null;
}) {
  const now = useNow();
  const plan = friendlyGameDetailsPlan(game);
  const heroInput = friendlyGameHeroInput(game);
  const levelCard = levelRangeRequestCard(game);
  const { phase } = game;
  const { firstMatch } = plan;
  const live = phase && phase !== "cancelled" ? phase : null;

  return (
    <View style={{ gap: SECTION_GAP }}>
      {game.cancelledAt ? (
        <Surface accessibilityRole="alert">
          <Text size="title" weight="semibold">
            This Game is cancelled
          </Text>
        </Surface>
      ) : null}
      {heroInput ? <HeroCard input={heroInput} now={now} /> : null}
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
      {levelCard ? (
        <LevelRequestCard
          card={levelCard}
          pending={handlers.levelRequestPending}
          onRequest={handlers.onRequestLevel}
        />
      ) : null}
      <LineupCard
        sides={game.sides}
        viewerUserId={game.viewerUserId}
        isFinal={phase === "final"}
        winningGameTeamId={plan.winningGameTeamId}
        canMove={game.canMove}
        moving={handlers.movePending}
        onMove={handlers.onMove}
        kickableUserIds={organizer?.plan.kickableUserIds}
        onKick={organizer?.handlers.onKickPlayer}
      />
      {live && firstMatch ? (
        <ScoreCard
          phase={live}
          match={firstMatch}
          sides={game.sides}
          viewerUserId={game.viewerUserId}
          winningGameTeamId={plan.winningGameTeamId}
          confirmation={game.matchResultConfirmation}
          scorePending={handlers.scorePending}
          confirmPending={handlers.confirmPending}
          onSaveSets={handlers.onSaveSets}
          onConfirm={handlers.onConfirm}
        />
      ) : null}
      {phase === "final" && game.ratingImpact ? (
        <RatingImpactCard ratingImpact={game.ratingImpact} />
      ) : null}
      {organizer ? (
        <OrganizerCard plan={organizer.plan} handlers={organizer.handlers} />
      ) : null}
      {live && firstMatch ? (
        <ActionsFooter
          actions={friendlyGameFooterActions({
            phase: live,
            isOrganizer: game.isOrganizer,
            canLeaveGame: plan.canLeaveGame,
            canReportWrongScore: game.canReportWrongScore,
            playerCount: occupiedFriendlyPositions(game.sides),
          })}
          pendingKind={handlers.footerPendingKind}
          onAction={handlers.onFooterAction}
        />
      ) : null}
    </View>
  );
}

export function GameDetailsBar({
  game,
  handlers,
  inset = true,
}: {
  game: FriendlyGameDetails;
  handlers: BottomBarHandlers;
  inset?: boolean;
}) {
  const plan = friendlyGameDetailsPlan(game);
  return (
    <BottomBar family={plan.ctaFamily} handlers={handlers} inset={inset} />
  );
}
