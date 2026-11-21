import type { Side } from "@repo/domain/football-board";
import { captainPickDone, pickTurn } from "@repo/domain/football-captain-pick";

import type { RouterOutputs } from "~/trpc/react";

export type PickRoomRead = RouterOutputs["games"]["footballPickRoom"];

export type OpenPickRoom = Exclude<PickRoomRead, { status: "stopped" }>;

/**
 * The room with a pick placed on the side on turn, as the server places it:
 * the caller's own pick shows at once and the next read corrects it.
 */
export function withPick(
  current: PickRoomRead,
  pick: { userId: string; pickNumber: number },
): PickRoomRead {
  if (current.status !== "live" || current.turn == null) {
    return current;
  }
  const row = { userId: pick.userId, pickNumber: pick.pickNumber };
  const sides =
    current.turn === 1
      ? { ...current.sides, slot1: [...current.sides.slot1, row] }
      : { ...current.sides, slot2: [...current.sides.slot2, row] };
  const pool = current.pool.filter((userId) => userId !== pick.userId);
  const done = captainPickDone(pool.length);
  return {
    ...current,
    status: done ? "done" : "live",
    sides,
    pool,
    turn:
      done || current.firstPickSide == null
        ? null
        : pickTurn({
            slot1: sides.slot1.length,
            slot2: sides.slot2.length,
            firstPickSide: current.firstPickSide,
          }),
    picks: {
      made: current.picks.made + 1,
      total: current.picks.total,
      next: pick.pickNumber + 1,
    },
  };
}

/** The pick Undo takes back: the highest pick number on either side. */
export function lastPick(sides: {
  slot1: readonly { userId: string; pickNumber: number | null }[];
  slot2: readonly { userId: string; pickNumber: number | null }[];
}): { userId: string; pickNumber: number; side: Side } | null {
  let last: { userId: string; pickNumber: number; side: Side } | null = null;
  for (const [side, rows] of [
    [1, sides.slot1],
    [2, sides.slot2],
  ] as const) {
    for (const row of rows) {
      if (
        row.pickNumber != null &&
        (last == null || row.pickNumber > last.pickNumber)
      ) {
        last = { userId: row.userId, pickNumber: row.pickNumber, side };
      }
    }
  }
  return last;
}

/** Everyone the room names: the pool and both sides. */
export function pickRoomUserIds(room: OpenPickRoom) {
  return [
    ...room.pool,
    ...room.sides.slot1.map((row) => row.userId),
    ...room.sides.slot2.map((row) => row.userId),
  ];
}
