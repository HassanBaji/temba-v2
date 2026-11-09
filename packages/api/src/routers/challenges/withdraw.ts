import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { challengeProposals, challenges, teams } from "@repo/db";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { removeJob } from "#src/jobs/enqueue";
import { challengeExpireJobKey } from "#src/jobs/specs";
import { userActsForTeam } from "#src/teams/acts-for-team";
import { protectedProcedure } from "#src/trpc";

type DbClient = typeof db;

/**
 * Take an open Challenge off the board. Only someone who acts for the posting
 * Team may; any pending Proposal is passed over.
 */
export async function withdrawChallenge(
  database: DbClient,
  args: { challengeId: string; userId: string; now?: Date; locale?: Locale },
) {
  const now = args.now ?? new Date();
  const m = messagesFor(args.locale ?? DEFAULT_LOCALE).challenge;
  return database.transaction(async (tx) => {
    const [challenge] = await tx
      .select()
      .from(challenges)
      .where(eq(challenges.id, args.challengeId))
      .for("update");
    if (!challenge) {
      throw new TRPCError({ code: "NOT_FOUND", message: m.detail.notFound });
    }
    const team = await tx.query.teams.findFirst({
      where: eq(teams.id, challenge.teamId),
      columns: { id: true, sport: true, createdBy: true, groupId: true },
    });
    if (!team || !(await userActsForTeam(tx, team, args.userId))) {
      throw new TRPCError({ code: "FORBIDDEN", message: m.errors.notActing });
    }
    if (challenge.status !== "open") {
      throw new TRPCError({ code: "BAD_REQUEST", message: m.errors.notOpen });
    }
    await tx
      .update(challenges)
      .set({ status: "withdrawn", withdrawnAt: now, updatedAt: now })
      .where(eq(challenges.id, challenge.id));
    await tx
      .update(challengeProposals)
      .set({ status: "passed_over", decidedAt: now, updatedAt: now })
      .where(
        and(
          eq(challengeProposals.challengeId, challenge.id),
          eq(challengeProposals.status, "pending"),
        ),
      );
    await removeJob(tx, challengeExpireJobKey(challenge.id));
    return { id: challenge.id };
  });
}

export const withdrawProcedure = protectedProcedure
  .input(z.object({ challengeId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return withdrawChallenge(ctx.db, {
      challengeId: input.challengeId,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
