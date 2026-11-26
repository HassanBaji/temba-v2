import {
  bibNames,
  type Bibs,
  type BoardPlayer,
} from "@repo/domain/football-board";
import {
  pickRoomCaptainNames,
  pickRoomPlayer,
  pickRoomPlayerName,
} from "@repo/domain/football-pick-room";
import type { Locale } from "@repo/i18n/locale";

import type { RouterOutputs } from "~/trpc/react";

export type OpenPickRoom = Exclude<
  RouterOutputs["games"]["footballPickRoom"],
  { status: "stopped" | "closed" }
>;

/**
 * The names a Pick room shows: each team by its bib, each Side captain, and
 * anyone by their id. Someone the board does not hold has an empty name.
 */
export function pickRoomNames(
  room: {
    bibs: Bibs;
    captains: {
      slot1: { userId: string } | null;
      slot2: { userId: string } | null;
    };
  },
  players: readonly BoardPlayer[],
  locale: Locale,
) {
  return {
    teams: bibNames(room.bibs, locale),
    captains: pickRoomCaptainNames(room.captains, players, locale),
    playerOf: (userId: string | undefined) => pickRoomPlayer(players, userId),
    nameOf: (userId: string | undefined) =>
      pickRoomPlayerName(players, userId, locale),
  };
}

export type PickRoomNames = ReturnType<typeof pickRoomNames>;
