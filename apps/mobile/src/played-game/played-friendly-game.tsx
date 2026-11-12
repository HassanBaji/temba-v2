import { organizerCanAddPlayer } from "@repo/domain/add-player-by-phone";
import { friendlyGameFooterActions } from "@repo/domain/friendly-game-actions";
import {
  seatedPlayerCanRename,
  type FriendlyGameDetails,
  type FriendlyGameDetailsMatch,
} from "@repo/domain/friendly-game-details";
import { occupiedFriendlyPositions } from "@repo/domain/game-invite-open-graph";
import {
  padelViewerSide,
  playedPadelModel,
  type PlayedRow,
} from "@repo/domain/played-game";
import { useRouter, type Href } from "expo-router";
import { useMemo, useState } from "react";

import { gameTitle } from "../game-details/details-model";
import type { useOrganizerActions } from "../game-details/use-organizer-actions";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { MarksSection } from "../marks/marks-section";
import { MvpRow } from "../marks/mvp-row";
import { useGameMarks } from "../marks/use-game-marks";
import { GameAlbumSections } from "../game-album/game-album-sections";
import { useGameAlbum } from "../game-album/use-game-album";
import { PlayedGameView } from "./played-game-view";
import { PlayedMenuSheet, type PlayedMenuItem } from "./played-menu-sheet";
import { PlayedPadelBoard } from "./played-padel-board";
import { PlayedPlayerSheet } from "./played-player-sheet";

type Organizer = ReturnType<typeof useOrganizerActions>;

export function sharePath(gameId: string) {
  return `/games/${gameId}/share` as Href;
}

/** A padel Friendly game once its Match is final. */
export function PlayedFriendlyGame({
  gameId,
  game,
  match,
  refreshing,
  onRefresh,
  organizer,
  onOpenPlayer,
  onRenameUnclaimed,
  openAddPhotos = false,
}: {
  gameId: string;
  game: FriendlyGameDetails;
  match: FriendlyGameDetailsMatch;
  refreshing: boolean;
  onRefresh: () => void;
  organizer: Organizer;
  onOpenPlayer?: (userId: string) => void;
  onRenameUnclaimed?: (player: { userId: string; name: string }) => void;
  /** Opened from the Played list's Add photos. */
  openAddPhotos?: boolean;
}) {
  const router = useRouter();
  const locale = useLocale();
  const m = useMessages();
  const [menuOpen, setMenuOpen] = useState(false);
  const [selected, setSelected] = useState<PlayedRow | null>(null);
  const marks = useGameMarks(gameId);
  const album = useGameAlbum(gameId);

  const model = useMemo(
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

  const menuItems: PlayedMenuItem[] = game.isOrganizer
    ? [
        ...(organizerCanAddPlayer(game)
          ? [
              {
                key: "add_player",
                label: m.group.addPlayer.action,
                hint: m.group.addPlayer.menuHint,
                onPress: organizer.handlers.onAddPlayer,
              },
            ]
          : []),
        ...friendlyGameFooterActions({
          phase: "final",
          isOrganizer: true,
          canLeaveGame: false,
          canReportWrongScore: game.canReportWrongScore,
          playerCount: occupiedFriendlyPositions(game.sides),
          locale,
        }).map((action) => ({
          key: action.kind,
          label: action.label,
          hint: action.consequence,
          disabled: !action.enabled,
          onPress: () => organizer.onFooterAction(action.kind),
        })),
      ]
    : [];

  const kickable = organizer.plan?.kickableUserIds ?? [];
  const canTapPlayers = Boolean(onOpenPlayer) || organizer.plan != null;

  return (
    <>
      <PlayedGameView
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
        board={
          <PlayedPadelBoard setLabels={model.setLabels} rows={model.board} />
        }
        heroFooter={<MvpRow marks={marks} onOpenPlayer={onOpenPlayer} />}
        marks={<MarksSection marks={marks} />}
        album={
          <GameAlbumSections
            album={album}
            place={model.venueLine ?? ""}
            context={model.dateLine}
            openAdd={openAddPhotos}
          />
        }
        columns={model.columns}
        facts={model.facts}
        refreshing={refreshing}
        onRefresh={() => {
          onRefresh();
          void marks.refetch();
          void album.refetch();
        }}
        onShare={() => router.push(sharePath(gameId))}
        onMore={menuItems.length > 0 ? () => setMenuOpen(true) : undefined}
        onPressPlayer={canTapPlayers ? setSelected : undefined}
      />
      <PlayedMenuSheet
        visible={menuOpen}
        title={gameTitle(game, locale)}
        items={menuItems}
        onClose={() => setMenuOpen(false)}
      />
      <PlayedPlayerSheet
        player={selected}
        canOpenProfile={Boolean(onOpenPlayer)}
        canKick={selected != null && kickable.includes(selected.userId)}
        canRename={
          selected != null &&
          Boolean(onRenameUnclaimed) &&
          seatedPlayerCanRename(game.sides, selected.userId)
        }
        onClose={() => setSelected(null)}
        onOpenProfile={(userId) => {
          setSelected(null);
          onOpenPlayer?.(userId);
        }}
        onKick={(userId) => {
          setSelected(null);
          organizer.handlers.onKickPlayer(userId);
        }}
        onRename={(player) => {
          setSelected(null);
          onRenameUnclaimed?.(player);
        }}
      />
    </>
  );
}
