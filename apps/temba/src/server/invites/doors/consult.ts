import { eq } from "drizzle-orm";

import { games, teams } from "@repo/db";

import { consult, type ConsultResult } from "~/server/soft-archive";
import type {
  FrozenResult,
  InviteDb,
  InviteHost,
  InvitePhase,
  OpenResult,
} from "~/server/invites/doors/types";

export async function consultInviteHost(
  database: InviteDb,
  host: InviteHost,
): Promise<ConsultResult> {
  if (host.kind === "community") {
    return consult(database, { communityId: host.id });
  }
  if (host.kind === "group") {
    return consult(database, { clubGroupId: host.id });
  }
  if (host.kind === "team") {
    const team = await database.query.teams.findFirst({
      where: eq(teams.id, host.id),
      columns: { communityId: true },
    });
    if (!team) {
      return { ok: false, reason: "not_found" };
    }
    if (!team.communityId) {
      return consult({ archivedAt: null });
    }
    return consult(database, { communityId: team.communityId });
  }
  const game = await database.query.games.findFirst({
    where: eq(games.id, host.id),
    columns: { groupId: true },
  });
  if (!game) {
    return { ok: false, reason: "not_found" };
  }
  return consult(database, { clubGroupGame: { groupId: game.groupId } });
}

export function freezeKindForPhase(
  host: InviteHost,
  phase: InvitePhase,
): "host" | "join" {
  if (phase === "accept") {
    return "join";
  }
  if (host.kind === "game") {
    return "join";
  }
  return "host";
}

export async function assertInviteOpen(
  database: InviteDb,
  host: InviteHost,
  phase: InvitePhase,
): Promise<OpenResult | FrozenResult> {
  const view = await consultInviteHost(database, host);
  if (!view.ok) {
    return { ok: false, reason: "not_found" };
  }
  if (view.freeze(freezeKindForPhase(host, phase))) {
    return { ok: false, reason: "frozen" };
  }
  return { ok: true };
}
