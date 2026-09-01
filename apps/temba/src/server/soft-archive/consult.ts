import { eq } from "drizzle-orm";

import { communities, groups, venues } from "@repo/db";

import type {
  ConsultResult,
  Locator,
  SoftArchiveDb,
  SoftArchiveSnapshot,
  SoftArchiveView,
} from "~/server/soft-archive/types";

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
  return consultLocator(databaseOrSnapshot as SoftArchiveDb, locator);
}

async function consultLocator(
  database: SoftArchiveDb,
  locator: Locator,
): Promise<ConsultResult> {
  if ("communityId" in locator) {
    return consultCommunity(database, locator.communityId);
  }
  if ("venueId" in locator) {
    return consultVenue(database, locator.venueId);
  }
  if ("clubGroupId" in locator) {
    const group = await database.query.groups.findFirst({
      where: eq(groups.id, locator.clubGroupId),
      columns: { id: true, communityId: true },
    });
    if (!group) {
      return { ok: false, reason: "not_found" };
    }
    if (!group.communityId) {
      return viewFromArchivedAt(null);
    }
    return consultCommunity(database, group.communityId);
  }

  if (locator.clubGroupGame.groupId == null) {
    return viewFromArchivedAt(null);
  }

  const group = await database.query.groups.findFirst({
    where: eq(groups.id, locator.clubGroupGame.groupId),
    columns: { id: true, communityId: true },
  });
  if (!group) {
    return { ok: false, reason: "not_found" };
  }
  if (!group.communityId) {
    return viewFromArchivedAt(null);
  }
  return consultCommunity(database, group.communityId);
}

async function consultCommunity(
  database: SoftArchiveDb,
  communityId: string,
): Promise<ConsultResult> {
  const community = await database.query.communities.findFirst({
    where: eq(communities.id, communityId),
    columns: { id: true, archivedAt: true },
  });
  if (!community) {
    return { ok: false, reason: "not_found" };
  }
  return viewFromArchivedAt(community.archivedAt);
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
