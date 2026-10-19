export type ManagerPerson = {
  userId: string;
  name: string;
  username: string | null;
};

export type ViewerIdentity = {
  username?: string | null;
} | null;

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
 * Managers carry the app user id while the viewer is a Clerk user, so the
 * only shared handle is the username. Without one on either side we cannot
 * tell, and say nothing.
 */
export function isViewer(
  manager: Pick<ManagerPerson, "username">,
  viewer: ViewerIdentity,
): boolean {
  const mine = viewer?.username?.trim().toLowerCase();
  const theirs = manager.username?.trim().toLowerCase();
  return Boolean(mine && theirs && mine === theirs);
}

export function managerSubtitle(
  manager: Pick<ManagerPerson, "username">,
  viewer: ViewerIdentity,
): string | null {
  const handle = manager.username ? `@${manager.username}` : null;
  if (!isViewer(manager, viewer)) {
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
