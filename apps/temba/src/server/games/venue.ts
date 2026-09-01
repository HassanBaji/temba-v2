import { TRPCError } from "@trpc/server";
import { eq, inArray } from "drizzle-orm";

import { communities, courts, groups, venues } from "@repo/db";

import { type db } from "~/server/db";
import { consult } from "~/server/soft-archive";
import { liveVenuesWhere } from "~/server/soft-archive/adapter";

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

    const archived = consult({ archivedAt: venue.archivedAt }).freeze(
      "catalog",
    );
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
    where: liveVenuesWhere(),
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
    courtIds?: string[];
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
    if (
      consult({ archivedAt: venue.archivedAt }).freeze("host") &&
      (input.courtId || (input.courtIds != null && input.courtIds.length > 0))
    ) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Skip Court when the linked Venue is Soft-archived",
      });
    }
  } else {
    const liveVenue = await database.query.venues.findFirst({
      where: liveVenuesWhere(),
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
    if (consult({ archivedAt: venue.archivedAt }).freeze("catalog")) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Venue must be a live Operator Venue",
      });
    }
  }

  const courtIds = [
    ...(input.courtId ? [input.courtId] : []),
    ...(input.courtIds ?? []),
  ];
  if (courtIds.length === 0) {
    return;
  }

  if (
    input.courtIds != null &&
    new Set(input.courtIds).size !== input.courtIds.length
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Duplicate courtIds",
    });
  }

  const uniqueCourtIds = [...new Set(courtIds)];
  const found = await database.query.courts.findMany({
    where: inArray(courts.id, uniqueCourtIds),
    columns: { id: true, venueId: true },
  });
  if (found.length !== uniqueCourtIds.length) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Court not found",
    });
  }
  if (found.some((court) => court.venueId !== input.venueId)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Court must belong to the selected Venue",
    });
  }
}
