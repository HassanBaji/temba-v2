import {
  friendlyGameDetailsPlan,
  type FriendlyGameDetails,
} from "@repo/domain/friendly-game-details";
import { friendlyGameCtaCopy } from "@repo/domain/friendly-game-actions";
import {
  courtPositionLabel,
  courtSpotsLabel,
  scoreLeadLine,
} from "@repo/domain/friendly-game-court";
import {
  vacantJoinSeats,
  type FriendlyGameJoinSeat,
} from "@repo/domain/friendly-game-cta";
import type { FriendlyGameOrganizerPlan } from "@repo/domain/friendly-game-organizer";
import {
  friendlyGameVacantSeatAction,
  friendlyGameVacantSeatLabel,
} from "@repo/domain/friendly-game-players";
import {
  friendlyGameHeroInput,
  friendlyGameHeroModel,
} from "@repo/domain/friendly-game-hero";
import { ratingScopeOf } from "@repo/domain/game-rating-impact";
import { formatGameSideLabel } from "@repo/domain/game-side-label";
import { levelRangeRequestCard } from "@repo/domain/level-range-request";
import type { PlayedRow } from "@repo/domain/played-game";
import type { Locale } from "@repo/i18n/locale";
import type { Messages } from "@repo/i18n/messages";
import { View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { BookedCard } from "./booked-card";
import {
  BottomBar,
  type BottomBarHandlers,
  type BottomBarLines,
} from "./bottom-bar";
import type { setsToSave } from "./details-model";
import { LevelRequestCard } from "./level-request-card";
import { LineupCard, type OpenSeatAction } from "./lineup-card";
import {
  OrganizerCard,
  RequestsSection,
  type OrganizerHandlers,
} from "./organizer-card";
import { RatingImpactCard, RatingScopeCard } from "./rating-impact-card";
import { ScoreCard } from "./score-card";

const SECTION_GAP = 16;

export type DetailsHandlers = {
  movePending: boolean;
  scorePending: boolean;
  confirmPending: boolean;
  levelRequestPending: boolean;
  onMove: (sideIndex: number, position: "left" | "right") => void;
  onJoinSeat: (seat: FriendlyGameJoinSeat) => void;
  onAddPlayerAt?: (seat: FriendlyGameJoinSeat) => void;
  onInvite?: () => void;
  onPressPlayer?: (row: PlayedRow) => void;
  onSaveSets: (payloads: ReturnType<typeof setsToSave>) => void;
  onConfirm: () => void;
  onRequestLevel: () => void;
};

export type DetailsOrganizer = {
  plan: FriendlyGameOrganizerPlan;
  handlers: OrganizerHandlers;
};

function openSeatActionFor(
  game: FriendlyGameDetails,
  handlers: DetailsHandlers,
  messages: Messages,
  locale: Locale,
) {
  const action = friendlyGameVacantSeatAction({
    cancelled: game.cancelledAt != null,
    canMove: game.canMove,
    canRegister: game.canRegister,
    canPickSeat: false,
    canWaitlist: false,
  });
  return (
    sideIndex: number,
    position: "left" | "right",
  ): OpenSeatAction | null => {
    const sideLabel = formatGameSideLabel("friendly_game", sideIndex, locale);
    const positionLabel = courtPositionLabel(position, locale);
    const seat = { sideIndex, position };
    if (action === "move" || action === "join") {
      return {
        accessibilityLabel:
          friendlyGameVacantSeatLabel(
            action,
            sideLabel,
            positionLabel,
            locale,
          ) ?? positionLabel,
        onPress: () =>
          action === "move"
            ? handlers.onMove(sideIndex, position)
            : handlers.onJoinSeat(seat),
      };
    }
    const addPlayerAt = handlers.onAddPlayerAt;
    return addPlayerAt
      ? {
          accessibilityLabel: messages.mobileGameDetails.lineup.addPlayerTo(
            sideLabel,
            positionLabel,
          ),
          onPress: () => addPlayerAt(seat),
        }
      : null;
  };
}

export function GameDetailsContent({
  game,
  handlers,
  organizer = null,
}: {
  game: FriendlyGameDetails;
  handlers: DetailsHandlers;
  organizer?: DetailsOrganizer | null;
}) {
  const m = useMessages();
  const locale = useLocale();
  const plan = friendlyGameDetailsPlan(game);
  const levelCard = levelRangeRequestCard(game, locale);
  const { phase } = game;
  const { firstMatch } = plan;
  const live = phase && phase !== "cancelled" ? phase : null;
  const vacantSeatCount = vacantJoinSeats(game.sides).length;
  const canInvite = handlers.onInvite != null && vacantSeatCount > 0;
  const addsPlayers = handlers.onAddPlayerAt != null && vacantSeatCount > 0;

  return (
    <View style={{ gap: SECTION_GAP }}>
      {game.cancelledAt ? (
        <Surface accessibilityRole="alert">
          <Text size="title" weight="semibold">
            {m.mobileGameDetails.cancelledTitle}
          </Text>
        </Surface>
      ) : null}
      {organizer?.plan.showRequests ? (
        <RequestsSection
          requests={organizer.plan.requests}
          decisions={organizer.handlers}
        />
      ) : null}
      {game.booking ? (
        <BookedCard booking={game.booking} ratingScope={ratingScopeOf(game)} />
      ) : (
        <RatingScopeCard scope={ratingScopeOf(game)} />
      )}
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
        vacantSeatCount={vacantSeatCount}
        hint={addsPlayers ? m.game.court.addPlayerHint : null}
        busy={handlers.movePending}
        openSeatAction={openSeatActionFor(game, handlers, m, locale)}
        onInvite={canInvite ? handlers.onInvite : undefined}
        onPressPlayer={handlers.onPressPlayer}
      />
      {live && firstMatch ? (
        <ScoreCard
          phase={live}
          match={firstMatch}
          sides={game.sides}
          viewerUserId={game.viewerUserId}
          winningGameTeamId={plan.winningGameTeamId}
          confirmation={game.matchResultConfirmation}
          isOrganizer={
            game.matchResultConfirmation?.viewerConfirmsAsOrganizer ?? false
          }
          courtFull={vacantSeatCount === 0}
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
    </View>
  );
}

export function gameHeroModel(
  game: FriendlyGameDetails,
  now: Date,
  locale: Locale,
) {
  const input = friendlyGameHeroInput(game);
  return input ? friendlyGameHeroModel(input, now, locale) : null;
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
  const m = useMessages();
  const locale = useLocale();
  const plan = friendlyGameDetailsPlan(game);
  return (
    <BottomBar
      family={plan.ctaFamily}
      lines={bottomBarLines(game, m, locale)}
      handlers={handlers}
      inset={inset}
    />
  );
}

function bottomBarLines(
  game: FriendlyGameDetails,
  messages: Messages,
  locale: Locale,
): BottomBarLines | null {
  const plan = friendlyGameDetailsPlan(game);
  const family = plan.ctaFamily;
  if (family.kind === "join") {
    return {
      title: courtSpotsLabel(vacantJoinSeats(game.sides).length, locale),
      subline: messages.game.court.joinSubline,
    };
  }
  if (family.kind === "needs_score" && plan.firstMatch) {
    const lead = scoreLeadLine(plan.firstMatch, plan.viewerGameTeamId, locale);
    return lead
      ? {
          title: lead,
          subline: friendlyGameCtaCopy(family, locale)?.subline ?? null,
        }
      : null;
  }
  return null;
}
