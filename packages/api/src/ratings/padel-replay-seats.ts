import type { DoublesOutcome } from "@repo/domain/rate-doubles-match";

import type { ReplayEvent, ReplayMatch } from "#src/ratings/padel-replay";

export type Seats = {
  slot1: [string, string];
  slot2: [string, string];
  outcome: DoublesOutcome;
  standIns: Set<string>;
};

const STAND_IN_PREFIX = "stand-in:";

function twoDistinct(
  userIds: readonly string[] | null,
): [string, string] | null {
  const unique = [...new Set(userIds ?? [])];
  const [first, second] = unique;
  return unique.length === 2 && first && second ? [first, second] : null;
}

function outcomeForSlot1(score: number): DoublesOutcome | null {
  if (score === 1) {
    return "slot1";
  }
  if (score === 0) {
    return "slot2";
  }
  return score === 0.5 ? "draw" : null;
}

/** The one outcome score partners on `side` share: undefined when none of them was rated, NaN when they differ. */
function sideScore(
  side: readonly string[],
  events: readonly ReplayEvent[],
): number | undefined {
  const scores = new Set(
    events
      .filter((event) => side.includes(event.userId))
      .map((event) => event.outcomeScore),
  );
  return scores.size > 1 ? Number.NaN : [...scores][0];
}

/**
 * The sides from the Match's two Game teams, when they still fit its events:
 * every rated User on one side, partners sharing one outcome score.
 */
export function seatsFromTeams(
  match: ReplayMatch | undefined,
  events: readonly ReplayEvent[],
): Omit<Seats, "standIns"> | null {
  const slot1 = twoDistinct(match?.slot1 ?? null);
  const slot2 = twoDistinct(match?.slot2 ?? null);
  if (!slot1 || !slot2 || new Set([...slot1, ...slot2]).size !== 4) {
    return null;
  }
  if (
    events.some(
      (event) => !slot1.includes(event.userId) && !slot2.includes(event.userId),
    )
  ) {
    return null;
  }
  const score1 = sideScore(slot1, events);
  const score2 = sideScore(slot2, events);
  if (score1 === undefined && score2 === undefined) {
    return null;
  }
  if (score1 !== undefined && score2 !== undefined && score1 + score2 !== 1) {
    return null;
  }
  const outcome = outcomeForSlot1(score1 ?? 1 - (score2 ?? Number.NaN));
  return outcome ? { slot1, slot2, outcome } : null;
}

/** A decisive Match whose seats no longer fit, rebuilt with the winners together. */
export function seatsFromScores(
  matchId: string,
  events: readonly ReplayEvent[],
): Seats | null {
  if (
    events.some((event) => event.outcomeScore !== 0 && event.outcomeScore !== 1)
  ) {
    return null;
  }
  const winners = events.filter((event) => event.outcomeScore === 1);
  const losers = events.filter((event) => event.outcomeScore === 0);
  if (winners.length > 2 || losers.length > 2) {
    return null;
  }
  const standIns = new Set<string>();
  const side = (rows: readonly ReplayEvent[], label: string) => {
    const userIds = rows.map((event) => event.userId);
    while (userIds.length < 2) {
      const standIn = `${STAND_IN_PREFIX}${matchId}:${label}:${userIds.length}`;
      standIns.add(standIn);
      userIds.push(standIn);
    }
    return userIds as [string, string];
  };
  return {
    slot1: side(winners, "won"),
    slot2: side(losers, "lost"),
    outcome: "slot1",
    standIns,
  };
}
