import { TRPCError } from "@trpc/server";
import { eq, isNull } from "drizzle-orm";

import { communities, courts, groups, venues } from "@repo/db";

import { type db } from "~/server/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export type GameCreateGroupKind = "club" | "loose" | "none";

export type GameCreateVenueContext = {
  locked: boolean;
  groupKind: GameCreateGroupKind;
  linkedVenueId: string | null;
};

export type GameCreateVenueOption = {
  id: string;
  name: string;
  city: string;
  country: string;
  archivedAt: Date | null;
  courts: { id: string; name: string }[];
};

export async function loadGameCreateVenueContext(
  database: DbClient,
  groupId: string | undefined,
): Promise<GameCreateVenueContext> {
  if (!groupId) {
    return { locked: false, groupKind: "none", linkedVenueId: null };
  }

  const group = await database.query.groups.findFirst({
    where: eq(groups.id, groupId),
    columns: { id: true, communityId: true },
  });
  if (!group) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Group not found",
    });
  }
  if (!group.communityId) {
    return { locked: false, groupKind: "loose", linkedVenueId: null };
  }

  const community = await database.query.communities.findFirst({
    where: eq(communities.id, group.communityId),
    columns: { id: true, venueId: true },
  });
  if (!community?.venueId) {
    return { locked: false, groupKind: "club", linkedVenueId: null };
  }

  return {
    locked: true,
    groupKind: "club",
    linkedVenueId: community.venueId,
  };
}

export async function listVenuesForGameCreate(
  database: DbClient,
  groupId: string | undefined,
): Promise<{
  locked: boolean;
  groupKind: GameCreateGroupKind;
  venues: GameCreateVenueOption[];
}> {
  const context = await loadGameCreateVenueContext(database, groupId);

  if (context.locked && context.linkedVenueId) {
    const venue = await database.query.venues.findFirst({
      where: eq(venues.id, context.linkedVenueId),
      columns: {
        id: true,
        name: true,
        city: true,
        country: true,
        archivedAt: true,
      },
      with: {
        courts: {
          columns: { id: true, name: true },
          orderBy: (table, { asc }) => [asc(table.name), asc(table.id)],
        },
      },
    });
    if (!venue) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Venue not found",
      });
    }

    const archived = Boolean(venue.archivedAt);
    return {
      locked: true,
      groupKind: context.groupKind,
      venues: [
        {
          id: venue.id,
          name: venue.name,
          city: venue.city,
          country: venue.country,
          archivedAt: venue.archivedAt,
          courts: archived
            ? []
            : venue.courts.map((court) => ({ id: court.id, name: court.name })),
        },
      ],
    };
  }

  const rows = await database.query.venues.findMany({
    where: isNull(venues.archivedAt),
    columns: {
      id: true,
      name: true,
      city: true,
      country: true,
      archivedAt: true,
    },
    with: {
      courts: {
        columns: { id: true, name: true },
        orderBy: (table, { asc }) => [asc(table.name), asc(table.id)],
      },
    },
    orderBy: (table, { asc }) => [
      asc(table.name),
      asc(table.city),
      asc(table.country),
      asc(table.id),
    ],
  });

  return {
    locked: false,
    groupKind: context.groupKind,
    venues: rows.map((venue) => ({
      id: venue.id,
      name: venue.name,
      city: venue.city,
      country: venue.country,
      archivedAt: venue.archivedAt,
      courts: venue.courts.map((court) => ({ id: court.id, name: court.name })),
    })),
  };
}

export async function assertGameCreateVenueAndCourt(
  database: DbClient,
  input: {
    groupId: string | undefined;
    venueId: string;
    courtId: string | null | undefined;
  },
) {
  const context = await loadGameCreateVenueContext(database, input.groupId);
  const venue = await database.query.venues.findFirst({
    where: eq(venues.id, input.venueId),
    columns: { id: true, archivedAt: true },
  });

  if (context.locked) {
    if (!context.linkedVenueId || input.venueId !== context.linkedVenueId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Venue must be this Community’s linked Venue",
      });
    }
    if (!venue) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Venue not found",
      });
    }
    if (venue.archivedAt && input.courtId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Skip Court when the linked Venue is Soft-archived",
      });
    }
  } else {
    const liveVenue = await database.query.venues.findFirst({
      where: isNull(venues.archivedAt),
      columns: { id: true },
    });
    if (!liveVenue) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No live Venues. Create is not available.",
      });
    }
    if (!venue) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Venue not found",
      });
    }
    if (venue.archivedAt) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Venue must be a live Operator Venue",
      });
    }
  }

  if (!input.courtId) {
    return;
  }

  const court = await database.query.courts.findFirst({
    where: eq(courts.id, input.courtId),
    columns: { id: true, venueId: true },
  });
  if (!court) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Court not found",
    });
  }
  if (court.venueId !== input.venueId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Court must belong to the selected Venue",
    });
  }
}
