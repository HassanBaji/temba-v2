import { messagesFor } from "@repo/i18n/messages";
import type { Locale } from "@repo/i18n/locale";

import type { BoardPlayer, Side, SideCaptains } from "./football-board";
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
  const captain = (side: Side) =>
    side === 1 ? names.captains.slot1 : names.captains.slot2;
  const toss =
    room.picks.made === 0 &&
    room.firstPick === "toss" &&
    room.firstPickSide != null
      ? m.wonTheToss(
          room.firstPickSide === 1 ? names.teams.slot1 : names.teams.slot2,
        )
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
  const name = (side: Side) => (side === 1 ? names.slot1 : names.slot2);
  if (pick.firstPick === "toss" || pick.firstPick == null) {
    return pick.firstPickSide == null
      ? m.tossedWhenBothIn
      : m.wonTheToss(name(pick.firstPickSide));
  }
  return m.picksFirst(name(pick.firstPick === "slot1" ? 1 : 2));
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
