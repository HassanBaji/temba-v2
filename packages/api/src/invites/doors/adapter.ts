import { TRPCError } from "@trpc/server";

import type { InviteHost, InvitePhase } from "#src/invites/doors/utils";

export function frozenMintMessage(host: InviteHost) {
  if (host.kind === "group") {
    return "This Group is not accepting invites right now";
  }
  if (host.kind === "team") {
    return "This Team is not accepting invites right now";
  }
  return "This Game is not open for registration";
}

export function frozenAcceptMessage(host: InviteHost) {
  if (host.kind === "group") {
    return "This Group is not accepting new members right now";
  }
  if (host.kind === "team") {
    return "This Team is not accepting new members right now";
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
        host.kind === "group"
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
