import { TRPCError } from "@trpc/server";
import { isNull } from "drizzle-orm";

import { venues } from "@repo/db";

import type {
  CommitResult,
  ConsultResult,
  FreezeKind,
  SoftArchiveView,
} from "~/server/soft-archive/types";

export function refuseIfFrozen(
  view: ConsultResult,
  kind: FreezeKind,
  args: {
    frozenMessage: string;
    frozenCode?: "BAD_REQUEST" | "FORBIDDEN";
    notFoundMessage?: string;
  },
): asserts view is SoftArchiveView {
  if (!view.ok) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: args.notFoundMessage ?? "Community not found",
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
  subjectLabel: "Community" | "Venue" = "Community",
): never {
  if (result.reason === "not_found") {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `${subjectLabel} not found`,
    });
  }
  if (result.reason === "already_archived") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `${subjectLabel} is already Soft-archived`,
    });
  }
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: `${subjectLabel} is not Soft-archived`,
  });
}

/** Bulk live-Venue WHERE. Adapter-only; not a Soft-archive public export. */
export function liveVenuesWhere() {
  return isNull(venues.archivedAt);
}
