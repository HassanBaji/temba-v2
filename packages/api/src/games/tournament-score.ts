import { eq } from "drizzle-orm";

import { matchResultConfirmations } from "@repo/db";

import { scoreStandsAt } from "@repo/domain/tournament-round-state";

import { type db } from "#src/db";
import { type GameRow } from "#src/games/access";
import {
  matchSideSeats,
  type MatchSideSeats,
  type MatchSlot,
} from "#src/games/match-result-confirmations";
import { type MatchRow } from "#src/games/utils";
import { enqueueAt } from "#src/jobs/enqueue";
import { scoreStandsJob } from "#src/jobs/specs";
import { notify } from "#src/notifications/notify";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export type EnteredScore = {
  slot: MatchSlot;
  userId: string;
  enteredAt: Date;
  standsAt: Date;
};

function slotOfUser(
  sides: readonly MatchSideSeats[],
  userId: string,
): MatchSlot | null {
  return sides.find((side) => side.userIds.includes(userId))?.slot ?? null;
}

/**
 * Who entered a pending tournament score and when it stands: the seated
 * confirmations all sit on one side until the other team answers.
 */
export async function enteredScore(
  database: DbClient,
  match: MatchRow,
  sides?: readonly MatchSideSeats[],
): Promise<EnteredScore | null> {
  const seats = sides ?? (await matchSideSeats(database, match));
  const rows = await database.query.matchResultConfirmations.findMany({
    where: eq(matchResultConfirmations.matchId, match.id),
    columns: { userId: true, confirmedAt: true },
  });
  const seated = rows.flatMap((row) => {
    const slot = slotOfUser(seats, row.userId);
    return slot ? [{ ...row, slot }] : [];
  });
  const slots = new Set(seated.map((row) => row.slot));
  if (slots.size !== 1) {
    return null;
  }
  const latest = seated.reduce((left, right) =>
    right.confirmedAt > left.confirmedAt ? right : left,
  );
  return {
    slot: latest.slot,
    userId: latest.userId,
    enteredAt: latest.confirmedAt,
    standsAt: scoreStandsAt(latest.confirmedAt),
  };
}

/**
 * Starts the other team's ten minutes: the stand Job, and a Notification to
 * each of their account holders.
 */
export async function askOtherTeamToConfirm(
  database: DbClient,
  args: {
    game: Pick<GameRow, "id" | "groupId">;
    match: MatchRow;
    enteringSlot: MatchSlot;
    actorUserId: string;
    enteredAt: Date;
  },
) {
  await enqueueAt(
    database,
    scoreStandsJob(args.match.id),
    scoreStandsAt(args.enteredAt),
  );
  const sides = await matchSideSeats(database, args.match);
  const other = sides.find((side) => side.slot !== args.enteringSlot);
  if (!other) {
    return;
  }
  await notify(database, {
    type: "match_score_to_confirm",
    recipients: other.accountHolderIds.map((userId) => ({
      userId,
      audience: "player" as const,
    })),
    excludeUserIds: [args.actorUserId],
    actorUserId: args.actorUserId,
    groupId: args.game.groupId,
    gameId: args.game.id,
  });
}

export function seatedSlot(
  sides: readonly MatchSideSeats[],
  userId: string,
): MatchSlot | null {
  return slotOfUser(sides, userId);
}
