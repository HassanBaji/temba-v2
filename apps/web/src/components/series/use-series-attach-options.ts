"use client";

import { api } from "~/trpc/react";

/**
 * The running Series a Game of this Group may join, each with the Edition it
 * would be on `windowStart`. Asked only when `enabled` and both are known.
 */
export function useSeriesAttachOptions({
  groupId,
  windowStart,
  gameId,
  enabled,
  keepPrevious = false,
}: {
  groupId: string | null | undefined;
  windowStart: Date | null | undefined;
  /** The Game being edited, left out of the count. */
  gameId?: string;
  enabled: boolean;
  /** Keep the last numbers on screen while a moved day refetches them. */
  keepPrevious?: boolean;
}) {
  const wanted = enabled && Boolean(groupId) && windowStart != null;
  const query = api.series.attachOptions.useQuery(
    {
      groupId: groupId ?? "",
      windowStart: windowStart ?? new Date(0),
      ...(gameId ? { gameId } : {}),
    },
    {
      enabled: wanted,
      placeholderData: keepPrevious ? (previous) => previous : undefined,
    },
  );
  return {
    options: wanted ? (query.data?.options ?? []) : [],
    loaded: wanted && query.data !== undefined && !query.isPlaceholderData,
    refetch: query.refetch,
  };
}
