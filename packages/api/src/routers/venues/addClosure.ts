import { TRPCError } from "@trpc/server";
import { and, asc, eq, gt, lt } from "drizzle-orm";
import { z } from "zod";

import { bookings, courts, venueClosures } from "@repo/db";
import { type db } from "#src/db";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { occupyingBookings } from "#src/bookings/occupying";
import { protectedProcedure } from "#src/trpc";
import { requireVenue } from "#src/venues/helpers/require-venue";
import { requireVenueManager } from "#src/venues/helpers/require-venue-manager";

type DbClient = typeof db;

export async function addClosure(
  database: DbClient,
  args: {
    venueId: string;
    courtId?: string | null;
    startsAt: Date;
    endsAt: Date;
    reason?: string | null;
    actor: {
      userId: string;
      publicMetadata: Record<string, unknown> | undefined;
    };
    now?: Date;
  },
) {
  await requireVenue(database, args.venueId);
  await requireVenueManager(database, {
    venueId: args.venueId,
    ...args.actor,
  });

  if (args.endsAt.getTime() <= args.startsAt.getTime()) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "A Closure must end after it starts",
    });
  }

  const courtId = args.courtId ?? null;
  if (courtId) {
    const court = await database.query.courts.findFirst({
      where: and(eq(courts.id, courtId), eq(courts.venueId, args.venueId)),
      columns: { id: true },
    });
    if (!court) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "That Court does not belong to this Venue",
      });
    }
  }

  const [created] = await database
    .insert(venueClosures)
    .values({
      venueId: args.venueId,
      courtId,
      startsAt: args.startsAt,
      endsAt: args.endsAt,
      reason: args.reason ?? null,
      createdByUserId: args.actor.userId,
    })
    .returning({
      id: venueClosures.id,
      venueId: venueClosures.venueId,
      courtId: venueClosures.courtId,
      startsAt: venueClosures.startsAt,
      endsAt: venueClosures.endsAt,
      reason: venueClosures.reason,
      createdAt: venueClosures.createdAt,
    });

  if (!created) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to add Closure",
    });
  }

  const affected = await database
    .select({ id: bookings.id })
    .from(bookings)
    .where(
      and(
        eq(bookings.venueId, args.venueId),
        courtId ? eq(bookings.courtId, courtId) : undefined,
        occupyingBookings(args.now ?? new Date()),
        lt(bookings.startsAt, args.endsAt),
        gt(bookings.endsAt, args.startsAt),
      ),
    )
    .orderBy(asc(bookings.startsAt), asc(bookings.id));
  const affectedBookingIds = affected.map((row) => row.id);

  return { ...created, affectedBookingIds };
}

export const addClosureProcedure = protectedProcedure
  .input(
    z.object({
      venueId: z.string().uuid(),
      courtId: z.string().uuid().nullish(),
      startsAt: z.coerce.date(),
      endsAt: z.coerce.date(),
      reason: z
        .string()
        .trim()
        .max(255)
        .transform((value) => (value === "" ? null : value))
        .nullish(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return addClosure(ctx.db, {
      ...input,
      actor: {
        userId: appUser.id,
        publicMetadata: await ctx.getPublicMetadata(),
      },
    });
  });
