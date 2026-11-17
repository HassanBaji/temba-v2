import type { RatingReplayTable } from "@repo/db";
import type { ClassicGlicko } from "@repo/domain/glicko2";
import { applyIdleInflation } from "@repo/domain/idle";
import {
  bandFromLevel,
  bandWithHysteresis,
  confirmedPhiForOverride,
  INITIAL_MU,
  INITIAL_PHI,
  INITIAL_SIGMA,
  initialRatingFromChoice,
  LEVEL_BANDS,
  levelFromMu,
  muFromBand,
  PADEL_DECLARED_START_PHI,
  proveItApplies,
  type LevelBand,
  type PadelConfirmation,
  type RatingGlickoState,
} from "@repo/domain/level";
import {
  rateDoublesMatch,
  type DoublesPlayerInput,
} from "@repo/domain/rate-doubles-match";
import { kingField } from "@repo/domain/rate-king-place";

import {
  rateKingPlaces,
  type KingPlacing,
} from "#src/ratings/apply-king-place-awards";
import { withGuestStandIns } from "#src/ratings/guest-stand-ins";
import {
  seatsFromScores,
  seatsFromTeams,
  type Seats,
} from "#src/ratings/padel-replay-seats";

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

/** `accountHolder`: neither an Unclaimed player nor a Guest player, so a Notification reaches them. */
export type ReplayPlayer = {
  id: string;
  name: string;
  guest: boolean;
  accountHolder: boolean;
};

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
 * How a player's starting Rating was read back. "declared": the stored
 * Declared band, or else the band whose midpoint the start μ is. "unknown":
 * "I don't know", μ 1500. "unrecognised": declared, with no stored band and
 * a start μ that is no band midpoint. "not-declared": nobody declared, so
 * the Rating starts at μ 1500 when something first moves it.
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
 * The rule the replay applied where the ledger alone could not say (ADR-0098):
 * "start-mu-off-midpoint" a declared start μ that is no band midpoint,
 * "seat-without-event" a seat with no rating event played as a Guest player,
 * "carried-over" a row carried over by its stored move,
 * "rebuilt-from-scores" a decisive Match whose seats no longer fit,
 * "same-instant" units at one instant that share a player,
 * "declared-band-mismatch" a stored Declared band kept over the one the
 * start μ reads.
 */
export type ReplayRule =
  | "start-mu-off-midpoint"
  | "seat-without-event"
  | "carried-over"
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

type MatchUnit = { kind: "match"; id: string; at: Date; events: ReplayEvent[] };
type OverrideUnit = {
  kind: "override";
  id: string;
  at: Date;
  override: ReplayOverride;
};
type AwardsUnit = {
  kind: "awards";
  id: string;
  at: Date;
  awards: ReplayAward[];
};
type Unit = MatchUnit | OverrideUnit | AwardsUnit;

const UNIT_ORDER: Record<Unit["kind"], number> = {
  match: 0,
  override: 1,
  awards: 2,
};

const UNKNOWN_START = initialRatingFromChoice("unknown", "padel");

const UNCONFIRMED: PadelConfirmation = {
  verifiedMatches: 0,
  overridden: false,
};

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

type FirstRow = { mu: number; source: ReplayStartSource };

/** Each player's earliest ledger row: its μ before, and which kind of unit it is. */
function firstRows(units: readonly Unit[]): Map<string, FirstRow> {
  const first = new Map<string, FirstRow>();
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
  return first;
}

/** The start of a declared player with no stored Declared band, read back from μ alone. */
function startFromMu(mu: number, source: ReplayStartSource): ReplayStart {
  if (mu === INITIAL_MU) {
    return { kind: "unknown", source, mu, declaredBand: null };
  }
  const midpointBand = bandAtMidpoint(mu);
  return midpointBand
    ? { kind: "declared", source, mu, declaredBand: midpointBand }
    : {
        kind: "unrecognised",
        source,
        mu,
        declaredBand: bandFromLevel(levelFromMu(mu)),
      };
}

function declaredStart(
  userId: string,
  storedBand: LevelBand | null,
  first: FirstRow,
  anomalies: ReplayAnomaly[],
): ReplayStart {
  const { mu, source } = first;
  const fromMu = startFromMu(mu, source);
  if (!storedBand) {
    if (fromMu.kind === "unrecognised") {
      anomalies.push({
        rule: "start-mu-off-midpoint",
        userIds: [userId],
        detail: `declared start μ ${mu} is no band midpoint; kept, with Declared band ${fromMu.declaredBand}`,
      });
    }
    return fromMu;
  }
  if (fromMu.declaredBand !== storedBand) {
    anomalies.push({
      rule: "declared-band-mismatch",
      userIds: [userId],
      detail: `stored Declared band ${storedBand} kept; the history starts at μ ${mu}, which would recover ${fromMu.declaredBand ?? "none"}`,
    });
  }
  return { kind: "declared", source, mu, declaredBand: storedBand };
}

/**
 * Reads back what each player started from: the earliest ledger row's μ
 * before, or the Rating's own μ when nothing has moved it. Idle inflation
 * never touches μ and a reversal deletes its event, so that μ is the
 * declared one. A stored Declared band never changes (ADR-0096): when there
 * is one it is kept, and the band is read back from μ only when there is not.
 */
function recoverStarts(
  ledger: PadelLedger,
  units: readonly Unit[],
  anomalies: ReplayAnomaly[],
): Map<string, ReplayStart> {
  const first = firstRows(units);
  const ratingByUser = new Map(ledger.ratings.map((row) => [row.userId, row]));
  const userIds = new Set([...ratingByUser.keys(), ...first.keys()]);
  const starts = new Map<string, ReplayStart>();
  for (const userId of userIds) {
    const rating = ratingByUser.get(userId);
    const recorded = first.get(userId);
    const start: FirstRow = {
      mu: recorded?.mu ?? rating?.mu ?? INITIAL_MU,
      source: recorded?.source ?? "never-played",
    };
    if (rating?.selfDeclaredAt) {
      starts.set(
        userId,
        declaredStart(userId, rating.declaredBand, start, anomalies),
      );
      continue;
    }
    if (recorded && start.mu !== INITIAL_MU) {
      anomalies.push({
        rule: "undeclared-start",
        userIds: [userId],
        detail: `never declared, but the first ledger row starts at μ ${start.mu}; replayed from μ ${INITIAL_MU}`,
      });
    }
    starts.set(userId, {
      kind: "not-declared",
      ...start,
      declaredBand: rating?.declaredBand ?? null,
    });
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
  return {
    mu: start.mu,
    phi: rules === "baseline" ? INITIAL_PHI : PADEL_DECLARED_START_PHI[band],
    sigma: INITIAL_SIGMA,
    levelBand: band,
  };
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

function storedLossFactor(event: ReplayEvent): number | null {
  const factor = replayLossFactor(event);
  return factor === 1 ? null : factor;
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

/** One walk over the time line: what it reads, and what it has replayed so far. */
type Walk = {
  rules: PadelReplayRules;
  starts: Map<string, ReplayStart>;
  ratingByUser: Map<string, ReplayRating>;
  matchById: Map<string, ReplayMatch>;
  kingGameById: Map<string, ReplayKingGame>;
  guestIds: Set<string>;
  states: Map<string, State>;
  confirmations: Map<string, PadelConfirmation>;
  events: Map<string, ReplayedEvent>;
  overrides: Map<string, ReplayedOverride>;
  awards: Map<string, ReplayedAward>;
  anomalies: ReplayAnomaly[];
};

function newWalk(
  ledger: PadelLedger,
  rules: PadelReplayRules,
  starts: Map<string, ReplayStart>,
  anomalies: ReplayAnomaly[],
): Walk {
  return {
    rules,
    starts,
    ratingByUser: new Map(ledger.ratings.map((row) => [row.userId, row])),
    matchById: new Map(ledger.matches.map((row) => [row.id, row])),
    kingGameById: new Map(ledger.kingGames.map((row) => [row.id, row])),
    guestIds: new Set(
      ledger.players
        .filter((player) => player.guest)
        .map((player) => player.id),
    ),
    states: new Map(),
    confirmations: new Map(),
    events: new Map(),
    overrides: new Map(),
    awards: new Map(),
    anomalies,
  };
}

function confirmationOf(walk: Walk, userId: string): PadelConfirmation {
  return walk.confirmations.get(userId) ?? UNCONFIRMED;
}

/** The Rating a live writer would have read at `at`: none until it was declared or first moved. */
function stateAt(walk: Walk, userId: string, at: Date): State {
  const replayed = walk.states.get(userId);
  if (replayed) {
    return replayed;
  }
  const start = walk.starts.get(userId);
  const rating = walk.ratingByUser.get(userId);
  if (
    start &&
    rating?.selfDeclaredAt &&
    start.kind !== "not-declared" &&
    rating.selfDeclaredAt <= at
  ) {
    return { ...startState(start, walk.rules), lastRatedAt: null };
  }
  return { ...UNKNOWN_START, lastRatedAt: null };
}

function inputOf(walk: Walk, userId: string, at: Date): DoublesPlayerInput {
  const state = stateAt(walk, userId, at);
  return { state: glickoOf(state), lastRatedAt: state.lastRatedAt };
}

function countMatch(walk: Walk, userId: string, verified: boolean) {
  const confirmation = confirmationOf(walk, userId);
  walk.confirmations.set(userId, {
    ...confirmation,
    verifiedMatches: confirmation.verifiedMatches + (verified ? 1 : 0),
  });
}

function carryOverEvent(
  walk: Walk,
  event: ReplayEvent,
  at: Date,
  verified: boolean,
) {
  const state = stateAt(walk, event.userId, at);
  const before = applyIdleInflation(state, state.lastRatedAt, at);
  const after = carriedMove(before, event);
  walk.events.set(event.id, {
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
    reliabilityLossFactor: storedLossFactor(event),
  });
  walk.states.set(event.userId, {
    ...after,
    levelBand: bandWithHysteresis(levelFromMu(after.mu), state.levelBand),
    lastRatedAt: at,
  });
  countMatch(walk, event.userId, verified);
}

/** The Match's seats, from its Game teams or else rebuilt from its scores; null when neither fits. */
function matchSeats(
  walk: Walk,
  unit: MatchUnit,
  eventByUser: ReadonlyMap<string, ReplayEvent>,
): Seats | null {
  const fromTeams = seatsFromTeams(walk.matchById.get(unit.id), unit.events);
  if (fromTeams) {
    const missing = [...fromTeams.slot1, ...fromTeams.slot2].filter(
      (userId) => !eventByUser.has(userId),
    );
    const merged = missing.filter((userId) => !walk.guestIds.has(userId));
    if (merged.length > 0) {
      walk.anomalies.push({
        rule: "seat-without-event",
        userIds: merged,
        detail: `Match ${unit.id}: a seat with no rating event plays as a Guest player`,
      });
    }
    return { ...fromTeams, standIns: new Set(missing) };
  }
  const fromScores = seatsFromScores(unit.id, unit.events);
  if (fromScores) {
    walk.anomalies.push({
      rule: "rebuilt-from-scores",
      userIds: unit.events.map((row) => row.userId),
      detail: `Match ${unit.id}: the seats no longer fit its events; rebuilt with the winners together`,
    });
  }
  return fromScores;
}

/** Each seat's input as the live writer builds it: the stored loss factor, the Prove-it rule, a Guest player at the mean. */
function seatInputs(
  walk: Walk,
  seats: Seats,
  eventByUser: ReadonlyMap<string, ReplayEvent>,
  at: Date,
) {
  return withGuestStandIns(
    [...seats.slot1, ...seats.slot2],
    seats.standIns,
    (userId) => {
      const event = eventByUser.get(userId);
      return {
        ...inputOf(walk, userId, at),
        lossFactor: event ? replayLossFactor(event) : 1,
        proveIt:
          walk.rules === "declared-band" &&
          proveItApplies(
            walk.starts.get(userId)?.declaredBand,
            confirmationOf(walk, userId),
          ),
      };
    },
  );
}

/** Rates the Match through `rateDoublesMatch` on the replayed Ratings, as the live writer does. */
function rateMatch(
  walk: Walk,
  unit: MatchUnit,
  seats: Seats,
  eventByUser: ReadonlyMap<string, ReplayEvent>,
  verified: boolean,
) {
  const { at } = unit;
  const { slot1, slot2, outcome } = seats;
  const playerInput = seatInputs(walk, seats, eventByUser, at);
  const rated = rateDoublesMatch({
    slot1: [playerInput(slot1[0]), playerInput(slot1[1])],
    slot2: [playerInput(slot2[0]), playerInput(slot2[1])],
    outcome,
    weight: unit.events[0]?.weight ?? 1,
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
    walk.events.set(event.id, {
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
      reliabilityLossFactor: storedLossFactor(event),
    });
    walk.states.set(userId, {
      ...result.after,
      levelBand: result.levelBand,
      lastRatedAt: at,
    });
    countMatch(walk, userId, verified);
  }
}

function replayMatch(walk: Walk, unit: MatchUnit) {
  const verified = walk.matchById.get(unit.id)?.verified ?? false;
  const eventByUser = new Map(unit.events.map((row) => [row.userId, row]));
  const seats = matchSeats(walk, unit, eventByUser);
  if (seats) {
    rateMatch(walk, unit, seats, eventByUser, verified);
    return;
  }
  walk.anomalies.push({
    rule: "carried-over",
    userIds: unit.events.map((row) => row.userId),
    detail: `Match ${unit.id}: drawn or unplaceable, carried over by its stored moves`,
  });
  for (const event of unit.events) {
    carryOverEvent(walk, event, unit.at, verified);
  }
}

function replayOverride(walk: Walk, override: ReplayOverride) {
  const state = stateAt(walk, override.userId, override.createdAt);
  const phiAfter = confirmedPhiForOverride(state.phi);
  walk.overrides.set(override.id, {
    muBefore: state.mu,
    phiBefore: state.phi,
    sigmaBefore: state.sigma,
    levelBandBefore: state.levelBand,
    phiAfter,
    sigmaAfter: state.sigma,
  });
  walk.states.set(override.userId, {
    mu: override.muAfter,
    phi: phiAfter,
    sigma: state.sigma,
    levelBand: override.levelBandAfter,
    lastRatedAt: state.lastRatedAt,
  });
  walk.confirmations.set(override.userId, {
    ...confirmationOf(walk, override.userId),
    overridden: true,
  });
}

/** Each placed player of a Game, rated by the live writer's own pairing from the Ratings before the Game's awards. */
function placeKingGame(walk: Walk, unit: AwardsUnit): Map<string, KingPlacing> {
  const { at } = unit;
  const teams = walk.kingGameById.get(unit.id)?.teams ?? [];
  const fieldUserIds = [
    ...new Set(teams.flatMap((team) => team.userIds)),
  ].filter((userId) => !walk.guestIds.has(userId));
  const field = kingField(
    fieldUserIds.map((userId) => inputOf(walk, userId, at)),
    at,
  );
  const placings = field
    ? rateKingPlaces({
        teams,
        guestIds: walk.guestIds,
        field,
        inputOf: (userId) => inputOf(walk, userId, at),
        now: at,
      })
    : [];
  return new Map(placings.map((placing) => [placing.userId, placing]));
}

/** A Game's Place awards, every one read from the Ratings as they stood before the Game's awards. */
function replayAwards(walk: Walk, unit: AwardsUnit) {
  const { at } = unit;
  const placed = placeKingGame(walk, unit);
  const next = new Map<string, State>();
  for (const award of unit.awards) {
    const state = stateAt(walk, award.userId, at);
    const result = placed.get(award.userId);
    const recomputed =
      result?.wins === award.wins && result.finalPlace === award.finalPlace
        ? result
        : null;
    if (!recomputed) {
      walk.anomalies.push({
        rule: "carried-over",
        userIds: [award.userId],
        detail: `Place award ${award.id} on Game ${unit.id}: the Game teams no longer place this player; carried over by its stored move`,
      });
    }
    const after = recomputed?.result.after ?? carriedMove(state, award);
    walk.awards.set(award.id, {
      fieldMu: recomputed ? recomputed.field.mu : award.fieldMu,
      fieldPhi: recomputed ? recomputed.field.phi : award.fieldPhi,
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
        recomputed?.result.levelBand ??
        bandWithHysteresis(levelFromMu(after.mu), state.levelBand),
      lastRatedAt: at,
    });
  }
  for (const [userId, state] of next) {
    walk.states.set(userId, state);
  }
}

function replayUnit(walk: Walk, unit: Unit) {
  switch (unit.kind) {
    case "match":
      replayMatch(walk, unit);
      break;
    case "override":
      replayOverride(walk, unit.override);
      break;
    case "awards":
      replayAwards(walk, unit);
      break;
  }
}

function refuseFootball(ledger: PadelLedger) {
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
}

/** Each Rating at the end of the walk: as replayed, or its start when nothing moved it. */
function finalRatings(
  walk: Walk,
  ledger: PadelLedger,
): Map<string, ReplayedRating> {
  const replayedRatings = new Map<string, ReplayedRating>();
  for (const rating of ledger.ratings) {
    const start = walk.starts.get(rating.userId);
    const state: State =
      walk.states.get(rating.userId) ??
      (start && start.kind !== "not-declared"
        ? { ...startState(start, walk.rules), lastRatedAt: null }
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
  return replayedRatings;
}

function withoutRatingAnomalies(walk: Walk): ReplayAnomaly[] {
  const withoutRating = [...walk.states.keys()].filter(
    (userId) => !walk.ratingByUser.has(userId),
  );
  return withoutRating.length === 0
    ? []
    : [
        {
          rule: "ledger-without-rating",
          userIds: withoutRating,
          detail:
            "ledger rows whose player has no padel Rating; replayed as opponents only",
        },
      ];
}

/**
 * Replays the padel ledger under one rule set (ADR-0098): one walk over
 * every Rated Match, Level override and Game's Place awards, in order,
 * through the same functions the live writers call, so a history the live
 * writers wrote under these rules replays to exactly what they stored. Pure:
 * reads only `ledger`, and refuses a football row.
 */
export function replayPadelLedger(
  ledger: PadelLedger,
  rules: PadelReplayRules,
): PadelReplay {
  refuseFootball(ledger);
  const anomalies: ReplayAnomaly[] = [];
  const units = timeLine(ledger);
  const walk = newWalk(
    ledger,
    rules,
    recoverStarts(ledger, units, anomalies),
    anomalies,
  );
  for (const unit of units) {
    replayUnit(walk, unit);
  }
  anomalies.push(
    ...sameInstantAnomalies(units, walk.matchById, walk.kingGameById),
  );
  const ratings = finalRatings(walk, ledger);
  anomalies.push(...withoutRatingAnomalies(walk));
  return {
    rules,
    ratings,
    events: walk.events,
    overrides: walk.overrides,
    awards: walk.awards,
    starts: walk.starts,
    confirmations: walk.confirmations,
    anomalies,
  };
}

function unitParticipants(
  unit: Unit,
  matchById: ReadonlyMap<string, ReplayMatch>,
  kingGameById: ReadonlyMap<string, ReplayKingGame>,
): string[] {
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
        ...(kingGameById.get(unit.id)?.teams.flatMap((team) => team.userIds) ??
          []),
      ];
  }
}

function sameInstantAnomalies(
  units: readonly Unit[],
  matchById: ReadonlyMap<string, ReplayMatch>,
  kingGameById: ReadonlyMap<string, ReplayKingGame>,
): ReplayAnomaly[] {
  const anomalies: ReplayAnomaly[] = [];
  for (const sameAt of groupBy(units, (unit) =>
    String(unit.at.getTime()),
  ).values()) {
    if (sameAt.length < 2) {
      continue;
    }
    const seen = new Map<string, number>();
    for (const unit of sameAt) {
      for (const userId of new Set(
        unitParticipants(unit, matchById, kingGameById),
      )) {
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
  table: RatingReplayTable;
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
    table: RatingReplayTable,
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
