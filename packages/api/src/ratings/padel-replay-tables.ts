import { sql, type SQL } from "drizzle-orm";

import type { DbTx, RatingReplayTable } from "@repo/db";

import type { PadelReplay } from "#src/ratings/padel-replay";

type ColumnType = "float8" | "timestamp" | "rating_level_band";

export type WriteValue = string | number | Date | null;

export type WriteRow = Record<string, WriteValue>;

type ReplayTable<Columns extends string> = {
  /** The column each replayed row is matched on: a Rating by its User, unique per sport. */
  key: "user_id" | "id";
  /** The columns a Level recalculation writes (ADR-0100), with their SQL types. */
  columns: Record<Columns, ColumnType>;
  /** Whether the write also stamps `updated_at`, which a later writer may move. */
  stampsUpdatedAt: boolean;
  replayed: (
    replay: PadelReplay,
    rowId: string,
  ) => Record<Columns, WriteValue> | undefined;
};

/** Checks that a table's replayed values name exactly its columns. */
function replayTable<Columns extends string>(
  table: ReplayTable<Columns>,
): ReplayTable<string> {
  return table;
}

/** The four tables a Level recalculation writes, each with what it writes. */
export const REPLAY_TABLES: Record<RatingReplayTable, ReplayTable<string>> = {
  ratings: replayTable({
    key: "user_id",
    columns: {
      mu: "float8",
      phi: "float8",
      sigma: "float8",
      level_band: "rating_level_band",
      last_rated_at: "timestamp",
      declared_band: "rating_level_band",
    },
    stampsUpdatedAt: true,
    replayed: (replay, userId) => {
      const rating = replay.ratings.get(userId);
      return (
        rating && {
          mu: rating.mu,
          phi: rating.phi,
          sigma: rating.sigma,
          level_band: rating.levelBand,
          last_rated_at: rating.lastRatedAt,
          declared_band: rating.declaredBand,
        }
      );
    },
  }),
  rating_events: replayTable({
    key: "id",
    columns: {
      mu_before: "float8",
      phi_before: "float8",
      sigma_before: "float8",
      mu_after: "float8",
      phi_after: "float8",
      sigma_after: "float8",
      level_band_before: "rating_level_band",
      last_rated_at_before: "timestamp",
      reliability_part: "float8",
      prove_it_part: "float8",
      reliability_loss_factor: "float8",
    },
    stampsUpdatedAt: false,
    replayed: (replay, id) => {
      const event = replay.events.get(id);
      return (
        event && {
          mu_before: event.muBefore,
          phi_before: event.phiBefore,
          sigma_before: event.sigmaBefore,
          mu_after: event.muAfter,
          phi_after: event.phiAfter,
          sigma_after: event.sigmaAfter,
          level_band_before: event.levelBandBefore,
          last_rated_at_before: event.lastRatedAtBefore,
          reliability_part: event.reliabilityPart,
          prove_it_part: event.proveItPart,
          reliability_loss_factor: event.reliabilityLossFactor,
        }
      );
    },
  }),
  king_place_awards: replayTable({
    key: "id",
    columns: {
      field_mu: "float8",
      field_phi: "float8",
      mu_before: "float8",
      phi_before: "float8",
      sigma_before: "float8",
      mu_after: "float8",
      phi_after: "float8",
      sigma_after: "float8",
      level_band_before: "rating_level_band",
      last_rated_at_before: "timestamp",
    },
    stampsUpdatedAt: false,
    replayed: (replay, id) => {
      const award = replay.awards.get(id);
      return (
        award && {
          field_mu: award.fieldMu,
          field_phi: award.fieldPhi,
          mu_before: award.muBefore,
          phi_before: award.phiBefore,
          sigma_before: award.sigmaBefore,
          mu_after: award.muAfter,
          phi_after: award.phiAfter,
          sigma_after: award.sigmaAfter,
          level_band_before: award.levelBandBefore,
          last_rated_at_before: award.lastRatedAtBefore,
        }
      );
    },
  }),
  level_overrides: replayTable({
    key: "id",
    columns: {
      mu_before: "float8",
      phi_before: "float8",
      sigma_before: "float8",
      level_band_before: "rating_level_band",
      phi_after: "float8",
      sigma_after: "float8",
    },
    stampsUpdatedAt: false,
    replayed: (replay, id) => {
      const override = replay.overrides.get(id);
      return (
        override && {
          mu_before: override.muBefore,
          phi_before: override.phiBefore,
          sigma_before: override.sigmaBefore,
          level_band_before: override.levelBandBefore,
          phi_after: override.phiAfter,
          sigma_after: override.sigmaAfter,
        }
      );
    },
  }),
};

export const REPLAY_TABLE_NAMES = Object.keys(
  REPLAY_TABLES,
) as RatingReplayTable[];

const UPDATED_AT = "updated_at";

/** One number per replay table. */
export function perReplayTable(
  count: (table: RatingReplayTable) => number,
): Record<RatingReplayTable, number> {
  return Object.fromEntries(
    REPLAY_TABLE_NAMES.map((table) => [table, count(table)]),
  ) as Record<RatingReplayTable, number>;
}

/** The columns a write sets: those it replays, then `updated_at` where it stamps it. */
export function setColumns(
  table: RatingReplayTable,
): Record<string, ColumnType> {
  const { columns, stampsUpdatedAt } = REPLAY_TABLES[table];
  return stampsUpdatedAt ? { ...columns, [UPDATED_AT]: "timestamp" } : columns;
}

/** The replayed row for one stored row, keyed as the write matches it. */
export function replayedRow(
  table: RatingReplayTable,
  rowId: string,
  replay: PadelReplay,
  appliedAt: Date,
): WriteRow {
  const { key, replayed, stampsUpdatedAt } = REPLAY_TABLES[table];
  const values = replayed(replay, rowId);
  if (!values) {
    throw new Error(`The padel replay has no value for ${table} ${rowId}`);
  }
  return {
    [key]: rowId,
    ...values,
    ...(stampsUpdatedAt ? { [UPDATED_AT]: appliedAt } : {}),
  };
}

/** The replayed columns of row `alias` as one jsonb object, as the run wrote them and as a restore reads them back. */
export function writtenObject(table: RatingReplayTable, alias: string): SQL {
  return sql`jsonb_build_object(${sql.join(
    Object.keys(REPLAY_TABLES[table].columns).map(
      (column) =>
        sql`${column}::text, ${sql.identifier(alias)}.${sql.identifier(column)}`,
    ),
    sql`, `,
  )})`;
}

const LOCK_TIMEOUT = "5s";

/** Takes the lock every padel rating writer waits on, before anything is read. */
export async function lockRatings(tx: DbTx) {
  await tx.execute(sql.raw(`set local lock_timeout = '${LOCK_TIMEOUT}'`));
  await tx.execute(sql`lock table ratings in exclusive mode`);
}
