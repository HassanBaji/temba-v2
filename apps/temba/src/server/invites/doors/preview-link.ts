import { eq } from "drizzle-orm";

import {
  communities,
  communityInviteLinks,
  gameInviteLinks,
  games,
  groupInviteLinks,
  groups,
  teamInviteLinks,
  teams,
} from "@repo/db";

import { isInviteLinkLive } from "~/server/invites/invite-link-expiry";
import { assertInviteOpen } from "~/server/invites/doors/consult";
import type {
  InviteDb,
  InviteHost,
  PreviewLinkResult,
} from "~/server/invites/doors/utils";

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
