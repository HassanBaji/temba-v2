import { z } from "zod";

import { teamIsFull } from "@repo/domain/team-roster";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { inviteInApp } from "#src/routers/teams/inviteInApp";
import { killTeamOpenSeatDoors } from "#src/teams/helpers/kill-team-open-seat-doors";
import { listTeamMembers } from "#src/teams/helpers/list-team-members";
import { requireIncompleteTeamCreator } from "#src/teams/helpers/require-incomplete-team-creator";
import {
  addPhonePlayerToTeam,
  parseTeamPhonePlayer,
  teamPhonePlayerSchema,
  type TeamPhonePlayerInput,
} from "#src/teams/team-phone-player";
import { resolvePhonePlayer } from "#src/unclaimed-players/resolve-phone-player";

type DbClient = typeof db;

export async function addPlayerByPhone(
  database: DbClient,
  args: TeamPhonePlayerInput & { teamId: string; userId: string },
) {
  const { team } = await requireIncompleteTeamCreator(
    database,
    args.teamId,
    args.userId,
  );
  const player = parseTeamPhonePlayer(team, args);

  const resolved = await resolvePhonePlayer(database, player.phoneNumber);
  if (resolved.kind === "account") {
    await inviteInApp(database, {
      teamId: team.id,
      userId: args.userId,
      inviteeUserId: resolved.user.id,
    });
    return {
      outcome: "invited" as const,
      userId: resolved.user.id,
      name: resolved.user.name,
    };
  }

  return database.transaction(async (tx) => {
    const added = await addPhonePlayerToTeam(tx, {
      team,
      captainUserId: args.userId,
      player,
    });
    const memberCount = (await listTeamMembers(tx, team.id)).length;
    if (teamIsFull(memberCount, team.sport)) {
      await killTeamOpenSeatDoors(tx, team.id);
    }
    return {
      outcome: "added" as const,
      userId: added.user.id,
      name: added.user.name,
    };
  });
}

export const addPlayerByPhoneProcedure = protectedProcedure
  .input(teamPhonePlayerSchema.extend({ teamId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return addPlayerByPhone(ctx.db, { ...input, userId: appUser.id });
  });
