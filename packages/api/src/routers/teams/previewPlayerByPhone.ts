import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { teamMembers } from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { requireIncompleteTeamCreator } from "#src/teams/helpers/require-incomplete-team-creator";
import { unusedLookupInvitesForTeam } from "#src/teams/helpers/unused-invites-for-team";
import { maskPhone } from "#src/unclaimed-players/mask-phone";
import { requireE164 } from "#src/unclaimed-players/require-e164";
import { resolvePhonePlayer } from "#src/unclaimed-players/resolve-phone-player";

type DbClient = typeof db;

export type TeamPhonePlayerPreview = {
  kind: "account" | "unclaimed" | "new";
  name: string | null;
  alreadyOnTeam: boolean;
  alreadyInvited: boolean;
  phoneMasked?: string;
};

/**
 * Who a number belongs to, for the Captain's By phone tab. Without a Team it
 * serves the New team screen, where nothing is on the Roster yet but the viewer.
 */
export async function previewPlayerByPhone(
  database: DbClient,
  args: {
    teamId?: string;
    userId: string;
    countryIso: string;
    nationalNumber: string;
  },
): Promise<TeamPhonePlayerPreview> {
  const team = args.teamId
    ? (await requireIncompleteTeamCreator(database, args.teamId, args.userId))
        .team
    : null;
  const phoneNumber = requireE164(args.countryIso, args.nationalNumber);

  const resolved = await resolvePhonePlayer(database, phoneNumber);
  if (resolved.kind === "new") {
    return {
      kind: "new",
      name: null,
      alreadyOnTeam: false,
      alreadyInvited: false,
    };
  }

  const player = resolved.user;
  const membership = team
    ? await database.query.teamMembers.findFirst({
        where: and(
          eq(teamMembers.teamId, team.id),
          eq(teamMembers.userId, player.id),
        ),
        columns: { id: true },
      })
    : undefined;
  const alreadyOnTeam = player.id === args.userId || membership !== undefined;
  const alreadyInvited = team
    ? (await unusedLookupInvitesForTeam(database, team.id)).some(
        (invite) => invite.userId === player.id,
      )
    : false;

  if (resolved.kind === "account") {
    return {
      kind: "account",
      name: player.name,
      alreadyOnTeam,
      alreadyInvited,
    };
  }
  return {
    kind: "unclaimed",
    name: player.name,
    alreadyOnTeam,
    alreadyInvited,
    phoneMasked: maskPhone(phoneNumber),
  };
}

export const previewPlayerByPhoneProcedure = protectedProcedure
  .input(
    z.object({
      teamId: z.string().uuid().optional(),
      countryIso: z.string().trim().min(1).max(8),
      nationalNumber: z.string().trim().min(1).max(32),
    }),
  )
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return previewPlayerByPhone(ctx.db, {
      teamId: input.teamId,
      userId: appUser.id,
      countryIso: input.countryIso,
      nationalNumber: input.nationalNumber,
    });
  });
