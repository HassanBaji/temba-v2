"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { ErrorState } from "~/components/common/error-state";
import { useLocale, useMessages } from "~/components/locale-provider";
import { ChoiceChip } from "~/components/temba/choice-chip";
import { Skeleton } from "~/components/ui/skeleton";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import {
  filterLastTen,
  lastTenSummary,
  playerMatchRowView,
  playerMatchSheetView,
  type LastTenFilter,
} from "@repo/domain/player-profile-matches";
import { api } from "~/trpc/react";

import { PlayerMatchRow } from "./player-match-row";
import { PlayerMatchSheet } from "./player-match-sheet";
import { PlayerProfileRefused } from "./player-profile";

const MATCH_PARAM = "match";

export function PlayerMatches({ userId }: { userId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const m = useMessages();
  const openMatchId = searchParams.get(MATCH_PARAM);
  const [filter, setFilter] = useState<LastTenFilter>("all");
  const [selectedMatchId, setSelectedMatchId] = useState(openMatchId);
  const profile = api.users.playerProfile.useQuery({ userId });

  function showMatch(matchId: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (matchId) {
      params.set(MATCH_PARAM, matchId);
    } else {
      params.delete(MATCH_PARAM);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

  if (isNotFoundError(profile.error)) {
    return <PlayerProfileRefused />;
  }

  if (profile.isLoading) {
    return (
      <Skeleton aria-busy="true" className="rounded-card h-[320px] w-full" />
    );
  }

  if (!profile.data) {
    return (
      <ErrorState
        title={m.webUi.player.gamesLoadError}
        message={profile.error?.message}
        onRetry={() => {
          void profile.refetch();
        }}
      />
    );
  }

  const data = profile.data;
  const filtered = filterLastTen(data.lastMatches, filter, locale);
  const openMatch = data.lastMatches.find(
    (match) => match.matchId === openMatchId,
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-bold tracking-[-0.01em]">
          {m.webUi.player.lastTenGames}
        </h1>
        <p className="text-meta text-muted-foreground mt-1">
          {m.webUi.player.matchesSubtitle(
            data.player.name,
            lastTenSummary(data.lastMatches, locale).record,
          )}
        </p>
      </div>
      <div
        role="radiogroup"
        aria-label={m.webUi.player.filterGames}
        className="flex gap-2"
      >
        {filtered.chips.map((chip) => (
          <ChoiceChip
            key={chip.filter}
            role="radio"
            selected={chip.filter === filter}
            onClick={() => setFilter(chip.filter)}
          >
            {chip.label}
          </ChoiceChip>
        ))}
      </div>
      {filtered.empty ? (
        <p className="border-rule bg-paper rounded-card text-muted-foreground border p-5">
          {filtered.empty}
        </p>
      ) : (
        <ul className="border-rule bg-paper rounded-card divide-rule divide-y overflow-hidden border">
          {filtered.matches.map((match) => (
            <li key={match.matchId}>
              <PlayerMatchRow
                row={playerMatchRowView(match, data.player.id, locale)}
                showPartner
                selected={match.matchId === selectedMatchId}
                onSelect={() => {
                  setSelectedMatchId(match.matchId);
                  showMatch(match.matchId);
                }}
              />
            </li>
          ))}
        </ul>
      )}
      <PlayerMatchSheet
        sheet={
          openMatch
            ? playerMatchSheetView(openMatch, data.player.name, locale)
            : null
        }
        onClose={() => showMatch(null)}
      />
    </div>
  );
}
