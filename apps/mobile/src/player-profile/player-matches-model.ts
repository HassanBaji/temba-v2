import type { PlayerProfileFixture } from "@repo/domain/player-profile-fixtures";
import {
  filterLastTen,
  lastTenSummary,
  playerMatchRowView,
  playerMatchSheetView,
  type LastTenFilter,
  type LastTenFilterChip,
  type PlayerMatchRowView,
  type PlayerMatchSheetPlayer,
  type PlayerMatchSheetView,
} from "@repo/domain/player-profile-matches";

import { mediaUrl } from "../lib/media-url";
import type { RouterOutputs } from "../trpc/react";

type ApiPlayerProfile = RouterOutputs["users"]["playerProfile"];

export type PlayerMatchSheetPlayerModel = PlayerMatchSheetPlayer & {
  imageUri: string | null;
};

export type PlayerMatchSheetModel = Omit<PlayerMatchSheetView, "teams"> & {
  teams: {
    players: PlayerMatchSheetPlayerModel[];
    sets: PlayerMatchSheetView["teams"][number]["sets"];
  }[];
};

export type PlayerMatchesModel = {
  subtitle: string;
  chips: LastTenFilterChip[];
  rows: PlayerMatchRowView[];
  empty: string | null;
  sheet: PlayerMatchSheetModel | null;
};

function sheetModel(
  sheet: PlayerMatchSheetView,
  apiOrigin: string,
): PlayerMatchSheetModel {
  return {
    ...sheet,
    teams: sheet.teams.map((team) => ({
      sets: team.sets,
      players: team.players.map((player) => ({
        ...player,
        imageUri: mediaUrl(player.image, apiOrigin),
      })),
    })),
  };
}

/** 09c with the 09d sheet for `matchId`, filtered on the client (D13). */
export function playerMatchesModel(
  data: ApiPlayerProfile | PlayerProfileFixture,
  view: { filter: LastTenFilter; matchId: string | null },
  apiOrigin: string,
): PlayerMatchesModel {
  const filtered = filterLastTen(data.lastMatches, view.filter);
  const open = data.lastMatches.find((match) => match.matchId === view.matchId);

  return {
    subtitle: `${data.player.name}, ${lastTenSummary(data.lastMatches).record}`,
    chips: filtered.chips,
    rows: filtered.matches.map((match) =>
      playerMatchRowView(match, data.player.id),
    ),
    empty: filtered.empty,
    sheet: open
      ? sheetModel(playerMatchSheetView(open, data.player.name), apiOrigin)
      : null,
  };
}
