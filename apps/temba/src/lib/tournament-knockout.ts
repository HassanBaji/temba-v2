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

export function buildKnockoutTree(input: {
  entrantCount: number;
}): KnockoutTree | null {
  const entrantCount = input.entrantCount;
  if (!Number.isInteger(entrantCount) || entrantCount < KNOCKOUT_MIN_ENTRANTS) {
    return null;
  }

  const size = nextPowerOfTwo(entrantCount);
  const roundCount = Math.log2(size);
  const byeCount = size - entrantCount;
  const seeds = bracketSeedOrder(size);

  const firstRound: KnockoutFirstRoundPlace[] = [];
  const entries: KnockoutEntry[] = [];
  for (let position = 1; position <= size / 2; position += 1) {
    const slot1Seed = seeds[(position - 1) * 2] ?? 0;
    const slot2Seed = seeds[(position - 1) * 2 + 1] ?? 0;
    const slot1Present = slot1Seed <= entrantCount;
    const slot2Present = slot2Seed <= entrantCount;
    if (slot1Present && slot2Present) {
      firstRound.push({
        kind: "match",
        position,
        slot1Entrant: slot1Seed,
        slot2Entrant: slot2Seed,
      });
      entries.push(
        { round: 1, position, slot: 1, entrant: slot1Seed },
        { round: 1, position, slot: 2, entrant: slot2Seed },
      );
      continue;
    }
    const entrant = slot1Present ? slot1Seed : slot2Seed;
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
