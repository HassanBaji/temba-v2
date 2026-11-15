import type { DbClient } from "@repo/db";
import {
  and,
  ilike,
  inArray,
  notInArray,
  or,
  sql,
  type SQL,
  type SQLWrapper,
} from "drizzle-orm";

import { user } from "@repo/db";
import { LOOKUP_QUERY_MIN_LENGTH } from "@repo/domain/invite-door";
import {
  assembleE164,
  DEFAULT_CALLING_COUNTRY_ISO,
} from "@repo/domain/phone-number";

import type { LookupUserSearchRow } from "#src/invites/doors/utils";
import { notUnclaimedUserSql } from "#src/unclaimed-players/is-unclaimed";

export const LOOKUP_USER_SEARCH_LIMIT = 20;

export type ClassifiedLookupQuery = {
  query: string;
  emailLike: boolean;
  phoneLike: boolean;
  phoneStripped: string | null;
  /** The lower-cased email the query is, matched only in full. */
  email: string | null;
  /** The E.164 numbers the query can be, matched only in full. */
  phoneCandidates: string[];
};

export type { LookupUserSearchRow } from "#src/invites/doors/utils";

const PHONE_SEPARATORS = /[\s()-]/g;

function e164Candidates(stripped: string): string[] {
  if (stripped.startsWith("+")) {
    return [stripped];
  }
  if (stripped.startsWith("00")) {
    return [`+${stripped.slice(2)}`];
  }
  const local = assembleE164(DEFAULT_CALLING_COUNTRY_ISO, stripped);
  return local.ok ? [`+${stripped}`, local.e164] : [`+${stripped}`];
}

export function classifyLookupQuery(raw: string): ClassifiedLookupQuery {
  const query = raw.trim();
  const emailLike = query.includes("@");
  const phoneStripped = query.replace(PHONE_SEPARATORS, "");
  const phoneLike = /^\+?\d+$/.test(phoneStripped) && phoneStripped.length >= 6;

  return {
    query,
    emailLike,
    phoneLike,
    phoneStripped: phoneLike ? phoneStripped : null,
    email: emailLike ? query.toLowerCase() : null,
    phoneCandidates: phoneLike ? e164Candidates(phoneStripped) : [],
  };
}

/** `%` and `_` in what someone typed are letters, not ILIKE wildcards. */
export function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

export function containsPattern(value: string) {
  return `%${escapeLikePattern(value)}%`;
}

export function normalizedPhoneSql(column: SQLWrapper) {
  return sql`regexp_replace(coalesce(${column}, ''), '[()[:space:]-]', '', 'g')`;
}

function normalizedStoredPhone(phoneNumber: string) {
  return phoneNumber.replace(PHONE_SEPARATORS, "");
}

/**
 * A full email or phone number, never part of one: a substring would let
 * anyone read contact details out of the search one character at a time.
 */
export function exactContactFilter(
  classified: ClassifiedLookupQuery,
  options: { email?: boolean } = {},
) {
  const filters: SQL[] = [];
  if ((options.email ?? true) && classified.email) {
    filters.push(sql`lower(${user.email}) = ${classified.email}`);
  }
  if (classified.phoneCandidates.length > 0) {
    filters.push(
      inArray(normalizedPhoneSql(user.phoneNumber), classified.phoneCandidates),
    );
  }
  return filters.length > 0 ? or(...filters) : undefined;
}

/**
 * Name or username by substring, email and phone only in full. With
 * `nameScopeUserIds`, only those Users can match by name.
 */
export function lookupUserTextFilter(
  classified: ClassifiedLookupQuery,
  options: { nameScopeUserIds?: readonly string[] } = {},
) {
  if (classified.query.length === 0) {
    return undefined;
  }

  const pattern = containsPattern(classified.query);
  const nameMatch = or(
    ilike(user.name, pattern),
    ilike(user.username, pattern),
  );
  const scope = options.nameScopeUserIds;
  const filters = [
    scope === undefined
      ? nameMatch
      : scope.length > 0
        ? and(inArray(user.id, [...scope]), nameMatch)
        : undefined,
    exactContactFilter(classified),
  ].filter((filter): filter is SQL => filter !== undefined);

  return filters.length > 0 ? or(...filters) : sql`false`;
}

export function presentLookupUserRow(
  row: {
    id: string;
    name: string;
    username: string | null;
    email: string | null;
    phoneNumber: string | null;
  },
  classified: ClassifiedLookupQuery,
  cue: string | null = null,
): LookupUserSearchRow {
  const typedEmail =
    classified.email !== null && row.email?.toLowerCase() === classified.email;
  const typedPhone =
    row.phoneNumber !== null &&
    classified.phoneCandidates.includes(normalizedStoredPhone(row.phoneNumber));
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    email: typedEmail ? row.email : null,
    phoneNumber: typedPhone ? row.phoneNumber : null,
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
      notUnclaimedUserSql,
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
    nameScopeUserIds?: readonly string[];
  },
): Promise<LookupUserSearchRow[]> {
  const classified = classifyLookupQuery(args.query);
  if (classified.query.length < LOOKUP_QUERY_MIN_LENGTH) {
    return [];
  }
  const textFilter = lookupUserTextFilter(classified, {
    nameScopeUserIds: args.nameScopeUserIds,
  });
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
