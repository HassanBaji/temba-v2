import { messagesFor } from "@repo/i18n/messages";
import type { Locale } from "@repo/i18n/locale";

import {
  ofSide,
  type BoardPlayer,
  type Side,
  type SideCaptains,
} from "./football-board";
import {
  CAPTAIN_PICK_MIN_PLAYERS,
  type FootballBalanceOn,
  type FootballFirstPick,
} from "./football-lineup";
import { LEVEL_BANDS } from "./level-bands";
import { TIER_BANDS } from "./tier-bands";

/**
 * Why a Captain pick cannot open, or null when it can (ADR-0109): at least
 * four registered players, and two different Side captains, each a
 * registered player with an account.
 */
export function captainPickSetupProblem(
  captains: SideCaptains,
  registeredUserIds: readonly string[],
  accountUserIds: readonly string[],
  locale: Locale,
) {
  const m = messagesFor(locale).football.errors;
  if (registeredUserIds.length < CAPTAIN_PICK_MIN_PLAYERS) {
    return m.pickNeedsPlayers(CAPTAIN_PICK_MIN_PLAYERS);
  }
  if (captains.slot1 == null || captains.slot2 == null) {
    return m.pickNeedsCaptains;
  }
  if (captains.slot1 === captains.slot2) {
    return m.pickCaptainsDiffer;
  }
  const registered = new Set(registeredUserIds);
  const withAccount = new Set(accountUserIds);
  for (const captain of [captains.slot1, captains.slot2]) {
    if (!registered.has(captain)) {
      return m.registeredOnly;
    }
    if (!withAccount.has(captain)) {
      return m.captainNeedsAccount;
    }
  }
  return null;
}

/**
 * The side that picks first once the pick starts: the one named, or a toss.
 * `random` makes the toss.
 */
export function firstPickSide(
  firstPick: FootballFirstPick,
  random: () => number,
): Side {
  if (firstPick === "slot1") {
    return 1;
  }
  if (firstPick === "slot2") {
    return 2;
  }
  return random() < 0.5 ? 1 : 2;
}

/**
 * The side on turn in a live Captain pick (ADR-0109): the side with fewer
 * players; when they are level, the side with the first pick. It is read
 * from the sides as they stand, so an undo, a leaver or a late joiner needs
 * no repair, and an odd pool gives the first picker the last player.
 */
export function pickTurn(sides: {
  slot1: number;
  slot2: number;
  firstPickSide: Side;
}): Side {
  if (sides.slot1 === sides.slot2) {
    return sides.firstPickSide;
  }
  return sides.slot1 < sides.slot2 ? 1 : 2;
}

/** A Captain pick is done once nobody is left in the pool. */
export function captainPickDone(poolSize: number) {
  return poolSize === 0;
}

type PickedPlayer = { userId: string; pickNumber: number | null };

/** An open Pick room as `games.footballPickRoom` reads it to a client. */
export type OpenPickRoom = {
  status: "waiting" | "live" | "done";
  sides: { slot1: PickedPlayer[]; slot2: PickedPlayer[] };
  pool: string[];
  turn: Side | null;
  firstPickSide: Side | null;
  picks: { made: number; total: number; next: number };
};

/**
 * The room with a pick placed on the side on turn, as the server places it:
 * the caller's own pick shows at once and the next read corrects it. A room
 * that is not live stays as it is.
 */
export function pickRoomWithPick<
  Room extends OpenPickRoom | { status: "stopped" },
>(current: Room, pick: { userId: string; pickNumber: number }): Room {
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
  slot1: readonly PickedPlayer[];
  slot2: readonly PickedPlayer[];
}): { userId: string; pickNumber: number; side: Side } | null {
  let last: { userId: string; pickNumber: number; side: Side } | null = null;
  for (const side of [1, 2] as const) {
    for (const row of ofSide(sides, side)) {
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
export function pickRoomUserIds(room: Pick<OpenPickRoom, "pool" | "sides">) {
  return [
    ...room.pool,
    ...room.sides.slot1.map((row) => row.userId),
    ...room.sides.slot2.map((row) => row.userId),
  ];
}

/** How many players each side has once the pool is picked by the turn rule. */
export function captainPickFinalSizes(room: {
  slot1: number;
  slot2: number;
  pool: number;
  firstPickSide: Side;
}) {
  const sizes = { slot1: room.slot1, slot2: room.slot2 };
  for (let pick = 0; pick < room.pool; pick += 1) {
    const turn = pickTurn({ ...sizes, firstPickSide: room.firstPickSide });
    if (turn === 1) {
      sizes.slot1 += 1;
    } else {
      sizes.slot2 += 1;
    }
  }
  return sizes;
}

/**
 * Each side's count against what it ends with ("4 of 8"), and who is left
 * ("9 left").
 */
export function captainPickCountLines(
  room: {
    slot1: number;
    slot2: number;
    pool: number;
    firstPickSide: Side;
  },
  locale: Locale,
) {
  const m = messagesFor(locale).football.pick;
  const final = captainPickFinalSizes(room);
  return {
    slot1: m.sideCount(room.slot1, final.slot1),
    slot2: m.sideCount(room.slot2, final.slot2),
    pool: m.poolLeft(room.pool),
  };
}

/**
 * The lines at the top of a live or finished Pick room: the progress ("Pick
 * 6 of 14", "All 14 picked", or "…, watching" for an Organizer who is not a
 * Side captain), whose turn it is ("Your pick", "Faisal is picking", "Teams
 * are picked") and what that means, and on the first pick after a toss who
 * won it. `names` are the Side captains' names and the teams' bib names.
 */
export function captainPickRoomLines(
  room: {
    status: "live" | "done";
    picks: { made: number; total: number };
    turn: Side | null;
    firstPick: FootballFirstPick | null;
    firstPickSide: Side | null;
    sizes: { slot1: number; slot2: number };
  },
  viewerSide: Side | null,
  names: {
    captains: { slot1: string; slot2: string };
    teams: { slot1: string; slot2: string };
  },
  locale: Locale,
) {
  const m = messagesFor(locale).football.pick;
  if (room.status === "done") {
    const { slot1, slot2 } = room.sizes;
    const sizes =
      slot1 === slot2
        ? m.doneSizesEven(slot1)
        : m.doneSizesSplit(Math.max(slot1, slot2), Math.min(slot1, slot2));
    return {
      progress: m.allPicked(room.picks.made),
      title: m.doneTitle,
      sub: `${sizes} ${m.doneBody}`,
      toss: null,
    };
  }
  const turn = room.turn ?? room.firstPickSide ?? 1;
  const captain = (side: Side) => ofSide(names.captains, side);
  const toss =
    room.picks.made === 0 &&
    room.firstPick === "toss" &&
    room.firstPickSide != null
      ? m.wonTheToss(ofSide(names.teams, room.firstPickSide))
      : null;
  if (viewerSide == null) {
    return {
      progress: m.progressWatching(
        Math.min(room.picks.made + 1, room.picks.total),
        room.picks.total,
      ),
      title: m.isPicking(captain(turn)),
      sub: m.watchingHint,
      toss,
    };
  }
  const onTurn = viewerSide === turn;
  return {
    progress: captainPickProgressLine(room.picks, locale),
    title: onTurn ? m.yourPick : m.isPicking(captain(turn)),
    sub: onTurn
      ? m.yourPickHint(captain(viewerSide === 1 ? 2 : 1))
      : m.pickAgainHint(captain(turn)),
    toss,
  };
}

/** "Pick 6 of 14": the pick to come, of every pick the pool needs. */
export function captainPickProgressLine(
  picks: { made: number; total: number },
  locale: Locale,
) {
  return messagesFor(locale).football.pick.progress(
    Math.min(picks.made + 1, picks.total),
    picks.total,
  );
}

/**
 * "14 players, 7 each": who is still to be picked and how they split. An odd
 * pool reads "13 players, 7 and 6".
 */
export function captainPickPoolLine(poolSize: number, locale: Locale) {
  const m = messagesFor(locale).football.pick;
  const more = Math.ceil(poolSize / 2);
  const fewer = Math.floor(poolSize / 2);
  return more === fewer
    ? m.poolEach(poolSize, more)
    : m.poolSplit(poolSize, more, fewer);
}

/**
 * What the First pick row says: who picks first, or that a toss decides it
 * once both Side captains are in, and then who won it.
 */
export function captainPickFirstPickLine(
  pick: { firstPick: FootballFirstPick | null; firstPickSide: Side | null },
  names: { slot1: string; slot2: string },
  locale: Locale,
) {
  const m = messagesFor(locale).football.pick;
  if (pick.firstPick === "toss" || pick.firstPick == null) {
    return pick.firstPickSide == null
      ? m.tossedWhenBothIn
      : m.wonTheToss(ofSide(names, pick.firstPickSide));
  }
  return m.picksFirst(names[pick.firstPick]);
}

type PoolPlayer = Pick<
  BoardPlayer,
  "userId" | "levelBand" | "ovr" | "balanceStrength" | "tier"
>;

function descending(value: number | null | undefined) {
  return value == null ? Number.POSITIVE_INFINITY : -value;
}

function ascending(value: number | null | undefined) {
  return value ?? Number.POSITIVE_INFINITY;
}

/**
 * The pool, best first, by what the viewer is shown of each player
 * (ADR-0109): an Organizer by balance strength, as Make teams balances; a
 * Side captain by OVR, or in a tier Group by Tier band and place, so no
 * Provisional member's points decide where they sit. Ties keep roster
 * order.
 */
export function captainPickPoolOrder<Player extends PoolPlayer>(
  pool: readonly Player[],
  viewer: { organizer: boolean; balanceOn: FootballBalanceOn },
): Player[] {
  const keys: ((player: Player) => number)[] =
    viewer.organizer && pool.every((player) => player.balanceStrength != null)
      ? [(player) => descending(player.balanceStrength)]
      : viewer.balanceOn === "tierPoints"
        ? [
            (player) =>
              player.tier?.band
                ? TIER_BANDS.indexOf(player.tier.band)
                : Number.POSITIVE_INFINITY,
            (player) => ascending(player.tier?.place),
          ]
        : [
            (player) => descending(player.ovr),
            (player) =>
              player.levelBand
                ? -LEVEL_BANDS.indexOf(player.levelBand)
                : Number.POSITIVE_INFINITY,
          ];
  return pool
    .map((player, index) => ({ player, index }))
    .sort((a, b) => {
      for (const key of keys) {
        const difference = key(a.player) - key(b.player);
        if (difference !== 0 && !Number.isNaN(difference)) {
          return difference;
        }
      }
      return a.index - b.index;
    })
    .map((entry) => entry.player);
}
