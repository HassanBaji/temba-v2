import { eq } from "drizzle-orm";
import { z } from "zod";

import { user } from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { PLAY_WINDOWS } from "@repo/domain/profile-details";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** When you play: the User's Play windows and whether Seat alerts are on. */
export async function writePlayWindows(
  database: DbClient,
  args: {
    userId: string;
    playWindows: readonly (typeof PLAY_WINDOWS)[number][];
    seatAlerts: boolean;
  },
) {
  const playWindows = PLAY_WINDOWS.filter((value) =>
    args.playWindows.includes(value),
  );
  await database
    .update(user)
    .set({ playWindows, seatAlerts: args.seatAlerts, updatedAt: new Date() })
    .where(eq(user.id, args.userId));
  return { playWindows, seatAlerts: args.seatAlerts };
}

export const setPlayWindows = protectedProcedure
  .input(
    z.object({
      playWindows: z.array(z.enum(PLAY_WINDOWS)),
      seatAlerts: z.boolean(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return writePlayWindows(ctx.db, { userId: appUser.id, ...input });
  });
