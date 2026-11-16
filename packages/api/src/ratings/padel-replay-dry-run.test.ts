import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { ratingEvents, ratings } from "@repo/db/schema";
import { createPgliteDb } from "@repo/db/testing";

import {
  dryRunPadelReplay,
  formatPadelReplayReport,
  padelReplayDifferences,
  replayPadelLedger,
} from "#src/ratings/padel-replay";
import {
  asDb,
  at,
  insertUser,
  readLedger,
  tableChecksums,
  writeHistory,
} from "#src/ratings/padel-replay-history.test-support";

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
});

afterAll(() => {
  vi.useRealTimers();
});

describe("the padel Level recalculation dry run", () => {
  it("replays a history the live writers wrote under the Declared band rules to exactly what they stored", async () => {
    const { db: database, close } = await createPgliteDb();
    try {
      const { carl } = await writeHistory(database, "declared-band");
      const ledger = await readLedger(database);
      expect(ledger.events.length).toBeGreaterThan(30);
      expect(ledger.overrides).toHaveLength(4);
      expect(ledger.awards.length).toBeGreaterThanOrEqual(6);
      expect(ledger.events.some((row) => row.proveItPart != null)).toBe(true);
      expect(
        ledger.events.some((row) => row.reliabilityLossFactor != null),
      ).toBe(true);
      expect(new Set(ledger.events.map((row) => row.weight))).toEqual(
        new Set([1, 0.5]),
      );

      const replay = replayPadelLedger(ledger, "declared-band");
      expect(padelReplayDifferences(ledger, replay)).toEqual([]);
      expect(replay.anomalies).toEqual([]);
      expect(
        padelReplayDifferences(ledger, replayPadelLedger(ledger, "baseline"))
          .length,
      ).toBeGreaterThan(0);
      expect(replay.confirmations.get(carl)).toEqual({
        verifiedMatches: 8,
        overridden: true,
      });
    } finally {
      await close();
    }
  });

  it("reproduces every stored event in the baseline pass over a history written before the Declared band rules", async () => {
    const { db: database, close } = await createPgliteDb();
    try {
      await writeHistory(database, "before-declared-band");
      const ledger = await readLedger(database);
      const baseline = replayPadelLedger(ledger, "baseline");

      expect(
        padelReplayDifferences(ledger, baseline).filter(
          (row) =>
            !(row.table === "ratings" && row.columns.join() === "declaredBand"),
        ),
      ).toEqual([]);

      vi.setSystemTime(at(60));
      const report = await dryRunPadelReplay(asDb(database), {
        host: "pglite",
      });
      expect(report.baseline).toEqual({
        events: ledger.events.length,
        reproduced: ledger.events.length,
        withinTolerance: ledger.events.length,
      });
      expect(report.differences.rating_events).toBeGreaterThan(0);
      expect(report.confirmationChanges).toEqual([]);
      expect(report.failed).toBe(false);
    } finally {
      await close();
    }
  });

  it("writes nothing, never loads a football Rating, and prints its load and compute time", async () => {
    const { db: database, close } = await createPgliteDb();
    try {
      const { carl } = await writeHistory(database, "before-declared-band");
      const footballOnly = await insertUser(database, "striker");
      const anyMatch = await database.query.matches.findFirst();
      const football = {
        sport: "football" as const,
        mu: 1700,
        phi: 120,
        sigma: 0.06,
        levelBand: "C1" as const,
      };
      await database.insert(ratings).values([
        { userId: footballOnly, ...football },
        { userId: carl, ...football },
      ]);
      await database.insert(ratingEvents).values({
        userId: footballOnly,
        sport: "football",
        matchId: anyMatch!.id,
        outcomeScore: 1,
        weight: 1,
        muBefore: 1600,
        phiBefore: 130,
        sigmaBefore: 0.06,
        muAfter: 1700,
        phiAfter: 120,
        sigmaAfter: 0.06,
      });

      const ledger = await readLedger(database);
      for (const row of [
        ...ledger.ratings,
        ...ledger.events,
        ...ledger.overrides,
        ...ledger.awards,
      ]) {
        expect(row.sport).toBe("padel");
      }
      expect(ledger.ratings.some((row) => row.userId === footballOnly)).toBe(
        false,
      );

      vi.setSystemTime(at(60));
      const before = await tableChecksums(database);
      const report = await dryRunPadelReplay(asDb(database), {
        host: "pglite",
      });
      expect(await tableChecksums(database)).toEqual(before);

      expect(report.rows.some((row) => row.userId === footballOnly)).toBe(
        false,
      );
      expect(report.rows.filter((row) => row.userId === carl)).toHaveLength(1);
      expect(report.moved).toBeGreaterThan(0);
      expect(report.loadMs).toBeGreaterThanOrEqual(0);
      expect(report.computeMs).toBeGreaterThanOrEqual(0);
      const lines = formatPadelReplayReport(report);
      expect(lines[0]).toContain("pglite");
      expect(lines.at(-1)).toMatch(/^Loaded in \d+ ms, computed in \d+ ms\.$/);
      expect(lines.join("\n")).not.toContain(footballOnly);
    } finally {
      await close();
    }
  });
});
