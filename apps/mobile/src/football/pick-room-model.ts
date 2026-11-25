import {
  lineupPlayerName,
  type BoardPlayer,
  type Side,
} from "@repo/domain/football-board";
import {
  captainPickCountLines,
  pickRoomUserIds,
  type OpenPickRoom,
} from "@repo/domain/football-captain-pick";
import type { Locale } from "@repo/i18n/locale";

const CLOSED_READ = { status: "closed" } as const;

/**
 * What this visit has read of the room. A read kept from an earlier visit
 * does not count: the pick may have ended or a new room opened since, so
 * the view starts from this visit's. A refused read is a closed room, and
 * any other failed read is no read.
 */
export function pickRoomRead<Read>(query: {
  fetchedAfterMount: boolean;
  read: Read | undefined;
  refused: boolean;
}): Read | typeof CLOSED_READ | null {
  if (!query.fetchedAfterMount) {
    return null;
  }
  if (query.read !== undefined) {
    return query.read;
  }
  return query.refused ? CLOSED_READ : null;
}

/** Everyone the room names whom the board does not hold, as a player added since it was read. */
export function pickRoomUnknownUserIds(
  room: Pick<OpenPickRoom, "pool" | "sides">,
  players: readonly Pick<BoardPlayer, "userId">[],
) {
  return pickRoomUserIds(room).filter(
    (userId) => !players.some((player) => player.userId === userId),
  );
}

/** The pool's players in the room's order, without one the board does not hold. */
export function pickRoomPoolPlayers<Player extends Pick<BoardPlayer, "userId">>(
  pool: readonly string[],
  players: readonly Player[],
): Player[] {
  const byId = new Map(players.map((player) => [player.userId, player]));
  return pool.flatMap((userId) => {
    const player = byId.get(userId);
    return player ? [player] : [];
  });
}

type NamedPlayer = Pick<
  BoardPlayer,
  "userId" | "name" | "nickname" | "isViewer"
>;

export function pickRoomPlayer<Player extends Pick<BoardPlayer, "userId">>(
  players: readonly Player[],
  userId: string | undefined,
) {
  return players.find((player) => player.userId === userId);
}

/** A player's line-up name, empty for one the board does not hold. */
export function pickRoomPlayerName(
  players: readonly NamedPlayer[],
  userId: string | undefined,
  locale: Locale,
) {
  return lineupPlayerName(pickRoomPlayer(players, userId), locale) ?? "";
}

export function pickRoomCaptainNames(
  captains: {
    slot1: { userId: string } | null;
    slot2: { userId: string } | null;
  },
  players: readonly NamedPlayer[],
  locale: Locale,
) {
  return {
    slot1: pickRoomPlayerName(players, captains.slot1?.userId, locale),
    slot2: pickRoomPlayerName(players, captains.slot2?.userId, locale),
  };
}

/** The other Side captain's side; null for an Organizer who is not a captain. */
export function otherCaptainSide(viewerSide: Side | null): Side | null {
  return viewerSide === 1 ? 2 : viewerSide === 2 ? 1 : null;
}

export function pickRoomCountLines(
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

export type LivePickSeat = {
  /** The viewer is the Side captain on turn. */
  viewerOnTurn: boolean;
  /** The viewer is an Organizer who may pick for the captain on turn. */
  mayPickFor: boolean;
  /** The viewer chooses from the pool now: on turn, or picking for the captain. */
  selectable: boolean;
  /** The viewer is a Side captain waiting for the other's pick. */
  waiting: boolean;
};

/**
 * What the viewer of a started pick may do. `pickingFor` is an Organizer
 * having said they pick for the captain on turn.
 */
export function livePickSeat(
  room: Pick<OpenPickRoom, "status" | "turn"> & {
    viewer: { side: Side | null; isOrganizer: boolean };
  },
  pickingFor: boolean,
): LivePickSeat {
  const turn = room.status === "live" ? room.turn : null;
  const viewerOnTurn = turn != null && room.viewer.side === turn;
  const mayPickFor = turn != null && room.viewer.isOrganizer && !viewerOnTurn;
  const selectable = viewerOnTurn || (mayPickFor && pickingFor);
  return {
    viewerOnTurn,
    mayPickFor,
    selectable,
    waiting: !selectable && turn != null && room.viewer.side != null,
  };
}
