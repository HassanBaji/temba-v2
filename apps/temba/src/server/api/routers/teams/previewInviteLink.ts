import { eq } from "drizzle-orm";
import { z } from "zod";

import { teamInviteLinks } from "@repo/db";

import { publicProcedure } from "~/server/api/trpc";
import { type db } from "~/server/db";
import { previewLink } from "~/server/invites/doors";
import { listTeamMembers } from "~/server/teams/helpers/list-team-members";
import { teamDisplayName } from "~/server/teams/helpers/team-display-name";

type DbClient = typeof db;

export async function previewInviteLink(
  database: DbClient,
  args: { token: string },
) {
  const previewed = await previewLink(database, "team", args.token);
  if (previewed.status !== "ready") {
    return { status: previewed.status };
  }

  const link = await database.query.teamInviteLinks.findFirst({
    where: eq(teamInviteLinks.token, args.token),
    with: {
      team: true,
    },
  });

  if (!link) {
    return { status: "invalid" as const };
  }

  const memberRows = await listTeamMembers(database, link.team.id);
  return {
    status: "ready" as const,
    teamName: teamDisplayName(
      link.team.name,
      memberRows.map((row) => row.user.name),
    ),
  };
}

export const previewInviteLinkProcedure = publicProcedure
  .input(z.object({ token: z.string().min(1).max(64) }))
  .query(async ({ ctx, input }) => {
    return previewInviteLink(ctx.db, { token: input.token });
  });
