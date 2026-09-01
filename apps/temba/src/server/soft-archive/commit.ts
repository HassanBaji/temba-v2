import { eq } from "drizzle-orm";

import { communities, venues } from "@repo/db";

import { type db } from "~/server/db";
import { viewFromArchivedAt } from "~/server/soft-archive/consult";
import type {
  CommitResult,
  CommitSubject,
  SoftArchiveDb,
  SoftArchivePhase,
} from "~/server/soft-archive/utils";

function writeDb(database: SoftArchiveDb): typeof db {
  return database as typeof db;
}

export async function commit(
  database: SoftArchiveDb,
  subject: CommitSubject,
  phase: SoftArchivePhase,
  now = new Date(),
): Promise<CommitResult> {
  if ("communityId" in subject) {
    const community = await database.query.communities.findFirst({
      where: eq(communities.id, subject.communityId),
      columns: { id: true, archivedAt: true },
    });
    if (!community) {
      return { ok: false, reason: "not_found" };
    }
    const current = viewFromArchivedAt(community.archivedAt);
    if (current.phase === phase) {
      return {
        ok: false,
        reason: phase === "archived" ? "already_archived" : "already_live",
      };
    }
    const archivedAt = phase === "archived" ? now : null;
    const [updated] = await writeDb(database)
      .update(communities)
      .set({ archivedAt, updatedAt: now })
      .where(eq(communities.id, community.id))
      .returning({
        id: communities.id,
        archivedAt: communities.archivedAt,
      });
    if (!updated) {
      return { ok: false, reason: "not_found" };
    }
    return {
      ok: true,
      phase,
      id: updated.id,
      archivedAt: updated.archivedAt,
    };
  }

  const venue = await database.query.venues.findFirst({
    where: eq(venues.id, subject.venueId),
    columns: { id: true, archivedAt: true },
  });
  if (!venue) {
    return { ok: false, reason: "not_found" };
  }
  const current = viewFromArchivedAt(venue.archivedAt);
  if (current.phase === phase) {
    return {
      ok: false,
      reason: phase === "archived" ? "already_archived" : "already_live",
    };
  }
  const archivedAt = phase === "archived" ? now : null;
  const [updated] = await writeDb(database)
    .update(venues)
    .set({ archivedAt, updatedAt: now })
    .where(eq(venues.id, venue.id))
    .returning({
      id: venues.id,
      archivedAt: venues.archivedAt,
    });
  if (!updated) {
    return { ok: false, reason: "not_found" };
  }
  return {
    ok: true,
    phase,
    id: updated.id,
    archivedAt: updated.archivedAt,
  };
}
