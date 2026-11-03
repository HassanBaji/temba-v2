"use client";

import {
  ADD_PLAYER_ACTION,
  organizerCanAddPlayer,
} from "@repo/domain/add-player-by-phone";
import { friendlyGameFooterActions } from "@repo/domain/friendly-game-actions";
import type {
  FriendlyGameDetails,
  FriendlyGameDetailsMatch,
} from "@repo/domain/friendly-game-details";
import { friendlyGameCanKickPlayer } from "@repo/domain/friendly-game-players";
import { occupiedFriendlyPositions } from "@repo/domain/game-invite-open-graph";
import {
  padelViewerSide,
  playedPadelModel,
  type PlayedRow,
} from "@repo/domain/played-game";
import * as React from "react";

import {
  ACTION_MENU_INK_BOXED_TRIGGER,
  ActionMenu,
  ActionMenuItem,
} from "~/components/common/action-menu";

import { PlayedGameView } from "./played-game-view";
import { PlayedPadelBoard } from "./played-padel-board";
import { PlayedPlayerDialog } from "./played-player-dialog";

/** A padel Friendly game once its Match is final. */
export function PlayedFriendlyGame({
  gameId,
  game,
  match,
  linkToPlayers,
  onKick,
  onRename,
  onAddPlayer,
  onReportWrongScore,
}: {
  gameId: string;
  game: FriendlyGameDetails;
  match: FriendlyGameDetailsMatch;
  linkToPlayers: boolean;
  onKick: (userId: string) => void;
  onRename?: (player: { userId: string; name: string }) => void;
  onAddPlayer?: () => void;
  onReportWrongScore: () => void;
}) {
  const [selected, setSelected] = React.useState<PlayedRow | null>(null);
  const model = React.useMemo(
    () =>
      playedPadelModel({
        sides: game.sides,
        viewerUserId: game.viewerUserId,
        match,
        windowStart: game.windowStart,
        windowEnd: game.windowEnd,
        venue: game.venue,
        courtName: match.courtName,
        groupName: game.groupName,
        rated: game.rated,
        ratingImpact: game.ratingImpact,
        confirmation: game.matchResultConfirmation,
      }),
    [game, match],
  );
  const viewerSide = padelViewerSide(game.sides, game.viewerUserId);
  const viewerSeat =
    viewerSide?.left?.userId === game.viewerUserId
      ? viewerSide.left
      : (viewerSide?.right ?? null);
  const canKick = (userId: string) =>
    friendlyGameCanKickPlayer({
      isOrganizer: game.isOrganizer,
      cancelled: Boolean(game.cancelledAt),
      isViewer: userId === game.viewerUserId,
    });
  const organizerActions = game.isOrganizer
    ? friendlyGameFooterActions({
        phase: "final",
        isOrganizer: true,
        canLeaveGame: false,
        canReportWrongScore: game.canReportWrongScore,
        playerCount: occupiedFriendlyPositions(game.sides),
      })
    : [];
  const showAdd =
    game.isOrganizer && onAddPlayer && organizerCanAddPlayer(game);
  const menu =
    showAdd || organizerActions.length > 0 ? (
      <ActionMenu
        label="Game actions"
        triggerClassName={ACTION_MENU_INK_BOXED_TRIGGER}
      >
        {showAdd ? (
          <ActionMenuItem onSelect={onAddPlayer}>
            {ADD_PLAYER_ACTION}
          </ActionMenuItem>
        ) : null}
        {organizerActions.map((action) => (
          <ActionMenuItem
            key={action.kind}
            disabled={!action.enabled}
            onSelect={action.enabled ? onReportWrongScore : undefined}
          >
            <span className="flex flex-col">
              <span>{action.label}</span>
              {action.consequence ? (
                <span className="text-muted-foreground text-meta">
                  {action.consequence}
                </span>
              ) : null}
            </span>
          </ActionMenuItem>
        ))}
      </ActionMenu>
    ) : undefined;

  return (
    <>
      <PlayedGameView
        gameId={gameId}
        hero={{
          dateLine: model.dateLine,
          tag: model.tag,
          result: model.result,
          venueLine: model.venueLine,
          whenLine: model.whenLine,
          you: model.you,
          avatar: viewerSeat
            ? { name: viewerSeat.name, image: viewerSeat.image }
            : null,
        }}
        menu={menu}
        board={
          <PlayedPadelBoard setLabels={model.setLabels} rows={model.board} />
        }
        columns={model.columns}
        facts={model.facts}
        onPressPlayer={
          linkToPlayers || game.isOrganizer ? setSelected : undefined
        }
      />
      <PlayedPlayerDialog
        player={selected}
        canOpenProfile={linkToPlayers}
        canKick={selected != null && canKick(selected.userId)}
        canRename={Boolean(onRename) && game.isOrganizer}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
          }
        }}
        onKick={(userId) => {
          setSelected(null);
          onKick(userId);
        }}
        onRename={(player) => {
          setSelected(null);
          onRename?.(player);
        }}
      />
    </>
  );
}
