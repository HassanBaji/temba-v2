import { and, eq, isNotNull, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  gamePlayers,
  gameTeamPlayers,
  games,
  groupMembers,
  groupSeasons,
  groups,
  groupTierEvents,
  groupTierPoints,
  matches,
  notifications,
  ratingEvents,
  ratingReplayBackups,
  ratingReplayRuns,
  ratings,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";
import { groupSeasonWindow } from "@repo/domain/group-season";
import {
  formatPadelLevel,
  INITIAL_PHI,
  initialRatingFromChoice,
  levelFromMu,
} from "@repo/domain/level";
import { displayLabelFromStoredBand } from "@repo/domain/level-bands";

import { resetJobSink, setJobSink } from "#src/jobs/enqueue";
import { RecordingJobSink } from "#src/jobs/job-sink.test-support";

import { applyKingPlaceAwards } from "#src/ratings/apply-king-place-awards";
import {
  applyPadelReplay,
  padelReplayDifferences,
  replayPadelLedger,
  restorePadelReplay,
  type PadelLedger,
} from "#src/ratings/padel-replay";
import {
  asDb,
  at,
  insertGame,
  insertUser,
  override,
  ratedMatch,
  readLedger,
  seatTeam,
  tableChecksums,
  writeHistory,
} from "#src/ratings/padel-replay-history.test-support";
import { reportWrongScore } from "#src/routers/games/reportWrongScore";
import { ratingHistory } from "#src/routers/ratings/history";
import { seasonStanding } from "#src/routers/groups/seasonStanding";
import { standingLevels } from "#src/routers/groups/standingLevels";

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
});

afterAll(() => {
  vi.useRealTimers();
});

const TABLES = [
  "ratings",
  "rating_events",
  "king_place_awards",
  "level_overrides",
] as const;

type History = Awaited<ReturnType<typeof writeHistory>>;

async function withHistory(
  run: (database: TestDatabase, history: History) => Promise<void>,
) {
  const { db: database, close } = await createPgliteDb();
  try {
    const history = await writeHistory(database, "before-declared-band");
    await run(database, history);
  } finally {
    await close();
  }
}

function apply(database: TestDatabase, carryUnplaced = false) {
  return applyPadelReplay(asDb(database), {
    host: "pglite",
    carryUnplaced,
    now: at(60),
  });
}

async function applied(database: TestDatabase) {
  const result = await apply(database);
  if (result.kind !== "applied") {
    throw new Error(`Expected an applied run, got ${result.kind}`);
  }
  return result;
}

/** Every row of a table as JSON text, by id. */
async function rowsById(database: TestDatabase, table: string) {
  const result = await database.execute<{ id: string; row: string }>(
    sql.raw(`select id, to_jsonb(t)::text as row from "${table}" t`),
  );
  return new Map(result.rows.map((row) => [row.id, row.row]));
}

async function footballChecksums(database: TestDatabase) {
  const sums: Record<string, string> = {};
  for (const table of ["ratings", "rating_events"]) {
    const result = await database.execute<{ sum: string }>(
      sql.raw(
        `select md5(string_agg(t::text, '|' order by t::text)) as sum from "${table}" t where sport = 'football'`,
      ),
    );
    sums[table] = result.rows[0]?.sum ?? "";
  }
  return sums;
}

/**
 * Every table but the four the recalculation writes, its own two and the
 * Notifications it tells players by, plus the football rows of those four.
 */
async function untouchedChecksums(database: TestDatabase) {
  const sums = await tableChecksums(database);
  for (const table of [
    ...TABLES,
    "rating_replay_runs",
    "rating_replay_backups",
    "notifications",
  ]) {
    delete sums[table];
  }
  return { ...sums, football: await footballChecksums(database) };
}

async function addFootballAndTier(database: TestDatabase, history: History) {
  const striker = await insertUser(database, "striker");
  const football = {
    sport: "football" as const,
    mu: 1700,
    phi: 120,
    sigma: 0.06,
    levelBand: "C1" as const,
  };
  await database.insert(ratings).values([
    { userId: striker, ...football },
    { userId: history.carl, ...football },
  ]);
  await database.insert(ratingEvents).values({
    userId: striker,
    sport: "football",
    matchId: history.last.match.id,
    outcomeScore: 1,
    weight: 1,
    muBefore: 1600,
    phiBefore: 130,
    sigmaBefore: 0.06,
    muAfter: 1700,
    phiAfter: 120,
    sigmaAfter: 0.06,
  });
  const [crew] = await database
    .insert(groups)
    .values({ name: "Five a side", createdBy: striker, sport: "football" })
    .returning({ id: groups.id });
  await database
    .insert(groupTierPoints)
    .values({ groupId: crew!.id, userId: history.carl, points: 1260 });
  await database.insert(groupTierEvents).values({
    groupId: crew!.id,
    userId: history.carl,
    kind: "adjustment",
    pointsBefore: 1200,
    pointsAfter: 1260,
    setByUserId: striker,
  });
}

async function verifiedGroupMatchCounts(database: TestDatabase) {
  const rows = await database
    .select({ userId: ratingEvents.userId, matchId: ratingEvents.matchId })
    .from(ratingEvents)
    .innerJoin(matches, eq(matches.id, ratingEvents.matchId))
    .innerJoin(games, eq(games.id, matches.gameId))
    .where(and(eq(ratingEvents.sport, "padel"), isNotNull(games.groupId)));
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.userId, (counts.get(row.userId) ?? 0) + 1);
  }
  return counts;
}

/** Each padel Level as the Apps show it: two decimals and the band letter. */
async function shownLevels(database: TestDatabase) {
  const rows = await database
    .select({
      userId: ratings.userId,
      mu: ratings.mu,
      levelBand: ratings.levelBand,
    })
    .from(ratings)
    .where(eq(ratings.sport, "padel"));
  return new Map(
    rows.map((row) => [
      row.userId,
      `${formatPadelLevel(levelFromMu(row.mu), 2)} ${displayLabelFromStoredBand(row.levelBand)}`,
    ]),
  );
}

async function recalculatedNotifications(database: TestDatabase) {
  return database
    .select()
    .from(notifications)
    .where(eq(notifications.type, "level_recalculated"))
    .orderBy(notifications.recipientUserId);
}

async function historyLines(database: TestDatabase, userId: string) {
  const { entries } = await ratingHistory(asDb(database), {
    userId,
    sport: "padel",
    ladder: "all",
    limit: 100,
  });
  return entries.map((entry) => `${entry.kind}:${entry.id}`);
}

async function reliabilities(database: TestDatabase) {
  return database
    .select({
      userId: ratings.userId,
      sport: ratings.sport,
      reliability: ratings.reliability,
    })
    .from(ratings)
    .orderBy(ratings.userId, ratings.sport);
}

describe("applying the padel Level recalculation", () => {
  it("writes exactly what the dry run reported, only to the rows that differ, and backs each one up", async () => {
    await withHistory(async (database, history) => {
      await addFootballAndTier(database, history);
      const ledger = await readLedger(database);
      const replay = replayPadelLedger(ledger, "declared-band");
      const differences = padelReplayDifferences(ledger, replay);
      expect(differences.length).toBeGreaterThan(0);

      const before = new Map(
        await Promise.all(
          TABLES.map(
            async (table) => [table, await rowsById(database, table)] as const,
          ),
        ),
      );
      const untouched = await untouchedChecksums(database);
      const reliability = await reliabilities(database);
      const verifiedCounts = await verifiedGroupMatchCounts(database);
      const ratingIdByUser = new Map(
        (
          await database
            .select({ id: ratings.id, userId: ratings.userId })
            .from(ratings)
            .where(eq(ratings.sport, "padel"))
        ).map((row) => [row.userId, row.id]),
      );

      const result = await applied(database);

      expect(
        padelReplayDifferences(await readLedger(database), replay),
      ).toEqual([]);
      const backups = await database.select().from(ratingReplayBackups);
      expect(new Set(backups.map((row) => row.runId))).toEqual(
        new Set([result.runId]),
      );
      for (const table of TABLES) {
        const expected = differences
          .filter((row) => row.table === table)
          .map((row) =>
            table === "ratings" ? ratingIdByUser.get(row.rowId) : row.rowId,
          )
          .sort();
        const earlier = before.get(table)!;
        const now = await rowsById(database, table);
        const changed = [...earlier]
          .filter(([id, row]) => now.get(id) !== row)
          .map(([id]) => id)
          .sort();
        expect(changed).toEqual(expected);
        const backedUp = backups.filter((row) => row.tableName === table);
        expect(backedUp.map((row) => row.rowId).sort()).toEqual(expected);
        for (const backup of backedUp) {
          expect(backup.row).toEqual(JSON.parse(earlier.get(backup.rowId)!));
        }
        expect(result.summary.changed[table]).toBe(expected.length);
      }

      expect(await untouchedChecksums(database)).toEqual(untouched);
      expect(await reliabilities(database)).toEqual(reliability);
      expect(await verifiedGroupMatchCounts(database)).toEqual(verifiedCounts);
      expect(result.report.confirmationChanges).toEqual([]);
    });
  });

  it("writes nothing and records no run the second time, and a restore returns every table but the Notifications to its bytes", async () => {
    await withHistory(async (database) => {
      const { notifications: _, ...before } = await tableChecksums(database);
      const first = await applied(database);
      const afterApply = await tableChecksums(database);

      const second = await apply(database);
      expect(second.kind).toBe("unchanged");
      expect(await tableChecksums(database)).toEqual(afterApply);
      expect(await database.$count(ratingReplayRuns)).toBe(1);

      expect(
        await restorePadelReplay(asDb(database), { runId: first.runId }),
      ).toEqual({ kind: "restored", restored: first.summary.changed });
      const { notifications: kept, ...restored } =
        await tableChecksums(database);
      expect(restored).toEqual(before);
      expect(kept).toBe(afterApply.notifications);
    });
  });

  it("tells each account holder whose shown Level or band letter changed once, in the app only, and no one else", async () => {
    await withHistory(async (database, h) => {
      const uma = await insertUser(database, "uma", { unclaimed: true });
      vi.setSystemTime(at(53, 1));
      await database.insert(ratings).values({
        userId: uma,
        sport: "padel",
        ...initialRatingFromChoice("C2", "padel"),
        phi: INITIAL_PHI,
        selfDeclaredAt: at(53, 1),
      });
      await ratedMatch(database, h.w, {
        where: "club",
        slot1: [uma, h.dina],
        slot2: [h.cleo, h.bert],
        outcome: "slot2",
        when: at(54),
      });
      const shownBefore = await shownLevels(database);
      const linesBefore = new Map(
        await Promise.all(
          [...shownBefore.keys()].map(
            async (userId) =>
              [userId, await historyLines(database, userId)] as const,
          ),
        ),
      );
      expect(await recalculatedNotifications(database)).toEqual([]);

      const jobs = new RecordingJobSink();
      setJobSink(jobs);
      const result = await applied(database).finally(resetJobSink);

      const shownAfter = await shownLevels(database);
      const changed = [...shownBefore]
        .filter(([userId, shown]) => shownAfter.get(userId) !== shown)
        .map(([userId]) => userId);
      expect(changed).toContain(uma);
      expect(shownBefore.has(h.ghost)).toBe(false);
      const expected = changed.filter((userId) => userId !== uma).sort();
      expect(expected.length).toBeGreaterThan(0);

      const told = await recalculatedNotifications(database);
      expect(told.map((row) => row.recipientUserId)).toEqual(expected);
      expect([...result.report.told].sort()).toEqual(expected);
      for (const row of told) {
        expect(row).toMatchObject({
          audience: "player",
          emailedAt: at(60),
          readAt: null,
          gameId: null,
          groupId: null,
          dedupeKey: `level_recalculated:${result.runId}`,
        });
      }
      expect(jobs.added).toEqual([]);
      for (const [userId, lines] of linesBefore) {
        expect(await historyLines(database, userId)).toEqual(lines);
      }

      expect((await apply(database)).kind).toBe("unchanged");
      expect(await recalculatedNotifications(database)).toEqual(told);

      expect(
        (await restorePadelReplay(asDb(database), { runId: result.runId }))
          .kind,
      ).toBe("restored");
      expect(await recalculatedNotifications(database)).toEqual(told);
    });
  });

  const laterWrites: [
    string,
    (database: TestDatabase, h: History) => Promise<unknown>,
  ][] = [
    [
      "a padel Rated Match",
      (database, h) =>
        ratedMatch(database, h.w, {
          where: "club",
          slot1: [h.dina, h.dana],
          slot2: [h.cleo, h.bert],
          outcome: "slot1",
          when: at(61),
        }),
    ],
    [
      "a Level override",
      (database, h) => override(database, h.w, h.una, 2, at(61)),
    ],
    [
      "a Place award",
      async (database, h) => {
        vi.setSystemTime(at(61));
        const king = await insertGame(database, h.w, "club");
        await seatTeam(database, king.id, [h.dina, h.una], {
          startCourt: 1,
          finalPlace: 1,
        });
        await seatTeam(database, king.id, [h.cleo, h.bert], {
          startCourt: 1,
          finalPlace: 2,
        });
        await database.transaction((tx) =>
          applyKingPlaceAwards(
            tx as unknown as Parameters<typeof applyKingPlaceAwards>[0],
            king,
            at(61),
          ),
        );
      },
    ],
  ];

  it.each(laterWrites)(
    "refuses to restore once %s is written after the run",
    async (_label, write) => {
      await withHistory(async (database, history) => {
        const run = await applied(database);
        await write(database, history);
        const afterWrite = await tableChecksums(database);

        const result = await restorePadelReplay(asDb(database), {
          runId: run.runId,
        });
        expect(result.kind).toBe("refused");
        expect(await tableChecksums(database)).toEqual(afterWrite);
      });
    },
  );

  it("refuses while a row cannot be recomputed, unless told to carry it over", async () => {
    await withHistory(async (database, history) => {
      const [seat] = await database
        .select({ id: gamePlayers.id })
        .from(gamePlayers)
        .innerJoin(
          gameTeamPlayers,
          eq(gameTeamPlayers.gamePlayerId, gamePlayers.id),
        )
        .where(
          and(
            eq(gamePlayers.gameId, history.drawn.game.id),
            eq(gamePlayers.userId, history.una),
          ),
        );
      await database
        .update(gamePlayers)
        .set({ userId: history.nora })
        .where(eq(gamePlayers.id, seat!.id));
      const before = await tableChecksums(database);

      const refused = await apply(database);
      expect(refused.kind).toBe("refused");
      expect(refused.kind === "refused" && refused.reason).toContain(
        "--carry-unplaced",
      );
      expect(await tableChecksums(database)).toEqual(before);

      const carried = await apply(database, true);
      expect(
        carried.kind === "applied" && carried.summary.carriedUnplaced,
      ).toBe(4);
      expect((await apply(database, true)).kind).toBe("unchanged");
      expect(await database.$count(ratingReplayRuns)).toBe(1);
    });
  });

  it("makes a Rated Match completed during the apply wait for it, then rates it on the replayed Ratings", async () => {
    await withHistory(async (database, h) => {
      const ledger = await readLedger(database);
      const replay = replayPadelLedger(ledger, "declared-band");

      const [result, match] = await Promise.all([
        apply(database),
        ratedMatch(database, h.w, {
          where: "club",
          slot1: [h.dina, h.dana],
          slot2: [h.cleo, h.bert],
          outcome: "slot2",
          when: at(61),
        }),
      ]);

      expect(result.kind === "applied" && result.summary.ledger.events).toBe(
        ledger.events.length,
      );
      const events = await database
        .select()
        .from(ratingEvents)
        .where(eq(ratingEvents.matchId, match.match.id));
      expect(events).toHaveLength(4);
      for (const event of events) {
        expect(event.muBefore).toBe(replay.ratings.get(event.userId)?.mu);
      }
      const now = await readLedger(database);
      expect(
        padelReplayDifferences(now, replayPadelLedger(now, "declared-band")),
      ).toEqual([]);
    });
  });

  it("lets a wrong score reported after the apply restore the replayed before-values", async () => {
    await withHistory(async (database, h) => {
      const ledger = await readLedger(database);
      const replay = replayPadelLedger(ledger, "declared-band");
      await applied(database);

      vi.setSystemTime(at(61));
      await reportWrongScore(asDb(database), {
        gameId: h.last.game.id,
        matchId: h.last.match.id,
        userId: h.w.organizer,
      });

      const lastEvents = ledger.events.filter(
        (event) => event.matchId === h.last.match.id,
      );
      expect(lastEvents).toHaveLength(4);
      for (const event of lastEvents) {
        const rating = await database.query.ratings.findFirst({
          where: and(
            eq(ratings.userId, event.userId),
            eq(ratings.sport, "padel"),
          ),
        });
        const state = {
          mu: rating?.mu,
          phi: rating?.phi,
          sigma: rating?.sigma,
          levelBand: rating?.levelBand,
          lastRatedAt: rating?.lastRatedAt,
        };
        if (event.userId === h.carl) {
          // His Level override came after the Match, so it stays his baseline.
          const kept = replay.ratings.get(h.carl)!;
          expect(state).toEqual({
            mu: kept.mu,
            phi: kept.phi,
            sigma: kept.sigma,
            levelBand: kept.levelBand,
            lastRatedAt: kept.lastRatedAt,
          });
          continue;
        }
        const replayed = replay.events.get(event.id)!;
        expect(state).toEqual({
          mu: replayed.muBefore,
          phi: replayed.phiBefore,
          sigma: replayed.sigmaBefore,
          levelBand: replayed.levelBandBefore,
          lastRatedAt: replayed.lastRatedAtBefore,
        });
      }
    });
  });

  it("re-reads a closed Season's By level and Most improved from the replayed ledger, and keeps its places and points", async () => {
    await withHistory(async (database, h) => {
      const members = [
        h.w.organizer,
        h.dina,
        h.dana,
        h.cleo,
        h.carl,
        h.cora,
        h.bert,
        h.una,
        h.nora,
      ];
      await database
        .insert(groupMembers)
        .values(members.map((userId) => ({ groupId: h.w.clubId, userId })));
      const [season] = await database
        .insert(groupSeasons)
        .values({
          groupId: h.w.clubId,
          name: "June",
          startsOn: "2026-06-01",
          endsOn: "2026-06-20",
          createdBy: h.w.organizer,
        })
        .returning();
      const read = {
        groupId: h.w.clubId,
        seasonId: season!.id,
        userId: h.w.organizer,
        now: at(60),
      };
      const levelsBefore = await standingLevels(asDb(database), read);
      const standingBefore = await seasonStanding(asDb(database), read);

      await applied(database);

      const levels = await standingLevels(asDb(database), read);
      expect(await seasonStanding(asDb(database), read)).toEqual(
        standingBefore,
      );
      expect(levels.ladder).toBe("level");
      expect(levels.members).not.toEqual(levelsBefore.members);

      const ledger: PadelLedger = await readLedger(database);
      const window = groupSeasonWindow(season!);
      const face = (mu: number) =>
        Math.round(Math.max(1, levelFromMu(mu)) * 100);
      const changes = [
        ...ledger.events.map((row) => ({ ...row, fromGame: true })),
        ...ledger.awards.map((row) => ({ ...row, fromGame: true })),
        ...ledger.overrides.map((row) => ({ ...row, fromGame: false })),
      ].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      for (const member of levels.members) {
        const own = changes.filter((row) => row.userId === member.userId);
        const rating = ledger.ratings.find(
          (row) => row.userId === member.userId,
        )!;
        const afterClose = own.find(
          (row) => row.createdAt >= window.endExclusive,
        );
        const gained = own
          .filter(
            (row) =>
              row.fromGame &&
              row.createdAt > window.start &&
              row.createdAt < window.endExclusive,
          )
          .reduce(
            (sum, row) => sum + face(row.muAfter) - face(row.muBefore),
            0,
          );
        expect(member.end).toBe(face(afterClose?.muBefore ?? rating.mu));
        expect((member.end ?? 0) - (member.start ?? 0)).toBe(gained);
      }
    });
  });
});
