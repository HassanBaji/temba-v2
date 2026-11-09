import { type Locale } from "@repo/i18n/locale";
import { and, eq, isNull } from "drizzle-orm";

import {
  gameInviteLinks,
  groupInviteLinks,
  groupJoinRequests,
  GroupJoinRequestStatusEnum,
  groupMembers,
  groups,
  teamInviteLinks,
  teamMembers,
} from "@repo/db";

import { type db } from "#src/db";
import { requireGame } from "#src/games/access";
import {
  admitIndividualUser,
  recordTeamInviteLinkConsent,
} from "#src/games/invites";
import { isIndividualSeatGame } from "#src/games/seats";
import { isBlockedFromGroup } from "#src/groups/helpers/is-blocked-from-group";
import { markPendingGroupJoinRequestApproved } from "#src/groups/helpers/mark-pending-group-join-request-approved";
import { writeDb } from "#src/invites/doors/helpers/write-db";
import { notifyGroupJoined } from "#src/notifications/notify-group-joined";
import { notifyGroupJoinRequested } from "#src/notifications/notify-requests";
import { isInviteLinkLive } from "#src/invites/invite-link-expiry";
import { assertInviteOpen } from "#src/invites/doors/consult";
import type {
  AcceptLinkResult,
  AcceptSeat,
  InviteDb,
  InviteHost,
} from "#src/invites/doors/utils";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function requestGroupJoinFromLink(
  database: InviteDb,
  args: {
    group: { id: string; createdBy: string };
    userId: string;
    invitedBy: string;
  },
) {
  const { group } = args;
  const groupId = group.id;
  const existing = await database.query.groupJoinRequests.findFirst({
    where: and(
      eq(groupJoinRequests.groupId, groupId),
      eq(groupJoinRequests.userId, args.userId),
    ),
    columns: { id: true, status: true },
  });
  if (existing?.status === GroupJoinRequestStatusEnum.PENDING) {
    return;
  }
  const details = {
    status: GroupJoinRequestStatusEnum.PENDING,
    decidedBy: null,
    note: null,
    source: "invite_link" as const,
    invitedBy: args.invitedBy,
  };
  if (existing) {
    await writeDb(database)
      .update(groupJoinRequests)
      .set({ ...details, updatedAt: new Date() })
      .where(eq(groupJoinRequests.id, existing.id));
  } else {
    await writeDb(database)
      .insert(groupJoinRequests)
      .values({ groupId, userId: args.userId, ...details });
  }
  await notifyGroupJoinRequested(database, {
    group,
    requesterUserId: args.userId,
  });
}

export async function acceptLink(
  database: InviteDb,
  hostKind: InviteHost["kind"],
  args: { token: string; userId: string; seat?: AcceptSeat; locale: Locale },
): Promise<AcceptLinkResult> {
  if (hostKind === "group") {
    const link = await database.query.groupInviteLinks.findFirst({
      where: eq(groupInviteLinks.token, args.token),
    });
    if (!link || !isInviteLinkLive(link.expiresAt)) {
      return { ok: false, reason: "not_found" };
    }
    const host = { kind: "group" as const, id: link.groupId };
    const open = await assertInviteOpen(database, host, "accept");
    if (!open.ok) {
      return open.reason === "frozen"
        ? { ok: false, reason: "frozen" }
        : { ok: false, reason: "not_found" };
    }
    const group = await database.query.groups.findFirst({
      where: and(eq(groups.id, host.id), isNull(groups.deletedAt)),
      columns: {
        id: true,
        createdBy: true,
        type: true,
        requiresApproval: true,
      },
    });
    if (!group) {
      return { ok: false, reason: "not_found" };
    }
    const existing = await database.query.groupMembers.findFirst({
      where: and(
        eq(groupMembers.groupId, host.id),
        eq(groupMembers.userId, args.userId),
      ),
      columns: { id: true },
    });
    if (existing) {
      await markPendingGroupJoinRequestApproved(database, {
        groupId: host.id,
        userId: args.userId,
        decidedBy: args.userId,
      });
      return { ok: false, reason: "already_member" };
    }
    if (await isBlockedFromGroup(database, host.id, args.userId)) {
      return { ok: false, reason: "blocked" };
    }
    if (group.type === "public" && group.requiresApproval) {
      await requestGroupJoinFromLink(database, {
        group,
        userId: args.userId,
        invitedBy: link.createdBy,
      });
      return {
        ok: true,
        alreadyMember: false,
        requested: true,
        hostId: host.id,
      };
    }
    await writeDb(database).insert(groupMembers).values({
      groupId: host.id,
      userId: args.userId,
    });
    await notifyGroupJoined(database, { group, joinerUserId: args.userId });
    await markPendingGroupJoinRequestApproved(database, {
      groupId: host.id,
      userId: args.userId,
      decidedBy: args.userId,
    });
    return {
      ok: true,
      alreadyMember: false,
      requested: false,
      hostId: host.id,
    };
  }

  if (hostKind === "team") {
    const link = await database.query.teamInviteLinks.findFirst({
      where: eq(teamInviteLinks.token, args.token),
    });
    if (!link || !isInviteLinkLive(link.expiresAt)) {
      return { ok: false, reason: "not_found" };
    }
    const host = { kind: "team" as const, id: link.teamId };
    const open = await assertInviteOpen(database, host, "accept");
    if (!open.ok) {
      return open.reason === "frozen"
        ? { ok: false, reason: "frozen" }
        : { ok: false, reason: "not_found" };
    }
    const existing = await database.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.teamId, host.id),
        eq(teamMembers.userId, args.userId),
      ),
      columns: { id: true },
    });
    if (existing) {
      return { ok: false, reason: "already_member" };
    }
    await writeDb(database).insert(teamMembers).values({
      teamId: host.id,
      userId: args.userId,
    });
    return { ok: true, alreadyMember: false, hostId: host.id };
  }

  const link = await database.query.gameInviteLinks.findFirst({
    where: eq(gameInviteLinks.token, args.token),
  });
  if (!link) {
    return { ok: false, reason: "not_found" };
  }
  const host = { kind: "game" as const, id: link.gameId };
  const open = await assertInviteOpen(database, host, "accept");
  if (!open.ok) {
    return open.reason === "frozen"
      ? { ok: false, reason: "frozen" }
      : { ok: false, reason: "not_found" };
  }
  const game = await requireGame(writeDb(database), host.id);
  if (game.registrationMode === "team_only") {
    const consent = await recordTeamInviteLinkConsent(database as Tx, {
      game,
      linkId: link.id,
      userId: args.userId,
      locale: args.locale,
    });
    if (consent.outcome === "waiting_for_partner") {
      return {
        ok: true,
        alreadyMember: false,
        waitingForPartner: true,
        hostId: host.id,
      };
    }
    return {
      ok: true,
      alreadyMember: false,
      waitlisted: consent.waitlisted,
      hostId: host.id,
    };
  }
  if (isIndividualSeatGame(game) && !args.seat) {
    return { ok: false, reason: "seat_required" };
  }
  const occupancy = await admitIndividualUser(
    database as Tx,
    game,
    args.userId,
    args.locale,
    new Date(),
    args.seat,
  );
  return {
    ok: true,
    alreadyMember: false,
    waitlisted: occupancy.waitlisted,
    hostId: host.id,
  };
}
