import { and, ilike, notInArray, or, sql } from "drizzle-orm";

import { user } from "@repo/db";

import { type db } from "~/server/db";

type DbClient = typeof db;

export const LOOKUP_USER_SEARCH_LIMIT = 20;

export type ClassifiedLookupQuery = {
  query: string;
  emailLike: boolean;
  phoneLike: boolean;
  phoneStripped: string | null;
};

export type LookupUserSearchRow = {
  id: string;
  name: string;
  username: string | null;
  email: string | null;
  phoneNumber: string | null;
};

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
): LookupUserSearchRow {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    email: classified.emailLike ? row.email : null,
    phoneNumber: classified.phoneLike ? row.phoneNumber : null,
  };
}

export async function searchLookupUsers(
  database: DbClient,
  args: {
    query: string;
    excludeUserIds: string[];
  },
): Promise<LookupUserSearchRow[]> {
  const classified = classifyLookupQuery(args.query);
  const textFilter = lookupUserTextFilter(classified);
  const excludeUserIds = [...new Set(args.excludeUserIds)];

  const rows = await database.query.user.findMany({
    where: and(
      excludeUserIds.length > 0
        ? notInArray(user.id, excludeUserIds)
        : undefined,
      textFilter,
    ),
    columns: {
      id: true,
      name: true,
      username: true,
      email: true,
      phoneNumber: true,
    },
    orderBy: (table, { asc }) => [asc(table.name), asc(table.username)],
    limit: LOOKUP_USER_SEARCH_LIMIT,
  });

  return rows.map((row) => presentLookupUserRow(row, classified));
}
