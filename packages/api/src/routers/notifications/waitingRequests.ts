import type { DbClient } from "@repo/db";
import {
  and,
  countDistinct,
  eq,
  gt,
  inArray,
  isNull,
  lt,
  ne,
  or,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import {
  gameLevelRangeRequests,
  GameLevelRangeRequestStatusEnum,
  gamePlayers,
  games,
  groupJoinRequests,
  GroupJoinRequestStatusEnum,
  groupMembers,
  groups,
} from "@repo/db";
import { isSeatHoldLive } from "@repo/domain/invites";
import {
  sortWaitingRequests,
  type WaitingRequest,
  type WaitingRequestGame,
} from "@repo/domain/waiting-requests";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import {
  FRIENDLY_PLAYERS_ALLOWED,
  isGameOrganizer,
  registeredUserCount,
} from "#src/games/access";
import { displayedLevelTenthsForUser } from "#src/games/user-allowed-by-level-range";
import { appointedOrganizerGroupIds } from "#src/groups/helpers/appointed-organizers";

type GameRow = typeof games.$inferSelect;

/** Groups whose join requests the viewer decides: the ones they created or organize by appointment. */
async function approverGroups(database: DbClient, userId: string) {
  const appointed = await appointedOrganizerGroupIds(database, userId);
  return database.query.groups.findMany({
    where: and(
      isNull(groups.deletedAt),
      appointed.length > 0
        ? or(eq(groups.createdBy, userId), inArray(groups.id, appointed))
        : eq(groups.createdBy, userId),
    ),
    columns: { id: true, name: true, sport: true, createdBy: true },
  });
}

/** A Game still worth deciding a seat on: not cancelled and not started. */
function isUpcoming(game: GameRow, now: Date) {
  return (
    !game.cancelledAt &&
    (game.windowStart == null || game.windowStart.getTime() > now.getTime())
  );
}

async function gamesWithMembers(
  database: DbClient,
  args: { groupId: string; userId: string; now: Date },
) {
  const others = alias(gamePlayers, "others");
  const [row] = await database
    .select({ count: countDistinct(gamePlayers.gameId) })
    .from(gamePlayers)
    .innerJoin(games, eq(games.id, gamePlayers.gameId))
    .innerJoin(others, eq(others.gameId, gamePlayers.gameId))
    .innerJoin(
      groupMembers,
      and(
        eq(groupMembers.userId, others.userId),
        eq(groupMembers.groupId, args.groupId),
      ),
    )
    .where(
      and(
        eq(gamePlayers.userId, args.userId),
        ne(others.userId, args.userId),
        isNull(games.cancelledAt),
        lt(games.windowStart, args.now),
      ),
    );
  return row?.count ?? 0;
}

async function isGroupMember(
  database: DbClient,
  groupId: string,
  userId: string,
) {
  const row = await database.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.groupId, groupId),
      eq(groupMembers.userId, userId),
    ),
    columns: { id: true },
  });
  return row != null;
}

/**
 * Every request waiting on the viewer, most urgent first: Level range requests
 * on upcoming Games they organize, Group join requests with a live Seat hold
 * on an upcoming Game, then Group join requests in Groups they approve for.
 * Empty for anyone who organizes nothing.
 */
export async function listWaitingRequests(
  database: DbClient,
  args: { userId: string; now?: Date },
): Promise<WaitingRequest[]> {
  const now = args.now ?? new Date();
  const viewerId = args.userId;
  const groupsById = new Map(
    (await approverGroups(database, viewerId)).map((group) => [
      group.id,
      group,
    ]),
  );

  const joinRows =
    groupsById.size > 0
      ? await database.query.groupJoinRequests.findMany({
          where: and(
            inArray(groupJoinRequests.groupId, [...groupsById.keys()]),
            eq(groupJoinRequests.status, GroupJoinRequestStatusEnum.PENDING),
          ),
          with: {
            user: { columns: { id: true, name: true, image: true } },
            invitedBy: { columns: { id: true, name: true } },
            heldGame: true,
          },
        })
      : [];

  const groupIds = [...groupsById.keys()];
  const candidateGames = await database.query.games.findMany({
    where: and(
      isNull(games.cancelledAt),
      or(isNull(games.windowStart), gt(games.windowStart, now)),
      or(
        groupIds.length > 0 ? inArray(games.groupId, groupIds) : undefined,
        and(
          isNull(games.groupId),
          isNull(games.challengeId),
          eq(games.createdBy, viewerId),
        ),
      ),
    ),
    columns: { id: true },
  });
  const levelRangeRows =
    candidateGames.length > 0
      ? await database.query.gameLevelRangeRequests.findMany({
          where: and(
            inArray(
              gameLevelRangeRequests.gameId,
              candidateGames.map((game) => game.id),
            ),
            eq(
              gameLevelRangeRequests.status,
              GameLevelRangeRequestStatusEnum.PENDING,
            ),
          ),
          with: {
            user: { columns: { id: true, name: true, image: true } },
            game: true,
          },
        })
      : [];

  const organizedGames = new Map<string, boolean>();
  async function organizes(game: GameRow) {
    const known = organizedGames.get(game.id);
    if (known !== undefined) {
      return known;
    }
    const organizer = await isGameOrganizer(database, game, viewerId);
    organizedGames.set(game.id, organizer);
    return organizer;
  }

  const gameSummaries = new Map<string, WaitingRequestGame>();
  async function summaryOf(game: GameRow): Promise<WaitingRequestGame> {
    const known = gameSummaries.get(game.id);
    if (known) {
      return known;
    }
    const group = game.groupId
      ? (groupsById.get(game.groupId) ??
        (await database.query.groups.findFirst({
          where: eq(groups.id, game.groupId),
          columns: { name: true },
        })))
      : null;
    const summary: WaitingRequestGame = {
      id: game.id,
      sport: game.sport,
      startsAt: game.windowStart,
      groupId: game.groupId,
      groupName: group?.name ?? null,
      levelMinTenths: game.levelMinTenths,
      levelMaxTenths: game.levelMaxTenths,
      registeredCount: await registeredUserCount(database, game.id),
      capacity: game.playersAllowed ?? FRIENDLY_PLAYERS_ALLOWED,
    };
    gameSummaries.set(game.id, summary);
    return summary;
  }

  const requests: WaitingRequest[] = [];

  for (const request of levelRangeRows) {
    const { game } = request;
    if (!(await organizes(game))) {
      continue;
    }
    requests.push({
      kind: "level_range",
      id: request.id,
      createdAt: request.createdAt,
      user: request.user,
      levelTenths: await displayedLevelTenthsForUser(
        database,
        request.userId,
        game.sport,
      ),
      game: await summaryOf(game),
      requesterInGroup: game.groupId
        ? await isGroupMember(database, game.groupId, request.userId)
        : false,
    });
  }

  for (const row of joinRows) {
    const group = groupsById.get(row.groupId);
    if (!group) {
      continue;
    }
    const base = {
      id: row.id,
      createdAt: row.createdAt,
      user: row.user,
      invitedBy: row.invitedBy,
      invitedByViewer: row.invitedBy?.id === viewerId,
    };
    const heldGame = row.heldGame;
    if (
      heldGame &&
      row.seatHeldUntil &&
      isSeatHoldLive(row.seatHeldUntil, now) &&
      isUpcoming(heldGame, now)
    ) {
      requests.push({
        ...base,
        kind: "seat_hold",
        levelTenths: await displayedLevelTenthsForUser(
          database,
          row.userId,
          heldGame.sport,
        ),
        game: await summaryOf(heldGame),
        seatHeldUntil: row.seatHeldUntil,
        group: { id: group.id, name: group.name },
      });
      continue;
    }
    requests.push({
      ...base,
      kind: "group_join",
      levelTenths: await displayedLevelTenthsForUser(
        database,
        row.userId,
        group.sport,
      ),
      group: { id: group.id, name: group.name, sport: group.sport ?? "padel" },
      source: row.source,
      note: row.note,
      gamesWithMembers: await gamesWithMembers(database, {
        groupId: group.id,
        userId: row.userId,
        now,
      }),
    });
  }

  return sortWaitingRequests(requests);
}

export const waitingRequests = protectedProcedure.query(async ({ ctx }) => {
  const appUser = await resolveAppUser(ctx.userId);
  return listWaitingRequests(ctx.db, { userId: appUser.id });
});
