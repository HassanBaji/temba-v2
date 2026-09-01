import { and, eq, gt, sql } from "drizzle-orm";

import {
  communityInviteLinks,
  communities,
  CommunityRoleEnum,
  gameInviteLinks,
  games,
  groupInviteLinks,
  groupMembers,
  groups,
  teamInviteLinks,
  teamMembers,
  teams,
} from "@repo/db";

import { type db } from "~/server/db";
import { isUniqueViolation } from "~/server/db/is-unique-violation";
import { admit as admitCommunityMember } from "~/server/community-membership";
import { requireGame } from "~/server/games/access";
import {
  admitIndividualUser,
  recordTeamInviteLinkConsent,
} from "~/server/games/invites";
import { isIndividualSeatGame } from "~/server/games/seats";
import {
  inviteLinkExpiresAt,
  isInviteLinkLive,
} from "~/server/invites/invite-link-expiry";
import {
  createGameInviteShortCode,
  createOpaqueToken,
  parseGameInviteShortCode,
} from "~/server/invites/tokens";
import { assertInviteOpen } from "~/server/invites/doors/consult";
import type {
  AcceptLinkResult,
  AcceptSeat,
  InviteDb,
  InviteHost,
  MintLinkResult,
  PreviewLinkResult,
} from "~/server/invites/doors/types";

function writeDb(database: InviteDb): typeof db {
  return database as typeof db;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const GAME_INVITE_SHORT_CODE_ATTEMPTS = 8;

export async function mintLink(
  database: InviteDb,
  host: InviteHost,
  args: { createdBy: string },
): Promise<MintLinkResult> {
  const open = await assertInviteOpen(database, host, "mint");
  if (!open.ok) {
    return open;
  }
  const createdAt = new Date();
  const values = {
    createdBy: args.createdBy,
    token: createOpaqueToken(),
    createdAt,
    expiresAt: inviteLinkExpiresAt(createdAt),
  };

  if (host.kind === "community") {
    const [created] = await writeDb(database)
      .insert(communityInviteLinks)
      .values({ ...values, communityId: host.id })
      .returning();
    if (!created) {
      return { ok: false, reason: "insert_failed" };
    }
    return {
      ok: true,
      link: {
        id: created.id,
        token: created.token,
        createdAt: created.createdAt,
        expiresAt: created.expiresAt,
      },
    };
  }
  if (host.kind === "group") {
    const [created] = await writeDb(database)
      .insert(groupInviteLinks)
      .values({ ...values, groupId: host.id })
      .returning();
    if (!created) {
      return { ok: false, reason: "insert_failed" };
    }
    return {
      ok: true,
      link: {
        id: created.id,
        token: created.token,
        createdAt: created.createdAt,
        expiresAt: created.expiresAt,
      },
    };
  }
  if (host.kind === "team") {
    const [created] = await writeDb(database)
      .insert(teamInviteLinks)
      .values({ ...values, teamId: host.id })
      .returning();
    if (!created) {
      return { ok: false, reason: "insert_failed" };
    }
    return {
      ok: true,
      link: {
        id: created.id,
        token: created.token,
        createdAt: created.createdAt,
        expiresAt: created.expiresAt,
      },
    };
  }

  for (let attempt = 0; attempt < GAME_INVITE_SHORT_CODE_ATTEMPTS; attempt++) {
    try {
      const [created] = await writeDb(database)
        .insert(gameInviteLinks)
        .values({
          ...values,
          token: createOpaqueToken(),
          shortCode: createGameInviteShortCode(),
          gameId: host.id,
        })
        .returning();
      if (!created?.shortCode) {
        return { ok: false, reason: "insert_failed" };
      }
      return {
        ok: true,
        link: {
          id: created.id,
          token: created.token,
          shortCode: created.shortCode,
          createdAt: created.createdAt,
          expiresAt: created.expiresAt,
        },
      };
    } catch (error) {
      if (
        !isUniqueViolation(error) ||
        attempt === GAME_INVITE_SHORT_CODE_ATTEMPTS - 1
      ) {
        if (isUniqueViolation(error)) {
          return { ok: false, reason: "insert_failed" };
        }
        throw error;
      }
    }
  }
  return { ok: false, reason: "insert_failed" };
}

export async function findGameInviteLinkByShortCode(
  database: InviteDb,
  rawCode: string,
) {
  const code = parseGameInviteShortCode(rawCode);
  if (!code) {
    return undefined;
  }
  return database.query.gameInviteLinks.findFirst({
    where: sql`upper(${gameInviteLinks.shortCode}) = ${code}`,
  });
}

export async function getLiveLink(database: InviteDb, host: InviteHost) {
  const now = new Date();
  if (host.kind === "community") {
    return database.query.communityInviteLinks.findFirst({
      where: and(
        eq(communityInviteLinks.communityId, host.id),
        gt(communityInviteLinks.expiresAt, now),
      ),
      orderBy: (table, { desc }) => [desc(table.createdAt)],
    });
  }
  if (host.kind === "group") {
    return database.query.groupInviteLinks.findFirst({
      where: and(
        eq(groupInviteLinks.groupId, host.id),
        gt(groupInviteLinks.expiresAt, now),
      ),
      orderBy: (table, { desc }) => [desc(table.createdAt)],
    });
  }
  if (host.kind === "team") {
    return database.query.teamInviteLinks.findFirst({
      where: and(
        eq(teamInviteLinks.teamId, host.id),
        gt(teamInviteLinks.expiresAt, now),
      ),
      orderBy: (table, { desc }) => [desc(table.createdAt)],
    });
  }
  return database.query.gameInviteLinks.findFirst({
    where: and(
      eq(gameInviteLinks.gameId, host.id),
      gt(gameInviteLinks.expiresAt, now),
    ),
    orderBy: (table, { desc }) => [desc(table.createdAt)],
  });
}

export async function previewLink(
  database: InviteDb,
  hostKind: InviteHost["kind"],
  token: string,
): Promise<PreviewLinkResult> {
  if (hostKind === "community") {
    const link = await database.query.communityInviteLinks.findFirst({
      where: eq(communityInviteLinks.token, token),
    });
    if (!link || !isInviteLinkLive(link.expiresAt)) {
      return { ok: true, status: "invalid" };
    }
    const open = await assertInviteOpen(
      database,
      { kind: "community", id: link.communityId },
      "accept",
    );
    if (!open.ok) {
      return { ok: true, status: "unavailable" };
    }
    const community = await database.query.communities.findFirst({
      where: eq(communities.id, link.communityId),
      columns: { name: true },
    });
    return {
      ok: true,
      status: "ready",
      name: community?.name ?? "Community",
    };
  }

  if (hostKind === "group") {
    const link = await database.query.groupInviteLinks.findFirst({
      where: eq(groupInviteLinks.token, token),
    });
    if (!link || !isInviteLinkLive(link.expiresAt)) {
      return { ok: true, status: "invalid" };
    }
    const open = await assertInviteOpen(
      database,
      { kind: "group", id: link.groupId },
      "accept",
    );
    if (!open.ok) {
      return { ok: true, status: "unavailable" };
    }
    const group = await database.query.groups.findFirst({
      where: eq(groups.id, link.groupId),
      columns: { name: true },
    });
    return { ok: true, status: "ready", name: group?.name ?? "Group" };
  }

  if (hostKind === "team") {
    const link = await database.query.teamInviteLinks.findFirst({
      where: eq(teamInviteLinks.token, token),
    });
    if (!link || !isInviteLinkLive(link.expiresAt)) {
      return { ok: true, status: "invalid" };
    }
    const open = await assertInviteOpen(
      database,
      { kind: "team", id: link.teamId },
      "accept",
    );
    if (!open.ok) {
      return { ok: true, status: "unavailable" };
    }
    const team = await database.query.teams.findFirst({
      where: eq(teams.id, link.teamId),
      columns: { name: true },
    });
    return { ok: true, status: "ready", name: team?.name ?? "Team" };
  }

  const link = await database.query.gameInviteLinks.findFirst({
    where: eq(gameInviteLinks.token, token),
  });
  if (!link || !isInviteLinkLive(link.expiresAt)) {
    return { ok: true, status: "invalid" };
  }
  const open = await assertInviteOpen(
    database,
    { kind: "game", id: link.gameId },
    "accept",
  );
  if (!open.ok) {
    return { ok: true, status: "unavailable" };
  }
  const game = await database.query.games.findFirst({
    where: eq(games.id, link.gameId),
    columns: { name: true, cancelledAt: true },
  });
  if (!game || game.cancelledAt) {
    return { ok: true, status: "unavailable" };
  }
  return { ok: true, status: "ready", name: game.name ?? "Untitled Game" };
}

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
