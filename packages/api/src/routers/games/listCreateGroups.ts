import type { DbClient, DbTx } from "@repo/db";
import { and, count, eq, inArray, isNull } from "drizzle-orm";

import { groupMembers, groups, teams } from "@repo/db";

import { sportOrDefault, type Sport } from "@repo/domain/sport";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { mayCreateGameOnGroup } from "#src/games/access";
import { appointedOrganizerGroupIds } from "#src/groups/helpers/appointed-organizers";
import { groupIsVerified } from "#src/groups/group-is-verified";

type DbOrTx = DbClient | DbTx;

export type CreateGroupOption = {
  id: string;
  name: string | null;
  venueName: string | null;
  sport: Sport;
  verified: boolean;
  memberCount: number;
  /** Teams tagged to the Group, for "Has 2 teams already" on New team. */
  teamCount: number;
};

const groupWith = { venue: { columns: { name: true } } } as const;

function totalsById(rows: { groupId: string | null; total: number }[]) {
  const totals = new Map<string, number>();
  for (const row of rows) {
    if (row.groupId) {
      totals.set(row.groupId, Number(row.total));
    }
  }
  return totals;
}

async function countsByGroup(database: DbOrTx, groupIds: string[]) {
  if (groupIds.length === 0) {
    return { memberCounts: totalsById([]), teamCounts: totalsById([]) };
  }
  const [memberRows, teamRows] = await Promise.all([
    database
      .select({ groupId: groupMembers.groupId, total: count() })
      .from(groupMembers)
      .where(inArray(groupMembers.groupId, groupIds))
      .groupBy(groupMembers.groupId),
    database
      .select({ groupId: teams.groupId, total: count() })
      .from(teams)
      .where(inArray(teams.groupId, groupIds))
      .groupBy(teams.groupId),
  ]);
  return {
    memberCounts: totalsById(memberRows),
    teamCounts: totalsById(teamRows),
  };
}

export async function listCreateGroups(
  database: DbOrTx,
  args: { userId: string },
): Promise<CreateGroupOption[]> {
  const createdRows = await database.query.groups.findMany({
    where: and(eq(groups.createdBy, args.userId), isNull(groups.deletedAt)),
    with: groupWith,
  });

  const appointedGroupIds = await appointedOrganizerGroupIds(
    database,
    args.userId,
  );
  const appointedRows =
    appointedGroupIds.length === 0
      ? []
      : await database.query.groups.findMany({
          where: and(
            inArray(groups.id, appointedGroupIds),
            isNull(groups.deletedAt),
          ),
          with: groupWith,
        });

  const byId = new Map<string, (typeof createdRows)[number]>();
  for (const row of [...createdRows, ...appointedRows]) {
    byId.set(row.id, row);
  }

  const allowed: (typeof createdRows)[number][] = [];
  for (const row of byId.values()) {
    if (await mayCreateGameOnGroup(database, row, args.userId)) {
      allowed.push(row);
    }
  }
  const { memberCounts, teamCounts } = await countsByGroup(
    database,
    allowed.map((row) => row.id),
  );

  const eligible: CreateGroupOption[] = allowed.map((row) => ({
    id: row.id,
    name: row.name,
    venueName: row.venue?.name ?? null,
    sport: sportOrDefault(row.sport),
    verified: groupIsVerified(row),
    memberCount: memberCounts.get(row.id) ?? 0,
    teamCount: teamCounts.get(row.id) ?? 0,
  }));

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
