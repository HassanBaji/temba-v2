import { poolRounds } from "./tournament-schedule";
import { poolPassLength } from "./tournament-sizing";

export type RoundPairing = {
  slot1GameTeamId: string;
  slot2GameTeamId: string;
};

export type PairingPool = {
  poolIndex: number;
  gameTeamIds: readonly string[];
};

export type MadeRound = {
  roundNumber: number;
  pairings: readonly RoundPairing[];
};

export type RoundRepeat = {
  roundNumber: number;
  pairing: RoundPairing;
};

// A pair meeting again outweighs any points gap, so the matcher only
// accepts a repeat when no repeat-free round exists.
const REPEAT_COST = 1000;
const POINTS_COST = 10;
const SEARCH_NODE_LIMIT = 40_000;
const GENERATE_ATTEMPTS = 16;

export function pairKey(left: string, right: string) {
  return left < right ? `${left}|${right}` : `${right}|${left}`;
}

function passOf(roundNumber: number, suggested: number) {
  return suggested < 1 ? 1 : Math.ceil(roundNumber / suggested);
}

/**
 * Pass alignment (ADR-0019): Round r is position j of its Pass, and a Pool
 * whose own Pass is shorter than j sits that Round out.
 */
export function poolPlaysRound(
  poolSize: number,
  roundNumber: number,
  suggested: number,
) {
  if (poolSize < 2 || suggested < 1) {
    return false;
  }
  const position =
    roundNumber - (passOf(roundNumber, suggested) - 1) * suggested;
  return position <= poolPassLength(poolSize);
}

export function expectedRoundMatchCount(
  pools: readonly PairingPool[],
  roundNumber: number,
  suggested: number,
) {
  let count = 0;
  for (const pool of pools) {
    if (poolPlaysRound(pool.gameTeamIds.length, roundNumber, suggested)) {
      count += Math.floor(pool.gameTeamIds.length / 2);
    }
  }
  return count;
}

/** Deterministic PRNG (mulberry32) seeded from a string. */
export function seededRandom(seed: string): () => number {
  let state = 0;
  for (let index = 0; index < seed.length; index += 1) {
    state = (Math.imul(31, state) + seed.charCodeAt(index)) | 0;
  }
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    const held = copy[index] as T;
    copy[index] = copy[swap] as T;
    copy[swap] = held;
  }
  return copy;
}

function meetingCounts(rounds: readonly MadeRound[]) {
  const counts = new Map<string, number>();
  for (const round of rounds) {
    for (const pairing of round.pairings) {
      const key = pairKey(pairing.slot1GameTeamId, pairing.slot2GameTeamId);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return counts;
}

function playedCounts(rounds: readonly MadeRound[]) {
  const counts = new Map<string, number>();
  for (const round of rounds) {
    for (const pairing of round.pairings) {
      for (const id of [pairing.slot1GameTeamId, pairing.slot2GameTeamId]) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
  }
  return counts;
}

/**
 * The cheapest perfect matching of an even list of teams, by branch and
 * bound from a greedy start. Pools are small (32 teams at most), and the node
 * limit keeps the worst case bounded; the best matching found so far wins.
 */
function cheapestMatching(
  ids: readonly string[],
  cost: (left: string, right: string) => number,
  acceptBelow: number,
): [string, string][] {
  const greedy: [string, string][] = [];
  const left = [...ids];
  let greedyCost = 0;
  while (left.length > 1) {
    const first = left.shift()!;
    let bestIndex = 0;
    let bestCost = Number.POSITIVE_INFINITY;
    left.forEach((candidate, index) => {
      const value = cost(first, candidate);
      if (value < bestCost) {
        bestCost = value;
        bestIndex = index;
      }
    });
    const [partner] = left.splice(bestIndex, 1);
    greedy.push([first, partner!]);
    greedyCost += bestCost;
  }

  let best = greedy;
  let bestTotal = greedyCost;
  let nodes = 0;
  const chosen: [string, string][] = [];

  function search(remaining: readonly string[], total: number) {
    nodes += 1;
    if (
      bestTotal < acceptBelow ||
      nodes > SEARCH_NODE_LIMIT ||
      total >= bestTotal
    ) {
      return;
    }
    if (remaining.length === 0) {
      best = [...chosen];
      bestTotal = total;
      return;
    }
    const [first, ...rest] = remaining as [string, ...string[]];
    const candidates = rest
      .map((candidate) => ({ candidate, value: cost(first, candidate) }))
      .sort((a, b) => a.value - b.value);
    for (const { candidate, value } of candidates) {
      chosen.push([first, candidate]);
      search(
        rest.filter((id) => id !== candidate),
        total + value,
      );
      chosen.pop();
    }
  }

  search(ids, 0);
  return best;
}

/**
 * One Round's pairings: every Pool that plays this Round is paired so no two
 * teams meet again while a fresh opponent is left, and, when points are
 * given, teams on similar points meet. `fixed` pairings are kept as they are
 * and the rest is filled around them. With an odd number of free teams, the
 * team that has played most sits out.
 */
export function pairRound(args: {
  pools: readonly PairingPool[];
  roundNumber: number;
  suggested: number;
  otherRounds: readonly MadeRound[];
  fixed?: readonly RoundPairing[];
  points?: Readonly<Record<string, number>>;
  random: () => number;
}): RoundPairing[] {
  const meetings = meetingCounts(args.otherRounds);
  const played = playedCounts(args.otherRounds);
  const fixed = args.fixed ?? [];
  const taken = new Set(
    fixed.flatMap((pairing) => [
      pairing.slot1GameTeamId,
      pairing.slot2GameTeamId,
    ]),
  );
  const tieBreak = new Map<string, number>();
  const cost = (left: string, right: string) => {
    const key = pairKey(left, right);
    let jitter = tieBreak.get(key);
    if (jitter === undefined) {
      jitter = args.random();
      tieBreak.set(key, jitter);
    }
    const pointsGap = args.points
      ? Math.abs((args.points[left] ?? 0) - (args.points[right] ?? 0))
      : 0;
    return (
      (meetings.get(key) ?? 0) * REPEAT_COST + pointsGap * POINTS_COST + jitter
    );
  };

  const pairings: RoundPairing[] = [...fixed];
  const pools = [...args.pools].sort((a, b) => a.poolIndex - b.poolIndex);
  for (const pool of pools) {
    if (
      !poolPlaysRound(pool.gameTeamIds.length, args.roundNumber, args.suggested)
    ) {
      continue;
    }
    let free = shuffled(
      pool.gameTeamIds.filter((id) => !taken.has(id)),
      args.random,
    );
    if (free.length % 2 === 1) {
      const sitsOut = [...free].sort(
        (a, b) => (played.get(b) ?? 0) - (played.get(a) ?? 0),
      )[0];
      free = free.filter((id) => id !== sitsOut);
    }
    // Without points any repeat-free matching is as good as another, so the
    // search stops at the first one.
    const acceptBelow = args.points ? 0 : REPEAT_COST;
    for (const [first, second] of cheapestMatching(free, cost, acceptBelow)) {
      const swap = args.random() < 0.5;
      pairings.push({
        slot1GameTeamId: swap ? second : first,
        slot2GameTeamId: swap ? first : second,
      });
    }
  }
  return pairings;
}

/**
 * Pairs that meet more often than the Round's Pass allows: in the first Pass
 * any second meeting, in the second Pass any third.
 */
export function roundRepeats(
  rounds: readonly MadeRound[],
  suggested: number,
): RoundRepeat[] {
  const ordered = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);
  const counts = new Map<string, number>();
  const repeats: RoundRepeat[] = [];
  for (const round of ordered) {
    for (const pairing of round.pairings) {
      const key = pairKey(pairing.slot1GameTeamId, pairing.slot2GameTeamId);
      const count = (counts.get(key) ?? 0) + 1;
      counts.set(key, count);
      if (count > passOf(round.roundNumber, suggested)) {
        repeats.push({ roundNumber: round.roundNumber, pairing });
      }
    }
  }
  return repeats;
}

/**
 * Makes the given Rounds around the Rounds already made. With nothing made
 * yet and every Round asked for, this is the circle method's full round
 * robin. Otherwise each Round is paired in turn, and the best of several
 * attempts (fewest repeats) is kept.
 */
export function generateRounds(args: {
  pools: readonly PairingPool[];
  suggested: number;
  roundCount: number;
  roundNumbers: readonly number[];
  madeRounds: readonly MadeRound[];
  points?: Readonly<Record<string, number>>;
  random: () => number;
}): MadeRound[] {
  const wanted = [...new Set(args.roundNumbers)]
    .filter((roundNumber) => roundNumber >= 1)
    .sort((a, b) => a - b);
  if (wanted.length === 0) {
    return [];
  }
  const everyRound =
    args.madeRounds.length === 0 &&
    wanted.length === args.roundCount &&
    wanted.every((roundNumber, index) => roundNumber === index + 1);
  if (everyRound) {
    const circle = poolRounds({
      pools: args.pools,
      roundCount: args.roundCount,
    });
    return wanted.map((roundNumber) => ({
      roundNumber,
      pairings:
        circle.find((round) => round.roundNumber === roundNumber)?.items ?? [],
    }));
  }

  let best: MadeRound[] = [];
  let bestRepeats = Number.POSITIVE_INFINITY;
  for (let attempt = 0; attempt < GENERATE_ATTEMPTS; attempt += 1) {
    const made: MadeRound[] = [];
    for (const roundNumber of wanted) {
      made.push({
        roundNumber,
        pairings: pairRound({
          pools: args.pools,
          roundNumber,
          suggested: args.suggested,
          otherRounds: [...args.madeRounds, ...made],
          points: args.points,
          random: args.random,
        }),
      });
    }
    const repeats = roundRepeats(
      [...args.madeRounds, ...made],
      args.suggested,
    ).length;
    if (repeats < bestRepeats) {
      best = made;
      bestRepeats = repeats;
    }
    if (bestRepeats === 0) {
      break;
    }
  }
  return best;
}

/**
 * Gives `keepGameTeamId` the opponent `newOpponentGameTeamId`. The team they
 * were playing takes the chosen team's place, so the Round stays complete.
 */
export function swapPairing(
  pairings: readonly RoundPairing[],
  keepGameTeamId: string,
  newOpponentGameTeamId: string,
): RoundPairing[] | null {
  const keepIndex = pairings.findIndex(
    (pairing) =>
      pairing.slot1GameTeamId === keepGameTeamId ||
      pairing.slot2GameTeamId === keepGameTeamId,
  );
  const chosenIndex = pairings.findIndex(
    (pairing) =>
      pairing.slot1GameTeamId === newOpponentGameTeamId ||
      pairing.slot2GameTeamId === newOpponentGameTeamId,
  );
  if (keepIndex < 0 || chosenIndex < 0 || keepIndex === chosenIndex) {
    return null;
  }
  const keep = pairings[keepIndex]!;
  const oldOpponent =
    keep.slot1GameTeamId === keepGameTeamId
      ? keep.slot2GameTeamId
      : keep.slot1GameTeamId;
  const replace = (pairing: RoundPairing, from: string, to: string) => ({
    slot1GameTeamId:
      pairing.slot1GameTeamId === from ? to : pairing.slot1GameTeamId,
    slot2GameTeamId:
      pairing.slot2GameTeamId === from ? to : pairing.slot2GameTeamId,
  });
  return pairings.map((pairing, index) => {
    if (index === keepIndex) {
      return replace(pairing, oldOpponent, newOpponentGameTeamId);
    }
    if (index === chosenIndex) {
      return replace(pairing, newOpponentGameTeamId, oldOpponent);
    }
    return pairing;
  });
}

export type RoundSlotState = {
  roundNumber: number;
  draft: boolean;
  pairings: readonly RoundPairing[];
};

/**
 * After a swap in `changedRound`, re-pairs the later draft Rounds if any pair
 * now meets too often. Posted Rounds never move. Deterministic for a seed,
 * so a client preview and the server agree on the outcome.
 */
export function repairLaterDrafts(args: {
  pools: readonly PairingPool[];
  suggested: number;
  roundCount: number;
  rounds: readonly RoundSlotState[];
  changedRound: number;
  seed: string;
}): { rounds: RoundSlotState[]; repeats: RoundRepeat[] } {
  const later = args.rounds.filter(
    (round) => round.draft && round.roundNumber > args.changedRound,
  );
  const fixed = args.rounds.filter(
    (round) => !round.draft || round.roundNumber <= args.changedRound,
  );
  const before = roundRepeats(args.rounds, args.suggested);
  if (later.length === 0 || before.length === 0) {
    return { rounds: [...args.rounds], repeats: before };
  }
  const regenerated = generateRounds({
    pools: args.pools,
    suggested: args.suggested,
    roundCount: args.roundCount,
    roundNumbers: later.map((round) => round.roundNumber),
    madeRounds: fixed,
    random: seededRandom(args.seed),
  });
  const rounds: RoundSlotState[] = [
    ...fixed,
    ...regenerated.map((round) => ({ ...round, draft: true })),
  ].sort((a, b) => a.roundNumber - b.roundNumber);
  return { rounds, repeats: roundRepeats(rounds, args.suggested) };
}

/** Problems that stop a Round from being posted, in the order to fix them. */
export type RoundProblem =
  | { kind: "team_twice"; gameTeamId: string }
  | { kind: "pools_differ"; pairing: RoundPairing }
  | { kind: "pool_sits_out"; pairing: RoundPairing }
  | { kind: "unknown_team"; gameTeamId: string }
  | { kind: "incomplete"; made: number; expected: number };

export function roundProblems(args: {
  pools: readonly PairingPool[];
  roundNumber: number;
  suggested: number;
  pairings: readonly RoundPairing[];
  requireComplete: boolean;
}): RoundProblem[] {
  const poolOf = new Map<string, PairingPool>();
  for (const pool of args.pools) {
    for (const id of pool.gameTeamIds) {
      poolOf.set(id, pool);
    }
  }
  const problems: RoundProblem[] = [];
  const seen = new Set<string>();
  for (const pairing of args.pairings) {
    for (const id of [pairing.slot1GameTeamId, pairing.slot2GameTeamId]) {
      if (!poolOf.has(id)) {
        problems.push({ kind: "unknown_team", gameTeamId: id });
      } else if (seen.has(id)) {
        problems.push({ kind: "team_twice", gameTeamId: id });
      }
      seen.add(id);
    }
    const pool1 = poolOf.get(pairing.slot1GameTeamId);
    const pool2 = poolOf.get(pairing.slot2GameTeamId);
    if (pool1 && pool2 && pool1 !== pool2) {
      problems.push({ kind: "pools_differ", pairing });
    } else if (
      pool1 &&
      !poolPlaysRound(
        pool1.gameTeamIds.length,
        args.roundNumber,
        args.suggested,
      )
    ) {
      problems.push({ kind: "pool_sits_out", pairing });
    }
  }
  const expected = expectedRoundMatchCount(
    args.pools,
    args.roundNumber,
    args.suggested,
  );
  if (args.requireComplete && args.pairings.length !== expected) {
    problems.push({
      kind: "incomplete",
      made: args.pairings.length,
      expected,
    });
  }
  return problems;
}
