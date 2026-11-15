import { type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";
import { TRPCError } from "@trpc/server";

import type { AdmitResult } from "#src/games/utils";

export function throwIfAdmitRefused(
  result: AdmitResult,
  locale: Locale,
  partyKind: "user" | "pair" | "team" = "user",
) {
  if (result.ok || result.reason === "full") {
    return;
  }
  if (result.reason === "level_range") {
    const level = messagesFor(locale).level;
    const message =
      partyKind === "user"
        ? level.rangeOutside
        : partyKind === "pair"
          ? level.rangePartner
          : level.rangeTeam;
    throw new TRPCError({
      code: "FORBIDDEN",
      message,
    });
  }
  if (
    result.reason === "registration_closed" ||
    result.reason === "join_frozen"
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: messagesFor(locale).game.errors.notOpen,
    });
  }
  if (result.reason === "team_already_on_game") {
    throw new TRPCError({
      code: "CONFLICT",
      message: messagesFor(locale).game.errors.teamAlreadyRegistered,
    });
  }
  if (result.reason === "already_on_game") {
    throw new TRPCError({
      code: "CONFLICT",
      message: messagesFor(locale).game.errors.alreadyRegistered,
    });
  }
  if (result.reason === "seat_required") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.pickVacantPosition,
    });
  }
  if (result.reason === "no_vacant_side") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.noVacantSide,
    });
  }
  if (result.reason === "cancelled") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: messagesFor(locale).game.errors.cancelled,
    });
  }
  if (result.reason === "team_not_found") {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(locale).team.notFound.title,
    });
  }
  throw new TRPCError({
    code: "FORBIDDEN",
    message: messagesFor(locale).game.errors.incompleteTeams,
  });
}
