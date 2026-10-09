export const NO_LINKABLE_COMMUNITY_COPY =
  "You're not in a Community that can link this Team.";

export type TeamLinkCommunityPicker<T> =
  | { status: "loading" }
  | { status: "error" }
  | { status: "empty" }
  | { status: "ready"; communities: T[] };

export function teamLinkCommunityPicker<
  T extends { archivedAt: Date | string | null },
>(query: {
  isLoading: boolean;
  isError: boolean;
  data: readonly T[] | undefined;
}): TeamLinkCommunityPicker<T> {
  if (query.isLoading) {
    return { status: "loading" };
  }
  if (query.isError) {
    return { status: "error" };
  }
  const communities = (query.data ?? []).filter(
    (community) => !community.archivedAt,
  );
  if (communities.length === 0) {
    return { status: "empty" };
  }
  return { status: "ready", communities };
}
