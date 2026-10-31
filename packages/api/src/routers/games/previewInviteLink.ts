import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import { gameInviteLinks, gamePlayers, user } from "@repo/db";

import { isFootballGame } from "@repo/domain/game-shape";

import { publicProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import {
  getRegistrationStatus,
  isGameOrganizer,
  requireGame,
  type GameRow,
} from "#src/games/access";
import { footballSides } from "#src/games/football-lineup";
import { userAlreadyOnGame } from "#src/games/helpers/user-already-on-game";
import { viewerLevelRangeFields } from "#src/games/level-range-requests";
import {
  isIndividualSeatGame,
  listGameSides,
  vacantPositionsFromSides,
} from "#src/games/seats";
import { gameHasLevelRange } from "#src/games/user-allowed-by-level-range";
import { previewLink } from "#src/invites/doors";
import { tournamentInvitePreviewNeedsSeatPick } from "@repo/domain/tournament-join";
import { isPartnerRequiredGame } from "@repo/domain/tournament-rounds";

type DbClient = typeof db;

/**
 * What a signed-in joiner needs to pick keeper or player and a preferred
 * position before accepting. Null when they are already on the Game.
 */
async function footballJoinPreview(
  database: DbClient,
  game: GameRow,
  userId: string,
) {
  if (await userAlreadyOnGame(database, game.id, userId)) {
    return null;
  }
  const roster = await database.query.gamePlayers.findMany({
    where: eq(gamePlayers.gameId, game.id),
    columns: { footballRole: true, footballPosition: true },
    with: { user: { columns: { name: true } } },
    orderBy: asc(gamePlayers.createdAt),
  });
  const viewer = await database.query.user.findFirst({
    where: eq(user.id, userId),
    columns: { preferredFootballRole: true, preferredFootballPosition: true },
  });
  const sides = await footballSides(database, game.id);
  return {
    players: roster.flatMap((row) =>
      row.user
        ? [
            {
              name: row.user.name,
              role: row.footballRole,
              position: row.footballPosition,
            },
          ]
        : [],
    ),
    sideSize: game.sideSize,
    playersAllowed: game.playersAllowed,
    pricePerPlayerFils: game.pricePerPlayerFils,
    teamsSet: sides.slot1 != null && sides.slot2 != null,
    preferred: {
      role: viewer?.preferredFootballRole ?? null,
      position: viewer?.preferredFootballPosition ?? null,
    },
  };
}

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
  const partnerRequiredJoin = isPartnerRequiredGame(gameRow);
  const needsSeatPick = tournamentInvitePreviewNeedsSeatPick({
    isIndividualSeatGame: isIndividualSeatGame(gameRow),
    blockedByLevelRange,
    partnerRequired: partnerRequiredJoin,
  });
  const sides = needsSeatPick ? await listGameSides(database, gameRow) : [];
  const football =
    args.userId && isFootballGame(gameRow) && !blockedByLevelRange
      ? await footballJoinPreview(database, gameRow, args.userId)
      : null;
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
    partnerRequiredJoin,
    sides,
    vacantSeats: vacantPositionsFromSides(sides),
    levelMinTenths: gameRow.levelMinTenths,
    levelMaxTenths: gameRow.levelMaxTenths,
    viewerLevelTenths: levelFields?.viewerLevelTenths ?? null,
    viewerPassesLevelRange: levelFields?.viewerPassesLevelRange ?? null,
    levelRangeRequest: levelFields?.levelRangeRequest ?? null,
    canRequestLevelRange: levelFields?.canRequestLevelRange ?? false,
    football,
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
