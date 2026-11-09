import { TRPCError } from "@trpc/server";

import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import type { InviteHost, InvitePhase } from "#src/invites/doors/utils";

export function frozenMintMessage(
  host: InviteHost,
  locale: Locale = DEFAULT_LOCALE,
) {
  if (host.kind === "group") {
    return messagesFor(locale).invite.errors.frozenMint.group;
  }
  if (host.kind === "team") {
    return messagesFor(locale).invite.errors.frozenMint.team;
  }
  return messagesFor(locale).game.errors.notOpen;
}

export function frozenAcceptMessage(
  host: InviteHost,
  locale: Locale = DEFAULT_LOCALE,
) {
  if (host.kind === "group") {
    return messagesFor(locale).invite.errors.frozenAccept.group;
  }
  if (host.kind === "team") {
    return messagesFor(locale).invite.errors.frozenAccept.team;
  }
  return messagesFor(locale).game.errors.notOpen;
}

export function throwInviteFrozen(
  host: InviteHost,
  phase: InvitePhase,
  reason: "frozen" | "not_found",
  locale: Locale = DEFAULT_LOCALE,
): never {
  if (reason === "not_found") {
    throw new TRPCError({
      code: "NOT_FOUND",
      message:
        host.kind === "group"
          ? messagesFor(locale).group.errors.notFound
          : host.kind === "team"
            ? messagesFor(locale).team.notFound.title
            : messagesFor(locale).game.errors.notFound,
    });
  }
  throw new TRPCError({
    code: "FORBIDDEN",
    message:
      phase === "mint"
        ? frozenMintMessage(host, locale)
        : frozenAcceptMessage(host, locale),
  });
}
