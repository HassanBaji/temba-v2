import { TRPCError } from "@trpc/server";

import type { AdmitResult } from "~/server/games/utils";

export function throwIfAdmitRefused(result: AdmitResult) {
  if (result.ok || result.reason === "full") {
    return;
  }
  if (
    result.reason === "registration_closed" ||
    result.reason === "join_frozen"
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This Game is not open for registration",
    });
  }
  if (result.reason === "team_already_on_game") {
    throw new TRPCError({
      code: "CONFLICT",
      message: "That Team is already registered on this Game",
    });
  }
  if (result.reason === "already_on_game") {
    throw new TRPCError({
      code: "CONFLICT",
      message: "You are already registered on this Game",
    });
  }
  if (result.reason === "seat_required") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Pick a vacant Position",
    });
  }
  if (result.reason === "no_vacant_side") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No fully vacant side; pick a seat",
    });
  }
  if (result.reason === "team_not_found") {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Team not found",
    });
  }
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "Incomplete Teams cannot register",
  });
}
