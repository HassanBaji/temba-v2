import type { DbClient, DbTx, UserMergeSummary } from "@repo/db";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

import {
  account,
  bookingPayments,
  bookings,
  coach,
  coachingSessionPlayers,
  communities,
  communityEmailInvites,
  communityInviteLinks,
  communityJoinRequests,
  communityMemberInvites,
  communityMembers,
  gameInviteLinkConsents,
  gameInviteLinks,
  gameLevelRangeRequests,
  gameMemberInvites,
  gamePlayers,
  games,
  gameWaitlist,
  groupEmailInvites,
  groupInviteLinks,
  groupJoinRequests,
  groupLinkRequests,
  groupMemberInvites,
  groupMembers,
  groups,
  levelOverrides,
  matchGoals,
  matchResultConfirmations,
  notifications,
  ratingEvents,
  ratings,
  session,
  teamEmailInvites,
  teamInviteLinks,
  teamLinkRequests,
  teamMemberInvites,
  teamMembers,
  teams,
  user,
  userMerges,
  venueClosures,
  venueLinkRequests,
  venueManagers,
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
  {
    column: communityMembers.userId,
    sameKeys: [communityMembers.communityId],
  },
  { column: teamMembers.userId, sameKeys: [teamMembers.teamId] },
  { column: venueManagers.userId, sameKeys: [venueManagers.venueId] },
  {
    column: matchResultConfirmations.userId,
    sameKeys: [matchResultConfirmations.matchId],
  },
  { column: matchGoals.userId, sameKeys: [matchGoals.matchId] },
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
    column: communityMemberInvites.userId,
    sameKeys: [communityMemberInvites.communityId],
    whileUnused: [
      communityMemberInvites.acceptedAt,
      communityMemberInvites.revokedAt,
    ],
  },
  {
    column: teamMemberInvites.userId,
    sameKeys: [teamMemberInvites.teamId],
    whileUnused: [teamMemberInvites.acceptedAt, teamMemberInvites.revokedAt],
  },
  {
    column: communityJoinRequests.userId,
    sameKeys: [communityJoinRequests.communityId],
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

const plainUserReferences: PgColumn[] = [
  account.userId,
  session.userId,
  user.addedByUserId,
  userMerges.survivorUserId,
  notifications.actorUserId,
  notifications.partnerUserId,
  games.createdBy,
  groups.createdBy,
  groups.verifiedBy,
  communities.createdBy,
  teams.createdBy,
  coach.addedBy,
  coachingSessionPlayers.userId,
  gameMemberInvites.invitedBy,
  groupMemberInvites.invitedBy,
  communityMemberInvites.invitedBy,
  teamMemberInvites.invitedBy,
  groupEmailInvites.userId,
  groupEmailInvites.invitedBy,
  communityEmailInvites.userId,
  communityEmailInvites.invitedBy,
  teamEmailInvites.userId,
  teamEmailInvites.invitedBy,
  gameInviteLinks.createdBy,
  groupInviteLinks.createdBy,
  communityInviteLinks.createdBy,
  teamInviteLinks.createdBy,
  communityJoinRequests.decidedBy,
  groupJoinRequests.decidedBy,
  gameLevelRangeRequests.decidedBy,
  groupLinkRequests.requestedBy,
  groupLinkRequests.decidedBy,
  teamLinkRequests.requestedBy,
  teamLinkRequests.decidedBy,
  venueLinkRequests.requestedBy,
  venueLinkRequests.decidedBy,
  venueManagers.grantedByUserId,
  venueClosures.createdByUserId,
  bookings.userId,
  bookings.cancelledByUserId,
  bookings.createdByUserId,
  bookingPayments.settledByUserId,
  bookingPayments.refundedByUserId,
  levelOverrides.setByUserId,
];

/** Every column referencing `user.id` that the merge reassigns or resolves. */
export const mergedUserReferenceColumns: readonly PgColumn[] = [
  ...uniqueUserReferences.map((reference) => reference.column),
  ...ratingUserReferences,
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

async function seatAndMembershipCounts(tx: DbTx, ids: MergeIds) {
  const both = [ids.survivorUserId, ids.mergedUserId];
  const [seatRows, groupRows, communityRows] = await Promise.all([
    tx
      .select({ userId: gamePlayers.userId, key: gamePlayers.gameId })
      .from(gamePlayers)
      .where(inArray(gamePlayers.userId, both)),
    tx
      .select({ userId: groupMembers.userId, key: groupMembers.groupId })
      .from(groupMembers)
      .where(inArray(groupMembers.userId, both)),
    tx
      .select({
        userId: communityMembers.userId,
        key: communityMembers.communityId,
      })
      .from(communityMembers)
      .where(inArray(communityMembers.userId, both)),
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
    membershipsMoved: split(groupRows).moved + split(communityRows).moved,
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
