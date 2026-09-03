import { eq } from "drizzle-orm";
import { z } from "zod";

import { gameInviteLinks } from "@repo/db";

import { publicProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import {
  getRegistrationStatus,
  isGameOrganizer,
  requireGame,
} from "~/server/games/access";
import { viewerLevelRangeFields } from "~/server/games/level-range-requests";
import {
  isIndividualSeatGame,
  listGameSides,
  vacantPositionsFromSides,
} from "~/server/games/seats";
import { gameHasLevelRange } from "~/server/games/user-allowed-by-level-range";
import { previewLink } from "~/server/invites/doors";

type DbClient = typeof db;

export async function previewInviteLink(
  database: DbClient,
  args: { token: string; userId?: string },
) {
  const previewed = await previewLink(database, "game", args.token);
  if (previewed.status !== "ready") {
    return { status: previewed.status };
  }
  const link = await database.query.gameInviteLinks.findFirst({
    where: eq(gameInviteLinks.token, args.token),
  });
  if (!link) {
    return { status: "invalid" as const };
  }
  const gameRow = await requireGame(database, link.gameId);
  const organizer = args.userId
    ? await isGameOrganizer(database, gameRow, args.userId)
    : false;
  const levelFields = args.userId
    ? await viewerLevelRangeFields(database, gameRow, args.userId, organizer)
    : null;
  const blockedByLevelRange =
    args.userId != null &&
    gameHasLevelRange(gameRow) &&
    levelFields != null &&
    !levelFields.viewerPassesLevelRange;
  const needsSeatPick = isIndividualSeatGame(gameRow) && !blockedByLevelRange;
  const sides = needsSeatPick ? await listGameSides(database, gameRow) : [];
  return {
    status: "ready" as const,
    gameId: gameRow.id,
    gameName: previewed.name,
    format: gameRow.format,
    registrationStatus: await getRegistrationStatus(
      database,
      gameRow,
      new Date(),
    ),
    needsSeatPick,
    sides,
    vacantSeats: vacantPositionsFromSides(sides),
    levelMinTenths: gameRow.levelMinTenths,
    levelMaxTenths: gameRow.levelMaxTenths,
    viewerLevelTenths: levelFields?.viewerLevelTenths ?? null,
    viewerPassesLevelRange: levelFields?.viewerPassesLevelRange ?? null,
    levelRangeRequest: levelFields?.levelRangeRequest ?? null,
    canRequestLevelRange: levelFields?.canRequestLevelRange ?? false,
  };
}

export const previewInviteLinkProcedure = publicProcedure
  .input(z.object({ token: z.string().min(1).max(64) }))
  .query(async ({ ctx, input }) => {
    let userId: string | undefined;
    if (ctx.userId) {
      const appUser = await resolveAppUser(ctx.userId);
      userId = appUser.id;
    }
    return previewInviteLink(ctx.db, { token: input.token, userId });
  });
