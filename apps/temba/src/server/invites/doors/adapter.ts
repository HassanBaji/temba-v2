import { TRPCError } from "@trpc/server";

import type { InviteHost, InvitePhase } from "~/server/invites/doors/utils";

export function frozenMintMessage(host: InviteHost) {
  if (host.kind === "community") {
    return "Cannot manage invites for an archived Community";
  }
  if (host.kind === "group") {
    return "Cannot invite into a Group in an archived Community";
  }
  if (host.kind === "team") {
    return "Cannot invite into a Team linked to an archived Community";
  }
  return "This Game is not open for registration";
}

export function frozenAcceptMessage(host: InviteHost) {
  if (host.kind === "community") {
    return "Cannot join an archived Community";
  }
  if (host.kind === "group") {
    return "Cannot join a Group in an archived Community";
  }
  if (host.kind === "team") {
    return "Cannot accept a Team invite while the linked Community is archived";
  }
  return "This Game is not open for registration";
}

export function throwInviteFrozen(
  host: InviteHost,
  phase: InvitePhase,
  reason: "frozen" | "not_found",
): never {
  if (reason === "not_found") {
    throw new TRPCError({
      code: "NOT_FOUND",
      message:
        host.kind === "community"
          ? "Community not found"
          : host.kind === "group"
            ? "Group not found"
            : host.kind === "team"
              ? "Team not found"
              : "Game not found",
    });
  }
  throw new TRPCError({
    code: "FORBIDDEN",
    message:
      phase === "mint" ? frozenMintMessage(host) : frozenAcceptMessage(host),
  });
}
