import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { user } from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { SPORTS, sportsPlayed } from "@repo/domain/sport";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Everything Settings shows and edits about the signed-in User: Your details,
 * Play windows, Seat alerts, Match history visibility and the sports they set
 * up. Only the User reads their own birth date, home area and nationality.
 */
export async function loadProfileDetails(database: DbClient, userId: string) {
  const row = await database.query.user.findFirst({
    where: eq(user.id, userId),
    columns: {
      id: true,
      name: true,
      firstName: true,
      lastName: true,
      image: true,
      phoneNumber: true,
      email: true,
      emailVerified: true,
      gender: true,
      birthDate: true,
      homeArea: true,
      nationality: true,
      playWindows: true,
      seatAlerts: true,
      matchHistoryVisibility: true,
      hideRoasts: true,
      sports: true,
      preferredPosition: true,
      preferredFootballRole: true,
      preferredFootballPosition: true,
      createdAt: true,
    },
  });
  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
  }
  return {
    ...row,
    playWindows: row.playWindows ?? [],
    // Null predates the question and reads as padel; an empty list means the
    // User removed every sport in Settings.
    sports:
      row.sports === null
        ? sportsPlayed(null)
        : SPORTS.filter((sport) => row.sports?.includes(sport)),
  };
}

export const profileDetails = protectedProcedure.query(async ({ ctx }) => {
  const appUser = await resolveAppUser(ctx.userId);
  return loadProfileDetails(ctx.db, appUser.id);
});
