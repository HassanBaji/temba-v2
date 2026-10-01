export const KNOCKOUT_MIN_ENTRANTS = 2;

export type KnockoutSlot = 1 | 2;

export type KnockoutPlace = {
  round: number;
  position: number;
  slot: KnockoutSlot;
};

export type KnockoutEntry = KnockoutPlace & {
  /** 1-based place in the drawn order. */
  entrant: number;
};

export type KnockoutFirstRoundPlace =
  | {
      kind: "match";
      position: number;
      slot1Entrant: number;
      slot2Entrant: number;
    }
  | { kind: "bye"; position: number; entrant: number };

export type KnockoutTree = {
  entrantCount: number;
  size: number;
  roundCount: number;
  byeCount: number;
  /** Index 0 is the first Knockout round. */
  matchesPerRound: number[];
  matchCount: number;
  firstRound: KnockoutFirstRoundPlace[];
  /** Where each entrant first appears: round 1, or round 2 after a Bye. */
  entries: KnockoutEntry[];
  /** Every Knockout Match, round by round. A Bye has no Match. */
  matches: { round: number; position: number }[];
};

function nextPowerOfTwo(value: number) {
  let size = 1;
  while (size < value) {
    size *= 2;
  }
  return size;
}

// Bracket order for `size` slots: seed s meets seed size + 1 - s, and the
// top seeds sit in opposite halves, so absent seeds (Byes) spread evenly.
function bracketSeedOrder(size: number): number[] {
  let order = [1];
  while (order.length < size) {
    const next = order.length * 2;
    order = order.flatMap((seed) => [seed, next + 1 - seed]);
  }
  return order;
}

export function knockoutFeeds(round: number, position: number): KnockoutPlace {
  return {
    round: round + 1,
    position: Math.ceil(position / 2),
    slot: position % 2 === 1 ? 1 : 2,
  };
}

export function knockoutFedBy(
  round: number,
  position: number,
  slot: KnockoutSlot,
): { round: number; position: number } | null {
  if (round <= 1) {
    return null;
  }
  return { round: round - 1, position: (position - 1) * 2 + slot };
}

function canPairAcrossPools(
  entrants: readonly number[],
  poolOf: (entrant: number) => number,
) {
  const counts = new Map<number, number>();
  for (const entrant of entrants) {
    const pool = poolOf(entrant);
    counts.set(pool, (counts.get(pool) ?? 0) + 1);
  }
  return [...counts.values()].every((count) => count * 2 <= entrants.length);
}

// The best remaining entrant meets the worst one from another Pool that still
// leaves a remainder pairable across Pools.
function pairAcrossPools(
  entrants: readonly number[],
  poolOf: (entrant: number) => number,
): [number, number][] {
  const remaining = [...entrants].sort((left, right) => left - right);
  const pairs: [number, number][] = [];
  while (remaining.length > 1) {
    const top = remaining.shift() ?? 0;
    let partnerIndex = remaining.length - 1;
    for (let index = remaining.length - 1; index >= 0; index -= 1) {
      const candidate = remaining[index] ?? 0;
      if (poolOf(candidate) === poolOf(top)) {
        continue;
      }
      const rest = remaining.filter((_, other) => other !== index);
      if (canPairAcrossPools(rest, poolOf)) {
        partnerIndex = index;
        break;
      }
    }
    const [partner] = remaining.splice(partnerIndex, 1);
    pairs.push([top, partner ?? 0]);
  }
  return pairs;
}

function layoutKnockoutTree(
  entrantCount: number,
  poolOf: ((entrant: number) => number) | null,
): KnockoutTree | null {
  if (!Number.isInteger(entrantCount) || entrantCount < KNOCKOUT_MIN_ENTRANTS) {
    return null;
  }

  const size = nextPowerOfTwo(entrantCount);
  const roundCount = Math.log2(size);
  const byeCount = size - entrantCount;
  const seeds = bracketSeedOrder(size);
  const seedsAt = (position: number) => ({
    slot1Seed: seeds[(position - 1) * 2] ?? 0,
    slot2Seed: seeds[(position - 1) * 2 + 1] ?? 0,
  });
  const isByePosition = (position: number) => {
    const { slot1Seed, slot2Seed } = seedsAt(position);
    return slot1Seed > entrantCount || slot2Seed > entrantCount;
  };

  const pairedAt = new Map<number, [number, number]>();
  if (poolOf) {
    const matchPositions = Array.from(
      { length: size / 2 },
      (_, index) => index + 1,
    )
      .filter((position) => !isByePosition(position))
      .sort((left, right) => {
        const leftSeeds = seedsAt(left);
        const rightSeeds = seedsAt(right);
        return (
          Math.min(leftSeeds.slot1Seed, leftSeeds.slot2Seed) -
          Math.min(rightSeeds.slot1Seed, rightSeeds.slot2Seed)
        );
      });
    const playing = Array.from(
      { length: entrantCount - byeCount },
      (_, index) => byeCount + index + 1,
    );
    pairAcrossPools(playing, poolOf).forEach((pair, index) => {
      const position = matchPositions[index];
      if (position != null) {
        pairedAt.set(position, pair);
      }
    });
  }

  const firstRound: KnockoutFirstRoundPlace[] = [];
  const entries: KnockoutEntry[] = [];
  for (let position = 1; position <= size / 2; position += 1) {
    const { slot1Seed, slot2Seed } = seedsAt(position);
    if (!isByePosition(position)) {
      const [slot1Entrant, slot2Entrant] = pairedAt.get(position) ?? [
        slot1Seed,
        slot2Seed,
      ];
      firstRound.push({ kind: "match", position, slot1Entrant, slot2Entrant });
      entries.push(
        { round: 1, position, slot: 1, entrant: slot1Entrant },
        { round: 1, position, slot: 2, entrant: slot2Entrant },
      );
      continue;
    }
    const entrant = slot1Seed <= entrantCount ? slot1Seed : slot2Seed;
    firstRound.push({ kind: "bye", position, entrant });
    entries.push({ ...knockoutFeeds(1, position), entrant });
  }
  entries.sort((left, right) => left.entrant - right.entrant);

  const matchesPerRound = Array.from({ length: roundCount }, (_, index) =>
    index === 0 ? size / 2 - byeCount : size / 2 ** (index + 1),
  );

  const matches: { round: number; position: number }[] = [];
  for (const place of firstRound) {
    if (place.kind === "match") {
      matches.push({ round: 1, position: place.position });
    }
  }
  for (let round = 2; round <= roundCount; round += 1) {
    for (let position = 1; position <= size / 2 ** round; position += 1) {
      matches.push({ round, position });
    }
  }

  return {
    entrantCount,
    size,
    roundCount,
    byeCount,
    matchesPerRound,
    matchCount: matches.length,
    firstRound,
    entries,
    matches,
  };
}

export function buildKnockoutTree(input: {
  entrantCount: number;
}): KnockoutTree | null {
  return layoutKnockoutTree(input.entrantCount, null);
}

/** Where a qualifier comes from: `pool` is 0-based in drawn Pool order. */
export type KnockoutQualifier = { pool: number; position: number };

export type PoolKnockoutTree = KnockoutTree & {
  /** Index `entrant - 1`: the Pool place that fills that entrant. */
  qualifiers: KnockoutQualifier[];
};

/**
 * Groups then knockout: entrants are every Pool winner (first Pool first),
 * then every second place, and so on, so Byes fall to Pool winners in Pool
 * order. With two or more Pools no first-round Match pairs a Pool with itself.
 */
export function buildPoolKnockoutTree(input: {
  poolCount: number;
  qualifiersPerPool: number;
}): PoolKnockoutTree | null {
  const { poolCount, qualifiersPerPool } = input;
  if (
    !Number.isInteger(poolCount) ||
    !Number.isInteger(qualifiersPerPool) ||
    poolCount < 1 ||
    qualifiersPerPool < 1
  ) {
    return null;
  }
  const qualifiers: KnockoutQualifier[] = [];
  for (let position = 1; position <= qualifiersPerPool; position += 1) {
    for (let pool = 0; pool < poolCount; pool += 1) {
      qualifiers.push({ pool, position });
    }
  }
  const tree = layoutKnockoutTree(qualifiers.length, (entrant) => {
    return qualifiers[entrant - 1]?.pool ?? -1;
  });
  return tree ? { ...tree, qualifiers } : null;
}

/** Teams left in a Knockout round: 2 in the Final, 4 in the Semi-finals. */
export function knockoutTeamsLeft(round: number, roundCount: number) {
  return 2 ** (roundCount - round + 1);
}

export function knockoutRoundName(round: number, roundCount: number) {
  const teamsLeft = knockoutTeamsLeft(round, roundCount);
  if (teamsLeft === 2) {
    return "Final";
  }
  if (teamsLeft === 4) {
    return "Semi-finals";
  }
  if (teamsLeft === 8) {
    return "Quarter-finals";
  }
  return `Round of ${teamsLeft}`;
}

/** One Match of a Knockout round: `Quarter-final`, `Semi-final`, `Final`. */
export function knockoutMatchRoundName(round: number, roundCount: number) {
  const teamsLeft = knockoutTeamsLeft(round, roundCount);
  if (teamsLeft === 2) {
    return "Final";
  }
  if (teamsLeft === 4) {
    return "Semi-final";
  }
  if (teamsLeft === 8) {
    return "Quarter-final";
  }
  return `Round of ${teamsLeft}`;
}

/** Where the Knockout starts, as in `3 groups of 4, then quarters`. */
export function knockoutStartWord(roundCount: number) {
  const teamsLeft = knockoutTeamsLeft(1, roundCount);
  if (teamsLeft === 2) {
    return "the final";
  }
  if (teamsLeft === 4) {
    return "semis";
  }
  if (teamsLeft === 8) {
    return "quarters";
  }
  return `the round of ${teamsLeft}`;
}

export function knockoutMatchCode(
  round: number,
  position: number,
  roundCount: number,
) {
  const teamsLeft = knockoutTeamsLeft(round, roundCount);
  if (teamsLeft === 2) {
    return "Final";
  }
  if (teamsLeft === 4) {
    return `S${position}`;
  }
  if (teamsLeft === 8) {
    return `Q${position}`;
  }
  return `R${teamsLeft}-${position}`;
}

export function knockoutWinnerOfLabel(code: string) {
  return `Winner of ${code}`;
}

export function knockoutByeCountLabel(byeCount: number) {
  return byeCount === 1 ? "1 bye" : `${byeCount} byes`;
}

/** Review row: `Round of 16 onward. 4 byes` */
export function knockoutOnlyReviewValue(tree: KnockoutTree) {
  const start = `${knockoutRoundName(1, tree.roundCount)} onward`;
  if (tree.byeCount === 0) {
    return start;
  }
  return `${start}. ${knockoutByeCountLabel(tree.byeCount)}`;
}

export const THROUGH_FROM_EACH_GROUP_LABEL = "Through from each group";

export function qualifierUnit(qualifiersPerPool: number) {
  return qualifiersPerPool === 1 ? "team" : "teams";
}

/** `6 teams into the knockout, 2 byes.` */
export function qualifiersConsequenceLine(tree: KnockoutTree) {
  const teams = `${tree.entrantCount} ${qualifierUnit(tree.entrantCount)} into the knockout`;
  return tree.byeCount === 0
    ? `${teams}.`
    : `${teams}, ${knockoutByeCountLabel(tree.byeCount)}.`;
}

const TOP_QUALIFIER_WORDS: Record<number, string> = {
  1: "Top team",
  2: "Top two",
  3: "Top three",
  4: "Top four",
};

function knockoutStageClause(roundCount: number) {
  const teams = knockoutTeamsLeft(1, roundCount);
  if (teams === 2) {
    return "final";
  }
  if (teams === 4) {
    return "semis, then the final";
  }
  if (teams === 8) {
    return "quarters onward";
  }
  return `round of ${teams} onward`;
}

/** Review row: `Top two in each group, quarters onward. 2 byes` */
export function groupsThenKnockoutReviewValue(args: {
  tree: KnockoutTree;
  poolCount: number;
  qualifiersPerPool: number;
}) {
  const top =
    TOP_QUALIFIER_WORDS[args.qualifiersPerPool] ??
    `Top ${args.qualifiersPerPool}`;
  const who = args.poolCount === 1 ? top : `${top} in each group`;
  const value = `${who}, ${knockoutStageClause(args.tree.roundCount)}`;
  return args.tree.byeCount === 0
    ? value
    : `${value}. ${knockoutByeCountLabel(args.tree.byeCount)}`;
}

/** `A1`: Pool letter in drawn order, then the place in that Pool's table. */
export function knockoutQualifierLabel(
  poolIndex: number,
  poolPosition: number,
) {
  return `${String.fromCharCode(64 + poolIndex)}${poolPosition}`;
}
