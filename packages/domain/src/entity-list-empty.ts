/**
 * An entity list page is empty only once its list loaded without error and
 * holds no rows, and no pending invite is waiting. A failed list shows its
 * ErrorState alone; a failed invite query shows inline and does not hide the
 * empty state.
 */
export function entityListIsEmpty(args: {
  list: { isLoading: boolean; error: unknown; count: number };
  invites: { isLoading: boolean; count: number };
}) {
  return (
    !args.list.isLoading &&
    !args.list.error &&
    args.list.count === 0 &&
    !args.invites.isLoading &&
    args.invites.count === 0
  );
}
