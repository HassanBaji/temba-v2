import { describe, expect, it } from "vitest";

import { applyIdleInflation } from "@repo/domain/idle";
import {
  bandFromLevel,
  INITIAL_MU,
  INITIAL_PHI,
  initialRatingFromChoice,
  LEVEL_BANDS,
  muFromBand,
  muFromLevel,
  PADEL_DECLARED_START_PHI,
  type LevelBand,
  type RatingGlickoState,
  type SelfDeclareChoice,
} from "@repo/domain/level";
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
} from "@repo/domain/rate-king-place";

import { guestStandInState } from "#src/ratings/guest-stand-ins";
import {
  buildPadelReplayReport,
  formatPadelReplayReport,
  padelReplayCsv,
  replayPadelLedger,
  type PadelLedger,
  type PadelReplay,
  type ReplayEvent,
} from "#src/ratings/padel-replay";

const DAY = 24 * 60 * 60 * 1000;
const T0 = new Date("2026-06-01T18:00:00Z");

function day(count: number) {
  return new Date(T0.getTime() + count * DAY);
}

type Pair = [string, string];

/** A hand-written padel ledger. Stored before and after values are filler unless a test reads them. */
function history() {
  const ledger: PadelLedger = {
    ratings: [],
    events: [],
    overrides: [],
    awards: [],
    matches: [],
    kingGames: [],
    players: [],
  };
  const startMu = new Map<string, number>();
  let next = 0;
  const id = (prefix: string) => `${prefix}-${String(++next).padStart(3, "0")}`;
  const storedMu = (userId: string) => startMu.get(userId) ?? INITIAL_MU;

  return {
    ledger,
    player(
      name: string,
      options: {
        declared?: SelfDeclareChoice;
        mu?: number;
        rated?: boolean;
        guest?: boolean;
        declaredAt?: Date;
      } = {},
    ) {
      ledger.players.push({ id: name, name, guest: options.guest ?? false });
      const declared =
        options.declared !== undefined || options.mu !== undefined;
      if (declared || options.rated) {
        const state = options.declared
          ? initialRatingFromChoice(options.declared, "padel")
          : initialRatingFromChoice("unknown", "padel");
        const mu = options.mu ?? state.mu;
        ledger.ratings.push({
          userId: name,
          sport: "padel",
          ...state,
          mu,
          declaredBand: null,
          selfDeclaredAt: declared ? (options.declaredAt ?? day(-10)) : null,
          lastRatedAt: null,
          createdAt: day(-10),
        });
        startMu.set(name, mu);
      }
      return name;
    },
    match(args: {
      at: Date;
      slot1: Pair;
      slot2: Pair;
      outcome: DoublesOutcome;
      weight?: number;
      verified?: boolean;
      rated?: readonly string[];
      teams?: { slot1: string[]; slot2: string[] };
      stored?: Record<string, Partial<ReplayEvent>>;
    }) {
      const matchId = id("match");
      ledger.matches.push({
        id: matchId,
        verified: args.verified ?? true,
        slot1: args.teams?.slot1 ?? [...args.slot1],
        slot2: args.teams?.slot2 ?? [...args.slot2],
      });
      const guests = new Set(
        ledger.players.filter((row) => row.guest).map((row) => row.id),
      );
      const rated =
        args.rated ??
        [...args.slot1, ...args.slot2].filter((userId) => !guests.has(userId));
      for (const userId of rated) {
        const score =
          args.outcome === "draw"
            ? 0.5
            : args.slot1.includes(userId) === (args.outcome === "slot1")
              ? 1
              : 0;
        const mu = storedMu(userId);
        ledger.events.push({
          id: id("event"),
          userId,
          sport: "padel",
          matchId,
          outcomeScore: score,
          weight: args.weight ?? 1,
          muBefore: mu,
          phiBefore: 300,
          sigmaBefore: 0.06,
          muAfter: mu,
          phiAfter: 290,
          sigmaAfter: 0.06,
          levelBandBefore: null,
          lastRatedAtBefore: null,
          reliabilityPart: null,
          proveItPart: null,
          reliabilityLossFactor: null,
          createdAt: args.at,
          ...args.stored?.[userId],
        });
      }
      return matchId;
    },
    override(userId: string, at: Date, level: number) {
      const overrideId = id("override");
      const mu = storedMu(userId);
      ledger.overrides.push({
        id: overrideId,
        userId,
        sport: "padel",
        muBefore: mu,
        phiBefore: 300,
        sigmaBefore: 0.06,
        levelBandBefore: "C2",
        muAfter: muFromLevel(level),
        phiAfter: 150,
        sigmaAfter: 0.06,
        levelBandAfter: bandFromLevel(level),
        createdAt: at,
      });
      return overrideId;
    },
    king(args: {
      at: Date;
      teams: { userIds: string[]; finalPlace: number | null }[];
      stored?: Record<string, { mu: number; muAfter: number }>;
    }) {
      const gameId = id("king");
      ledger.kingGames.push({ id: gameId, teams: args.teams });
      const guests = new Set(
        ledger.players.filter((row) => row.guest).map((row) => row.id),
      );
      for (const team of args.teams) {
        const wins = kingPlaceWins(team.finalPlace);
        for (const userId of team.userIds) {
          if (wins === 0 || guests.has(userId) || team.finalPlace == null) {
            continue;
          }
          const mu = args.stored?.[userId]?.mu ?? storedMu(userId);
          ledger.awards.push({
            id: id("award"),
            userId,
            sport: "padel",
            gameId,
            finalPlace: team.finalPlace,
            wins,
            fieldMu: 1500,
            fieldPhi: 200,
            muBefore: mu,
            phiBefore: 200,
            sigmaBefore: 0.06,
            muAfter: args.stored?.[userId]?.muAfter ?? mu + 10,
            phiAfter: 190,
            sigmaAfter: 0.06,
            levelBandBefore: "C2",
            lastRatedAtBefore: null,
            createdAt: args.at,
          });
        }
      }
      return gameId;
    },
  };
}

function eventOf(ledger: PadelLedger, matchId: string, userId: string) {
  const event = ledger.events.find(
    (row) => row.matchId === matchId && row.userId === userId,
  );
  if (!event) {
    throw new Error(`No event for ${userId} on ${matchId}`);
  }
  return event;
}

function replayedEvent(
  replay: PadelReplay,
  ledger: PadelLedger,
  matchId: string,
  userId: string,
) {
  const replayed = replay.events.get(eventOf(ledger, matchId, userId).id);
  if (!replayed) {
    throw new Error(`Event for ${userId} on ${matchId} was not replayed`);
  }
  return replayed;
}

function input(
  state: RatingGlickoState,
  lastRatedAt: Date | null = null,
  extra: Partial<DoublesPlayerInput> = {},
): DoublesPlayerInput {
  return { state, lastRatedAt, ...extra };
}

function afterState(
  replayed: { muAfter: number; phiAfter: number; sigmaAfter: number },
  levelBand: LevelBand,
): RatingGlickoState {
  return {
    mu: replayed.muAfter,
    phi: replayed.phiAfter,
    sigma: replayed.sigmaAfter,
    levelBand,
  };
}

const D = initialRatingFromChoice("D2", "padel");
const C = initialRatingFromChoice("C2", "padel");

describe("replayPadelLedger: starting state (spec 9.3)", () => {
  it("starts each declared band at its midpoint with the φ of the table, and the baseline at φ 350", () => {
    const h = history();
    for (const band of LEVEL_BANDS) {
      h.player(band, { declared: band });
    }
    const replay = replayPadelLedger(h.ledger, "declared-band");
    const baseline = replayPadelLedger(h.ledger, "baseline");
    for (const band of LEVEL_BANDS) {
      expect(replay.ratings.get(band)).toEqual({
        mu: muFromBand(band),
        phi: PADEL_DECLARED_START_PHI[band],
        sigma: 0.06,
        levelBand: band,
        lastRatedAt: null,
        declaredBand: band,
      });
      expect(replay.starts.get(band)).toEqual({
        kind: "declared",
        source: "never-played",
        mu: muFromBand(band),
        declaredBand: band,
      });
      expect(baseline.ratings.get(band)?.phi).toBe(INITIAL_PHI);
    }
    expect(replay.ratings.get("D1")?.phi).toBe(150);
  });

  it('starts "I don\'t know" at μ 1500 and φ 350 with no Declared band', () => {
    const h = history();
    const una = h.player("una", { declared: "unknown" });
    const replay = replayPadelLedger(h.ledger, "declared-band");
    expect(replay.ratings.get(una)).toMatchObject({
      mu: INITIAL_MU,
      phi: INITIAL_PHI,
      levelBand: "C2",
      declaredBand: null,
    });
    expect(replay.starts.get(una)?.kind).toBe("unknown");
  });

  it("keeps a declared start μ that is no band midpoint, takes the band it falls in, and reports it as RQ-5", () => {
    const h = history();
    const odd = h.player("odd", { mu: 1600 });
    const partner = h.player("partner", { declared: "C2" });
    const [c, d] = [
      h.player("c", { declared: "C2" }),
      h.player("d", { declared: "C2" }),
    ];
    const matchId = h.match({
      at: day(1),
      slot1: [odd, partner],
      slot2: [c, d],
      outcome: "slot2",
    });

    const replay = replayPadelLedger(h.ledger, "declared-band");
    expect(replay.starts.get(odd)).toEqual({
      kind: "unrecognised",
      source: "first-match",
      mu: 1600,
      declaredBand: "C2",
    });
    const event = replayedEvent(replay, h.ledger, matchId, odd);
    expect(event.muBefore).toBe(1600);
    expect(event.phiBefore).toBe(PADEL_DECLARED_START_PHI.C2);
    expect(event.proveItPart).not.toBeNull();
    expect(replay.anomalies).toContainEqual(
      expect.objectContaining({ rule: "RQ-5", userIds: [odd] }),
    );
  });

  it("starts a player who never declared at μ 1500 and φ 350 when their first Match creates the Rating", () => {
    const h = history();
    const [newbie, b, c, d] = [
      h.player("newbie", { rated: true }),
      h.player("b", { declared: "D2" }),
      h.player("c", { declared: "D2" }),
      h.player("d", { declared: "D2" }),
    ];
    const matchId = h.match({
      at: day(1),
      slot1: [newbie, b],
      slot2: [c, d],
      outcome: "slot1",
    });
    const replay = replayPadelLedger(h.ledger, "declared-band");
    const expected = rateDoublesMatch({
      slot1: [input(initialRatingFromChoice("unknown", "padel")), input(D)],
      slot2: [input(D), input(D)],
      outcome: "slot1",
      weight: 1,
      now: day(1),
    });
    expect(replay.starts.get(newbie)).toMatchObject({
      kind: "not-declared",
      source: "first-match",
      declaredBand: null,
    });
    expect(replayedEvent(replay, h.ledger, matchId, newbie)).toMatchObject({
      muBefore: INITIAL_MU,
      phiBefore: INITIAL_PHI,
      muAfter: expected.slot1[0].after.mu,
      phiAfter: expected.slot1[0].after.phi,
    });
    expect(replay.ratings.get(newbie)?.declaredBand).toBeNull();
  });
});

describe("replayPadelLedger: inputs (spec 9.2)", () => {
  it("recomputes Matches at their stored weight, 1 and 0.5, in order", () => {
    const h = history();
    const [a, b, c, d] = ["a", "b", "c", "d"].map((name) =>
      h.player(name, { declared: "D2" }),
    ) as [string, string, string, string];
    const first = h.match({
      at: day(1),
      slot1: [a, b],
      slot2: [c, d],
      outcome: "slot1",
    });
    const second = h.match({
      at: day(2),
      slot1: [a, c],
      slot2: [b, d],
      outcome: "slot2",
      weight: 0.5,
    });

    const replay = replayPadelLedger(h.ledger, "declared-band");
    const one = rateDoublesMatch({
      slot1: [input(D), input(D)],
      slot2: [input(D), input(D)],
      outcome: "slot1",
      weight: 1,
      now: day(1),
    });
    const after = (result: (typeof one.slot1)[0]) =>
      input({ ...result.after, levelBand: result.levelBand }, day(1));
    const two = rateDoublesMatch({
      slot1: [after(one.slot1[0]), after(one.slot2[0])],
      slot2: [after(one.slot1[1]), after(one.slot2[1])],
      outcome: "slot2",
      weight: 0.5,
      now: day(2),
    });
    expect(replayedEvent(replay, h.ledger, first, a).muAfter).toBe(
      one.slot1[0].after.mu,
    );
    expect(replayedEvent(replay, h.ledger, second, a)).toMatchObject({
      muBefore: one.slot1[0].after.mu,
      muAfter: two.slot1[0].after.mu,
      phiAfter: two.slot1[0].after.phi,
      lastRatedAtBefore: day(1),
    });
    expect(replay.ratings.get(a)).toMatchObject({
      mu: two.slot1[0].after.mu,
      lastRatedAt: day(2),
    });
  });

  it("grows φ by idle inflation from the replayed last rated time over a gap of more than 30 days", () => {
    const h = history();
    const [a, b, c, d] = ["a", "b", "c", "d"].map((name) =>
      h.player(name, { declared: "D2" }),
    ) as [string, string, string, string];
    const first = h.match({
      at: day(1),
      slot1: [a, b],
      slot2: [c, d],
      outcome: "slot1",
    });
    const later = h.match({
      at: day(50),
      slot1: [a, b],
      slot2: [c, d],
      outcome: "slot1",
    });
    const replay = replayPadelLedger(h.ledger, "declared-band");
    const firstEvent = replayedEvent(replay, h.ledger, first, a);
    const laterEvent = replayedEvent(replay, h.ledger, later, a);
    const inflated = applyIdleInflation(
      afterState(firstEvent, "D2"),
      day(1),
      day(50),
    );
    expect(laterEvent.phiBefore).toBe(inflated.phi);
    expect(laterEvent.phiBefore).toBeGreaterThan(firstEvent.phiAfter);
    expect(laterEvent.lastRatedAtBefore).toEqual(day(1));
  });

  it("keeps each Level override as the Level it set, before, between and after Matches, and one that created the Rating", () => {
    const h = history();
    const [a, b, c, d] = ["a", "b", "c", "d"].map((name) =>
      h.player(name, { declared: "C2" }),
    ) as [string, string, string, string];
    const nora = h.player("nora", { rated: true });
    const beforeAny = h.override(a, day(0), 3.6);
    const created = h.override(nora, day(0), 2.4);
    const first = h.match({
      at: day(1),
      slot1: [a, b],
      slot2: [c, d],
      outcome: "slot2",
    });
    const between = h.override(b, day(2), 2.0);
    const second = h.match({
      at: day(3),
      slot1: [a, b],
      slot2: [c, nora],
      outcome: "slot2",
    });
    const last = h.override(c, day(4), 4.0);

    const replay = replayPadelLedger(h.ledger, "declared-band");
    expect(replay.starts.get(a)?.source).toBe("first-override");
    expect(replay.overrides.get(beforeAny)).toEqual({
      muBefore: C.mu,
      phiBefore: 250,
      sigmaBefore: 0.06,
      levelBandBefore: "C2",
      phiAfter: 150,
      sigmaAfter: 0.06,
    });
    expect(replay.overrides.get(created)).toEqual({
      muBefore: INITIAL_MU,
      phiBefore: INITIAL_PHI,
      sigmaBefore: 0.06,
      levelBandBefore: "C2",
      phiAfter: 150,
      sigmaAfter: 0.06,
    });
    const aFirst = replayedEvent(replay, h.ledger, first, a);
    expect(aFirst.muBefore).toBe(muFromLevel(3.6));
    expect(aFirst.proveItPart).toBeNull();
    const bFirst = replayedEvent(replay, h.ledger, first, b);
    expect(bFirst.proveItPart).not.toBeNull();
    expect(replay.overrides.get(between)).toMatchObject({
      muBefore: bFirst.muAfter,
      phiBefore: bFirst.phiAfter,
      phiAfter: Math.min(bFirst.phiAfter, 150),
    });
    expect(replayedEvent(replay, h.ledger, second, b).muBefore).toBe(
      muFromLevel(2.0),
    );
    const cSecond = replayedEvent(replay, h.ledger, second, c);
    expect(replay.overrides.get(last)).toMatchObject({
      muBefore: cSecond.muAfter,
      phiAfter: Math.min(cSecond.phiAfter, 150),
    });
    expect(replay.ratings.get(c)).toMatchObject({
      mu: muFromLevel(4.0),
      levelBand: bandFromLevel(4.0),
      lastRatedAt: day(3),
    });
    expect(replay.confirmations.get(c)?.overridden).toBe(true);
  });

  it("recomputes Place awards from the Game teams and their final places, a guest partner standing in at the field", () => {
    const h = history();
    const players = ["p1", "p2", "p3", "p4", "p5", "p6"].map((name) =>
      h.player(name, { declared: "C2" }),
    );
    const ghost = h.player("ghost", { guest: true });
    const [p1, p2, p3, p4, p5, p6] = players as [
      string,
      string,
      string,
      string,
      string,
      string,
    ];
    const gameId = h.king({
      at: day(1),
      teams: [
        { userIds: [p1, p2], finalPlace: 1 },
        { userIds: [p3, ghost], finalPlace: 2 },
        { userIds: [p4, p5], finalPlace: null },
        { userIds: [p6], finalPlace: 3 },
      ],
    });

    const replay = replayPadelLedger(h.ledger, "declared-band");
    const field = kingField(
      players.map(() => input(C)),
      day(1),
    )!;
    const first = rateKingPlace({
      pair: [input(C), input(C)],
      field,
      wins: 2,
      now: day(1),
    });
    const second = rateKingPlace({
      pair: [input(C), kingFieldPlayer(field)],
      field,
      wins: 1,
      now: day(1),
    });
    const alone = rateKingPlace({
      pair: [input(C), input(C)],
      field,
      wins: 0.5,
      now: day(1),
    });
    const awardOf = (userId: string) => {
      const award = h.ledger.awards.find(
        (row) => row.gameId === gameId && row.userId === userId,
      );
      return replay.awards.get(award!.id);
    };
    expect(awardOf(p1)).toMatchObject({
      fieldMu: field.mu,
      fieldPhi: field.phi,
      muBefore: C.mu,
      phiBefore: C.phi,
      muAfter: first[0].after.mu,
      phiAfter: first[0].after.phi,
      lastRatedAtBefore: null,
    });
    expect(awardOf(p3)?.muAfter).toBe(second[0].after.mu);
    expect(awardOf(p6)?.muAfter).toBe(alone[0].after.mu);
    expect(replay.ratings.get(p1)).toMatchObject({
      mu: first[0].after.mu,
      lastRatedAt: day(1),
    });
    expect(replay.ratings.get(p4)?.mu).toBe(C.mu);
    expect(replay.anomalies).toEqual([]);
  });

  it("recomputes a corrected Final order from the Ratings at the time of the correction", () => {
    const h = history();
    const [a, b, c, d] = ["a", "b", "c", "d"].map((name) =>
      h.player(name, { declared: "C2" }),
    ) as [string, string, string, string];
    h.match({ at: day(1), slot1: [a, b], slot2: [c, d], outcome: "slot1" });
    const gameId = h.king({
      at: day(2),
      teams: [
        { userIds: [c, d], finalPlace: 1 },
        { userIds: [a, b], finalPlace: 2 },
      ],
    });
    const replay = replayPadelLedger(h.ledger, "declared-band");
    const cAward = h.ledger.awards.find(
      (row) => row.gameId === gameId && row.userId === c,
    );
    const lostEvent = h.ledger.events.find((row) => row.userId === c);
    expect(replay.awards.get(cAward!.id)?.muBefore).toBe(
      replay.events.get(lostEvent!.id)?.muAfter,
    );
    expect(replay.awards.get(cAward!.id)?.lastRatedAtBefore).toEqual(day(1));
  });

  it("replays a reversed and re-entered Match at its re-entered time, after a Match that came in between", () => {
    const h = history();
    const [a, b, c, d] = ["a", "b", "c", "d"].map((name) =>
      h.player(name, { declared: "D2" }),
    ) as [string, string, string, string];
    const reEntered = h.match({
      at: day(5),
      slot1: [a, b],
      slot2: [c, d],
      outcome: "slot2",
    });
    const between = h.match({
      at: day(3),
      slot1: [a, c],
      slot2: [b, d],
      outcome: "slot1",
    });
    const replay = replayPadelLedger(h.ledger, "declared-band");
    expect(replayedEvent(replay, h.ledger, reEntered, a)).toMatchObject({
      muBefore: replayedEvent(replay, h.ledger, between, a).muAfter,
      lastRatedAtBefore: day(3),
    });
    expect(replay.ratings.get(a)?.lastRatedAt).toEqual(day(5));
  });

  it("uses a stored Reliability loss factor, and derives it once from reliability_part on an older event", () => {
    const h = history();
    const [a, b, c, d] = ["a", "b", "c", "d"].map((name) =>
      h.player(name, { declared: "D2" }),
    ) as [string, string, string, string];
    const stored = h.match({
      at: day(1),
      slot1: [a, b],
      slot2: [c, d],
      outcome: "slot1",
      stored: { c: { reliabilityLossFactor: 1.3 } },
    });
    const older = h.match({
      at: day(2),
      slot1: [a, b],
      slot2: [c, d],
      outcome: "slot1",
      stored: {
        d: { muBefore: 900, muAfter: 880, reliabilityPart: -5 },
      },
    });
    const replay = replayPadelLedger(h.ledger, "declared-band");

    const cEvent = replayedEvent(replay, h.ledger, stored, c);
    const dEvent = replayedEvent(replay, h.ledger, stored, d);
    const plain = dEvent.muAfter - dEvent.muBefore;
    expect(cEvent.reliabilityLossFactor).toBe(1.3);
    expect(cEvent.muAfter - cEvent.muBefore).toBeCloseTo(plain * 1.3, 9);
    expect(cEvent.reliabilityPart).toBeCloseTo(plain * 0.3, 9);
    expect(dEvent.reliabilityLossFactor).toBeNull();

    const derived = replayedEvent(replay, h.ledger, older, d);
    expect(derived.reliabilityLossFactor).toBeCloseTo(1 + 5 / 15, 12);
    expect(derived.reliabilityPart).not.toBeNull();
  });

  it("stands a Guest player in at the mean of the others", () => {
    const h = history();
    const [a, b, c] = ["a", "b", "c"].map((name) =>
      h.player(name, { declared: "D2" }),
    ) as [string, string, string];
    const ghost = h.player("ghost", { guest: true });
    const matchId = h.match({
      at: day(1),
      slot1: [a, ghost],
      slot2: [b, c],
      outcome: "slot1",
    });
    const replay = replayPadelLedger(h.ledger, "declared-band");
    const standIn = guestStandInState([D, D, D])!;
    const expected = rateDoublesMatch({
      slot1: [input(D), input(standIn)],
      slot2: [input(D), input(D)],
      outcome: "slot1",
      weight: 1,
      now: day(1),
    });
    expect(replayedEvent(replay, h.ledger, matchId, a).muAfter).toBe(
      expected.slot1[0].after.mu,
    );
    expect(replay.ratings.has(ghost)).toBe(false);
    expect(replay.anomalies).toEqual([]);
  });

  it("plays a seat with no rating event after an Unclaimed player merge as a Guest player, and reports it as RQ-6", () => {
    const h = history();
    const [a, b, c, survivor] = ["a", "b", "c", "survivor"].map((name) =>
      h.player(name, { declared: "D2" }),
    ) as [string, string, string, string];
    const matchId = h.match({
      at: day(1),
      slot1: [a, b],
      slot2: [c, survivor],
      outcome: "slot1",
      rated: [a, b, c],
    });
    const replay = replayPadelLedger(h.ledger, "declared-band");
    const standIn = guestStandInState([D, D, D])!;
    const expected = rateDoublesMatch({
      slot1: [input(D), input(D)],
      slot2: [input(D), input(standIn)],
      outcome: "slot1",
      weight: 1,
      now: day(1),
    });
    expect(replayedEvent(replay, h.ledger, matchId, c).muAfter).toBe(
      expected.slot2[0].after.mu,
    );
    expect(replay.ratings.get(survivor)?.mu).toBe(D.mu);
    expect(replay.anomalies).toContainEqual(
      expect.objectContaining({ rule: "RQ-6", userIds: [survivor] }),
    );
  });

  it("carries a drawn Match whose seats no longer fit over by its stored moves, and reports it as RQ-7", () => {
    const h = history();
    const [a, b, c, d, kicked] = ["a", "b", "c", "d", "kicked"].map((name) =>
      h.player(name, { declared: "D2" }),
    ) as [string, string, string, string, string];
    const matchId = h.match({
      at: day(1),
      slot1: [a, kicked],
      slot2: [c, d],
      outcome: "draw",
      teams: { slot1: [a, b], slot2: [c, d] },
      stored: {
        kicked: {
          muBefore: D.mu,
          muAfter: D.mu + 12,
          phiBefore: 150,
          phiAfter: 135,
          sigmaBefore: 0.06,
          sigmaAfter: 0.06,
        },
      },
    });
    const replay = replayPadelLedger(h.ledger, "declared-band");
    const carried = replayedEvent(replay, h.ledger, matchId, kicked);
    expect(carried.muBefore).toBe(D.mu);
    expect(carried.muAfter).toBe(D.mu + 12);
    expect(carried.phiAfter).toBeCloseTo(135, 9);
    expect(replay.anomalies).toContainEqual(
      expect.objectContaining({ rule: "RQ-7" }),
    );
  });

  it("rebuilds a decisive Match whose seats no longer fit from its scores, winners together", () => {
    const h = history();
    const [a, b, c, d, moved] = ["a", "b", "c", "d", "moved"].map((name) =>
      h.player(name, { declared: "D2" }),
    ) as [string, string, string, string, string];
    const matchId = h.match({
      at: day(1),
      slot1: [a, moved],
      slot2: [c, d],
      outcome: "slot1",
      teams: { slot1: [a, b], slot2: [c, d] },
    });
    const replay = replayPadelLedger(h.ledger, "declared-band");
    const expected = rateDoublesMatch({
      slot1: [input(D), input(D)],
      slot2: [input(D), input(D)],
      outcome: "slot1",
      weight: 1,
      now: day(1),
    });
    expect(replayedEvent(replay, h.ledger, matchId, moved).muAfter).toBe(
      expected.slot1[1].after.mu,
    );
    expect(replay.anomalies).toContainEqual(
      expect.objectContaining({ rule: "rebuilt-from-scores" }),
    );
  });

  it("applies the Prove-it rule to a declared C's losses until five Verified Group Matches, and never in the baseline", () => {
    const h = history();
    const carl = h.player("carl", { declared: "C2" });
    const [b, c, d] = ["b", "c", "d"].map((name) =>
      h.player(name, { declared: "C2" }),
    ) as [string, string, string];
    const play = (count: number, outcome: DoublesOutcome) =>
      h.match({
        at: day(count),
        slot1: [carl, b],
        slot2: [c, d],
        outcome,
        verified: count !== 2,
      });
    const matchIds = [1, 2, 3, 4, 5, 6].map((count) =>
      play(count, count % 2 === 1 ? "slot2" : "slot1"),
    );
    const confirmed = play(7, "slot2");

    const replay = replayPadelLedger(h.ledger, "declared-band");
    const baseline = replayPadelLedger(h.ledger, "baseline");
    const covered = (matchId: string) =>
      replayedEvent(replay, h.ledger, matchId, carl).proveItPart !== null;
    expect(matchIds.map(covered)).toEqual([
      true,
      false,
      true,
      false,
      true,
      false,
    ]);
    expect(covered(confirmed)).toBe(false);
    expect(
      replayedEvent(replay, h.ledger, matchIds[0]!, b).proveItPart,
    ).not.toBeNull();
    expect(replay.confirmations.get(carl)?.verifiedMatches).toBe(6);
    for (const matchId of [...matchIds, confirmed]) {
      expect(
        replayedEvent(baseline, h.ledger, matchId, carl).proveItPart,
      ).toBeNull();
    }
  });

  it("refuses a football row", () => {
    const h = history();
    h.player("a", { declared: "C2" });
    h.ledger.ratings[0]!.sport = "football";
    expect(() => replayPadelLedger(h.ledger, "declared-band")).toThrow(
      /football/,
    );
  });

  it("lists units at the same instant that share a player", () => {
    const h = history();
    const [a, b, c, d] = ["a", "b", "c", "d"].map((name) =>
      h.player(name, { declared: "D2" }),
    ) as [string, string, string, string];
    h.match({ at: day(1), slot1: [a, b], slot2: [c, d], outcome: "slot1" });
    h.override(a, day(1), 2.0);
    const replay = replayPadelLedger(h.ledger, "declared-band");
    expect(replay.anomalies).toContainEqual(
      expect.objectContaining({ rule: "same-instant", userIds: [a] }),
    );
  });
});

describe("the dry-run report", () => {
  function reportFor(h: ReturnType<typeof history>, replay?: PadelReplay) {
    return buildPadelReplayReport({
      host: "db.example",
      ledger: h.ledger,
      replay: replay ?? replayPadelLedger(h.ledger, "declared-band"),
      baseline: replayPadelLedger(h.ledger, "baseline"),
      upcoming: [],
      loadMs: 12.4,
      computeMs: 3.6,
    });
  }

  it("names each player placed by RQ-5, RQ-6 and RQ-7", () => {
    const h = history();
    const odd = h.player("Odd Start", { mu: 1600 });
    const [a, b, c, survivor, kicked] = [
      "a",
      "b",
      "c",
      "Merged Survivor",
      "Kicked Player",
    ].map((name) => h.player(name, { declared: "D2" })) as [
      string,
      string,
      string,
      string,
      string,
    ];
    h.match({
      at: day(1),
      slot1: [odd, a],
      slot2: [b, c],
      outcome: "slot1",
    });
    h.match({
      at: day(2),
      slot1: [a, b],
      slot2: [c, survivor],
      outcome: "slot1",
      rated: [a, b, c],
    });
    h.match({
      at: day(3),
      slot1: [a, kicked],
      slot2: [b, c],
      outcome: "draw",
      teams: { slot1: [a, odd], slot2: [b, c] },
    });
    const text = formatPadelReplayReport(reportFor(h)).join("\n");
    expect(text).toMatch(/\[RQ-5\] Odd Start \(Odd Start\)/);
    expect(text).toMatch(/\[RQ-6\] Merged Survivor/);
    expect(text).toMatch(/\[RQ-7\] .*Kicked Player/);
    expect(text).toContain("Loaded in 12 ms, computed in 4 ms.");
    expect(text).toContain("dry run against db.example");
  });

  it("fails the run when a player's confirmation would change", () => {
    const h = history();
    const [a, b, c, d] = ["a", "b", "c", "d"].map((name) =>
      h.player(name, { declared: "C2" }),
    ) as [string, string, string, string];
    h.match({ at: day(1), slot1: [a, b], slot2: [c, d], outcome: "slot1" });
    const replay = replayPadelLedger(h.ledger, "declared-band");
    expect(reportFor(h, replay).failed).toBe(false);

    replay.confirmations.set(a, { verifiedMatches: 5, overridden: false });
    const report = reportFor(h, replay);
    expect(report.failed).toBe(true);
    expect(report.confirmationChanges.map((row) => row.userId)).toEqual([a]);
    expect(formatPadelReplayReport(report).at(-1)).toMatch(/^FAILED/);
  });

  it("reports moves, band letter changes, players now outside an upcoming Game's Level range, and the CSV", () => {
    const h = history();
    const [a, b, c, d] = ["a", "b", "c", "d"].map((name) =>
      h.player(name, { declared: "C2" }),
    ) as [string, string, string, string];
    h.match({ at: day(1), slot1: [a, b], slot2: [c, d], outcome: "slot1" });
    h.ledger.ratings[0]!.mu = muFromLevel(5.0);
    h.ledger.ratings[0]!.levelBand = "B2";

    const report = buildPadelReplayReport({
      host: "db.example",
      ledger: h.ledger,
      replay: replayPadelLedger(h.ledger, "declared-band"),
      baseline: replayPadelLedger(h.ledger, "baseline"),
      upcoming: [
        { gameId: "game-1", userId: a, levelMinTenths: 45, levelMaxTenths: 55 },
      ],
      loadMs: 1,
      computeMs: 1,
    });
    expect(report.largestDown[0]?.userId).toBe(a);
    expect(report.moved).toBeGreaterThanOrEqual(1);
    expect(report.bandChanges.map((row) => row.userId)).toContain(a);
    expect(report.outsideLevelRange).toEqual([
      expect.objectContaining({
        userId: a,
        gameId: "game-1",
        wasOutside: false,
      }),
    ]);
    const csv = padelReplayCsv(report).trim().split("\n");
    expect(csv[0]).toMatch(/^user_id,name,start/);
    expect(csv).toHaveLength(5);
  });
});
