import { TRPCError } from "@trpc/server";
import { isNull } from "drizzle-orm";

import { venues } from "@repo/db";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import type {
  CommitResult,
  ConsultResult,
  FreezeKind,
  SoftArchiveView,
} from "#src/soft-archive/utils";

export function refuseIfFrozen(
  view: ConsultResult,
  kind: FreezeKind,
  args: {
    frozenMessage: string;
    frozenCode?: "BAD_REQUEST" | "FORBIDDEN";
    notFoundMessage: string;
  },
): asserts view is SoftArchiveView {
  if (!view.ok) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: args.notFoundMessage,
    });
  }
  if (view.freeze(kind)) {
    throw new TRPCError({
      code: args.frozenCode ?? "BAD_REQUEST",
      message: args.frozenMessage,
    });
  }
}

export function throwCommitFailure(
  result: Extract<CommitResult, { ok: false }>,
  locale: Locale = DEFAULT_LOCALE,
): never {
  const errors = messagesFor(locale).venue.errors;
  if (result.reason === "not_found") {
    throw new TRPCError({ code: "NOT_FOUND", message: errors.notFound });
  }
  if (result.reason === "already_archived") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: errors.alreadyArchived,
    });
  }
  throw new TRPCError({ code: "BAD_REQUEST", message: errors.notArchived });
}

/** Bulk live-Venue WHERE. Adapter-only; not a Soft-archive public export. */
export function liveVenuesWhere() {
  return isNull(venues.archivedAt);
}
