import {
  GAME_WINDOW_FINISH_SLOTS,
  GAME_WINDOW_TIME_STEP_MINUTES,
  timeSlotFromMinutes,
  timeSlotMinutes,
} from "./game-window";
import { circleMethodPairings } from "./tournament-schedule";

export const AMERICANO_SHAPE = "americano";

export const AMERICANO_PLAYERS_PER_COURT = 4;
export const AMERICANO_PLAYER_MIN = 8;
export const AMERICANO_PLAYER_MAX = 24;
export const AMERICANO_PLAYER_STEP = AMERICANO_PLAYERS_PER_COURT;
export const AMERICANO_DEFAULT_PLAYERS = 16;
export const AMERICANO_DEFAULT_ROUNDS = 7;
export const AMERICANO_ROUND_MIN = 1;

export function isAmericano(
  format: string | null | undefined,
  tournamentShape: string | null | undefined,
) {
  return (
    format === "friendly_tournament" && tournamentShape === AMERICANO_SHAPE
  );
}

/**
 * The create flow keeps one Game team count for every shape: an Americano's
 * players are twice it, the pairs on court in one Round.
 */
export function americanoPlayersOfTeamCount(teamCount: number) {
  return teamCount * 2;
}

export function americanoTeamCountOfPlayers(players: number) {
  return players / 2;
}

export function clampAmericanoPlayers(players: number) {
  if (!Number.isFinite(players)) {
    return AMERICANO_DEFAULT_PLAYERS;
  }
  const fours =
    Math.round(players / AMERICANO_PLAYERS_PER_COURT) *
    AMERICANO_PLAYERS_PER_COURT;
  return Math.min(AMERICANO_PLAYER_MAX, Math.max(AMERICANO_PLAYER_MIN, fours));
}

export function isAmericanoPlayerCount(players: number) {
  return (
    Number.isInteger(players) &&
    players % AMERICANO_PLAYERS_PER_COURT === 0 &&
    players >= AMERICANO_PLAYER_MIN &&
    players <= AMERICANO_PLAYER_MAX
  );
}

/** Courts in play at once: four players a court, nobody sits out. */
export function americanoCourtCount(players: number) {
  return Math.floor(players / AMERICANO_PLAYERS_PER_COURT);
}

/** Everyone with everyone once: each Round is a new partner. */
export function americanoRoundMax(players: number) {
  return Math.max(AMERICANO_ROUND_MIN, players - 1);
}

export function clampAmericanoRounds(
  rounds: number | null | undefined,
  players: number,
) {
  const max = americanoRoundMax(players);
  if (rounds == null || !Number.isFinite(rounds)) {
    return Math.min(AMERICANO_DEFAULT_ROUNDS, max);
  }
  return Math.min(max, Math.max(AMERICANO_ROUND_MIN, Math.round(rounds)));
}

export function americanoGameCount(players: number, rounds: number) {
  return americanoCourtCount(players) * rounds;
}

/**
 * Time slots one Round takes: one when the Game records a Court for every
 * game in a Round, more when games wait for a free Court.
 */
export function americanoSlotsPerRound(
  players: number,
  recordedCourts: number,
) {
  const courts = americanoCourtCount(players);
  if (recordedCourts < 1 || recordedCourts >= courts) {
    return 1;
  }
  return Math.ceil(courts / recordedCourts);
}

export function americanoPlayMinutes(input: {
  players: number;
  rounds: number;
  matchMinutes: number;
  recordedCourts: number;
}) {
  return (
    input.rounds *
    americanoSlotsPerRound(input.players, input.recordedCourts) *
    input.matchMinutes
  );
}

/** The finish slot the Rounds need, back to back, or null past the day's last finish. */
export function americanoFinishSlot(
  startTime: string,
  input: Parameters<typeof americanoPlayMinutes>[0],
) {
  const start = timeSlotMinutes(startTime);
  if (start == null || input.matchMinutes <= 0) {
    return null;
  }
  const minutes = americanoPlayMinutes(input);
  const steps = Math.ceil(minutes / GAME_WINDOW_TIME_STEP_MINUTES);
  const slot = timeSlotFromMinutes(
    start + steps * GAME_WINDOW_TIME_STEP_MINUTES,
  );
  return GAME_WINDOW_FINISH_SLOTS.includes(slot) ? slot : null;
}

export type AmericanoPair = readonly [string, string];

export type AmericanoPairing = {
  roundNumber: number;
  /** One-based position in the Round; the first is played on the first Court. */
  position: number;
  slot1: AmericanoPair;
  slot2: AmericanoPair;
};

function pairKey(left: string, right: string) {
  return left < right ? `${left}|${right}` : `${right}|${left}`;
}

function bumpCount(counts: Map<string, number>, key: string) {
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

function opponentCost(
  counts: ReadonlyMap<string, number>,
  first: AmericanoPair,
  second: AmericanoPair,
) {
  let cost = 0;
  for (const left of first) {
    for (const right of second) {
      const met = counts.get(pairKey(left, right)) ?? 0;
      cost += met * met;
    }
  }
  return cost;
}

/**
 * Puts a Round's pairs against each other with the fewest repeat opponents:
 * an exhaustive search over the ways to split the pairs into games, cut off
 * as soon as a split cannot beat the best so far. Twelve pairs is at most
 * 10,395 splits.
 */
function leastRepeatSplit(
  pairs: readonly AmericanoPair[],
  counts: ReadonlyMap<string, number>,
): [AmericanoPair, AmericanoPair][] {
  let best: [AmericanoPair, AmericanoPair][] | null = null;
  let bestCost = Number.POSITIVE_INFINITY;
  const chosen: [AmericanoPair, AmericanoPair][] = [];

  function search(remaining: readonly AmericanoPair[], cost: number) {
    if (cost >= bestCost) {
      return;
    }
    const [first, ...rest] = remaining;
    if (!first) {
      best = [...chosen];
      bestCost = cost;
      return;
    }
    for (let index = 0; index < rest.length; index += 1) {
      const second = rest[index];
      if (!second) {
        continue;
      }
      chosen.push([first, second]);
      search(
        rest.filter((_, other) => other !== index),
        cost + opponentCost(counts, first, second),
      );
      chosen.pop();
      if (bestCost === 0) {
        return;
      }
    }
  }

  search(pairs, 0);
  return best ?? [];
}

/**
 * Every Round of an Americano from the drawn order of players. Partners come
 * from the circle method, so nobody partners the same player twice for up to
 * one fewer Round than there are players; each Round's pairs then meet with
 * the fewest repeat opponents. Swapping two players in the order swaps them
 * in every Round, which keeps both rules.
 */
export function americanoRounds(
  order: readonly string[],
  roundCount: number,
): AmericanoPairing[] {
  if (
    order.length < AMERICANO_PLAYERS_PER_COURT ||
    order.length % AMERICANO_PLAYERS_PER_COURT !== 0
  ) {
    return [];
  }
  const rounds = Math.min(roundCount, americanoRoundMax(order.length));
  const partnersByRound = new Map<number, AmericanoPair[]>();
  for (const pairing of circleMethodPairings(order)) {
    if (pairing.roundNumber > rounds) {
      continue;
    }
    const list = partnersByRound.get(pairing.roundNumber) ?? [];
    list.push([pairing.slot1, pairing.slot2]);
    partnersByRound.set(pairing.roundNumber, list);
  }
  const opponents = new Map<string, number>();
  const pairings: AmericanoPairing[] = [];
  for (let roundNumber = 1; roundNumber <= rounds; roundNumber += 1) {
    const split = leastRepeatSplit(
      partnersByRound.get(roundNumber) ?? [],
      opponents,
    );
    split.forEach(([slot1, slot2], index) => {
      pairings.push({ roundNumber, position: index + 1, slot1, slot2 });
      for (const left of slot1) {
        for (const right of slot2) {
          bumpCount(opponents, pairKey(left, right));
        }
      }
    });
  }
  return pairings;
}

export function americanoRoundOf(
  pairings: readonly AmericanoPairing[],
  roundNumber: number,
) {
  return pairings
    .filter((pairing) => pairing.roundNumber === roundNumber)
    .sort((left, right) => left.position - right.position);
}

/** Pairs of players who partner more than once. Empty when the rule holds. */
export function repeatedPartners(
  pairings: readonly { slot1: AmericanoPair; slot2: AmericanoPair }[],
) {
  const counts = new Map<string, number>();
  for (const pairing of pairings) {
    bumpCount(counts, pairKey(...pairing.slot1));
    bumpCount(counts, pairKey(...pairing.slot2));
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([key]) => key.split("|") as [string, string]);
}

function swapIn(pair: AmericanoPair, first: string, second: string) {
  return pair.map((player) =>
    player === first ? second : player === second ? first : player,
  ) as unknown as AmericanoPair;
}

/** Swaps two players' places in one Round only. */
export function swapPlayersInRound<
  Pairing extends {
    roundNumber: number;
    slot1: AmericanoPair;
    slot2: AmericanoPair;
  },
>(
  pairings: readonly Pairing[],
  roundNumber: number,
  first: string,
  second: string,
) {
  return pairings.map((pairing) =>
    pairing.roundNumber === roundNumber
      ? {
          ...pairing,
          slot1: swapIn(pairing.slot1, first, second),
          slot2: swapIn(pairing.slot2, first, second),
        }
      : pairing,
  );
}

/** Swaps two players in the drawn order, which moves them in every Round. */
export function swapInOrder(
  order: readonly string[],
  first: string,
  second: string,
) {
  return order.map((player) =>
    player === first ? second : player === second ? first : player,
  );
}

export type AmericanoResult = {
  slot1: readonly string[];
  slot2: readonly string[];
  slot1GamesWon: number;
  slot2GamesWon: number;
};

export type AmericanoStanding = {
  playerId: string;
  place: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gamesWon: number;
  gamesLost: number;
  difference: number;
};

/**
 * One table of players, ranked on games won. Every game a pair wins counts
 * for both its players. Ties go to game difference, then games won outright,
 * then the order the players were given in.
 */
export function americanoStandings(
  playerIds: readonly string[],
  results: readonly AmericanoResult[],
): AmericanoStanding[] {
  const rows = new Map(
    playerIds.map((playerId) => [
      playerId,
      {
        playerId,
        place: 0,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        gamesWon: 0,
        gamesLost: 0,
        difference: 0,
      },
    ]),
  );
  for (const result of results) {
    const sides = [
      {
        players: result.slot1,
        mine: result.slot1GamesWon,
        theirs: result.slot2GamesWon,
      },
      {
        players: result.slot2,
        mine: result.slot2GamesWon,
        theirs: result.slot1GamesWon,
      },
    ];
    for (const side of sides) {
      for (const playerId of side.players) {
        const row = rows.get(playerId);
        if (!row) {
          continue;
        }
        row.played += 1;
        row.gamesWon += side.mine;
        row.gamesLost += side.theirs;
        if (side.mine > side.theirs) {
          row.won += 1;
        } else if (side.mine < side.theirs) {
          row.lost += 1;
        } else {
          row.drawn += 1;
        }
      }
    }
  }
  const given = new Map(playerIds.map((playerId, index) => [playerId, index]));
  return [...rows.values()]
    .map((row) => ({ ...row, difference: row.gamesWon - row.gamesLost }))
    .sort(
      (left, right) =>
        right.gamesWon - left.gamesWon ||
        right.difference - left.difference ||
        right.won - left.won ||
        (given.get(left.playerId) ?? 0) - (given.get(right.playerId) ?? 0),
    )
    .map((row, index) => ({ ...row, place: index + 1 }));
}

export type AmericanoOutcome = "won" | "drawn" | "lost";

export function americanoOutcome(
  mine: number,
  theirs: number,
): AmericanoOutcome {
  if (mine > theirs) {
    return "won";
  }
  return mine < theirs ? "lost" : "drawn";
}
