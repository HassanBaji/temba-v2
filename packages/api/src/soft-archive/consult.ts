import { eq } from "drizzle-orm";

import { venues } from "@repo/db";

import type {
  ConsultResult,
  Locator,
  SoftArchiveDb,
  SoftArchiveSnapshot,
  SoftArchiveView,
} from "#src/soft-archive/utils";

export function viewFromArchivedAt(archivedAt: Date | null): SoftArchiveView {
  const archived = archivedAt != null;
  return {
    ok: true,
    phase: archived ? "archived" : "live",
    archivedAt,
    freeze: () => archived,
  };
}

export function consult(snapshot: SoftArchiveSnapshot): SoftArchiveView;
export function consult(
  database: SoftArchiveDb,
  locator: Locator,
): Promise<ConsultResult>;
export function consult(
  databaseOrSnapshot: SoftArchiveDb | SoftArchiveSnapshot,
  locator?: Locator,
): SoftArchiveView | Promise<ConsultResult> {
  if (locator === undefined) {
    return viewFromArchivedAt(
      (databaseOrSnapshot as SoftArchiveSnapshot).archivedAt,
    );
  }
  return consultVenue(databaseOrSnapshot as SoftArchiveDb, locator.venueId);
}

async function consultVenue(
  database: SoftArchiveDb,
  venueId: string,
): Promise<ConsultResult> {
  const venue = await database.query.venues.findFirst({
    where: eq(venues.id, venueId),
    columns: { id: true, archivedAt: true },
  });
  if (!venue) {
    return { ok: false, reason: "not_found" };
  }
  return viewFromArchivedAt(venue.archivedAt);
}
