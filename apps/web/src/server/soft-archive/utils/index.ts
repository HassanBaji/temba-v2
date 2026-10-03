import type { db } from "~/server/db";
import type { TestDatabase } from "~/server/test/pglite";

type AppDb = typeof db;
type AppTx = Parameters<Parameters<AppDb["transaction"]>[0]>[0];

export type FreezeKind = "join" | "catalog" | "host";

export type Locator =
  | { communityId: string }
  | { clubGroupId: string }
  | { clubGroupGame: { groupId: string | null } }
  | { venueId: string };

export type SoftArchiveSnapshot = {
  archivedAt: Date | null;
};

export type SoftArchivePhase = "archived" | "live";

export type SoftArchiveView = {
  ok: true;
  phase: SoftArchivePhase;
  archivedAt: Date | null;
  freeze: (kind: FreezeKind) => boolean;
};

export type ConsultResult =
  | SoftArchiveView
  | { ok: false; reason: "not_found" };

export type CommitSubject = { communityId: string } | { venueId: string };

export type CommitResult =
  | {
      ok: true;
      phase: SoftArchivePhase;
      id: string;
      archivedAt: Date | null;
    }
  | {
      ok: false;
      reason: "not_found" | "already_archived" | "already_live";
    };

export type SoftArchiveDb = AppDb | AppTx | TestDatabase;
