import { and, count, eq, isNull } from "drizzle-orm";

import { teamEmailInvites, teamMemberInvites } from "@repo/db";
import { openInviteBudget } from "@repo/domain/team-roster";
import { type Sport } from "@repo/domain/sport";

import { type db } from "#src/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function unusedLookupInvitesForTeam(
  database: DbClient,
  teamId: string,
) {
  return database.query.teamMemberInvites.findMany({
    where: and(
      eq(teamMemberInvites.teamId, teamId),
      isNull(teamMemberInvites.acceptedAt),
      isNull(teamMemberInvites.revokedAt),
    ),
    with: {
      user: {
        columns: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: (table, { asc }) => [asc(table.createdAt)],
  });
}

/**
 * Seats still free for a new Lookup or Email invite. The Invite link is one
 * shared door and does not draw on the budget: accepting it is refused at full.
 */
export async function teamInviteBudget(
  database: DbClient,
  team: { id: string; sport: Sport },
  memberCount: number,
) {
  const lookupInvites = await unusedLookupInvitesForTeam(database, team.id);
  const [emailInvites] = await database
    .select({ value: count() })
    .from(teamEmailInvites)
    .where(
      and(
        eq(teamEmailInvites.teamId, team.id),
        isNull(teamEmailInvites.acceptedAt),
        isNull(teamEmailInvites.revokedAt),
      ),
    );
  return {
    lookupInvites,
    budget: openInviteBudget(
      memberCount,
      lookupInvites.length + (emailInvites?.value ?? 0),
      team.sport,
    ),
  };
}
