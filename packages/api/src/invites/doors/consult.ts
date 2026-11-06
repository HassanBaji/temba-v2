import { and, eq, isNull } from "drizzle-orm";

import { games, groups, teams } from "@repo/db";

import { consult, type ConsultResult } from "#src/soft-archive";
import type {
  FrozenResult,
  InviteDb,
  InviteHost,
  InvitePhase,
  OpenResult,
} from "#src/invites/doors/utils";

/** No invite host is Soft-archived any more; the door only has to exist. */
export async function consultInviteHost(
  database: InviteDb,
  host: InviteHost,
): Promise<ConsultResult> {
  if (host.kind === "group") {
    const group = await database.query.groups.findFirst({
      where: and(eq(groups.id, host.id), isNull(groups.deletedAt)),
      columns: { id: true },
    });
    return group ? consult({ archivedAt: null }) : { ok: false, reason: "not_found" };
  }
  if (host.kind === "team") {
    const team = await database.query.teams.findFirst({
      where: eq(teams.id, host.id),
      columns: { id: true },
    });
    return team ? consult({ archivedAt: null }) : { ok: false, reason: "not_found" };
  }
  const game = await database.query.games.findFirst({
    where: eq(games.id, host.id),
    columns: { id: true },
  });
  return game ? consult({ archivedAt: null }) : { ok: false, reason: "not_found" };
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
