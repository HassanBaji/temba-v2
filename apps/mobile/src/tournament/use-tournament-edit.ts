import {
  gameEditSectionsFor,
  type GameEditSource,
} from "@repo/domain/game-edit-form";
import { isKingOfTheCourt } from "@repo/domain/tournament-king";
import { isPartnerRequiredGame } from "@repo/domain/tournament-rounds";
import { useState } from "react";

import type { GameEditContext } from "../game-details/game-edit-sheet";
import { useGameEdit } from "../game-details/use-game-edit";
import type { RouterOutputs } from "../trpc/react";

type TournamentGame = RouterOutputs["games"]["byId"];

const EMPTY_EDIT_SOURCE: GameEditSource = {
  name: null,
  hasCustomName: false,
  windowStart: null,
  windowEnd: null,
  pricePerPlayerFils: null,
  playersAllowed: null,
  sideSize: null,
  levelMinTenths: null,
  levelMaxTenths: null,
  roundCount: null,
  seasonId: null,
};

/**
 * The Edit game sheet on a Friendly tournament. The Round count keeps its own
 * sheet on the organizer card, so the edit sheet leaves it out.
 */
export function useTournamentEdit({
  gameId,
  game,
  refresh,
}: {
  gameId: string;
  game: TournamentGame | null;
  refresh: () => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const sections = {
    ...gameEditSectionsFor({
      format: "friendly_tournament",
      sport: game?.sport,
      groupId: game?.groupId ?? null,
      tournamentRounds: false,
      drawPosted: game?.drawPostedAt != null,
    }),
    rounds: false,
  };
  const edit = useGameEdit({
    gameId,
    game: game ?? EMPTY_EDIT_SOURCE,
    sections,
    seasons: game?.groupSeasons ?? [],
    open,
    mvpEnabled: false,
    onSaved: refresh,
    onClose: () => setOpen(false),
  });
  const context: GameEditContext | null = game
    ? {
        venueName: game.venue?.name ?? null,
        courtName: null,
        groupName: game.groupName,
        joined: game.registeredUserCount,
        teams: {
          joined: game.registeredTeamCount,
          shape: game,
          king: isKingOfTheCourt(game.format, game.tournamentShape),
          partnerOnly: isPartnerRequiredGame(game),
        },
        seasons: game.groupSeasons,
        canChangeSeason: game.canChangeSeason,
      }
    : null;
  return {
    open,
    onOpen: () => setOpen(true),
    onClose: () => setOpen(false),
    edit,
    sections,
    context,
  };
}
