import type { GroupHomeTab } from "@repo/domain/group-home-tab";
import {
  DEFAULT_GROUP_PLAYED_FILTER,
  GROUP_PLAYED_FILTERS,
  type GroupPlayedFilter,
} from "@repo/domain/group-played-filter";

/**
 * The Group home keeps its tab and filters in the query string, so returning
 * from a Game or a player with the back button lands on the same view.
 * `season` and `view` are the shared Standing link's keys.
 */
export type GroupHomeQueryKey =
  | "tab"
  | "played"
  | "search"
  | "season"
  | "view"
  | "saved";

export type GroupHomeQueryPatch = Partial<
  Record<GroupHomeQueryKey, string | null>
>;

export function groupHomeTabQueryValue(tab: GroupHomeTab) {
  return tab === "standing" ? null : tab;
}

export function groupPlayedFilterFromQuery(
  value: string | null | undefined,
): GroupPlayedFilter {
  return (
    GROUP_PLAYED_FILTERS.find((filter) => filter === value) ??
    DEFAULT_GROUP_PLAYED_FILTER
  );
}

export function groupPlayedFilterQueryValue(filter: GroupPlayedFilter) {
  return filter === DEFAULT_GROUP_PLAYED_FILTER ? null : filter;
}

/** `null` or an empty string drops the key; other keys are kept as they are. */
export function patchGroupHomeQuery(
  search: string,
  patch: GroupHomeQueryPatch,
): string {
  const query = new URLSearchParams(search);
  for (const [key, value] of Object.entries(patch)) {
    if (value) {
      query.set(key, value);
    } else {
      query.delete(key);
    }
  }
  const next = query.toString();
  return next ? `?${next}` : "";
}

/**
 * router.replace would refetch the page from the server and remount it on
 * every change. Next keeps useSearchParams in step with replaceState, so the
 * URL records the view without the round trip.
 */
export function replaceGroupHomeQuery(patch: GroupHomeQueryPatch) {
  const { pathname, search } = window.location;
  window.history.replaceState(
    null,
    "",
    `${pathname}${patchGroupHomeQuery(search, patch)}`,
  );
}
