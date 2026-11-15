"use client";

import { gamePaymentsTracked } from "@repo/domain/game-payments";
import { GamePaymentsSection } from "~/components/game-payments/game-payments-section";
import { isPublicGame } from "@repo/domain/game-rating-scope";
import { organizerCanAddPlayer } from "@repo/domain/add-player-by-phone";
import { friendlyGameFooterActions } from "@repo/domain/friendly-game-actions";
import {
  seatedPlayerCanRename,
  type FriendlyGameDetails,
  type FriendlyGameDetailsMatch,
} from "@repo/domain/friendly-game-details";
import { friendlyGameCanKickPlayer } from "@repo/domain/friendly-game-players";
import { gameDisplayName } from "@repo/domain/game-custom-name";
import { occupiedFriendlyPositions } from "@repo/domain/game-invite-open-graph";
import {
  padelViewerSide,
  playedPadelModel,
  type PlayedRow,
} from "@repo/domain/played-game";
import { FlagIcon, UserPlusIcon } from "lucide-react";
import * as React from "react";

import { ACTION_MENU_INK_BOXED_TRIGGER } from "~/components/common/action-menu";
import { GameAlbumSections } from "~/components/game-album/game-album-sections";
import { GameActionsSheet } from "~/components/games/game-actions-sheet";
import { useLocale, useMessages } from "~/components/locale-provider";
import { MarksSection } from "~/components/marks/marks-section";
import { MvpRow } from "~/components/marks/mvp-row";
import { useGameMarks } from "~/components/marks/use-game-marks";

import { MatchDisputeRow } from "./match-dispute-row";
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
  const locale = useLocale();
  const m = useMessages();
  const [selected, setSelected] = React.useState<PlayedRow | null>(null);
  const marks = useGameMarks(gameId);
  const model = React.useMemo(
    () =>
      playedPadelModel(
        {
          sides: game.sides,
          viewerUserId: game.viewerUserId,
          match,
          windowStart: game.windowStart,
          windowEnd: game.windowEnd,
          venue: game.venue,
          courtName: match.courtName,
          groupName: game.groupName,
          rated: game.rated,
          ratingScope: game.ratingScope,
          publicGame: isPublicGame(game),
          ratingImpact: game.ratingImpact,
          confirmation: game.matchResultConfirmation,
        },
        locale,
      ),
    [game, match, locale],
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
        locale,
      })
    : [];
  const showAdd =
    game.isOrganizer && onAddPlayer && organizerCanAddPlayer(game);
  const menu =
    showAdd || organizerActions.length > 0 ? (
      <GameActionsSheet
        title={gameDisplayName(game, locale)}
        description={model.dateLine}
        triggerClassName={ACTION_MENU_INK_BOXED_TRIGGER}
        groups={[
          [
            ...(showAdd
              ? [
                  {
                    key: "add_player",
                    label: m.group.addPlayer.action,
                    icon: UserPlusIcon,
                    onSelect: onAddPlayer,
                  },
                ]
              : []),
            ...organizerActions.map((action) => ({
              key: action.kind,
              label: action.label,
              hint: action.consequence,
              icon: FlagIcon,
              disabled: !action.enabled,
              onSelect: onReportWrongScore,
            })),
          ],
        ]}
      />
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
        heroFooter={<MvpRow marks={marks} canOpenProfile={linkToPlayers} />}
        task={
          <GamePaymentsSection
            gameId={gameId}
            tracked={gamePaymentsTracked(game)}
          />
        }
        marks={<MarksSection marks={marks} />}
        album={
          <GameAlbumSections
            gameId={gameId}
            place={model.venueLine ?? ""}
            context={model.dateLine}
          />
        }
        columns={model.columns}
        facts={model.facts}
        dispute={<MatchDisputeRow match={match} />}
        onPressPlayer={
          linkToPlayers || game.isOrganizer ? setSelected : undefined
        }
      />
      <PlayedPlayerDialog
        player={selected}
        canOpenProfile={linkToPlayers}
        canKick={selected != null && canKick(selected.userId)}
        canRename={
          selected != null &&
          Boolean(onRename) &&
          seatedPlayerCanRename(game.sides, selected.userId)
        }
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
