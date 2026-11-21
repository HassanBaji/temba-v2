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
