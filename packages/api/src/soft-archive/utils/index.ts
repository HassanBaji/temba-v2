import type { DbClient, DbTx } from "@repo/db";

export type FreezeKind = "join" | "catalog" | "host";

export type Locator = { venueId: string };

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

export type CommitSubject = { venueId: string };

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

export type SoftArchiveDb = DbClient | DbTx;
