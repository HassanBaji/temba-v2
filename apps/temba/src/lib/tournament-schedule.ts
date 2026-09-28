import {
  suggestedRoundCount,
  tournamentMatchMinutes,
  type RoundMeets,
} from "~/lib/tournament-sizing";

export type CirclePairing<T> = {
  roundNumber: number;
  slot1: T;
  slot2: T;
};

export type ScheduledPoolMatch = {
  roundNumber: number;
  startTime: Date;
  endTime: Date;
  courtId: string;
  slot1GameTeamId: string;
  slot2GameTeamId: string;
};

function localDayKey(value: Date) {
  return `${value.getFullYear()}-${value.getMonth()}-${value.getDate()}`;
}

export function isOneDayTournamentWindow(start: Date, end: Date) {
  return localDayKey(start) === localDayKey(end);
}

function addMinutes(start: Date, minutes: number) {
  return new Date(start.getTime() + minutes * 60 * 1000);
}

export function fewWeeksRoundStarts(
  windowStart: Date,
  windowEnd: Date,
  roundCount: number,
  matchMinutes: number | null,
): Date[] {
  if (roundCount < 1) {
    return [];
  }
  const lastStart = addMinutes(
    windowEnd,
    -tournamentMatchMinutes(matchMinutes),
  );
  const last =
    lastStart.getTime() < windowStart.getTime() ? windowStart : lastStart;
  if (roundCount === 1) {
    return [windowStart];
  }
  const span = last.getTime() - windowStart.getTime();
  return Array.from(
    { length: roundCount },
    (_, index) =>
      new Date(
        windowStart.getTime() + Math.round((span * index) / (roundCount - 1)),
      ),
  );
}

export function circleMethodPairings<T>(
  teams: readonly T[],
): CirclePairing<T>[] {
  if (teams.length < 2) {
    return [];
  }
  const items: (T | null)[] = [...teams];
  if (items.length % 2 === 1) {
    items.push(null);
  }
  const size = items.length;
  const half = size / 2;
  const rotation = [...items];
  const pairings: CirclePairing<T>[] = [];
  for (let round = 0; round < size - 1; round += 1) {
    for (let index = 0; index < half; index += 1) {
      const slot1 = rotation[index];
      const slot2 = rotation[size - 1 - index];
      if (slot1 != null && slot2 != null) {
        pairings.push({
          roundNumber: round + 1,
          slot1,
          slot2,
        });
      }
    }
    const last = rotation.pop();
    if (last === undefined) {
      continue;
    }
    rotation.splice(1, 0, last);
  }
  return pairings;
}

// Pass-aligned: Round r is position j of Pass k across every Pool, so a smaller
// Pool sits out the tail of each Pass and no pair meets twice before all have met.
export function poolRoundPairings<T>(
  teams: readonly T[],
  args: { suggestedRoundCount: number; roundCount: number },
): CirclePairing<T>[] {
  const suggested = args.suggestedRoundCount;
  if (suggested < 1) {
    return [];
  }
  const byPosition = new Map<number, CirclePairing<T>[]>();
  for (const pairing of circleMethodPairings(teams)) {
    const list = byPosition.get(pairing.roundNumber) ?? [];
    list.push(pairing);
    byPosition.set(pairing.roundNumber, list);
  }
  const pairings: CirclePairing<T>[] = [];
  for (let roundNumber = 1; roundNumber <= args.roundCount; roundNumber += 1) {
    const pass = Math.ceil(roundNumber / suggested);
    const position = roundNumber - (pass - 1) * suggested;
    const swapped = pass % 2 === 0;
    for (const pairing of byPosition.get(position) ?? []) {
      pairings.push({
        roundNumber,
        slot1: swapped ? pairing.slot2 : pairing.slot1,
        slot2: swapped ? pairing.slot1 : pairing.slot2,
      });
    }
  }
  return pairings;
}

export type TournamentRoundSizing = {
  roundCount: number;
  poolMatches: number;
  matchesPerTeamMin: number;
  matchesPerTeamMax: number;
  meets: RoundMeets;
};

export function sizeTournamentRounds(
  poolSizes: readonly number[],
  roundCount: number,
): TournamentRoundSizing {
  const suggestedCount = suggestedRoundCount(poolSizes);
  let poolMatches = 0;
  const matchesPerTeam: number[] = [];
  const meetingsPerPair: number[] = [];
  for (const size of poolSizes) {
    const teams = Array.from({ length: size }, (_, index) => index);
    const pairings = poolRoundPairings(teams, {
      suggestedRoundCount: suggestedCount,
      roundCount,
    });
    poolMatches += pairings.length;
    const played = teams.map(() => 0);
    const meetings = new Map<string, number>();
    for (const pairing of pairings) {
      played[pairing.slot1] = (played[pairing.slot1] ?? 0) + 1;
      played[pairing.slot2] = (played[pairing.slot2] ?? 0) + 1;
      const key = pairKey(pairing.slot1, pairing.slot2);
      meetings.set(key, (meetings.get(key) ?? 0) + 1);
    }
    matchesPerTeam.push(...played);
    for (let left = 0; left < size; left += 1) {
      for (let right = left + 1; right < size; right += 1) {
        meetingsPerPair.push(meetings.get(pairKey(left, right)) ?? 0);
      }
    }
  }

  return {
    roundCount,
    poolMatches,
    matchesPerTeamMin:
      matchesPerTeam.length > 0 ? Math.min(...matchesPerTeam) : 0,
    matchesPerTeamMax:
      matchesPerTeam.length > 0 ? Math.max(...matchesPerTeam) : 0,
    meets: meetsState(meetingsPerPair),
  };
}

function pairKey(left: number, right: number) {
  return left < right ? `${left}:${right}` : `${right}:${left}`;
}

function meetsState(meetingsPerPair: readonly number[]): RoundMeets {
  if (meetingsPerPair.some((count) => count === 0)) {
    return "partial";
  }
  if (meetingsPerPair.every((count) => count >= 2)) {
    return "twice";
  }
  if (meetingsPerPair.some((count) => count >= 2)) {
    return "somePartialSecond";
  }
  return "once";
}

export function schedulePoolMatches(input: {
  pools: readonly { poolIndex: number; gameTeamIds: readonly string[] }[];
  roundCount: number;
  courtIds: readonly string[];
  windowStart: Date;
  windowEnd: Date;
  matchMinutes: number | null;
}): ScheduledPoolMatch[] {
  if (input.courtIds.length < 1) {
    return [];
  }

  const minutes = tournamentMatchMinutes(input.matchMinutes);

  const byRound = new Map<
    number,
    { slot1GameTeamId: string; slot2GameTeamId: string }[]
  >();
  const pools = [...input.pools].sort(
    (left, right) => left.poolIndex - right.poolIndex,
  );
  const suggested = suggestedRoundCount(
    pools.map((pool) => pool.gameTeamIds.length),
  );
  for (const pool of pools) {
    for (const pairing of poolRoundPairings(pool.gameTeamIds, {
      suggestedRoundCount: suggested,
      roundCount: input.roundCount,
    })) {
      const list = byRound.get(pairing.roundNumber) ?? [];
      list.push({
        slot1GameTeamId: pairing.slot1,
        slot2GameTeamId: pairing.slot2,
      });
      byRound.set(pairing.roundNumber, list);
    }
  }

  const roundNumbers = [...byRound.keys()].sort((left, right) => left - right);
  const maxRound = roundNumbers[roundNumbers.length - 1] ?? 0;
  const oneDay = isOneDayTournamentWindow(input.windowStart, input.windowEnd);
  const roundStarts = oneDay
    ? []
    : fewWeeksRoundStarts(
        input.windowStart,
        input.windowEnd,
        maxRound,
        input.matchMinutes,
      );

  const scheduled: ScheduledPoolMatch[] = [];
  let cursor = input.windowStart;
  for (const roundNumber of roundNumbers) {
    const roundMatches = byRound.get(roundNumber) ?? [];
    const roundStart = oneDay
      ? cursor
      : (roundStarts[roundNumber - 1] ?? cursor);
    for (let index = 0; index < roundMatches.length; index += 1) {
      const pairing = roundMatches[index];
      if (!pairing) {
        continue;
      }
      const slot = Math.floor(index / input.courtIds.length);
      const courtId = input.courtIds[index % input.courtIds.length];
      if (!courtId) {
        continue;
      }
      const startTime = addMinutes(roundStart, slot * minutes);
      scheduled.push({
        roundNumber,
        startTime,
        endTime: addMinutes(startTime, minutes),
        courtId,
        slot1GameTeamId: pairing.slot1GameTeamId,
        slot2GameTeamId: pairing.slot2GameTeamId,
      });
    }
    if (oneDay && roundMatches.length > 0) {
      const slotsUsed = Math.ceil(roundMatches.length / input.courtIds.length);
      cursor = addMinutes(roundStart, slotsUsed * minutes);
    }
  }
  return scheduled;
}
