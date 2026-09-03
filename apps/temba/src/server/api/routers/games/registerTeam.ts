import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { gameTeams, gameWaitlist, teamMembers, teams } from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import {
  FRIENDLY_TEAMS_ALLOWED,
  assertRegistrationOpen,
  assertUserPassesJoinGate,
  registeredGameTeamCount,
  requireGame,
} from "~/server/games/access";
import { admit } from "~/server/games/admit";
import { throwIfAdmitRefused } from "~/server/games/helpers/throw-if-admit-refused";
import { userAlreadyOnGame } from "~/server/games/helpers/user-already-on-game";
import { userAllowedByLevelRange } from "~/server/games/user-allowed-by-level-range";
import { enqueueWaitlistTeam } from "~/server/games/enqueue-waitlist-team";
import { LEVEL_RANGE_TEAM_MESSAGE } from "~/lib/level-range";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function registerTeam(
  database: DbClient,
  args: { gameId: string; userId: string; teamId: string },
) {
  const game = await requireGame(database, args.gameId);
  const now = new Date();

  if (
    game.format !== "friendly_game" &&
    game.format !== "friendly_tournament"
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Register a Team on a Friendly game or tournament",
    });
  }
  if (game.registrationMode !== "team_only") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This Game is individual",
    });
  }

  await assertRegistrationOpen(database, game, now);

  const team = await database.query.teams.findFirst({
    where: eq(teams.id, args.teamId),
  });
  if (!team) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Team not found",
    });
  }

  const members = await database.query.teamMembers.findMany({
    where: eq(teamMembers.teamId, team.id),
  });
  if (members.length !== 2) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Incomplete Teams cannot register",
    });
  }
  if (!members.some((member) => member.userId === args.userId)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be a member of that Team",
    });
  }

  for (const member of members) {
    await assertUserPassesJoinGate(database, game, member.userId);
  }

  const existing = await database.query.gameTeams.findFirst({
    where: and(eq(gameTeams.gameId, game.id), eq(gameTeams.teamId, team.id)),
    columns: { id: true },
  });
  if (existing) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "That Team is already registered on this Game",
    });
  }

  const alreadyWaitlistedTeam = await database.query.gameWaitlist.findFirst({
    where: and(
      eq(gameWaitlist.gameId, game.id),
      eq(gameWaitlist.teamId, team.id),
    ),
    columns: { id: true },
  });
  if (alreadyWaitlistedTeam) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "That Team is already on the waitlist",
    });
  }

  for (const member of members) {
    if (await userAlreadyOnGame(database, game.id, member.userId)) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "A Team partner is already registered on this Game",
      });
    }
  }

  for (const member of members) {
    if (!(await userAllowedByLevelRange(database, game, member.userId))) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: LEVEL_RANGE_TEAM_MESSAGE,
      });
    }
  }

  const teamCount = await registeredGameTeamCount(database, game.id);
  if (teamCount >= (game.teamsAllowed ?? FRIENDLY_TEAMS_ALLOWED)) {
    await enqueueWaitlistTeam(database, game.id, team.id);
    return { ok: true as const, waitlisted: true as const };
  }

  await database.transaction(async (tx) => {
    throwIfAdmitRefused(
      await admit(tx, {
        game,
        door: "register",
        party: { kind: "team", teamId: team.id },
        now,
      }),
      "team",
    );
  });

  return { ok: true as const, waitlisted: false as const };
}

export const registerTeamProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      teamId: z.string().uuid(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return registerTeam(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      teamId: input.teamId,
    });
  });
