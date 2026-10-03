import { and, eq, inArray } from "drizzle-orm";

import { communityMembers, CommunityRoleEnum, groups } from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { mayCreateGameOnGroup } from "~/server/games/access";
import type { TestDatabase } from "~/server/test/pglite";

type DbClient =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0]
  | TestDatabase;

export type CreateGroupOption = {
  id: string;
  name: string | null;
  communityName: string | null;
};

export async function listCreateGroups(
  database: DbClient,
  args: { userId: string },
): Promise<CreateGroupOption[]> {
  const createdRows = await database.query.groups.findMany({
    where: eq(groups.createdBy, args.userId),
    with: {
      community: {
        columns: { name: true },
      },
    },
  });

  const staffMemberships = await database.query.communityMembers.findMany({
    where: and(
      eq(communityMembers.userId, args.userId),
      inArray(communityMembers.role, [
        CommunityRoleEnum.OWNER,
        CommunityRoleEnum.ADMIN,
      ]),
    ),
    columns: { communityId: true },
  });

  const staffCommunityIds = staffMemberships.map(
    (membership) => membership.communityId,
  );
  const clubRows =
    staffCommunityIds.length === 0
      ? []
      : await database.query.groups.findMany({
          where: inArray(groups.communityId, staffCommunityIds),
          with: {
            community: {
              columns: { name: true },
            },
          },
        });

  const byId = new Map<string, (typeof createdRows)[number]>();
  for (const row of createdRows) {
    byId.set(row.id, row);
  }
  for (const row of clubRows) {
    byId.set(row.id, row);
  }

  const eligible: CreateGroupOption[] = [];
  for (const row of byId.values()) {
    if (!(await mayCreateGameOnGroup(database, row, args.userId))) {
      continue;
    }
    eligible.push({
      id: row.id,
      name: row.name,
      communityName: row.community?.name ?? null,
    });
  }

  eligible.sort((a, b) => {
    const nameCmp = (a.name ?? "").localeCompare(b.name ?? "");
    return nameCmp !== 0 ? nameCmp : a.id.localeCompare(b.id);
  });
  return eligible;
}

export const listCreateGroupsProcedure = protectedProcedure.query(
  async ({ ctx }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return listCreateGroups(ctx.db, { userId: appUser.id });
  },
);
