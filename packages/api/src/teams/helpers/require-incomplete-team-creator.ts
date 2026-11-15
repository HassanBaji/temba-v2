import { TRPCError } from "@trpc/server";

import { teamIsFull, teamRosterRule } from "@repo/domain/team-roster";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { listTeamMembers } from "#src/teams/helpers/list-team-members";
import { requireTeam } from "#src/teams/helpers/require-team";
import { type db } from "#src/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function requireIncompleteTeamCreator(
  database: DbClient,
  teamId: string,
  userId: string,
  locale: Locale = DEFAULT_LOCALE,
) {
  const team = await requireTeam(database, teamId, locale);

  if (team.createdBy !== userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: teamRosterRule(team.sport).pairIsUnique
        ? messagesFor(locale).team.errors.creatorInvitesPartner
        : messagesFor(locale).team.errors.creatorInvites,
    });
  }

  const memberRows = await listTeamMembers(database, team.id);
  if (teamIsFull(memberRows.length, team.sport)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).team.errors.full,
    });
  }

  return { team, memberRows };
}
