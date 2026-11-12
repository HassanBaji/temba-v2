import type { DbClient, DbTx, UserMergeSummary } from "@repo/db";
import { and, count, eq, inArray, or, sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

import {
  account,
  bookingPayments,
  bookings,
  challengeProposals,
  challenges,
  coach,
  coachingSessionPlayers,
  gameInviteLinkConsents,
  gameInviteLinks,
  gameLevelRangeRequests,
  gameMemberInvites,
  gameMvpVotes,
  gamePlayers,
  gameTeamPlayers,
  games,
  gameWaitlist,
  groupEmailInvites,
  groupInviteLinks,
  groupJoinRequests,
  groupLevelOverrides,
  groupRatingEvents,
  groupRatings,
  groupTierEvents,
  groupTierPoints,
  groupLinkRequests,
  groupMemberInvites,
  groupMembers,
  groupSeasons,
  groups,
  levelOverrides,
  marks,
  matchGoals,
  matchResultConfirmations,
  matchVerifierStamps,
  notifications,
  performanceRatingResults,
  performanceRatings,
  ratingEvents,
  ratings,
  session,
  teamEmailInvites,
  teamInviteLinks,
  teamMemberInvites,
  teamMembers,
  teams,
  user,
  userMerges,
  venueClosures,
  venueManagers,
  venueVerifiers,
  venues,
} from "@repo/db";

import { type db } from "#src/db";
import { isUnclaimed } from "#src/unclaimed-players/is-unclaimed";
import { notifyHistoryLinked } from "#src/unclaimed-players/notify-history-linked";

type MergeDb = DbClient | DbTx;
type Sport = keyof UserMergeSummary["ratingKeptBySport"];

type MergeIds = { survivorUserId: string; mergedUserId: string };

/**
 * A user reference covered by a unique index. Where the survivor already holds
 * a row with the same keys, the merged player's row is dropped and the
 * survivor's kept; `whileUnused` scopes the index to rows not yet accepted or
 * revoked.
 */
type UniqueUserReference = {
  column: PgColumn;
  sameKeys: PgColumn[];
  whileUnused?: [PgColumn, PgColumn];
};

const uniqueUserReferences: UniqueUserReference[] = [
  { column: gamePlayers.userId, sameKeys: [gamePlayers.gameId] },
  { column: gameWaitlist.userId, sameKeys: [gameWaitlist.gameId] },
  { column: groupMembers.userId, sameKeys: [groupMembers.groupId] },
  { column: teamMembers.userId, sameKeys: [teamMembers.teamId] },
  { column: venueManagers.userId, sameKeys: [venueManagers.venueId] },
  { column: venueVerifiers.userId, sameKeys: [venueVerifiers.venueId] },
  {
    column: matchResultConfirmations.userId,
    sameKeys: [matchResultConfirmations.matchId],
  },
  { column: matchGoals.userId, sameKeys: [matchGoals.matchId] },
  {
    column: marks.receiverUserId,
    sameKeys: [marks.matchId, marks.giverUserId],
  },
  {
    column: marks.giverUserId,
    sameKeys: [marks.matchId, marks.receiverUserId],
  },
  { column: gameMvpVotes.voterUserId, sameKeys: [gameMvpVotes.gameId] },
  {
    column: performanceRatings.rateeUserId,
    sameKeys: [performanceRatings.matchId, performanceRatings.raterUserId],
  },
  {
    column: performanceRatings.raterUserId,
    sameKeys: [performanceRatings.matchId, performanceRatings.rateeUserId],
  },
  {
    column: performanceRatingResults.userId,
    sameKeys: [performanceRatingResults.matchId],
  },
  {
    column: gameInviteLinkConsents.userId,
    sameKeys: [gameInviteLinkConsents.gameInviteLinkId],
  },
  {
    column: gameMemberInvites.userId,
    sameKeys: [gameMemberInvites.gameId],
    whileUnused: [gameMemberInvites.acceptedAt, gameMemberInvites.revokedAt],
  },
  {
    column: groupMemberInvites.userId,
    sameKeys: [groupMemberInvites.groupId],
    whileUnused: [groupMemberInvites.acceptedAt, groupMemberInvites.revokedAt],
  },
  {
    column: teamMemberInvites.userId,
    sameKeys: [teamMemberInvites.teamId],
    whileUnused: [teamMemberInvites.acceptedAt, teamMemberInvites.revokedAt],
  },
  { column: groupJoinRequests.userId, sameKeys: [groupJoinRequests.groupId] },
  {
    column: gameLevelRangeRequests.userId,
    sameKeys: [gameLevelRangeRequests.gameId],
  },
  {
    column: notifications.recipientUserId,
    sameKeys: [notifications.dedupeKey],
  },
];

const ratingUserReferences: PgColumn[] = [
  ratings.userId,
  ratingEvents.userId,
  levelOverrides.userId,
];

const groupRatingUserReferences: PgColumn[] = [
  groupRatings.userId,
  groupRatingEvents.userId,
  groupLevelOverrides.userId,
];

const groupTierUserReferences: PgColumn[] = [
  groupTierPoints.userId,
  groupTierEvents.userId,
];

const plainUserReferences: PgColumn[] = [
  account.userId,
  session.userId,
  user.addedByUserId,
  userMerges.survivorUserId,
  notifications.actorUserId,
  notifications.partnerUserId,
  games.createdBy,
  games.mvpUserId,
  gameMvpVotes.candidateUserId,
  gameTeamPlayers.sideSetBy,
  groups.createdBy,
  groups.verifiedBy,
  groups.deletedBy,
  groupSeasons.createdBy,
  groupSeasons.closedBy,
  teams.createdBy,
  challenges.postedBy,
  challengeProposals.proposedBy,
  challengeProposals.decidedBy,
  coach.addedBy,
  coachingSessionPlayers.userId,
  gameMemberInvites.invitedBy,
  groupMemberInvites.invitedBy,
  teamMemberInvites.invitedBy,
  groupEmailInvites.userId,
  groupEmailInvites.invitedBy,
  teamEmailInvites.userId,
  teamEmailInvites.invitedBy,
  gameInviteLinks.createdBy,
  groupInviteLinks.createdBy,
  teamInviteLinks.createdBy,
  groupJoinRequests.decidedBy,
  groupJoinRequests.invitedBy,
  gameLevelRangeRequests.decidedBy,
  groupLinkRequests.requestedBy,
  groupLinkRequests.decidedBy,
  venues.partnerBy,
  venueManagers.grantedByUserId,
  venueVerifiers.grantedByUserId,
  matchVerifierStamps.verifierUserId,
  venueClosures.createdByUserId,
  bookings.userId,
  bookings.cancelledByUserId,
  bookings.createdByUserId,
  bookingPayments.settledByUserId,
  bookingPayments.refundedByUserId,
  levelOverrides.setByUserId,
  groupLevelOverrides.setByUserId,
  groupTierEvents.setByUserId,
];

/** Every column referencing `user.id` that the merge reassigns or resolves. */
export const mergedUserReferenceColumns: readonly PgColumn[] = [
  ...uniqueUserReferences.map((reference) => reference.column),
  ...ratingUserReferences,
  ...groupRatingUserReferences,
  ...groupTierUserReferences,
  ...plainUserReferences,
];

function aliased(alias: string, column: PgColumn) {
  return sql`${sql.identifier(alias)}.${sql.identifier(column.name)}`;
}

async function dropMergedDuplicates(
  tx: DbTx,
  reference: UniqueUserReference,
  ids: MergeIds,
) {
  const sameKeys = reference.sameKeys.map(
    (key) => sql`${aliased("kept", key)} = ${aliased("dropped", key)}`,
  );
  const unused = (reference.whileUnused ?? []).flatMap((column) => [
    sql`${aliased("kept", column)} is null`,
    sql`${aliased("dropped", column)} is null`,
  ]);
  await tx.execute(sql`
    delete from ${reference.column.table} as ${sql.identifier("dropped")}
    where ${aliased("dropped", reference.column)} = ${ids.mergedUserId}
      and exists (
        select 1 from ${reference.column.table} as ${sql.identifier("kept")}
        where ${aliased("kept", reference.column)} = ${ids.survivorUserId}
          and ${sql.join([...sameKeys, ...unused], sql` and `)}
      )
  `);
}

/** A Mark between the two would become a Mark to oneself, which the table refuses. */
async function dropMarksBetween(tx: DbTx, ids: MergeIds) {
  await tx
    .delete(marks)
    .where(
      or(
        and(
          eq(marks.giverUserId, ids.survivorUserId),
          eq(marks.receiverUserId, ids.mergedUserId),
        ),
        and(
          eq(marks.giverUserId, ids.mergedUserId),
          eq(marks.receiverUserId, ids.survivorUserId),
        ),
      ),
    );
}

/** A vote between the two would become a vote for oneself, which the table refuses. */
async function dropMvpVotesBetween(tx: DbTx, ids: MergeIds) {
  await tx
    .delete(gameMvpVotes)
    .where(
      or(
        and(
          eq(gameMvpVotes.voterUserId, ids.survivorUserId),
          eq(gameMvpVotes.candidateUserId, ids.mergedUserId),
        ),
        and(
          eq(gameMvpVotes.voterUserId, ids.mergedUserId),
          eq(gameMvpVotes.candidateUserId, ids.survivorUserId),
        ),
      ),
    );
}

/** A Performance rating between the two would become one to oneself, which the table refuses. */
async function dropPerformanceRatingsBetween(tx: DbTx, ids: MergeIds) {
  await tx
    .delete(performanceRatings)
    .where(
      or(
        and(
          eq(performanceRatings.raterUserId, ids.survivorUserId),
          eq(performanceRatings.rateeUserId, ids.mergedUserId),
        ),
        and(
          eq(performanceRatings.raterUserId, ids.mergedUserId),
          eq(performanceRatings.rateeUserId, ids.survivorUserId),
        ),
      ),
    );
}

async function reassign(tx: DbTx, column: PgColumn, ids: MergeIds) {
  await tx.execute(sql`
    update ${column.table}
    set ${sql.identifier(column.name)} = ${ids.survivorUserId}
    where ${column} = ${ids.mergedUserId}
  `);
}

async function ratedMatchCount(tx: DbTx, userId: string, sport: Sport) {
  const [row] = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(ratingEvents)
    .where(and(eq(ratingEvents.userId, userId), eq(ratingEvents.sport, sport)));
  return row?.count ?? 0;
}

async function deleteRatingHistory(tx: DbTx, userId: string, sport: Sport) {
  await tx
    .delete(ratings)
    .where(and(eq(ratings.userId, userId), eq(ratings.sport, sport)));
  await tx
    .delete(ratingEvents)
    .where(and(eq(ratingEvents.userId, userId), eq(ratingEvents.sport, sport)));
  await tx
    .delete(levelOverrides)
    .where(
      and(eq(levelOverrides.userId, userId), eq(levelOverrides.sport, sport)),
    );
}

async function moveRatingHistory(tx: DbTx, sport: Sport, ids: MergeIds) {
  const survivor = { userId: ids.survivorUserId };
  await tx
    .update(ratings)
    .set(survivor)
    .where(and(eq(ratings.userId, ids.mergedUserId), eq(ratings.sport, sport)));
  await tx
    .update(ratingEvents)
    .set(survivor)
    .where(
      and(
        eq(ratingEvents.userId, ids.mergedUserId),
        eq(ratingEvents.sport, sport),
      ),
    );
  await tx
    .update(levelOverrides)
    .set(survivor)
    .where(
      and(
        eq(levelOverrides.userId, ids.mergedUserId),
        eq(levelOverrides.sport, sport),
      ),
    );
}

async function sportsWithRatingHistory(tx: DbTx, ids: MergeIds) {
  const both = [ids.survivorUserId, ids.mergedUserId];
  const [ratingRows, eventRows, overrideRows] = await Promise.all([
    tx
      .select({ userId: ratings.userId, sport: ratings.sport })
      .from(ratings)
      .where(inArray(ratings.userId, both)),
    tx
      .selectDistinct({ sport: ratingEvents.sport })
      .from(ratingEvents)
      .where(inArray(ratingEvents.userId, both)),
    tx
      .selectDistinct({ sport: levelOverrides.sport })
      .from(levelOverrides)
      .where(inArray(levelOverrides.userId, both)),
  ]);
  const sports = new Set<Sport>([
    ...ratingRows.map((row) => row.sport),
    ...eventRows.map((row) => row.sport),
    ...overrideRows.map((row) => row.sport),
  ]);
  return { sports, ratingRows };
}

/**
 * Per sport, the Rating with more Rated Matches stays and the account's wins a
 * tie; a side without a Rating row never beats one with it. The other Rating,
 * its rating events and its Level overrides are deleted, never averaged.
 */
async function resolveRatings(tx: DbTx, ids: MergeIds) {
  const { sports, ratingRows } = await sportsWithRatingHistory(tx, ids);
  const ratingKeptBySport: UserMergeSummary["ratingKeptBySport"] = {};

  for (const sport of sports) {
    const hasRating = (userId: string) =>
      ratingRows.some((row) => row.userId === userId && row.sport === sport);
    const survivorHasRating = hasRating(ids.survivorUserId);
    const mergedHasRating = hasRating(ids.mergedUserId);

    let keep: "survivor" | "merged";
    if (survivorHasRating !== mergedHasRating) {
      keep = survivorHasRating ? "survivor" : "merged";
    } else {
      const [survivorMatches, mergedMatches] = await Promise.all([
        ratedMatchCount(tx, ids.survivorUserId, sport),
        ratedMatchCount(tx, ids.mergedUserId, sport),
      ]);
      keep = mergedMatches > survivorMatches ? "merged" : "survivor";
    }

    if (keep === "survivor") {
      await deleteRatingHistory(tx, ids.mergedUserId, sport);
    } else {
      await deleteRatingHistory(tx, ids.survivorUserId, sport);
      await moveRatingHistory(tx, sport, ids);
    }
    if (survivorHasRating || mergedHasRating) {
      ratingKeptBySport[sport] = keep;
    }
  }
  return ratingKeptBySport;
}

async function groupRatedMatchCount(tx: DbTx, userId: string, groupId: string) {
  const [row] = await tx
    .select({ value: count() })
    .from(groupRatingEvents)
    .where(
      and(
        eq(groupRatingEvents.userId, userId),
        eq(groupRatingEvents.groupId, groupId),
      ),
    );
  return Number(row?.value ?? 0);
}

async function deleteGroupRatingHistory(
  tx: DbTx,
  userId: string,
  groupId: string,
) {
  await tx
    .delete(groupRatings)
    .where(
      and(eq(groupRatings.userId, userId), eq(groupRatings.groupId, groupId)),
    );
  await tx
    .delete(groupRatingEvents)
    .where(
      and(
        eq(groupRatingEvents.userId, userId),
        eq(groupRatingEvents.groupId, groupId),
      ),
    );
  await tx
    .delete(groupLevelOverrides)
    .where(
      and(
        eq(groupLevelOverrides.userId, userId),
        eq(groupLevelOverrides.groupId, groupId),
      ),
    );
}

/**
 * Per Group, the same rule as `resolveRatings`: the Group Level with more
 * Group rating events stays and the account's wins a tie. The merged side's
 * remaining Group Levels move with the plain reassignment.
 */
async function resolveGroupRatings(tx: DbTx, ids: MergeIds) {
  const rows = await tx
    .select({ userId: groupRatings.userId, groupId: groupRatings.groupId })
    .from(groupRatings)
    .where(
      inArray(groupRatings.userId, [ids.survivorUserId, ids.mergedUserId]),
    );
  const survivorGroups = new Set(
    rows
      .filter((row) => row.userId === ids.survivorUserId)
      .map((row) => row.groupId),
  );
  const sharedGroups = rows
    .filter(
      (row) =>
        row.userId === ids.mergedUserId && survivorGroups.has(row.groupId),
    )
    .map((row) => row.groupId);

  for (const groupId of sharedGroups) {
    const [survivorMatches, mergedMatches] = await Promise.all([
      groupRatedMatchCount(tx, ids.survivorUserId, groupId),
      groupRatedMatchCount(tx, ids.mergedUserId, groupId),
    ]);
    await deleteGroupRatingHistory(
      tx,
      mergedMatches > survivorMatches ? ids.survivorUserId : ids.mergedUserId,
      groupId,
    );
  }
  for (const column of groupRatingUserReferences) {
    await reassign(tx, column, ids);
  }
}

/**
 * Per tier Group, the Tier points with more games counted stay and the
 * account's win a tie; the other side's points row and ledger there go. The
 * merged side's remaining tiers move with the plain reassignment.
 */
async function resolveGroupTiers(tx: DbTx, ids: MergeIds) {
  const rows = await tx
    .select({
      userId: groupTierPoints.userId,
      groupId: groupTierPoints.groupId,
      gamesCounted: groupTierPoints.gamesCounted,
    })
    .from(groupTierPoints)
    .where(
      inArray(groupTierPoints.userId, [ids.survivorUserId, ids.mergedUserId]),
    );
  const survivorGames = new Map(
    rows
      .filter((row) => row.userId === ids.survivorUserId)
      .map((row) => [row.groupId, row.gamesCounted]),
  );
  for (const row of rows) {
    const survivorGamesCounted = survivorGames.get(row.groupId);
    if (row.userId !== ids.mergedUserId || survivorGamesCounted === undefined) {
      continue;
    }
    const dropped =
      row.gamesCounted > survivorGamesCounted
        ? ids.survivorUserId
        : ids.mergedUserId;
    await tx
      .delete(groupTierPoints)
      .where(
        and(
          eq(groupTierPoints.userId, dropped),
          eq(groupTierPoints.groupId, row.groupId),
        ),
      );
    await tx
      .delete(groupTierEvents)
      .where(
        and(
          eq(groupTierEvents.userId, dropped),
          eq(groupTierEvents.groupId, row.groupId),
        ),
      );
  }
  for (const column of groupTierUserReferences) {
    await reassign(tx, column, ids);
  }
}

async function seatAndMembershipCounts(tx: DbTx, ids: MergeIds) {
  const both = [ids.survivorUserId, ids.mergedUserId];
  const [seatRows, groupRows] = await Promise.all([
    tx
      .select({ userId: gamePlayers.userId, key: gamePlayers.gameId })
      .from(gamePlayers)
      .where(inArray(gamePlayers.userId, both)),
    tx
      .select({ userId: groupMembers.userId, key: groupMembers.groupId })
      .from(groupMembers)
      .where(inArray(groupMembers.userId, both)),
  ]);

  function split(rows: { userId: string | null; key: string }[]) {
    const survivorKeys = new Set(
      rows
        .filter((row) => row.userId === ids.survivorUserId)
        .map((row) => row.key),
    );
    const merged = rows.filter((row) => row.userId === ids.mergedUserId);
    const shared = merged.filter((row) => survivorKeys.has(row.key)).length;
    return { moved: merged.length - shared, dropped: shared };
  }

  const seats = split(seatRows);
  return {
    seatsMoved: seats.moved,
    seatsDropped: seats.dropped,
    membershipsMoved: split(groupRows).moved,
  };
}

async function dropWaitlistForSeatedGames(tx: DbTx, userId: string) {
  await tx
    .delete(gameWaitlist)
    .where(
      and(
        eq(gameWaitlist.userId, userId),
        inArray(
          gameWaitlist.gameId,
          tx
            .select({ gameId: gamePlayers.gameId })
            .from(gamePlayers)
            .where(eq(gamePlayers.userId, userId)),
        ),
      ),
    );
}

/**
 * Absorbs an Unclaimed player into the account that verified their phone
 * (ADR-0042), in one transaction. Seats, memberships and every other reference
 * move to the account; where both hold the same seat or membership the
 * account's row stays. Completed Matches are left as recorded. Returns null
 * when the row is no longer an Unclaimed player holding that phone, so a
 * repeated webhook delivery does nothing.
 */
export async function mergeIntoAccount(
  database: MergeDb,
  args: { survivorUserId: string; mergedUserId: string; phoneNumber: string },
) {
  const ids: MergeIds = {
    survivorUserId: args.survivorUserId,
    mergedUserId: args.mergedUserId,
  };

  return (database as typeof db).transaction(async (tx) => {
    const [merged] = await tx
      .select()
      .from(user)
      .where(eq(user.id, ids.mergedUserId))
      .for("update");
    if (
      !merged ||
      !isUnclaimed(merged) ||
      merged.phoneNumber !== args.phoneNumber
    ) {
      return null;
    }
    const [survivor] = await tx
      .select()
      .from(user)
      .where(eq(user.id, ids.survivorUserId))
      .for("update");
    if (!survivor || isUnclaimed(survivor)) {
      return null;
    }

    const counts = await seatAndMembershipCounts(tx, ids);
    const ratingKeptBySport = await resolveRatings(tx, ids);
    await resolveGroupRatings(tx, ids);
    await resolveGroupTiers(tx, ids);
    await dropMarksBetween(tx, ids);
    await dropMvpVotesBetween(tx, ids);
    await dropPerformanceRatingsBetween(tx, ids);

    for (const reference of uniqueUserReferences) {
      await dropMergedDuplicates(tx, reference, ids);
      await reassign(tx, reference.column, ids);
    }
    await dropWaitlistForSeatedGames(tx, ids.survivorUserId);
    for (const column of plainUserReferences) {
      await reassign(tx, column, ids);
    }

    await tx.delete(user).where(eq(user.id, ids.mergedUserId));
    const now = new Date();
    await tx
      .update(user)
      .set({
        phoneNumber: args.phoneNumber,
        phoneNumberVerified: true,
        claimedAt: survivor.claimedAt ?? now,
        updatedAt: now,
      })
      .where(eq(user.id, ids.survivorUserId));

    const summary: UserMergeSummary = { ...counts, ratingKeptBySport };
    const [record] = await tx
      .insert(userMerges)
      .values({
        survivorUserId: ids.survivorUserId,
        mergedUserId: ids.mergedUserId,
        phoneNumber: args.phoneNumber,
        mergedAt: now,
        summary,
      })
      .returning();

    await notifyHistoryLinked(tx, {
      userId: ids.survivorUserId,
      gameCount: counts.seatsMoved,
      dedupeKey: `history_linked:${ids.mergedUserId}`,
    });

    return record ?? null;
  });
}
