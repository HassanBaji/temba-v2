import { eq } from "drizzle-orm";

import { teamInviteLinks } from "@repo/db";

import { previewLink } from "~/server/invites/doors";
import { listTeamMembers } from "~/server/teams/helpers/list-team-members";
import { teamDisplayName } from "~/server/teams/helpers/team-display-name";
import { type db } from "~/server/db";

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
