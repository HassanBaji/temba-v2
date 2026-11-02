export type ManagerPerson = {
  userId: string;
  name: string;
  username: string | null;
  isViewer: boolean;
};

/** The glossary's Venue manager scope (CONTEXT.md); Temba has one manager role today. */
export const MANAGER_CAPABILITIES = [
  "Venue details",
  "Courts",
  "Opening hours",
  "Closures",
  "Pricing rules",
  "Cancellation policy",
  "Bookings",
  "Payments",
  "Customers and reports",
] as const;

/**
 * `venues.managedById` marks the signed-in manager's own row, so the viewer
 * is known even for a User with no username (ADR-0049). The handle is only a
 * second line when the User still has one.
 */
export function managerSubtitle(
  manager: Pick<ManagerPerson, "username" | "isViewer">,
): string | null {
  const handle = manager.username ? `@${manager.username}` : null;
  if (!manager.isViewer) {
    return handle;
  }
  return handle ? `${handle}, you` : "you";
}

export function candidateManagers<T extends { id: string }>(
  results: readonly T[],
  managers: readonly Pick<ManagerPerson, "userId">[],
): T[] {
  const managerIds = new Set(managers.map((manager) => manager.userId));
  return results.filter((row) => !managerIds.has(row.id));
}
