import type { DbClient as DbReader, DbTx } from "@repo/db";
import { TRPCError } from "@trpc/server";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import type { Locale } from "@repo/i18n/locale";

import {
  gamePlayers,
  games,
  groupJoinRequests,
  GroupJoinRequestStatusEnum,
  groups,
  ratings,
  type GroupJoinRequestHeldSeat,
} from "@repo/db";

import { type db } from "#src/db";
import {
  isGameOrganizer,
  isRegistrationOpen,
  type GameRow,
} from "#src/games/access";
import { admitIndividualUser } from "#src/games/invites";
import { upsertApprovedLevelRangeWaiver } from "#src/games/level-range-requests";
import {
  isIndividualSeatGame,
  listGameSides,
  vacantPositionsFromSides,
  type SeatChoice,
} from "#src/games/seats";
import {
  displayedLevelTenthsForUser,
  userAllowedByLevelRange,
} from "#src/games/user-allowed-by-level-range";
import { isGroupApprover } from "#src/groups/helpers/is-group-approver";
import { readTembaLevelView } from "#src/ratings/level-confirmed";

type DbOrTx = DbReader | DbTx;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type HeldSeatOutcome = "registered" | "waitlisted" | "lapsed" | null;

/**
 * The requests waiting on a Game, for a viewer who may decide them: Group join
 * requests from this Game's Invite link, with a live Seat hold or none
 * (ADR-0057). A lapsed hold drops out of the queue.
 */
export async function listGameSeatHolds(
  database: DbOrTx,
  game: GameRow,
  viewerUserId: string,
  now = new Date(),
) {
  if (!game.groupId) {
    return [];
  }
  const group = await database.query.groups.findFirst({
    where: eq(groups.id, game.groupId),
    columns: { id: true, name: true, createdBy: true },
  });
  if (!group || !(await isGroupApprover(database, group, viewerUserId))) {
    return [];
  }
  const rows = await database.query.groupJoinRequests.findMany({
    where: and(
      eq(groupJoinRequests.heldGameId, game.id),
      eq(groupJoinRequests.status, GroupJoinRequestStatusEnum.PENDING),
      or(
        isNull(groupJoinRequests.seatHeldUntil),
        gt(groupJoinRequests.seatHeldUntil, now),
      ),
    ),
    with: {
      user: { columns: { id: true, name: true, image: true } },
      invitedBy: { columns: { id: true, name: true } },
    },
    orderBy: (table, { asc }) => [asc(table.createdAt), asc(table.id)],
  });
  const ratingSport = game.sport === "football" ? "football" : "padel";
  return Promise.all(
    rows.map(async (row) => {
      const rating = await database.query.ratings.findFirst({
        where: and(
          eq(ratings.userId, row.userId),
          eq(ratings.sport, ratingSport),
        ),
      });
      return {
        id: row.id,
        createdAt: row.createdAt,
        seatHeldUntil: row.seatHeldUntil,
        heldSeat: row.heldSeat,
        user: row.user,
        invitedBy: row.invitedBy,
        groupName: group.name,
        levelTenths: await displayedLevelTenthsForUser(
          database,
          row.userId,
          game.sport,
        ),
        provisional: rating
          ? (await readTembaLevelView(database, rating)).provisional
          : false,
      };
    }),
  );
}

/** The held Position if it is still vacant, else any vacant one on that side, else anywhere. */
function pickSeat(
  held: GroupJoinRequestHeldSeat | null,
  vacant: { sideIndex: number; position: "left" | "right" }[],
): { sideIndex: number; position: SeatChoice } | undefined {
  if (held?.kind === "position") {
    const onSide = vacant.filter((entry) => entry.sideIndex === held.sideIndex);
    const wanted =
      held.position === "either"
        ? onSide[0]
        : onSide.find((entry) => entry.position === held.position);
    return wanted ?? onSide[0] ?? vacant[0];
  }
  return vacant[0];
}

/**
 * Seats an approved requester on the Game they asked for, at the seat they
 * picked while asking. Best effort: a seat that went meanwhile falls back to
 * any vacant one, a full Game to its Waitlist, and a refusal leaves the
 * approval standing. An approver who also organizes the Game waives its
 * Level range for the requester, since the approval is that decision.
 */
export async function seatRequesterOnGame(
  tx: Tx,
  args: {
    gameId: string;
    userId: string;
    heldSeat: GroupJoinRequestHeldSeat | null;
    approverUserId: string;
    locale: Locale;
    now: Date;
  },
): Promise<HeldSeatOutcome> {
  const { now } = args;
  const game = await tx.query.games.findFirst({
    where: eq(games.id, args.gameId),
  });
  if (
    !game ||
    !isRegistrationOpen(game, now) ||
    game.registrationMode === "team_only"
  ) {
    return "lapsed";
  }
  if (
    !(await userAllowedByLevelRange(tx, game, args.userId)) &&
    (await isGameOrganizer(tx, game, args.approverUserId))
  ) {
    await upsertApprovedLevelRangeWaiver(tx, {
      gameId: game.id,
      userId: args.userId,
      decidedBy: args.approverUserId,
    });
  }
  const held = args.heldSeat;
  const seat = isIndividualSeatGame(game)
    ? pickSeat(held, vacantPositionsFromSides(await listGameSides(tx, game)))
    : undefined;
  try {
    return await tx.transaction(async (savepoint) => {
      const admitted = await admitIndividualUser(
        savepoint,
        game,
        args.userId,
        args.locale,
        now,
        seat,
      );
      if (held?.kind === "football" && !admitted.waitlisted) {
        await savepoint
          .update(gamePlayers)
          .set({
            footballRole: held.role,
            footballPosition: held.position,
            updatedAt: now,
          })
          .where(
            and(
              eq(gamePlayers.gameId, game.id),
              eq(gamePlayers.userId, args.userId),
            ),
          );
      }
      return admitted.waitlisted ? "waitlisted" : "registered";
    });
  } catch (error) {
    if (error instanceof TRPCError) {
      return "lapsed";
    }
    throw error;
  }
}
