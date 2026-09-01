import { and, ilike, inArray, notInArray, or, sql } from "drizzle-orm";

import { user } from "@repo/db";

import { type db } from "~/server/db";
import type { LookupUserSearchRow } from "~/server/invites/doors/utils";

type DbClient = typeof db;

export const LOOKUP_USER_SEARCH_LIMIT = 20;

export type ClassifiedLookupQuery = {
  query: string;
  emailLike: boolean;
  phoneLike: boolean;
  phoneStripped: string | null;
};

export type { LookupUserSearchRow } from "~/server/invites/doors/utils";

export function classifyLookupQuery(raw: string): ClassifiedLookupQuery {
  const query = raw.trim();
  const emailLike = query.includes("@");
  const phoneStripped = query.replace(/[\s()-]/g, "");
  const phoneLike = /^\+?\d+$/.test(phoneStripped) && phoneStripped.length >= 6;

  return {
    query,
    emailLike,
    phoneLike,
    phoneStripped: phoneLike ? phoneStripped : null,
  };
}

export function lookupUserTextFilter(classified: ClassifiedLookupQuery) {
  if (classified.query.length === 0) {
    return undefined;
  }

  const pattern = `%${classified.query}%`;
  const filters = [ilike(user.name, pattern), ilike(user.username, pattern)];

  if (classified.emailLike) {
    filters.push(ilike(user.email, pattern));
  }

  if (classified.phoneLike && classified.phoneStripped) {
    const phonePattern = `%${classified.phoneStripped}%`;
    filters.push(
      sql`regexp_replace(coalesce(${user.phoneNumber}, ''), '[()[:space:]-]', '', 'g') ilike ${phonePattern}`,
    );
  }

  return or(...filters);
}

export function presentLookupUserRow(
  row: {
    id: string;
    name: string;
    username: string | null;
    email: string;
    phoneNumber: string | null;
  },
  classified: ClassifiedLookupQuery,
  cue: string | null = null,
): LookupUserSearchRow {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    email: classified.emailLike ? row.email : null,
    phoneNumber: classified.phoneLike ? row.phoneNumber : null,
    cue,
  };
}

async function queryLookupUsers(
  database: DbClient,
  args: {
    textFilter: ReturnType<typeof lookupUserTextFilter>;
    excludeUserIds: string[];
    includeUserIds: string[] | null;
    limit: number;
  },
) {
  if (args.includeUserIds?.length === 0 || args.limit <= 0) {
    return [];
  }

  return database.query.user.findMany({
    where: and(
      args.includeUserIds
        ? inArray(user.id, args.includeUserIds)
        : args.excludeUserIds.length > 0
          ? notInArray(user.id, args.excludeUserIds)
          : undefined,
      args.textFilter,
    ),
    columns: {
      id: true,
      name: true,
      username: true,
      email: true,
      phoneNumber: true,
    },
    orderBy: (table, { asc }) => [asc(table.name), asc(table.username)],
    limit: args.limit,
  });
}

export async function searchLookupUsers(
  database: DbClient,
  args: {
    query: string;
    excludeUserIds: string[];
    includeUserIds?: string[];
    boostUserIds?: string[];
    boostCue?: string;
  },
): Promise<LookupUserSearchRow[]> {
  const classified = classifyLookupQuery(args.query);
  const textFilter = lookupUserTextFilter(classified);
  const excludeUserIds = [...new Set(args.excludeUserIds)];
  const includeUserIds = args.includeUserIds
    ? [...new Set(args.includeUserIds)].filter(
        (id) => !excludeUserIds.includes(id),
      )
    : null;

  if (includeUserIds?.length === 0) {
    return [];
  }

  const boostUserIds = [...new Set(args.boostUserIds ?? [])].filter((id) => {
    if (excludeUserIds.includes(id)) {
      return false;
    }
    if (includeUserIds && !includeUserIds.includes(id)) {
      return false;
    }
    return true;
  });

  if (boostUserIds.length > 0) {
    const boostedRows = await queryLookupUsers(database, {
      textFilter,
      excludeUserIds,
      includeUserIds: boostUserIds,
      limit: LOOKUP_USER_SEARCH_LIMIT,
    });
    const boosted = boostedRows.map((row) =>
      presentLookupUserRow(row, classified, args.boostCue ?? null),
    );
    const remaining = LOOKUP_USER_SEARCH_LIMIT - boosted.length;
    if (remaining <= 0) {
      return boosted;
    }
    const otherRows = await queryLookupUsers(database, {
      textFilter,
      excludeUserIds: [...excludeUserIds, ...boostUserIds],
      includeUserIds,
      limit: remaining,
    });
    return [
      ...boosted,
      ...otherRows.map((row) => presentLookupUserRow(row, classified)),
    ];
  }

  const rows = await queryLookupUsers(database, {
    textFilter,
    excludeUserIds,
    includeUserIds,
    limit: LOOKUP_USER_SEARCH_LIMIT,
  });

  return rows.map((row) => presentLookupUserRow(row, classified));
}
