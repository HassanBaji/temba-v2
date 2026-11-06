import type { groups } from "@repo/db";

/** Verified by an Operator, or a Club Group of a Venue (ADR-0035). */
export function groupIsVerified(
  group: Pick<typeof groups.$inferSelect, "verifiedAt" | "venueId">,
): boolean {
  return group.verifiedAt !== null || group.venueId !== null;
}
