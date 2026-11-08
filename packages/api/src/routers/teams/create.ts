import { TRPCError } from "@trpc/server";
import { inArray } from "drizzle-orm";
import { z } from "zod";

import { teamMembers, teams, user, type GroupSportEnum } from "@repo/db";
import { teamRosterRule } from "@repo/domain/team-roster";
import { sportSchema } from "@repo/validators/sport";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { mintLookup } from "#src/invites/doors";
import { notifyTeamInvite } from "#src/notifications/notify-team-invite";
import {
  requireCaptainInTagGroup,
  requireTagGroup,
} from "#src/teams/helpers/require-tag-group";
import { teamDisplayName } from "#src/teams/helpers/team-display-name";
import { unorderedPairIsReserved } from "#src/teams/helpers/unordered-pair-is-reserved";
import {
  addPhonePlayerToTeam,
  parseTeamPhonePlayer,
  teamPhonePlayerSchema,
  type TeamPhonePlayerInput,
} from "#src/teams/team-phone-player";
import { isUnclaimed } from "#src/unclaimed-players/is-unclaimed";

type DbClient = typeof db;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function refuse(message: string): never {
  throw new TRPCError({ code: "BAD_REQUEST", message });
}

function optionalTeamName(name: string | undefined) {
  if (!name || name.length === 0) {
    return null;
  }
  return name;
}

async function requireInvitees(
  database: DbClient,
  args: { userIds: string[]; captainUserId: string },
) {
  if (new Set(args.userIds).size !== args.userIds.length) {
    refuse("Someone is on the list twice");
  }
  if (args.userIds.includes(args.captainUserId)) {
    refuse("You cannot invite yourself");
  }
  if (args.userIds.length === 0) {
    return [];
  }
  const rows = await database.query.user.findMany({
    where: inArray(user.id, args.userIds),
    columns: { id: true, name: true, clerkId: true, addedAt: true },
  });
  if (rows.length !== args.userIds.length) {
    refuse("User not found");
  }
  for (const row of rows) {
    if (isUnclaimed(row)) {
      refuse(`${row.name} is not on Temba yet. Add them by phone`);
    }
  }
  return rows;
}

async function refuseReservedPair(
  database: DbClient | Tx,
  sport: "padel" | "football",
  captainUserId: string,
  inviteeUserId: string,
) {
  if (
    teamRosterRule(sport).pairIsUnique &&
    (await unorderedPairIsReserved(database, captainUserId, inviteeUserId))
  ) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "This pair already has a Team or a pending invite",
    });
  }
}

/**
 * The New team screen in one transaction: the Team, its Captain, the players
 * added by phone, and a Lookup invite for each account holder. Over the Roster
 * maximum, nothing is written.
 */
export async function createTeam(
  database: DbClient,
  args: {
    name: string | undefined;
    sport: "padel" | "football";
    userId: string;
    userName: string;
    groupId?: string;
    inviteUserIds?: string[];
    phonePlayers?: TeamPhonePlayerInput[];
  },
) {
  const inviteUserIds = args.inviteUserIds ?? [];
  const phoneInputs = args.phonePlayers ?? [];
  const { max } = teamRosterRule(args.sport);
  if (1 + inviteUserIds.length + phoneInputs.length > max) {
    refuse(
      `A Team holds up to ${max} players, you included. Remove someone first`,
    );
  }

  // The creator is the Captain, who may tag the new Team to a Group of its sport
  // that they are in.
  const tagGroup = args.groupId
    ? await requireTagGroup(database, args.groupId, args.sport)
    : null;
  if (tagGroup) {
    await requireCaptainInTagGroup(database, tagGroup.id, args.userId);
  }
  const phonePlayers = phoneInputs.map((input) =>
    parseTeamPhonePlayer({ sport: args.sport }, input),
  );
  if (
    new Set(phonePlayers.map((player) => player.phoneNumber)).size !==
    phonePlayers.length
  ) {
    refuse("A number is on the list twice");
  }
  const invitees = await requireInvitees(database, {
    userIds: inviteUserIds,
    captainUserId: args.userId,
  });
  for (const invitee of invitees) {
    await refuseReservedPair(database, args.sport, args.userId, invitee.id);
  }

  const created = await database.transaction(async (tx) => {
    const [team] = await tx
      .insert(teams)
      .values({
        name: optionalTeamName(args.name),
        sport: args.sport,
        createdBy: args.userId,
        groupId: tagGroup?.id ?? null,
      })
      .returning();

    if (!team) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create Team",
      });
    }

    await tx.insert(teamMembers).values({
      teamId: team.id,
      userId: args.userId,
    });

    const inviteeIds = invitees.map((invitee) => invitee.id);
    const addedNames: string[] = [];
    for (const player of phonePlayers) {
      const added = await addPhonePlayerToTeam(tx, {
        team: { id: team.id, sport: args.sport },
        captainUserId: args.userId,
        player,
      });
      if (added.outcome === "added") {
        addedNames.push(added.user.name);
        continue;
      }
      if (added.user.id === args.userId || inviteeIds.includes(added.user.id)) {
        refuse(`${added.user.name} is on the list twice`);
      }
      await refuseReservedPair(tx, args.sport, args.userId, added.user.id);
      inviteeIds.push(added.user.id);
    }

    for (const inviteeUserId of inviteeIds) {
      const minted = await mintLookup(
        tx,
        { kind: "team", id: team.id },
        { userId: inviteeUserId, invitedBy: args.userId },
      );
      if (!minted.ok) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create Team invite",
        });
      }
    }
    await notifyTeamInvite(tx, {
      teamId: team.id,
      inviterUserId: args.userId,
      inviteeUserIds: inviteeIds,
    });

    return { team, addedNames, invitedCount: inviteeIds.length };
  });

  const { team } = created;
  return {
    id: team.id,
    name: team.name,
    displayName: teamDisplayName(team.name, [
      args.userName,
      ...created.addedNames,
    ]),
    sport: team.sport as GroupSportEnum,
    createdBy: team.createdBy,
    createdAt: team.createdAt,
    groupTag: tagGroup ? { id: tagGroup.id, name: tagGroup.name } : null,
    addedCount: created.addedNames.length,
    invitedCount: created.invitedCount,
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
  };
}

export const create = protectedProcedure
  .input(
    z.object({
      name: z.string().trim().max(255).optional(),
      sport: sportSchema,
      groupId: z.string().uuid().optional(),
      inviteUserIds: z.array(z.string().uuid()).max(40).optional(),
      phonePlayers: z.array(teamPhonePlayerSchema).max(40).optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return createTeam(ctx.db, {
      name: input.name,
      sport: input.sport,
      groupId: input.groupId,
      inviteUserIds: input.inviteUserIds,
      phonePlayers: input.phonePlayers,
      userId: appUser.id,
      userName: appUser.name,
    });
  });
