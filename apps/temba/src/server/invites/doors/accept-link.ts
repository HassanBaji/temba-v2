import { and, eq } from "drizzle-orm";

import {
  communityInviteLinks,
  CommunityRoleEnum,
  gameInviteLinks,
  groupInviteLinks,
  groupMembers,
  groups,
  teamInviteLinks,
  teamMembers,
} from "@repo/db";

import { type db } from "~/server/db";
import { admit as admitCommunityMember } from "~/server/community-membership";
import { requireGame } from "~/server/games/access";
import {
  admitIndividualUser,
  recordTeamInviteLinkConsent,
} from "~/server/games/invites";
import { isIndividualSeatGame } from "~/server/games/seats";
import { writeDb } from "~/server/invites/doors/helpers/write-db";
import { isInviteLinkLive } from "~/server/invites/invite-link-expiry";
import { assertInviteOpen } from "~/server/invites/doors/consult";
import type {
  AcceptLinkResult,
  AcceptSeat,
  InviteDb,
  InviteHost,
} from "~/server/invites/doors/types";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function acceptLink(
  database: InviteDb,
  hostKind: InviteHost["kind"],
  args: { token: string; userId: string; seat?: AcceptSeat },
): Promise<AcceptLinkResult> {
  if (hostKind === "community") {
    const link = await database.query.communityInviteLinks.findFirst({
      where: eq(communityInviteLinks.token, args.token),
    });
    if (!link || !isInviteLinkLive(link.expiresAt)) {
      return { ok: false, reason: "not_found" };
    }
    const host = { kind: "community" as const, id: link.communityId };
    const open = await assertInviteOpen(database, host, "accept");
    if (!open.ok) {
      return open.reason === "frozen"
        ? { ok: false, reason: "frozen" }
        : { ok: false, reason: "not_found" };
    }
    const admitted = await admitCommunityMember(database, {
      communityId: host.id,
      userId: args.userId,
      role: CommunityRoleEnum.MEMBER,
    });
    if (!admitted.ok && admitted.reason === "already_member") {
      return { ok: false, reason: "already_member" };
    }
    if (!admitted.ok) {
      return { ok: false, reason: "not_found" };
    }
    return { ok: true, alreadyMember: false, hostId: host.id };
  }

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
      where: eq(groups.id, host.id),
      columns: { communityId: true },
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
      return { ok: false, reason: "already_member" };
    }
    if (group.communityId) {
      const admitted = await admitCommunityMember(database, {
        communityId: group.communityId,
        userId: args.userId,
        role: CommunityRoleEnum.MEMBER,
      });
      if (!admitted.ok && admitted.reason !== "already_member") {
        return { ok: false, reason: "not_found" };
      }
    }
    await writeDb(database).insert(groupMembers).values({
      groupId: host.id,
      userId: args.userId,
    });
    return { ok: true, alreadyMember: false, hostId: host.id };
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
  if (!link || !isInviteLinkLive(link.expiresAt)) {
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
