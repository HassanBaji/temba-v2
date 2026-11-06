import type { DbClient, DbTx } from "@repo/db";
import { and, eq, inArray, isNull } from "drizzle-orm";

import { groups } from "@repo/db";

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
};

const groupWith = { venue: { columns: { name: true } } } as const;

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

  const eligible: CreateGroupOption[] = [];
  for (const row of byId.values()) {
    if (!(await mayCreateGameOnGroup(database, row, args.userId))) {
      continue;
    }
    eligible.push({
      id: row.id,
      name: row.name,
      venueName: row.venue?.name ?? null,
      sport: sportOrDefault(row.sport),
      verified: groupIsVerified(row),
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
