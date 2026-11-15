import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { groups, teams } from "@repo/db";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { mayOrganizeGroupGames } from "#src/groups/helpers/may-organize-group-games";
import {
  requireCaptainInTagGroup,
  requireTagGroup,
} from "#src/teams/helpers/require-tag-group";
import { requireTeam } from "#src/teams/helpers/require-team";

type DbClient = typeof db;

/** The Group the Team is tagged to now, unless that Group was deleted. */
async function currentTagGroup(database: DbClient, groupId: string | null) {
  if (!groupId) {
    return null;
  }
  const group = await database.query.groups.findFirst({
    where: eq(groups.id, groupId),
    columns: { id: true, name: true, createdBy: true, deletedAt: true },
  });
  return group && group.deletedAt == null ? group : null;
}

/**
 * Tag a Team as a Group's team, or clear the tag. A tag lets that Group's
 * Organizers act for the Team, so only the Captain sets or moves it, and only
 * to a Group the Captain is in; the Captain or an Organizer of the tagged
 * Group may clear it.
 */
export async function setGroupTag(
  database: DbClient,
  args: {
    teamId: string;
    groupId: string | null;
    userId: string;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const team = await requireTeam(database, args.teamId, locale);
  const isCaptain = team.createdBy === args.userId;
  const current = await currentTagGroup(database, team.groupId);

  const mayClearCurrent =
    current == null ||
    isCaptain ||
    (await mayOrganizeGroupGames(database, current, args.userId));

  if (args.groupId == null) {
    if (!mayClearCurrent) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: messagesFor(locale).team.errors.tagRemover,
      });
    }
  } else {
    const target = await requireTagGroup(
      database,
      args.groupId,
      team.sport,
      locale,
    );
    if (!isCaptain) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: messagesFor(args.locale ?? DEFAULT_LOCALE).team.groupTag
          .captainOnly,
      });
    }
    await requireCaptainInTagGroup(database, target.id, team.createdBy, locale);
  }

  const [updated] = await database
    .update(teams)
    .set({ groupId: args.groupId, updatedAt: new Date() })
    .where(eq(teams.id, team.id))
    .returning({ id: teams.id, groupId: teams.groupId });

  const tagged = updated?.groupId
    ? await database.query.groups.findFirst({
        where: eq(groups.id, updated.groupId),
        columns: { id: true, name: true },
      })
    : null;

  return {
    teamId: team.id,
    groupTag: tagged ? { id: tagged.id, name: tagged.name } : null,
  };
}

export const setGroupTagProcedure = protectedProcedure
  .input(
    z.object({
      teamId: z.string().uuid(),
      groupId: z.string().uuid().nullable(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return setGroupTag(ctx.db, {
      teamId: input.teamId,
      groupId: input.groupId,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
