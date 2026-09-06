export type GroupHomeRecord =
  | { kind: "none" }
  | { kind: "empty" }
  | { kind: "stats"; games: number; sets: number; points: number };

const SPORT_LABELS: Record<string, string> = {
  padel: "Padel",
  football: "Football",
};

export function groupHomeSportLabel(sport: string | null | undefined) {
  const value = sport?.trim();
  if (!value) {
    return null;
  }
  return SPORT_LABELS[value] ?? value;
}

export function groupHomeHeroMeta(input: {
  sport: string | null | undefined;
  memberCount: number;
  communityName: string | null | undefined;
}) {
  const parts: string[] = [];
  const sport = groupHomeSportLabel(input.sport);
  if (sport) {
    parts.push(sport);
  }
  parts.push(
    input.memberCount === 1 ? "1 member" : `${input.memberCount} members`,
  );
  const community = input.communityName?.trim();
  if (community) {
    parts.push(community);
  }
  return parts.join(" · ");
}

export function groupHomeRecord(
  membership: {
    totalGamesPlayed: number;
    totalSetsWon: number;
    totalPointsWon: number;
  } | null,
): GroupHomeRecord {
  if (membership == null) {
    return { kind: "none" };
  }
  if (membership.totalGamesPlayed <= 0) {
    return { kind: "empty" };
  }
  return {
    kind: "stats",
    games: membership.totalGamesPlayed,
    sets: membership.totalSetsWon,
    points: membership.totalPointsWon,
  };
}

export function groupHomeHasStandingResults(
  members: readonly {
    totalSetsWon: number;
    totalPointsWon: number;
    totalGamesPlayed: number;
  }[],
) {
  return members.some(
    (member) =>
      member.totalSetsWon > 0 ||
      member.totalPointsWon > 0 ||
      member.totalGamesPlayed > 0,
  );
}

export function groupHomeShowsMemberSearch(memberCount: number) {
  return memberCount > 8;
}

export function filterGroupMembersByName<T extends { name: string }>(
  members: readonly T[],
  query: string,
): T[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return [...members];
  }
  return members.filter((member) => member.name.toLowerCase().includes(needle));
}

export function groupHomeMemberGamesLabel(totalGamesPlayed: number) {
  return `${totalGamesPlayed} Games`;
}

export function groupHomeVenueCourtLine(
  venueName: string | null | undefined,
  courtName: string | null | undefined,
) {
  if (venueName && courtName) {
    return `${venueName} · ${courtName}`;
  }
  return venueName ?? courtName ?? null;
}

export function groupHomeSetScoreLine(
  sets:
    | readonly {
        slot1GamesWon: number | null;
        slot2GamesWon: number | null;
      }[]
    | null
    | undefined,
) {
  if (!sets) {
    return null;
  }
  const scored = sets.filter(
    (set) => set.slot1GamesWon != null && set.slot2GamesWon != null,
  );
  if (scored.length === 0) {
    return null;
  }
  return scored
    .map((set) => `${set.slot1GamesWon}-${set.slot2GamesWon}`)
    .join(", ");
}
