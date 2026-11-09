import { TRPCError } from "@trpc/server";
import { and, eq, exists, isNotNull, isNull, not } from "drizzle-orm";
import { z } from "zod";

import {
  challengeProposals,
  challenges,
  games,
  gameTeams,
  matches,
  MatchStatusEnum,
  teamEmailInvites,
  teamMembers,
  teams,
} from "@repo/db";

import {
  isChallengeOpen,
  isProposalPending,
} from "@repo/domain/challenge-clock";
import { teamIsComplete, teamIsSquad } from "@repo/domain/team-roster";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { killTeamOpenSeatDoors } from "#src/teams/helpers/kill-team-open-seat-doors";
import { listTeamMembers } from "#src/teams/helpers/list-team-members";
import { requireTeam } from "#src/teams/helpers/require-team";

type DbClient = typeof db;
type Tx = Parameters<Parameters<DbClient["transaction"]>[0]>[0];

/**
 * Deleting a Team deletes its Challenges and Proposals, and a Challenge Game
 * would lose its Challenge and the other Team its Organizers. So a Team leaves
 * the Challenge board, and plays or cancels its Challenge Games, first.
 */
async function refuseWhileInChallenges(
  tx: Tx,
  teamId: string,
  now: Date,
  locale: Locale,
) {
  const m = messagesFor(locale).team.dissolveBlocked;
  const refuse = (message: string): never => {
    throw new TRPCError({ code: "BAD_REQUEST", message });
  };

  const posted = await tx.query.challenges.findMany({
    where: and(eq(challenges.teamId, teamId), eq(challenges.status, "open")),
    columns: { status: true, expiresAt: true },
    with: { proposals: { columns: { status: true, expiresAt: true } } },
  });
  if (
    posted.some((challenge) =>
      isChallengeOpen(
        challenge,
        now,
        challenge.proposals.some((proposal) =>
          isProposalPending(proposal, now),
        ),
      ),
    )
  ) {
    refuse(m.openChallenge);
  }

  const sent = await tx.query.challengeProposals.findMany({
    where: and(
      eq(challengeProposals.teamId, teamId),
      eq(challengeProposals.status, "pending"),
    ),
    columns: { status: true, expiresAt: true },
  });
  if (sent.some((proposal) => isProposalPending(proposal, now))) {
    refuse(m.pendingProposal);
  }

  const [unfinished] = await tx
    .select({ id: games.id })
    .from(games)
    .innerJoin(gameTeams, eq(gameTeams.gameId, games.id))
    .where(
      and(
        eq(gameTeams.teamId, teamId),
        isNotNull(games.challengeId),
        isNull(games.cancelledAt),
        not(
          exists(
            tx
              .select({ id: matches.id })
              .from(matches)
              .where(
                and(
                  eq(matches.gameId, games.id),
                  eq(matches.status, MatchStatusEnum.COMPLETED),
                ),
              ),
          ),
        ),
      ),
    )
    .limit(1);
  if (unfinished) {
    refuse(m.challengeGame);
  }
}

export async function dissolve(
  database: DbClient,
  args: { teamId: string; userId: string; now?: Date; locale?: Locale },
) {
  const now = args.now ?? new Date();
  const team = await requireTeam(database, args.teamId);

  const membership = await database.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, team.id),
      eq(teamMembers.userId, args.userId),
    ),
  });

  if (!membership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only a Team member can dissolve this Team",
    });
  }

  const memberRows = await listTeamMembers(database, team.id);
  const incomplete = !teamIsComplete(memberRows.length, team.sport);

  if (team.createdBy !== args.userId) {
    if (teamIsSquad(team.sport)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only the creator can dissolve this Team",
      });
    }
    if (incomplete) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only the creator can dissolve an incomplete Team",
      });
    }
  }

  await database.transaction(async (tx) => {
    await tx
      .select({ id: teams.id })
      .from(teams)
      .where(eq(teams.id, team.id))
      .for("update");
    await refuseWhileInChallenges(
      tx,
      team.id,
      now,
      args.locale ?? DEFAULT_LOCALE,
    );
    await killTeamOpenSeatDoors(tx, team.id);

    await tx
      .update(teamEmailInvites)
      .set({
        revokedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(teamEmailInvites.teamId, team.id),
          isNull(teamEmailInvites.acceptedAt),
          isNull(teamEmailInvites.revokedAt),
        ),
      );

    await tx.delete(teams).where(eq(teams.id, team.id));
  });

  return {
    ok: true as const,
    teamId: team.id,
  };
}

export const dissolveProcedure = protectedProcedure
  .input(z.object({ teamId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return dissolve(ctx.db, {
      teamId: input.teamId,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
