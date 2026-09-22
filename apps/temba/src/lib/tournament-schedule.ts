import { tournamentMatchMinutes } from "~/lib/tournament-sizing";

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

export function schedulePoolMatches(input: {
  pools: readonly { poolIndex: number; gameTeamIds: readonly string[] }[];
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
  for (const pool of pools) {
    for (const pairing of circleMethodPairings(pool.gameTeamIds)) {
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
