import {
  bibNames,
  lineupPlayerName,
  type Bibs,
  type BoardPlayer,
  type Side,
} from "@repo/domain/football-board";
import {
  captainPickCountLines,
  captainPickPoolOrder,
  pickRoomUserIds,
} from "@repo/domain/football-captain-pick";
import type { FootballBalanceOn } from "@repo/domain/football-lineup";
import type { Locale } from "@repo/i18n/locale";

import type { RouterOutputs } from "~/trpc/react";

export type OpenPickRoom = Exclude<
  RouterOutputs["games"]["footballPickRoom"],
  { status: "stopped" | "closed" }
>;

const CLOSED_READ = { status: "closed" } as const;

/**
 * What this visit read of the room, or nothing yet. A read kept from an
 * earlier visit does not count: the pick may have ended or a new room
 * opened since, so the view starts from this visit's. A room the viewer is
 * refused reads closed.
 */
export function pickRoomRead<Read>(
  query: { isFetchedAfterMount: boolean } & (
    | { isSuccess: true; data: Read }
    | { isSuccess: false }
  ),
  refused: boolean,
) {
  if (!query.isFetchedAfterMount) {
    return null;
  }
  if (query.isSuccess) {
    return query.data;
  }
  return refused ? CLOSED_READ : null;
}

/**
 * The players the room names that the board has not read, as one key: empty
 * while the board holds them all.
 */
export function pickRoomUnknownIds(
  room: Pick<OpenPickRoom, "pool" | "sides">,
  players: readonly Pick<BoardPlayer, "userId">[],
) {
  return pickRoomUserIds(room)
    .filter((userId) => !players.some((player) => player.userId === userId))
    .join(",");
}

/** The pool as the viewer is shown it: the players the board holds, best first. */
export function pickRoomPool(
  room: { pool: readonly string[]; viewer: { isOrganizer: boolean } },
  players: readonly BoardPlayer[],
  balanceOn: FootballBalanceOn,
) {
  const byId = new Map(players.map((player) => [player.userId, player]));
  return captainPickPoolOrder(
    room.pool.flatMap((userId) => {
      const player = byId.get(userId);
      return player ? [player] : [];
    }),
    { organizer: room.viewer.isOrganizer, balanceOn },
  );
}

/**
 * Who may pick now: the Side captain on turn, and an Organizer for a side
 * on turn that is not their own. Nobody once the pick is done.
 */
export function pickRoomViewerTurn(room: {
  status: OpenPickRoom["status"];
  turn: Side | null;
  viewer: { side: Side | null; isOrganizer: boolean };
}) {
  const open = room.status !== "done" && room.turn != null;
  const onTurn = open && room.viewer.side === room.turn;
  return { onTurn, mayPickFor: open && room.viewer.isOrganizer && !onTurn };
}

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
  const playerOf = (userId: string | undefined) =>
    players.find((player) => player.userId === userId);
  const nameOf = (userId: string | undefined) =>
    lineupPlayerName(playerOf(userId), locale) ?? "";
  return {
    teams: bibNames(room.bibs, locale),
    captains: {
      slot1: nameOf(room.captains.slot1?.userId),
      slot2: nameOf(room.captains.slot2?.userId),
    },
    playerOf,
    nameOf,
  };
}

export type PickRoomNames = ReturnType<typeof pickRoomNames>;

/** `captainPickCountLines` of a room; before the toss side 1 counts as first. */
export function pickRoomCounts(
  room: Pick<OpenPickRoom, "sides" | "pool" | "firstPickSide">,
  locale: Locale,
) {
  return captainPickCountLines(
    {
      slot1: room.sides.slot1.length,
      slot2: room.sides.slot2.length,
      pool: room.pool.length,
      firstPickSide: room.firstPickSide ?? 1,
    },
    locale,
  );
}
