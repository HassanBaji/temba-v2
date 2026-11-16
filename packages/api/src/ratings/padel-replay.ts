import { and, eq, gt, inArray, isNotNull, isNull, or } from "drizzle-orm";

import {
  gamePlayers,
  gameTeamPlayers,
  gameTeams,
  games,
  GroupSportEnum,
  kingPlaceAwards,
  levelOverrides,
  matches,
  ratingEvents,
  ratings,
  user,
  type DbTx,
} from "@repo/db";
import type { ClassicGlicko } from "@repo/domain/glicko2";
import { applyIdleInflation } from "@repo/domain/idle";
import {
  bandFromLevel,
  bandWithHysteresis,
  confirmedPhiForOverride,
  formatLevel,
  INITIAL_MU,
  INITIAL_PHI,
  INITIAL_SIGMA,
  initialRatingFromChoice,
  LEVEL_BANDS,
  levelFromMu,
  muFromBand,
  PADEL_DECLARED_START_PHI,
  padelMatchesRemainingToConfirm,
  proveItApplies,
  type LevelBand,
  type PadelConfirmation,
  type RatingGlickoState,
} from "@repo/domain/level";
import { displayLabelFromStoredBand } from "@repo/domain/level-bands";
import {
  rateDoublesMatch,
  type DoublesOutcome,
  type DoublesPlayerInput,
} from "@repo/domain/rate-doubles-match";
import {
  kingField,
  kingFieldPlayer,
  kingPlaceWins,
  rateKingPlace,
  type KingPlaceResult,
} from "@repo/domain/rate-king-place";

import { type db } from "#src/db";
import { displayedLevelPassesRange } from "#src/games/user-allowed-by-level-range";
import { withGuestStandIns } from "#src/ratings/guest-stand-ins";

type DbClient = typeof db;

/**
 * "declared-band": the Declared band rules (ADR-0096, ADR-0097). "baseline":
 * the rules before them, every start at φ 350 and no Prove-it rule, to tell
 * what today's formula does to old Matches from what the new rules do.
 */
export type PadelReplayRules = "declared-band" | "baseline";

type LedgerValues = {
  muBefore: number;
  phiBefore: number;
  sigmaBefore: number;
  muAfter: number;
  phiAfter: number;
  sigmaAfter: number;
};

export type ReplayRating = {
  userId: string;
  sport: string;
  mu: number;
  phi: number;
  sigma: number;
  levelBand: LevelBand;
  declaredBand: LevelBand | null;
  selfDeclaredAt: Date | null;
  lastRatedAt: Date | null;
  createdAt: Date;
};

export type ReplayEvent = LedgerValues & {
  id: string;
  userId: string;
  sport: string;
  matchId: string;
  outcomeScore: number;
  weight: number;
  levelBandBefore: LevelBand | null;
  lastRatedAtBefore: Date | null;
  reliabilityPart: number | null;
  proveItPart: number | null;
  reliabilityLossFactor: number | null;
  createdAt: Date;
};

export type ReplayOverride = LedgerValues & {
  id: string;
  userId: string;
  sport: string;
  levelBandBefore: LevelBand;
  levelBandAfter: LevelBand;
  createdAt: Date;
};

export type ReplayAward = LedgerValues & {
  id: string;
  userId: string;
  sport: string;
  gameId: string;
  finalPlace: number;
  wins: number;
  fieldMu: number;
  fieldPhi: number;
  levelBandBefore: LevelBand;
  lastRatedAtBefore: Date | null;
  createdAt: Date;
};

/** A Rated Match's two sides as its Game teams hold them now, and whether its Game is on a Group. */
export type ReplayMatch = {
  id: string;
  verified: boolean;
  slot1: string[] | null;
  slot2: string[] | null;
};

/** A King of the court Game's Game teams with a starting court, in the order the live writer reads them. */
export type ReplayKingGame = {
  id: string;
  teams: { finalPlace: number | null; userIds: string[] }[];
};

export type ReplayPlayer = { id: string; name: string; guest: boolean };

/** The padel ledger as it stands, the replay's only input. */
export type PadelLedger = {
  ratings: ReplayRating[];
  events: ReplayEvent[];
  overrides: ReplayOverride[];
  awards: ReplayAward[];
  matches: ReplayMatch[];
  kingGames: ReplayKingGame[];
  players: ReplayPlayer[];
};

export type ReplayedEvent = LedgerValues & {
  levelBandBefore: LevelBand;
  lastRatedAtBefore: Date | null;
  reliabilityPart: number | null;
  proveItPart: number | null;
  reliabilityLossFactor: number | null;
};

export type ReplayedOverride = {
  muBefore: number;
  phiBefore: number;
  sigmaBefore: number;
  levelBandBefore: LevelBand;
  phiAfter: number;
  sigmaAfter: number;
};

export type ReplayedAward = LedgerValues & {
  fieldMu: number;
  fieldPhi: number;
  levelBandBefore: LevelBand;
  lastRatedAtBefore: Date | null;
};

export type ReplayedRating = {
  mu: number;
  phi: number;
  sigma: number;
  levelBand: LevelBand;
  lastRatedAt: Date | null;
  declaredBand: LevelBand | null;
};

/**
 * How a player's starting Rating was read back. "declared": the start μ is a
 * band midpoint. "unknown": "I don't know", μ 1500. "unrecognised": declared,
 * but the start μ is no band midpoint [RQ-5]. "not-declared": nobody
 * declared, so the Rating starts at μ 1500 when something first moves it.
 */
export type ReplayStartKind =
  | "declared"
  | "unknown"
  | "unrecognised"
  | "not-declared";

export type ReplayStartSource =
  | "never-played"
  | "first-match"
  | "first-override"
  | "first-award";

export type ReplayStart = {
  kind: ReplayStartKind;
  source: ReplayStartSource;
  mu: number;
  declaredBand: LevelBand | null;
};

/**
 * The rule the replay applied where the ledger alone could not say:
 * "RQ-5" a declared start μ that is no band midpoint, "RQ-6" a seat with no
 * rating event played as a Guest player, "RQ-7" a row carried over by its
 * stored move, "rebuilt-from-scores" a decisive Match whose seats no longer
 * fit, "same-instant" units at one instant that share a player.
 */
export type ReplayRule =
  | "RQ-5"
  | "RQ-6"
  | "RQ-7"
  | "rebuilt-from-scores"
  | "same-instant"
  | "declared-band-mismatch"
  | "undeclared-start"
  | "ledger-without-rating";

export type ReplayAnomaly = {
  rule: ReplayRule;
  userIds: string[];
  detail: string;
};

export type PadelReplay = {
  rules: PadelReplayRules;
  ratings: Map<string, ReplayedRating>;
  events: Map<string, ReplayedEvent>;
  overrides: Map<string, ReplayedOverride>;
  awards: Map<string, ReplayedAward>;
  starts: Map<string, ReplayStart>;
  confirmations: Map<string, PadelConfirmation>;
  anomalies: ReplayAnomaly[];
};

type State = RatingGlickoState & { lastRatedAt: Date | null };

type Unit =
  | { kind: "match"; id: string; at: Date; events: ReplayEvent[] }
  | { kind: "override"; id: string; at: Date; override: ReplayOverride }
  | { kind: "awards"; id: string; at: Date; awards: ReplayAward[] };

const UNIT_ORDER: Record<Unit["kind"], number> = {
  match: 0,
  override: 1,
  awards: 2,
};

const STAND_IN_PREFIX = "stand-in:";
const PADEL = GroupSportEnum.PADEL;

const UNKNOWN_START = initialRatingFromChoice("unknown", "padel");

function compareUnits(left: Unit, right: Unit): number {
  return (
    left.at.getTime() - right.at.getTime() ||
    UNIT_ORDER[left.kind] - UNIT_ORDER[right.kind] ||
    (left.id < right.id ? -1 : left.id > right.id ? 1 : 0)
  );
}

function earliest(rows: readonly { createdAt: Date }[]): Date {
  return rows.reduce(
    (first, row) => (row.createdAt < first ? row.createdAt : first),
    rows[0]?.createdAt ?? new Date(0),
  );
}

function groupBy<T>(rows: readonly T[], key: (row: T) => string) {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const list = grouped.get(key(row));
    if (list) {
      list.push(row);
    } else {
      grouped.set(key(row), [row]);
    }
  }
  return grouped;
}

/** One time line: a Match, a Level override, a Game's Place awards; by instant, then kind, then id. */
function timeLine(ledger: PadelLedger): Unit[] {
  const units: Unit[] = [
    ...[...groupBy(ledger.events, (row) => row.matchId)].map(
      ([id, events]): Unit => ({
        kind: "match",
        id,
        at: earliest(events),
        events,
      }),
    ),
    ...ledger.overrides.map(
      (override): Unit => ({
        kind: "override",
        id: override.id,
        at: override.createdAt,
        override,
      }),
    ),
    ...[...groupBy(ledger.awards, (row) => row.gameId)].map(
      ([id, awards]): Unit => ({
        kind: "awards",
        id,
        at: earliest(awards),
        awards,
      }),
    ),
  ];
  return units.sort(compareUnits);
}

function unitRows(unit: Unit): { userId: string; muBefore: number }[] {
  switch (unit.kind) {
    case "match":
      return unit.events;
    case "override":
      return [unit.override];
    case "awards":
      return unit.awards;
  }
}

const SOURCE_OF_UNIT: Record<Unit["kind"], ReplayStartSource> = {
  match: "first-match",
  override: "first-override",
  awards: "first-award",
};

function bandAtMidpoint(mu: number): LevelBand | undefined {
  return LEVEL_BANDS.find((band) => muFromBand(band) === mu);
}

/**
 * Reads back what each player started from (spec 9.3): the earliest ledger
 * row's μ before, or the Rating's own μ when nothing has moved it. Idle
 * inflation never touches μ and a reversal deletes its event, so that μ is
 * the declared one.
 */
function recoverStarts(
  ledger: PadelLedger,
  units: readonly Unit[],
  anomalies: ReplayAnomaly[],
): Map<string, ReplayStart> {
  const first = new Map<string, { mu: number; source: ReplayStartSource }>();
  for (const unit of units) {
    for (const row of unitRows(unit)) {
      if (!first.has(row.userId)) {
        first.set(row.userId, {
          mu: row.muBefore,
          source: SOURCE_OF_UNIT[unit.kind],
        });
      }
    }
  }
  const ratingByUser = new Map(ledger.ratings.map((row) => [row.userId, row]));
  const userIds = new Set([...ratingByUser.keys(), ...first.keys()]);
  const starts = new Map<string, ReplayStart>();
  for (const userId of userIds) {
    const rating = ratingByUser.get(userId);
    const recorded = first.get(userId);
    const mu = recorded?.mu ?? rating?.mu ?? INITIAL_MU;
    const source = recorded?.source ?? "never-played";
    if (!rating?.selfDeclaredAt) {
      if (recorded && mu !== INITIAL_MU) {
        anomalies.push({
          rule: "undeclared-start",
          userIds: [userId],
          detail: `never declared, but the first ledger row starts at μ ${mu}; replayed from μ ${INITIAL_MU}`,
        });
      }
      starts.set(userId, {
        kind: "not-declared",
        source,
        mu,
        declaredBand: null,
      });
      continue;
    }
    const midpointBand = bandAtMidpoint(mu);
    const start: ReplayStart =
      mu === INITIAL_MU
        ? { kind: "unknown", source, mu, declaredBand: null }
        : midpointBand
          ? { kind: "declared", source, mu, declaredBand: midpointBand }
          : {
              kind: "unrecognised",
              source,
              mu,
              declaredBand: bandFromLevel(levelFromMu(mu)),
            };
    if (start.kind === "unrecognised") {
      anomalies.push({
        rule: "RQ-5",
        userIds: [userId],
        detail: `declared start μ ${mu} is no band midpoint; kept, with Declared band ${start.declaredBand}`,
      });
    }
    if (rating.declaredBand && rating.declaredBand !== start.declaredBand) {
      anomalies.push({
        rule: "declared-band-mismatch",
        userIds: [userId],
        detail: `stored Declared band ${rating.declaredBand}, recovered ${start.declaredBand ?? "none"} from μ ${mu}`,
      });
    }
    starts.set(userId, start);
  }
  return starts;
}

function startState(
  start: ReplayStart,
  rules: PadelReplayRules,
): RatingGlickoState {
  const band = start.declaredBand;
  if (!band) {
    return UNKNOWN_START;
  }
  const declared =
    start.kind === "declared"
      ? initialRatingFromChoice(band, "padel")
      : {
          mu: start.mu,
          phi: PADEL_DECLARED_START_PHI[band],
          sigma: INITIAL_SIGMA,
          levelBand: band,
        };
  return rules === "baseline" ? { ...declared, phi: INITIAL_PHI } : declared;
}

function glickoOf(state: State): RatingGlickoState {
  return {
    mu: state.mu,
    phi: state.phi,
    sigma: state.sigma,
    levelBand: state.levelBand,
  };
}

/**
 * The Reliability loss factor a Match read for the player: stored since the
 * Prove-it rule (ADR-0097), derived once from `reliability_part` before it.
 */
export function replayLossFactor(event: ReplayEvent): number {
  if (event.reliabilityLossFactor != null) {
    return event.reliabilityLossFactor;
  }
  if (event.reliabilityPart == null) {
    return 1;
  }
  const derived =
    1 +
    event.reliabilityPart /
      (event.muAfter - event.muBefore - event.reliabilityPart);
  return Number.isFinite(derived) ? derived : 1;
}

function nullWhenZero(value: number): number | null {
  return value === 0 ? null : value;
}

function carriedMove(before: ClassicGlicko, row: LedgerValues): ClassicGlicko {
  return {
    mu: before.mu + (row.muAfter - row.muBefore),
    phi: before.phi * (row.phiAfter / row.phiBefore),
    sigma: before.sigma * (row.sigmaAfter / row.sigmaBefore),
  };
}

type Seats = {
  slot1: [string, string];
  slot2: [string, string];
  outcome: DoublesOutcome;
  standIns: Set<string>;
};

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

/**
 * The sides from the Match's two Game teams, when they still fit its events:
 * every rated User on one side, partners sharing one outcome score.
 */
function seatsFromTeams(
  match: ReplayMatch | undefined,
  events: readonly ReplayEvent[],
): Omit<Seats, "standIns"> | null {
  const slot1 = twoDistinct(match?.slot1 ?? null);
  const slot2 = twoDistinct(match?.slot2 ?? null);
  if (!slot1 || !slot2 || new Set([...slot1, ...slot2]).size !== 4) {
    return null;
  }
  const scoreOf = (side: readonly string[]) => {
    const scores = new Set(
      events
        .filter((event) => side.includes(event.userId))
        .map((event) => event.outcomeScore),
    );
    return scores.size > 1 ? Number.NaN : [...scores][0];
  };
  if (
    events.some(
      (event) => !slot1.includes(event.userId) && !slot2.includes(event.userId),
    )
  ) {
    return null;
  }
  const score1 = scoreOf(slot1);
  const score2 = scoreOf(slot2);
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
function seatsFromScores(
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

/**
 * Replays the padel ledger under one rule set (spec 9.4): one walk over every
 * Rated Match, Level override and Game's Place awards, in order, through the
 * same domain functions the live writers call, so a history the live writers
 * wrote under these rules replays to exactly what they stored. Pure: reads
 * only `ledger`, and refuses a football row.
 */
export function replayPadelLedger(
  ledger: PadelLedger,
  rules: PadelReplayRules,
): PadelReplay {
  for (const row of [
    ...ledger.ratings,
    ...ledger.events,
    ...ledger.overrides,
    ...ledger.awards,
  ]) {
    if (row.sport !== "padel") {
      throw new Error(`The padel replay refuses a ${row.sport} row`);
    }
  }

  const anomalies: ReplayAnomaly[] = [];
  const units = timeLine(ledger);
  const starts = recoverStarts(ledger, units, anomalies);
  const ratingByUser = new Map(ledger.ratings.map((row) => [row.userId, row]));
  const matchById = new Map(ledger.matches.map((row) => [row.id, row]));
  const kingGameById = new Map(ledger.kingGames.map((row) => [row.id, row]));
  const guestIds = new Set(
    ledger.players.filter((player) => player.guest).map((player) => player.id),
  );

  const states = new Map<string, State>();
  const confirmations = new Map<string, PadelConfirmation>();
  const events = new Map<string, ReplayedEvent>();
  const overrides = new Map<string, ReplayedOverride>();
  const awards = new Map<string, ReplayedAward>();

  const confirmationOf = (userId: string): PadelConfirmation =>
    confirmations.get(userId) ?? { verifiedMatches: 0, overridden: false };

  /** The Rating a live writer would have read at `at`: none until it was declared or first moved. */
  const stateAt = (userId: string, at: Date): State => {
    const replayed = states.get(userId);
    if (replayed) {
      return replayed;
    }
    const start = starts.get(userId);
    const rating = ratingByUser.get(userId);
    if (
      start &&
      rating?.selfDeclaredAt &&
      start.kind !== "not-declared" &&
      rating.selfDeclaredAt <= at
    ) {
      return { ...startState(start, rules), lastRatedAt: null };
    }
    return { ...UNKNOWN_START, lastRatedAt: null };
  };

  const inputOf = (userId: string, at: Date): DoublesPlayerInput => {
    const state = stateAt(userId, at);
    return { state: glickoOf(state), lastRatedAt: state.lastRatedAt };
  };

  const countMatch = (userId: string, verified: boolean) => {
    const confirmation = confirmationOf(userId);
    confirmations.set(userId, {
      ...confirmation,
      verifiedMatches: confirmation.verifiedMatches + (verified ? 1 : 0),
    });
  };

  const carryOverEvent = (event: ReplayEvent, at: Date, verified: boolean) => {
    const state = stateAt(event.userId, at);
    const before = applyIdleInflation(state, state.lastRatedAt, at);
    const after = carriedMove(before, event);
    const factor = replayLossFactor(event);
    events.set(event.id, {
      muBefore: before.mu,
      phiBefore: before.phi,
      sigmaBefore: before.sigma,
      muAfter: after.mu,
      phiAfter: after.phi,
      sigmaAfter: after.sigma,
      levelBandBefore: state.levelBand,
      lastRatedAtBefore: state.lastRatedAt,
      reliabilityPart: event.reliabilityPart,
      proveItPart: event.proveItPart,
      reliabilityLossFactor: factor === 1 ? null : factor,
    });
    states.set(event.userId, {
      ...after,
      levelBand: bandWithHysteresis(levelFromMu(after.mu), state.levelBand),
      lastRatedAt: at,
    });
    countMatch(event.userId, verified);
  };

  const replayMatch = (unit: Extract<Unit, { kind: "match" }>) => {
    const { at } = unit;
    const match = matchById.get(unit.id);
    const verified = match?.verified ?? false;
    const eventByUser = new Map(unit.events.map((row) => [row.userId, row]));
    const fromTeams = seatsFromTeams(match, unit.events);
    let seats: Seats | null = null;
    if (fromTeams) {
      const missing = [...fromTeams.slot1, ...fromTeams.slot2].filter(
        (userId) => !eventByUser.has(userId),
      );
      const merged = missing.filter((userId) => !guestIds.has(userId));
      if (merged.length > 0) {
        anomalies.push({
          rule: "RQ-6",
          userIds: merged,
          detail: `Match ${unit.id}: a seat with no rating event plays as a Guest player`,
        });
      }
      seats = { ...fromTeams, standIns: new Set(missing) };
    } else {
      seats = seatsFromScores(unit.id, unit.events);
      if (seats) {
        anomalies.push({
          rule: "rebuilt-from-scores",
          userIds: unit.events.map((row) => row.userId),
          detail: `Match ${unit.id}: the seats no longer fit its events; rebuilt with the winners together`,
        });
      }
    }
    if (!seats) {
      anomalies.push({
        rule: "RQ-7",
        userIds: unit.events.map((row) => row.userId),
        detail: `Match ${unit.id}: drawn or unplaceable, carried over by its stored moves`,
      });
      for (const event of unit.events) {
        carryOverEvent(event, at, verified);
      }
      return;
    }

    const { slot1, slot2, outcome, standIns } = seats;
    const playerInput = withGuestStandIns(
      [...slot1, ...slot2],
      standIns,
      (userId) => {
        const event = eventByUser.get(userId);
        return {
          ...inputOf(userId, at),
          lossFactor: event ? replayLossFactor(event) : 1,
          proveIt:
            rules === "declared-band" &&
            proveItApplies(
              starts.get(userId)?.declaredBand,
              confirmationOf(userId),
            ),
        };
      },
    );
    const weight = unit.events[0]?.weight ?? 1;
    const rated = rateDoublesMatch({
      slot1: [playerInput(slot1[0]), playerInput(slot1[1])],
      slot2: [playerInput(slot2[0]), playerInput(slot2[1])],
      outcome,
      weight,
      now: at,
    });
    const results = [
      [slot1[0], rated.slot1[0]],
      [slot1[1], rated.slot1[1]],
      [slot2[0], rated.slot2[0]],
      [slot2[1], rated.slot2[1]],
    ] as const;
    for (const [userId, result] of results) {
      const event = eventByUser.get(userId);
      if (!event) {
        continue;
      }
      const input = playerInput(userId);
      const factor = replayLossFactor(event);
      events.set(event.id, {
        muBefore: result.before.mu,
        phiBefore: result.before.phi,
        sigmaBefore: result.before.sigma,
        muAfter: result.after.mu,
        phiAfter: result.after.phi,
        sigmaAfter: result.after.sigma,
        levelBandBefore: input.state.levelBand,
        lastRatedAtBefore: input.lastRatedAt ?? null,
        reliabilityPart: nullWhenZero(result.reliabilityPart),
        proveItPart: nullWhenZero(result.proveItPart),
        reliabilityLossFactor: factor === 1 ? null : factor,
      });
      states.set(userId, {
        ...result.after,
        levelBand: result.levelBand,
        lastRatedAt: at,
      });
      countMatch(userId, verified);
    }
  };

  const replayOverride = (override: ReplayOverride) => {
    const state = stateAt(override.userId, override.createdAt);
    const phiAfter = confirmedPhiForOverride(state.phi);
    overrides.set(override.id, {
      muBefore: state.mu,
      phiBefore: state.phi,
      sigmaBefore: state.sigma,
      levelBandBefore: state.levelBand,
      phiAfter,
      sigmaAfter: state.sigma,
    });
    states.set(override.userId, {
      mu: override.muAfter,
      phi: phiAfter,
      sigma: state.sigma,
      levelBand: override.levelBandAfter,
      lastRatedAt: state.lastRatedAt,
    });
    confirmations.set(override.userId, {
      ...confirmationOf(override.userId),
      overridden: true,
    });
  };

  /** A Game's Place awards, every one read from the Ratings as they stood before the Game's awards. */
  const replayAwards = (unit: Extract<Unit, { kind: "awards" }>) => {
    const { at } = unit;
    const teams = kingGameById.get(unit.id)?.teams ?? [];
    const fieldUserIds = [
      ...new Set(teams.flatMap((team) => team.userIds)),
    ].filter((userId) => !guestIds.has(userId));
    const field = kingField(
      fieldUserIds.map((userId) => inputOf(userId, at)),
      at,
    );
    const placed = new Map<
      string,
      KingPlaceResult & { wins: number; finalPlace: number }
    >();
    for (const team of field ? teams : []) {
      const wins = kingPlaceWins(team.finalPlace);
      const [first, second] = team.userIds.filter(
        (userId) => !guestIds.has(userId),
      );
      if (!field || wins === 0 || team.finalPlace == null || !first) {
        continue;
      }
      const partner = second
        ? inputOf(second, at)
        : team.userIds.length > 1
          ? kingFieldPlayer(field)
          : inputOf(first, at);
      const [firstResult, secondResult] = rateKingPlace({
        pair: [inputOf(first, at), partner],
        field,
        wins,
        now: at,
      });
      placed.set(first, { ...firstResult, wins, finalPlace: team.finalPlace });
      if (second) {
        placed.set(second, {
          ...secondResult,
          wins,
          finalPlace: team.finalPlace,
        });
      }
    }

    const next = new Map<string, State>();
    for (const award of unit.awards) {
      const state = stateAt(award.userId, at);
      const result = placed.get(award.userId);
      const recomputed =
        field &&
        result?.wins === award.wins &&
        result.finalPlace === award.finalPlace
          ? result
          : null;
      if (!recomputed) {
        anomalies.push({
          rule: "RQ-7",
          userIds: [award.userId],
          detail: `Place award ${award.id} on Game ${unit.id}: the Game teams no longer place this player; carried over by its stored move`,
        });
      }
      const after = recomputed?.after ?? carriedMove(state, award);
      awards.set(award.id, {
        fieldMu: recomputed && field ? field.mu : award.fieldMu,
        fieldPhi: recomputed && field ? field.phi : award.fieldPhi,
        muBefore: state.mu,
        phiBefore: state.phi,
        sigmaBefore: state.sigma,
        muAfter: after.mu,
        phiAfter: after.phi,
        sigmaAfter: after.sigma,
        levelBandBefore: state.levelBand,
        lastRatedAtBefore: state.lastRatedAt,
      });
      next.set(award.userId, {
        ...after,
        levelBand:
          recomputed?.levelBand ??
          bandWithHysteresis(levelFromMu(after.mu), state.levelBand),
        lastRatedAt: at,
      });
    }
    for (const [userId, state] of next) {
      states.set(userId, state);
    }
  };

  for (const unit of units) {
    switch (unit.kind) {
      case "match":
        replayMatch(unit);
        break;
      case "override":
        replayOverride(unit.override);
        break;
      case "awards":
        replayAwards(unit);
        break;
    }
  }

  anomalies.push(...sameInstantAnomalies(units, matchById, kingGameById));

  const replayedRatings = new Map<string, ReplayedRating>();
  for (const rating of ledger.ratings) {
    const start = starts.get(rating.userId);
    const replayed = states.get(rating.userId);
    const state: State =
      replayed ??
      (start && start.kind !== "not-declared"
        ? { ...startState(start, rules), lastRatedAt: null }
        : rating);
    replayedRatings.set(rating.userId, {
      mu: state.mu,
      phi: state.phi,
      sigma: state.sigma,
      levelBand: state.levelBand,
      lastRatedAt: state.lastRatedAt,
      declaredBand: start?.declaredBand ?? null,
    });
  }
  const withoutRating = [...states.keys()].filter(
    (userId) => !ratingByUser.has(userId),
  );
  if (withoutRating.length > 0) {
    anomalies.push({
      rule: "ledger-without-rating",
      userIds: withoutRating,
      detail:
        "ledger rows whose player has no padel Rating; replayed as opponents only",
    });
  }

  return {
    rules,
    ratings: replayedRatings,
    events,
    overrides,
    awards,
    starts,
    confirmations,
    anomalies,
  };
}

function sameInstantAnomalies(
  units: readonly Unit[],
  matchById: ReadonlyMap<string, ReplayMatch>,
  kingGameById: ReadonlyMap<string, ReplayKingGame>,
): ReplayAnomaly[] {
  const participants = (unit: Unit): string[] => {
    switch (unit.kind) {
      case "match": {
        const match = matchById.get(unit.id);
        return [
          ...unit.events.map((row) => row.userId),
          ...(match?.slot1 ?? []),
          ...(match?.slot2 ?? []),
        ];
      }
      case "override":
        return [unit.override.userId];
      case "awards":
        return [
          ...unit.awards.map((row) => row.userId),
          ...(kingGameById
            .get(unit.id)
            ?.teams.flatMap((team) => team.userIds) ?? []),
        ];
    }
  };
  const anomalies: ReplayAnomaly[] = [];
  for (const sameAt of groupBy(units, (unit) =>
    String(unit.at.getTime()),
  ).values()) {
    if (sameAt.length < 2) {
      continue;
    }
    const seen = new Map<string, number>();
    for (const unit of sameAt) {
      for (const userId of new Set(participants(unit))) {
        seen.set(userId, (seen.get(userId) ?? 0) + 1);
      }
    }
    const shared = [...seen].filter(([, count]) => count > 1).map(([id]) => id);
    if (shared.length > 0) {
      anomalies.push({
        rule: "same-instant",
        userIds: shared,
        detail: `${sameAt.length} units at ${sameAt[0]?.at.toISOString()} share a player: ${sameAt.map((unit) => `${unit.kind} ${unit.id}`).join(", ")}`,
      });
    }
  }
  return anomalies;
}

export type ReplayDifference = {
  table: "ratings" | "rating_events" | "king_place_awards" | "level_overrides";
  rowId: string;
  columns: string[];
};

function sameValue(left: unknown, right: unknown): boolean {
  if (left instanceof Date || right instanceof Date) {
    return (
      left instanceof Date &&
      right instanceof Date &&
      left.getTime() === right.getTime()
    );
  }
  return left === right;
}

function differingColumns<T extends object>(
  stored: T,
  replayed: Partial<T>,
): string[] {
  return (Object.keys(replayed) as (keyof T)[])
    .filter((column) => !sameValue(stored[column], replayed[column]))
    .map(String);
}

/** Every stored row whose replayed values differ, bit for bit, with the columns that do. */
export function padelReplayDifferences(
  ledger: PadelLedger,
  replay: PadelReplay,
): ReplayDifference[] {
  const differences: ReplayDifference[] = [];
  const check = <T extends object>(
    table: ReplayDifference["table"],
    rowId: string,
    stored: T,
    replayed: Partial<T> | undefined,
  ) => {
    const columns = replayed
      ? differingColumns(stored, replayed)
      : ["(not replayed)"];
    if (columns.length > 0) {
      differences.push({ table, rowId, columns });
    }
  };
  for (const rating of ledger.ratings) {
    check("ratings", rating.userId, rating, replay.ratings.get(rating.userId));
  }
  for (const event of ledger.events) {
    check("rating_events", event.id, event, replay.events.get(event.id));
  }
  for (const award of ledger.awards) {
    check("king_place_awards", award.id, award, replay.awards.get(award.id));
  }
  for (const override of ledger.overrides) {
    check(
      "level_overrides",
      override.id,
      override,
      replay.overrides.get(override.id),
    );
  }
  return differences;
}

export type UpcomingLevelRangeSeat = {
  gameId: string;
  userId: string;
  levelMinTenths: number | null;
  levelMaxTenths: number | null;
};

/**
 * Reads the padel ledger: every padel Rating, rating event, Level override
 * and Place award, each event's Match with its Game teams, each Place award's
 * Game teams, and the players they seat. Never reads a football row.
 */
export async function loadPadelLedger(tx: DbTx): Promise<PadelLedger> {
  const padelMatchIds = tx
    .selectDistinct({ id: ratingEvents.matchId })
    .from(ratingEvents)
    .where(eq(ratingEvents.sport, PADEL));
  const matchGameIds = tx
    .selectDistinct({ id: matches.gameId })
    .from(matches)
    .where(inArray(matches.id, padelMatchIds));
  const kingGameIds = tx
    .selectDistinct({ id: kingPlaceAwards.gameId })
    .from(kingPlaceAwards)
    .where(eq(kingPlaceAwards.sport, PADEL));

  const [
    ratingRows,
    eventRows,
    overrideRows,
    awardRows,
    matchRows,
    slotLinks,
    kingTeams,
    playerRows,
  ] = await Promise.all([
    tx
      .select({
        userId: ratings.userId,
        sport: ratings.sport,
        mu: ratings.mu,
        phi: ratings.phi,
        sigma: ratings.sigma,
        levelBand: ratings.levelBand,
        declaredBand: ratings.declaredBand,
        selfDeclaredAt: ratings.selfDeclaredAt,
        lastRatedAt: ratings.lastRatedAt,
        createdAt: ratings.createdAt,
      })
      .from(ratings)
      .where(eq(ratings.sport, PADEL)),
    tx
      .select({
        id: ratingEvents.id,
        userId: ratingEvents.userId,
        sport: ratingEvents.sport,
        matchId: ratingEvents.matchId,
        outcomeScore: ratingEvents.outcomeScore,
        weight: ratingEvents.weight,
        muBefore: ratingEvents.muBefore,
        phiBefore: ratingEvents.phiBefore,
        sigmaBefore: ratingEvents.sigmaBefore,
        muAfter: ratingEvents.muAfter,
        phiAfter: ratingEvents.phiAfter,
        sigmaAfter: ratingEvents.sigmaAfter,
        levelBandBefore: ratingEvents.levelBandBefore,
        lastRatedAtBefore: ratingEvents.lastRatedAtBefore,
        reliabilityPart: ratingEvents.reliabilityPart,
        proveItPart: ratingEvents.proveItPart,
        reliabilityLossFactor: ratingEvents.reliabilityLossFactor,
        createdAt: ratingEvents.createdAt,
      })
      .from(ratingEvents)
      .where(eq(ratingEvents.sport, PADEL)),
    tx
      .select({
        id: levelOverrides.id,
        userId: levelOverrides.userId,
        sport: levelOverrides.sport,
        muBefore: levelOverrides.muBefore,
        phiBefore: levelOverrides.phiBefore,
        sigmaBefore: levelOverrides.sigmaBefore,
        levelBandBefore: levelOverrides.levelBandBefore,
        muAfter: levelOverrides.muAfter,
        phiAfter: levelOverrides.phiAfter,
        sigmaAfter: levelOverrides.sigmaAfter,
        levelBandAfter: levelOverrides.levelBandAfter,
        createdAt: levelOverrides.createdAt,
      })
      .from(levelOverrides)
      .where(eq(levelOverrides.sport, PADEL)),
    tx
      .select({
        id: kingPlaceAwards.id,
        userId: kingPlaceAwards.userId,
        sport: kingPlaceAwards.sport,
        gameId: kingPlaceAwards.gameId,
        finalPlace: kingPlaceAwards.finalPlace,
        wins: kingPlaceAwards.wins,
        fieldMu: kingPlaceAwards.fieldMu,
        fieldPhi: kingPlaceAwards.fieldPhi,
        muBefore: kingPlaceAwards.muBefore,
        phiBefore: kingPlaceAwards.phiBefore,
        sigmaBefore: kingPlaceAwards.sigmaBefore,
        muAfter: kingPlaceAwards.muAfter,
        phiAfter: kingPlaceAwards.phiAfter,
        sigmaAfter: kingPlaceAwards.sigmaAfter,
        levelBandBefore: kingPlaceAwards.levelBandBefore,
        lastRatedAtBefore: kingPlaceAwards.lastRatedAtBefore,
        createdAt: kingPlaceAwards.createdAt,
      })
      .from(kingPlaceAwards)
      .where(eq(kingPlaceAwards.sport, PADEL)),
    tx
      .select({
        id: matches.id,
        groupId: games.groupId,
        slot1GameTeamId: matches.slot1GameTeamId,
        slot2GameTeamId: matches.slot2GameTeamId,
      })
      .from(matches)
      .innerJoin(games, eq(games.id, matches.gameId))
      .where(inArray(matches.id, padelMatchIds)),
    // The same read as `applyRatedMatch`'s, so each side's players come back
    // in the order the live writer saw them.
    tx.query.gameTeamPlayers.findMany({
      where: inArray(
        gameTeamPlayers.gameTeamId,
        tx
          .select({ id: gameTeams.id })
          .from(gameTeams)
          .where(inArray(gameTeams.gameId, matchGameIds)),
      ),
      columns: { gameTeamId: true },
      with: { gamePlayer: { columns: { userId: true } } },
    }),
    // The same read as `applyKingPlaceAwards`'s, for the same reason.
    tx.query.gameTeams.findMany({
      where: inArray(gameTeams.gameId, kingGameIds),
      columns: { gameId: true, startCourt: true, finalPlace: true },
      with: {
        players: { with: { gamePlayer: { columns: { userId: true } } } },
      },
    }),
    tx
      .select({ id: user.id, name: user.name, guestAt: user.guestAt })
      .from(user)
      .where(
        or(
          inArray(
            user.id,
            tx
              .select({ id: ratings.userId })
              .from(ratings)
              .where(eq(ratings.sport, PADEL)),
          ),
          inArray(
            user.id,
            tx
              .select({ id: gamePlayers.userId })
              .from(gamePlayers)
              .where(
                or(
                  inArray(gamePlayers.gameId, matchGameIds),
                  inArray(gamePlayers.gameId, kingGameIds),
                ),
              ),
          ),
        ),
      ),
  ]);

  const usersByTeam = new Map<string, string[]>();
  for (const link of slotLinks) {
    const userId = link.gamePlayer.userId;
    if (!userId) {
      continue;
    }
    usersByTeam.set(link.gameTeamId, [
      ...(usersByTeam.get(link.gameTeamId) ?? []),
      userId,
    ]);
  }
  const teamsByGame = new Map<string, ReplayKingGame["teams"]>();
  for (const team of kingTeams) {
    if (team.startCourt == null) {
      continue;
    }
    teamsByGame.set(team.gameId, [
      ...(teamsByGame.get(team.gameId) ?? []),
      {
        finalPlace: team.finalPlace,
        userIds: [
          ...new Set(
            team.players.flatMap((link) => link.gamePlayer.userId ?? []),
          ),
        ],
      },
    ]);
  }

  return {
    ratings: ratingRows,
    events: eventRows,
    overrides: overrideRows,
    awards: awardRows,
    matches: matchRows.map((row) => ({
      id: row.id,
      verified: row.groupId != null,
      slot1: row.slot1GameTeamId
        ? (usersByTeam.get(row.slot1GameTeamId) ?? [])
        : null,
      slot2: row.slot2GameTeamId
        ? (usersByTeam.get(row.slot2GameTeamId) ?? [])
        : null,
    })),
    kingGames: [...teamsByGame].map(([id, teams]) => ({ id, teams })),
    players: playerRows.map((row) => ({
      id: row.id,
      name: row.name,
      guest: row.guestAt != null,
    })),
  };
}

/** Every player seated on an upcoming padel Game that has a Game Level range. */
async function loadUpcomingLevelRangeSeats(
  tx: DbTx,
  now: Date,
): Promise<UpcomingLevelRangeSeat[]> {
  const rows = await tx
    .select({
      gameId: games.id,
      userId: gamePlayers.userId,
      levelMinTenths: games.levelMinTenths,
      levelMaxTenths: games.levelMaxTenths,
    })
    .from(games)
    .innerJoin(gamePlayers, eq(gamePlayers.gameId, games.id))
    .where(
      and(
        eq(games.sport, PADEL),
        isNull(games.cancelledAt),
        gt(games.windowStart, now),
        isNotNull(gamePlayers.userId),
        or(isNotNull(games.levelMinTenths), isNotNull(games.levelMaxTenths)),
      ),
    );
  return rows.flatMap((row) =>
    row.userId ? [{ ...row, userId: row.userId }] : [],
  );
}

export type PadelReplayPlayerRow = {
  userId: string;
  name: string;
  start: ReplayStartKind;
  startSource: ReplayStartSource;
  declaredBand: LevelBand | null;
  levelBefore: number;
  levelAfter: number;
  move: number;
  bandBefore: LevelBand;
  bandAfter: LevelBand;
  phiBefore: number;
  phiAfter: number;
  verifiedMatchesBefore: number;
  verifiedMatchesAfter: number;
  confirmedBefore: boolean;
  confirmedAfter: boolean;
};

export type PadelReplayReport = {
  host: string;
  counts: {
    players: number;
    matches: number;
    events: number;
    overrides: number;
    awards: number;
  };
  starts: Record<ReplayStartKind, Record<ReplayStartSource, number>>;
  rows: PadelReplayPlayerRow[];
  moved: number;
  largestUp: PadelReplayPlayerRow[];
  largestDown: PadelReplayPlayerRow[];
  bandChanges: PadelReplayPlayerRow[];
  confirmationChanges: PadelReplayPlayerRow[];
  outsideLevelRange: (UpcomingLevelRangeSeat & {
    name: string;
    levelBefore: number;
    levelAfter: number;
    wasOutside: boolean;
  })[];
  differences: Record<ReplayDifference["table"], number>;
  baseline: { events: number; reproduced: number; withinTolerance: number };
  anomalies: ReplayAnomaly[];
  loadMs: number;
  computeMs: number;
  /** True when the run must fail: someone's confirmation would change. */
  failed: boolean;
};

const LARGEST_MOVES = 20;
const MOVE_REPORTED = 0.01;
const MOVE_ROUNDING = 1e-9;
const BASELINE_TOLERANCE = 1e-6;
const SIX_VALUES = [
  "muBefore",
  "phiBefore",
  "sigmaBefore",
  "muAfter",
  "phiAfter",
  "sigmaAfter",
] as const;

function storedConfirmations(
  ledger: PadelLedger,
): Map<string, PadelConfirmation> {
  const verifiedMatchIds = new Set(
    ledger.matches.filter((row) => row.verified).map((row) => row.id),
  );
  const confirmations = new Map<string, PadelConfirmation>();
  const of = (userId: string) =>
    confirmations.get(userId) ?? { verifiedMatches: 0, overridden: false };
  for (const event of ledger.events) {
    const confirmation = of(event.userId);
    confirmations.set(event.userId, {
      ...confirmation,
      verifiedMatches:
        confirmation.verifiedMatches +
        (verifiedMatchIds.has(event.matchId) ? 1 : 0),
    });
  }
  for (const override of ledger.overrides) {
    confirmations.set(override.userId, {
      ...of(override.userId),
      overridden: true,
    });
  }
  return confirmations;
}

function baselineReproduction(ledger: PadelLedger, baseline: PadelReplay) {
  let reproduced = 0;
  let withinTolerance = 0;
  for (const event of ledger.events) {
    const replayed = baseline.events.get(event.id);
    if (!replayed) {
      continue;
    }
    if (SIX_VALUES.every((column) => event[column] === replayed[column])) {
      reproduced += 1;
    }
    if (
      SIX_VALUES.every(
        (column) =>
          Math.abs(event[column] - replayed[column]) <= BASELINE_TOLERANCE,
      )
    ) {
      withinTolerance += 1;
    }
  }
  return { events: ledger.events.length, reproduced, withinTolerance };
}

function emptyStarts(): PadelReplayReport["starts"] {
  const sources = (): Record<ReplayStartSource, number> => ({
    "never-played": 0,
    "first-match": 0,
    "first-override": 0,
    "first-award": 0,
  });
  return {
    declared: sources(),
    unknown: sources(),
    unrecognised: sources(),
    "not-declared": sources(),
  };
}

function displayedTenths(mu: number): number {
  return Math.round(Number(formatLevel(levelFromMu(mu))) * 10);
}

/** The dry-run report (spec 9.8) from the ledger and both passes over it. */
export function buildPadelReplayReport(args: {
  host: string;
  ledger: PadelLedger;
  replay: PadelReplay;
  baseline: PadelReplay;
  upcoming: readonly UpcomingLevelRangeSeat[];
  loadMs: number;
  computeMs: number;
}): PadelReplayReport {
  const { ledger, replay } = args;
  const nameOf = new Map(ledger.players.map((row) => [row.id, row.name]));
  const before = storedConfirmations(ledger);
  const unconfirmed = { verifiedMatches: 0, overridden: false };
  const starts = emptyStarts();

  const rows: PadelReplayPlayerRow[] = ledger.ratings.map((rating) => {
    const after = replay.ratings.get(rating.userId) ?? rating;
    const start = replay.starts.get(rating.userId) ?? {
      kind: "not-declared" as const,
      source: "never-played" as const,
      mu: rating.mu,
      declaredBand: null,
    };
    starts[start.kind][start.source] += 1;
    const confirmationBefore = before.get(rating.userId) ?? unconfirmed;
    const confirmationAfter =
      replay.confirmations.get(rating.userId) ?? unconfirmed;
    const levelBefore = levelFromMu(rating.mu);
    const levelAfter = levelFromMu(after.mu);
    return {
      userId: rating.userId,
      name: nameOf.get(rating.userId) ?? "",
      start: start.kind,
      startSource: start.source,
      declaredBand: start.declaredBand,
      levelBefore,
      levelAfter,
      move: levelAfter - levelBefore,
      bandBefore: rating.levelBand,
      bandAfter: after.levelBand,
      phiBefore: rating.phi,
      phiAfter: after.phi,
      verifiedMatchesBefore: confirmationBefore.verifiedMatches,
      verifiedMatchesAfter: confirmationAfter.verifiedMatches,
      confirmedBefore: padelMatchesRemainingToConfirm(confirmationBefore) === 0,
      confirmedAfter: padelMatchesRemainingToConfirm(confirmationAfter) === 0,
    };
  });

  const byMove = [...rows].sort((left, right) => right.move - left.move);
  const confirmationChanges = rows.filter(
    (row) =>
      row.confirmedBefore !== row.confirmedAfter ||
      row.verifiedMatchesBefore !== row.verifiedMatchesAfter,
  );
  const rowByUser = new Map(rows.map((row) => [row.userId, row]));
  const storedMuOf = new Map(
    ledger.ratings.map((rating) => [rating.userId, rating.mu]),
  );
  const outsideLevelRange = args.upcoming.flatMap((seat) => {
    const row = rowByUser.get(seat.userId);
    if (!row) {
      return [];
    }
    const passes = (mu: number) =>
      displayedLevelPassesRange(displayedTenths(mu), seat);
    const storedMu = storedMuOf.get(seat.userId);
    const replayedMu = replay.ratings.get(seat.userId)?.mu;
    if (
      storedMu === undefined ||
      replayedMu === undefined ||
      passes(replayedMu)
    ) {
      return [];
    }
    return [
      {
        ...seat,
        name: row.name,
        levelBefore: row.levelBefore,
        levelAfter: row.levelAfter,
        wasOutside: !passes(storedMu),
      },
    ];
  });

  const differences: PadelReplayReport["differences"] = {
    ratings: 0,
    rating_events: 0,
    king_place_awards: 0,
    level_overrides: 0,
  };
  for (const difference of padelReplayDifferences(ledger, replay)) {
    differences[difference.table] += 1;
  }

  return {
    host: args.host,
    counts: {
      players: ledger.ratings.length,
      matches: new Set(ledger.events.map((row) => row.matchId)).size,
      events: ledger.events.length,
      overrides: ledger.overrides.length,
      awards: ledger.awards.length,
    },
    starts,
    rows,
    moved: rows.filter(
      (row) => Math.abs(row.move) >= MOVE_REPORTED - MOVE_ROUNDING,
    ).length,
    largestUp: byMove.filter((row) => row.move > 0).slice(0, LARGEST_MOVES),
    largestDown: byMove
      .filter((row) => row.move < 0)
      .reverse()
      .slice(0, LARGEST_MOVES),
    bandChanges: rows.filter(
      (row) =>
        displayLabelFromStoredBand(row.bandBefore) !==
        displayLabelFromStoredBand(row.bandAfter),
    ),
    confirmationChanges,
    outsideLevelRange,
    differences,
    baseline: baselineReproduction(ledger, args.baseline),
    anomalies: replay.anomalies,
    loadMs: args.loadMs,
    computeMs: args.computeMs,
    failed: confirmationChanges.length > 0,
  };
}

function signed(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
}

function playerLabel(row: { name: string; userId: string }): string {
  return row.name ? `${row.name} (${row.userId})` : row.userId;
}

function moveLine(row: PadelReplayPlayerRow): string {
  return `  ${signed(row.move)}  ${playerLabel(row)}: ${row.levelBefore.toFixed(2)} ${displayLabelFromStoredBand(row.bandBefore)} φ ${row.phiBefore.toFixed(0)} → ${row.levelAfter.toFixed(2)} ${displayLabelFromStoredBand(row.bandAfter)} φ ${row.phiAfter.toFixed(0)}`;
}

/** The report as the command prints it. */
export function formatPadelReplayReport(report: PadelReplayReport): string[] {
  const names = new Map(report.rows.map((row) => [row.userId, row.name]));
  const userLabel = (userId: string) =>
    playerLabel({ userId, name: names.get(userId) ?? "" });
  const { counts, starts } = report;
  const sourceLine = (kind: ReplayStartKind) =>
    `never played ${starts[kind]["never-played"]}, first Match ${starts[kind]["first-match"]}, first override ${starts[kind]["first-override"]}, first award ${starts[kind]["first-award"]}`;
  const lines = [
    `Padel Level recalculation, dry run against ${report.host}. Nothing is written.`,
    "",
    `Players ${counts.players}, Rated Matches ${counts.matches}, rating events ${counts.events}, Level overrides ${counts.overrides}, Place awards ${counts.awards}.`,
    "",
    "Declared bands recovered:",
    `  declared: ${sourceLine("declared")}`,
    `  "I don't know": ${sourceLine("unknown")}`,
    `  start μ not a band midpoint [RQ-5]: ${sourceLine("unrecognised")}`,
    `  never declared: ${sourceLine("not-declared")}`,
    "",
    `Players whose Level moves by 0.01 or more: ${report.moved} of ${counts.players}.`,
    `Rows that would change: ratings ${report.differences.ratings}, rating_events ${report.differences.rating_events}, king_place_awards ${report.differences.king_place_awards}, level_overrides ${report.differences.level_overrides}.`,
    "",
    `Largest moves up (${report.largestUp.length}):`,
    ...report.largestUp.map(moveLine),
    `Largest moves down (${report.largestDown.length}):`,
    ...report.largestDown.map(moveLine),
    "",
    `Band letter changes (${report.bandChanges.length}):`,
    ...report.bandChanges.map(moveLine),
    "",
    `Players crossing the confirmation line or changing their Verified Group Match count: ${report.confirmationChanges.length} (must be 0).`,
    ...report.confirmationChanges.map(
      (row) =>
        `  ${playerLabel(row)}: ${row.verifiedMatchesBefore} → ${row.verifiedMatchesAfter} Verified Group Matches, confirmed ${row.confirmedBefore} → ${row.confirmedAfter}`,
    ),
    "",
    `Seated on upcoming Games and outside the Game Level range after the recalculation: ${report.outsideLevelRange.length} (${report.outsideLevelRange.filter((seat) => !seat.wasOutside).length} newly outside).`,
    ...report.outsideLevelRange.map(
      (seat) =>
        `  ${playerLabel({ name: seat.name, userId: seat.userId })} on Game ${seat.gameId}: ${seat.levelBefore.toFixed(2)} → ${seat.levelAfter.toFixed(2)}, range ${seat.levelMinTenths ?? "–"} to ${seat.levelMaxTenths ?? "–"} tenths${seat.wasOutside ? ", already outside" : ""}`,
    ),
    "",
    `Baseline pass (φ 350, no Prove-it rule): reproduces ${report.baseline.reproduced} of ${report.baseline.events} stored rating events exactly, ${report.baseline.withinTolerance} within ${BASELINE_TOLERANCE}.`,
    "",
    `Anomalies (${report.anomalies.length}):`,
    ...report.anomalies.map(
      (anomaly) =>
        `  [${anomaly.rule}] ${anomaly.userIds.map(userLabel).join(", ")}: ${anomaly.detail}`,
    ),
    "",
    `Loaded in ${report.loadMs.toFixed(0)} ms, computed in ${report.computeMs.toFixed(0)} ms.`,
  ];
  if (report.failed) {
    lines.push(
      "FAILED: the recalculation would change who is confirmed. Nothing may be applied.",
    );
  }
  return lines;
}

function csvCell(value: string | number | boolean | null): string {
  const text = value === null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** One CSV row per padel player, for `--report <path>`. */
export function padelReplayCsv(report: PadelReplayReport): string {
  const header = [
    "user_id",
    "name",
    "start",
    "start_source",
    "declared_band",
    "level_before",
    "level_after",
    "move",
    "band_before",
    "band_after",
    "phi_before",
    "phi_after",
    "verified_matches",
    "confirmed",
  ];
  const lines = report.rows.map((row) =>
    [
      row.userId,
      row.name,
      row.start,
      row.startSource,
      row.declaredBand,
      row.levelBefore.toFixed(4),
      row.levelAfter.toFixed(4),
      row.move.toFixed(4),
      displayLabelFromStoredBand(row.bandBefore),
      displayLabelFromStoredBand(row.bandAfter),
      row.phiBefore.toFixed(2),
      row.phiAfter.toFixed(2),
      row.verifiedMatchesAfter,
      row.confirmedAfter,
    ]
      .map(csvCell)
      .join(","),
  );
  return [header.join(","), ...lines].join("\n") + "\n";
}

/**
 * The dry run: reads the padel ledger in one read-only, repeatable-read
 * transaction, replays it under the Declared band rules and under the
 * baseline, and reports what would change. Writes nothing.
 */
export async function dryRunPadelReplay(
  database: DbClient,
  args: { host: string; now?: Date },
): Promise<PadelReplayReport> {
  const now = args.now ?? new Date();
  const loadStart = performance.now();
  const { ledger, upcoming } = await database.transaction(
    async (tx) => ({
      ledger: await loadPadelLedger(tx),
      upcoming: await loadUpcomingLevelRangeSeats(tx, now),
    }),
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
  const loadMs = performance.now() - loadStart;

  const computeStart = performance.now();
  const replay = replayPadelLedger(ledger, "declared-band");
  const baseline = replayPadelLedger(ledger, "baseline");
  const computeMs = performance.now() - computeStart;

  return buildPadelReplayReport({
    host: args.host,
    ledger,
    replay,
    baseline,
    upcoming,
    loadMs,
    computeMs,
  });
}
